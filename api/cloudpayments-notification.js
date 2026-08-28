import supabase from "../lib/supabase.js";
import {
  cloudPaymentsResponse,
  findPaymentOrder,
  readSignedNotification,
  telegram,
} from "../lib/cloudpayments.js";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const notification = await readSignedNotification(req);
  if (!notification) return res.status(401).end();

  const type = String(req.query.type || "").toLowerCase();
  if (!["check", "pay", "fail"].includes(type)) {
    return res.status(404).end();
  }

  const order = await findPaymentOrder(notification);
  if (type === "check") {
    return cloudPaymentsResponse(res, order ? 0 : 13);
  }
  if (!order) return cloudPaymentsResponse(res, 13);

  if (type === "fail") {
    if (order.payment_status !== "succeeded") {
      await supabase
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("id", order.id);
    }
    return cloudPaymentsResponse(res);
  }

  if (order.payment_status !== "succeeded") {
    await supabase
      .from("orders")
      .update({
        payment_id: String(notification.TransactionId),
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
            callback_data: `accept_${order.order_number}`,
          }]],
        },
      });
    }

    if (order.customer_chat_id && order.customer_message_id) {
      await telegram("editMessageText", {
        chat_id: order.customer_chat_id,
        message_id: order.customer_message_id,
        text: `✅ Заказ №${order.order_number} оплачен!\n\nСтатус:\n⏳ Новый\n\n🕶 Glass Kofanov`,
      });
    }
  }

  return cloudPaymentsResponse(res);
}
