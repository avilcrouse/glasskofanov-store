import supabase from "./supabase";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

export default supabase;

const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

await supabase.from("orders").insert({
  order_number: orderNumber,

  name,
  phone,
  city,
  address,

  username,

  cart,

  total,

  status: "Новый",
});
