import crypto from "node:crypto";
import supabase from "./supabase.js";

export async function readSignedNotification(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks);
  const signature = req.headers["content-hmac"];
  const secret = process.env.CLOUDPAYMENTS_API_SECRET;

  if (!signature || !secret) return null;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  return Object.fromEntries(new URLSearchParams(rawBody.toString("utf8")));
}

export async function findPaymentOrder(notification) {
  const invoiceId = String(notification.InvoiceId || "");
  const separator = invoiceId.indexOf("-");
  if (separator <= 0) return null;
  const orderNumber = invoiceId.slice(0, separator);
  const paymentToken = invoiceId.slice(separator + 1);
  if (!orderNumber || !paymentToken) return null;

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .eq("payment_token", paymentToken)
    .order("id", { ascending: false })
    .limit(1)
    .single();

  if (!order || Number(notification.Amount) !== Number(order.total)) return null;
  return order;
}

export function cloudPaymentsResponse(res, code = 0) {
  return res.status(200).json({ code });
}

export async function telegram(method, body) {
  return fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
