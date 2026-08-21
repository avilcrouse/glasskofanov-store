import { useEffect, useState } from "react";

export default function Admin() {
  const [orders, setOrders] = useState([]);
  const [login, setLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
            } else {
              setError("Неверный пароль");
            }
          }}
        >
          Войти
        </button>

        <p>{error}</p>
      </div>
    );
  }

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => setOrders(data));
  }, []);

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
    }
  }
  return (
    <div className="admin">
      <div className="page-heading">
        <h2>Заказы</h2>
        <p>Управление заказами магазина</p>
      </div>

      <div className="orders-list">
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
      </div>
    </div>
  );
}
