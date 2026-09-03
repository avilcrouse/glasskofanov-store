const imageExtension = /(?:\.(?:jpe?g|png|webp))+$/i;

export function prepareBulkImagePlan(files, products, maxImages = 8) {
  const productBySku = new Map(
    products
      .filter((product) => product.sku?.trim())
      .map((product) => [product.sku.trim().toLocaleLowerCase("ru"), product]),
  );
  const skuKeys = [...productBySku.keys()].sort((left, right) => right.length - left.length);
  const groups = new Map();
  const errors = [];

  for (const file of files) {
    const fileName = file.name || "";
    const stem = fileName.replace(imageExtension, "");
    if (stem === fileName) {
      errors.push(`${fileName || "Файл без имени"}: допустимы JPG, PNG и WebP`);
      continue;
    }

    const normalizedStem = stem.toLocaleLowerCase("ru");
    const skuKey = skuKeys.find((candidate) => {
      if (normalizedStem === candidate) return true;
      const suffix = normalizedStem.slice(candidate.length);
      return normalizedStem.startsWith(candidate) && /^_\d+$/.test(suffix);
    });

    if (!skuKey) {
      errors.push(`${fileName}: артикул не найден. Используйте имя АРТИКУЛ_1.jpg`);
      continue;
    }

    const suffix = normalizedStem.slice(skuKey.length);
    const position = suffix ? Number(suffix.slice(1)) : 0;
    const product = productBySku.get(skuKey);
    if (!groups.has(skuKey)) groups.set(skuKey, { product, files: [] });
    groups.get(skuKey).files.push({ file, position });
  }

  const items = [...groups.values()].map(({ product, files: matchedFiles }) => {
    matchedFiles.sort((left, right) =>
      left.position - right.position || left.file.name.localeCompare(right.file.name, "ru"),
    );
    const existingImages = (product.images?.length ? product.images : [product.image]).filter(Boolean);
    if (existingImages.length + matchedFiles.length > maxImages) {
      errors.push(
        `${product.sku}: уже ${existingImages.length} фото, выбрано ещё ${matchedFiles.length}; максимум ${maxImages}`,
      );
    }
    return { product, files: matchedFiles.map((entry) => entry.file), existingImages };
  });

  return {
    items,
    errors,
    productCount: items.length,
    fileCount: items.reduce((total, item) => total + item.files.length, 0),
  };
}
