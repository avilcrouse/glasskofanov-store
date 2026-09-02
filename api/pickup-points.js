let cdekTokenCache = null;

async function getCdekToken() {
  if (cdekTokenCache?.expiresAt > Date.now() + 60_000) return cdekTokenCache.value;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.CDEK_CLIENT_ID || "",
    client_secret: process.env.CDEK_CLIENT_SECRET || "",
  });
  const response = await fetch("https://api.cdek.ru/v2/oauth/token", { method: "POST", body });
  if (!response.ok) throw new Error("CDEK не принял ключи API");
  const data = await response.json();
  cdekTokenCache = { value: data.access_token, expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000 };
  return data.access_token;
}

async function loadCdekPoints(city) {
  if (!process.env.CDEK_CLIENT_ID || !process.env.CDEK_CLIENT_SECRET) throw new Error("Ключи CDEK не настроены");
  const token = await getCdekToken();
  const headers = { Authorization: "Bearer " + token };
  const cityResponse = await fetch("https://api.cdek.ru/v2/location/cities?country_codes=RU&city=" + encodeURIComponent(city) + "&size=1", { headers });
  const cities = await cityResponse.json();
  if (!cityResponse.ok || !cities?.[0]?.code) return [];
  const pointsResponse = await fetch("https://api.cdek.ru/v2/deliverypoints?city_code=" + cities[0].code + "&type=PVZ&is_handout=true", { headers });
  const points = await pointsResponse.json();
  if (!pointsResponse.ok) throw new Error("Не удалось получить ПВЗ CDEK");
  return points.slice(0, 100).map((point) => ({
    provider: "cdek",
    code: point.code,
    name: point.name || "ПВЗ CDEK",
    address: point.location?.address_full || point.location?.address,
    workTime: point.work_time || "",
  }));
}

async function loadYandexPoints(city) {
  const apiKey = process.env.YANDEX_MARKET_API_KEY;
  const businessId = process.env.YANDEX_MARKET_BUSINESS_ID;
  if (!apiKey || !businessId) throw new Error("Ключи Яндекс Маркета не настроены");
  const response = await fetch("https://api.partner.market.yandex.ru/v1/businesses/" + businessId + "/logistics-points?limit=500", {
    method: "POST",
    headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
    body: "{}",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || "Не удалось получить ПВЗ Яндекс Маркета");
  const cityKey = city.toLocaleLowerCase("ru");
  return (data?.result?.logisticPoints || [])
    .filter((point) => point.brand === "MARKET" && point.address?.city?.toLocaleLowerCase("ru").includes(cityKey))
    .slice(0, 100)
    .map((point) => ({
      provider: "yandex",
      code: String(point.id),
      name: point.name || "ПВЗ Яндекс Маркета",
      address: [point.address?.street, point.address?.house].filter(Boolean).join(", ") || point.address?.address,
      workTime: point.schedule?.customSchedule || "",
    }));
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const provider = String(req.query.provider || "");
  const city = String(req.query.city || "").trim();
  if (!["cdek", "yandex"].includes(provider) || city.length < 2) return res.status(400).json({ error: "Укажите службу доставки и город" });
  try {
    return res.json(provider === "cdek" ? await loadCdekPoints(city) : await loadYandexPoints(city));
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
}
