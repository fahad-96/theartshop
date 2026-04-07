import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import crypto from "crypto";
import { products, sizeDimensions, INSTAGRAM_URL, WHATSAPP_PHONE } from "../src/data/products.js";

const razorpayCreateMock = vi.fn();

const loadServer = async () => {
  return import("../server/index.js");
};

afterEach(() => {
  delete globalThis.__THE_ART_SHOP_RAZORPAY_CLIENT__;
  delete globalThis.__RAZORPAY_CREATE_MOCK__;
  razorpayCreateMock.mockReset();
});

describe("Frontend data", () => {
  it("exposes the expected catalog size", () => {
    expect(products).toHaveLength(36);
  });

  it("exposes the expected size dimensions", () => {
    expect(sizeDimensions).toEqual({
      S: "3feet / 3feet",
      L: "4feet / 3feet",
      XL: "5feet / 5feet",
    });
  });

  it("exposes the configured social links", () => {
    expect(INSTAGRAM_URL).toContain("instagram.com/theartshop.in");
    expect(WHATSAPP_PHONE).toBe("+916006448855");
  });

  products.forEach((product, index) => {
    it(`product ${index + 1} has a stable numeric id`, () => {
      expect(product.id).toBe(String(index));
    });

    it(`product ${index + 1} title is normalized`, () => {
      expect(product.title).toBe(product.title.toUpperCase());
      expect(product.title.length).toBeGreaterThan(0);
    });

    it(`product ${index + 1} image path is encoded`, () => {
      expect(product.src).toContain("image/");
      expect(product.src).toMatch(/\.jpeg$/);
      expect(product.src).not.toContain(" ");
    });

    it(`product ${index + 1} pricing is valid`, () => {
      expect(product.pricing.S).toBeGreaterThan(0);
      expect(product.pricing.L).toBeGreaterThan(product.pricing.S);
      expect(product.pricing.XL).toBeGreaterThan(product.pricing.L);
    });

    it(`product ${index + 1} copy and reviews are present`, () => {
      expect(product.info).toEqual(expect.any(String));
      expect(product.info.length).toBeGreaterThan(20);
      expect(product.shortInfo).toEqual(expect.any(String));
      expect(product.shortInfo.length).toBeGreaterThan(10);
      expect(product.reviews).toHaveLength(3);
      product.reviews.forEach((review) => {
        expect(review.name).toEqual(expect.any(String));
        expect(review.text).toEqual(expect.any(String));
        expect(review.rating).toBeGreaterThanOrEqual(1);
        expect(review.rating).toBeLessThanOrEqual(5);
      });
    });
  });
});

describe("Backend payment API", () => {
  beforeAll(() => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = "secret_key_for_tests";
  });

  const ensureTestClient = () => {
    globalThis.__RAZORPAY_CREATE_MOCK__ = razorpayCreateMock;

    globalThis.__THE_ART_SHOP_RAZORPAY_CLIENT__ = {
      orders: {
        create: (...args) => globalThis.__RAZORPAY_CREATE_MOCK__(...args),
      },
    };
  };

  it("returns health status", async () => {
    ensureTestClient();
    const { app } = await loadServer();
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      service: "the-art-shop-payments",
      razorpayConfigured: true,
    });
  });

  it("rejects invalid order amount", async () => {
    ensureTestClient();
    const { app } = await loadServer();
    const res = await request(app).post("/api/payment/order").send({ amount: 0 });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/invalid amount/i);
  });

  it("creates a Razorpay order in paise", async () => {
    ensureTestClient();
    razorpayCreateMock.mockResolvedValueOnce({
      id: "order_123",
      amount: 59900,
      currency: "INR",
    });

    const { app } = await loadServer();
    const res = await request(app).post("/api/payment/order").send({
      amount: 599,
      currency: "INR",
      receipt: "tas_receipt_001",
      notes: { userEmail: "user@example.com" },
    });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.keyId).toBe("rzp_test_key");
    expect(res.body.order).toMatchObject({
      id: "order_123",
      amount: 59900,
      currency: "INR",
    });
    expect(razorpayCreateMock).toHaveBeenCalledWith({
      amount: 59900,
      currency: "INR",
      receipt: "tas_receipt_001",
      notes: { userEmail: "user@example.com" },
    });
  });

  it("rejects missing verification payload", async () => {
    ensureTestClient();
    const { app } = await loadServer();
    const res = await request(app).post("/api/payment/verify").send({});

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("rejects invalid verification signature", async () => {
    ensureTestClient();
    const { app } = await loadServer();
    const res = await request(app).post("/api/payment/verify").send({
      razorpay_order_id: "order_abc",
      razorpay_payment_id: "pay_abc",
      razorpay_signature: "not-valid",
    });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/failed/i);
  });

  it("accepts a valid verification signature", async () => {
    ensureTestClient();
    const razorpayOrderId = "order_valid";
    const razorpayPaymentId = "payment_valid";
    const signature = crypto
      .createHmac("sha256", "secret_key_for_tests")
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    const { app } = await loadServer();
    const res = await request(app).post("/api/payment/verify").send({
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: signature,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      message: "Payment verified successfully.",
    });
  });
});