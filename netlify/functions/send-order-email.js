import nodemailer from "nodemailer";

const ADMIN_EMAIL = "theartshop.admin@gmail.com";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: ADMIN_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const formatItems = (items) => {
  if (!Array.isArray(items) || !items.length) return "No items";
  return items.map((it) => `${it.title} (${it.size}) × ${it.qty}`).join("\n  ");
};

const buildCustomerEmail = ({ orderRef, amount, items, shipping }) => ({
  from: `"The Art Shop" <${ADMIN_EMAIL}>`,
  to: shipping?.email || "",
  subject: `Order Confirmed — ${orderRef}`,
  html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #050505; padding: 28px 24px; text-align: center;">
        <h1 style="color: #fff; font-size: 20px; letter-spacing: 0.15em; margin: 0;">THE ART SHOP</h1>
      </div>
      <div style="padding: 32px 24px;">
        <h2 style="font-size: 18px; margin: 0 0 6px;">Thank you for your order!</h2>
        <p style="color: #666; font-size: 14px; margin: 0 0 24px;">Your order has been placed successfully.</p>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Order ID</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 600; text-align: right;">${orderRef}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Amount</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 600; text-align: right;">₹${amount}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Shipping To</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">${shipping?.fullName || "—"}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Address</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; max-width: 220px;">${shipping?.address || "—"}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Phone</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">${shipping?.phone || "—"}</td>
          </tr>
        </table>

        <h3 style="font-size: 14px; margin: 24px 0 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #888;">Items</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${(items || []).map((it) => `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${it.title}</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; text-align: center; color: #888;">${it.size}</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">× ${it.qty}</td>
          </tr>`).join("")}
        </table>

        <p style="margin: 32px 0 0; font-size: 13px; color: #999;">We'll notify you when your order ships. For any queries, reply to this email or reach us on WhatsApp.</p>
      </div>
      <div style="background: #f8f8f8; padding: 20px 24px; text-align: center; font-size: 12px; color: #aaa;">
        The Art Shop — Handcrafted Wall Art
      </div>
    </div>
  `,
});

const buildAdminEmail = ({ orderRef, amount, items, shipping, payment }) => ({
  from: `"The Art Shop Orders" <${ADMIN_EMAIL}>`,
  to: ADMIN_EMAIL,
  subject: `🛒 New Order — ₹${amount} — ${shipping?.fullName || "Unknown"}`,
  html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #050505; padding: 20px 24px;">
        <h1 style="color: #fff; font-size: 16px; letter-spacing: 0.1em; margin: 0;">NEW ORDER RECEIVED</h1>
      </div>
      <div style="padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #888; width: 120px;">Order ID</td><td style="font-weight: 600;">${orderRef}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Amount</td><td style="font-weight: 600;">₹${amount}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Customer</td><td>${shipping?.fullName || "—"}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Phone</td><td>${shipping?.phone || "—"}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Email</td><td>${shipping?.email || "—"}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Address</td><td>${shipping?.address || "—"}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Landmark</td><td>${shipping?.landmark || "—"}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Payment</td><td>${payment?.provider || "—"} / ${payment?.status || "—"}</td></tr>
        </table>

        <h3 style="font-size: 13px; margin: 20px 0 8px; text-transform: uppercase; letter-spacing: 0.1em; color: #888;">Items</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${(items || []).map((it) => `
          <tr>
            <td style="padding: 6px 0; border-bottom: 1px solid #eee;">${it.title}</td>
            <td style="padding: 6px 0; border-bottom: 1px solid #eee; text-align: center;">${it.size}</td>
            <td style="padding: 6px 0; border-bottom: 1px solid #eee; text-align: right;">× ${it.qty}</td>
          </tr>`).join("")}
        </table>
      </div>
    </div>
  `,
});

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
    const { orderRef, amount, items, shipping, payment } = JSON.parse(event.body || "{}");

    if (!orderRef) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, message: "Missing order ref." }),
      };
    }

    const results = { customer: false, admin: false };

    // Send to customer (if email is available)
    if (shipping?.email) {
      try {
        await transporter.sendMail(buildCustomerEmail({ orderRef, amount, items, shipping }));
        results.customer = true;
      } catch (err) {
        console.error("Customer email failed:", err.message);
      }
    }

    // Send to admin (always)
    try {
      await transporter.sendMail(buildAdminEmail({ orderRef, amount, items, shipping, payment }));
      results.admin = true;
    } catch (err) {
      console.error("Admin email failed:", err.message);
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, results }),
    };
  } catch (error) {
    console.error("send-order-email error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, message: "Email sending failed." }),
    };
  }
}
