import supabase from "./supabase.js";

export default async function handler(req, res) {
  const update = req.body;

  console.log("TELEGRAM UPDATE:", update);

  if (update.callback_query) {
    const callback = update.callback_query;

    const data = callback.data;

    const chatId = callback.message.chat.id;
    const messageId = callback.message.message_id;
    await fetch(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerCallbackQuery`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callback_query_id: callback.id,
        }),
      },
    );
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

      try {
        await updateOrder(orderNumber, newStatus);
      } catch (err) {
        console.log("UPDATE ERROR:", err);
      }
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

      try {
        await updateOrder(orderNumber, newStatus);
      } catch (err) {
        console.log("UPDATE ERROR:", err);
      }
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

      try {
        await updateOrder(orderNumber, newStatus);
      } catch (err) {
        console.log("UPDATE ERROR:", err);
      }
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

      try {
        await updateOrder(orderNumber, newStatus);
      } catch (err) {
        console.log("UPDATE ERROR:", err);
      }
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
  }

  res.status(200).json({
    ok: true,
  });
}

async function updateOrder(orderNumber, status) {
  // получаем заказ
  const { data: order, error: findError } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .single();

  if (findError) {
    console.log("FIND ORDER ERROR:", findError);
    return;
  }

  // меняем статус
  const { error } = await supabase
    .from("orders")
    .update({
      status,
    })
    .eq("order_number", orderNumber);

  if (error) {
    console.log("SUPABASE ERROR:", error);
    return;
  }

  console.log("ORDER STATUS:", orderNumber, status);

  // отправляем клиенту сообщение
  if (order.customer_chat_id && process.env.BOT_TOKEN) {
    let text = "";

    if (status === "Принят") {
      text = `✅ Ваш заказ №${orderNumber} принят!

🕶 Glass Kofanov

Мы начали обработку вашего заказа.`;
    }

    if (status === "В доставке") {
      text = `🚚 Ваш заказ №${orderNumber} уже в доставке!

🕶 Glass Kofanov

Курьер скоро свяжется с вами.`;
    }

    if (status === "Выполнен") {
      text = `🎉 Ваш заказ №${orderNumber} выполнен!

Спасибо за покупку 🕶`;
    }

    if (status === "Отменён") {
      text = `❌ Ваш заказ №${orderNumber} отменён.

Если это ошибка — свяжитесь с нами.`;
    }

    if (text) {
      await fetch(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            chat_id: order.customer_chat_id,

            text,
          }),
        },
      );

      console.log("CLIENT NOTIFICATION SENT:", order.customer_chat_id);
    }
  } else {
    console.log("NO CUSTOMER CHAT ID");
  }
}
