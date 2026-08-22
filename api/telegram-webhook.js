import supabase from "./supabase.js";

export default async function handler(req, res) {
  const update = req.body;

  console.log("TELEGRAM UPDATE:", update);

  // Проверяем, что пришло нажатие кнопки
  if (update.callback_query) {
    const callback = update.callback_query;

    const data = callback.data;

    // Нажата кнопка "Принять заказ"
    if (data.startsWith("accept_")) {
      const orderNumber = data.replace("accept_", "");

      const chatId = callback.message.chat.id;
      const messageId = callback.message.message_id;

      // Меняем статус заказа в Supabase
      const { error } = await supabase
        .from("orders")
        .update({
          status: "Принят",
        })
        .eq("order_number", orderNumber);

      if (error) {
        console.log("SUPABASE ERROR:", error);

        return res.status(500).json({
          error: error.message,
        });
      }

      console.log("ORDER ACCEPTED:", orderNumber);

      // Меняем кнопку в Telegram сообщении
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
              inline_keyboard: [
                [
                  {
                    text: "✅ Заказ принят",

                    callback_data: "accepted",
                  },
                ],
              ],
            },
          }),
        },
      );

      // убираем "часики" на кнопке после нажатия
      await fetch(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerCallbackQuery`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            callback_query_id: callback.id,

            text: "Заказ принят ✅",
          }),
        },
      );
    }
  }

  res.status(200).json({
    ok: true,
  });
}
