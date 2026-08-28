import supabase from "./supabase.js";
import { isAdminRequest } from "./admin-auth.js";

const allowedStatuses = ["Принят", "В доставке", "Выполнен", "Отменён"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  if (!isAdminRequest(req)) {
    return res.status(401).json({ error: "Требуется вход в админку" });
  }

  const { orderNumber, status } = req.body;

  console.log("UPDATE BODY:", req.body);

  if (!orderNumber || !status) {
    return res.status(400).json({
      error: "Missing orderNumber or status",
    });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Недопустимый статус заказа" });
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
  if (order.customer_chat_id && order.customer_message_id) {
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

      const telegramData = await telegramResponse.json();

      console.log("CLIENT MESSAGE:", telegramData);

      if (!telegramResponse.ok) {
        console.log("CLIENT MESSAGE UPDATE ERROR:", telegramData);
      }
    }
  } else {
    console.log("NO CUSTOMER MESSAGE DATA");
  }

  res.json({
    success: true,
  });
}
