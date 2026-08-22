import supabase from "./supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const { orderNumber, status } = req.body;

  console.log("UPDATE BODY:", req.body);

  if (!orderNumber || !status) {
    return res.status(400).json({
      error: "Missing orderNumber or status",
    });
  }

  // получаем заказ
  const { data: order, error: findError } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .single();

  if (findError) {
    console.log("FIND ORDER ERROR:", findError);

    return res.status(500).json({
      error: findError.message,
    });
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

    return res.status(500).json({
      error: error.message,
    });
  }

  console.log("ORDER UPDATED:", orderNumber, status);

  // уведомление клиента
  if (order.customer_chat_id) {
    let text = "";

    if (status === "Принят") {
      text = `✅ Ваш заказ №${orderNumber} принят!

🕶 Glass Kofanov

Мы начали обработку вашего заказа.`;
    }

    if (status === "В доставке") {
      text = `🚚 Ваш заказ №${orderNumber} уже в доставке!

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
      const telegramResponse = await fetch(
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

      const telegramData = await telegramResponse.json();

      console.log("CLIENT MESSAGE:", telegramData);
    }
  } else {
    console.log("NO CUSTOMER CHAT ID");
  }

  res.json({
    success: true,
  });
}
