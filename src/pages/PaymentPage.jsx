import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MainHeader from "../components/MainHeader";
import { useShop } from "../context/ShopContext";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
const PAYMENT_API_TIMEOUT_MS = 20000;
const notifyApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

// ── Helpers ──

const withTimeout = (promise, ms, msg) => {
  let tid;
  const t = new Promise((_, rej) => { tid = setTimeout(() => rej(new Error(msg)), ms); });
  return Promise.race([promise, t]).finally(() => clearTimeout(tid));
};

const loadRazorpaySdk = () =>
  new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

const generateOrderRef = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TA-${ts}-${rand}`;
};

// ── Component ──

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    authUser, authReady, cartItems, cartSubtotal,
    getProductById, shippingDetails, clearCart,
  } = useShop();

  // Phase: ready → connecting → awaiting → done | error
  const [phase, setPhase] = useState("ready");
  const [errorMsg, setErrorMsg] = useState("");
  const [snapshot, setSnapshot] = useState(null);

  const paymentDoneRef = useRef(false);

  // ── Build order snapshot on mount ──
  useEffect(() => {
    const routeState = location.state;
    if (routeState?.items?.length && routeState?.subtotal && routeState?.shipping) {
      setSnapshot(routeState);
    } else if (cartItems.length && cartSubtotal > 0) {
      setSnapshot({
        items: cartItems.map((ci) => {
          const p = getProductById(ci.productId);
          return {
            title: p?.title || "Unknown",
            size: ci.size,
            qty: ci.qty,
            price: p?.pricing?.[ci.size] || 0,
          };
        }),
        subtotal: cartSubtotal,
        shipping: { ...shippingDetails },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Guard: redirect if no data ──
  useEffect(() => {
    if (authReady && !authUser) { navigate("/login", { replace: true }); return; }
    const timer = setTimeout(() => {
      if (!snapshot && !cartItems.length && phase === "ready") {
        navigate("/checkout", { replace: true });
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, authUser, snapshot]);

  // ── Save order to DB (fire-and-forget after payment) ──
  const saveOrderToDb = async (ref, snap, paymentPayload) => {
    if (!isSupabaseConfigured || !supabase || !authUser?.id) return;
    try {
      await supabase.auth.getSession();
    } catch {}

    // Insert order with status "Paid"
    const { error: insertErr } = await supabase.from("orders").insert({
      user_id: authUser.id,
      order_ref: ref,
      amount: snap.subtotal,
      currency: "INR",
      status: "Paid",
      items: snap.items,
      shipping: snap.shipping,
      payment: paymentPayload,
    });

    if (insertErr && !insertErr.message?.toLowerCase().includes("duplicate")) {
      console.warn("Order save failed:", insertErr.message);
    }
  };

  // ── Send email notification (fire-and-forget) ──
  const sendEmailNotification = (ref, snap, payment) => {
    try {
      fetch(`${notifyApiBaseUrl}/api/notify/order-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderRef: ref,
          amount: snap.subtotal,
          items: snap.items,
          shipping: { ...snap.shipping, email: authUser?.email || "" },
          payment,
        }),
      }).catch(() => {});
    } catch {}
  };

  // ── MAIN PAYMENT FLOW ──
  const handlePay = async () => {
    const snap = snapshot;
    if (!snap || !authUser?.id || paymentDoneRef.current) return;

    setErrorMsg("");
    setPhase("connecting");

    const ref = generateOrderRef();

    try {
      // ─── STEP 1: Load Razorpay SDK & create payment order ───
      const sdkLoaded = await loadRazorpaySdk();
      if (!sdkLoaded) throw new Error("Could not load payment gateway. Check your network or disable ad-blockers.");

      const res = await withTimeout(
        fetch(`${apiBaseUrl}/api/payment/order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: snap.subtotal,
            currency: "INR",
            receipt: ref,
            notes: { userEmail: authUser.email || "", orderRef: ref },
          }),
        }),
        PAYMENT_API_TIMEOUT_MS,
        "Payment server did not respond in time."
      );

      const rpData = await res.json().catch(() => null);
      if (!res.ok || !rpData?.ok) throw new Error(rpData?.message || "Payment gateway returned an error.");

      // ─── STEP 2: Open Razorpay checkout ───
      setPhase("awaiting");

      const razorpay = new window.Razorpay({
        key: rpData.keyId,
        amount: rpData.order.amount,
        currency: rpData.order.currency,
        name: "The Art Shop",
        description: "Artwork Purchase",
        order_id: rpData.order.id,
        prefill: {
          name: snap.shipping.fullName || authUser.name || "",
          email: authUser.email || "",
          contact: snap.shipping.phone || "",
        },
        theme: { color: "#0f0f0f" },

        // ─── STEP 3: Payment success → save order → send email → navigate ───
        handler: async (result) => {
          paymentDoneRef.current = true;

          const paymentPayload = {
            provider: "razorpay",
            status: "paid",
            razorpayOrderId: result.razorpay_order_id,
            razorpayPaymentId: result.razorpay_payment_id,
          };

          // Clear cart immediately
          clearCart();

          // Navigate to success page right away
          navigate("/order-success", { replace: true });

          // Save order to DB and send email in background
          saveOrderToDb(ref, snap, paymentPayload);
          sendEmailNotification(ref, snap, paymentPayload);
        },

        // ─── Payment modal dismissed ───
        modal: {
          ondismiss: () => {
            if (paymentDoneRef.current) return;
            setPhase("ready");
            setErrorMsg("Payment was cancelled. You can retry anytime.");
          },
        },
      });

      razorpay.open();
    } catch (err) {
      if (paymentDoneRef.current) return;
      setPhase("ready");
      setErrorMsg(err.message || "Something went wrong.");
    }
  };

  // ── Render ──

  const showLoading = !authReady || (!snapshot && !cartItems.length);

  if (showLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const displayItems = snapshot?.items || [];
  const displayTotal = snapshot?.subtotal || 0;
  const displayShipping = snapshot?.shipping || {};

  const isProcessing = ["connecting", "awaiting"].includes(phase);

  const phaseLabels = {
    connecting: { title: "Connecting...", sub: "Setting up secure payment gateway" },
    awaiting: { title: "Awaiting Payment...", sub: "Complete payment in the popup window" },
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <MainHeader />
      <div className="pt-20 sm:pt-24 pb-12 sm:pb-20 px-3 sm:px-6 md:px-8">
        <div className="max-w-2xl mx-auto">

          {/* ── Processing overlay ── */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 sm:py-24"
            >
              <div className="relative w-20 h-20 mx-auto mb-8">
                <motion.div
                  className="absolute inset-0 rounded-full border border-white/10"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute inset-3 rounded-full border border-white/20"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  style={{ borderTopColor: "white" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.svg
                    width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                    className="text-white"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.svg>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={phase}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <p className="text-sm sm:text-base font-bold uppercase tracking-[0.2em] mb-2">
                    {phaseLabels[phase]?.title || "Processing..."}
                  </p>
                  <p className="text-xs text-white/40 tracking-wider">
                    {phaseLabels[phase]?.sub || "Please wait"}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-center gap-2 mt-8">
                {["connecting", "awaiting"].map((p, i) => {
                  const currentIdx = ["connecting", "awaiting"].indexOf(phase);
                  return (
                    <motion.div
                      key={p}
                      className={`w-1.5 h-1.5 rounded-full ${i <= currentIdx ? "bg-white" : "bg-white/15"}`}
                      animate={i === currentIdx ? { scale: [1, 1.4, 1] } : {}}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                  );
                })}
              </div>

              <p className="text-[9px] text-white/20 uppercase tracking-[0.3em] mt-6">
                Do not close this page
              </p>
            </motion.div>
          )}

          {/* ── Ready / Error state: show order summary + pay button ── */}
          {!isProcessing && phase !== "done" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight mb-1.5 sm:mb-2">Payment</h2>
              <p className="text-xs sm:text-sm text-white/50 mb-6 sm:mb-8">Review and pay for your order.</p>

              {/* Error message */}
              {errorMsg && (
                <div className="mb-6 border border-amber-500/20 bg-amber-500/[0.06] rounded-sm px-4 py-3 text-sm text-amber-200/90">
                  {errorMsg}
                </div>
              )}

              {/* Order items */}
              <div className="border border-white/10 rounded-sm divide-y divide-white/10 mb-4">
                {displayItems.map((item, i) => (
                  <div key={`${item.title}-${item.size}-${i}`} className="flex items-center justify-between p-3 sm:p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold uppercase truncate">{item.title}</p>
                      <p className="text-xs text-white/50">Size {item.size} · Qty {item.qty}</p>
                    </div>
                    <p className="text-sm font-bold shrink-0 ml-3">₹{(item.price || 0) * item.qty}</p>
                  </div>
                ))}
              </div>

              {/* Delivery address */}
              <div className="border border-white/10 rounded-sm p-3 sm:p-4 mb-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">Delivering to</p>
                <p className="text-sm font-semibold">{displayShipping.fullName || "—"}</p>
                <p className="text-xs text-white/60">{displayShipping.phone || ""}</p>
                <p className="text-xs text-white/50 mt-1">{displayShipping.address || ""}</p>
              </div>

              {/* Total */}
              <div className="flex items-end justify-between border border-white/10 rounded-sm p-3 sm:p-4 mb-8">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Total</p>
                <p className="text-2xl sm:text-3xl font-black">₹{displayTotal}</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/checkout")}
                  className="border border-white/20 rounded-sm px-6 py-3.5 text-xs uppercase tracking-[0.18em] text-white/70 hover:bg-white/5 active:scale-[0.98] transition-transform"
                >
                  Back to Checkout
                </button>
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={paymentDoneRef.current}
                  className="bg-white text-black rounded-sm px-8 py-3.5 text-xs uppercase tracking-[0.18em] font-bold active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Pay ₹{displayTotal}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
