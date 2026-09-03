import test from "node:test";
import assert from "node:assert/strict";
import { prepareBulkImagePlan } from "../lib/bulk-product-images.js";

const products = [
  { id: 1, sku: "GK-001", name: "One", image: "old.jpg", images: ["old.jpg"] },
  { id: 2, sku: "GK", name: "Short", image: "short.jpg", images: ["short.jpg"] },
];

test("groups files by the longest matching SKU and sorts numbered photos", () => {
  const plan = prepareBulkImagePlan(
    [{ name: "GK-001_2.jpg" }, { name: "GK-001_1.webp" }, { name: "GK_1.png" }],
    products,
  );
  assert.equal(plan.errors.length, 0);
  assert.equal(plan.productCount, 2);
  assert.deepEqual(plan.items[0].files.map((file) => file.name), ["GK-001_1.webp", "GK-001_2.jpg"]);
});

test("reports unknown SKUs, unsupported files and image limit violations", () => {
  const crowded = [{ ...products[0], images: Array.from({ length: 8 }, (_, index) => `${index}.jpg`) }];
  const plan = prepareBulkImagePlan(
    [{ name: "UNKNOWN_1.jpg" }, { name: "notes.txt" }, { name: "GK-001_1.jpg" }],
    crowded,
  );
  assert.equal(plan.errors.length, 3);
  assert.match(plan.errors.join(" "), /артикул не найден/);
  assert.match(plan.errors.join(" "), /допустимы JPG/);
  assert.match(plan.errors.join(" "), /максимум 8/);
});
