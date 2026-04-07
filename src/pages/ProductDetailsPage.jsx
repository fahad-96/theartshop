import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainHeader from "../components/MainHeader";
import { useShop } from "../context/ShopContext";
import { supabase } from "../lib/supabaseClient";
import { fetchProductInventory, fetchProductReviews, saveProductReview } from "../lib/adminApi";

export default function ProductDetailsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { products, cart, addToCart, addToWishlist, wishlistItems } = useShop();
  
  const [selectedSize, setSelectedSize] = useState("S");
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState(null);
  const [inventory, setInventory] = useState({});
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    review_text: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    const found = products.find((p) => p.slug === slug);
    setProduct(found || null);

    if (found?.dbId) {
      loadInventoryAndReviews(found.dbId);
    }
  }, [slug, products]);

  const loadInventoryAndReviews = async (productId) => {
    try {
      const [inv, revs] = await Promise.all([
        fetchProductInventory(supabase, productId),
        fetchProductReviews(supabase, productId),
      ]);

      const invMap = {};
      inv.forEach(({ size, stock_count }) => {
        invMap[size] = stock_count;
      });
      setInventory(invMap);
      setReviews(revs);
    } catch (error) {
      console.error("Failed to load inventory/reviews", error);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCart({
      ...product,
      selectedSize,
      quantity: parseInt(quantity),
    });
    setMessage("✅ Added to cart!");
    setTimeout(() => setMessage(""), 2000);
  };

  const handleAddToWishlist = () => {
    if (!product) return;
    addToWishlist(product.id);
    setMessage("❤️ Added to wishlist!");
    setTimeout(() => setMessage(""), 2000);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/sign-in", { state: { from: location.pathname } });
      return;
    }

    if (!reviewForm.title.trim() || !reviewForm.review_text.trim()) {
      setMessage("Title and review text are required.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await saveProductReview(supabase, product.dbId, {
        rating: parseInt(reviewForm.rating),
        title: reviewForm.title,
        review_text: reviewForm.review_text,
        verified_purchase: true, // Simplified for now
      });

      setMessage("✅ Review posted successfully!");
      setReviewForm({ rating: 5, title: "", review_text: "" });

      // Reload reviews
      await loadInventoryAndReviews(product.dbId);
    } catch (error) {
      setMessage(error.message || "Failed to post review.");
    } finally {
      setSaving(false);
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-600">Product not found</p>
        </div>
      </div>
    );
  }

  const stockForSize = inventory[selectedSize] || 0;
  const inStock = stockForSize > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader />
      <div className="max-w-6xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:underline mb-6"
        >
          ← Back
        </button>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.includes("✅") ? "bg-green-50 text-green-800" : message.includes("❤️") ? "bg-pink-50 text-pink-800" : "bg-red-50 text-red-800"}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Image */}
          <div className="bg-white rounded-lg shadow p-6">
            <img
              src={product.src}
              alt={product.title}
              className="w-full h-96 object-contain rounded-lg"
            />
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{product.title}</h1>
              <p className="text-gray-600 text-lg">{product.category}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl">⭐ {product.average_rating || 0}</span>
                <span className="text-gray-600">({product.total_reviews || 0} reviews)</span>
              </div>
            </div>

            <p className="text-gray-700 text-lg">{product.info}</p>

            {/* Size Selection */}
            <div>
              <h3 className="font-bold mb-3">Select Size</h3>
              <div className="flex gap-3">
                {["S", "L", "XL"].map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      selectedSize === size
                        ? "bg-black text-white"
                        : "bg-gray-200 text-black hover:bg-gray-300"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Stock: {inStock ? `${stockForSize} available` : "Out of stock"}
              </p>
            </div>

            {/* Pricing */}
            <div className="text-3xl font-bold">
              ₹{product.pricing?.[selectedSize] || 999}
            </div>

            {/* Quantity */}
            <div>
              <label className="block font-medium mb-2">Quantity</label>
              <input
                type="number"
                min="1"
                max={stockForSize || 10}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={!inStock}
                className={`flex-1 px-4 py-3 rounded-lg font-bold text-white transition ${
                  inStock
                    ? "bg-black hover:bg-gray-900"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                {inStock ? "Add to Cart" : "Out of Stock"}
              </button>
              <button
                onClick={handleAddToWishlist}
                className={`px-4 py-3 rounded-lg font-bold transition ${
                  wishlistItems?.includes(product.id)
                    ? "bg-pink-600 text-white"
                    : "bg-gray-200 text-black hover:bg-gray-300"
                }`}
              >
                {wishlistItems?.includes(product.id) ? "❤️ Saved" : "🤍 Wishlist"}
              </button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>

            {reviews.length === 0 ? (
              <p className="text-gray-600 mb-6">No reviews yet. Be the first!</p>
            ) : (
              <div className="space-y-4 mb-8">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold">{review.title}</p>
                        <div className="flex gap-1 text-yellow-400">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <span key={i}>⭐</span>
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-gray-600">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700">{review.review_text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review Form */}
          <div>
            <div className="bg-white rounded-lg shadow p-6 sticky top-20">
              <h3 className="font-bold text-lg mb-4">Leave a Review</h3>

              {!user ? (
                <p className="text-gray-600 mb-4">
                  <button
                    onClick={() => navigate("/sign-in", { state: { from: location.pathname } })}
                    className="text-blue-600 hover:underline"
                  >
                    Sign in
                  </button>{" "}
                  to leave a review
                </p>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Rating</label>
                    <select
                      value={reviewForm.rating}
                      onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                      <option value="4">⭐⭐⭐⭐ Very Good</option>
                      <option value="3">⭐⭐⭐ Good</option>
                      <option value="2">⭐⭐ Fair</option>
                      <option value="1">⭐ Poor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Review Title</label>
                    <input
                      type="text"
                      placeholder="e.g., Amazing quality!"
                      value={reviewForm.title}
                      onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Your Review</label>
                    <textarea
                      placeholder="Share your experience with this product..."
                      value={reviewForm.review_text}
                      onChange={(e) => setReviewForm({ ...reviewForm, review_text: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
                  >
                    {saving ? "Posting..." : "Post Review"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
