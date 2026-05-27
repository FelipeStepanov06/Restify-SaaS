// === DEFAULT DATA (Se não houver no localStorage) ===
const defaultProducts = [
  {id:1,name:'Classic Burger',price:24.90,cat:'comida',img:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'},
  {id:2,name:'Double Cheese',price:32.90,cat:'comida',img:'https://images.unsplash.com/photo-1586816001966-79b736744398?auto=format&fit=crop&w=400&q=80'},
  {id:3,name:'Chicken Burger',price:27.90,cat:'comida',img:'https://images.unsplash.com/photo-1525164286253-04e68b9d94c6?auto=format&fit=crop&w=400&q=80'},
  {id:4,name:'Bacon Burger',price:29.90,cat:'comida',img:'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=400&q=80'},
  {id:5,name:'Veggie Burger',price:26.90,cat:'comida',img:'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=400&q=80'},
  {id:6,name:'Combo Classic',price:39.90,cat:'promos',img:'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=400&q=80'},
  {id:7,name:'Combo Double',price:49.90,cat:'promos',img:'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=400&q=80'},
  {id:8,name:'Batata Frita P',price:12.90,cat:'acomp',img:'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=400&q=80'},
  {id:9,name:'Batata Frita G',price:18.90,cat:'acomp',img:'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=400&q=80'},
  {id:10,name:'Onion Rings',price:15.90,cat:'acomp',img:'https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=400&q=80'},
  {id:11,name:'Nuggets 6un',price:16.90,cat:'acomp',img:'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=400&q=80'},
  {id:12,name:'Coca-Cola 500ml',price:9.90,cat:'bebidas',img:'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80'},
  {id:13,name:'Fanta Laranja',price:9.90,cat:'bebidas',img:'https://images.unsplash.com/photo-1624517452488-04869289c4ca?auto=format&fit=crop&w=400&q=80'},
  {id:14,name:'Suco Natural',price:12.90,cat:'bebidas',img:'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?auto=format&fit=crop&w=400&q=80'},
  {id:15,name:'Água Mineral',price:5.90,cat:'bebidas',img:'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=400&q=80'},
  {id:16,name:'Sundae Chocolate',price:14.90,cat:'sobremesas',img:'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=400&q=80'},
  {id:17,name:'Milkshake',price:18.90,cat:'sobremesas',img:'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=400&q=80'},
  {id:18,name:'Brownie',price:12.90,cat:'sobremesas',img:'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=400&q=80'},
  {id:19,name:'Petit Gateau',price:19.90,cat:'sobremesas',img:'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&w=400&q=80'}
];

// Inicia dados locais
if (!localStorage.getItem('r_products')) {
  localStorage.setItem('r_products', JSON.stringify(defaultProducts));
}
if (!localStorage.getItem('r_orders')) {
  localStorage.setItem('r_orders', JSON.stringify([]));
}

let products = JSON.parse(localStorage.getItem('r_products'));
let orders = JSON.parse(localStorage.getItem('r_orders'));

const $ = id => document.getElementById(id);
const fmt = v => `R$ ${parseFloat(v).toFixed(2).replace('.', ',')}`;

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

  // Reverse to show latest first
  const reversedOrders = [...orders].reverse();

  reversedOrders.forEach(order => {
    totalRevenue += order.total;

    // Count products for "Mais Vendido"
    order.items.forEach(item => {
      if (!productCount[item.name]) productCount[item.name] = 0;
      productCount[item.name] += item.qty;
    });

    // Populate Table (limit to 10 for dashboard preview)
    if(tbody.children.length < 10) {
      const tr = document.createElement('tr');
      const date = new Date(order.timestamp).toLocaleString('pt-BR');
      const itemsList = order.items.map(i => `${i.qty}x ${i.name}`).join(', ');
      
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
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#999;">Nenhum pedido registrado.</td></tr>`;
  }

  // Find top product
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

// === EXPORT CSV ===
$('btn-export-csv').addEventListener('click', () => {
  if (orders.length === 0) {
    alert("Não há pedidos para exportar.");
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "ID,Data,Opcao,Itens,Total\r\n";

  orders.forEach(o => {
    const date = new Date(o.timestamp).toLocaleString('pt-BR');
    const items = o.items.map(i => `${i.qty}x ${i.name}`).join(' | ');
    // Escape quotes and commas
    const itemsEscaped = `"${items}"`;
    const row = `${o.id},${date},${o.dineOption},${itemsEscaped},${o.total.toFixed(2)}`;
    csvContent += row + "\r\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `relatorio_vendas_${new Date().getTime()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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

// === MODAL CONTROL ===
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
  if(url) {
    $('image-preview').innerHTML = `<img src="${url}" onerror="this.parentElement.innerHTML='<span>URL Inválida</span>'">`;
  } else {
    $('image-preview').innerHTML = '<span>Pré-visualização</span>';
  }
});

$('product-form').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const id = $('prod-id').value;
  const name = $('prod-name').value;
  const price = parseFloat($('prod-price').value);
  const cat = $('prod-cat').value;
  const img = $('prod-img').value;

  if (id) {
    // Edit
    const index = products.findIndex(p => p.id === Number(id));
    if(index > -1) {
      products[index] = { ...products[index], name, price, cat, img };
    }
  } else {
    // Add
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    products.push({ id: newId, name, price, cat, img });
  }

  saveProducts();
  modal.classList.remove('active');
  renderProducts();
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

function deleteProduct(id) {
  if(confirm("Tem certeza que deseja excluir este produto?")) {
    products = products.filter(x => x.id !== id);
    saveProducts();
    renderProducts();
  }
}

function saveProducts() {
  localStorage.setItem('r_products', JSON.stringify(products));
  // Notificação para o iframe ou outra aba recarregar (opcional)
  window.dispatchEvent(new Event('storage'));
}

// Init
loadDashboard();
