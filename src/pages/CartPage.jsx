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
  } = useShop();

  useEffect(() => {
    if (authReady && !authUser) {
      navigate("/login", { replace: true });
    }
  }, [authReady, authUser, navigate]);

  if (!authReady) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <MainHeader />
      <div className="pt-24 pb-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">Your Cart</h1>
              {cartItems.length > 0 && (
                <p className="text-xs text-white/40 mt-2 uppercase tracking-[0.2em]">
                  {cartItems.reduce((s, i) => s + i.qty, 0)} {cartItems.reduce((s, i) => s + i.qty, 0) === 1 ? "item" : "items"}
                </p>
              )}
            </div>
            <button type="button" onClick={() => navigate("/")} className="text-xs uppercase tracking-[0.2em] text-white/40 hover:text-white/70 transition-colors">
              Continue Shopping
            </button>
          </div>

          {cartMessage && (
            <div className="mb-6 border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80">{cartMessage}</div>
          )}

          {!cartItems.length ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-white/10 p-12 text-center">
              <p className="text-white/40 text-sm uppercase tracking-[0.2em]">Your cart is empty</p>
              <button type="button" onClick={() => navigate("/")} className="mt-6 bg-white text-black px-6 py-2.5 text-xs uppercase tracking-[0.18em] font-bold hover:bg-white/90">
                Browse Art
              </button>
            </motion.div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="border border-white/10 divide-y divide-white/10 mb-8">
                {cartItems.map((item, i) => {
                  const product = getProductById(item.productId);
                  if (!product) return null;
                  const lineTotal = product.pricing[item.size] * item.qty;
                  return (
                    <motion.div
                      key={`${item.productId}-${item.size}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      className="flex gap-4 p-4 md:p-5"
                    >
                      <img src={product.src} alt={product.title} className="w-20 h-24 md:w-24 md:h-28 object-cover shrink-0" />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-sm md:text-base uppercase tracking-wide truncate">{product.title}</h3>
                          <p className="text-xs text-white/50 mt-1">Size {item.size} · {sizeDimensions[item.size]}</p>
                          <p className="text-xs text-white/50">₹{product.pricing[item.size]} each</p>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-0">
                            <button type="button" onClick={() => updateCartQty(item.productId, item.size, item.qty - 1)} className="w-8 h-8 border border-white/20 text-sm hover:bg-white/10 transition-colors">−</button>
                            <span className="w-10 h-8 border-y border-white/20 flex items-center justify-center text-sm">{item.qty}</span>
                            <button type="button" onClick={() => updateCartQty(item.productId, item.size, item.qty + 1)} className="w-8 h-8 border border-white/20 text-sm hover:bg-white/10 transition-colors">+</button>
                          </div>
                          <button type="button" onClick={() => removeCartItem(item.productId, item.size)} className="text-[10px] uppercase tracking-[0.15em] text-white/40 hover:text-rose-400 transition-colors">
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col justify-between">
                        <p className="text-lg md:text-xl font-black">₹{lineTotal}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Subtotal + Checkout */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/10 p-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">Subtotal</p>
                  <p className="text-3xl font-black mt-1">₹{cartSubtotal}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/checkout")}
                  className="w-full sm:w-auto bg-white text-black px-10 py-3.5 text-xs uppercase tracking-[0.2em] font-bold hover:bg-white/90 transition-colors"
                >
                  Proceed to Checkout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
