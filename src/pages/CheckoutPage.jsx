import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MainHeader from "../components/MainHeader";
import MapboxAddressInput from "../components/MapboxAddressInput";
import { useShop } from "../context/ShopContext";
import { sizeDimensions } from "../data/products";

const ADDRESS_BOOK_STORAGE_KEY_PREFIX = "tas-address-book";
const ADDRESS_SYNC_TIMEOUT_MS = 6000;

const withTimeout = (promise, timeoutMs, timeoutMessage) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

const steps = [
  { key: "address", label: "Address" },
  { key: "review", label: "Review" },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState("address");
  const [message, setMessage] = useState("");
  const [addressBook, setAddressBook] = useState([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({ fullName: "", phone: "", landmark: "", pincode: "", address: "" });
  const [continuing, setContinuing] = useState(false);

  const {
    authUser, authReady, cartItems, cartSubtotal, getProductById,
    shippingDetails, updateProfileAddressDetails, setCartMessage,
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
    const normalized = { fullName: addressForm.fullName.trim(), phone: addressForm.phone.trim(), landmark: addressForm.landmark.trim(), pincode: addressForm.pincode.trim(), address: addressForm.address.trim() };
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

  const goToPayment = () => {
    const addr = addressBook[selectedAddressIndex];
    if (!addr) { setMessage("Please select an address first."); return; }
    navigate("/payment", {
      state: {
        items: cartItems.map((item) => {
          const product = getProductById(item.productId);
          return {
            title: product?.title || "Unknown",
            size: item.size,
            qty: item.qty,
            price: product?.pricing?.[item.size] || 0,
          };
        }),
        subtotal: cartSubtotal,
        shipping: { ...addr },
      },
    });
  };

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
                          {addr.pincode && <p className="text-xs text-white/40 mt-0.5">PIN: {addr.pincode}</p>}
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
                  <input value={addressForm.pincode} onChange={(e) => setAddressForm((p) => ({ ...p, pincode: e.target.value.replace(/[^0-9]/g, "").slice(0, 6) }))} className="w-full bg-transparent border border-white/15 rounded-sm px-4 py-3.5 text-sm outline-none focus:border-white/50 transition-colors" placeholder="Pincode" maxLength={6} inputMode="numeric" />
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
                  <button type="button" onClick={() => { setShowAddForm(true); setAddressForm({ fullName: authUser?.name || "", phone: "", landmark: "", pincode: "", address: "" }); }} className="text-xs uppercase tracking-[0.18em] text-white/50 hover:text-white/80 transition-colors">
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
                <button type="button" onClick={goToPayment} className="bg-white text-black rounded-sm px-6 sm:px-8 py-3 text-xs uppercase tracking-[0.18em] font-bold active:scale-[0.98] transition-transform flex items-center justify-center gap-2">Continue to Payment</button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
