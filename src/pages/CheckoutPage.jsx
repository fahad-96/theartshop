import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MainHeader from "../components/MainHeader";
import MapboxAddressInput from "../components/MapboxAddressInput";
import { useShop } from "../context/ShopContext";
import { sizeDimensions } from "../data/products";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
const ADDRESS_BOOK_STORAGE_KEY_PREFIX = "tas-address-book";
const ADDRESS_SYNC_TIMEOUT_MS = 6000;
const PAYMENT_API_TIMEOUT_MS = 15000;
const FINALIZE_TIMEOUT_MS = 25000;
const PENDING_PAYMENT_KEY = "tas-pending-payment";

const withTimeout = (promise, timeoutMs, timeoutMessage) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

const parseJsonResponse = async (response, fallbackMessage) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(fallbackMessage);
  }
  return response.json();
};

const loadRazorpaySdk = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const steps = [
  { key: "address", label: "Address" },
  { key: "review", label: "Review" },
  { key: "payment", label: "Payment" },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState("address");
  const [isPaying, setIsPaying] = useState(false);
  const [message, setMessage] = useState("");
  const [paymentPhase, setPaymentPhase] = useState("");
  const [addressBook, setAddressBook] = useState([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({ fullName: "", phone: "", landmark: "", address: "" });
  const [continuing, setContinuing] = useState(false);
  const payStartedAt = useRef(null);

  const {
    authUser, authReady, cartItems, cartSubtotal, getProductById,
    shippingDetails, validateCheckoutReadiness, finalizePaidOrder,
    updateProfileAddressDetails, setCartMessage,
  } = useShop();

  // Recover from a stuck payment state when the user returns to the tab
  // (common on mobile UPI flows where the browser suspends the page)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (!isPaying || !payStartedAt.current) return;
      const elapsed = Date.now() - payStartedAt.current;
      // If we've been in the paying state for over 2 minutes, the handler likely never fired
      if (elapsed > 120_000) {
        setIsPaying(false);
        setPaymentPhase("");
        setStep("review");
        setMessage("Payment session expired. If you were charged, your order will be confirmed automatically — please check your email or contact support.");
        payStartedAt.current = null;
        try { sessionStorage.removeItem(PENDING_PAYMENT_KEY); } catch {}
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [isPaying]);

  // On mount, detect if we have a pending payment from a killed/reloaded page
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem(PENDING_PAYMENT_KEY);
      if (pending) {
        const { orderId, paymentId, timestamp } = JSON.parse(pending);
        const age = Date.now() - timestamp;
        sessionStorage.removeItem(PENDING_PAYMENT_KEY);
        if (orderId && paymentId && age < 300_000) {
          // The page was killed mid-payment but payment succeeded — try to finalize
          setStep("payment");
          setIsPaying(true);
          setPaymentPhase("finalizing");
          withTimeout(
            finalizePaidOrder({ provider: "razorpay", status: "paid", razorpayOrderId: orderId, razorpayPaymentId: paymentId }),
            FINALIZE_TIMEOUT_MS,
            "Order finalization timed out."
          ).then((fin) => {
            if (fin?.ok) { navigate("/order-success", { replace: true }); return; }
            setMessage(fin?.message || "Payment was successful, but order saving failed. Please contact support.");
            setStep("review");
          }).catch((err) => {
            setMessage(err?.message || "Could not finalize the order. If you were charged, please contact support.");
            setStep("review");
          }).finally(() => { setIsPaying(false); setPaymentPhase(""); });
          return;
        }
        if (orderId && age < 300_000) {
          setMessage("A previous payment may have been interrupted. If you were charged, please contact support with order ID: " + orderId);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (authReady && !authUser) navigate("/login", { replace: true });
  }, [authReady, authUser, navigate]);

  useEffect(() => {
    if (authReady && authUser && !cartItems.length) {
      navigate("/cart", { replace: true });
    }
  }, [authReady, authUser, cartItems.length, navigate]);

  useEffect(() => {
    if (authUser?.email) loadAddressBook();
  }, [authUser?.email]);

  if (!authReady || !cartItems.length) return null;

  const getStorageKey = () => authUser?.email ? `${ADDRESS_BOOK_STORAGE_KEY_PREFIX}:${authUser.email.toLowerCase()}` : "";

  const persistAddressBook = (addresses, idx) => {
    const key = getStorageKey();
    if (key) localStorage.setItem(key, JSON.stringify({ addresses, defaultIndex: Math.max(0, Math.min(idx, addresses.length - 1)) }));
  };

  function loadAddressBook() {
    const key = getStorageKey();
    const raw = key ? localStorage.getItem(key) : null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const addrs = Array.isArray(parsed?.addresses) ? parsed.addresses : [];
        const idx = addrs.length ? Math.min(Math.max(parsed?.defaultIndex || 0, 0), addrs.length - 1) : 0;
        setAddressBook(addrs);
        setSelectedAddressIndex(idx);
        if (!addrs.length) setShowAddForm(true);
        return;
      } catch { /* ignore */ }
    }
    if (shippingDetails?.address?.trim()) {
      const seeded = [{ ...shippingDetails }];
      setAddressBook(seeded);
      setSelectedAddressIndex(0);
      persistAddressBook(seeded, 0);
    } else {
      setAddressBook([]);
      setShowAddForm(true);
    }
  }

  const saveAddress = async (e) => {
    e.preventDefault();
    if (!addressForm.fullName.trim() || !addressForm.phone.trim() || !addressForm.address.trim()) {
      setMessage("Name, phone, and address are required.");
      return;
    }
    const normalized = { fullName: addressForm.fullName.trim(), phone: addressForm.phone.trim(), landmark: addressForm.landmark.trim(), address: addressForm.address.trim() };
    const next = [...addressBook, normalized];
    const idx = next.length - 1;
    setAddressBook(next);
    setSelectedAddressIndex(idx);
    persistAddressBook(next, idx);
    setSavingAddress(true);
    try { await withTimeout(updateProfileAddressDetails(normalized), ADDRESS_SYNC_TIMEOUT_MS, "Sync timed out."); } catch { /* ok */ }
    setSavingAddress(false);
    setShowAddForm(false);
    setMessage("");
  };

  const goToReview = async () => {
    const addr = addressBook[selectedAddressIndex];
    if (!addr?.fullName || !addr?.phone || !addr?.address) { setMessage("Select a valid address."); return; }
    setContinuing(true);
    try { await withTimeout(updateProfileAddressDetails(addr), ADDRESS_SYNC_TIMEOUT_MS, "Sync timed out."); } catch { /* ok */ }
    setContinuing(false);
    setMessage("");
    setStep("review");
  };

  const onPayNow = async () => {
    const readiness = validateCheckoutReadiness();
    if (readiness.requiresAuth) { navigate("/login", { replace: true }); return; }
    if (!readiness.ok) return;

    setIsPaying(true);
    setStep("payment");
    setPaymentPhase("connecting");
    payStartedAt.current = Date.now();

    try {
      const sdkReady = await loadRazorpaySdk();
      if (!sdkReady) {
        setMessage("Unable to load payment gateway. Check network/ad-block settings and try again.");
        setIsPaying(false);
        setStep("review");
        payStartedAt.current = null;
        return;
      }

      setPaymentPhase("creating");
      const res = await withTimeout(
        fetch(`${apiBaseUrl}/api/payment/order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: cartSubtotal, currency: "INR", receipt: `tas_${Date.now()}`, notes: { userEmail: authUser?.email || "", userName: authUser?.name || "" } }),
        }),
        PAYMENT_API_TIMEOUT_MS,
        "Payment server timeout while creating order."
      );
      const data = await parseJsonResponse(res, "Payment server is not reachable.");
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Failed to create order.");

      // Store pending payment info so we can recover if the page reloads (mobile UPI flow)
      try { sessionStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify({ orderId: data.order.id, timestamp: Date.now() })); } catch {}

      setPaymentPhase("awaiting");
      const razorpay = new window.Razorpay({
        key: data.keyId, amount: data.order.amount, currency: data.order.currency,
        name: "The Art Shop", description: "Artwork Purchase", order_id: data.order.id,
        prefill: { name: shippingDetails.fullName || authUser?.name || "", email: authUser?.email || "", contact: shippingDetails.phone || "" },
        theme: { color: "#0f0f0f" },
        handler: async (result) => {
          try {
            setPaymentPhase("verifying");
            // Save payment ID for recovery if page gets killed during finalization
            try { sessionStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify({ orderId: result.razorpay_order_id, paymentId: result.razorpay_payment_id, timestamp: Date.now() })); } catch {}

            const vRes = await withTimeout(
              fetch(`${apiBaseUrl}/api/payment/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(result),
              }),
              PAYMENT_API_TIMEOUT_MS,
              "Payment verification timed out."
            );
            const vData = await parseJsonResponse(vRes, "Payment verification server is not reachable.");
            if (!vRes.ok || !vData?.ok) throw new Error(vData?.message || "Verification failed.");
            setPaymentPhase("finalizing");
            const fin = await withTimeout(
              finalizePaidOrder({ provider: "razorpay", status: "paid", razorpayOrderId: result.razorpay_order_id, razorpayPaymentId: result.razorpay_payment_id }),
              FINALIZE_TIMEOUT_MS,
              "Order finalization timed out. Don't worry — your payment is safe. Please check your email or contact support."
            );
            try { sessionStorage.removeItem(PENDING_PAYMENT_KEY); } catch {}
            if (fin.ok) {
              navigate("/order-success", { replace: true });
              return;
            }

            setMessage(fin?.message || "Payment was successful, but order saving failed. Please contact support with your payment ID.");
            setStep("review");
          } catch (err) {
            setMessage(err.message || "Verification failed.");
            setStep("review");
          } finally {
            setIsPaying(false);
            setPaymentPhase("");
            payStartedAt.current = null;
          }
        },
        modal: { ondismiss: () => { setIsPaying(false); setPaymentPhase(""); payStartedAt.current = null; setStep("review"); setMessage("Payment cancelled."); try { sessionStorage.removeItem(PENDING_PAYMENT_KEY); } catch {} } },
      });
      razorpay.open();
    } catch (err) { setMessage(err.message || "Checkout failed."); setIsPaying(false); setPaymentPhase(""); payStartedAt.current = null; setStep("review"); try { sessionStorage.removeItem(PENDING_PAYMENT_KEY); } catch {} }
  };

  const onCod = () => setMessage("COD is currently unavailable.");

  const selectedAddr = addressBook[selectedAddressIndex];
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <MainHeader />
      <div className="pt-20 sm:pt-24 pb-12 sm:pb-20 px-3 sm:px-6 md:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-0 mb-8 sm:mb-12">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div className={`flex items-center gap-1.5 sm:gap-2 ${i <= currentStepIndex ? "text-white" : "text-white/25"}`}>
                  <span className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-[10px] sm:text-xs font-bold border rounded-sm ${i < currentStepIndex ? "bg-white text-black border-white" : i === currentStepIndex ? "border-white" : "border-white/20"}`}>
                    {i < currentStepIndex ? "✓" : i + 1}
                  </span>
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.2em] font-semibold">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-8 sm:w-12 md:w-20 h-px mx-2 sm:mx-3 ${i < currentStepIndex ? "bg-white" : "bg-white/15"}`} />
                )}
              </div>
            ))}
          </div>

          {message && (
            <div className="mb-6 border border-white/15 bg-white/5 rounded-sm px-4 py-3 text-sm text-white/80">{message}</div>
          )}

          {/* STEP 1: Address */}
          {step === "address" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight mb-1.5 sm:mb-2">Delivery Address</h2>
              <p className="text-xs sm:text-sm text-white/50 mb-6 sm:mb-8">Where should we deliver your artwork?</p>

              {addressBook.length > 0 && !showAddForm && (
                <div className="space-y-3 mb-6">
                  {addressBook.map((addr, i) => (
                    <button
                      key={`${addr.fullName}-${addr.phone}-${i}`}
                      type="button"
                      onClick={() => setSelectedAddressIndex(i)}
                      className={`w-full text-left border rounded-sm p-3.5 sm:p-4 transition-all active:scale-[0.99] ${selectedAddressIndex === i ? "border-white bg-white/[0.06]" : "border-white/10 hover:border-white/25"}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-sm">{addr.fullName}</p>
                          <p className="text-xs text-white/60 mt-0.5">{addr.phone}</p>
                          <p className="text-xs text-white/50 mt-1">{addr.address}</p>
                          {addr.landmark && <p className="text-xs text-white/40 mt-0.5">{addr.landmark}</p>}
                        </div>
                        <span className={`w-4 h-4 rounded-full border-2 mt-1 shrink-0 ${selectedAddressIndex === i ? "border-white bg-white" : "border-white/30"}`} />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showAddForm && (
                <form onSubmit={saveAddress} className="border border-white/10 rounded-sm p-4 sm:p-5 mb-6 space-y-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-2">New Address</p>
                  <input value={addressForm.fullName} onChange={(e) => setAddressForm((p) => ({ ...p, fullName: e.target.value }))} className="w-full bg-transparent border border-white/15 rounded-sm px-4 py-3.5 text-sm outline-none focus:border-white/50 transition-colors" placeholder="Full name" />
                  <input value={addressForm.phone} onChange={(e) => setAddressForm((p) => ({ ...p, phone: e.target.value.replace(/[^0-9+\s-]/g, "") }))} className="w-full bg-transparent border border-white/15 rounded-sm px-4 py-3.5 text-sm outline-none focus:border-white/50 transition-colors" placeholder="Phone number" />
                  <input value={addressForm.landmark} onChange={(e) => setAddressForm((p) => ({ ...p, landmark: e.target.value }))} className="w-full bg-transparent border border-white/15 rounded-sm px-4 py-3.5 text-sm outline-none focus:border-white/50 transition-colors" placeholder="Landmark (optional)" />
                  <MapboxAddressInput value={addressForm.address} onChange={(a) => setAddressForm((p) => ({ ...p, address: a }))} onEdit={() => setMessage("")} />
                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={savingAddress} className="bg-white text-black rounded-sm px-6 py-3 text-xs uppercase tracking-[0.18em] font-bold active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center gap-2">{savingAddress && <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />}{savingAddress ? "Saving..." : "Save"}</button>
                    {addressBook.length > 0 && (
                      <button type="button" onClick={() => setShowAddForm(false)} className="border border-white/20 rounded-sm px-6 py-3 text-xs uppercase tracking-[0.18em] text-white/70 hover:bg-white/5 active:scale-[0.98] transition-transform">Cancel</button>
                    )}
                  </div>
                </form>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 pt-2">
                {!showAddForm && (
                  <button type="button" onClick={() => { setShowAddForm(true); setAddressForm({ fullName: authUser?.name || "", phone: "", landmark: "", address: "" }); }} className="text-xs uppercase tracking-[0.18em] text-white/50 hover:text-white/80 transition-colors">
                    + Add new address
                  </button>
                )}
                <div className="flex gap-2 sm:gap-3 sm:ml-auto">
                  <button type="button" onClick={() => navigate("/cart")} className="flex-1 sm:flex-none border border-white/20 rounded-sm px-4 sm:px-6 py-3 text-xs uppercase tracking-[0.18em] text-white/70 hover:bg-white/5 active:scale-[0.98] transition-transform">Back to Cart</button>
                  <button type="button" onClick={goToReview} disabled={!addressBook.length || showAddForm || continuing} className="flex-1 sm:flex-none bg-white text-black rounded-sm px-6 sm:px-8 py-3 text-xs uppercase tracking-[0.18em] font-bold active:scale-[0.98] transition-transform disabled:opacity-40 flex items-center justify-center gap-2">{continuing && <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />}{continuing ? "Loading..." : "Continue"}</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Review */}
          {step === "review" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight mb-1.5 sm:mb-2">Review Order</h2>
              <p className="text-xs sm:text-sm text-white/50 mb-6 sm:mb-8">Confirm your items and delivery details.</p>

              {/* Items */}
              <div className="border border-white/10 rounded-sm divide-y divide-white/10 mb-4 sm:mb-6">
                {cartItems.map((item) => {
                  const product = getProductById(item.productId);
                  if (!product) return null;
                  return (
                    <div key={`${item.productId}-${item.size}`} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
                      <img src={product.src} alt={product.title} className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-sm shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold uppercase truncate">{product.title}</p>
                        <p className="text-xs text-white/50">Size {item.size} · Qty {item.qty}</p>
                      </div>
                      <p className="text-sm font-bold shrink-0">₹{product.pricing[item.size] * item.qty}</p>
                    </div>
                  );
                })}
              </div>

              {/* Delivery Address */}
              <div className="border border-white/10 rounded-sm p-3 sm:p-4 mb-4 sm:mb-6">
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">Delivering to</p>
                <p className="text-sm font-semibold">{selectedAddr?.fullName}</p>
                <p className="text-xs text-white/60">{selectedAddr?.phone}</p>
                <p className="text-xs text-white/50 mt-1">{selectedAddr?.address}</p>
              </div>

              {/* Total */}
              <div className="flex items-end justify-between border border-white/10 rounded-sm p-3 sm:p-4 mb-6 sm:mb-8">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Total</p>
                <p className="text-2xl sm:text-3xl font-black">₹{cartSubtotal}</p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                <button type="button" onClick={() => setStep("address")} className="border border-white/20 rounded-sm px-4 sm:px-6 py-3 text-xs uppercase tracking-[0.18em] text-white/70 hover:bg-white/5 active:scale-[0.98] transition-transform">Change Address</button>
                <div className="flex gap-2 sm:gap-3">
                  <button type="button" onClick={onCod} className="flex-1 sm:flex-none border border-white/20 rounded-sm px-4 sm:px-6 py-3 text-xs uppercase tracking-[0.18em] text-white/70 hover:bg-white/5 active:scale-[0.98] transition-transform">COD</button>
                  <button type="button" onClick={onPayNow} disabled={isPaying} className="flex-1 sm:flex-none bg-white text-black rounded-sm px-6 sm:px-8 py-3 text-xs uppercase tracking-[0.18em] font-bold active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2">{isPaying && <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />}{isPaying ? "Processing..." : "Pay Now"}</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Payment Processing */}
          {step === "payment" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 sm:py-20">
              {/* Animated concentric rings */}
              <div className="relative w-24 h-24 mx-auto mb-8">
                <motion.div
                  className="absolute inset-0 rounded-full border border-white/10"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute inset-2 rounded-full border border-white/15"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                />
                <motion.div
                  className="absolute inset-4 rounded-full border border-white/20"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  style={{ borderTopColor: "white" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.svg
                    width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                    className="text-white"
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {paymentPhase === "verifying" || paymentPhase === "finalizing" ? (
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                  </motion.svg>
                </div>
              </div>

              {/* Phase messages */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={paymentPhase}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-sm sm:text-base font-bold uppercase tracking-[0.2em] text-white mb-2">
                    {paymentPhase === "connecting" && "Connecting..."}
                    {paymentPhase === "creating" && "Creating Order..."}
                    {paymentPhase === "awaiting" && "Awaiting Payment..."}
                    {paymentPhase === "verifying" && "Verifying Payment..."}
                    {paymentPhase === "finalizing" && "Finalizing Order..."}
                    {!paymentPhase && "Processing..."}
                  </p>
                  <p className="text-xs text-white/40 tracking-[0.1em]">
                    {paymentPhase === "connecting" && "Setting up secure connection"}
                    {paymentPhase === "creating" && "Preparing your order with the payment gateway"}
                    {paymentPhase === "awaiting" && "Complete payment in the popup window"}
                    {paymentPhase === "verifying" && "Confirming with payment provider"}
                    {paymentPhase === "finalizing" && "Saving your order — almost done"}
                    {!paymentPhase && "Please wait"}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-2 mt-8">
                {["connecting", "creating", "awaiting", "verifying", "finalizing"].map((phase, i) => {
                  const phases = ["connecting", "creating", "awaiting", "verifying", "finalizing"];
                  const currentIdx = phases.indexOf(paymentPhase);
                  return (
                    <motion.div
                      key={phase}
                      className={`w-1.5 h-1.5 rounded-full ${i <= currentIdx ? "bg-white" : "bg-white/15"}`}
                      animate={i === currentIdx ? { scale: [1, 1.4, 1] } : {}}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                  );
                })}
              </div>

              <p className="text-[9px] text-white/20 uppercase tracking-[0.3em] mt-6">Do not close this page</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
