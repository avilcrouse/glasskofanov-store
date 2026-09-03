import { useEffect, useState } from "react";
import supabase from "./supabaseClient";

const categories = [
  "Очки корригирующие",
  "Очки солнцезащитные",
  "Очки для водителя",
  "Очки спортивные",
  "Очки имиджевые",
];

const emptyProduct = {
  sku: "",
  name: "",
  price: "",
  category: categories[0],
  description: "",
  image: "",
  images: [],
  is_top: false,
  active: true,
};

export default function Admin() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [section, setSection] = useState("orders");
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productSkuSearch, setProductSkuSearch] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [draggedImageIndex, setDraggedImageIndex] = useState(null);
  const [processingExcel, setProcessingExcel] = useState(false);
  const [excelPreview, setExcelPreview] = useState(null);
  const [login, setLogin] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  async function loadOrders() {
    const response = await fetch("/api/orders");

    if (response.status === 401) {
      setLogin(false);
      return false;
    }

    if (!response.ok) {
      setError("Не удалось загрузить заказы");
      return false;
    }

    setOrders(await response.json());
    return true;
  }

  async function loadProducts() {
    const response = await fetch("/api/products");
    if (!response.ok) {
      setError("Не удалось загрузить товары. Проверьте таблицу products в Supabase");
      return;
    }
    setProducts(await response.json());
  }

  useEffect(() => {
    loadOrders().then((authorized) => {
      setLogin(authorized);
      setCheckingSession(false);
      if (authorized) loadProducts();
    });
  }, []);

  useEffect(() => {
    if (!login) return;

    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("REALTIME EVENT:", payload);
          loadOrders();
        },
      )
      .subscribe((status) => {
        console.log("REALTIME STATUS:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [login]);

  if (checkingSession) {
    return <div className="admin-login">Проверяем доступ…</div>;
  }

  if (!login) {
    return (
      <div className="admin-login">
        <h2>Вход в админку</h2>

        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={async () => {
            const res = await fetch("/api/admin-login", {
              method: "POST",

              headers: {
                "Content-Type": "application/json",
              },

              body: JSON.stringify({
                password,
              }),
            });

            const data = await res.json();

            if (data.success) {
              setLogin(true);
              setError("");
              await loadOrders();
              await loadProducts();
            } else {
              setError(data.error || "Неверный пароль");
            }
          }}
        >
          Войти
        </button>

        <p>{error}</p>
      </div>
    );
  }

  async function changeStatus(orderNumber, status) {
    const response = await fetch("/api/update-order", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        orderNumber,
        status,
      }),
    });

    const result = await response.json();

    console.log("STATUS UPDATE:", result);

    if (response.ok) {
      setOrders(
        orders.map((order) =>
          order.order_number === orderNumber
            ? {
                ...order,
                status: status,
              }
            : order,
        ),
      );
    } else {
      setError(result.error || "Не удалось изменить статус");
    }
  }

  async function saveProduct(event) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/products", {
      method: editingProductId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...productForm, id: editingProductId }),
    });
    const result = await response.json();

    if (!response.ok) {
      setError(result.error || "Не удалось сохранить товар");
      return;
    }

    setProductForm(emptyProduct);
    setEditingProductId(null);
    await loadProducts();
  }

  function editProduct(product) {
    setEditingProductId(product.id);
    setProductForm({
      sku: product.sku || "",
      name: product.name,
      price: String(product.price),
      category: product.category,
      description: product.description || "",
      image: product.image,
      images: product.images?.length ? product.images : [product.image],
      is_top: product.is_top,
      active: product.active !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Удалить товар «${product.name}»?`)) return;

    const response = await fetch("/api/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: product.id }),
    });

    if (!response.ok) {
      const result = await response.json();
      setError(result.error || "Не удалось удалить товар");
      return;
    }

    await loadProducts();
  }

  async function prepareAndUploadProductImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const sourceImage = new Image();
        sourceImage.onload = async () => {
          try {
            const maxSide = 1600;
            const scale = Math.min(1, maxSide / Math.max(sourceImage.width, sourceImage.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(sourceImage.width * scale);
            canvas.height = Math.round(sourceImage.height * scale);
            canvas.getContext("2d").drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
            const preparedImage = canvas.toDataURL("image/jpeg", 0.85);
            const response = await fetch("/api/product-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image: preparedImage, type: "image/jpeg" }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Не удалось загрузить фотографию");
            resolve(result.url);
          } catch (uploadError) {
            reject(uploadError);
          }
        };
        sourceImage.onerror = () => reject(new Error("Не удалось обработать фотографию"));
        sourceImage.src = reader.result;
      };
      reader.onerror = () => reject(new Error("Не удалось прочитать фотографию"));
      reader.readAsDataURL(file);
    });
  }

  async function uploadProductImages(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    if (files.some((file) => !file.type.startsWith("image/"))) {
      setError("Выберите фотографии в формате JPEG, PNG или WebP");
      return;
    }

    if (productForm.images.length + files.length > 8) {
      setError("Для одного товара можно добавить не более 8 фотографий");
      return;
    }

    setUploadingImage(true);
    setError("");
    try {
      const uploadedImages = await Promise.all(files.map(prepareAndUploadProductImage));
      setProductForm((current) => {
        const images = [...current.images, ...uploadedImages];
        return { ...current, images, image: images[0] || "" };
      });
    } catch (uploadError) {
      setError(uploadError.message || "Не удалось загрузить фотографии");
    } finally {
      setUploadingImage(false);
    }
  }

  function removeProductImage(imageToRemove) {
    setProductForm((current) => {
      const images = current.images.filter((image) => image !== imageToRemove);
      return { ...current, images, image: images[0] || "" };
    });
  }

  function reorderProductImages(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    setProductForm((current) => {
      const images = [...current.images];
      const [movedImage] = images.splice(fromIndex, 1);
      images.splice(toIndex, 0, movedImage);
      return { ...current, images, image: images[0] || "" };
    });
  }

  async function exportProductsToExcel() {
    setProcessingExcel(true);
    setError("");
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Товары", { views: [{ state: "frozen", ySplit: 1 }] });
      sheet.columns = [
        { header: "Артикул", key: "sku", width: 18 },
        { header: "Название", key: "name", width: 32 },
        { header: "Цена", key: "price", width: 12 },
        { header: "Категория", key: "category", width: 26 },
        { header: "Описание", key: "description", width: 45 },
        { header: "Фотографии", key: "images", width: 65 },
        { header: "Топовый", key: "is_top", width: 12 },
        { header: "Активен", key: "active", width: 12 },
      ];
      products.forEach((product) => sheet.addRow({
        sku: product.sku,
        name: product.name,
        price: Number(product.price),
        category: product.category,
        description: product.description || "",
        images: (product.images?.length ? product.images : [product.image]).filter(Boolean).join(" | "),
        is_top: product.is_top ? "Да" : "Нет",
        active: product.active === false ? "Нет" : "Да",
      }));
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF151515" } };
      sheet.autoFilter = { from: "A1", to: "H" + Math.max(2, products.length + 1) };
      const buffer = await workbook.xlsx.writeBuffer();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      link.download = "glass-kofanov-products-" + new Date().toISOString().slice(0, 10) + ".xlsx";
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (excelError) {
      setError(excelError.message || "Не удалось создать Excel-файл");
    } finally {
      setProcessingExcel(false);
    }
  }

  async function downloadExcelTemplate() {
    setProcessingExcel(true);
    setError("");
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Товары", { views: [{ state: "frozen", ySplit: 1 }] });
      sheet.columns = [
        { header: "Артикул", key: "sku", width: 18 },
        { header: "Название", key: "name", width: 32 },
        { header: "Цена", key: "price", width: 12 },
        { header: "Категория", key: "category", width: 26 },
        { header: "Описание", key: "description", width: 45 },
        { header: "Фотографии", key: "images", width: 65 },
        { header: "Топовый", key: "is_top", width: 12 },
        { header: "Активен", key: "active", width: 12 },
      ];
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF151515" } };
      sheet.autoFilter = { from: "A1", to: "H501" };
      for (let row = 2; row <= 501; row += 1) {
        sheet.getCell("D" + row).dataValidation = { type: "list", allowBlank: false, formulae: ['"' + categories.join(",") + '"'] };
        sheet.getCell("G" + row).dataValidation = { type: "list", allowBlank: true, formulae: ['"Да,Нет"'] };
        sheet.getCell("H" + row).dataValidation = { type: "list", allowBlank: true, formulae: ['"Да,Нет"'] };
      }
      const instructions = workbook.addWorksheet("Инструкция");
      instructions.columns = [{ width: 25 }, { width: 90 }];
      [
        ["Поле", "Как заполнять"],
        ["Артикул", "Обязательный уникальный внутренний код. Совпадающий артикул обновляет существующий товар."],
        ["Название", "Обязательное название товара."],
        ["Цена", "Число больше нуля, без символа рубля."],
        ["Категория", "Выберите значение из выпадающего списка."],
        ["Фотографии", "Одна или несколько прямых ссылок, разделённых символом |. Максимум 8."],
        ["Топовый / Активен", "Да или Нет. Пустое поле Активен считается значением Да."],
      ].forEach((values) => instructions.addRow(values));
      instructions.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      instructions.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF151515" } };
      instructions.getColumn(2).alignment = { wrapText: true, vertical: "top" };
      const buffer = await workbook.xlsx.writeBuffer();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      link.download = "glass-kofanov-template.xlsx";
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (excelError) {
      setError(excelError.message || "Не удалось создать шаблон");
    } finally {
      setProcessingExcel(false);
    }
  }

  async function applyExcelImport() {
    if (!excelPreview?.products?.length || excelPreview.errors.length) return;
    setProcessingExcel(true);
    setError("");
    try {
      const response = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ products: excelPreview.products }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await loadProducts();
      setExcelPreview(null);
      window.alert("Готово: добавлено " + result.created + ", обновлено " + result.updated);
    } catch (excelError) {
      setError(excelError.message || "Не удалось загрузить товары");
    } finally {
      setProcessingExcel(false);
    }
  }

  async function importProductsFromExcel(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError("Excel-файл должен быть не больше 5 МБ");
    setProcessingExcel(true);
    setError("");
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error("В файле нет листов");
      const expected = ["Артикул", "Название", "Цена", "Категория", "Описание", "Фотографии", "Топовый", "Активен"];
      const headers = expected.map((_, index) => String(sheet.getRow(1).getCell(index + 1).value || "").trim());
      if (expected.some((header, index) => headers[index] !== header)) throw new Error("Заголовки Excel изменены. Сначала скачайте актуальный шаблон");
      if (sheet.rowCount - 1 > 500) throw new Error("Можно загрузить не более 500 товаров за один раз");
      const asText = (value) => typeof value === "object" && value?.text ? value.text : String(value ?? "");
      const asBoolean = (value) => ["да", "true", "1"].includes(asText(value).trim().toLocaleLowerCase("ru"));
      const imported = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1 || !row.values.slice(1).some((value) => value !== null && value !== "")) return;
        imported.push({
          rowNumber,
          sku: asText(row.getCell(1).value).trim(),
          name: asText(row.getCell(2).value).trim(),
          price: Number(row.getCell(3).value),
          category: asText(row.getCell(4).value).trim(),
          description: asText(row.getCell(5).value).trim(),
          images: asText(row.getCell(6).value).split(/\s*\|\s*|\r?\n/).filter(Boolean),
          is_top: asBoolean(row.getCell(7).value),
          active: asText(row.getCell(8).value).trim() === "" ? true : asBoolean(row.getCell(8).value),
        });
      });
      if (!imported.length) throw new Error("В Excel-файле нет товаров");
      const response = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ products: imported, preview: true }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setExcelPreview({ ...result, products: imported, fileName: file.name });
    } catch (excelError) {
      setError(excelError.message || "Не удалось прочитать Excel-файл");
    } finally {
      setProcessingExcel(false);
    }
  }

  const normalizedSkuSearch = productSkuSearch.trim().toLocaleLowerCase("ru-RU");
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      productCategoryFilter === "all" || product.category === productCategoryFilter;
    const matchesSku =
      !normalizedSkuSearch ||
      product.sku?.toLocaleLowerCase("ru-RU").includes(normalizedSkuSearch);
    return matchesCategory && matchesSku;
  });

  return (
    <div className="admin">
      <div className="page-heading">
        <h2>
          Админка
          <button
            onClick={async () => {
              await fetch("/api/admin-logout", { method: "POST" });
              setLogin(false);
            }}
          >
            Выйти
          </button>
        </h2>
        <p>Управление магазином</p>
        {error && <p>{error}</p>}
      </div>

      <div className="admin-tabs">
        <button
          className={section === "orders" ? "active" : ""}
          onClick={() => setSection("orders")}
        >
          Заказы
        </button>
        <button
          className={section === "products" ? "active" : ""}
          onClick={() => setSection("products")}
        >
          Товары
        </button>
      </div>

      {section === "products" && (
        <>
          <div className="excel-actions">
            <button type="button" disabled={processingExcel} onClick={downloadExcelTemplate}>
              Скачать шаблон
            </button>
            <button type="button" disabled={processingExcel} onClick={exportProductsToExcel}>
              {processingExcel ? "Обработка…" : "Выгрузить Excel"}
            </button>
            <label>
              Загрузить Excel
              <input type="file" accept=".xlsx" disabled={processingExcel} onChange={(event) => { importProductsFromExcel(event.target.files?.[0]); event.target.value = ""; }} />
            </label>
            <p>Совпадающие артикулы обновятся, новые — добавятся. Фотографии указываются ссылками через |.</p>
          </div>
          {excelPreview && (
            <div className="excel-preview" role="dialog" aria-label="Предварительный просмотр импорта Excel">
              <div className="excel-preview-card">
                <h3>Проверка Excel</h3>
                <p className="excel-preview-file">{excelPreview.fileName}</p>
                <div className="excel-preview-summary">
                  <span>Строк: <strong>{excelPreview.total}</strong></span>
                  <span>Добавится: <strong>{excelPreview.created}</strong></span>
                  <span>Обновится: <strong>{excelPreview.updated}</strong></span>
                  <span>Ошибок: <strong>{excelPreview.errors.length}</strong></span>
                </div>
                {excelPreview.errors.length > 0 && (
                  <div className="excel-errors">
                    <h4>Исправьте строки и загрузите файл повторно</h4>
                    {excelPreview.errors.map((item, index) => (
                      <p key={item.row + "-" + index}><strong>Строка {item.row}</strong> · {item.sku}: {item.message}</p>
                    ))}
                  </div>
                )}
                <div className="admin-buttons">
                  <button type="button" onClick={applyExcelImport} disabled={processingExcel || excelPreview.errors.length > 0}>Применить изменения</button>
                  <button type="button" onClick={() => setExcelPreview(null)} disabled={processingExcel}>Отмена</button>
                </div>
              </div>
            </div>
          )}
          <form className="product-admin-form" onSubmit={saveProduct}>
            <h3>{editingProductId ? "Редактировать товар" : "Новый товар"}</h3>
            <input
              placeholder="Внутренний артикул"
              value={productForm.sku}
              onChange={(event) =>
                setProductForm({ ...productForm, sku: event.target.value })
              }
            />
            <input
              placeholder="Название"
              value={productForm.name}
              onChange={(event) =>
                setProductForm({ ...productForm, name: event.target.value })
              }
            />
            <input
              type="number"
              min="1"
              placeholder="Цена в рублях"
              value={productForm.price}
              onChange={(event) =>
                setProductForm({ ...productForm, price: event.target.value })
              }
            />
            <select
              value={productForm.category}
              onChange={(event) =>
                setProductForm({ ...productForm, category: event.target.value })
              }
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
            <textarea
              placeholder="Описание"
              value={productForm.description}
              onChange={(event) =>
                setProductForm({ ...productForm, description: event.target.value })
              }
            />
            <label className="image-upload">
              <span>{uploadingImage ? "Загружаем фотографии…" : "Выбрать фотографии"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={uploadingImage}
                onChange={(event) => {
                  uploadProductImages(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
            {productForm.images.length > 0 && (
              <>
                <p className="product-images-hint">
                  Перетащите фотографии, чтобы изменить порядок. Первая будет главной.
                </p>
                <div className="product-image-previews">
                {productForm.images.map((image, index) => (
                  <div
                    className={`product-image-preview ${
                      draggedImageIndex === index ? "dragging" : ""
                    }`}
                    draggable
                    key={image}
                    onDragStart={(event) => {
                      setDraggedImageIndex(index);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggedImageIndex !== null) {
                        reorderProductImages(draggedImageIndex, index);
                      }
                      setDraggedImageIndex(null);
                    }}
                    onDragEnd={() => setDraggedImageIndex(null)}
                  >
                    <img src={image} alt={`Фотография товара ${index + 1}`} />
                    <button
                      type="button"
                      aria-label={`Удалить фотографию ${index + 1}`}
                      onClick={() => removeProductImage(image)}
                    >
                      ×
                    </button>
                    {index === 0 && <span>Главная</span>}
                  </div>
                ))}
                </div>
              </>
            )}
            <label className="top-product-checkbox">
              <input
                type="checkbox"
                checked={productForm.is_top}
                onChange={(event) =>
                  setProductForm({ ...productForm, is_top: event.target.checked })
                }
              />
              Показывать в топовых моделях
            </label>
            <div className="admin-buttons">
              <button type="submit" disabled={uploadingImage}>
                {editingProductId ? "Сохранить" : "Добавить товар"}
              </button>
              {editingProductId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingProductId(null);
                    setProductForm(emptyProduct);
                  }}
                >
                  Отмена
                </button>
              )}
            </div>
          </form>

          <div className="admin-product-filters">
            <select
              aria-label="Фильтр товаров по категории"
              value={productCategoryFilter}
              onChange={(event) => setProductCategoryFilter(event.target.value)}
            >
              <option value="all">Все категории</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <input
              type="search"
              aria-label="Поиск товаров по артикулу"
              placeholder="Поиск по артикулу"
              value={productSkuSearch}
              onChange={(event) => setProductSkuSearch(event.target.value)}
            />
          </div>

          <div className="admin-products-list">
            {filteredProducts.map((product) => (
              <article className="admin-product-card" key={product.id}>
                <img src={product.image} alt={product.name} />
                <div>
                  <span>{product.category}</span>
                  <p className="admin-product-sku">Артикул: {product.sku}</p>
                  <h3>{product.name}</h3>
                  <strong>{Number(product.price).toLocaleString("ru-RU")} ₽</strong>
                  {product.is_top && <p>⭐ Топовая модель</p>}
                  <div className="admin-buttons">
                    <button onClick={() => editProduct(product)}>Изменить</button>
                    <button onClick={() => deleteProduct(product)}>Удалить</button>
                  </div>
                </div>
              </article>
            ))}
            {filteredProducts.length === 0 && (
              <p className="admin-products-empty">Товары не найдены</p>
            )}
          </div>
        </>
      )}

      {section === "orders" && <div className="orders-list">
        {orders.map((order) => (
          <div className="order-card" key={order.id}>
            <div className="order-top">
              <h3>Заказ №{order.order_number}</h3>

              <span
                className={
                  order.status === "Выполнен"
                    ? "status done"
                    : order.status === "Отменён"
                      ? "status cancel"
                      : order.status === "Принят"
                        ? "status accept"
                        : "status"
                }
              >
                {order.status}
              </span>
            </div>

            <div className="order-info">
              <p>👤 {order.name}</p>

              <p>📞 {order.phone}</p>

              <p>📍 {order.city}</p>

              <p>🏠 {order.address}</p>
              <p>🚚 {order.delivery_type === "cdek" ? "CDEK" : order.delivery_type === "yandex" ? "Яндекс Маркет" : "Курьер"}{order.pickup_point_name ? " — " + order.pickup_point_name : ""}</p>
            </div>

            <div className="products">
              <h4>🛒 Товары:</h4>

              {order.cart?.map((item, index) => (
                <p key={index}>
                  {item.name} × {item.quantity} — {item.price} ₽
                </p>
              ))}
            </div>

            <div className="order-total">💰 {order.total} ₽</div>
            <div className="admin-buttons">
              {order.status === "Новый" && (
                <>
                  <button
                    onClick={() => changeStatus(order.order_number, "Принят")}
                  >
                    🟡 Принять
                  </button>

                  <button
                    onClick={() => changeStatus(order.order_number, "Отменён")}
                  >
                    ❌ Отмена
                  </button>
                </>
              )}

              {order.status === "Принят" && (
                <>
                  <button
                    onClick={() =>
                      changeStatus(order.order_number, "В доставке")
                    }
                  >
                    🚚 Доставка
                  </button>

                  <button
                    onClick={() => changeStatus(order.order_number, "Отменён")}
                  >
                    ❌ Отмена
                  </button>
                </>
              )}

              {order.status === "В доставке" && (
                <>
                  <button
                    onClick={() => changeStatus(order.order_number, "Выполнен")}
                  >
                    ✅ Выполнен
                  </button>

                  <button
                    onClick={() => changeStatus(order.order_number, "Отменён")}
                  >
                    ❌ Отмена
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}
