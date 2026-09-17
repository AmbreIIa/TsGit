
let cart = [];
const products = [
  {
    id: 1,
    title: "ТЦК Фон",
    price: 6767,
    category: "Телефони",
    image: "images/telephone.png"
  },
  {
    id: 2,
    title: "Ноутбук ім. Дегона",
    price: 33767,
    category: "Ноутбуки",
    image: "images/nout.png"
  },
  {
    id: 3,
    title: "Смарт туз",
    price: 6700,
    category: "Годинники",
    image: "images/chasi.png"
  },
  {
    id: 4,
    title: "Еір Туз Про",
    price: 22867,
    category: "Навушники",
    image: "images/headphone.png"
  },
  {
    id: 5,
    title: "Чохол для навушників",
    price: 670,
    category: "Аксесуари",
    image: "images/Chehol_headphone.jpg"
  },
];

function updateUI(){

  const cartCounter = document.querySelector(".cart-counter");
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (cartCounter) {
    cartCounter.textContent = totalItems;
  }

  console.log("Поточний кошик:", cart);
  console.log("Загальна сума:", calculateTotal(), "грн");
}

function addToCart(product){

  const existingItem = cart.find((item) => item.id === product.id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1});
  }

  updateUI();
}

function calculateTotal(){

  return cart.reduce(
    (total, item) => total + item.price * item.quantity, 0,);
}

const container = document.querySelector(".products-grid")

container.addEventListener("click", (event) => {

  if (event.target.classList.contains("btn-buy")){

    const productId = Number(event.target.dataset.id);
    const selectProduct = products.find((p) => p.id === productId);
    addToCart(selectProduct);
  }
});

const htmlString = products
  .map((product) => {
    return `
      <article class="product-card">
          <img src="${product.image}" alt="${product.title}">
          <h3>${product.title}</h3>
          <p class="price">${product.price} грн</p>
          <button class="btn btn-buy" data-id="${product.id}">Купити</button>
      </article>
    `;
  })
  .join("");

container.innerHTML = htmlString;


