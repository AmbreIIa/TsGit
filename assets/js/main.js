let cart = [];
let globalStoreProducts = [];

const cartButton = document.getElementById("cartBtn");
const cartOverlay = document.getElementById("cartOverlay");
const closeBtn = document.getElementById("closeCartBtn");
const cartItemsContainer = document.getElementById("cartItemsContainer");
const searchInput = document.getElementById('searchInput');
const searchResultCount = document.getElementById('searchResultCount');
const orderForm = document.getElementById('checkoutOrderForm');

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

if (searchInput) {
  searchInput.addEventListener('input', (event) => {
    const searchQuery = event.target.value.trim().toLowerCase();
    
    const matchedProducts = globalStoreProducts.filter(product => {
      return product.title.toLowerCase().includes(searchQuery);
    });

    if (searchQuery.length > 0) {
      searchResultCount.textContent = `Знайдено товарів: ${matchedProducts.length}`;
    } else {
      searchResultCount.textContent = '';
    }

    renderProducts(matchedProducts);
  });
}

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

function updateCartSummery() {
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotalSum = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0); // Виправлено: додано знак *

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

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  let discountPercent = 0;
  if (promo === 'SALE10') {
    discountPercent = 10;
  }

  const discountAmount = Math.round(subtotal * (discountPercent / 100)); 
  const finalAmount = Math.max(0, subtotal - discountAmount);

  const orderData = {
    customer: {
      name: name,
      phone: phone,
      email: email
    },
    items: cart.map(item => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      price: item.price,
      cost: Number((item.price * item.quantity).toFixed(2))
    })),
    promoCode: promo || null,
    discountAmount: discountAmount,
    totalToPay: Number(finalAmount.toFixed(2)),
    createdAt: new Date().toISOString()
  };

  console.log("Замовлення сформовано (JSON Payload):", orderData);
  alert(`Дякуємо, ${name}! Замовлення на суму ${finalAmount} грн успішно прийнято.`);

  cart = [];
  updateCartSummery();
  
  if (orderForm) {
    orderForm.reset();
  }

  if (typeof closeCartModal === 'function') {
    closeCartModal();
  }
}

function addToCart(product) {
  const existingItem = cart.find((item) => item.id === product.id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  updateUI();
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
      const selectedProduct = globalStoreProducts.find((p) => p.id === productId);
      
      if (selectedProduct) {
        addToCart(selectedProduct);
      }
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

const favoriteZone = document.getElementById('favoriteZone');

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
    
    const productId = event.dataTransfer.getData('text/plain');
    const product = globalStoreProducts.find((p) => p.id == productId);

    if (product) {
      favoriteZone.innerHTML += `<div class="fav-item">❤️ ${product.title}</div>`;
    }
  });
}

async function initShop() {
  const loader = document.getElementById("loader");
  const container = document.querySelector(".products-grid");

  if (loader) loader.classList.remove("hidden");
  if (container) container.innerHTML = "";

  try {
    const data = await fetchProducts();
    globalStoreProducts = data;

    if (loader) loader.classList.add("hidden");
    renderProducts(globalStoreProducts);
  } catch (error) {
    if (loader) loader.classList.add("hidden");
    if (container) container.innerHTML = `<p class="error">Помилка: ${error.message}</p>`;
  }
}

initShop();
