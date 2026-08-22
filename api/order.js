import supabase from "./supabase.js";

console.log("SUPABASE CONNECTED");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const { name, phone, city, address, cart, username, orderNumber, chatId } =
    req.body;
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const message = `
🕶 Новый заказ Glass Kofanov

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

${cart
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
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🟡 Принять заказ",
                callback_data: `accept_${orderNumber}`,
              },
            ],
          ],
        },
      }),
    },
  );

  const telegramData = await telegramResponse.json();

  console.log("TELEGRAM MESSAGE:", telegramData);

  console.log("SAVE TELEGRAM IDS:", {
    chat_id: admin,
    telegram_message_id: Number(telegramData.result?.message_id),
  });
  console.log("BEFORE INSERT:", {
    admin,
    message_id: telegramData.result.message_id,
  });
  // сохраняем заказ в Supabase
  const { data, error } = await supabase.from("orders").insert({
    order_number: orderNumber,
    name,
    phone,
    city,
    address,
    username,
    cart,
    total,
    status: "Новый",

    telegram_chat_id: Number(admin),
    telegram_message_id: Number(telegramData.result?.message_id),

    customer_chat_id: chatId ? Number(chatId) : null,
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
  });
}
