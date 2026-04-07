import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainHeader from "../components/MainHeader";
import { useShop } from "../context/ShopContext";

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
      <div className="min-h-screen bg-[#080808] text-white">
        <MainHeader />
        <div className="max-w-6xl mx-auto px-4 pt-28 pb-16">
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-6">Your Wishlist</h1>
          <div className="border border-white/10 bg-white/[0.03] p-12 text-center">
            <p className="text-white/70 text-lg mb-6">Your wishlist is empty</p>
            <button
              onClick={() => navigate("/")}
              className="bg-white text-black px-6 py-3 uppercase tracking-[0.2em] font-bold"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <MainHeader />
      <div className="max-w-6xl mx-auto px-4 pt-28 pb-16">
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-2">Your Wishlist</h1>
        <p className="text-white/60 mb-8">
          {wishlistProducts.length} item{wishlistProducts.length !== 1 ? "s" : ""} saved
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {wishlistProducts.map((product) => (
            <div
              key={product.id}
              className="border border-white/10 bg-white/[0.03] overflow-hidden"
            >
              <div
                className="aspect-square overflow-hidden bg-[#1a1a1a] cursor-pointer group"
                onClick={() => navigate(`/product/${product.slug || product.id}`)}
              >
                <img
                  src={product.src}
                  alt={product.title}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="p-4">
                <h3 className="font-bold text-lg uppercase tracking-wide truncate">{product.title}</h3>
                <p className="text-white/55 text-sm mt-1 line-clamp-1">{product.shortInfo}</p>

                <div className="flex gap-2 mt-3 text-xs text-white/65">
                  <span className="border border-white/15 px-2 py-1">S: ₹{product.pricing?.S}</span>
                  <span className="border border-white/15 px-2 py-1">L: ₹{product.pricing?.L}</span>
                  <span className="border border-white/15 px-2 py-1">XL: ₹{product.pricing?.XL}</span>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="flex-1 border border-white/50 px-3 py-2 text-xs uppercase tracking-widest font-bold hover:bg-white hover:text-black transition-colors"
                  >
                    {feedbackId === product.id ? "Added ✓" : "Add to Cart"}
                  </button>
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    className="border border-rose-300/40 px-3 py-2 text-xs uppercase tracking-widest text-rose-200 hover:bg-rose-500/10 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
