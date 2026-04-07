import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import MainHeader from "../components/MainHeader";
import { useShop } from "../context/ShopContext";
import { sizeDimensions, WHATSAPP_PHONE } from "../data/products";

export default function ProductPage() {
  const { productKey } = useParams();
  const navigate = useNavigate();
  const { products, getProductById, handleBuy, setAuthError } = useShop();
  const [selectedSize, setSelectedSize] = useState("L");
  const [addedMessage, setAddedMessage] = useState("");

  const product = useMemo(() => {
    return (
      getProductById(productKey) ||
      products.find((item) => item.slug === productKey) ||
      products.find((item) => String(item.dbId) === String(productKey)) ||
      null
    );
  }, [getProductById, productKey, products]);

  if (!product) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-xl font-bold uppercase">Product not found</p>
          <Link to="/" className="mt-4 inline-block underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const getWhatsAppLink = () => {
    const message = `I'm interested in ${product.title} in size ${selectedSize}. Please share availability and delivery details.`;
    return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
  };

  const onBuy = () => {
    const result = handleBuy(product, selectedSize);
    if (result.requiresAuth) {
      navigate("/login");
      return;
    }

    if (result.added) {
      setAuthError("");
      setAddedMessage("Added");
      setTimeout(() => setAddedMessage(""), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <MainHeader />
      <div className="pt-24">
        <div className="min-h-screen grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative min-h-[52vh] lg:min-h-screen flex items-center justify-center p-6 md:p-10 bg-black">
            <img src={product.src} alt={product.title} className="w-full h-full max-h-[82vh] object-contain select-none" />
          </div>

          <div className="relative border-t lg:border-t-0 lg:border-l border-white/10 px-6 py-10 md:px-10 lg:px-14 lg:py-16 flex flex-col justify-center gap-8 bg-[#070707]">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/45">View Product Page</p>
              <h3 className="mt-3 text-4xl md:text-6xl font-black tracking-tighter uppercase">{product.title}</h3>
              <p className="mt-5 max-w-xl text-white/70 leading-relaxed">{product.info}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">Choose Size</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(product.pricing).map(([size, price]) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-2xl border px-4 py-4 text-left transition-colors ${selectedSize === size ? "border-white bg-white text-black" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}`}
                  >
                    <span className="block text-xs uppercase tracking-[0.25em] opacity-70">{size}</span>
                    <span className="block text-[11px] mt-1 opacity-70">{sizeDimensions[size]}</span>
                    <span className="mt-2 block text-2xl font-black">₹{price}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Selected Size</p>
                  <p className="mt-2 text-3xl font-black uppercase tracking-tight">{selectedSize}</p>
                  <p className="text-sm text-white/55 mt-1">{sizeDimensions[selectedSize]}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Price</p>
                  <p className="mt-2 text-4xl font-black tracking-tight">₹{product.pricing[selectedSize]}</p>
                </div>
              </div>
              <p className="mt-5 text-sm text-white/60 leading-relaxed">{product.shortInfo}</p>
              <p className="mt-4 text-xs text-white/45 uppercase tracking-[0.2em]">Per Art Limit: 10</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-white/45 mb-4">Reviews</p>
              <div className="space-y-4">
                {product.reviews.map((review, index) => (
                  <div key={`${review.name}-${index}`} className="border border-white/10 p-3 rounded-xl bg-black/25">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-sm">{review.name}</p>
                      <p className="text-xs text-amber-300">{"★".repeat(review.rating)}</p>
                    </div>
                    <p className="text-sm text-white/70 mt-2 leading-relaxed">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onBuy}
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black hover:bg-white/90 transition-colors"
              >
                Add to Cart
              </button>
              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white hover:bg-white/10 transition-colors"
              >
                WhatsApp
              </a>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white hover:bg-white/10 transition-colors"
              >
                Back
              </button>
            </div>
            {addedMessage && <p className="text-sm text-emerald-300">{addedMessage}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
