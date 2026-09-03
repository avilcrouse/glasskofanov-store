import { adminCookie, createAdminSession } from "../lib/admin-auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const { password } = req.body;

  if (process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
    res.setHeader("Set-Cookie", adminCookie(createAdminSession()));

    return res.json({
      success: true,
    });
  }

  return res.status(401).json({
    success: false,
    error: "Неверный пароль",
  });
}
