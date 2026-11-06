const CART_STORAGE_KEY = 'techshop_cart';
const THEME_STORAGE_KEY = 'techshop_key';
const FAVORITE_STORAGE_KEY = 'techshop_favorites';
const DRAFT_ORDER_KEY = 'techshop_order_draft';

let cart = loadCartFromStorage();
let globalStoreProducts = [];

const CATALOG_DEFAULTS = Object.freeze({
  q: '',
  category: 'all',
  sort: 'default',
  page: 1 
});

let catalogState = { ...CATALOG_DEFAULTS };

const ALLOWED_SORT = ['default', 'price-asc', 'price-desc', 'title-asc', 'rating_desc'];
const PRODUCTS_PER_PAGE = 6;
const MAX_QUERY_LENGTH = 50;

const categorySelect = document.getElementById('categorySelect');
const sortSelect = document.getElementById('sortSelect');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const shareLinkBtn = document.getElementById('shareLinkBtn');
const paginationContainer = document.getElementById('pagination');
const catalogInfo = document.getElementById('catalogInfo');
const themeToggleBtn = document.getElementById("themeToggleBtn");
const cartButton = document.getElementById("cartBtn");
const cartOverlay = document.getElementById("cartOverlay");
const closeBtn = document.getElementById("closeCartBtn");
const cartItemsContainer = document.getElementById("cartItemsContainer");
const searchInput = document.getElementById('searchInput');
const searchResultCount = document.getElementById('searchResultCount');
const orderForm = document.getElementById('checkoutOrderForm');

// --- ЧИТАННЯ СТАНУ З URL ---
function readStateFromURL() {
  const params = new URLSearchParams(window.location.search);
  const q = (params.get('q') || '').trim().slice(0, MAX_QUERY_LENGTH);
  const category = params.get('category') || CATALOG_DEFAULTS.category;
  const rawSort = params.get('sort');
  const sort = ALLOWED_SORT.includes(rawSort) ? rawSort : CATALOG_DEFAULTS.sort;
  const rawPage = Number.parseInt(params.get('page'), 10);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : CATALOG_DEFAULTS.page;

  return { q, category, sort, page };
}

function getAvailableCategories(products) {
  return [...new Set(products.map(p => p.category))];
}

function validateCategory(category) {
  const categories = getAvailableCategories(globalStoreProducts);
  return categories.includes(category) ? category : CATALOG_DEFAULTS.category;
}

// --- ЗАПИС СТАНУ В URL ---  
function buildCatalogURL(state) {
  const url = new URL(window.location.href);
  const params = new URLSearchParams();

  if (state.q) params.set('q', state.q);
  if (state.category !== CATALOG_DEFAULTS.category) params.set('category', state.category);
  if (state.sort !== CATALOG_DEFAULTS.sort) params.set('sort', state.sort);
  if (state.page !== CATALOG_DEFAULTS.page) params.set('page', String(state.page));

  url.search = params.toString();
  return url;
}

function syncURL(mode = 'push') {
  const newURL = buildCatalogURL(catalogState);

  if (newURL.href === window.location.href) return;

  const stateSnapshot = { ...catalogState };

  if (mode === 'replace') {
    history.replaceState(stateSnapshot, '', newURL);
  } else {
    history.pushState(stateSnapshot, '', newURL);
  }
}

// --- ФІЛЬТРАЦІЯ, СОРТУВАННЯ, ПАГІНАЦІЯ ---
function filterProducts(products, { q, category }) {
  const normalizedQuery = q.toLowerCase();

  return products.filter(product => {
    const matchesQuery = !q || product.title.toLowerCase().includes(normalizedQuery);
    const matchesCategory = category === 'all' || product.category === category;
    return matchesQuery && matchesCategory;
  });
}

function sortProducts(products, sort) {
  const sorted = [...products];

  switch (sort) {
    case 'price-asc':
      sorted.sort((a, b) => a.price - b.price); // Corrected
      break;
    case 'price-desc':
      sorted.sort((a, b) => b.price - a.price); // Corrected
      break;
    case 'title-asc':
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'rating_desc':
      return sorted.sort((a, b) => (b.rating?.rate ?? 0) - (a.rating?.rate ?? 0));
    default:
      return sorted; 
  }
  return sorted;
}

function paginateProducts(products, page, perPage) {
  const totalItems = products.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const startIndex = (currentPage - 1) * perPage; // Corrected
  const endIndex = startIndex + perPage;

  return {
    items: products.slice(startIndex, endIndex),
    totalItems,
    totalPages,
    currentPage,
    startIndex,
  };                                 
}

function updateCatalog(historyMode = null) {
  const filter = filterProducts(globalStoreProducts, catalogState);
  const sorted = sortProducts(filter, catalogState.sort);
  const { items, totalItems, totalPages, currentPage, startIndex } = paginateProducts(sorted, catalogState.page, PRODUCTS_PER_PAGE);

  if (currentPage !== catalogState.page) {
    catalogState.page = currentPage;
    historyMode = historyMode || 'replace';
  }

  renderProducts(items);
  renderPagination(currentPage, totalPages);
  renderCatalogInfo(totalItems, startIndex, items.length);

  if (historyMode) {
    syncURL(historyMode);
  }
}

function renderCatalogInfo(totalItems, startIndex, showCount) {
  if (!catalogInfo) return;

  if (totalItems === 0) {
    catalogInfo.textContent = catalogState.q
      ? `За запитом «${catalogState.q}» нічого не знайдено.`
      : 'У цій категорії поки немає товарів';
    return;
  }

  const from = startIndex + 1;
  const to = startIndex + showCount;
  catalogInfo.textContent = `Показано ${from}–${to} з ${totalItems} товарів`; 
}

function renderPagination(currentPage, totalPages) {
  if (!paginationContainer) return;

  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  paginationContainer.innerHTML = `
    <button class="page-btn" data-page="${currentPage - 1}"
      ${currentPage === 1 ? 'disabled' : ''} aria-label="Попередня сторінка">‹</button>

    ${pageNumbers.map(number => `
      <button class="page-btn ${number === currentPage ? 'is-active' : ''}"
        data-page="${number}"
        ${number === currentPage ? 'aria-current="page"' : ''}>${number}</button>
    `).join('')}

    <button class="page-btn" data-page="${currentPage + 1}"
      ${currentPage === totalPages ? 'disabled' : ''} aria-label="Наступна сторінка">›</button>
  `;
}

if (paginationContainer) {
  paginationContainer.addEventListener('click', (event) => {
    const button = event.target.closest('.page-btn');
    if (!button || button.disabled) return;

    const targetPage = Number(button.dataset.page);
    if (targetPage === catalogState.page) return;

    catalogState.page = targetPage;
    updateCatalog('push'); 

    document.querySelector('.catalog-toolbar')?.scrollIntoView({ behavior: 'smooth' });
  });
}

// --- УПРАВЛІННЯ СТАНОМ ЕЛЕМЕНТІВ UI ---

function debounce(callback, delay = 300) {
  let timerId = null;
  return (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => callback(...args), delay);
  };
}

function applyStateToControls() {
  if (searchInput) searchInput.value = catalogState.q;
  if (categorySelect) categorySelect.value = catalogState.category;
  if (sortSelect) sortSelect.value = catalogState.sort;
}

if (searchInput) {
  const handleSearch = debounce((value) => {
    catalogState.q = value.trim().slice(0, MAX_QUERY_LENGTH);
    catalogState.page = 1; 
    updateCatalog('replace');
  }, 300);

  searchInput.addEventListener('input', (event) => handleSearch(event.target.value));
}

if (categorySelect) {
  categorySelect.addEventListener('change', (event) => {
    catalogState.category = event.target.value;
    catalogState.page = 1; 
    updateCatalog('push');
  });
}

if (sortSelect) {
  sortSelect.addEventListener('change', (event) => {
    catalogState.sort = event.target.value;
    catalogState.page = 1;
    updateCatalog('push');
  });
}

if (resetFiltersBtn) {
  resetFiltersBtn.addEventListener('click', () => {
    catalogState = { ...CATALOG_DEFAULTS };
    applyStateToControls();
    updateCatalog('push');
  });
}

function populateCategorySelect(products) {
  if (!categorySelect) return;

  const categories = getAvailableCategories(products); // Corrected typo here

  categorySelect.innerHTML = `<option value="all">Усі категорії</option>`;

  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;

    option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    categorySelect.appendChild(option);
  });
}
// --- ІНШІ СЛУХАЧІ ТА ФУНКЦІЇ ---

window.addEventListener('popstate', (event) => {
  console.log('popstate -> history.state:', event.state); // Corrected syntax here

  catalogState = readStateFromURL();
  catalogState.category = validateCategory(catalogState.category); // Corrected typo here

  applyStateToControls();
  updateCatalog();
})

if (shareLinkBtn) {
  shareLinkBtn.addEventListener('click', async () => {
    const originalText = shareLinkBtn.textContent;

    try {
      await navigator.clipboard.writeText(window.location.href);
      shareLinkBtn.textContent = 'Скопійовано!';
    } catch (error) {
      console.error('Невдалося скопіювати посилання:', error);
      window.prompt('Скопіюйте посилання вручну:', window.location.href);
    }

    setTimeout(() => {
      shareLinkBtn.textContent = originalText;
    }, 200);
  });
}

window.addEventListener('storage', (event) => {
  if (event.key === CART_STORAGE_KEY) {
    console.log('Виявлено зміну кошика в сусідній вкладці!');
    cart = loadCartFromStorage();
    updateCartSummery();

    if (typeof renderCartModalItems === 'function') {
      renderCartModalItems();
    }
  }

  if (event.key === THEME_STORAGE_KEY) {
    applytheme(event.newValue || 'light');
  }

  if (event.key === FAVORITE_STORAGE_KEY) {
    favoriteProductIds = loadFavoritesFromStorage();
    renderFavoriteZone();
  }
});

function saveOrderFromData() {
  if (!orderForm) return;

  const drafData = {
    clientName: document.getElementById('clientName')?.value || '',
    clientPhone: document.getElementById('clientPhone')?.value || '',
    clientEmail: document.getElementById('clientEmail')?.value || '',
    orderPromo: document.getElementById('orderPromo')?.value || ''
  }

  sessionStorage.setItem(DRAFT_ORDER_KEY, JSON.stringify(drafData));
}

function restoreOrderFromData() {
  const rawData = sessionStorage.getItem(DRAFT_ORDER_KEY);
  if (!rawData || !orderForm) return;

  try {
    const draft = JSON.parse(rawData);

    if (draft.clientName) document.getElementById('clientName').value = draft.clientName;
    if (draft.clientPhone) document.getElementById('clientPhone').value = draft.clientPhone;
    if (draft.clientEmail) document.getElementById('clientEmail').value = draft.clientEmail;
    if (draft.orderPromo) document.getElementById('orderPromo').value = draft.orderPromo;
  } catch(error) {
    console.error('Помилка відновлення чернетки замовлення:', error);
  }
}

if (orderForm) {
  orderForm.addEventListener('input', () => {
    saveOrderFromData();
  });
}

// --- ЗАВАНТАЖЕННЯ ТА ЗБЕРЕЖЕННЯ КОШИКА ---
function loadCartFromStorage() {
  const rawdata = localStorage.getItem(CART_STORAGE_KEY);
  if (!rawdata) {
    return [];
  }
  try {
    const parsedCart = JSON.parse(rawdata);
    if (Array.isArray(parsedCart)) {
      return parsedCart;
    }
    return [];
  } catch (error) {
    console.error('Помилка парсингу кошика з localStorage:', error);
    localStorage.removeItem(CART_STORAGE_KEY);
    return [];
  }
}

function saveCartToStorage() {
  try {
    const serializerData = JSON.stringify(cart);
    localStorage.setItem(CART_STORAGE_KEY, serializerData);
  } catch (error) {
    console.error('Помилка збереження кошика у Web Storage:', error);
  }
}

// --- ТЕМА ---
function applytheme(themeName) {
  const themeIcon = themeToggleBtn?.querySelector('.theme-icon');
  const themeText = themeToggleBtn?.querySelector('.theme-text'); 

  if (themeName === 'dark') {
    document.body.classList.add('dark-theme');
    if (themeIcon) themeIcon.textContent = '☀️';
    if (themeText) themeText.textContent = 'Світла тема';
  } else {
    document.body.classList.remove('dark-theme');
    if (themeIcon) themeIcon.textContent = '🌙';
    if (themeText) themeText.textContent = 'Темна тема';
  }
}

function initTheme(){
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme) {
    applytheme(savedTheme);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applytheme(prefersDark ? 'dark' : 'light');
  }
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const isCurrentlyDark = document.body.classList.contains('dark-theme');
    const newTheme = isCurrentlyDark ? 'light' : 'dark';

    applytheme(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  });
}

// --- ВАЛІДАЦІЯ ТА ФОРМА ---
function validateCheckoutForm(name, phone, email) {
  let isValid = true;

  document.getElementById('nameError').textContent = '';
  document.getElementById('phoneError').textContent = '';
  document.getElementById('emailError').textContent = '';

  const words = name.split(' ').filter(Boolean);
  if (words.length < 2 || name.length < 5) {
    document.getElementById('nameError').textContent = "Введіть повне ім'я та прізвище (щонайменше 2 слова).";
    isValid = false;
  }

  const phonePattern = /^\+?380\d{9}$/;
  if (!phonePattern.test(phone)) {
    document.getElementById('phoneError').textContent = 'Введіть коректний номер у форматі +380XXXXXXXXX.';
    isValid = false;
  }

  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(email)) {
    document.getElementById('emailError').textContent = "Введіть дійсну поштову адресу (наприклад, user@mail.com).";
    isValid = false;
  }

  return isValid;
}

if (orderForm) {
  orderForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(orderForm);
    const rawName = formData.get('clientName') || '';
    const rawPhone = formData.get('clientPhone') || '';
    const rawEmail = formData.get('clientEmail') || '';
    const rawPromo = formData.get('orderPromo') || '';

    const cleanName = rawName.trim().replace(/\s+/g, ' ');
    const cleanPhone = rawPhone.replaceAll(/[\s\(\)\-]/g, '');
    const cleanEmail = rawEmail.trim().toLowerCase();
    const cleanPromo = rawPromo.trim().toUpperCase();

    const isFormValid = validateCheckoutForm(cleanName, cleanPhone, cleanEmail);
    if (!isFormValid) {
      return;
    }

    completeCheckoutProcess(cleanName, cleanPhone, cleanEmail, cleanPromo);
  });
}


// --- РОБОТА З МОДАЛКОЮ ТА КОШИКОМ ---
function openCartModal() {
  cartOverlay.classList.remove("hidden");
  updateUI();
}

function closeCartModal() {
  cartOverlay.classList.add("hidden");
}

if (cartButton) cartButton.addEventListener("click", openCartModal);
if (closeBtn) closeBtn.addEventListener("click", closeCartModal);

if (cartOverlay) {
  cartOverlay.addEventListener("click", (event) => {
    if (event.target === cartOverlay) {
      closeCartModal();
    }
  });
}

function addToCart(productId) {
  const product = globalStoreProducts.find(item => item.id === Number(productId));
  if (!product) return;

  const existingCartItem = cart.find(item => item.id === product.id);

  if (existingCartItem) {
    existingCartItem.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image,
      quantity: 1
    });
  }

  saveCartToStorage();
  updateUI();
}

function changeCartQuantity(productId, delta) {
  const itemIndex = cart.findIndex(item => item.id === Number(productId));
  if (itemIndex === -1) return;

  cart[itemIndex].quantity += delta;

  if (cart[itemIndex].quantity <= 0) {
    cart.splice(itemIndex, 1);
  }

  saveCartToStorage();
  updateUI();
}

function clearCart() {
  cart = [];
  localStorage.removeItem(CART_STORAGE_KEY);
  updateUI();
}

if (cartItemsContainer) {
  cartItemsContainer.addEventListener("click", (event) => {
    if (event.target.classList.contains("btn-increase")) {
      const productId = event.target.dataset.id;
      changeCartQuantity(productId, 1);
    }
    if (event.target.classList.contains("btn-decrease")) {
      const productId = event.target.dataset.id;
      changeCartQuantity(productId, -1);
    }
  });
}

function updateCartSummery() {
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotalSum = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0); // Corrected

  const cartBadge = document.getElementById('num') || document.getElementById('cartCountBadge');
  const cartPriceElement = document.getElementById('total') || document.getElementById('cartTotalPrice');
  const modalTotalElement = document.getElementById('cartTotalSum');

  if (cartBadge) cartBadge.textContent = totalItems;
  if (cartPriceElement) cartPriceElement.textContent = `${subtotalSum.toFixed(2)} грн`;
  if (modalTotalElement) modalTotalElement.textContent = subtotalSum.toFixed(2);

  return subtotalSum;
}

function updateUI() {
  updateCartSummery();

  if (cartItemsContainer) {
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = "<p>Кошик порожній</p>";
    } else {
      cartItemsContainer.innerHTML = cart
        .map(
          (item) => `
            <div class="cart-item" data-id="${item.id}">
              <img src="${item.image}" alt="${item.title}" width="50">
              <div class="cart-item-info">
                <h4>${item.title}</h4>
                <p>$${item.price}</p>
              </div>
              <div class="cart-item-controls">
                <button class="btn-decrease" data-id="${item.id}">-</button>
                <span>${item.quantity}</span>
                <button class="btn-increase" data-id="${item.id}">+</button>
              </div>
            </div>
          `
        )
        .join("");
    } 
  }
}

function completeCheckoutProcess(name, phone, email, promo) {
  if (cart.length === 0) {
    alert("Ваш кошик порожній! Спочатку додайте товари до кошика.");
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0); // Corrected
  let discountPercent = 0;
  
  if (promo === 'SALE10') {
    discountPercent = 10;
  }

  const discountAmount = Math.round(subtotal * (discountPercent / 100)); // Corrected
  const finalAmount = Math.max(0, subtotal - discountAmount); // Corrected

  const orderData = {
    customer: { name, phone, email },
    items: cart.map(item => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      price: item.price,
      cost: Number((item.price * item.quantity).toFixed(2)) // Corrected
    })),
    promoCode: promo || null,
    discountAmount: discountAmount,
    totalToPay: Number(finalAmount.toFixed(2)),
    createdAt: new Date().toISOString()
  };

  console.log("Замовлення сформовано (JSON Payload):", orderData);
  alert(`Дякуємо, ${name}! Замовлення на суму ${finalAmount} грн успішно прийнято.`);

  clearCart(); 
  
  if (orderForm) {
    orderForm.reset();
  }
  if (typeof closeCartModal === 'function') {
    closeCartModal();
  }
}

// --- ЗАВАНТАЖЕННЯ ТОВАРІВ З API ---
async function fetchProducts() {
  try {
    const response = await fetch("https://fakestoreapi.com/products?limit=8");
    if (!response.ok) {
      throw new Error(`HTTP помилка: ${response.status}`);
    }
    const realProducts = await response.json();
    return realProducts;
  } catch (error) {
    console.error("Помилка завантаження товарів: ", error.message);
    throw error;
  }
}

function renderProducts(productsToRender) {
  const container = document.querySelector(".products-grid");
  if (!container) return;

  if (productsToRender.length === 0) {
    container.innerHTML = "<p>Нічого не знайдено за вашим запитом.</p>";
    return;
  }

  container.innerHTML = productsToRender
    .map(
      (product) => `
        <article class="product-card" draggable="true" data-id="${product.id}">
            <img src="${product.image}" alt="${product.title}">
            <h3>${product.title}</h3>
            <p class="price">$${product.price}</p>
            <button class="btn btn-buy" data-id="${product.id}">Купити</button>
        </article>
      `
    )
    .join("");
}

const productsContainer = document.querySelector(".products-grid");

if (productsContainer) {
  productsContainer.addEventListener("click", (event) => {
    if (event.target.classList.contains('btn-buy')) {
      const productId = Number(event.target.dataset.id);
      addToCart(productId);
    }
  });

  productsContainer.addEventListener('dragstart', (event) => {
    const card = event.target.closest('.product-card');
    if (card) {
      event.dataTransfer.setData('text/plain', card.dataset.id);
      card.classList.add('dragging');
    }
  });

  productsContainer.addEventListener('dragend', (event) => {
    const card = event.target.closest('.product-card');
    if (card) {
      card.classList.remove('dragging');
    }
  });
}

// --- DRAG & DROP ДЛЯ ОБРАНОГО ---
const favoriteZone = document.getElementById('favoriteZone');

function loadFavoritesFromStorage() {
  try {
    const rawData = localStorage.getItem(FAVORITE_STORAGE_KEY);
    return rawData ? JSON.parse(rawData) : [];
  } catch (error) {
    console.error('Помилка завантаження Favorites:', error);
    return [];
  }
}

let favoriteProductIds = loadFavoritesFromStorage();

function saveFavoritesToStorage() {
  localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(favoriteProductIds));
}

function renderFavoriteZone() {
  if (!favoriteZone) return;

  if (favoriteProductIds.length === 0) {
    favoriteZone.innerHTML = '<p class="empty-fav">Перетягніть сюди товари в Улюблене</p>';
    return;
  }

  const favoriteItems = globalStoreProducts.filter(product => favoriteProductIds.includes(product.id));

  if (favoriteItems.length === 0 && globalStoreProducts.length > 0) {
      favoriteProductIds = [];
      saveFavoritesToStorage();
      favoriteZone.innerHTML = '<p class="empty-fav">Перетягніть сюди товари в Улюблене</p>';
      return;
  } else if (favoriteItems.length === 0) {
      favoriteZone.innerHTML = '<p class="empty-fav">Завантаження улюблених товарів...</p>';
      return;
  }

  favoriteZone.innerHTML = `
    <h4>Обрані товари (${favoriteItems.length}):</h4>
    <div class="fav-chips" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
      ${favoriteItems.map(item =>`
        <span class="fav-chip" style="background: var(--bg-color); border: 1px solid var(--border-color); padding: 4px 10px; border-radius: 20px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
          ${item.title.substring(0, 18)}...
          <button class="btn-remove-fav" data-id="${item.id}" style="border:none; background:none; cursor:pointer; color:red;">×</button>
        </span>
      `).join('')}
    </div>
  `;
}

if (favoriteZone) {
  favoriteZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    favoriteZone.classList.add('drag-over');
  });

  favoriteZone.addEventListener('dragleave', () => {
    favoriteZone.classList.remove('drag-over');
  });

  favoriteZone.addEventListener('drop', (event) => {
    event.preventDefault();
    favoriteZone.classList.remove('drag-over');
    
    const productId = Number(event.dataTransfer.getData('text/plain'));

    if (productId && !favoriteProductIds.includes(productId)) {
      favoriteProductIds.push(productId);
      saveFavoritesToStorage();
      renderFavoriteZone();
    }
  });

  favoriteZone.addEventListener('click', (event) => {
    if (event.target.classList.contains('btn-remove-fav')) {
      const idToRemove = Number(event.target.dataset.id);
      favoriteProductIds = favoriteProductIds.filter(id => id !== idToRemove);
      saveFavoritesToStorage();
      renderFavoriteZone();
    }
  });
}

// --- ІНІЦІАЛІЗАЦІЯ ---
async function initShop() {
  const loader = document.getElementById("loader");
  const container = document.querySelector(".products-grid");

  if (loader) loader.classList.remove("hidden");
  if (container) container.innerHTML = "";

  try {
    const data = await fetchProducts();
    globalStoreProducts = data;

    if (loader) loader.classList.add("hidden");

    populateCategorySelect(globalStoreProducts);
    
    catalogState = readStateFromURL();
    catalogState.category = validateCategory(catalogState.category);
    
    applyStateToControls();
    
    updateCatalog('replace');
    
    updateUI();
  
    renderFavoriteZone(); 
    
  } catch (error) {
    if (loader) loader.classList.add("hidden");
    if (container) container.innerHTML = `<p class="error">Помилка: ${error.message}</p>`;
  }
}

initTheme();
initShop();

document.addEventListener('DOMContentLoaded', () => {
  if (typeof updateCartSummery === 'function') {
    updateCartSummery();
  }

  if (typeof restoreOrderFromData === 'function') {
    restoreOrderFromData();
  }
});

window.readStateFromURL = readStateFromURL;
window.validateCategory = validateCategory;
