export default async function handler(req, res) {
  const update = req.body;

  if (!update.callback_query) {
    return res.json({
      ok: true,
    });
  }

  const query = update.callback_query;

  const data = query.data;

  if (data.startsWith("delivery_")) {
    const orderNumber = data.replace("delivery_", "");

    await fetch(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerCallbackQuery`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callback_query_id: query.id,
          text: `Заказ №${orderNumber} передан в доставку`,
        }),
      },
    );

    await fetch(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/editMessageReplyMarkup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,

          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Завершить заказ",
                  callback_data: `done_${orderNumber}`,
                },
              ],
              [
                {
                  text: "❌ Отменить заказ",
                  callback_data: `cancel_${orderNumber}`,
                },
              ],
            ],
          },
        }),
      },
    );
  }

  res.json({
    ok: true,
  });
}
