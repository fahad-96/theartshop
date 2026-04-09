import crypto from "crypto";
import Razorpay from "razorpay";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, message: "Method not allowed" }) };
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, message: "Razorpay secret key is not configured." }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    // ── Mode: check-order (recovery flow — check if a Razorpay order was paid) ──
    if (body.mode === "check-order" && body.razorpayOrderId) {
      if (!keyId) {
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ok: false, message: "Razorpay key ID not configured." }),
        };
      }

      const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
      const order = await razorpay.orders.fetch(body.razorpayOrderId);
      const paid = order.status === "paid";
      let paymentId = null;

      if (paid) {
        const payments = await razorpay.orders.fetchPayments(body.razorpayOrderId);
        const captured = payments.items?.find((p) => p.status === "captured");
        paymentId = captured?.id || null;
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true, paid, orderId: order.id, paymentId, orderStatus: order.status }),
      };
    }

    // ── Mode: signature verification (existing flow) ──
    const {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, message: "Missing Razorpay payment verification fields." }),
      };
    }

    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, message: "Payment signature verification failed." }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, message: "Payment verified successfully." }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, message: "Verification failed due to server error.", error: error?.message || "Unknown error" }),
    };
  }
}
