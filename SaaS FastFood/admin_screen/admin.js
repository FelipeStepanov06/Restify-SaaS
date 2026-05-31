const API_BASE_URL = 'http://127.0.0.1:8000';

let products = [];
let orders = [];
let ingredientsList = [];
let authToken = sessionStorage.getItem('restify_token') || '';

const $ = id => document.getElementById(id);
const fmt = v => `R$ ${parseFloat(v).toFixed(2).replace('.', ',')}`;


// ============================================================================
// AUTHENTICATION
// ============================================================================

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  };
}

async function authFetch(url, options = {}) {
  if (!options.headers) options.headers = authHeaders();
  else options.headers = { ...authHeaders(), ...options.headers };

  const res = await fetch(url, options);
  if (res.status === 401) {
    sessionStorage.removeItem('restify_token');
    authToken = '';
    showLogin();
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  return res;
}

function showLogin() {
  $('login-overlay').classList.add('active');
}

function hideLogin() {
  $('login-overlay').classList.remove('active');
  $('login-error').textContent = '';
}

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = $('login-user').value.trim();
  const password = $('login-pass').value;
  $('login-error').textContent = '';

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (res.ok) {
      const data = await res.json();
      authToken = data.access_token;
      sessionStorage.setItem('restify_token', authToken);
      hideLogin();
      await carregarDadosDoBanco();
    } else {
      const err = await res.json();
      $('login-error').textContent = err.detail || 'Usuário ou senha inválidos';
    }
  } catch (error) {
    $('login-error').textContent = 'Erro de conexão com o servidor.';
  }
});

$('btn-logout').addEventListener('click', () => {
  sessionStorage.removeItem('restify_token');
  authToken = '';
  showLogin();
});

// Check if we have a valid token on load
if (!authToken) {
  showLogin();
} else {
  hideLogin();
}


// ============================================================================
// DATA FETCHING (uses authFetch for admin endpoints)
// ============================================================================

async function carregarDadosDoBanco() {
  try {
    const [resProd, resOrd, resIng] = await Promise.all([
      authFetch(`${API_BASE_URL}/api/admin/products`),
      authFetch(`${API_BASE_URL}/api/admin/orders`),
      authFetch(`${API_BASE_URL}/api/admin/ingredients`)
    ]);

    if (resProd.ok) products = await resProd.json();
    if (resOrd.ok) orders = await resOrd.json();
    if (resIng.ok) ingredientsList = await resIng.json();

    if ($('view-dashboard').classList.contains('active')) loadDashboard();
    if ($('view-products').classList.contains('active')) renderProducts();
    if ($('view-ingredients').classList.contains('active')) renderIngredients();

  } catch (erro) {
    console.error("Erro ao conectar com o servidor Python:", erro);
    if (authToken) {
      alert("Não foi possível conectar ao servidor. Verifique se o Uvicorn está rodando.");
    }
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

    const diCount = (p.default_ingredients || []).length;
    const ingLabel = diCount > 0 ? `<div class="ing-count">${diCount} ingrediente${diCount > 1 ? 's' : ''}</div>` : '';

    // XSS-safe: use textContent for dynamic data
    d.innerHTML = `
      <img src="" alt="" onerror="this.onerror=null;this.src='https://placehold.co/400x400/eeeeee/999999?text=Sem+Foto';">
      <div class="p-card-info">
        <h4></h4>
        <div class="price"></div>
        ${ingLabel}
        <div class="p-card-actions">
          <button class="btn btn-small btn-edit" data-id="${p.id}">Editar</button>
          <button class="btn btn-small btn-delete" data-id="${p.id}">Excluir</button>
        </div>
      </div>
    `;
    d.querySelector('img').src = p.img;
    d.querySelector('img').alt = p.name;
    d.querySelector('h4').textContent = p.name;
    d.querySelector('.price').textContent = fmt(p.price);
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
let productIngredients = {};

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
      <img src="" alt="" class="ing-selector-thumb" onerror="this.onerror=null;this.src='https://placehold.co/100x100/eeeeee/999999?text=Sem+Foto';">
      <div class="ing-selector-info">
        <span class="ing-selector-name"></span>
        <span class="ing-selector-price"></span>
      </div>
      <div class="ing-selector-controls">
        <button type="button" class="qty-btn qty-minus" data-id="${ing.id}">−</button>
        <span class="qty-value" data-id="${ing.id}">${qty}</span>
        <button type="button" class="qty-btn qty-plus" data-id="${ing.id}">+</button>
      </div>
    `;
    row.querySelector('img').src = ing.img;
    row.querySelector('img').alt = ing.name;
    row.querySelector('.ing-selector-name').textContent = ing.name;
    row.querySelector('.ing-selector-price').textContent = fmt(ing.price);
    container.appendChild(row);
  });

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
    const res = await authFetch(`${API_BASE_URL}/api/admin/estimate-price`, {
      method: 'POST',
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
    await authFetch(`${API_BASE_URL}/api/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(pacote)
    });
  } else {
    await authFetch(`${API_BASE_URL}/api/admin/products`, {
      method: 'POST',
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
    await authFetch(`${API_BASE_URL}/api/admin/products/${id}`, { method: 'DELETE' });
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

    // XSS-safe rendering for dynamic data
    tr.innerHTML = `
      <td><img src="" alt="" class="ing-thumb" onerror="this.onerror=null;this.src='https://placehold.co/100x100/eeeeee/999999?text=Sem+Foto';"></td>
      <td><strong class="ing-display-name"></strong></td>
      <td class="ing-display-price"></td>
      <td><span class="cats-label"></span></td>
      <td><strong>${ing.stock}</strong> un.</td>
      <td>${statusBadge}</td>
      <td>
        <div class="p-card-actions">
          <button class="btn btn-small btn-edit" data-ing-id="${ing.id}">Editar</button>
          <button class="btn btn-small btn-delete" data-ing-id="${ing.id}">Excluir</button>
        </div>
      </td>
    `;
    tr.querySelector('img').src = ing.img;
    tr.querySelector('img').alt = ing.name;
    tr.querySelector('.ing-display-name').textContent = ing.name;
    tr.querySelector('.ing-display-price').textContent = fmt(ing.price);
    tr.querySelector('.cats-label').textContent = catsLabel;
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
    await authFetch(`${API_BASE_URL}/api/admin/ingredients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(pacote)
    });
  } else {
    await authFetch(`${API_BASE_URL}/api/admin/ingredients`, {
      method: 'POST',
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
    await authFetch(`${API_BASE_URL}/api/admin/ingredients/${id}`, { method: 'DELETE' });
    await carregarDadosDoBanco();
  }
}


// ============================================================================
// UPLOAD DE IMAGEM
// ============================================================================

async function uploadImage(fileInput, urlInputId, previewId) {
  const file = fileInput.files[0];
  if (!file) return;
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const btnSave = document.getElementById(urlInputId === 'prod-img' ? 'btn-save-product' : 'btn-save-ingredient');
    const originalText = btnSave.textContent;
    btnSave.textContent = 'Enviando imagem...';
    btnSave.disabled = true;

    const res = await fetch(`${API_BASE_URL}/api/admin/upload-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    
    if (res.ok) {
      const data = await res.json();
      $(urlInputId).value = data.url;
      $(previewId).innerHTML = `<img src="${data.url}">`;
    } else {
      let errMsg = res.status;
      try {
        const errData = await res.json();
        errMsg = errData.detail || res.status;
      } catch (e) {}
      alert(`Erro ao fazer upload da imagem: ${errMsg}`);
    }

    btnSave.textContent = originalText;
    btnSave.disabled = false;
  } catch (e) {
    alert(`Erro de conexão ao enviar imagem: ${e.message}`);
  }
}

$('prod-img-upload').addEventListener('change', function() {
  uploadImage(this, 'prod-img', 'image-preview');
});

$('ing-img-upload').addEventListener('change', function() {
  uploadImage(this, 'ing-img', 'ing-image-preview');
});

// ============================================================================
// INIT
// ============================================================================
if (authToken) {
  carregarDadosDoBanco();
}