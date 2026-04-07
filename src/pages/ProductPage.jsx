import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MainHeader from "../components/MainHeader";
import { useShop } from "../context/ShopContext";
import { sizeDimensions, WHATSAPP_PHONE } from "../data/products";

export default function ProductPage() {
  const { productKey } = useParams();
  const navigate = useNavigate();
  const { products, getProductById, handleBuy, setAuthError, cartItems } = useShop();
  const [selectedSize, setSelectedSize] = useState("L");

  const product = useMemo(() => {
    return (
      getProductById(productKey) ||
      products.find((item) => item.slug === productKey) ||
      products.find((item) => String(item.dbId) === String(productKey)) ||
      null
    );
  }, [getProductById, productKey, products]);

  const inCart = product ? cartItems.some((item) => item.productId === product.id) : false;

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
    const message = `Hi, I'd like to know more about "${product.title}" (Size ${selectedSize}, ₹${product.pricing[selectedSize]}). Is it available?`;
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
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <MainHeader />

      <div className="pt-20 md:pt-24">
        {/* Hero: Image + Core Info */}
        <div className="grid lg:grid-cols-2 min-h-[calc(100vh-5rem)]">
          {/* Image */}
          <div className="relative bg-[#0a0a0a] flex items-center justify-center p-8 md:p-12 lg:p-16 min-h-[50vh] lg:min-h-0">
            <motion.img
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
              src={product.src}
              alt={product.title}
              className="w-full h-full max-h-[75vh] object-contain select-none"
            />
          </div>

          {/* Product Details */}
          <div className="border-t lg:border-t-0 lg:border-l border-white/10 px-6 py-10 md:px-10 lg:px-14 xl:px-20 flex flex-col justify-center gap-6">
            {/* Back link */}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="self-start text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-white/70 transition-colors flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5m0 0l7 7m-7-7l7-7" /></svg>
              Back
            </button>

            {/* Title & Description */}
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight uppercase leading-[0.95]"
              >
                {product.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="mt-4 text-sm md:text-base text-white/55 leading-relaxed max-w-lg"
              >
                {product.info}
              </motion.p>
            </div>

            {/* Size Selector */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">Select Size</p>
              <div className="flex gap-2">
                {Object.entries(product.pricing).map(([size, price]) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`flex-1 border py-3 px-3 text-center transition-all duration-300 ${
                      selectedSize === size
                        ? "border-white bg-white text-black"
                        : "border-white/15 text-white/70 hover:border-white/30"
                    }`}
                  >
                    <span className="block text-xs font-bold uppercase tracking-[0.15em]">{size}</span>
                    <span className="block text-[10px] mt-0.5 opacity-60">{sizeDimensions[size]}</span>
                    <span className="block text-lg font-black mt-1">₹{price}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Price + Add to Cart */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex items-center gap-4 pt-2"
            >
              <button
                type="button"
                onClick={onBuy}
                disabled={inCart}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
                  inCart
                    ? "bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 cursor-default"
                    : "bg-white text-black hover:bg-white/90"
                }`}
              >
                {inCart ? "In Cart" : "Add to Cart"}
              </button>
              {inCart && (
                <button
                  type="button"
                  onClick={() => navigate("/cart")}
                  className="flex-1 border border-white/20 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-white/10 transition-all duration-300"
                >
                  View Cart
                </button>
              )}
            </motion.div>

            <p className="text-[10px] text-white/30 uppercase tracking-[0.15em]">Max 10 per artwork</p>
          </div>
        </div>

        {/* Reviews Section */}
        {product.reviews?.length > 0 && (
          <div className="border-t border-white/10 px-6 md:px-10 lg:px-20 py-16 md:py-24 bg-[#050505]">
            <h2 className="text-xs uppercase tracking-[0.3em] text-white/40 mb-8">Reviews</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {product.reviews.map((review, index) => (
                <motion.div
                  key={`${review.name}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className="border border-white/10 p-5 bg-white/[0.02]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold">{review.name}</p>
                    <p className="text-xs text-amber-400 tracking-wider">{"★".repeat(review.rating)}<span className="text-white/15">{"★".repeat(5 - review.rating)}</span></p>
                  </div>
                  <p className="text-sm text-white/50 leading-relaxed">{review.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating WhatsApp Button */}
      <a
        href={getWhatsAppLink()}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 group flex items-center gap-3"
      >
        <span className="hidden sm:block bg-black/80 backdrop-blur border border-white/10 text-white/70 text-[10px] uppercase tracking-[0.2em] px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
          Ask about this piece
        </span>
        <span className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg shadow-[#25D366]/20 group-hover:scale-110 transition-transform duration-300">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </span>
      </a>
    </div>
  );
}
