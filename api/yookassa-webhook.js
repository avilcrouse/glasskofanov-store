import supabase from "./supabase.js";
import { yookassaRequest } from "./yookassa.js";

async function telegram(method, body) {
  return fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const paymentId = req.body?.object?.id;
  if (!paymentId) return res.status(400).end();

  try {
    // Не доверяем телу уведомления: повторно получаем платёж из API ЮKassa.
    const payment = await yookassaRequest(`/payments/${paymentId}`);
    const orderNumber = payment.metadata?.order_number;
    if (!orderNumber) return res.status(200).end();

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("order_number", orderNumber)
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (!order || order.payment_id !== payment.id) return res.status(200).end();
    if (Number(payment.amount.value) !== Number(order.total)) {
      console.error("PAYMENT AMOUNT MISMATCH:", payment.id, order.id);
      return res.status(200).end();
    }

    if (payment.status === "succeeded" && order.payment_status !== "succeeded") {
      await supabase
        .from("orders")
        .update({
          payment_status: "succeeded",
          paid_at: new Date().toISOString(),
          status: "Новый",
        })
        .eq("id", order.id);

      if (order.telegram_chat_id && order.telegram_message_id) {
        await telegram("editMessageReplyMarkup", {
          chat_id: order.telegram_chat_id,
          message_id: order.telegram_message_id,
          reply_markup: {
            inline_keyboard: [[{
              text: "🟡 Принять заказ",
              callback_data: `accept_${orderNumber}`,
            }]],
          },
        });
      }

      if (order.customer_chat_id && order.customer_message_id) {
        await telegram("editMessageText", {
          chat_id: order.customer_chat_id,
          message_id: order.customer_message_id,
          text: `✅ Заказ №${orderNumber} оплачен!\n\nСтатус:\n⏳ Новый\n\n🕶 Glass Kofanov`,
        });
      }
    } else if (payment.status === "canceled") {
      await supabase
        .from("orders")
        .update({ payment_status: "canceled" })
        .eq("id", order.id);
    }

    return res.status(200).end();
  } catch (error) {
    console.error("YOOKASSA WEBHOOK ERROR:", error);
    return res.status(500).end();
  }
}
