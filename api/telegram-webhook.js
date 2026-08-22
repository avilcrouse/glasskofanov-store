import supabase from "./supabase.js";

export default async function handler(req, res) {
  const update = req.body;

  console.log("TELEGRAM UPDATE:", update);

  if (update.callback_query) {
    const data = update.callback_query.data;

    if (data.startsWith("accept_")) {
      const orderNumber = data.replace("accept_", "");

      const { error } = await supabase
        .from("orders")
        .update({
          status: "Принят",
        })
        .eq("order_number", orderNumber);

      if (error) {
        console.log("SUPABASE ERROR:", error);
      }

      console.log("ORDER ACCEPTED:", orderNumber);
    }
  }

  res.status(200).json({
    ok: true,
  });
}
