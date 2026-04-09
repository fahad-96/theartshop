import nodemailer from "nodemailer";

const ADMIN_EMAIL = "theartshop.admin@gmail.com";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: ADMIN_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const STATUS_MESSAGES = {
  placed: {
    heading: "Order Placed",
    body: "Your order has been placed and is awaiting processing.",
    color: "#3b82f6",
  },
  processing: {
    heading: "Order Processing",
    body: "Great news! Your order is now being prepared.",
    color: "#f59e0b",
  },
  shipped: {
    heading: "Order Shipped",
    body: "Your order has been shipped and is on its way to you!",
    color: "#8b5cf6",
  },
  delivered: {
    heading: "Order Delivered",
    body: "Your order has been delivered. We hope you love your new artwork!",
    color: "#10b981",
    extra: `
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="font-size: 16px; font-weight: 600; color: #166534; margin: 0 0 8px;">We'd love to hear from you! ⭐</p>
        <p style="font-size: 14px; color: #15803d; margin: 0;">Please visit the product page and share a review of your purchase. Your feedback helps other art lovers!</p>
      </div>
    `,
  },
  cancelled: {
    heading: "Order Cancelled",
    body: "Your order has been cancelled. If you have any questions, please contact us.",
    color: "#ef4444",
  },
  refunded: {
    heading: "Order Refunded",
    body: "Your order has been refunded. The amount will be credited back to your original payment method.",
    color: "#6b7280",
  },
};

const buildStatusEmail = ({ orderRef, status, customerName, amount, items, email }) => {
  const statusKey = String(status).toLowerCase();
  const info = STATUS_MESSAGES[statusKey] || {
    heading: `Order ${status}`,
    body: `Your order status has been updated to: ${status}.`,
    color: "#6b7280",
  };

  const itemsHtml = Array.isArray(items) && items.length
    ? items
        .map(
          (it) =>
            `<tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${it.title || "Item"}</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; text-align: center; color: #888;">${it.size || ""}</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">× ${it.qty || 1}</td>
            </tr>`
        )
        .join("")
    : "";

  return {
    from: `"The Art Shop" <${ADMIN_EMAIL}>`,
    to: email,
    subject: `Order ${info.heading} — ${orderRef}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #050505; padding: 28px 24px; text-align: center;">
          <h1 style="color: #fff; font-size: 20px; letter-spacing: 0.15em; margin: 0;">THE ART SHOP</h1>
        </div>
        <div style="padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; background: ${info.color}; color: #fff; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 6px 16px; border-radius: 20px;">${info.heading}</span>
          </div>

          <h2 style="font-size: 18px; margin: 0 0 6px;">Hi ${customerName || "there"},</h2>
          <p style="color: #666; font-size: 14px; margin: 0 0 24px;">${info.body}</p>

          ${info.extra || ""}

          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Order ID</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 600; text-align: right;">${orderRef}</td>
            </tr>
            ${amount ? `<tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Amount</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 600; text-align: right;">₹${amount}</td>
            </tr>` : ""}
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Status</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 600; text-align: right;">${status}</td>
            </tr>
          </table>

          ${itemsHtml ? `
          <h3 style="font-size: 14px; margin: 24px 0 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #888;">Items</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">${itemsHtml}</table>
          ` : ""}

          <p style="margin: 32px 0 0; font-size: 13px; color: #999;">If you have any questions, reply to this email or reach us on WhatsApp.</p>
        </div>
        <div style="background: #f8f8f8; padding: 20px 24px; text-align: center; font-size: 12px; color: #aaa;">
          The Art Shop — Handcrafted Wall Art
        </div>
      </div>
    `,
  };
};

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, message: "Method not allowed" }) };
  }

  if (!process.env.GMAIL_APP_PASSWORD) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, message: "Email not configured." }),
    };
  }

  try {
    const { orderRef, status, email, customerName, amount, items } = JSON.parse(event.body || "{}");

    if (!orderRef || !status || !email) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, message: "Missing required fields (orderRef, status, email)." }),
      };
    }

    await transporter.sendMail(buildStatusEmail({ orderRef, status, customerName, amount, items, email }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (error) {
    console.error("send-order-status-email error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, message: "Email sending failed." }),
    };
  }
}
