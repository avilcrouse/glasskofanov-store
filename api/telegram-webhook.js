import supabase from "./supabase.js";

export default async function handler(req, res) {
  const update = req.body;

  console.log("TELEGRAM UPDATE:", update);

  if (update.callback_query) {
    const callback = update.callback_query;

    const data = callback.data;

    const chatId = callback.message.chat.id;
    const messageId = callback.message.message_id;

    let newStatus = "";
    let newButtons = [];

    // Принять заказ
    if (data.startsWith("accept_")) {
      const orderNumber = data.replace("accept_", "");

      newStatus = "Принят";

      newButtons = [
        [
          {
            text: "🚚 В доставку",
            callback_data: `delivery_${orderNumber}`,
          },
        ],
        [
          {
            text: "❌ Отменить",
            callback_data: `cancel_${orderNumber}`,
          },
        ],
      ];

      await updateOrder(orderNumber, newStatus);
    }

    // Передать в доставку
    if (data.startsWith("delivery_")) {
      const orderNumber = data.replace("delivery_", "");

      newStatus = "В доставке";

      newButtons = [
        [
          {
            text: "✅ Выполнен",
            callback_data: `complete_${orderNumber}`,
          },
        ],
        [
          {
            text: "❌ Отменить",
            callback_data: `cancel_${orderNumber}`,
          },
        ],
      ];

      await updateOrder(orderNumber, newStatus);
    }

    // Выполнен
    if (data.startsWith("complete_")) {
      const orderNumber = data.replace("complete_", "");

      newStatus = "Выполнен";

      newButtons = [
        [
          {
            text: "✅ Заказ выполнен",
            callback_data: "done",
          },
        ],
      ];

      await updateOrder(orderNumber, newStatus);
    }

    // Отмена
    if (data.startsWith("cancel_")) {
      const orderNumber = data.replace("cancel_", "");

      newStatus = "Отменён";

      newButtons = [
        [
          {
            text: "❌ Заказ отменён",
            callback_data: "cancelled",
          },
        ],
      ];

      await updateOrder(orderNumber, newStatus);
    }

    // меняем кнопки в Telegram
    if (newButtons.length > 0) {
      await fetch(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/editMessageReplyMarkup`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            chat_id: chatId,

            message_id: messageId,

            reply_markup: {
              inline_keyboard: newButtons,
            },
          }),
        },
      );
    }

    // убираем загрузку кнопки
    await fetch(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerCallbackQuery`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          callback_query_id: callback.id,
          text: `Статус изменён: ${newStatus}`,
        }),
      },
    );
  }

  res.status(200).json({
    ok: true,
  });
}

async function updateOrder(orderNumber, status) {
  const { error } = await supabase
    .from("orders")
    .update({
      status,
    })
    .eq("order_number", orderNumber);

  if (error) {
    console.log("SUPABASE ERROR:", error);
  }

  console.log("ORDER STATUS:", orderNumber, status);
}
