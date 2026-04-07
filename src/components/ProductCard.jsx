import React from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";

export default function ProductCard({ product, index }) {
  const navigate = useNavigate();
  const { handleBuy, setAuthError, cartItems } = useShop();
  const inCart = cartItems.some((item) => item.productId === product.id);

  const onBuy = () => {
    const result = handleBuy(product, "L");
    if (result.requiresAuth) {
      navigate("/login");
      return;
    }
    if (result.added) {
      setAuthError("");
    }
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 1, delay: (index % 3) * 0.08, ease: [0.76, 0, 0.24, 1] }}
      className={`flex flex-col relative w-full ${index % 3 === 1 ? "md:mt-32" : ""}`}
    >
      {/* Image with overlay on tap/hover */}
      <Link
        to={`/product/${product.slug || product.id}`}
        className="overflow-hidden bg-[#1a1a1a] aspect-[3/4] relative group block"
      >
        <img
          src={product.src}
          alt={product.title}
          className="w-full h-full object-cover scale-[1.1] opacity-60 group-hover:opacity-100 group-hover:scale-100 transition-all duration-[1s] ease-[cubic-bezier(0.76,0,0.24,1)] grayscale group-hover:grayscale-0"
        />
        {/* Hover overlay with View button — desktop only */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 hidden sm:flex items-center justify-center">
          <span className="border border-white/60 text-white px-5 py-2 text-[10px] uppercase tracking-[0.2em] font-bold">
            View
          </span>
        </div>
        {/* In-cart badge */}
        {inCart && (
          <span className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 bg-emerald-500 text-black text-[7px] sm:text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 sm:px-2 sm:py-1">
            In Cart
          </span>
        )}
      </Link>

      {/* Info — compact on mobile, spacious on desktop */}
      <div className="mt-2 md:mt-6 mb-3 md:mb-12">
        <div className="flex justify-between items-start gap-1">
          <h3 className="font-bold text-[8px] sm:text-[10px] md:text-xs uppercase tracking-[0.05em] sm:tracking-[0.12em] md:tracking-[0.2em] truncate">
            {product.title}
          </h3>
          <span className="text-[9px] sm:text-sm md:text-lg font-black tracking-tight shrink-0">
            ₹{product.pricing.S}
          </span>
        </div>
        <p className="hidden md:block text-[10px] leading-tight text-white/40 mt-2 line-clamp-2">
          {product.shortInfo}
        </p>

        {/* Mobile: single tap-to-view row */}
        <div className="flex gap-1 mt-1.5 sm:hidden">
          <Link
            to={`/product/${product.slug || product.id}`}
            className="flex-1 border border-white/30 text-center text-white py-1 text-[7px] uppercase tracking-[0.08em] font-bold"
          >
            View
          </Link>
          <button
            type="button"
            onClick={onBuy}
            disabled={inCart}
            className={`flex-1 border text-center py-1 text-[7px] uppercase tracking-[0.08em] font-bold ${
              inCart
                ? "border-emerald-400/40 text-emerald-400 cursor-default"
                : "border-white/30 text-white active:bg-white active:text-black"
            }`}
          >
            {inCart ? "Added" : "Add"}
          </button>
        </div>

        {/* Tablet+: full buttons */}
        <div className="hidden sm:flex items-center gap-2 mt-3">
          <Link
            to={`/product/${product.slug || product.id}`}
            className="border border-white/40 text-white px-4 py-1.5 text-[10px] md:text-xs uppercase tracking-[0.15em] font-bold hover:bg-white hover:text-black transition-colors"
          >
            View
          </Link>
          <button
            type="button"
            onClick={onBuy}
            disabled={inCart}
            className={`border px-4 py-1.5 text-[10px] md:text-xs uppercase tracking-[0.15em] font-bold transition-colors ${
              inCart
                ? "border-emerald-400/50 text-emerald-300 cursor-default"
                : "border-white/40 text-white hover:bg-white hover:text-black"
            }`}
          >
            {inCart ? "In Cart" : "Add to Cart"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
