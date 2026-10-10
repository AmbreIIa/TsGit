let cart = [];
let globalStoreProducts = [];

const cartButton = document.getElementById("cartBtn");
const cartOverlay = document.getElementById("cartOverlay");
const closeBtn = document.getElementById("closeCartBtn");
const cartItemsContainer = document.getElementById("cartItemsContainer");

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

function calculateTotal() {
  return cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
}

function updateUI() {
  const cartCounter = document.querySelector(".cart-counter");
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (cartCounter) {
    cartCounter.textContent = totalItems;
  }

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

  const totalSumElement = document.getElementById("cartTotalSum");
  if (totalSumElement) {
    totalSumElement.textContent = calculateTotal().toFixed(2);
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

    const htmlString = data
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

    if (container) container.innerHTML = htmlString;
  } catch (error) {
    if (loader) loader.classList.add("hidden");
    if (container) container.innerHTML = `<p class="error">Помилка: ${error.message}</p>`;
  }
}

initShop();
