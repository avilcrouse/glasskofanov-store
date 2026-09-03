export const productCategories = [
  "Очки корригирующие",
  "Очки солнцезащитные",
  "Очки для водителя",
  "Очки спортивные",
  "Очки имиджевые",
];

export function normalizeProductImages(product) {
  const submitted = Array.isArray(product.images) ? product.images : [];
  const images = submitted
    .filter((image) => typeof image === "string")
    .map((image) => image.trim())
    .filter(Boolean);

  if (images.length === 0 && typeof product.image === "string" && product.image.trim()) {
    images.push(product.image.trim());
  }

  return [...new Set(images)].slice(0, 8);
}

export function validateProduct(product) {
  if (!product.sku?.trim()) return "Укажите артикул товара";
  if (!product.name?.trim()) return "Укажите название товара";
  if (!Number.isFinite(Number(product.price)) || Number(product.price) <= 0) {
    return "Цена должна быть больше нуля";
  }
  if (!productCategories.includes(product.category)) return "Выберите категорию";
  if (normalizeProductImages(product).length === 0) {
    return "Добавьте хотя бы одну фотографию";
  }
  return null;
}

export function prepareProductImport(products, existingProducts = []) {
  const existingBySku = new Map(
    existingProducts
      .filter((item) => item.sku)
      .map((item) => [item.sku.toLocaleLowerCase("ru"), item.id]),
  );
  const skus = new Set();
  const normalized = [];
  const errors = [];

  products.forEach((product, index) => {
    const row = Number(product.rowNumber) || index + 2;
    const validationError = validateProduct(product);
    if (validationError) {
      errors.push({ row, sku: product.sku?.trim() || "—", message: validationError });
      return;
    }

    const skuKey = product.sku.trim().toLocaleLowerCase("ru");
    if (skus.has(skuKey)) {
      errors.push({ row, sku: product.sku.trim(), message: "Артикул повторяется в файле" });
      return;
    }
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
  });

  const created = normalized.filter(
    (product) => !existingBySku.has(product.sku.toLocaleLowerCase("ru")),
  ).length;

  return {
    existingBySku,
    normalized,
    errors,
    created,
    updated: normalized.length - created,
  };
}
