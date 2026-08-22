const { data: order } = await supabase
  .from("orders")
  .select("*")
  .eq("order_number", orderNumber)
  .single();
if (order.customer_chat_id) {
  await fetch(
    `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: order.customer_chat_id,
        text: `Статус вашего заказа №${orderNumber} изменён: ${status}`,
      }),
    },
  );
}
