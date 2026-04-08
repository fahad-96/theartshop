import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import crypto from "crypto";
import {
  products,
  sizeDimensions,
  INSTAGRAM_URL,
  WHATSAPP_PHONE,
  slugifyProductTitle,
  normalizeProductPricing,
  mapProductRowToProduct,
  buildProductPayload,
  LOGO_SRC,
  FAVICON_SRC,
  HERO_VIDEO_SRC,
} from "../src/data/products.js";

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

  products.forEach((product, index) => {
    it(`product ${index + 1} MRP is valid and higher than selling price`, () => {
      expect(product.mrp).toBeDefined();
      expect(product.mrp.S).toBeGreaterThan(product.pricing.S);
      expect(product.mrp.L).toBeGreaterThan(product.pricing.L);
      expect(product.mrp.XL).toBeGreaterThan(product.pricing.XL);
      expect(product.mrp.S).toBeGreaterThan(0);
      expect(product.mrp.L).toBeGreaterThan(product.mrp.S);
      expect(product.mrp.XL).toBeGreaterThan(product.mrp.L);
    });

    it(`product ${index + 1} has a valid slug`, () => {
      expect(product.slug).toEqual(expect.any(String));
      expect(product.slug.length).toBeGreaterThan(0);
      expect(product.slug).not.toMatch(/[A-Z]/);
      expect(product.slug).not.toMatch(/\s/);
      expect(product.slug).not.toMatch(/^-|-$/);
    });

    it(`product ${index + 1} has a valid category`, () => {
      expect(["Art", "Deer"]).toContain(product.category);
    });
  });
});

describe("Product utility functions", () => {
  it("slugifyProductTitle lowercases and replaces spaces", () => {
    expect(slugifyProductTitle("DEER HEAD")).toBe("deer-head");
    expect(slugifyProductTitle("CR7")).toBe("cr7");
    expect(slugifyProductTitle("S LETTER SNAKE")).toBe("s-letter-snake");
  });

  it("slugifyProductTitle strips leading/trailing hyphens", () => {
    expect(slugifyProductTitle("--test--")).toBe("test");
    expect(slugifyProductTitle("  hello  ")).toBe("hello");
  });

  it("normalizeProductPricing returns correct structure from valid input", () => {
    const result = normalizeProductPricing({ S: 100, L: 200, XL: 300 }, "test");
    expect(result).toEqual({ S: 100, L: 200, XL: 300 });
  });

  it("normalizeProductPricing handles alternate key formats", () => {
    const result = normalizeProductPricing({ s: 100, l: 200, xl: 300 }, "test");
    expect(result).toEqual({ S: 100, L: 200, XL: 300 });
  });

  it("normalizeProductPricing falls back to deer pricing for deer products", () => {
    const result = normalizeProductPricing(null, "DEER HEAD");
    expect(result).toEqual({ S: 999, L: 1499, XL: 1999 });
  });

  it("normalizeProductPricing falls back to regular pricing", () => {
    const result = normalizeProductPricing(undefined, "ART");
    expect(result).toEqual({ S: 599, L: 999, XL: 1499 });
  });

  it("mapProductRowToProduct maps a DB row correctly", () => {
    const row = {
      id: 42,
      title: "TEST ART",
      slug: "test-art",
      image_path: "test.jpeg",
      pricing: { S: 500, L: 800, XL: 1200 },
      info: "Test info text for this product.",
      short_info: "Short test info.",
      category: "Art",
      is_active: true,
    };
    const mapped = mapProductRowToProduct(row);
    expect(mapped.id).toBe("42");
    expect(mapped.title).toBe("TEST ART");
    expect(mapped.slug).toBe("test-art");
    expect(mapped.pricing).toEqual({ S: 500, L: 800, XL: 1200 });
    expect(mapped.info).toBe("Test info text for this product.");
    expect(mapped.shortInfo).toBe("Short test info.");
    expect(mapped.isActive).toBe(true);
  });

  it("mapProductRowToProduct handles missing fields gracefully", () => {
    const mapped = mapProductRowToProduct({});
    expect(mapped.title).toBe("Untitled");
    expect(mapped.pricing).toBeDefined();
    expect(mapped.reviews).toHaveLength(3);
    expect(mapped.isActive).toBe(true);
  });

  it("buildProductPayload produces correct shape", () => {
    const payload = buildProductPayload({
      title: "  WOLF HEAD  ",
      slug: "wolf-head",
      imagePath: "wolf.jpeg",
      category: "Art",
      info: "Wolf art info.",
      shortInfo: "Wolf short.",
      pricing: { S: 599, L: 999, XL: 1499 },
    });
    expect(payload.title).toBe("WOLF HEAD");
    expect(payload.slug).toBe("wolf-head");
    expect(payload.image_path).toBe("wolf.jpeg");
    expect(payload.pricing).toEqual({ S: 599, L: 999, XL: 1499 });
    expect(payload.is_active).toBe(true);
    expect(payload.publish_status).toBe("published");
  });

  it("exports media and branding constants", () => {
    expect(LOGO_SRC).toContain("logo.svg");
    expect(FAVICON_SRC).toContain("favicon.png");
    expect(HERO_VIDEO_SRC).toContain("hero.mp4");
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

  it("rejects negative order amount", async () => {
    ensureTestClient();
    const { app } = await loadServer();
    const res = await request(app).post("/api/payment/order").send({ amount: -100 });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/invalid amount/i);
  });

  it("rejects non-numeric order amount", async () => {
    ensureTestClient();
    const { app } = await loadServer();
    const res = await request(app).post("/api/payment/order").send({ amount: "abc" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/invalid amount/i);
  });

  it("handles Razorpay create failure gracefully", async () => {
    ensureTestClient();
    razorpayCreateMock.mockRejectedValueOnce(new Error("Razorpay API down"));

    const { app } = await loadServer();
    const res = await request(app).post("/api/payment/order").send({ amount: 599 });

    expect(res.status).toBe(500);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/failed to create/i);
  });

  it("rejects verification with partial fields", async () => {
    ensureTestClient();
    const { app } = await loadServer();
    const res = await request(app).post("/api/payment/verify").send({
      razorpay_order_id: "order_abc",
    });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});