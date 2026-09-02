import supabase from "../lib/supabase.js";
import { verifyTelegramInitData } from "../lib/telegram-init-data.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = verifyTelegramInitData(req.body?.initData);
  if (!user) return res.status(401).json({ error: "Откройте магазин через Telegram" });

  const { data, error } = await supabase
    .from("orders")
    .select("order_number,cart,total,status,payment_status,created_at,delivery_type,pickup_point_name,pickup_point_address")
    .eq("customer_chat_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
}
