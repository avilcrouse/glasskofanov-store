import supabase from "../lib/supabase.js";
import { isAdminRequest } from "./admin-auth.js";

const categories = [
  "Очки корригирующие",
  "Очки солнцезащитные",
  "Очки для водителя",
  "Очки спортивные",
];

const publicProductFields = [
  "id",
  "name",
  "price",
  "category",
  "description",
  "image",
  "is_top",
  "active",
  "created_at",
].join(",");

function validateProduct(product) {
  if (!product.sku?.trim()) return "Укажите артикул товара";
  if (!product.name?.trim()) return "Укажите название товара";
  if (!Number.isFinite(Number(product.price)) || Number(product.price) <= 0) {
    return "Цена должна быть больше нуля";
  }
  if (!categories.includes(product.category)) return "Выберите категорию";
  if (!product.image?.trim()) return "Добавьте ссылку на фотографию";
  return null;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const isAdmin = isAdminRequest(req);
    const { data, error } = await supabase
      .from("products")
      .select(isAdmin ? "*" : publicProductFields)
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (!isAdminRequest(req)) {
    return res.status(401).json({ error: "Требуется вход в админку" });
  }

  if (req.method === "POST" || req.method === "PUT") {
    const validationError = validateProduct(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const product = {
      sku: req.body.sku.trim(),
      name: req.body.name.trim(),
      price: Number(req.body.price),
      category: req.body.category,
      description: req.body.description?.trim() || "",
      image: req.body.image.trim(),
      is_top: Boolean(req.body.is_top),
      active: true,
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
