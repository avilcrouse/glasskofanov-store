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
                  text: "🚚 Передать в доставку",
                  callback_data: `delivery_${orderNumber}`,
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
  if (data.startsWith("done_")) {
    const orderNumber = data.replace("done_", "");

    await fetch(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerCallbackQuery`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callback_query_id: query.id,
          text: `Заказ №${orderNumber} выполнен`,
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
            inline_keyboard: [],
          },
        }),
      },
    );
  }

  if (data.startsWith("cancel_")) {
    const orderNumber = data.replace("cancel_", "");

    await fetch(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerCallbackQuery`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callback_query_id: query.id,
          text: `Заказ №${orderNumber} отменён`,
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
            inline_keyboard: [],
          },
        }),
      },
    );
  }
  res.json({
    ok: true,
  });
}
