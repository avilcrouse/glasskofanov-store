import crypto from "node:crypto";

const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60;

export function verifyTelegramInitData(initData) {
  if (!initData || !process.env.BOT_TOKEN) return null;

  try {
    const params = new URLSearchParams(initData);
    const receivedHash = params.get("hash");
    if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) return null;

    params.delete("hash");
    const dataCheckString = [...params.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => key + "=" + value)
      .join("\n");
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(process.env.BOT_TOKEN)
      .digest();
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(receivedHash, "hex"), Buffer.from(calculatedHash, "hex"))) {
      return null;
    }

    const authDate = Number(params.get("auth_date"));
    const now = Math.floor(Date.now() / 1000);
    if (!authDate || authDate > now + 60 || now - authDate > MAX_INIT_DATA_AGE_SECONDS) return null;

    const user = JSON.parse(params.get("user") || "null");
    return user?.id ? user : null;
  } catch {
    return null;
  }
}
