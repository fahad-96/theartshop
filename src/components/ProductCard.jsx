import React from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";

export default function ProductCard({ product, index }) {
  const navigate = useNavigate();
  const { handleBuy, setAuthError } = useShop();

  const onBuy = () => {
    const result = handleBuy(product, "L");
    if (result.requiresAuth) {
      navigate("/login");
      return;
    }

    if (result.added) {
      setAuthError("");
      navigate("/cart");
    }
  };

  return (
    <motion.div
      initial={{ y: 150, opacity: 0, scale: 0.95 }}
      whileInView={{ y: 0, opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 1.2, delay: (index % 3) * 0.1, ease: [0.76, 0, 0.24, 1] }}
      className={`flex flex-col relative w-full ${index % 3 === 1 ? "md:mt-32" : ""}`}
    >
      <div className="overflow-hidden bg-[#1f1f1f] aspect-[2/3] md:aspect-[3/4] relative mask-container group">
        <motion.img
          src={product.src}
          alt={product.title}
          className="w-full h-full object-cover scale-[1.15] opacity-60 group-hover:opacity-100 group-hover:scale-100 transition-all duration-[1s] ease-[cubic-bezier(0.76,0,0.24,1)] grayscale group-hover:grayscale-0"
        />
        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-[1s] pointer-events-none" />
      </div>
      <div className="flex flex-col gap-2 mt-3 md:mt-8 group mb-4 md:mb-12">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-bold tracking-[0.08em] md:tracking-[0.2em] text-[9px] sm:text-[10px] md:text-xs uppercase truncate max-w-[68%]">
            {product.title}
          </h3>
          <div className="text-right flex flex-col items-end gap-0.5 shrink-0">
            <span className="text-[8px] md:text-[9px] text-white/35 uppercase tracking-[0.14em] md:tracking-[0.2em]">
              From
            </span>
            <span className="text-sm md:text-xl font-black tracking-tight">₹{product.pricing.S}</span>
          </div>
        </div>
        <p className="hidden sm:block text-[9px] md:text-[10px] leading-tight text-white/45 max-h-8 overflow-hidden">
          {product.shortInfo}
        </p>
        <div className="flex items-center justify-between gap-2">
          <Link
            to={`/product/${product.id}`}
            className="border border-white/50 text-white px-2.5 md:px-4 py-1 text-[9px] md:text-xs uppercase tracking-[0.1em] md:tracking-widest font-bold hover:bg-white hover:text-black transition-colors"
          >
            View
          </Link>
          <button
            type="button"
            onClick={onBuy}
            className="border border-white/50 text-white px-2.5 md:px-4 py-1 text-[9px] md:text-xs uppercase tracking-[0.1em] md:tracking-widest font-bold hover:bg-white hover:text-black transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </motion.div>
  );
}
