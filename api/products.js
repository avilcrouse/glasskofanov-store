import supabase from "../lib/supabase.js";
import { normalizeProductImages, validateProduct } from "../lib/product-data.js";
import { isAdminRequest } from "./admin-auth.js";

const publicProductFields = [
  "id",
  "name",
  "price",
  "category",
  "description",
  "image",
  "images",
  "is_top",
  "active",
  "created_at",
].join(",");

export default async function handler(req, res) {
  if (req.method === "GET") {
    const isAdmin = isAdminRequest(req);
    let query = supabase
      .from("products")
      .select(isAdmin ? "*" : publicProductFields)
      .order("created_at", { ascending: true });
    if (!isAdmin) query = query.eq("active", true);
    const { data, error } = await query;

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (!isAdminRequest(req)) {
    return res.status(401).json({ error: "Требуется вход в админку" });
  }

  if (req.method === "POST" || req.method === "PUT") {
    const validationError = validateProduct(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const images = normalizeProductImages(req.body);

    const product = {
      sku: req.body.sku.trim(),
      name: req.body.name.trim(),
      price: Number(req.body.price),
      category: req.body.category,
      description: req.body.description?.trim() || "",
      image: images[0],
      images,
      is_top: Boolean(req.body.is_top),
      active: req.body.active === undefined ? true : Boolean(req.body.active),
    };

    const query =
      req.method === "POST"
        ? supabase.from("products").insert(product)
        : supabase.from("products").update(product).eq("id", req.body.id);
    const { data, error } = await query.select().single();

    if (error?.code === "23505") {
      return res.status(409).json({ error: "Товар с таким артикулом уже существует" });
    }
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === "DELETE") {
    if (!req.body.id) return res.status(400).json({ error: "Не указан товар" });

    const { error } = await supabase
      .from("products")
      .update({ active: false })
      .eq("id", req.body.id);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
