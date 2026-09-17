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

const container = document.querySelector(".products-grid");

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


