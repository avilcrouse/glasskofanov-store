import crypto from "node:crypto";
import supabase from "../lib/supabase.js";
import { isAdminRequest } from "../lib/admin-auth.js";

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxSize = 3 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAdminRequest(req)) {
    return res.status(401).json({ error: "Требуется вход в админку" });
  }

  const { image, type } = req.body || {};
  if (!image || !allowedTypes.includes(type)) {
    return res.status(400).json({ error: "Выберите JPG, PNG или WebP" });
  }

  const base64 = image.replace(/^data:image\/(jpeg|png|webp);base64,/, "");
  const file = Buffer.from(base64, "base64");
  if (!file.length || file.length > maxSize) {
    return res.status(400).json({ error: "Не удалось уменьшить фотографию до 3 МБ" });
  }

  const extension = type === "image/jpeg" ? "jpg" : type.split("/")[1];
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(fileName, file, { contentType: type, upsert: false });

  if (error) return res.status(500).json({ error: error.message });

  const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
  return res.json({ url: data.publicUrl });
}
