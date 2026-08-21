import supabase from "./supabase.js";

export default async function handler(req, res) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    return res.status(500).json({
      error: error.message,
    });
  }

  res.json(data);
}
