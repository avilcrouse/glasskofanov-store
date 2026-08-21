import { useEffect, useState } from "react";

export default function Admin() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => setOrders(data));
  }, []);

  return (
    <div className="admin">
      <h1>Заказы</h1>

      {orders.map((order) => (
        <div className="order-card" key={order.id}>
          <h2>Заказ №{order.order_number}</h2>

          <p>👤 {order.name}</p>

          <p>📞 {order.phone}</p>

          <p>📍 {order.city}</p>

          <p>💰 {order.total} ₽</p>

          <p>
            Статус:
            {order.status}
          </p>
        </div>
      ))}
    </div>
  );
}
