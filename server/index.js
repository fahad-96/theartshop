import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import Razorpay from "razorpay";
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

export const startServer = () => {
  app.listen(port, () => {
    console.log(`Payment server running on http://localhost:${port}`);
  });
};

const isDirectExecution = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectExecution) {
  startServer();
}
