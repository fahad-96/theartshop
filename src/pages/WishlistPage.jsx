import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MainHeader from "../components/MainHeader";
import { useShop } from "../context/ShopContext";

export default function WishlistPage() {
  const navigate = useNavigate();
  const { products, wishlistItems, removeFromWishlist, addToCart } = useShop();

  const wishlistProducts = useMemo(() => {
    return products.filter((p) => wishlistItems?.includes(p.id));
  }, [products, wishlistItems]);

  const handleAddToCart = (product) => {
    addToCart({
      ...product,
      selectedSize: "S",
      quantity: 1,
    });
    alert("✅ Added to cart!");
  };

  if (!wishlistProducts || wishlistProducts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-6">Your Wishlist</h1>
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 text-lg mb-6">Your wishlist is empty</p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-900"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader />
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Your Wishlist</h1>
        <p className="text-gray-600 mb-8">
          {wishlistProducts.length} item{wishlistProducts.length !== 1 ? "s" : ""} saved
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition"
            >
              <div className="aspect-square overflow-hidden bg-gray-100 cursor-pointer group">
                <img
                  src={product.src}
                  alt={product.title}
                  onClick={() => navigate(`/product/${product.slug}`)}
                  className="w-full h-full object-contain group-hover:scale-105 transition"
                />
              </div>

              <div className="p-4">
                <h3 className="font-bold text-lg mb-1 truncate">{product.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{product.shortInfo}</p>

                <div className="flex gap-2 mb-3">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    S: ₹{product.pricing?.S || 599}
                  </span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    L: ₹{product.pricing?.L || 999}
                  </span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    XL: ₹{product.pricing?.XL || 1499}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="flex-1 px-3 py-2 bg-black text-white rounded-lg hover:bg-gray-900 text-sm font-medium"
                  >
                    Add to Cart
                  </button>
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
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
