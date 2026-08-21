export default async function handler(req, res) {
  const update = req.body;

  if (!update.callback_query) {
    return res.json({
      ok: true,
    });
  }

  const query = update.callback_query;

  const data = query.data;

  if (data.startsWith("accept_")) {
    const orderNumber = data.replace("accept_", "");

    // убираем "часики" на кнопке
    await fetch(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerCallbackQuery`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callback_query_id: query.id,
          text: `Заказ №${orderNumber} принят`,
        }),
      },
    );

    // меняем текст сообщения
    await fetch(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/editMessageText`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,

          text: `🕶 Новый заказ Glass Kofanov

📦 Заказ №${orderNumber}

🟢 Статус:
Принят`,
        }),
      },
    );
  }

  res.json({
    ok: true,
  });
}
