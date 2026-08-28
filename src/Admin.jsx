import { useEffect, useState } from "react";
import supabase from "./supabaseClient";

const categories = [
  "Очки корригирующие",
  "Очки солнцезащитные",
  "Очки для водителя",
  "Очки спортивные",
];

const emptyProduct = {
  name: "",
  price: "",
  category: categories[0],
  description: "",
  image: "",
  is_top: false,
};

export default function Admin() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [section, setSection] = useState("orders");
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingProductId, setEditingProductId] = useState(null);
  const [login, setLogin] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  async function loadOrders() {
    const response = await fetch("/api/orders");

    if (response.status === 401) {
      setLogin(false);
      return false;
    }

    if (!response.ok) {
      setError("Не удалось загрузить заказы");
      return false;
    }

    setOrders(await response.json());
    return true;
  }

  async function loadProducts() {
    const response = await fetch("/api/products");
    if (!response.ok) {
      setError("Не удалось загрузить товары. Проверьте таблицу products в Supabase");
      return;
    }
    setProducts(await response.json());
  }

  useEffect(() => {
    loadOrders().then((authorized) => {
      setLogin(authorized);
      setCheckingSession(false);
      if (authorized) loadProducts();
    });
  }, []);

  useEffect(() => {
    if (!login) return;

    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("REALTIME EVENT:", payload);
          loadOrders();
        },
      )
      .subscribe((status) => {
        console.log("REALTIME STATUS:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [login]);

  if (checkingSession) {
    return <div className="admin-login">Проверяем доступ…</div>;
  }

  if (!login) {
    return (
      <div className="admin-login">
        <h2>Вход в админку</h2>

        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={async () => {
            const res = await fetch("/api/admin-login", {
              method: "POST",

              headers: {
                "Content-Type": "application/json",
              },

              body: JSON.stringify({
                password,
              }),
            });

            const data = await res.json();

            if (data.success) {
              setLogin(true);
              setError("");
              await loadOrders();
              await loadProducts();
            } else {
              setError(data.error || "Неверный пароль");
            }
          }}
        >
          Войти
        </button>

        <p>{error}</p>
      </div>
    );
  }

  async function changeStatus(orderNumber, status) {
    const response = await fetch("/api/update-order", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        orderNumber,
        status,
      }),
    });

    const result = await response.json();

    console.log("STATUS UPDATE:", result);

    if (response.ok) {
      setOrders(
        orders.map((order) =>
          order.order_number === orderNumber
            ? {
                ...order,
                status: status,
              }
            : order,
        ),
      );
    } else {
      setError(result.error || "Не удалось изменить статус");
    }
  }

  async function saveProduct(event) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/products", {
      method: editingProductId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...productForm, id: editingProductId }),
    });
    const result = await response.json();

    if (!response.ok) {
      setError(result.error || "Не удалось сохранить товар");
      return;
    }

    setProductForm(emptyProduct);
    setEditingProductId(null);
    await loadProducts();
  }

  function editProduct(product) {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      price: String(product.price),
      category: product.category,
      description: product.description || "",
      image: product.image,
      is_top: product.is_top,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Удалить товар «${product.name}»?`)) return;

    const response = await fetch("/api/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: product.id }),
    });

    if (!response.ok) {
      const result = await response.json();
      setError(result.error || "Не удалось удалить товар");
      return;
    }

    await loadProducts();
  }

  return (
    <div className="admin">
      <div className="page-heading">
        <h2>
          Админка
          <button
            onClick={async () => {
              await fetch("/api/admin-logout", { method: "POST" });
              setLogin(false);
            }}
          >
            Выйти
          </button>
        </h2>
        <p>Управление магазином</p>
        {error && <p>{error}</p>}
      </div>

      <div className="admin-tabs">
        <button
          className={section === "orders" ? "active" : ""}
          onClick={() => setSection("orders")}
        >
          Заказы
        </button>
        <button
          className={section === "products" ? "active" : ""}
          onClick={() => setSection("products")}
        >
          Товары
        </button>
      </div>

      {section === "products" && (
        <>
          <form className="product-admin-form" onSubmit={saveProduct}>
            <h3>{editingProductId ? "Редактировать товар" : "Новый товар"}</h3>
            <input
              placeholder="Название"
              value={productForm.name}
              onChange={(event) =>
                setProductForm({ ...productForm, name: event.target.value })
              }
            />
            <input
              type="number"
              min="1"
              placeholder="Цена в рублях"
              value={productForm.price}
              onChange={(event) =>
                setProductForm({ ...productForm, price: event.target.value })
              }
            />
            <select
              value={productForm.category}
              onChange={(event) =>
                setProductForm({ ...productForm, category: event.target.value })
              }
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
            <textarea
              placeholder="Описание"
              value={productForm.description}
              onChange={(event) =>
                setProductForm({ ...productForm, description: event.target.value })
              }
            />
            <input
              type="url"
              placeholder="Ссылка на фотографию"
              value={productForm.image}
              onChange={(event) =>
                setProductForm({ ...productForm, image: event.target.value })
              }
            />
            <label className="top-product-checkbox">
              <input
                type="checkbox"
                checked={productForm.is_top}
                onChange={(event) =>
                  setProductForm({ ...productForm, is_top: event.target.checked })
                }
              />
              Показывать в топовых моделях
            </label>
            <div className="admin-buttons">
              <button type="submit">
                {editingProductId ? "Сохранить" : "Добавить товар"}
              </button>
              {editingProductId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingProductId(null);
                    setProductForm(emptyProduct);
                  }}
                >
                  Отмена
                </button>
              )}
            </div>
          </form>

          <div className="admin-products-list">
            {products.map((product) => (
              <article className="admin-product-card" key={product.id}>
                <img src={product.image} alt={product.name} />
                <div>
                  <span>{product.category}</span>
                  <h3>{product.name}</h3>
                  <strong>{Number(product.price).toLocaleString("ru-RU")} ₽</strong>
                  {product.is_top && <p>⭐ Топовая модель</p>}
                  <div className="admin-buttons">
                    <button onClick={() => editProduct(product)}>Изменить</button>
                    <button onClick={() => deleteProduct(product)}>Удалить</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {section === "orders" && <div className="orders-list">
        {orders.map((order) => (
          <div className="order-card" key={order.id}>
            <div className="order-top">
              <h3>Заказ №{order.order_number}</h3>

              <span
                className={
                  order.status === "Выполнен"
                    ? "status done"
                    : order.status === "Отменён"
                      ? "status cancel"
                      : order.status === "Принят"
                        ? "status accept"
                        : "status"
                }
              >
                {order.status}
              </span>
            </div>

            <div className="order-info">
              <p>👤 {order.name}</p>

              <p>📞 {order.phone}</p>

              <p>📍 {order.city}</p>

              <p>🏠 {order.address}</p>
            </div>

            <div className="products">
              <h4>🛒 Товары:</h4>

              {order.cart?.map((item, index) => (
                <p key={index}>
                  {item.name} × {item.quantity} — {item.price} ₽
                </p>
              ))}
            </div>

            <div className="order-total">💰 {order.total} ₽</div>
            <div className="admin-buttons">
              {order.status === "Новый" && (
                <>
                  <button
                    onClick={() => changeStatus(order.order_number, "Принят")}
                  >
                    🟡 Принять
                  </button>

                  <button
                    onClick={() => changeStatus(order.order_number, "Отменён")}
                  >
                    ❌ Отмена
                  </button>
                </>
              )}

              {order.status === "Принят" && (
                <>
                  <button
                    onClick={() =>
                      changeStatus(order.order_number, "В доставке")
                    }
                  >
                    🚚 Доставка
                  </button>

                  <button
                    onClick={() => changeStatus(order.order_number, "Отменён")}
                  >
                    ❌ Отмена
                  </button>
                </>
              )}

              {order.status === "В доставке" && (
                <>
                  <button
                    onClick={() => changeStatus(order.order_number, "Выполнен")}
                  >
                    ✅ Выполнен
                  </button>

                  <button
                    onClick={() => changeStatus(order.order_number, "Отменён")}
                  >
                    ❌ Отмена
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}
