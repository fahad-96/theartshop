import Razorpay from "razorpay";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, message: "Method not allowed" }) };
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, message: "Razorpay keys are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Netlify environment variables." }),
    };
  }

  try {
    const { amount, currency = "INR", receipt, notes } = JSON.parse(event.body || "{}");

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, message: "Invalid amount." }),
      };
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const amountInPaise = Math.round(numericAmount * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {},
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, keyId, order }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, message: "Failed to create Razorpay order.", error: error?.message || "Unknown error" }),
    };
  }
}
