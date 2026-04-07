const BASE_URL = import.meta.env.BASE_URL;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const filenames = [
  "CR7.jpeg", "SpiderGlobe.jpeg", "Spidy.jpeg", "Messi.jpeg", "THINK.jpeg",
  "art.jpeg", "BAT.jpeg", "Bike.jpeg", "birds.jpeg", "bow Tie.jpeg", "butter Fly.jpeg",
  "cat emo.jpeg", "cat Window.jpeg", "cats.jpeg", "deer head 2.jpeg", "deer head 3.jpeg",
  "Deer head.jpeg", "deer skull.jpeg", "dragon.jpeg", "eagle.jpeg", "frame.jpeg",
  "Heart with Hands.jpeg", "heartHuman.jpeg", "Lion.jpeg", "load balance.jpeg",
  "lofi 2.jpeg", "lofi.jpeg", "Moon.jpeg", "mountain.jpeg", "mountains.jpeg",
  "rose.jpeg", "S letter Snake.jpeg", "sipderMan.jpeg", "standing Cat.jpeg",
  "windowBrids.jpeg", "wolf head.jpeg",
];

const productCopy = {
  CR7: {
    info: "A high-energy portrait piece built for bold interiors and football fans who like strong contrast.",
    short: "Bold sports-inspired wall art with a sharp modern finish.",
  },
  SpiderGlobe: {
    info: "A globe-like spider motif with layered lines that gives the piece a futuristic motion feel.",
    short: "A sharp, web-like piece with a clean futuristic look.",
  },
  Spidy: {
    info: "A dynamic spider-inspired cut art with movement, edge, and a darker street-art vibe.",
    short: "Compact and dramatic with an urban character.",
  },
  Messi: {
    info: "A minimal icon-style portrait piece that feels clean, premium, and instantly recognizable.",
    short: "Minimal and iconic for a clean premium wall.",
  },
  THINK: {
    info: "A thoughtful statement piece that brings calm structure and a modern editorial feel.",
    short: "Simple, thoughtful, and designed to stand out softly.",
  },
};

export const sizeDimensions = {
  S: "3feet / 3feet",
  L: "4feet / 3feet",
  XL: "5feet / 5feet",
};

const fakeReviews = [
  {
    name: "Aarav",
    text: "The detailing is insanely clean. Looks even better than the photos.",
    rating: 5,
  },
  {
    name: "Zoya",
    text: "Premium finish and perfect packaging. Added a bold vibe to my living room.",
    rating: 5,
  },
  {
    name: "Kabir",
    text: "Fast delivery, easy support, and the frame quality feels solid.",
    rating: 4,
  },
  {
    name: "Inaya",
    text: "Loved the size options. The XL really transforms the wall.",
    rating: 5,
  },
  {
    name: "Rehan",
    text: "Very unique artwork style. Ordering process was smooth.",
    rating: 4,
  },
];

const getDefaultProductInfo = (title) => {
  if (title.toLowerCase().includes("deer")) {
    return "A refined deer silhouette piece with a premium handcrafted look for warm, natural spaces.";
  }

  return "A handcrafted wall art piece designed to add depth, edge, and personality to your space.";
};

const getPricing = (title) => {
  const isDeer = title.toLowerCase().includes("deer");
  return isDeer
    ? { S: 999, L: 1499, XL: 1999 }
    : { S: 599, L: 999, XL: 1499 };
};

export const slugifyProductTitle = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const products = filenames.map((filename, i) => {
  const title = filename.replace(".jpeg", "").toUpperCase();
  return {
    id: String(i),
    title,
    slug: slugifyProductTitle(title),
    src: `${BASE_URL}image/${encodeURIComponent(filename)}`,
    pricing: getPricing(title),
    info: productCopy[title]?.info || getDefaultProductInfo(title),
    shortInfo: productCopy[title]?.short || getDefaultProductInfo(title),
    category: title.toLowerCase().includes("deer") ? "Deer" : "Art",
    reviews: fakeReviews.slice(i % 2, i % 2 + 3),
  };
});

export const HERO_VIDEO_SRC = `${BASE_URL}videos/hero.mp4`;
export const HERO_VIDEO_MOBILE_SRC = `${BASE_URL}videos/hero-mobile.mp4`;
export const SECTION_CONNECTOR_VIDEO_SRC = `${BASE_URL}videos/section-connector.mp4`;
export const LOGO_SRC = `${BASE_URL}logo.svg`;
export const INSTAGRAM_URL = "https://www.instagram.com/theartshop.in";
export const WHATSAPP_PHONE = "+916006448855";

export const resolveProductImageSrc = (imagePath) => {
  if (!imagePath) return `${BASE_URL}image/art.jpeg`;
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://") || imagePath.startsWith("/")) {
    return imagePath;
  }

  // If path looks like a storage object key, build a public storage URL.
  if ((imagePath.includes("/") || imagePath.includes(".")) && SUPABASE_URL) {
    const normalized = imagePath.replace(/^\/+/, "");
    return `${SUPABASE_URL}/storage/v1/object/public/product-images/${normalized}`;
  }

  return `${BASE_URL}image/${encodeURIComponent(imagePath)}`;
};

export const normalizeProductPricing = (pricing, title = "") => {
  if (pricing && typeof pricing === "object" && !Array.isArray(pricing)) {
    const sPrice = Number(pricing.S ?? pricing.s ?? pricing.price_s ?? 599);
    const lPrice = Number(pricing.L ?? pricing.l ?? pricing.price_l ?? (title.toLowerCase().includes("deer") ? 1499 : 999));
    const xlPrice = Number(pricing.XL ?? pricing.xl ?? pricing.price_xl ?? (title.toLowerCase().includes("deer") ? 1999 : 1499));

    return { S: sPrice, L: lPrice, XL: xlPrice };
  }

  return getPricing(title);
};

export const mapProductRowToProduct = (row) => {
  const title = row?.title || "Untitled";
  const slug = row?.slug || slugifyProductTitle(title);
  const gallery = Array.isArray(row?.image_gallery) ? row.image_gallery : [];
  const primaryImage = row?.image_url || gallery[0] || row?.image_path || row?.image_src || "";

  return {
    id: row?.id ? String(row.id) : `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title,
    slug,
    imagePath: row?.image_path || row?.image_src || "",
    image_url: row?.image_url || "",
    imageGallery: gallery,
    src: resolveProductImageSrc(primaryImage),
    pricing: normalizeProductPricing(row?.pricing, title),
    info: row?.info || getDefaultProductInfo(title),
    shortInfo: row?.short_info || row?.shortInfo || getDefaultProductInfo(title),
    category: row?.category || (title.toLowerCase().includes("deer") ? "Deer" : "Art"),
    reviews: Array.isArray(row?.reviews) && row.reviews.length
      ? row.reviews
      : fakeReviews.slice(0, 3),
    average_rating: Number(row?.average_rating ?? 0),
    total_reviews: Number(row?.total_reviews ?? 0),
    isActive: row?.is_active ?? true,
    publishStatus: row?.publish_status || "published",
    sortOrder: Number(row?.sort_order ?? 0),
    createdAt: row?.created_at || null,
    updatedAt: row?.updated_at || null,
    dbId: row?.id || null,
  };
};

export const buildProductPayload = (product) => ({
  title: product.title?.trim(),
  slug: slugifyProductTitle(product.slug || product.title || ""),
  image_path: product.imagePath?.trim() || product.src?.trim() || "art.jpeg",
  image_url: product.image_url?.trim() || "",
  image_gallery: Array.isArray(product.imageGallery) ? product.imageGallery : [],
  category: product.category?.trim() || "Art",
  info: product.info?.trim() || "",
  short_info: product.shortInfo?.trim() || product.info?.trim() || "",
  pricing: normalizeProductPricing(product.pricing, product.title),
  sort_order: Number(product.sortOrder ?? 0),
  is_active: product.isActive ?? true,
  publish_status: product.publishStatus || "published",
});
