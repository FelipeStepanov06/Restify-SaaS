/**
 * ============================================================================
 * ESTRUTURAS DE DADOS (MODELS) PARA O BACKEND EM PYTHON
 * ============================================================================
 * 
 * Ao criar os seus modelos em Python (ex: SQLAlchemy ou Pydantic),
 * baseie-se nestes formatos (JSON) que o Frontend consome e envia:
 * 
 * 1. Category (Categoria do Menu)
 * class Category(BaseModel):
 *     id: str    # ex: 'comida'
 *     name: str  # ex: 'Comida'
 * 
 * 2. Product (Produto / Lanche)
 * class Product(BaseModel):
 *     id: int
 *     name: str
 *     price: float
 *     cat: str   # foreign key simbólica para Category.id
 *     img: str   # URL da imagem
 * 
 * 3. Ingredient (Adicional / Ingrediente)
 * class Ingredient(BaseModel):
 *     name: str
 *     img: str
 *     price: float
 *     cats: list[str]  # Lista de IDs de categorias em que este item pode ser adicionado
 *     stock: int       # Quantidade em estoque (0 = esgotado/indisponível)
 * 
 * 4. Order (Pedido Finalizado) - O frontend faz um POST enviando isso:
 * class OrderItem(BaseModel):
 *     productId: int
 *     name: str
 *     img: str
 *     basePrice: float
 *     extras: float     # Soma do valor dos adicionais
 *     mods: list[str]   # Nomes dos ingredientes adicionados/modificados
 *     qty: int
 * 
 * class Order(BaseModel):
 *     items: list[OrderItem]
 *     total: float
 *     dineOption: str   # 'eat-in' (Comer aqui) ou 'take-away' (Para levar)
 *     timestamp: str    # Data e hora ISO 8601
 * 
 * ============================================================================
 */


// ============================================================================
// CONFIGURAÇÃO DA API
// ============================================================================
const API_BASE_URL = 'http://127.0.0.1:8000';
const API_PUBLIC = `${API_BASE_URL}/api/public`;


// ============================================================================
// DADOS LOCAIS (FALLBACK E ADMIN SYNC)
// ============================================================================

let categories = [
  { id: 'menu', name: 'Menu' },
  { id: 'promos', name: 'Promoções' },
  { id: 'popular', name: 'Mais pedidos' },
  { id: 'comida', name: 'Comida' },
  { id: 'acomp', name: 'Acompanhamentos' },
  { id: 'bebidas', name: 'Bebidas' },
  { id: 'sobremesas', name: 'Sobremesas' }
];

let products = [
  { id: 1, name: 'Classic Burger', price: 24.90, cat: 'comida', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80' },
  { id: 2, name: 'Double Cheese', price: 32.90, cat: 'comida', img: 'https://images.unsplash.com/photo-1586816001966-79b736744398?auto=format&fit=crop&w=400&q=80' },
  { id: 3, name: 'Chicken Burger', price: 27.90, cat: 'comida', img: 'https://images.unsplash.com/photo-1525164286253-04e68b9d94c6?auto=format&fit=crop&w=400&q=80' },
  { id: 4, name: 'Bacon Burger', price: 29.90, cat: 'comida', img: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=400&q=80' },
  { id: 5, name: 'Veggie Burger', price: 26.90, cat: 'comida', img: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=400&q=80' },
  { id: 6, name: 'Combo Classic', price: 39.90, cat: 'promos', img: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=400&q=80' },
  { id: 7, name: 'Combo Double', price: 49.90, cat: 'promos', img: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=400&q=80' },
  { id: 8, name: 'Batata Frita P', price: 12.90, cat: 'acomp', img: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=400&q=80' },
  { id: 9, name: 'Batata Frita G', price: 18.90, cat: 'acomp', img: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=400&q=80' },
  { id: 10, name: 'Onion Rings', price: 15.90, cat: 'acomp', img: 'https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=400&q=80' },
  { id: 11, name: 'Nuggets 6un', price: 16.90, cat: 'acomp', img: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=400&q=80' },
  { id: 12, name: 'Coca-Cola 500ml', price: 9.90, cat: 'bebidas', img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80' },
  { id: 13, name: 'Fanta Laranja', price: 9.90, cat: 'bebidas', img: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?auto=format&fit=crop&w=400&q=80' },
  { id: 14, name: 'Suco Natural', price: 12.90, cat: 'bebidas', img: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?auto=format&fit=crop&w=400&q=80' },
  { id: 15, name: 'Água Mineral', price: 5.90, cat: 'bebidas', img: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=400&q=80' },
  { id: 16, name: 'Sundae Chocolate', price: 14.90, cat: 'sobremesas', img: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=400&q=80' },
  { id: 17, name: 'Milkshake', price: 18.90, cat: 'sobremesas', img: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=400&q=80' },
  { id: 18, name: 'Brownie', price: 12.90, cat: 'sobremesas', img: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=400&q=80' },
  { id: 19, name: 'Petit Gateau', price: 19.90, cat: 'sobremesas', img: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&w=400&q=80' }
];

let ingredients = [
  { name: 'Alface', img: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&w=200&q=80', price: 0, cats: ['comida', 'promos'] },
  { name: 'Tomate', img: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=200&q=80', price: 0, cats: ['comida', 'promos'] },
  { name: 'Cebola', img: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=200&q=80', price: 0, cats: ['comida', 'promos'] },
  { name: 'Queijo Extra', img: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=200&q=80', price: 3, cats: ['comida', 'promos'] },
  { name: 'Bacon Extra', img: 'https://images.unsplash.com/photo-1528607929212-2636ec44253e?auto=format&fit=crop&w=200&q=80', price: 4, cats: ['comida', 'promos'] },
  { name: 'Molho Especial', img: 'https://images.unsplash.com/photo-1585325701165-351af679ef5b?auto=format&fit=crop&w=200&q=80', price: 2, cats: ['comida', 'promos', 'acomp'] },
  { name: 'Gelo', img: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=200&q=80', price: 0, cats: ['bebidas'] },
  { name: 'Limão', img: 'https://images.unsplash.com/photo-1556736200-e2213ab0a811?auto=format&fit=crop&w=200&q=80', price: 0, cats: ['bebidas'] },
  { name: 'Ketchup', img: 'https://images.unsplash.com/photo-1478749485505-2a903a729c63?auto=format&fit=crop&w=200&q=80', price: 0, cats: ['acomp'] },
  { name: 'Calda Extra', img: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=200&q=80', price: 2.5, cats: ['sobremesas'] }
];


// ============================================================================
// COMUNICAÇÃO COM A API / BACKEND
// ============================================================================

async function fetchBackendData() {
  try {
    const resCat = await fetch(`${API_PUBLIC}/categories`);
    if (resCat.ok) {
      categories = await resCat.json();
    }

    const resProd = await fetch(`${API_PUBLIC}/products`);
    if (resProd.ok) {
      products = await resProd.json();
    }

    const resIng = await fetch(`${API_PUBLIC}/ingredients`);
    if (resIng.ok) {
      ingredients = await resIng.json();
    }

    const resTop = await fetch(`${API_PUBLIC}/top-product`);
    if (resTop.ok) {
      const data = await resTop.json();
      if (data.productId) {
        const topItem = carouselProducts.find(c => c.tag.includes('Mais pedido'));
        if (topItem) topItem.pid = data.productId;
      }
    }
    console.log('Dados carregados do backend com sucesso!');
  } catch (e) {
    console.error('Backend indisponível. Totem não pode operar sem o servidor.', e);
    // SECURITY FIX (VULN-12): No more localStorage fallback.
    // Show error state instead of loading potentially tampered local data.
    alert('Erro de conexão com o servidor. Por favor, contate um funcionário.');
  }
}


// ============================================================================
// ESTADO DA APLICAÇÃO (STATE) & UTILITÁRIOS
// ============================================================================

let cart = [];
let activeCat = 'menu';
let selectedProduct = null;
let selectedIngredients = [];
let selectedAddons = [];
let dineOption = '';
let orderCounter = parseInt(localStorage.getItem('r_oc') || '1');
let cdInterval = null;

// Função utilitária para pegar elemento por ID
function $(id) {
  return document.getElementById(id);
}

// Função utilitária para formatar moeda
function formatCurrency(value) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

// Filtro de produtos populares ("Mais pedidos" / "Menu")
function getPopularProducts() {
  return products.filter(p => p.cat === 'comida' || p.cat === 'promos').slice(0, 6);
}

// Retorna lista de produtos com base na aba (categoria) selecionada
function getProductsByCategory(categoryId) {
  if (categoryId === 'menu') {
    return products;
  }
  if (categoryId === 'popular') {
    return getPopularProducts();
  }
  return products.filter(p => p.cat === categoryId);
}


// ============================================================================
// NAVEGAÇÃO ENTRE TELAS (VIEWS)
// ============================================================================

function goToScreen(screenId) {
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => {
    screen.classList.remove('active');
  });

  requestAnimationFrame(() => {
    const target = $(screenId);
    if (target) {
      target.classList.add('active');
    }
  });
}


// ============================================================================
// TELA INICIAL (SPLASH / DINE OPTION)
// ============================================================================

let welcomeBgInterval;

function initSplashScreen() {
  const bgContainer = $('welcome-bg');
  if (!bgContainer) return;

  // Pegar algumas imagens de comida para mostrar no background
  const bgImages = products.filter(p => p.cat === 'comida' || p.cat === 'promos').slice(0, 5);
  
  bgImages.forEach((prod, index) => {
    const img = document.createElement('img');
    img.src = prod.img.replace(/w=\d+/, 'w=1200').replace(/q=\d+/, 'q=85');
    if (index === 0) {
      img.classList.add('active');
    }
    bgContainer.appendChild(img);
  });

  let currentIdx = 0;
  const imgs = bgContainer.querySelectorAll('img');
  
  if (imgs.length > 1) {
    if (welcomeBgInterval) clearInterval(welcomeBgInterval);
    welcomeBgInterval = setInterval(() => {
      imgs[currentIdx].classList.remove('active');
      currentIdx = (currentIdx + 1) % imgs.length;
      imgs[currentIdx].classList.add('active');
    }, 4500);
  }

  const startGame = () => goToScreen('screen-dine');
  $('btn-start').addEventListener('click', startGame);
  $('screen-splash').addEventListener('click', startGame);
}

function initDineOptions() {
  $('btn-eat-in').addEventListener('click', () => {
    dineOption = 'eat-in';
    startMenuScreen();
  });

  $('btn-take-away').addEventListener('click', () => {
    dineOption = 'take-away';
    startMenuScreen();
  });
}


// ============================================================================
// TELA PRINCIPAL DO MENU (PRODUTOS)
// ============================================================================

function startMenuScreen() {
  cart = [];
  activeCat = 'menu';
  renderSidebar();
  renderProductsGrid();
  updateAddToCartButton();
  goToScreen('screen-menu');
}

function renderSidebar() {
  const sidebar = $('sidebar');
  sidebar.innerHTML = '';

  categories.forEach(category => {
    const btn = document.createElement('button');
    btn.className = 'sidebar-btn' + (category.id === activeCat ? ' active' : '');
    btn.textContent = category.name;
    
    btn.addEventListener('click', () => {
      activeCat = category.id;
      
      // Atualiza botão ativo visualmente
      document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('active'));
      btn.classList.add('active');
      
      // Reseta seleção
      selectedProduct = null;
      renderProductsGrid();
      updateAddToCartButton();
    });

    sidebar.appendChild(btn);
  });
}

function renderProductsGrid() {
  const grid = $('products-grid');
  grid.innerHTML = '';

  const filteredProducts = getProductsByCategory(activeCat);

  filteredProducts.forEach(product => {
    const card = document.createElement('div');
    const isSelected = selectedProduct && selectedProduct.id === product.id;
    card.className = 'p-card' + (isSelected ? ' selected' : '');
    
    card.innerHTML = `
      <img src="" alt="" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/400x400/eeeeee/999999?text=Sem+Foto';">
      <div class="p-card-info">
        <h4></h4>
        <div class="price"></div>
      </div>
    `;
    card.querySelector('img').src = product.img;
    card.querySelector('img').alt = product.name;
    card.querySelector('h4').textContent = product.name;
    card.querySelector('.price').textContent = formatCurrency(product.price);

    card.addEventListener('click', () => {
      selectedProduct = product;
      document.querySelectorAll('.p-card').forEach(c => {
        c.style.borderColor = 'transparent';
      });
      card.style.borderColor = 'var(--secondary)';
      updateAddToCartButton();
    });

    grid.appendChild(card);
  });
}

function updateAddToCartButton() {
  const btn = $('btn-add-bar');
  if (selectedProduct) {
    btn.disabled = false;
    btn.textContent = `Adicionar ${selectedProduct.name} ao Carrinho`;
  } else {
    btn.disabled = true;
    btn.textContent = 'Adicionar ao Carrinho';
  }
}


// ============================================================================
// TELA DE PERSONALIZAÇÃO (INGREDIENTES E ADICIONAIS)
// ============================================================================

// Armazena a quantidade de cada ingrediente selecionado: { ingredientName: qty }
let ingredientQuantities = {};

function openCustomizationScreen(product) {
  selectedAddons = [];
  ingredientQuantities = {};
  
  $('custom-img').src = product.img;
  $('custom-name').textContent = product.name;
  $('custom-price').textContent = formatCurrency(product.price);

  // Renderiza Ingredientes com UI de [-] foto [+]
  const ingredientsSection = $('ingredients-section');
  ingredientsSection.innerHTML = '';
  
  const validIngredients = ingredients.filter(ing => {
    const categoryMatch = !ing.cats || ing.cats.includes(product.cat);
    const inStock = (ing.stock === undefined || ing.stock === null || ing.stock > 0);
    return categoryMatch && inStock;
  });
  
  if (validIngredients.length > 0) {
    ingredientsSection.innerHTML = '<h5>Personalize seu Pedido</h5>';
    const grid = document.createElement('div');
    grid.className = 'ingredient-grid';

    validIngredients.forEach(ingredient => {
      const card = document.createElement('div');
      card.className = 'ing-card';
      card.dataset.name = ingredient.name;
      
      const priceLabel = ingredient.price > 0 ? `+${formatCurrency(ingredient.price)}` : 'Incluso';

      card.innerHTML = `
        <div class="ing-card-inner">
          <button class="ing-qty-btn ing-minus" data-name="${ingredient.name}">−</button>
          <div class="ing-center">
            <img src="${ingredient.img}" alt="${ingredient.name}" onerror="this.onerror=null;this.src='https://placehold.co/200x200/eeeeee/999999?text=Sem+Foto';">
            <span class="ing-name">${ingredient.name}</span>
            <span class="ing-price">${priceLabel}</span>
          </div>
          <button class="ing-qty-btn ing-plus" data-name="${ingredient.name}">+</button>
        </div>
        <div class="ing-qty-badge" data-badge="${ingredient.name}" style="display:none">+0</div>
      `;

      grid.appendChild(card);
    });
    
    ingredientsSection.appendChild(grid);

    // Bind +/- buttons
    grid.querySelectorAll('.ing-plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const name = btn.dataset.name;
        const ing = validIngredients.find(i => i.name === name);
        const maxStock = ing ? (ing.stock || 99) : 99;
        const current = ingredientQuantities[name] || 0;
        if (current < maxStock) {
          ingredientQuantities[name] = current + 1;
          refreshIngredientUI(name);
          updateCustomPrice(product);
        }
      });
    });

    grid.querySelectorAll('.ing-minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const name = btn.dataset.name;
        const current = ingredientQuantities[name] || 0;
        if (current > 0) {
          ingredientQuantities[name] = current - 1;
          if (ingredientQuantities[name] === 0) delete ingredientQuantities[name];
          refreshIngredientUI(name);
          updateCustomPrice(product);
        }
      });
    });
  }

  // Renderiza Extras (Bebidas, Acompanhamentos, Sobremesas)
  const rightSection = $('custom-right');
  rightSection.innerHTML = '';
  
  const extraCategories = ['bebidas', 'acomp', 'sobremesas'];
  
  extraCategories.forEach(categoryId => {
    const items = products.filter(p => p.cat === categoryId);
    const categoryInfo = categories.find(c => c.id === categoryId);
    
    if (items.length > 0 && categoryInfo) {
      const sectionDiv = document.createElement('div');
      sectionDiv.className = 'addon-section';
      sectionDiv.innerHTML = `<h5>${categoryInfo.name}</h5>`;
      
      const grid = document.createElement('div');
      grid.className = 'addon-grid';
      
      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'addon-card';
        card.innerHTML = `
          <img src="${item.img}" alt="${item.name}" onerror="this.onerror=null;this.src='https://placehold.co/200x200/eeeeee/999999?text=Sem+Foto';">
          <div class="name">${item.name}</div>
          <div class="price">${formatCurrency(item.price)}</div>
        `;
        
        card.addEventListener('click', () => {
          card.classList.toggle('selected');
          if (card.classList.contains('selected')) {
            selectedAddons.push(item);
          } else {
            selectedAddons = selectedAddons.filter(a => a.id !== item.id);
          }
        });
        
        grid.appendChild(card);
      });
      
      sectionDiv.appendChild(grid);
      rightSection.appendChild(sectionDiv);
    }
  });

  goToScreen('screen-custom');
}

function refreshIngredientUI(name) {
  const badge = document.querySelector(`.ing-qty-badge[data-badge="${name}"]`);
  const card = document.querySelector(`.ing-card[data-name="${name}"]`);
  const qty = ingredientQuantities[name] || 0;
  
  if (badge) {
    if (qty > 0) {
      badge.style.display = 'flex';
      badge.textContent = `+${qty}`;
    } else {
      badge.style.display = 'none';
    }
  }
  if (card) {
    card.classList.toggle('selected', qty > 0);
  }
}

function updateCustomPrice(product) {
  let extrasTotal = 0;
  for (const [name, qty] of Object.entries(ingredientQuantities)) {
    const ing = ingredients.find(i => i.name === name);
    if (ing) extrasTotal += ing.price * qty;
  }
  const totalPrice = product.price + extrasTotal;
  $('custom-price').textContent = formatCurrency(totalPrice);
}

function confirmCustomizationAndAdd() {
  if (!selectedProduct) return;
  
  let extrasTotal = 0;
  const modifications = [];
  const modsDetail = [];

  for (const [name, qty] of Object.entries(ingredientQuantities)) {
    const ing = ingredients.find(i => i.name === name);
    if (ing) {
      extrasTotal += ing.price * qty;
      modifications.push(`${name} x${qty}`);
      modsDetail.push({ name, qty });
    }
  }
  
  cart.push({
    productId: selectedProduct.id,
    name: selectedProduct.name,
    img: selectedProduct.img,
    basePrice: selectedProduct.price,
    extras: extrasTotal,
    mods: modifications,
    modsDetail: modsDetail,
    qty: 1
  });
  
  selectedAddons.forEach(addon => {
    cart.push({
      productId: addon.id,
      name: addon.name,
      img: addon.img,
      basePrice: addon.price,
      extras: 0,
      mods: [],
      modsDetail: [],
      qty: 1
    });
  });

  selectedProduct = null;
  selectedAddons = [];
  ingredientQuantities = {};
  
  goToScreen('screen-menu');
  updateAddToCartButton();
}


// ============================================================================
// TELA DO CARRINHO (CART)
// ============================================================================

function renderCartItems() {
  const cartList = $('cart-list');
  cartList.innerHTML = '';
  
  const continueButton = $('nav-cont-cart');

  if (cart.length === 0) {
    cartList.innerHTML = '<div class="cart-empty-msg">Seu carrinho está vazio</div>';
    continueButton.disabled = true;
    return;
  }
  
  continueButton.disabled = false;
  
  cart.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'cart-item';
    
    const modificationsHtml = item.mods.length > 0 
      ? `<div class="mods">${item.mods.join(', ')}</div>` 
      : '';
      
    const totalPrice = (item.basePrice + item.extras) * item.qty;

    card.innerHTML = `
      <img src="${item.img}" alt="${item.name}" onerror="this.onerror=null;this.src='https://placehold.co/200x200/eeeeee/999999?text=Sem+Foto';">
      <div class="cart-item-body">
        <h4>${item.name} (${item.qty}x)</h4>
        ${modificationsHtml}
        <div class="item-price">${formatCurrency(totalPrice)}</div>
      </div>
      <div class="cart-item-actions">
        <button class="act-btn act-dup" data-index="${index}">Duplicar</button>
        <button class="act-btn act-rem" data-index="${index}">Remover</button>
        <button class="act-btn act-mod" data-index="${index}">Modificar</button>
      </div>
    `;
    
    cartList.appendChild(card);
  });

  // Ações do Carrinho
  cartList.querySelectorAll('.act-dup').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-index'));
      cart.push({ ...cart[idx] });
      renderCartItems();
    });
  });

  cartList.querySelectorAll('.act-rem').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-index'));
      cart.splice(idx, 1);
      renderCartItems();
    });
  });

  cartList.querySelectorAll('.act-mod').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-index'));
      const cartItem = cart[idx];
      const product = products.find(p => p.id === cartItem.productId);
      
      if (product) {
        selectedProduct = product;
        cart.splice(idx, 1);
        openCustomizationScreen(product);
      }
    });
  });
}


// ============================================================================
// PAGAMENTO E ENVIO DO PEDIDO (ORDER SUBMISSION)
// ============================================================================

function handlePaymentMethod(processingText, subtitleText) {
  $('pay-methods').style.display = 'none';
  $('pay-processing').style.display = 'flex';
  
  $('proc-text').textContent = processingText;
  $('proc-sub').textContent = subtitleText;
  
  // Simula 3 segundos processando o cartão/pix e então completa o pedido
  setTimeout(submitOrderToBackend, 3000);
}

async function submitOrderToBackend() {
  const totalAmount = cart.reduce((sum, item) => sum + ((item.basePrice + item.extras) * item.qty), 0);
  
  // Este é o JSON Final (Order Model) que é enviado para o Backend em Python
  const orderData = {
    items: [...cart],
    total: totalAmount,
    dineOption: dineOption,
    timestamp: new Date().toISOString()
  };

  let orderId;

  try {
    const response = await fetch(`${API_PUBLIC}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    
    if (response.ok) {
      const data = await response.json();
      orderId = data.id.toString().padStart(3, '0');
    } else {
      throw new Error('Erro na resposta do backend');
    }
  } catch (error) {
    console.error('Erro ao enviar pedido ao servidor.', error);
    // SECURITY FIX (VULN-12): No localStorage fallback for orders.
    alert('Erro ao processar pedido. Por favor, tente novamente ou contate um funcionário.');
    goToScreen('screen-menu');
    return;
  }

  // Mostra a tela de sucesso
  $('order-num').textContent = `#${orderId}`;
  $('pay-methods').style.display = 'flex';
  $('pay-processing').style.display = 'none';
  
  goToScreen('screen-confirm');
  
  // Contagem regressiva para voltar a tela inicial
  let secondsRemaining = 8;
  $('countdown').textContent = secondsRemaining;
  
  if (cdInterval) clearInterval(cdInterval);
  
  cdInterval = setInterval(() => {
    secondsRemaining--;
    $('countdown').textContent = secondsRemaining;
    
    if (secondsRemaining <= 0) {
      clearInterval(cdInterval);
      cart = [];
      goToScreen('screen-splash');
    }
  }, 1000);
}


// ============================================================================
// CARROSSEL (BANNERS ANIMADOS)
// ============================================================================

const carouselProducts = [
  { pid: 6, tag: '🔥 Promoção' },
  { pid: 7, tag: '🎉 Novidade' },
  { pid: 1, tag: '⭐ Mais pedido' },
  { pid: 3, tag: '🍗 Experimente' }
];

function buildCarouselSlides(trackId) {
  const track = $(trackId);
  if (!track) return;
  
  track.innerHTML = '';
  
  carouselProducts.forEach(carouselItem => {
    const product = products.find(p => p.id === carouselItem.pid);
    if (!product) return;
    
    const hiResImage = product.img.replace(/w=\d+/, 'w=1200').replace(/q=\d+/, 'q=85');
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    slide.innerHTML = `
      <img src="${hiResImage}" alt="${product.name}">
      <div class="carousel-info">
        <span class="tag">${carouselItem.tag}</span>
        <h3>${product.name}</h3>
        <div class="c-price">${formatCurrency(product.price)}</div>
      </div>
    `;
    
    slide.addEventListener('click', () => {
      selectedProduct = product;
      openCustomizationScreen(product);
    });
    
    track.appendChild(slide);
  });
}

function initCarouselWidget(trackId, dotsId) {
  buildCarouselSlides(trackId);
  const track = $(trackId);
  const dots = $(dotsId);
  
  if (!track || !dots) return;
  
  const totalSlides = track.children.length;
  if (totalSlides === 0) return;
  
  let currentSlide = 0;
  dots.innerHTML = '';
  
  for (let i = 0; i < totalSlides; i++) {
    const dot = document.createElement('div');
    dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    
    dot.addEventListener('click', () => {
      currentSlide = i;
      updateCarouselView();
    });
    
    dots.appendChild(dot);
  }
  
  function updateCarouselView() {
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    dots.querySelectorAll('.carousel-dot').forEach((dot, index) => {
      dot.classList.toggle('active', index === currentSlide);
    });
  }
  
  setInterval(() => {
    currentSlide = (currentSlide + 1) % totalSlides;
    updateCarouselView();
  }, 4000);
}


// ============================================================================
// INICIALIZAÇÃO E LISTENERS GERAIS (MAIN)
// ============================================================================

async function initializeApplication() {
  await fetchBackendData();
  initSplashScreen();
  initDineOptions();

  // Carrosseis das telas Menu, Custom e Cart
  initCarouselWidget('carousel-track', 'carousel-dots');
  initCarouselWidget('carousel-track-2', 'carousel-dots-2');
  initCarouselWidget('carousel-track-3', 'carousel-dots-3');

  // Eventos: Menu Principal
  $('btn-add-bar').addEventListener('click', () => {
    if (selectedProduct) openCustomizationScreen(selectedProduct);
  });
  $('nav-cart-menu').addEventListener('click', () => {
    renderCartItems();
    goToScreen('screen-cart');
  });
  $('nav-back-menu').addEventListener('click', () => goToScreen('screen-dine'));
  $('nav-cont-menu').addEventListener('click', () => {
    if (cart.length > 0) {
      renderCartItems();
      goToScreen('screen-cart');
    }
  });

  // Eventos: Tela de Customização
  $('btn-add-custom').addEventListener('click', confirmCustomizationAndAdd);
  $('nav-cart-custom').addEventListener('click', () => {
    confirmCustomizationAndAdd();
    renderCartItems();
    goToScreen('screen-cart');
  });
  $('nav-back-custom').addEventListener('click', () => goToScreen('screen-menu'));
  $('nav-cont-custom').addEventListener('click', () => {
    confirmCustomizationAndAdd();
    renderCartItems();
    goToScreen('screen-cart');
  });

  // Eventos: Carrinho
  $('nav-back-cart').addEventListener('click', () => goToScreen('screen-menu'));
  $('nav-cont-cart').addEventListener('click', () => {
    if (cart.length > 0) goToScreen('screen-payment');
  });

  // Eventos: Pagamento
  $('nav-back-pay').addEventListener('click', () => {
    renderCartItems();
    goToScreen('screen-cart');
  });
  
  $('pay-card').addEventListener('click', () => {
    handlePaymentMethod('Processando cartão...', 'Insira ou aproxime na maquininha');
  });
  $('pay-pix').addEventListener('click', () => {
    handlePaymentMethod('Aguardando PIX...', 'Escaneie o QR Code na tela inferior');
  });
  $('pay-cash').addEventListener('click', () => {
    handlePaymentMethod('Dirija-se ao caixa', 'Apresente o número do seu pedido');
  });

  // Acessibilidade Visual (Alto Contraste / Tamanho)
  const btnA11y = $('btn-a11y');
  if (localStorage.getItem('r_a11y') === '1') {
    document.body.classList.add('a11y');
    btnA11y.classList.add('on');
  }
  
  btnA11y.addEventListener('click', () => {
    document.body.classList.toggle('a11y');
    const isActive = document.body.classList.contains('a11y');
    btnA11y.classList.toggle('on', isActive);
    localStorage.setItem('r_a11y', isActive ? '1' : '0');
  });

  // NOTE: localStorage sync removed for security (VULN-12).
  // Products are now loaded exclusively from the backend API.
}

// Inicia a aplicação
initializeApplication();
