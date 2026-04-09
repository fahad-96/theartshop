import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MainHeader from "../components/MainHeader";
import { useShop } from "../context/ShopContext";
import { sizeDimensions, WHATSAPP_PHONE } from "../data/products";
import { saveProductReview } from "../lib/adminApi";
import { supabase } from "../lib/supabaseClient";

const ease = [0.22, 1, 0.36, 1];

export default function ProductPage() {
  const { productKey } = useParams();
  const navigate = useNavigate();
  const { products, getProductById, handleBuy, setAuthError, cartItems, wishlistItems, toggleWishlist, orders, authUser } = useShop();
  const [selectedSize, setSelectedSize] = useState("L");

  const product = useMemo(() => {
    return (
      getProductById(productKey) ||
      products.find((item) => item.slug === productKey) ||
      products.find((item) => String(item.dbId) === String(productKey)) ||
      null
    );
  }, [getProductById, productKey, products]);

  // Check if the current user has a delivered order containing this product
  const hasDeliveredOrder = useMemo(() => {
    if (!authUser || !product || !orders.length) return false;
    return orders.some(
      (o) =>
        String(o.status).toLowerCase() === "delivered" &&
        Array.isArray(o.items) &&
        o.items.some((it) => String(it.title).toLowerCase() === String(product.title).toLowerCase())
    );
  }, [authUser, product, orders]);

  // Review form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState("");
  const [existingReview, setExistingReview] = useState(null);

  // Fetch existing review for this user+product
  useEffect(() => {
    if (!authUser || !product?.dbId) return;
    supabase
      .from("customer_reviews")
      .select("*")
      .eq("product_id", product.dbId)
      .eq("user_id", authUser.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExistingReview(data);
          setReviewRating(data.rating);
          setReviewTitle(data.title || "");
          setReviewText(data.review_text || "");
        }
      });
  }, [authUser, product?.dbId]);

  const onSubmitReview = async () => {
    if (!product?.dbId) return;
    setReviewSubmitting(true);
    setReviewMsg("");
    try {
      await saveProductReview(supabase, product.dbId, {
        rating: reviewRating,
        title: reviewTitle.trim(),
        review_text: reviewText.trim(),
        verified_purchase: true,
      });
      setReviewMsg("Thank you for your review!");
      setExistingReview({ rating: reviewRating, title: reviewTitle, review_text: reviewText });
    } catch (err) {
      setReviewMsg(err.message || "Could not submit review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const inCart = product ? cartItems.some((item) => item.productId === product.id && item.size === selectedSize) : false;
  const inWishlist = product ? wishlistItems.includes(product.id) : false;

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

  const [addingToCart, setAddingToCart] = useState(false);

  const onBuy = () => {
    const result = handleBuy(product, selectedSize);
    if (result.requiresAuth) {
      navigate("/login");
      return;
    }
    if (result.added) {
      setAuthError("");
      setAddingToCart(true);
      setTimeout(() => setAddingToCart(false), 800);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <MainHeader />

      <div className="pt-16 sm:pt-20 md:pt-24">
        {/* Image + Info */}
        <div className="grid lg:grid-cols-2 min-h-[calc(100svh-4rem)]">
          {/* Image */}
          <div className="relative bg-[#080808] flex items-center justify-center p-5 sm:p-8 md:p-12 lg:p-16 min-h-[45svh] sm:min-h-[50vh] lg:min-h-0">
            <motion.img
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease }}
              src={product.src}
              alt={product.title}
              className="w-full h-full max-h-[70svh] object-contain select-none"
            />
            {/* Wishlist heart */}
            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              className="absolute bottom-3 right-4 sm:bottom-5 sm:right-6 z-10 p-1 transition-all active:scale-75 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
              aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
            >
              <motion.svg
                key={inWishlist ? "filled" : "empty"}
                initial={{ scale: 0.3 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-6 h-6"
                fill={inWishlist ? "white" : "none"}
                stroke={inWishlist ? "white" : "rgba(255,255,255,0.6)"}
                strokeWidth="1.8"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </motion.svg>
            </button>
          </div>

          {/* Details */}
          <div className="border-t lg:border-t-0 lg:border-l border-white/10 px-5 py-8 sm:px-6 sm:py-10 md:px-10 lg:px-14 xl:px-20 flex flex-col justify-center gap-5 sm:gap-6">
            {/* Back */}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="self-start text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-white/70 transition-colors flex items-center gap-2 py-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5m0 0l7 7m-7-7l7-7" /></svg>
              Back
            </button>

            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease }}
                className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black tracking-tight uppercase leading-[0.95]"
              >
                {product.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base text-white/50 leading-relaxed max-w-lg"
              >
                {product.info}
              </motion.p>
            </div>

            {/* Size Selector */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease }}
            >
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">Select Size</p>
              <div className="flex gap-2">
                {Object.entries(product.pricing).map(([size, price]) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`flex-1 border py-3 sm:py-3.5 px-2 sm:px-3 text-center transition-all duration-300 rounded-sm ${
                      selectedSize === size
                        ? "border-white bg-white text-black"
                        : "border-white/15 text-white/70 hover:border-white/30"
                    }`}
                  >
                    <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] sm:tracking-[0.15em]">{size}</span>
                    <span className="block text-[8px] sm:text-[10px] mt-0.5 opacity-60">{sizeDimensions[size]}</span>
                    <span className="block text-base sm:text-lg font-black mt-1">₹{price}</span>
                    {product.mrp?.[size] > price && (
                      <span className="block text-[8px] sm:text-[9px] mt-0.5">
                        <span className="text-white/30 line-through">₹{product.mrp[size]}</span>
                        {" "}
                        <span className="text-emerald-400 font-bold">{Math.round((1 - price / product.mrp[size]) * 100)}% off</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4, ease }}
              className="flex items-center gap-3 sm:gap-4 pt-1 sm:pt-2"
            >
              <button
                type="button"
                onClick={onBuy}
                disabled={inCart || addingToCart}
                className={`flex-1 py-3.5 sm:py-4 text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] sm:tracking-[0.2em] transition-all duration-300 rounded-sm flex items-center justify-center gap-2 ${
                  inCart
                    ? "bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 cursor-default"
                    : addingToCart
                    ? "bg-emerald-500 text-black"
                    : "bg-white text-black hover:bg-white/90 active:scale-[0.98]"
                }`}
              >
                {addingToCart && <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                {inCart ? "In Cart" : addingToCart ? "Added!" : "Add to Cart"}
              </button>
              {inCart && (
                <button
                  type="button"
                  onClick={() => navigate("/cart")}
                  className="flex-1 border border-white/20 py-3.5 sm:py-4 text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] sm:tracking-[0.2em] text-white hover:bg-white/10 transition-all duration-300 rounded-sm"
                >
                  Buy
                </button>
              )}
            </motion.div>

            <p className="text-[9px] sm:text-[10px] text-white/25 uppercase tracking-[0.15em]">Max 10 per artwork</p>
          </div>
        </div>

        {/* Reviews */}
        {product.reviews?.length > 0 && (
          <div className="border-t border-white/10 px-4 sm:px-6 md:px-10 lg:px-20 py-12 sm:py-16 md:py-24 bg-[#050505]">
            <h2 className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-white/40 mb-6 sm:mb-8">Reviews</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {product.reviews.map((review, index) => (
                <motion.div
                  key={`${review.name}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.08, ease }}
                  className="border border-white/10 p-4 sm:p-5 bg-white/[0.02] rounded-sm"
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

        {/* Write a Review (for delivered orders) */}
        {hasDeliveredOrder && (
          <div className="border-t border-white/10 px-4 sm:px-6 md:px-10 lg:px-20 py-12 sm:py-16 bg-[#050505]">
            <h2 className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-white/40 mb-2">
              {existingReview ? "Update Your Review" : "Write a Review"}
            </h2>
            <p className="text-sm text-white/40 mb-6">We'd love to hear your thoughts on this piece!</p>

            {reviewMsg && (
              <p className={`text-sm mb-4 ${reviewMsg.includes("Thank") ? "text-emerald-400" : "text-red-400"}`}>{reviewMsg}</p>
            )}

            {/* Star rating */}
            <div className="flex items-center gap-1 mb-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 mr-3">Rating</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className={`text-xl transition-colors ${star <= reviewRating ? "text-amber-400" : "text-white/15"}`}
                >
                  ★
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Review title (optional)"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              maxLength={120}
              className="w-full bg-white/[0.04] border border-white/10 rounded px-4 py-3 text-sm text-white placeholder:text-white/25 mb-3 focus:outline-none focus:border-white/30"
            />

            <textarea
              placeholder="Share your experience with this artwork…"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              maxLength={1000}
              className="w-full bg-white/[0.04] border border-white/10 rounded px-4 py-3 text-sm text-white placeholder:text-white/25 mb-4 focus:outline-none focus:border-white/30 resize-none"
            />

            <button
              type="button"
              onClick={onSubmitReview}
              disabled={reviewSubmitting || !reviewText.trim()}
              className="bg-white text-black text-[10px] uppercase tracking-[0.2em] font-bold px-8 py-3 rounded-sm hover:bg-white/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {reviewSubmitting ? "Submitting…" : existingReview ? "Update Review" : "Submit Review"}
            </button>
          </div>
        )}
      </div>

      {/* Floating WhatsApp */}
      <a
        href={getWhatsAppLink()}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 group flex items-center gap-3"
      >
        <span className="hidden sm:block bg-black/80 backdrop-blur border border-white/10 text-white/70 text-[10px] uppercase tracking-[0.2em] px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap rounded-sm">
          Ask about this piece
        </span>
        <span className="w-12 h-12 sm:w-13 sm:h-13 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg shadow-[#25D366]/20 group-hover:scale-110 active:scale-95 transition-transform duration-300">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </span>
      </a>
    </div>
  );
}
