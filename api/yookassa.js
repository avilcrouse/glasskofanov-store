function credentials() {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secretKey) throw new Error("ЮKassa ещё не настроена");
  return Buffer.from(`${shopId}:${secretKey}`).toString("base64");
}

export async function yookassaRequest(path, options = {}) {
  const response = await fetch(`https://api.yookassa.ru/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${credentials()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await response.json();

  if (!response.ok) {
    console.error("YOOKASSA ERROR:", response.status, data);
    throw new Error(data.description || "Ошибка ЮKassa");
  }
  return data;
}
