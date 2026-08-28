import {
  cloudPaymentsResponse,
  findPaymentOrder,
  readSignedNotification,
} from "./cloudpayments.js";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const notification = await readSignedNotification(req);
  if (!notification) return res.status(401).end();

  const order = await findPaymentOrder(notification);
  return cloudPaymentsResponse(res, order ? 0 : 13);
}
