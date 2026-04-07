import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainHeader from "../components/MainHeader";
import { useShop } from "../context/ShopContext";
import { sizeDimensions } from "../data/products";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

const loadRazorpaySdk = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function CartPage() {
  const navigate = useNavigate();
  const [isPaying, setIsPaying] = useState(false);
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
    shippingDetails,
    validateCheckoutReadiness,
    finalizePaidOrder,
  } = useShop();

  useEffect(() => {
    if (authReady && !authUser) {
      navigate("/login", { replace: true });
    }
  }, [authReady, authUser, navigate]);

  if (!authReady) return null;

  const onCheckout = async () => {
    const readiness = validateCheckoutReadiness();
    if (readiness.requiresAuth) {
      navigate("/login", { replace: true });
      return;
    }
    if (!readiness.ok) {
      return;
    }

    setIsPaying(true);

    try {
      const sdkReady = await loadRazorpaySdk();
      if (!sdkReady) {
        setCartMessage("Unable to load Razorpay checkout. Please try again.");
        setIsPaying(false);
        return;
      }

      const createOrderResponse = await fetch(`${apiBaseUrl}/api/payment/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: cartSubtotal,
          currency: "INR",
          receipt: `tas_${Date.now()}`,
          notes: {
            userEmail: authUser?.email || "",
            userName: authUser?.name || "",
          },
        }),
      });

      const createOrderPayload = await createOrderResponse.json();
      if (!createOrderResponse.ok || !createOrderPayload?.ok) {
        throw new Error(createOrderPayload?.message || "Failed to create payment order.");
      }

      const razorpayOptions = {
        key: createOrderPayload.keyId,
        amount: createOrderPayload.order.amount,
        currency: createOrderPayload.order.currency,
        name: "The Art Shop",
        description: "Artwork Purchase",
        order_id: createOrderPayload.order.id,
        prefill: {
          name: shippingDetails.fullName || authUser?.name || "",
          email: authUser?.email || "",
          contact: shippingDetails.phone || "",
        },
        notes: {
          landmark: shippingDetails.landmark || "",
          address: shippingDetails.address || "",
        },
        theme: {
          color: "#0f0f0f",
        },
        handler: async (paymentResult) => {
          try {
            const verifyResponse = await fetch(`${apiBaseUrl}/api/payment/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(paymentResult),
            });

            const verifyPayload = await verifyResponse.json();
            if (!verifyResponse.ok || !verifyPayload?.ok) {
              throw new Error(verifyPayload?.message || "Payment verification failed.");
            }

            const finalResult = await finalizePaidOrder({
              provider: "razorpay",
              status: "paid",
              razorpayOrderId: paymentResult.razorpay_order_id,
              razorpayPaymentId: paymentResult.razorpay_payment_id,
            });

            if (finalResult.ok) {
              navigate("/profile", { replace: true });
            }
          } catch (error) {
            setCartMessage(error.message || "Payment verification failed.");
          } finally {
            setIsPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsPaying(false);
            setCartMessage("Payment cancelled.");
          },
        },
      };

      const razorpay = new window.Razorpay(razorpayOptions);
      razorpay.open();
    } catch (error) {
      setCartMessage(error.message || "Checkout failed. Please try again.");
      setIsPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <MainHeader />
      <div className="pt-28 pb-16 px-4 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-8">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight uppercase">Your Cart</h2>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-xs uppercase tracking-[0.28em] text-white/70 hover:text-white"
            >
              Continue Shopping
            </button>
          </div>

          {cartMessage && (
            <p className="mb-6 border border-white/20 bg-white/5 p-3 text-sm text-white/80">{cartMessage}</p>
          )}

          {!cartItems.length ? (
            <div className="border border-white/10 bg-white/[0.03] p-8 text-center text-white/70">
              Cart is empty. Start with a BUY from the landing page.
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
              <div className="space-y-4">
                {cartItems.map((item) => {
                  const product = getProductById(item.productId);
                  if (!product) return null;
                  return (
                    <div key={`${item.productId}-${item.size}`} className="border border-white/10 bg-white/[0.03] p-4 md:p-5 flex gap-4">
                      <img src={product.src} alt={product.title} className="h-24 w-20 object-cover" />
                      <div className="flex-1">
                        <p className="text-lg font-bold uppercase tracking-wide">{product.title}</p>
                        <p className="text-sm text-white/70 mt-1">Size {item.size} • {sizeDimensions[item.size]}</p>
                        <p className="text-sm text-white/70">₹{product.pricing[item.size]} each</p>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.productId, item.size, item.qty - 1)}
                            className="h-8 w-8 border border-white/30"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.productId, item.size, item.qty + 1)}
                            className="h-8 w-8 border border-white/30"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCartItem(item.productId, item.size)}
                            className="ml-4 text-xs uppercase tracking-widest text-rose-300 hover:text-rose-200"
                          >
                            Remove
                          </button>
                        </div>
                        <p className="mt-3 text-sm text-white">Line total: ₹{product.pricing[item.size] * item.qty}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="h-fit border border-white/10 bg-white/[0.04] p-5 md:p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Checkout</p>
                <p className="mt-3 text-3xl font-black">₹{cartSubtotal}</p>

                <div className="mt-6 border border-white/15 bg-black/25 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/55">Delivery Details</p>
                  <p className="mt-3 text-sm text-white/90">{shippingDetails.fullName || "Name not added"}</p>
                  <p className="text-sm text-white/75">{shippingDetails.phone || "Phone not added"}</p>
                  {shippingDetails.landmark && <p className="text-sm text-white/70">Landmark: {shippingDetails.landmark}</p>}
                  <p className="mt-2 text-sm text-white/80">{shippingDetails.address || "Address not added"}</p>
                  <button
                    type="button"
                    onClick={() => navigate("/profile")}
                    className="mt-4 border border-white/30 px-3 py-2 text-xs uppercase tracking-[0.16em] text-white/85 hover:bg-white/10"
                  >
                    Edit Address In Profile
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onCheckout}
                  disabled={isPaying}
                  className="mt-6 w-full bg-white text-black py-3 uppercase tracking-[0.2em] font-bold disabled:opacity-70"
                >
                  {isPaying ? "Processing..." : "Pay"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
