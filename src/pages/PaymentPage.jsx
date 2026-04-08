import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MainHeader from "../components/MainHeader";
import { useShop } from "../context/ShopContext";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
const PAYMENT_API_TIMEOUT_MS = 20000;
const PENDING_KEY = "tas-pending-order";
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

  // Phase: ready → saving → connecting → awaiting → confirming → done | error
  const [phase, setPhase] = useState("ready");
  const [errorMsg, setErrorMsg] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [paymentIdStr, setPaymentIdStr] = useState("");

  const paymentDoneRef = useRef(false);
  const orderSavedRef = useRef(false);
  const snapshotRef = useRef(null);
  const attemptedRecoveryRef = useRef(false);

  // ── Build order snapshot ──
  // Capture everything we need on mount so it's immune to state changes
  useEffect(() => {
    const routeState = location.state;
    if (routeState?.items?.length && routeState?.subtotal && routeState?.shipping) {
      snapshotRef.current = routeState;
      try { sessionStorage.setItem(PENDING_KEY + "-snapshot", JSON.stringify(routeState)); } catch {}
    } else if (cartItems.length && cartSubtotal > 0) {
      const snap = {
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
      };
      snapshotRef.current = snap;
      try { sessionStorage.setItem(PENDING_KEY + "-snapshot", JSON.stringify(snap)); } catch {}
    } else {
      // Try sessionStorage fallback
      try {
        const saved = sessionStorage.getItem(PENDING_KEY + "-snapshot");
        if (saved) snapshotRef.current = JSON.parse(saved);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Recovery: if we saved an order but page died before confirming ──
  useEffect(() => {
    if (!authReady || attemptedRecoveryRef.current) return;
    attemptedRecoveryRef.current = true;

    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const { orderRef: savedRef, razorpayOrderId, timestamp } = JSON.parse(raw);
      const age = Date.now() - timestamp;
      if (!savedRef || age > 600_000) {
        sessionStorage.removeItem(PENDING_KEY);
        return;
      }

      // Check if this order already got confirmed in Supabase
      if (isSupabaseConfigured && supabase && authUser?.id) {
        supabase
          .from("orders")
          .select("status")
          .eq("order_ref", savedRef)
          .eq("user_id", authUser.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data && data.status?.toLowerCase() === "paid") {
              // Already confirmed — go to success
              sessionStorage.removeItem(PENDING_KEY);
              sessionStorage.removeItem(PENDING_KEY + "-snapshot");
              clearCart();
              navigate("/order-success", { replace: true });
            }
            // If still pending, the user can retry payment on this page
          });
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);

  // ── Guard: redirect if no data ──
  useEffect(() => {
    if (authReady && !authUser) { navigate("/login", { replace: true }); return; }
    // Give a tick for snapshot to populate
    const timer = setTimeout(() => {
      if (!snapshotRef.current && !cartItems.length && phase === "ready") {
        navigate("/checkout", { replace: true });
      }
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, authUser]);

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
    const snap = snapshotRef.current;
    if (!snap || !authUser?.id || paymentDoneRef.current) return;

    setErrorMsg("");
    setPhase("saving");

    const ref = generateOrderRef();
    setOrderRef(ref);

    try {
      // ─── STEP 1: Save order to Supabase with status "pending" ───
      // This ensures the order exists BEFORE any money moves.
      if (!isSupabaseConfigured || !supabase) throw new Error("Order service is not available.");

      // Refresh auth token (critical after mobile tab suspension)
      try { await supabase.auth.getSession(); } catch {}

      const { error: insertErr } = await supabase.from("orders").insert({
        user_id: authUser.id,
        order_ref: ref,
        amount: snap.subtotal,
        currency: "INR",
        status: "pending",
        items: snap.items,
        shipping: snap.shipping,
        payment: {},
      });

      if (insertErr) {
        // If it's a duplicate key, order already exists — that's fine
        if (!insertErr.message?.toLowerCase().includes("duplicate")) {
          throw new Error(`Could not create order: ${insertErr.message}`);
        }
      }

      orderSavedRef.current = true;

      // Persist recovery info
      try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ orderRef: ref, timestamp: Date.now() })); } catch {}

      // ─── STEP 2: Create Razorpay order ───
      setPhase("connecting");

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

      // Update recovery info with razorpay order id
      try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ orderRef: ref, razorpayOrderId: rpData.order.id, timestamp: Date.now() })); } catch {}

      // ─── STEP 3: Open Razorpay checkout ───
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

        // ─── STEP 4: Payment success handler ───
        handler: async (result) => {
          // Payment is DONE — user has been charged.
          paymentDoneRef.current = true;
          setPhase("confirming");
          setPaymentIdStr(result.razorpay_payment_id || "");

          const paymentPayload = {
            provider: "razorpay",
            status: "paid",
            razorpayOrderId: result.razorpay_order_id,
            razorpayPaymentId: result.razorpay_payment_id,
          };

          // Try to update order status via RPC (up to 3 attempts)
          let confirmed = false;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              // Refresh auth token before each attempt
              try { await supabase.auth.getSession(); } catch {}

              const { data: rpcResult, error: rpcErr } = await supabase.rpc(
                "confirm_order_payment",
                { p_order_ref: ref, p_payment: paymentPayload }
              );

              if (rpcErr) {
                // RPC function might not exist yet — fallback to direct update
                console.warn("RPC error, trying direct update:", rpcErr.message);
                const { error: updateErr } = await supabase
                  .from("orders")
                  .update({ status: "Paid", payment: paymentPayload, updated_at: new Date().toISOString() })
                  .eq("order_ref", ref)
                  .eq("user_id", authUser.id);
                if (!updateErr) { confirmed = true; break; }
                console.warn("Direct update also failed:", updateErr.message);
              } else {
                const parsed = typeof rpcResult === "string" ? JSON.parse(rpcResult) : rpcResult;
                if (parsed?.ok) { confirmed = true; break; }
              }
            } catch (e) {
              console.warn(`Confirm attempt ${attempt + 1} failed:`, e.message);
            }
            if (attempt < 2) await new Promise((r) => setTimeout(r, 2000));
          }

          // Clear cart and pending state regardless
          clearCart();
          try { sessionStorage.removeItem(PENDING_KEY); } catch {}
          try { sessionStorage.removeItem(PENDING_KEY + "-snapshot"); } catch {}

          // Send email notification
          sendEmailNotification(ref, snap, paymentPayload);

          if (confirmed) {
            setPhase("done");
            navigate("/order-success", { replace: true });
          } else {
            // Order exists as "pending" in DB — admin can see it.
            // Still navigate to success since order IS saved and payment IS done.
            setPhase("done");
            navigate("/order-success", { replace: true });
          }
        },

        // ─── Payment modal dismissed ───
        modal: {
          ondismiss: () => {
            if (paymentDoneRef.current) return;
            setPhase("ready");
            setErrorMsg("Payment was cancelled. Your order is saved — you can retry.");
          },
        },
      });

      razorpay.open();
    } catch (err) {
      if (paymentDoneRef.current) return; // Never block after payment
      setPhase("error");
      setErrorMsg(err.message || "Something went wrong.");
    }
  };

  // ── Render ──

  const snap = snapshotRef.current;
  const showLoading = !authReady || (!snap && !cartItems.length);

  if (showLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const displayItems = snap?.items || [];
  const displayTotal = snap?.subtotal || 0;
  const displayShipping = snap?.shipping || {};

  const isProcessing = ["saving", "connecting", "awaiting", "confirming"].includes(phase);

  const phaseLabels = {
    saving: { title: "Saving Order...", sub: "Creating your order before payment" },
    connecting: { title: "Connecting...", sub: "Setting up secure payment gateway" },
    awaiting: { title: "Awaiting Payment...", sub: "Complete payment in the popup window" },
    confirming: { title: "Confirming...", sub: "Updating your order — almost done" },
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
                    {phase === "confirming" ? (
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
                    )}
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
                {["saving", "connecting", "awaiting", "confirming"].map((p, i) => {
                  const currentIdx = ["saving", "connecting", "awaiting", "confirming"].indexOf(phase);
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
