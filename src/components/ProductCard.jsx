import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { sizeDimensions } from "../data/products";

const ease = [0.22, 1, 0.36, 1];

export default function ProductCard({ product, index }) {
  const navigate = useNavigate();
  const { handleBuy, setAuthError, cartItems, authUser, wishlistItems, toggleWishlist } = useShop();
  const inCart = cartItems.some((item) => item.productId === product.id);
  const inWishlist = wishlistItems.includes(product.id);
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
      initial={{ y: 80, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.8, delay: (index % 3) * 0.06, ease }}
      className={`flex flex-col relative w-full ${index % 3 === 1 ? "md:mt-24" : ""}`}
    >
      {/* Image container */}
      <div className="relative">
        <Link
          to={`/product/${product.slug || product.id}`}
          className="overflow-hidden bg-[#111] aspect-[3/4] relative group block rounded-sm"
        >
          <img
            src={product.src}
            alt={product.title}
            loading="lazy"
            className="w-full h-full object-cover scale-105 opacity-70 group-hover:opacity-100 group-hover:scale-100 transition-all duration-700 ease-out grayscale group-hover:grayscale-0"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Desktop hover CTA */}
          <div className="absolute inset-0 hidden sm:flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <span className="bg-white/95 text-black px-5 py-2 text-[10px] uppercase tracking-[0.18em] font-bold backdrop-blur-sm">
              View Details
            </span>
          </div>

          {/* In-cart badge */}
          {inCart && (
            <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-emerald-500 text-black text-[7px] sm:text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-sm">
              In Cart
            </span>
          )}
        </Link>

        {/* Wishlist heart — bottom-right of image */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 z-10 p-1 transition-all active:scale-75 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
          <motion.svg
            key={inWishlist ? "filled" : "empty"}
            initial={{ scale: 0.3 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="w-5 h-5 sm:w-[22px] sm:h-[22px]"
            fill={inWishlist ? "white" : "none"}
            stroke={inWishlist ? "white" : "rgba(255,255,255,0.6)"}
            strokeWidth="1.8"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </motion.svg>
        </button>
      </div>

      {/* Info */}
      <div className="mt-3 sm:mt-4 md:mt-6 mb-2 md:mb-10">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-bold text-[10px] sm:text-xs md:text-sm uppercase tracking-[0.06em] sm:tracking-[0.1em] truncate text-white/90">
            {product.title}
          </h3>
          <span className="text-[10px] sm:text-sm md:text-base font-black tracking-tight shrink-0 text-white/70">
            ₹{product.pricing.S}
          </span>
        </div>
        {product.mrp?.S > product.pricing.S && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[8px] sm:text-[10px] text-white/30 line-through">₹{product.mrp.S}</span>
            <span className="text-[7px] sm:text-[9px] font-bold text-emerald-400">{Math.round((1 - product.pricing.S / product.mrp.S) * 100)}% off</span>
          </div>
        )}
        <p className="hidden md:block text-[10px] leading-relaxed text-white/35 mt-2 line-clamp-2">
          {product.shortInfo}
        </p>

        {/* Mobile: tap to view */}
        <div className="flex mt-2.5 sm:hidden gap-1.5">
          <Link
            to={`/product/${product.slug || product.id}`}
            className="flex-1 border border-white/20 text-center text-white py-2 text-[8px] uppercase tracking-[0.1em] font-bold active:bg-white active:text-black transition-colors rounded-sm"
          >
            View
          </Link>
        </div>

        {/* Tablet+: full buttons */}
        <div className="hidden sm:flex items-center gap-2 mt-3 relative">
          <Link
            to={`/product/${product.slug || product.id}`}
            className="border border-white/25 text-white px-4 py-2 text-[10px] md:text-xs uppercase tracking-[0.12em] font-bold hover:bg-white hover:text-black transition-all duration-300 rounded-sm"
          >
            View
          </Link>
          <button
            type="button"
            onClick={onAddClick}
            disabled={inCart}
            className={`border px-4 py-2 text-[10px] md:text-xs uppercase tracking-[0.12em] font-bold transition-all duration-300 rounded-sm ${
              inCart
                ? "border-emerald-400/40 text-emerald-300 cursor-default"
                : "border-white/25 text-white hover:bg-white hover:text-black"
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
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 backdrop-blur-md rounded-sm"
          >
            <motion.div
              ref={pickerRef}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, ease }}
              className="bg-[#0e0e0e] border border-white/10 p-4 sm:p-5 w-[88%] max-w-[280px] rounded-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-white/50 font-bold">
                  Select Size
                </p>
                <button
                  type="button"
                  onClick={() => setShowSizePicker(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-full border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all text-[10px]"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {sizes.map(([size, price], i) => (
                  <motion.button
                    key={size}
                    type="button"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, ease }}
                    onClick={() => onSizeSelect(size)}
                    className="flex items-center justify-between border border-white/10 hover:border-white/30 hover:bg-white/5 px-3.5 py-2.5 sm:py-3 transition-all duration-200 group/size rounded-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                        {size}
                      </span>
                      <span className="text-[8px] sm:text-[10px] text-white/30 tracking-wider">
                        {sizeDimensions[size]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-white/70">₹{price}</span>
                      {product.mrp?.[size] > price && (
                        <span className="text-[8px] sm:text-[9px] text-white/25 line-through">₹{product.mrp[size]}</span>
                      )}
                    </div>
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
