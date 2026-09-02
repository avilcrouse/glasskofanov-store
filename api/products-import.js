import supabase from "../lib/supabase.js";
import { normalizeProductImages, validateProduct } from "../lib/product-data.js";
import { isAdminRequest } from "./admin-auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Требуется вход в админку" });

  const products = req.body?.products;
  if (!Array.isArray(products) || products.length === 0 || products.length > 500) {
    return res.status(400).json({ error: "В файле должно быть от 1 до 500 товаров" });
  }

  const skus = new Set();
  const normalized = [];
  for (let index = 0; index < products.length; index += 1) {
    const product = products[index];
    const validationError = validateProduct(product);
    if (validationError) return res.status(400).json({ error: "Строка " + (index + 2) + ": " + validationError });
    const skuKey = product.sku.trim().toLocaleLowerCase("ru");
    if (skus.has(skuKey)) return res.status(400).json({ error: "Артикул " + product.sku + " повторяется в файле" });
    skus.add(skuKey);
    const images = normalizeProductImages(product);
    normalized.push({
      sku: product.sku.trim(),
      name: product.name.trim(),
      price: Number(product.price),
      category: product.category,
      description: product.description?.trim() || "",
      image: images[0],
      images,
      is_top: Boolean(product.is_top),
      active: product.active === undefined ? true : Boolean(product.active),
    });
  }

  const { data: existing, error: existingError } = await supabase.from("products").select("id,sku");
  if (existingError) return res.status(500).json({ error: existingError.message });
  const existingBySku = new Map(existing.map((item) => [item.sku.toLocaleLowerCase("ru"), item.id]));
  let created = 0;
  let updated = 0;

  for (const product of normalized) {
    const id = existingBySku.get(product.sku.toLocaleLowerCase("ru"));
    const query = id
      ? supabase.from("products").update(product).eq("id", id)
      : supabase.from("products").insert(product);
    const { error } = await query;
    if (error) return res.status(error.code === "23505" ? 409 : 500).json({ error: error.message });
    if (id) updated += 1;
    else created += 1;
  }

  return res.json({ success: true, created, updated });
}
