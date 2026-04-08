import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import Razorpay from "razorpay";
import nodemailer from "nodemailer";
import { pathToFileURL } from "url";

dotenv.config();

export const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

const getRazorpayClient = () => {
  if (globalThis.__THE_ART_SHOP_RAZORPAY_CLIENT__) {
    return globalThis.__THE_ART_SHOP_RAZORPAY_CLIENT__;
  }

  if (!keyId || !keySecret) {
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "the-art-shop-payments",
    razorpayConfigured: Boolean(keyId && keySecret),
  });
});

app.post("/api/payment/order", async (req, res) => {
  try {
    const razorpay = getRazorpayClient();
    if (!razorpay || !keyId) {
      return res.status(500).json({
        ok: false,
        message: "Razorpay keys are missing. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env",
      });
    }

    const { amount, currency = "INR", receipt, notes } = req.body || {};

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ ok: false, message: "Invalid amount." });
    }

    const amountInPaise = Math.round(numericAmount * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {},
    });

    return res.json({
      ok: true,
      keyId,
      order,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to create Razorpay order.",
      error: error?.message || "Unknown error",
    });
  }
});

app.post("/api/payment/verify", (req, res) => {
  try {
    if (!keySecret) {
      return res.status(500).json({
        ok: false,
        message: "Razorpay secret key is missing in server env.",
      });
    }

    const {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } = req.body || {};

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        ok: false,
        message: "Missing Razorpay payment verification fields.",
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    const isValid = generatedSignature === razorpaySignature;

    if (!isValid) {
      return res.status(400).json({
        ok: false,
        message: "Payment signature verification failed.",
      });
    }

    return res.json({
      ok: true,
      message: "Payment verified successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Verification failed due to server error.",
      error: error?.message || "Unknown error",
    });
  }
});

// ─── Order Email Notifications ───

const ADMIN_EMAIL = "theartshop.admin@gmail.com";

const getEmailTransporter = () => {
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailPass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: ADMIN_EMAIL, pass: gmailPass },
  });
};

app.post("/api/notify/order-email", async (req, res) => {
  try {
    const transport = getEmailTransporter();
    if (!transport) {
      return res.status(500).json({ ok: false, message: "Email not configured." });
    }

    const { orderRef, amount, items, shipping, payment } = req.body || {};
    if (!orderRef) {
      return res.status(400).json({ ok: false, message: "Missing order ref." });
    }

    const results = { customer: false, admin: false };
    const itemsHtml = (items || []).map((it) => `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${it.title}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:center">${it.size}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">× ${it.qty}</td></tr>`).join("");

    if (shipping?.email) {
      try {
        await transport.sendMail({
          from: `"The Art Shop" <${ADMIN_EMAIL}>`,
          to: shipping.email,
          subject: `Order Confirmed — ${orderRef}`,
          html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto"><div style="background:#050505;padding:28px 24px;text-align:center"><h1 style="color:#fff;font-size:20px;letter-spacing:0.15em;margin:0">THE ART SHOP</h1></div><div style="padding:32px 24px"><h2 style="font-size:18px;margin:0 0 6px">Thank you for your order!</h2><p style="color:#666;font-size:14px;margin:0 0 24px">Your order has been placed successfully.</p><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Order ID</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;text-align:right">${orderRef}</td></tr><tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Amount</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;text-align:right">₹${amount}</td></tr><tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Shipping To</td><td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right">${shipping?.fullName || "—"}</td></tr></table><h3 style="font-size:14px;margin:24px 0 12px;text-transform:uppercase;letter-spacing:0.1em;color:#888">Items</h3><table style="width:100%;border-collapse:collapse;font-size:14px">${itemsHtml}</table><p style="margin:32px 0 0;font-size:13px;color:#999">We'll notify you when your order ships.</p></div></div>`,
        });
        results.customer = true;
      } catch (err) { console.error("Customer email failed:", err.message); }
    }

    try {
      await transport.sendMail({
        from: `"The Art Shop Orders" <${ADMIN_EMAIL}>`,
        to: ADMIN_EMAIL,
        subject: `🛒 New Order — ₹${amount} — ${shipping?.fullName || "Unknown"}`,
        html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto"><div style="background:#050505;padding:20px 24px"><h1 style="color:#fff;font-size:16px;letter-spacing:0.1em;margin:0">NEW ORDER RECEIVED</h1></div><div style="padding:24px"><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:8px 0;color:#888;width:120px">Order ID</td><td style="font-weight:600">${orderRef}</td></tr><tr><td style="padding:8px 0;color:#888">Amount</td><td style="font-weight:600">₹${amount}</td></tr><tr><td style="padding:8px 0;color:#888">Customer</td><td>${shipping?.fullName || "—"}</td></tr><tr><td style="padding:8px 0;color:#888">Phone</td><td>${shipping?.phone || "—"}</td></tr><tr><td style="padding:8px 0;color:#888">Email</td><td>${shipping?.email || "—"}</td></tr><tr><td style="padding:8px 0;color:#888">Address</td><td>${shipping?.address || "—"}</td></tr><tr><td style="padding:8px 0;color:#888">Payment</td><td>${payment?.provider || "—"} / ${payment?.status || "—"}</td></tr></table><h3 style="font-size:13px;margin:20px 0 8px;text-transform:uppercase;letter-spacing:0.1em;color:#888">Items</h3><table style="width:100%;border-collapse:collapse;font-size:14px">${itemsHtml}</table></div></div>`,
      });
      results.admin = true;
    } catch (err) { console.error("Admin email failed:", err.message); }

    return res.json({ ok: true, results });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Email sending failed.", error: error?.message });
  }
});

export const startServer = () => {
  app.listen(port, () => {
    console.log(`Payment server running on http://localhost:${port}`);
  });
};

const isDirectExecution = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectExecution) {
  startServer();
}
