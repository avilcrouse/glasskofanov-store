import { useEffect, useState } from "react";
import "./App.css";

const products = [
  {
    id: 1,
    name: "Kofanov Classic Black",
    price: 4990,
    category: "Солнцезащитные",
    description: "Лёгкая классическая оправа на каждый день.",
    image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=900",
  },
  {
    id: 2,
    name: "Kofanov Silver",
    price: 5990,
    category: "Мужские",
    description: "Современная модель с универсальной посадкой.",
    image: "https://images.unsplash.com/photo-1577803645773-f96470509666?w=900",
  },
  {
    id: 3,
    name: "Kofanov Brown",
    price: 4490,
    category: "Классические",
    description: "Тёплый оттенок оправы и минималистичный дизайн.",
    image: "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=900",
  },
  {
    id: 4,
    name: "Kofanov Premium",
    price: 7990,
    category: "Premium",
    description: "Премиальная модель с акцентом на детали.",
    image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=900",
  },
];

function App() {
  const [telegramUser, setTelegramUser] = useState(null);
  const [page, setPage] = useState("home");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [sending, setSending] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const [orderData, setOrderData] = useState({
    name: "",
    phone: "",
    city: "",
    address: "",
  });

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      return;
    }

    tg.ready();
    tg.expand();

    const user = tg.initDataUnsafe?.user;

    if (user) {
      setTelegramUser(user);
    }
  }, []);

  const addToCart = (product) => {
    setCart((currentCart) => {
      const existingProduct = currentCart.find(
        (item) => item.id === product.id,
      );

      if (existingProduct) {
        return currentCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  const increaseQuantity = (id) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  };

  const decreaseQuantity = (id) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeFromCart = (id) => {
    setCart((currentCart) => currentCart.filter((item) => item.id !== id));
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const openProduct = (product) => {
    setSelectedProduct(product);
    setPage("product");
  };

  const renderProducts = () => (
    <div className="products">
      {products.map((product) => (
        <article
          className="product-card"
          key={product.id}
          onClick={() => openProduct(product)}
        >
          <img src={product.image} alt={product.name} />

          <div className="product-info">
            <span className="category">{product.category}</span>

            <h3>{product.name}</h3>

            <div className="product-bottom">
              <strong>{product.price.toLocaleString("ru-RU")} ₽</strong>

              <button
                onClick={(event) => {
                  event.stopPropagation();
                  addToCart(product);
                }}
              >
                +
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>GLASS KOFANOV</h1>
          <span>EYEWEAR STORE</span>
        </div>

        <button className="cart-top" onClick={() => setPage("cart")}>
          Корзина · {totalItems}
        </button>
      </header>

      {page === "home" && (
        <>
          <section className="hero">
            <p>НОВАЯ КОЛЛЕКЦИЯ</p>

            <h2>
              Очки, которые
              <br />
              создают образ.
            </h2>

            <span>Современные оправы и солнцезащитные очки</span>
          </section>

          <main>
            <div className="catalog-title">
              <h2>Каталог</h2>
              <span>{products.length} модели</span>
            </div>

            {renderProducts()}
          </main>
        </>
      )}

      {page === "catalog" && (
        <main>
          <div className="page-heading">
            <h2>Каталог</h2>
            <p>Все модели Glass Kofanov</p>
          </div>

          {renderProducts()}
        </main>
      )}

      {page === "product" && selectedProduct && (
        <main className="product-page">
          <button className="back-button" onClick={() => setPage("catalog")}>
            ← Назад
          </button>

          <img
            className="product-main-image"
            src={selectedProduct.image}
            alt={selectedProduct.name}
          />

          <span className="category">{selectedProduct.category}</span>

          <h2>{selectedProduct.name}</h2>

          <p className="description">{selectedProduct.description}</p>

          <div className="product-price">
            {selectedProduct.price.toLocaleString("ru-RU")} ₽
          </div>

          <button
            className="main-button"
            onClick={() => addToCart(selectedProduct)}
          >
            Добавить в корзину
          </button>
        </main>
      )}

      {page === "cart" && !orderSuccess && (
        <main>
          <div className="page-heading">
            <h2>Корзина</h2>
            <p>{totalItems} товаров</p>
          </div>

          {cart.length === 0 ? (
            <div className="empty-cart">
              <h3>Корзина пуста</h3>

              <p>Добавьте понравившиеся очки из каталога.</p>

              <button
                className="main-button"
                onClick={() => setPage("catalog")}
              >
                Перейти в каталог
              </button>
            </div>
          ) : (
            <>
              <div className="cart-list">
                {cart.map((item) => (
                  <div className="cart-item" key={item.id}>
                    <img src={item.image} alt={item.name} />

                    <div className="cart-item-info">
                      <span className="category">{item.category}</span>

                      <h3>{item.name}</h3>

                      <strong>{item.price.toLocaleString("ru-RU")} ₽</strong>

                      <div className="quantity">
                        <button onClick={() => decreaseQuantity(item.id)}>
                          −
                        </button>

                        <span>{item.quantity}</span>

                        <button onClick={() => increaseQuantity(item.id)}>
                          +
                        </button>
                      </div>

                      <button
                        className="remove-button"
                        onClick={() => removeFromCart(item.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cart-summary">
                <div>
                  <span>Итого</span>

                  <strong>{totalPrice.toLocaleString("ru-RU")} ₽</strong>
                </div>

                <button
                  className="main-button"
                  onClick={() => setCheckout(true)}
                >
                  Оформить заказ
                </button>
              </div>
            </>
          )}
          {checkout && (
            <div className="checkout-form">
              <h2>Оформление заказа</h2>

              <input
                placeholder="Имя"
                value={orderData.name}
                onChange={(e) =>
                  setOrderData({
                    ...orderData,
                    name: e.target.value,
                  })
                }
              />

              <input
                placeholder="Телефон"
                value={orderData.phone}
                onChange={(e) =>
                  setOrderData({
                    ...orderData,
                    phone: e.target.value,
                  })
                }
              />

              <input
                placeholder="Город"
                value={orderData.city}
                onChange={(e) =>
                  setOrderData({
                    ...orderData,
                    city: e.target.value,
                  })
                }
              />

              <input
                placeholder="Адрес доставки"
                value={orderData.address}
                onChange={(e) =>
                  setOrderData({
                    ...orderData,
                    address: e.target.value,
                  })
                }
              />

              <button
                className="main-button"
                disabled={sending}
                onClick={async () => {
                  if (sending) return;

                  setSending(true);

                  const tg = window.Telegram?.WebApp;

                  const response = await fetch("/api/order", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      name: orderData.name,
                      phone: orderData.phone,
                      city: orderData.city,
                      address: orderData.address,
                      cart: cart,
                      username: tg?.initDataUnsafe?.user?.username,
                    }),
                  });

                  const result = await response.json();

                  if (result.success) {
                    const number = Math.floor(1000 + Math.random() * 9000);

                    setOrderNumber(number);

                    setCart([]);
                    setCheckout(false);
                    setOrderSuccess(true);
                    setSending(false);

                    setOrderData({
                      name: "",
                      phone: "",
                      city: "",
                      address: "",
                    });
                  }

                  setSending(false);
                }}
              >
                {sending ? "Отправка..." : "Подтвердить заказ"}
              </button>
            </div>
          )}
        </main>
      )}
      {page === "cart" && orderSuccess && (
        <div className="success-box">
          <div className="success-icon">✓</div>

          <h2>Спасибо за заказ!</h2>
          <h3>Заказ №{orderNumber}</h3>

          <p>
            Мы получили ваши данные.
            <br />
            Скоро свяжемся с вами.
          </p>

          <button
            className="main-button"
            onClick={() => {
              setOrderSuccess(false);
              setPage("home");
            }}
          >
            Вернуться в магазин
          </button>
        </div>
      )}
      {page === "profile" && (
        <main>
          <div className="page-heading">
            <h2>Профиль</h2>
            <p>Telegram-профиль покупателя</p>
          </div>

          <div className="profile-card">
            {telegramUser?.photo_url ? (
              <img
                className="telegram-avatar"
                src={telegramUser.photo_url}
                alt="Telegram"
              />
            ) : (
              <div className="avatar">
                {telegramUser?.first_name?.[0] || "GK"}
              </div>
            )}

            <h3>
              {telegramUser
                ? `${telegramUser.first_name || ""} ${
                    telegramUser.last_name || ""
                  }`
                : "Покупатель"}
            </h3>

            {telegramUser?.username && <p>@{telegramUser.username}</p>}

            {!telegramUser && (
              <p>
                Откройте магазин через Telegram, чтобы здесь появились данные
                вашего профиля.
              </p>
            )}
          </div>
        </main>
      )}

      <nav className="bottom-nav">
        <button
          className={page === "home" ? "active" : ""}
          onClick={() => setPage("home")}
        >
          <span>⌂</span>
          Главная
        </button>

        <button
          className={page === "catalog" ? "active" : ""}
          onClick={() => setPage("catalog")}
        >
          <span>▦</span>
          Каталог
        </button>

        <button
          className={page === "cart" ? "active" : ""}
          onClick={() => setPage("cart")}
        >
          <span>○</span>
          Корзина
          {totalItems > 0 && <b className="badge">{totalItems}</b>}
        </button>

        <button
          className={page === "profile" ? "active" : ""}
          onClick={() => setPage("profile")}
        >
          <span>♙</span>
          Профиль
        </button>
      </nav>
    </div>
  );
}

export default App;
