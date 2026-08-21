export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const { name, phone, city, address, cart, username, orderNumber } = req.body;
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

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
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
              text: "📞 Позвонить",
              url: `tel:${phone}`,
            },
          ],
          [
            {
              text: "💬 Telegram",
              url: username ? `https://t.me/${username}` : "https://t.me",
            },
          ],
          [
            {
              text: "🟡 Принять заказ",
              callback_data: `accept_${orderNumber}`,
            },
          ],
        ],
      },
    }),
  });

  res.json({
    success: true,
  });
}
