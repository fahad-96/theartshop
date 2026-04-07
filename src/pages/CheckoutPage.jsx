import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  const [addressBook, setAddressBook] = useState([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({ fullName: "", phone: "", landmark: "", address: "" });

  const {
    authUser, authReady, cartItems, cartSubtotal, getProductById,
    shippingDetails, validateCheckoutReadiness, finalizePaidOrder,
    updateProfileAddressDetails, setCartMessage,
  } = useShop();

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
    try { await withTimeout(updateProfileAddressDetails(addr), ADDRESS_SYNC_TIMEOUT_MS, "Sync timed out."); } catch { /* ok */ }
    setMessage("");
    setStep("review");
  };

  const onPayNow = async () => {
    const readiness = validateCheckoutReadiness();
    if (readiness.requiresAuth) { navigate("/login", { replace: true }); return; }
    if (!readiness.ok) return;

    setIsPaying(true);
    setStep("payment");

    try {
      const sdkReady = await loadRazorpaySdk();
      if (!sdkReady) { setMessage("Unable to load payment gateway."); setIsPaying(false); return; }

      const res = await fetch(`${apiBaseUrl}/api/payment/order`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: cartSubtotal, currency: "INR", receipt: `tas_${Date.now()}`, notes: { userEmail: authUser?.email || "", userName: authUser?.name || "" } }),
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) throw new Error("Payment server is not reachable.");
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Failed to create order.");

      const razorpay = new window.Razorpay({
        key: data.keyId, amount: data.order.amount, currency: data.order.currency,
        name: "The Art Shop", description: "Artwork Purchase", order_id: data.order.id,
        prefill: { name: shippingDetails.fullName || authUser?.name || "", email: authUser?.email || "", contact: shippingDetails.phone || "" },
        theme: { color: "#0f0f0f" },
        handler: async (result) => {
          try {
            const vRes = await fetch(`${apiBaseUrl}/api/payment/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(result) });
            const vData = await vRes.json();
            if (!vRes.ok || !vData?.ok) throw new Error(vData?.message || "Verification failed.");
            const fin = await finalizePaidOrder({ provider: "razorpay", status: "paid", razorpayOrderId: result.razorpay_order_id, razorpayPaymentId: result.razorpay_payment_id });
            if (fin.ok) navigate("/order-success", { replace: true });
          } catch (err) { setMessage(err.message || "Verification failed."); } finally { setIsPaying(false); }
        },
        modal: { ondismiss: () => { setIsPaying(false); setStep("review"); setMessage("Payment cancelled."); } },
      });
      razorpay.open();
    } catch (err) { setMessage(err.message || "Checkout failed."); setIsPaying(false); setStep("review"); }
  };

  const onCod = () => setMessage("COD is currently unavailable.");

  const selectedAddr = addressBook[selectedAddressIndex];
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <MainHeader />
      <div className="pt-24 pb-20 px-4 md:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-0 mb-12">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div className={`flex items-center gap-2 ${i <= currentStepIndex ? "text-white" : "text-white/25"}`}>
                  <span className={`w-7 h-7 flex items-center justify-center text-xs font-bold border ${i < currentStepIndex ? "bg-white text-black border-white" : i === currentStepIndex ? "border-white" : "border-white/20"}`}>
                    {i < currentStepIndex ? "✓" : i + 1}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-semibold hidden sm:block">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-12 sm:w-20 h-px mx-3 ${i < currentStepIndex ? "bg-white" : "bg-white/15"}`} />
                )}
              </div>
            ))}
          </div>

          {message && (
            <div className="mb-6 border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80">{message}</div>
          )}

          {/* STEP 1: Address */}
          {step === "address" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-2">Delivery Address</h2>
              <p className="text-sm text-white/50 mb-8">Where should we deliver your artwork?</p>

              {addressBook.length > 0 && !showAddForm && (
                <div className="space-y-3 mb-6">
                  {addressBook.map((addr, i) => (
                    <button
                      key={`${addr.fullName}-${addr.phone}-${i}`}
                      type="button"
                      onClick={() => setSelectedAddressIndex(i)}
                      className={`w-full text-left border p-4 transition-all ${selectedAddressIndex === i ? "border-white bg-white/[0.06]" : "border-white/10 hover:border-white/25"}`}
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
                <form onSubmit={saveAddress} className="border border-white/10 p-5 mb-6 space-y-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-2">New Address</p>
                  <input value={addressForm.fullName} onChange={(e) => setAddressForm((p) => ({ ...p, fullName: e.target.value }))} className="w-full bg-transparent border border-white/15 px-4 py-3 text-sm outline-none focus:border-white/50 transition-colors" placeholder="Full name" />
                  <input value={addressForm.phone} onChange={(e) => setAddressForm((p) => ({ ...p, phone: e.target.value.replace(/[^0-9+\s-]/g, "") }))} className="w-full bg-transparent border border-white/15 px-4 py-3 text-sm outline-none focus:border-white/50 transition-colors" placeholder="Phone number" />
                  <input value={addressForm.landmark} onChange={(e) => setAddressForm((p) => ({ ...p, landmark: e.target.value }))} className="w-full bg-transparent border border-white/15 px-4 py-3 text-sm outline-none focus:border-white/50 transition-colors" placeholder="Landmark (optional)" />
                  <MapboxAddressInput value={addressForm.address} onChange={(a) => setAddressForm((p) => ({ ...p, address: a }))} onEdit={() => setMessage("")} />
                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={savingAddress} className="bg-white text-black px-6 py-2.5 text-xs uppercase tracking-[0.18em] font-bold disabled:opacity-50">{savingAddress ? "Saving..." : "Save"}</button>
                    {addressBook.length > 0 && (
                      <button type="button" onClick={() => setShowAddForm(false)} className="border border-white/20 px-6 py-2.5 text-xs uppercase tracking-[0.18em] text-white/70 hover:bg-white/5">Cancel</button>
                    )}
                  </div>
                </form>
              )}

              <div className="flex items-center justify-between gap-4 pt-2">
                {!showAddForm && (
                  <button type="button" onClick={() => { setShowAddForm(true); setAddressForm({ fullName: authUser?.name || "", phone: "", landmark: "", address: "" }); }} className="text-xs uppercase tracking-[0.18em] text-white/50 hover:text-white/80 transition-colors">
                    + Add new address
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button type="button" onClick={() => navigate("/cart")} className="border border-white/20 px-6 py-2.5 text-xs uppercase tracking-[0.18em] text-white/70 hover:bg-white/5">Back to Cart</button>
                  <button type="button" onClick={goToReview} disabled={!addressBook.length || showAddForm} className="bg-white text-black px-8 py-2.5 text-xs uppercase tracking-[0.18em] font-bold disabled:opacity-40">Continue</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Review */}
          {step === "review" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-2">Review Order</h2>
              <p className="text-sm text-white/50 mb-8">Confirm your items and delivery details.</p>

              {/* Items */}
              <div className="border border-white/10 divide-y divide-white/10 mb-6">
                {cartItems.map((item) => {
                  const product = getProductById(item.productId);
                  if (!product) return null;
                  return (
                    <div key={`${item.productId}-${item.size}`} className="flex items-center gap-4 p-4">
                      <img src={product.src} alt={product.title} className="w-14 h-14 object-cover shrink-0" />
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
              <div className="border border-white/10 p-4 mb-6">
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">Delivering to</p>
                <p className="text-sm font-semibold">{selectedAddr?.fullName}</p>
                <p className="text-xs text-white/60">{selectedAddr?.phone}</p>
                <p className="text-xs text-white/50 mt-1">{selectedAddr?.address}</p>
              </div>

              {/* Total */}
              <div className="flex items-end justify-between border border-white/10 p-4 mb-8">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Total</p>
                <p className="text-3xl font-black">₹{cartSubtotal}</p>
              </div>

              <div className="flex items-center justify-between gap-4">
                <button type="button" onClick={() => setStep("address")} className="border border-white/20 px-6 py-2.5 text-xs uppercase tracking-[0.18em] text-white/70 hover:bg-white/5">Change Address</button>
                <div className="flex gap-3">
                  <button type="button" onClick={onCod} className="border border-white/20 px-6 py-2.5 text-xs uppercase tracking-[0.18em] text-white/70 hover:bg-white/5">COD</button>
                  <button type="button" onClick={onPayNow} disabled={isPaying} className="bg-white text-black px-8 py-2.5 text-xs uppercase tracking-[0.18em] font-bold disabled:opacity-50">{isPaying ? "Processing..." : "Pay Now"}</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Payment Processing */}
          {step === "payment" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-6" />
              <p className="text-sm uppercase tracking-[0.2em] text-white/60">Processing payment...</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
