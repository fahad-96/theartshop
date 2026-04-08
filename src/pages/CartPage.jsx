import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MainHeader from "../components/MainHeader";
import { useShop } from "../context/ShopContext";
import { sizeDimensions } from "../data/products";

export default function CartPage() {
  const navigate = useNavigate();

  const {
    authUser,
    authReady,
    cartItems,
    cartMessage,
    setCartMessage,
    cartSubtotal,
    getProductById,
    updateCartQty,
    removeCartItem,
    wishlistItems,
    products,
  } = useShop();

  const wishlistProducts = products.filter((p) => wishlistItems.includes(p.id));

  useEffect(() => {
    if (authReady && !authUser) {
      navigate("/login", { replace: true });
    }
  }, [authReady, authUser, navigate]);

  if (!authReady) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <MainHeader />
      <div className="pt-20 sm:pt-24 pb-16 sm:pb-20 px-4 sm:px-6 md:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8 sm:mb-10">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tight">Your Cart</h1>
              {cartItems.length > 0 && (
                <p className="text-[10px] sm:text-xs text-white/40 mt-1.5 sm:mt-2 uppercase tracking-[0.2em]">
                  {cartItems.reduce((s, i) => s + i.qty, 0)} {cartItems.reduce((s, i) => s + i.qty, 0) === 1 ? "item" : "items"}
                </p>
              )}
            </div>
            <button type="button" onClick={() => navigate("/")} className="self-start sm:self-auto text-[10px] sm:text-xs uppercase tracking-[0.2em] text-white/40 hover:text-white/70 transition-colors">
              Continue Shopping
            </button>
          </div>

          {cartMessage && (
            <div className="mb-6 border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80">{cartMessage}</div>
          )}

          {!cartItems.length ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-white/10 p-8 sm:p-12 text-center rounded-sm">
              <p className="text-white/40 text-xs sm:text-sm uppercase tracking-[0.2em]">Your cart is empty</p>
              <button type="button" onClick={() => navigate("/")} className="mt-5 sm:mt-6 bg-white text-black px-6 py-3 text-[10px] sm:text-xs uppercase tracking-[0.18em] font-bold hover:bg-white/90 active:scale-[0.98] transition-all rounded-sm">
                Browse Art
              </button>
            </motion.div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="border border-white/10 divide-y divide-white/10 mb-6 sm:mb-8 rounded-sm">
                {cartItems.map((item, i) => {
                  const product = getProductById(item.productId);
                  if (!product) return null;
                  const lineTotal = product.pricing[item.size] * item.qty;
                  return (
                    <motion.div
                      key={`${item.productId}-${item.size}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="flex gap-3 sm:gap-4 p-3 sm:p-4 md:p-5"
                    >
                      <img src={product.src} alt={product.title} className="w-16 h-20 sm:w-20 sm:h-24 md:w-24 md:h-28 object-cover shrink-0 rounded-sm" />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-xs sm:text-sm md:text-base uppercase tracking-wide truncate">{product.title}</h3>
                          <p className="text-[10px] sm:text-xs text-white/50 mt-0.5 sm:mt-1">Size {item.size} · {sizeDimensions[item.size]}</p>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] sm:text-xs text-white/50">₹{product.pricing[item.size]} each</p>
                            {product.mrp?.[item.size] > product.pricing[item.size] && (
                              <p className="text-[8px] sm:text-[10px] text-white/25 line-through">₹{product.mrp[item.size]}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 sm:mt-3">
                          <div className="flex items-center">
                            <button type="button" onClick={() => updateCartQty(item.productId, item.size, item.qty - 1)} className="w-8 h-8 sm:w-9 sm:h-9 border border-white/20 text-sm hover:bg-white/10 active:bg-white/20 transition-colors rounded-l-sm">−</button>
                            <span className="w-9 h-8 sm:w-10 sm:h-9 border-y border-white/20 flex items-center justify-center text-xs sm:text-sm">{item.qty}</span>
                            <button type="button" onClick={() => updateCartQty(item.productId, item.size, item.qty + 1)} className="w-8 h-8 sm:w-9 sm:h-9 border border-white/20 text-sm hover:bg-white/10 active:bg-white/20 transition-colors rounded-r-sm">+</button>
                          </div>
                          <button type="button" onClick={() => removeCartItem(item.productId, item.size)} className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-white/40 hover:text-rose-400 active:text-rose-300 transition-colors py-1 px-1">
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col justify-between">
                        <p className="text-base sm:text-lg md:text-xl font-black">₹{lineTotal}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Subtotal + Checkout */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/10 p-4 sm:p-5 rounded-sm">
                <div className="w-full sm:w-auto text-center sm:text-left">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">Subtotal</p>
                  <p className="text-2xl sm:text-3xl font-black mt-1">₹{cartSubtotal}</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => navigate("/wishlist")}
                    className="flex-1 sm:flex-none border border-white/15 text-white/70 px-5 sm:px-6 py-3.5 sm:py-4 text-[10px] sm:text-xs uppercase tracking-[0.18em] font-bold hover:bg-white/5 active:scale-[0.98] transition-all rounded-sm flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                    Wishlist{wishlistProducts.length > 0 ? ` (${wishlistProducts.length})` : ""}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/checkout")}
                    className="flex-1 sm:flex-none bg-white text-black px-8 sm:px-10 py-3.5 sm:py-4 text-[10px] sm:text-xs uppercase tracking-[0.18em] sm:tracking-[0.2em] font-bold hover:bg-white/90 active:scale-[0.98] transition-all rounded-sm"
                  >
                    Checkout
                  </button>
                </div>
              </div>

              {/* Wishlist preview */}
              {wishlistProducts.length > 0 && (
                <div className="mt-6 sm:mt-8 border border-white/10 rounded-sm p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1.8" className="w-4 h-4"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                      <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-white/50 font-bold">From Your Wishlist</p>
                    </div>
                    <button type="button" onClick={() => navigate("/wishlist")} className="text-[10px] uppercase tracking-[0.18em] text-white/40 hover:text-white/70 transition-colors">Order from Wishlist →</button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
                    {wishlistProducts.slice(0, 5).map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => navigate(`/product/${product.slug || product.id}`)}
                        className="group text-left"
                      >
                        <div className="aspect-[3/4] overflow-hidden rounded-sm bg-[#111]">
                          <img src={product.src} alt={product.title} loading="lazy" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                        </div>
                        <p className="mt-1.5 text-[8px] sm:text-[10px] uppercase tracking-wide text-white/60 group-hover:text-white/90 truncate transition-colors font-bold">{product.title}</p>
                        <p className="text-[8px] sm:text-[10px] text-white/40">₹{product.pricing.S}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
