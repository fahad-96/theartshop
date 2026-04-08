import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MainHeader from "../components/MainHeader";
import { useShop } from "../context/ShopContext";

const ease = [0.22, 1, 0.36, 1];

export default function WishlistPage() {
  const navigate = useNavigate();
  const { products, wishlistItems, removeFromWishlist, addToCart } = useShop();
  const [feedbackId, setFeedbackId] = useState(null);

  const wishlistProducts = useMemo(() => {
    return products.filter((p) => wishlistItems?.includes(p.id));
  }, [products, wishlistItems]);

  const handleAddToCart = (product) => {
    const result = addToCart(product, "L");
    if (result.ok) {
      setFeedbackId(product.id);
      setTimeout(() => setFeedbackId(null), 1500);
    }
  };

  if (!wishlistProducts || wishlistProducts.length === 0) {
    return (
      <div className="min-h-[100svh] bg-[#060606] text-white">
        <MainHeader />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-16">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tight mb-6">Your Wishlist</h1>
          <div className="border border-white/10 bg-white/[0.02] p-8 sm:p-12 text-center rounded-sm">
            <p className="text-white/50 text-sm sm:text-lg mb-5 sm:mb-6">Your wishlist is empty</p>
            <button
              onClick={() => navigate("/")}
              className="bg-white text-black px-6 py-3 uppercase tracking-[0.2em] font-bold text-xs sm:text-sm hover:bg-white/90 active:scale-[0.98] transition-all rounded-sm"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-[#060606] text-white">
      <MainHeader />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-16">
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tight mb-1 sm:mb-2">Your Wishlist</h1>
        <p className="text-white/50 text-xs sm:text-sm mb-6 sm:mb-8">
          {wishlistProducts.length} item{wishlistProducts.length !== 1 ? "s" : ""} saved
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {wishlistProducts.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.5, ease }}
              className="border border-white/10 bg-white/[0.02] overflow-hidden rounded-sm"
            >
              <div
                className="aspect-square overflow-hidden bg-[#111] cursor-pointer group"
                onClick={() => navigate(`/product/${product.slug || product.id}`)}
              >
                <img
                  src={product.src}
                  alt={product.title}
                  loading="lazy"
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="p-3 sm:p-4">
                <h3 className="font-bold text-xs sm:text-sm md:text-base uppercase tracking-wide truncate">{product.title}</h3>
                <p className="text-white/40 text-[10px] sm:text-xs mt-0.5 sm:mt-1 line-clamp-1 hidden sm:block">{product.shortInfo}</p>

                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3 text-[9px] sm:text-xs text-white/50">
                  <span className="border border-white/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-sm">
                    S: ₹{product.pricing?.S}
                    {product.mrp?.S > product.pricing?.S && <span className="text-white/25 line-through ml-1">₹{product.mrp.S}</span>}
                  </span>
                  <span className="border border-white/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-sm">
                    L: ₹{product.pricing?.L}
                    {product.mrp?.L > product.pricing?.L && <span className="text-white/25 line-through ml-1">₹{product.mrp.L}</span>}
                  </span>
                  <span className="border border-white/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-sm hidden sm:inline">
                    XL: ₹{product.pricing?.XL}
                    {product.mrp?.XL > product.pricing?.XL && <span className="text-white/25 line-through ml-1">₹{product.mrp.XL}</span>}
                  </span>
                </div>

                <div className="flex gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="flex-1 border border-white/30 px-2 sm:px-3 py-2 sm:py-2.5 text-[9px] sm:text-xs uppercase tracking-wider sm:tracking-widest font-bold hover:bg-white hover:text-black active:scale-[0.97] transition-all rounded-sm"
                  >
                    {feedbackId === product.id ? "Added ✓" : "Add to Cart"}
                  </button>
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    className="border border-rose-300/30 px-2 sm:px-3 py-2 sm:py-2.5 text-[9px] sm:text-xs uppercase tracking-wider text-rose-200/80 hover:bg-rose-500/10 active:bg-rose-500/20 transition-colors rounded-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
