import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { sizeDimensions } from "../data/products";

export default function ProductCard({ product, index }) {
  const navigate = useNavigate();
  const { handleBuy, setAuthError, cartItems, authUser } = useShop();
  const inCart = cartItems.some((item) => item.productId === product.id);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowSizePicker(false);
      }
    };
    if (showSizePicker) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSizePicker]);

  const onAddClick = () => {
    if (!authUser) {
      const result = handleBuy(product, "L");
      if (result.requiresAuth) navigate("/login");
      return;
    }
    if (inCart) return;
    setShowSizePicker(true);
  };

  const onSizeSelect = (size) => {
    setShowSizePicker(false);
    const result = handleBuy(product, size);
    if (result.requiresAuth) {
      navigate("/login");
      return;
    }
    if (result.added) {
      setAuthError("");
    }
  };

  const sizes = Object.entries(product.pricing);

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

        {/* Mobile: view only — size selection on product page */}
        <div className="flex mt-1.5 sm:hidden">
          <Link
            to={`/product/${product.slug || product.id}`}
            className="flex-1 border border-white/30 text-center text-white py-1 text-[7px] uppercase tracking-[0.08em] font-bold active:bg-white active:text-black"
          >
            View
          </Link>
        </div>

        {/* Tablet+: full buttons */}
        <div className="hidden sm:flex items-center gap-2 mt-3 relative">
          <Link
            to={`/product/${product.slug || product.id}`}
            className="border border-white/40 text-white px-4 py-1.5 text-[10px] md:text-xs uppercase tracking-[0.15em] font-bold hover:bg-white hover:text-black transition-colors"
          >
            View
          </Link>
          <button
            type="button"
            onClick={onAddClick}
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

      {/* Size picker overlay */}
      <AnimatePresence>
        {showSizePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              ref={pickerRef}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="bg-[#111] border border-white/15 p-3 sm:p-5 w-[85%] max-w-[260px]"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[8px] sm:text-[10px] uppercase tracking-[0.25em] text-white/50 font-bold">
                  Pick Size
                </p>
                <button
                  type="button"
                  onClick={() => setShowSizePicker(false)}
                  className="text-white/40 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {sizes.map(([size, price], i) => (
                  <motion.button
                    key={size}
                    type="button"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => onSizeSelect(size)}
                    className="flex items-center justify-between border border-white/10 hover:border-white/40 hover:bg-white/5 px-3 py-2 sm:py-2.5 transition-all duration-200 group/size"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-white group-hover/size:text-white">
                        {size}
                      </span>
                      <span className="text-[8px] sm:text-[10px] text-white/30 tracking-wider">
                        {sizeDimensions[size]}
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-sm font-bold text-white/80">₹{price}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
