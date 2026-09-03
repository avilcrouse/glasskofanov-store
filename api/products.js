import supabase from "../lib/supabase.js";
import { normalizeProductImages, validateProduct } from "../lib/product-data.js";
import { isAdminRequest } from "../lib/admin-auth.js";

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

  if (req.method === "POST" && Array.isArray(req.body?.products)) {
    const products = req.body.products;
    if (products.length === 0 || products.length > 500) {
      return res.status(400).json({ error: "В файле должно быть от 1 до 500 товаров" });
    }
    const skus = new Set();
    const normalized = [];
    const errors = [];
    for (let index = 0; index < products.length; index += 1) {
      const product = products[index];
      const row = Number(product.rowNumber) || index + 2;
      const validationError = validateProduct(product);
      if (validationError) {
        errors.push({ row, sku: product.sku?.trim() || "—", message: validationError });
        continue;
      }
      const skuKey = product.sku.trim().toLocaleLowerCase("ru");
      if (skus.has(skuKey)) {
        errors.push({ row, sku: product.sku.trim(), message: "Артикул повторяется в файле" });
        continue;
      }
      skus.add(skuKey);
      const images = normalizeProductImages(product);
      normalized.push({ sku: product.sku.trim(), name: product.name.trim(), price: Number(product.price), category: product.category, description: product.description?.trim() || "", image: images[0], images, is_top: Boolean(product.is_top), active: product.active === undefined ? true : Boolean(product.active) });
    }
    const { data: existing, error: existingError } = await supabase.from("products").select("id,sku");
    if (existingError) return res.status(500).json({ error: existingError.message });
    const existingBySku = new Map(existing.map((item) => [item.sku.toLocaleLowerCase("ru"), item.id]));
    const created = normalized.filter((product) => !existingBySku.has(product.sku.toLocaleLowerCase("ru"))).length;
    const updated = normalized.length - created;
    if (req.body.preview) {
      return res.json({ success: errors.length === 0, total: products.length, valid: normalized.length, created, updated, errors });
    }
    if (errors.length) {
      return res.status(400).json({ error: "Исправьте ошибки в Excel-файле", errors });
    }
    for (const product of normalized) {
      const id = existingBySku.get(product.sku.toLocaleLowerCase("ru"));
      const query = id ? supabase.from("products").update(product).eq("id", id) : supabase.from("products").insert(product);
      const { error } = await query;
      if (error) return res.status(error.code === "23505" ? 409 : 500).json({ error: error.message });
    }
    return res.json({ success: true, created, updated });
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
