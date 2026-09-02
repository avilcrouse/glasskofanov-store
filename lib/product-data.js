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
