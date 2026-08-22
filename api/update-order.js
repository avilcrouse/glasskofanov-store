import supabase from "./supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const { id, status } = req.body;

  const { error } = await supabase
    .from("orders")
    .update({
      status,
    })
    .eq("id", id);

  if (error) {
    console.log("UPDATE ERROR:", error);

    return res.status(500).json({
      error: error.message,
    });
  }

  res.json({
    success: true,
  });
}
