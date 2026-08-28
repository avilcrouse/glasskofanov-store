import supabase from "./supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { orderNumber, paymentToken } = req.body || {};
  const publicId = process.env.CLOUDPAYMENTS_PUBLIC_ID;
  if (!publicId) return res.status(503).json({ error: "Оплата ещё не настроена" });

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, order_number, total, phone, payment_status")
    .eq("order_number", orderNumber)
    .eq("payment_token", paymentToken)
    .order("id", { ascending: false })
    .limit(1)
    .single();

  if (error || !order) return res.status(404).json({ error: "Заказ не найден" });
  if (order.payment_status === "succeeded") {
    return res.status(409).json({ error: "Заказ уже оплачен" });
  }

  await supabase
    .from("orders")
    .update({ payment_status: "pending" })
    .eq("id", order.id);

  return res.json({
    publicId,
    amount: Number(order.total),
    currency: "RUB",
    invoiceId: `${order.order_number}-${paymentToken}`,
    accountId: order.phone,
    description: `Заказ Glass Kofanov №${order.order_number}`,
  });
}
