import supabase from "./supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  console.log("UPDATE BODY:", req.body);

  const { orderNumber, status } = req.body;

  if (!orderNumber || !status) {
    return res.status(400).json({
      error: "Missing orderNumber or status",
    });
  }

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

  res.json({
    success: true,
  });
}
