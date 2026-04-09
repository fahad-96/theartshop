import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

const json = (statusCode, payload) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const normalizeEmail = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const normalizeShipping = (shipping) => {
  if (!shipping || typeof shipping !== "object") return {};
  return {
    fullName: String(shipping.fullName || "").trim(),
    phone: String(shipping.phone || "").trim(),
    landmark: String(shipping.landmark || "").trim(),
    pincode: String(shipping.pincode || "").trim(),
    address: String(shipping.address || "").trim(),
  };
};

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, message: "Method not allowed" });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!keyId || !keySecret) {
    return json(500, { ok: false, message: "Razorpay credentials are not configured." });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return json(500, {
      ok: false,
      message: "Server order finalization is not configured. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const orderRef = String(body.orderRef || "").trim();
    const razorpayOrderId = String(body.razorpayOrderId || "").trim();
    const razorpayPaymentId = String(body.razorpayPaymentId || "").trim();
    const userId = String(body.userId || "").trim();
    const userEmail = normalizeEmail(body.userEmail);
    const amount = Number(body.amount);
    const currency = String(body.currency || "INR").trim() || "INR";
    const items = Array.isArray(body.items) ? body.items : [];
    const shipping = normalizeShipping(body.shipping);
    const paymentFromClient = body.payment && typeof body.payment === "object" ? body.payment : {};

    if (!isNonEmptyString(orderRef)) {
      return json(400, { ok: false, message: "Missing orderRef." });
    }

    if (!isNonEmptyString(razorpayOrderId)) {
      return json(400, { ok: false, message: "Missing razorpayOrderId." });
    }

    if (!isNonEmptyString(userId)) {
      return json(400, { ok: false, message: "Missing userId." });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return json(400, { ok: false, message: "Invalid amount." });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const rpOrder = await razorpay.orders.fetch(razorpayOrderId);

    if (rpOrder?.status !== "paid") {
      return json(409, { ok: false, message: "Payment is not marked as paid by Razorpay yet." });
    }

    // Validate order metadata consistency when present
    const notesOrderRef = String(rpOrder?.notes?.orderRef || "").trim();
    if (notesOrderRef && notesOrderRef !== orderRef) {
      return json(409, { ok: false, message: "Order reference mismatch." });
    }

    const notesUserId = String(rpOrder?.notes?.userId || "").trim();
    if (notesUserId && notesUserId !== userId) {
      return json(409, { ok: false, message: "User ID mismatch." });
    }

    const notesUserEmail = normalizeEmail(rpOrder?.notes?.userEmail || "");
    if (notesUserEmail && userEmail && notesUserEmail !== userEmail) {
      return json(409, { ok: false, message: "User email mismatch." });
    }

    const payments = await razorpay.orders.fetchPayments(razorpayOrderId);
    const capturedPayment = payments?.items?.find((p) => p.status === "captured") || null;

    if (razorpayPaymentId && capturedPayment?.id && capturedPayment.id !== razorpayPaymentId) {
      return json(409, { ok: false, message: "Payment ID mismatch." });
    }

    const finalPaymentId = razorpayPaymentId || capturedPayment?.id || "";

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const paymentPayload = {
      provider: "razorpay",
      status: "paid",
      razorpayOrderId,
      razorpayPaymentId: finalPaymentId,
      ...paymentFromClient,
    };

    const orderRow = {
      user_id: userId,
      order_ref: orderRef,
      amount,
      currency,
      status: "Paid",
      items,
      shipping,
      payment: paymentPayload,
    };

    const { error: upsertError } = await supabaseAdmin
      .from("orders")
      .upsert(orderRow, { onConflict: "order_ref" });

    if (upsertError) {
      return json(500, {
        ok: false,
        message: "Could not save order in database.",
        error: upsertError.message,
      });
    }

    return json(200, {
      ok: true,
      orderRef,
      paymentId: finalPaymentId,
      message: "Order finalized successfully.",
    });
  } catch (error) {
    return json(500, {
      ok: false,
      message: "Failed to finalize order.",
      error: error?.message || "Unknown error",
    });
  }
}
