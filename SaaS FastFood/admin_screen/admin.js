const API_BASE_URL = 'http://127.0.0.1:8000';

let products = [];
let orders = [];
let ingredientsList = [];

const $ = id => document.getElementById(id);
const fmt = v => `R$ ${parseFloat(v).toFixed(2).replace('.', ',')}`;


// ============================================================================
// DATA FETCHING
// ============================================================================

async function carregarDadosDoBanco() {
  try {
    const [resProd, resOrd, resIng] = await Promise.all([
      fetch(`${API_BASE_URL}/products`),
      fetch(`${API_BASE_URL}/orders`),
      fetch(`${API_BASE_URL}/ingredients`)
    ]);

    if (resProd.ok) products = await resProd.json();
    if (resOrd.ok) orders = await resOrd.json();
    if (resIng.ok) ingredientsList = await resIng.json();

    if ($('view-dashboard').classList.contains('active')) loadDashboard();
    if ($('view-products').classList.contains('active')) renderProducts();
    if ($('view-ingredients').classList.contains('active')) renderIngredients();

  } catch (erro) {
    console.error("Erro ao conectar com o servidor Python:", erro);
    alert("Não foi possível conectar ao servidor. Verifique se o Uvicorn está rodando.");
  }
}


// ============================================================================
// NAVIGATION
// ============================================================================

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
    if (target === 'ingredients') renderIngredients();
  });
});


// ============================================================================
// DASHBOARD & METRICS
// ============================================================================

function loadDashboard() {
  let totalRevenue = 0;
  let productCount = {};
  const tbody = $('orders-table-body');
  tbody.innerHTML = '';
  const reversedOrders = [...orders].reverse();

  reversedOrders.forEach(order => {
    totalRevenue += order.total;
    let itensArray = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    itensArray.forEach(item => {
      if (!productCount[item.name]) productCount[item.name] = 0;
      productCount[item.name] += item.qty;
    });
    if (tbody.children.length < 10) {
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
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#999;">Nenhum pedido registrado.</td></tr>`;
  }

  let topProduct = '-', maxCount = 0;
  for (const [name, count] of Object.entries(productCount)) {
    if (count > maxCount) { maxCount = count; topProduct = name; }
  }

  const lowStockCount = ingredientsList.filter(i => i.stock <= 5).length;
  $('metric-revenue').textContent = fmt(totalRevenue);
  $('metric-orders').textContent = orders.length;
  $('metric-top-product').textContent = topProduct;
  $('metric-low-stock').textContent = lowStockCount;
}


// ============================================================================
// EXPORT CSV
// ============================================================================

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


// ============================================================================
// PRODUCTS MANAGEMENT
// ============================================================================

function renderProducts() {
  const grid = $('products-admin-grid');
  grid.innerHTML = '';
  products.forEach(p => {
    const d = document.createElement('div');
    d.className = 'p-card';

    // Show ingredient count if available
    const diCount = (p.default_ingredients || []).length;
    const ingLabel = diCount > 0 ? `<div class="ing-count">${diCount} ingrediente${diCount > 1 ? 's' : ''}</div>` : '';

    d.innerHTML = `
      <img src="${p.img}" alt="${p.name}" onerror="this.onerror=null;this.src='https://placehold.co/400x400/eeeeee/999999?text=Sem+Foto';">
      <div class="p-card-info">
        <h4>${p.name}</h4>
        <div class="price">${fmt(p.price)}</div>
        ${ingLabel}
        <div class="p-card-actions">
          <button class="btn btn-small btn-edit" data-id="${p.id}">Editar</button>
          <button class="btn btn-small btn-delete" data-id="${p.id}">Excluir</button>
        </div>
      </div>
    `;
    grid.appendChild(d);
  });
  document.querySelectorAll('.p-card .btn-edit').forEach(btn => {
    btn.addEventListener('click', () => editProduct(Number(btn.dataset.id)));
  });
  document.querySelectorAll('.p-card .btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteProduct(Number(btn.dataset.id)));
  });
}

// --- Product Modal ---
const productModal = $('product-modal');

// Track selected ingredients for the product
let productIngredients = {}; // { ingredientId: qty }

function renderIngredientSelector(preselected = {}) {
  const container = $('ingredient-selector');
  container.innerHTML = '';
  productIngredients = { ...preselected };

  if (ingredientsList.length === 0) {
    container.innerHTML = '<p style="color:#999;font-size:13px;">Nenhum ingrediente cadastrado. Cadastre ingredientes na aba Estoque primeiro.</p>';
    return;
  }

  ingredientsList.forEach(ing => {
    const qty = productIngredients[ing.id] || 0;
    const row = document.createElement('div');
    row.className = 'ing-selector-row' + (qty > 0 ? ' active' : '');
    row.dataset.ingId = ing.id;

    row.innerHTML = `
      <img src="${ing.img}" alt="${ing.name}" class="ing-selector-thumb" onerror="this.onerror=null;this.src='https://placehold.co/100x100/eeeeee/999999?text=Sem+Foto';">
      <div class="ing-selector-info">
        <span class="ing-selector-name">${ing.name}</span>
        <span class="ing-selector-price">${fmt(ing.price)}</span>
      </div>
      <div class="ing-selector-controls">
        <button type="button" class="qty-btn qty-minus" data-id="${ing.id}">−</button>
        <span class="qty-value" data-id="${ing.id}">${qty}</span>
        <button type="button" class="qty-btn qty-plus" data-id="${ing.id}">+</button>
      </div>
    `;
    container.appendChild(row);
  });

  // Bind controls
  container.querySelectorAll('.qty-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      productIngredients[id] = (productIngredients[id] || 0) + 1;
      refreshIngredientSelector();
      updatePriceEstimate();
    });
  });

  container.querySelectorAll('.qty-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      if (productIngredients[id] && productIngredients[id] > 0) {
        productIngredients[id]--;
        if (productIngredients[id] === 0) delete productIngredients[id];
      }
      refreshIngredientSelector();
      updatePriceEstimate();
    });
  });
}

function refreshIngredientSelector() {
  const container = $('ingredient-selector');
  container.querySelectorAll('.ing-selector-row').forEach(row => {
    const id = Number(row.dataset.ingId);
    const qty = productIngredients[id] || 0;
    row.querySelector('.qty-value').textContent = qty;
    row.classList.toggle('active', qty > 0);
  });
}

async function updatePriceEstimate() {
  const estimateBox = $('estimate-box');
  const selected = Object.entries(productIngredients)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => ({ ingredientId: Number(id), qty }));

  if (selected.length === 0) {
    estimateBox.style.display = 'none';
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/estimate-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selected)
    });

    if (res.ok) {
      const data = await res.json();
      $('est-custo').textContent = fmt(data.custoIngredientes);
      $('est-mao').textContent = fmt(data.maoDeObra);
      $('est-margem').textContent = fmt(data.margemLucro);
      $('est-total').textContent = fmt(data.precoSugerido);
      estimateBox.style.display = 'block';
    }
  } catch (e) {
    console.warn('Erro ao calcular estimativa:', e);
  }
}

$('btn-use-estimate').addEventListener('click', () => {
  const priceText = $('est-total').textContent;
  // Parse "R$ 12,34" back to number
  const num = parseFloat(priceText.replace('R$', '').replace('.', '').replace(',', '.').trim());
  if (!isNaN(num)) {
    $('prod-price').value = num.toFixed(2);
  }
});

$('btn-new-product').addEventListener('click', () => {
  $('product-form').reset();
  $('prod-id').value = '';
  $('image-preview').innerHTML = '<span>Pré-visualização</span>';
  $('modal-title').textContent = 'Novo Produto';
  $('estimate-box').style.display = 'none';
  renderIngredientSelector({});
  productModal.classList.add('active');
});

$('btn-close-modal').addEventListener('click', () => productModal.classList.remove('active'));
$('btn-cancel-modal').addEventListener('click', () => productModal.classList.remove('active'));

$('prod-img').addEventListener('input', (e) => {
  const url = e.target.value;
  $('image-preview').innerHTML = url ? `<img src="${url}">` : '<span>Pré-visualização</span>';
});

$('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('prod-id').value;

  // Build default_ingredients array
  const defaultIngredients = Object.entries(productIngredients)
    .filter(([_, qty]) => qty > 0)
    .map(([ingId, qty]) => ({ ingredientId: Number(ingId), qty }));

  const pacote = {
    name: $('prod-name').value,
    price: parseFloat($('prod-price').value),
    cat: $('prod-cat').value,
    img: $('prod-img').value,
    default_ingredients: defaultIngredients
  };

  if (id) {
    await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pacote)
    });
  } else {
    await fetch(`${API_BASE_URL}/products`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pacote)
    });
  }

  productModal.classList.remove('active');
  await carregarDadosDoBanco();
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

  // Pre-select ingredients
  const preselected = {};
  (p.default_ingredients || []).forEach(di => {
    preselected[di.ingredientId] = di.qty;
  });
  renderIngredientSelector(preselected);
  updatePriceEstimate();

  productModal.classList.add('active');
}

async function deleteProduct(id) {
  if (confirm("Tem certeza que deseja excluir este produto?")) {
    await fetch(`${API_BASE_URL}/products/${id}`, { method: 'DELETE' });
    await carregarDadosDoBanco();
  }
}


// ============================================================================
// INGREDIENTS / STOCK MANAGEMENT
// ============================================================================

function renderIngredients() {
  const tbody = $('ingredients-table-body');
  tbody.innerHTML = '';
  if (ingredientsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#999;padding:40px;">Nenhum ingrediente cadastrado.</td></tr>`;
    return;
  }
  ingredientsList.forEach(ing => {
    const tr = document.createElement('tr');
    const catsLabel = Array.isArray(ing.cats) ? ing.cats.join(', ') : ing.cats;
    const isOut = ing.stock <= 0;
    const isLow = ing.stock > 0 && ing.stock <= 5;
    let statusBadge;
    if (isOut) statusBadge = '<span class="badge badge--danger">Esgotado</span>';
    else if (isLow) statusBadge = '<span class="badge badge--warning">Baixo</span>';
    else statusBadge = '<span class="badge badge--success">Disponível</span>';

    tr.innerHTML = `
      <td><img src="${ing.img}" alt="${ing.name}" class="ing-thumb" onerror="this.onerror=null;this.src='https://placehold.co/100x100/eeeeee/999999?text=Sem+Foto';"></td>
      <td><strong>${ing.name}</strong></td>
      <td>${fmt(ing.price)}</td>
      <td><span class="cats-label">${catsLabel}</span></td>
      <td><strong>${ing.stock}</strong> un.</td>
      <td>${statusBadge}</td>
      <td>
        <div class="p-card-actions">
          <button class="btn btn-small btn-edit" data-ing-id="${ing.id}">Editar</button>
          <button class="btn btn-small btn-delete" data-ing-id="${ing.id}">Excluir</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => editIngredient(Number(btn.dataset.ingId)));
  });
  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteIngredient(Number(btn.dataset.ingId)));
  });
}

const ingredientModal = $('ingredient-modal');

$('btn-new-ingredient').addEventListener('click', () => {
  $('ingredient-form').reset();
  $('ing-id').value = '';
  $('ing-image-preview').innerHTML = '<span>Pré-visualização</span>';
  $('ing-modal-title').textContent = 'Novo Ingrediente';
  document.querySelectorAll('#ing-cats-group input[type="checkbox"]').forEach(cb => cb.checked = false);
  ingredientModal.classList.add('active');
});

$('btn-close-ing-modal').addEventListener('click', () => ingredientModal.classList.remove('active'));
$('btn-cancel-ing-modal').addEventListener('click', () => ingredientModal.classList.remove('active'));

$('ing-img').addEventListener('input', (e) => {
  const url = e.target.value;
  $('ing-image-preview').innerHTML = url ? `<img src="${url}">` : '<span>Pré-visualização</span>';
});

$('ingredient-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('ing-id').value;
  const selectedCats = [];
  document.querySelectorAll('#ing-cats-group input[type="checkbox"]:checked').forEach(cb => selectedCats.push(cb.value));
  if (selectedCats.length === 0) { alert("Selecione pelo menos uma categoria."); return; }

  const pacote = {
    name: $('ing-name').value,
    price: parseFloat($('ing-price').value),
    img: $('ing-img').value,
    cats: selectedCats,
    stock: parseInt($('ing-stock').value)
  };

  if (id) {
    await fetch(`${API_BASE_URL}/ingredients/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pacote)
    });
  } else {
    await fetch(`${API_BASE_URL}/ingredients`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pacote)
    });
  }
  ingredientModal.classList.remove('active');
  await carregarDadosDoBanco();
});

function editIngredient(id) {
  const ing = ingredientsList.find(x => x.id === id);
  if (!ing) return;
  $('ing-id').value = ing.id;
  $('ing-name').value = ing.name;
  $('ing-price').value = ing.price;
  $('ing-stock').value = ing.stock;
  $('ing-img').value = ing.img;
  $('ing-image-preview').innerHTML = `<img src="${ing.img}">`;
  const catsArray = Array.isArray(ing.cats) ? ing.cats : [];
  document.querySelectorAll('#ing-cats-group input[type="checkbox"]').forEach(cb => {
    cb.checked = catsArray.includes(cb.value);
  });
  $('ing-modal-title').textContent = 'Editar Ingrediente';
  ingredientModal.classList.add('active');
}

async function deleteIngredient(id) {
  if (confirm("Excluir este ingrediente do estoque?")) {
    await fetch(`${API_BASE_URL}/ingredients/${id}`, { method: 'DELETE' });
    await carregarDadosDoBanco();
  }
}


// ============================================================================
// INIT
// ============================================================================
carregarDadosDoBanco();