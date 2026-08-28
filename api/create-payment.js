import crypto from "node:crypto";
import supabase from "./supabase.js";
import { yookassaRequest } from "./yookassa.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { orderNumber, paymentToken } = req.body || {};
  if (!orderNumber || !paymentToken) {
    return res.status(400).json({ error: "Не хватает данных заказа" });
  }
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .eq("payment_token", paymentToken)
    .order("id", { ascending: false })
    .limit(1)
    .single();

  if (error || !order) return res.status(404).json({ error: "Заказ не найден" });
  if (order.payment_status === "succeeded") {
    return res.status(409).json({ error: "Заказ уже оплачен" });
  }

  try {
    const storeUrl = process.env.STORE_URL || "https://glasskofanov-store.vercel.app";
    const payment = await yookassaRequest("/payments", {
      method: "POST",
      headers: { "Idempotence-Key": crypto.randomUUID() },
      body: JSON.stringify({
        amount: { value: Number(order.total).toFixed(2), currency: "RUB" },
        capture: true,
        confirmation: {
          type: "redirect",
          return_url: `${storeUrl}/?payment=return`,
        },
        description: `Заказ Glass Kofanov №${orderNumber}`,
        metadata: { order_number: String(orderNumber) },
      }),
    });

    await supabase
      .from("orders")
      .update({ payment_id: payment.id, payment_status: payment.status })
      .eq("id", order.id);

    return res.json({ confirmationUrl: payment.confirmation.confirmation_url });
  } catch (paymentError) {
    return res.status(502).json({ error: paymentError.message });
  }
}
