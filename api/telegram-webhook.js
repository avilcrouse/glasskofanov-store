import supabase from "./supabase.js";

export default async function handler(req, res) {
  const update = req.body;

  console.log("TELEGRAM UPDATE:", update);

  if (!update.callback_query) {
    return res.status(200).json({
      ok: true,
    });
  }

  const callback = update.callback_query;

  const data = callback.data;

  const adminChatId = callback.message.chat.id;
  const adminMessageId = callback.message.message_id;

  // убираем крутилку на кнопке
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

  let status = "";
  let buttons = [];
  let orderNumber = "";

  if (data.startsWith("accept_")) {
    orderNumber = data.replace("accept_", "");

    status = "Принят";

    buttons = [
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
  } else if (data.startsWith("delivery_")) {
    orderNumber = data.replace("delivery_", "");

    status = "В доставке";

    buttons = [
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
  } else if (data.startsWith("complete_")) {
    orderNumber = data.replace("complete_", "");

    status = "Выполнен";

    buttons = [
      [
        {
          text: "✅ Заказ выполнен",
          callback_data: "done",
        },
      ],
    ];
  } else if (data.startsWith("cancel_")) {
    orderNumber = data.replace("cancel_", "");

    status = "Отменён";

    buttons = [
      [
        {
          text: "❌ Заказ отменён",
          callback_data: "cancelled",
        },
      ],
    ];
  }

  if (!orderNumber) {
    return res.status(200).json({
      ok: true,
    });
  }

  await updateOrder(orderNumber, status);

  // меняем кнопки у админа

  await fetch(
    `https://api.telegram.org/bot${process.env.BOT_TOKEN}/editMessageReplyMarkup`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        chat_id: adminChatId,

        message_id: adminMessageId,

        reply_markup: {
          inline_keyboard: buttons,
        },
      }),
    },
  );

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
    .order("id", { ascending: false })
    .limit(1)
    .single();
  console.log("FOUND ORDER FOR UPDATE:", {
    id: order.id,
    order_number: order.order_number,
    customer_chat_id: order.customer_chat_id,
    customer_message_id: order.customer_message_id,
  });

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
    console.log("UPDATE ERROR:", error);

    return;
  }

  console.log("ORDER STATUS:", orderNumber, status);

  // отправляем клиенту

  if (order.customer_chat_id && order.customer_message_id) {
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
      const response = await fetch(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/editMessageText`,

        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            chat_id: order.customer_chat_id,

            message_id: order.customer_message_id,

            text,
          }),
        },
      );

      const result = await response.json();

      console.log("CLIENT MESSAGE UPDATE:", result);
    }
  } else {
    console.log("NO CUSTOMER MESSAGE DATA");
  }
}
