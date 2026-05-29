const API_BASE_URL = 'http://127.0.0.1:8000';

let products = [];
let orders = [];

const $ = id => document.getElementById(id);
const fmt = v => `R$ ${parseFloat(v).toFixed(2).replace('.', ',')}`;

// === BUSCA DE DADOS NO PYTHON ===
async function carregarDadosDoBanco() {
  try {
    // Busca os produtos
    const resProd = await fetch(`${API_BASE_URL}/products`);
    if (resProd.ok) {
      const dataProd = await resProd.json();
      // Como o SQLite no Python devolve uma lista de listas [1, "Nome", 20.0...],
      // nós mapeamos para o formato de objeto que o painel espera:
      products = dataProd.map(p => ({
        id: p[0] || p.id,
        name: p[1] || p.name,
        price: p[2] || p.price,
        cat: p[3] || p.cat,
        img: p[4] || p.img
      }));
    }

    // Busca os pedidos (Precisaremos criar essa rota no Python!)
    const resOrd = await fetch(`${API_BASE_URL}/orders`);
    if (resOrd.ok) {
      orders = await resOrd.json();
    }

    // Atualiza a tela com os dados novos
    if ($('view-dashboard').classList.contains('active')) loadDashboard();
    if ($('view-products').classList.contains('active')) renderProducts();

  } catch (erro) {
    console.error("Erro ao conectar com o servidor Python:", erro);
    alert("Não foi possível conectar ao servidor. Verifique se o Uvicorn está rodando.");
  }
}

// === NAVIGATION ===
const navLinks = document.querySelectorAll('.nav-link[data-target]');
const views = document.querySelectorAll('.view');

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.getAttribute('data-target');

    navLinks.forEach(n => n.classList.remove('active'));
    link.classList.add('active');

    views.forEach(v => v.classList.remove('active'));
    $(`view-${target}`).classList.add('active');

    if (target === 'dashboard') loadDashboard();
    if (target === 'products') renderProducts();
  });
});

// === DASHBOARD & METRICS ===
function loadDashboard() {
  let totalRevenue = 0;
  let totalOrders = orders.length;
  let productCount = {};

  const tbody = $('orders-table-body');
  tbody.innerHTML = '';

  const reversedOrders = [...orders].reverse();

  reversedOrders.forEach(order => {
    totalRevenue += order.total;

    // Se o backend enviar os items como string JSON (como salvamos antes), precisamos converter
    let itensArray = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

    itensArray.forEach(item => {
      if (!productCount[item.name]) productCount[item.name] = 0;
      productCount[item.name] += item.qty;
    });

    if(tbody.children.length < 10) {
      const tr = document.createElement('tr');
      const date = new Date(order.timestamp).toLocaleString('pt-BR');
      const itemsList = itensArray.map(i => `${i.qty}x ${i.name}`).join(', ');

      tr.innerHTML = `
        <td><strong>#${order.id}</strong></td>
        <td>${date}</td>
        <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${itemsList}">${itemsList}</td>
        <td><span class="badge">${order.dineOption === 'eat-in' ? 'Comer Aqui' : 'Para Levar'}</span></td>
        <td><strong>${fmt(order.total)}</strong></td>
      `;
      tbody.appendChild(tr);
    }
  });

  if (reversedOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#999;">Nenhum pedido registrado no servidor.</td></tr>`;
  }

  let topProduct = '-';
  let maxCount = 0;
  for (const [name, count] of Object.entries(productCount)) {
    if (count > maxCount) {
      maxCount = count;
      topProduct = name;
    }
  }

  $('metric-revenue').textContent = fmt(totalRevenue);
  $('metric-orders').textContent = totalOrders;
  $('metric-top-product').textContent = topProduct;
}

// === EXPORT CSV === (MANTIDO IGUAL)
$('btn-export-csv').addEventListener('click', () => {
  if (orders.length === 0) return alert("Não há pedidos para exportar.");
  let csvContent = "data:text/csv;charset=utf-8,ID,Data,Opcao,Itens,Total\r\n";
  orders.forEach(o => {
    const date = new Date(o.timestamp).toLocaleString('pt-BR');
    let itensArray = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
    const items = itensArray.map(i => `${i.qty}x ${i.name}`).join(' | ');
    csvContent += `${o.id},${date},${o.dineOption},"${items}",${o.total.toFixed(2)}\r\n`;
  });
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", `relatorio_vendas.csv`);
  document.body.appendChild(link); link.click(); link.remove();
});

// === PRODUCTS MANAGEMENT ===
function renderProducts() {
  const grid = $('products-admin-grid');
  grid.innerHTML = '';

  products.forEach(p => {
    const d = document.createElement('div');
    d.className = 'p-card';
    d.innerHTML = `
      <img src="${p.img}" alt="${p.name}">
      <div class="p-card-info">
        <h4>${p.name}</h4>
        <div class="price">${fmt(p.price)}</div>
        <div class="p-card-actions">
          <button class="btn btn-small btn-edit" data-id="${p.id}">Editar</button>
          <button class="btn btn-small btn-delete" data-id="${p.id}">Excluir</button>
        </div>
      </div>
    `;
    grid.appendChild(d);
  });

  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => editProduct(Number(btn.dataset.id)));
  });
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteProduct(Number(btn.dataset.id)));
  });
}

// === MODAL CONTROL & ENVIO PARA O PYTHON ===
const modal = $('product-modal');
$('btn-new-product').addEventListener('click', () => {
  $('product-form').reset();
  $('prod-id').value = '';
  $('image-preview').innerHTML = '<span>Pré-visualização</span>';
  $('modal-title').textContent = 'Novo Produto';
  modal.classList.add('active');
});

$('btn-close-modal').addEventListener('click', () => modal.classList.remove('active'));
$('btn-cancel-modal').addEventListener('click', () => modal.classList.remove('active'));

$('prod-img').addEventListener('input', (e) => {
  const url = e.target.value;
  $('image-preview').innerHTML = url ? `<img src="${url}">` : '<span>Pré-visualização</span>';
});

// SALVAR OU EDITAR PRODUTO NO PYTHON
$('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = $('prod-id').value;
  const pacoteProduto = {
    name: $('prod-name').value,
    price: parseFloat($('prod-price').value),
    cat: $('prod-cat').value,
    img: $('prod-img').value
  };

  if (id) {
    // MODO EDIÇÃO (PUT)
    await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pacoteProduto)
    });
  } else {
    // MODO CRIAÇÃO (POST)
    await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pacoteProduto)
    });
  }

  modal.classList.remove('active');
  await carregarDadosDoBanco(); // Recarrega os dados fresquinhos do Python
});

function editProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  $('prod-id').value = p.id;
  $('prod-name').value = p.name;
  $('prod-price').value = p.price;
  $('prod-cat').value = p.cat;
  $('prod-img').value = p.img;
  $('image-preview').innerHTML = `<img src="${p.img}">`;

  $('modal-title').textContent = 'Editar Produto';
  modal.classList.add('active');
}

// EXCLUIR PRODUTO NO PYTHON
async function deleteProduct(id) {
  if(confirm("Tem certeza que deseja excluir este produto do servidor?")) {
    await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE'
    });
    await carregarDadosDoBanco(); // Atualiza a tela
  }
}

// Inicia buscando do banco!
carregarDadosDoBanco();