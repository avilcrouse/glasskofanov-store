import crypto from "node:crypto";
import supabase from "./supabase.js";

console.log("SUPABASE CONNECTED");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const { name, phone, city, address, cart, username, chatId } = req.body;
  if (!name || !phone || !city || !address || !Array.isArray(cart) || !cart.length) {
    return res.status(400).json({ error: "Заполните данные и добавьте товары" });
  }

  const productIds = cart.map((item) => item.id);
  const { data: databaseProducts, error: productsError } = await supabase
    .from("products")
    .select("id, name, price")
    .in("id", productIds)
    .eq("active", true);

  if (
    productsError ||
    !databaseProducts ||
    databaseProducts.length !== new Set(productIds).size
  ) {
    return res.status(400).json({ error: "Один из товаров больше недоступен" });
  }

  const normalizedCart = cart.map((item) => {
    const product = databaseProducts.find(
      (databaseProduct) => String(databaseProduct.id) === String(item.id),
    );
    return {
      id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: Math.max(1, Math.min(20, Number(item.quantity) || 1)),
    };
  });
  const orderNumber = crypto.randomInt(100000, 1000000);
  const paymentToken = crypto.randomUUID();
  console.log("CUSTOMER CHAT ID:", chatId);
  const total = normalizedCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const message = `
🕶 Заказ Glass Kofanov — ожидает оплаты

📦 Заказ №${orderNumber}

👤 Клиент:
${name}

📱 Telegram:
@${username || "не указан"}

📞 Телефон:
${phone}

📍 Город:
${city}

🏠 Адрес:
${address}


🛒 Товары:

${normalizedCart
  .map((item) => `${item.name} × ${item.quantity} — ${item.price} ₽`)
  .join("\n")}


💰 Сумма:
${total} ₽
`;

  const token = process.env.BOT_TOKEN;
  const admin = process.env.ADMIN_ID;

  // отправляем сообщение в Telegram
  const telegramResponse = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: admin,
        text: message,
      }),
    },
  );

  const telegramData = await telegramResponse.json();
  // отправляем сообщение клиенту
  let customerMessageId = null;

  if (chatId) {
    const customerResponse = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          chat_id: chatId,

          text: `📦 Ваш заказ №${orderNumber}

Статус:
💳 Ожидает оплаты

🕶 Glass Kofanov`,
        }),
      },
    );

    const customerData = await customerResponse.json();

    console.log("CUSTOMER MESSAGE:", customerData);

    customerMessageId = customerData.result?.message_id
      ? Number(customerData.result.message_id)
      : null;
  }
  console.log("TELEGRAM MESSAGE:", telegramData);

  console.log("SAVE TELEGRAM IDS:", {
    chat_id: admin,
    telegram_message_id: telegramData.result?.message_id
      ? Number(telegramData.result.message_id)
      : null,
  });
  console.log("BEFORE INSERT:", {
    admin,
    message_id: telegramData.result.message_id,
  });
  // сохраняем заказ в Supabase
  const { error } = await supabase.from("orders").insert({
    order_number: orderNumber,
    name,
    phone,
    city,
    address,
    username,
    cart: normalizedCart,
    total,
    status: "Ожидает оплаты",
    payment_status: "not_started",
    payment_token: paymentToken,
    telegram_chat_id: Number(admin),
    telegram_message_id: telegramData.result?.message_id
      ? Number(telegramData.result.message_id)
      : null,
    customer_chat_id: chatId ? Number(chatId) : null,

    customer_message_id: customerMessageId,
  });

  if (error) {
    console.log("SUPABASE ERROR:", error);

    return res.status(500).json({
      error: error.message,
    });
  }

  console.log("TELEGRAM DATA:", telegramData);
  console.log("ORDER SAVED:", orderNumber);
  res.json({
    success: true,
    orderNumber,
    paymentToken,
  });
}
