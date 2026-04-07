import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainHeader from "../components/MainHeader";
import MapboxAddressInput from "../components/MapboxAddressInput";
import { useShop } from "../context/ShopContext";
import { sizeDimensions } from "../data/products";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
const ADDRESS_BOOK_STORAGE_KEY_PREFIX = "tas-address-book";
const ADDRESS_SYNC_TIMEOUT_MS = 6000;

const withTimeout = (promise, timeoutMs, timeoutMessage) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

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
  const [checkoutStep, setCheckoutStep] = useState("cart");
  const [addressBook, setAddressBook] = useState([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    fullName: "",
    phone: "",
    landmark: "",
    address: "",
  });

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
    updateProfileAddressDetails,
  } = useShop();

  useEffect(() => {
    if (authReady && !authUser) {
      navigate("/login", { replace: true });
    }
  }, [authReady, authUser, navigate]);

  if (!authReady) return null;

  const getAddressStorageKey = () => {
    if (!authUser?.email) return "";
    return `${ADDRESS_BOOK_STORAGE_KEY_PREFIX}:${authUser.email.toLowerCase()}`;
  };

  const persistAddressBook = (addresses, nextDefaultIndex) => {
    const storageKey = getAddressStorageKey();
    if (!storageKey) return;

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        addresses,
        defaultIndex: Math.max(0, Math.min(nextDefaultIndex, Math.max(addresses.length - 1, 0))),
      })
    );
  };

  const loadAddressBook = () => {
    if (!authUser?.email) return [];

    const storageKey = getAddressStorageKey();
    const storedRaw = storageKey ? localStorage.getItem(storageKey) : null;
    if (storedRaw) {
      try {
        const parsed = JSON.parse(storedRaw);
        const storedAddresses = Array.isArray(parsed?.addresses) ? parsed.addresses : [];
        const safeDefault = storedAddresses.length
          ? (Number.isInteger(parsed?.defaultIndex)
            ? Math.min(Math.max(parsed.defaultIndex, 0), storedAddresses.length - 1)
            : 0)
          : 0;
        setAddressBook(storedAddresses);
        setSelectedAddressIndex(safeDefault);
        // If a storage address book exists, trust it even when empty.
        return storedAddresses;
      } catch {
        // Ignore parse errors and fallback.
      }
    }

    if (shippingDetails?.address?.trim()) {
      const seeded = [{ ...shippingDetails }];
      setAddressBook(seeded);
      setSelectedAddressIndex(0);
      persistAddressBook(seeded, 0);
      return seeded;
    }

    setAddressBook([]);
    setSelectedAddressIndex(0);
    return [];
  };

  const startCheckout = () => {
    if (!authUser) {
      navigate("/login", { replace: true });
      return;
    }

    if (!cartItems.length) {
      setCartMessage("Cart is empty.");
      return;
    }

    const addresses = loadAddressBook();
    if (!addresses.length) {
      setShowAddAddressForm(true);
      setAddressForm({
        fullName: authUser?.name || "",
        phone: "",
        landmark: "",
        address: "",
      });
    } else {
      setShowAddAddressForm(false);
    }

    setCheckoutStep("address");
  };

  const saveAddressFromCheckout = async (event) => {
    event.preventDefault();

    if (!addressForm.fullName.trim() || !addressForm.phone.trim() || !addressForm.address.trim()) {
      setCartMessage("Name, phone, and address are required.");
      return;
    }

    const normalized = {
      fullName: addressForm.fullName.trim(),
      phone: addressForm.phone.trim(),
      landmark: addressForm.landmark.trim(),
      address: addressForm.address.trim(),
    };

    const nextAddresses = [...addressBook, normalized];
    const nextIndex = nextAddresses.length - 1;
    setAddressBook(nextAddresses);
    setSelectedAddressIndex(nextIndex);
    persistAddressBook(nextAddresses, nextIndex);

    setSavingAddress(true);
    try {
      await withTimeout(
        updateProfileAddressDetails(normalized),
        ADDRESS_SYNC_TIMEOUT_MS,
        "Profile sync timed out."
      );
      setCartMessage("Address saved. Proceed to payment overview.");
    } catch {
      // Keep local address saved even if profile sync fails.
      setCartMessage("Address saved locally. You can proceed now.");
    } finally {
      setSavingAddress(false);
      setShowAddAddressForm(false);
    }
  };

  const proceedToOverview = async () => {
    const selectedAddress = addressBook[selectedAddressIndex];
    if (!selectedAddress?.fullName || !selectedAddress?.phone || !selectedAddress?.address) {
      setCartMessage("Please select a valid address to continue.");
      return;
    }

    try {
      const result = await withTimeout(
        updateProfileAddressDetails(selectedAddress),
        ADDRESS_SYNC_TIMEOUT_MS,
        "Profile sync timed out."
      );
      if (result?.ok === false) {
        setCartMessage("Using selected address locally. You can continue.");
      }
    } catch {
      setCartMessage("Using selected address locally. You can continue.");
    }

    setCheckoutStep("overview");
  };

  const onPayNow = async () => {
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

  const onTryCod = () => {
    setCartMessage("COD is not available for this product.");
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
              Cart is empty. Start shopping from home.
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

                {checkoutStep === "cart" && (
                  <button
                    type="button"
                    onClick={startCheckout}
                    className="mt-6 w-full bg-white text-black py-3 uppercase tracking-[0.2em] font-bold"
                  >
                    Checkout
                  </button>
                )}

                {checkoutStep === "address" && (
                  <div className="mt-6 space-y-4">
                    <div className="border border-white/15 bg-black/25 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-white/55">Select Address</p>

                      {!addressBook.length && !showAddAddressForm && (
                        <p className="mt-3 text-sm text-white/70">No saved address found. Add one to continue.</p>
                      )}

                      {!!addressBook.length && !showAddAddressForm && (
                        <div className="mt-3 space-y-2">
                          {addressBook.map((entry, index) => (
                            <button
                              key={`${entry.fullName}-${entry.phone}-${index}`}
                              type="button"
                              onClick={() => setSelectedAddressIndex(index)}
                              className={`w-full text-left border px-3 py-3 ${selectedAddressIndex === index ? "border-white bg-white/10" : "border-white/20 bg-black/20 hover:bg-white/5"}`}
                            >
                              <p className="text-sm font-semibold text-white">{entry.fullName}</p>
                              <p className="text-xs text-white/75">{entry.phone}</p>
                              <p className="text-xs text-white/70 mt-1">{entry.address}</p>
                            </button>
                          ))}
                        </div>
                      )}

                      {showAddAddressForm && (
                        <form onSubmit={saveAddressFromCheckout} className="mt-3 space-y-2">
                          <input
                            value={addressForm.fullName}
                            onChange={(e) => setAddressForm((prev) => ({ ...prev, fullName: e.target.value }))}
                            className="w-full bg-black/40 border border-white/20 px-3 py-2 outline-none focus:border-white"
                            placeholder="Full name"
                          />
                          <input
                            value={addressForm.phone}
                            onChange={(e) => setAddressForm((prev) => ({ ...prev, phone: e.target.value.replace(/[^0-9+\s-]/g, "") }))}
                            className="w-full bg-black/40 border border-white/20 px-3 py-2 outline-none focus:border-white"
                            placeholder="Phone number"
                          />
                          <input
                            value={addressForm.landmark}
                            onChange={(e) => setAddressForm((prev) => ({ ...prev, landmark: e.target.value }))}
                            className="w-full bg-black/40 border border-white/20 px-3 py-2 outline-none focus:border-white"
                            placeholder="Landmark (optional)"
                          />
                          <MapboxAddressInput
                            value={addressForm.address}
                            onChange={(address) => setAddressForm((prev) => ({ ...prev, address }))}
                            onEdit={() => setCartMessage("")}
                          />
                          <div className="flex flex-wrap gap-2 pt-1">
                            <button type="submit" disabled={savingAddress} className="bg-white text-black px-4 py-2 text-xs uppercase tracking-[0.16em] font-bold disabled:opacity-60">{savingAddress ? "Saving..." : "Save Address"}</button>
                            <button
                              type="button"
                              onClick={() => setShowAddAddressForm(false)}
                              disabled={savingAddress}
                              className="border border-white/30 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/85 hover:bg-white/10"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {!showAddAddressForm && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddAddressForm(true);
                              setAddressForm({
                                fullName: authUser?.name || "",
                                phone: "",
                                landmark: "",
                                address: "",
                              });
                            }}
                            className="border border-white/30 px-3 py-2 text-xs uppercase tracking-[0.16em] text-white/85 hover:bg-white/10"
                          >
                            Add Address
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={proceedToOverview}
                          disabled={!addressBook.length || showAddAddressForm}
                          className="bg-white text-black px-4 py-2 text-xs uppercase tracking-[0.16em] font-bold disabled:opacity-60"
                        >
                          Proceed
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {checkoutStep === "overview" && (
                  <div className="mt-6 space-y-4">
                    <div className="border border-white/15 bg-black/25 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-white/55">Purchase Overview</p>
                      <div className="mt-3 space-y-1 text-sm text-white/80">
                        {cartItems.map((item) => {
                          const product = getProductById(item.productId);
                          if (!product) return null;
                          return (
                            <p key={`overview-${item.productId}-${item.size}`}>
                              {product.title} • {item.size} • Qty {item.qty} • ₹{product.pricing[item.size] * item.qty}
                            </p>
                          );
                        })}
                      </div>
                      <div className="mt-3 border-t border-white/10 pt-3 text-sm text-white/85">
                        <p className="font-semibold">Deliver To</p>
                        <p>{addressBook[selectedAddressIndex]?.fullName || shippingDetails.fullName}</p>
                        <p>{addressBook[selectedAddressIndex]?.phone || shippingDetails.phone}</p>
                        <p>{addressBook[selectedAddressIndex]?.address || shippingDetails.address}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={onTryCod}
                        className="border border-white/30 px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/85 hover:bg-white/10"
                      >
                        COD
                      </button>
                      <button
                        type="button"
                        onClick={onPayNow}
                        disabled={isPaying}
                        className="bg-white text-black px-4 py-3 text-xs uppercase tracking-[0.18em] font-bold disabled:opacity-70"
                      >
                        {isPaying ? "Processing..." : "Pay Now"}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCheckoutStep("address")}
                      className="w-full border border-white/25 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/75 hover:bg-white/10"
                    >
                      Back to Address Selection
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
