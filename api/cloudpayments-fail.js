import supabase from "./supabase.js";
import {
  cloudPaymentsResponse,
  findPaymentOrder,
  readSignedNotification,
} from "./cloudpayments.js";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const notification = await readSignedNotification(req);
  if (!notification) return res.status(401).end();

  const order = await findPaymentOrder(notification);
  if (order && order.payment_status !== "succeeded") {
    await supabase
      .from("orders")
      .update({ payment_status: "failed" })
      .eq("id", order.id);
  }
  return cloudPaymentsResponse(res);
}
