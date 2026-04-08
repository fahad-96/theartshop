import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useShop } from "../context/ShopContext";

const ease = [0.22, 1, 0.36, 1];

export default function LoginPage() {
  const navigate = useNavigate();
  const { authUser, authReady, authError, setAuthError, login, fulfillPendingBuy } = useShop();
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authReady && authUser) {
      navigate("/", { replace: true });
    }
  }, [authReady, authUser, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await login(form);
    if (!result.ok) { setSubmitting(false); return; }

    const pending = fulfillPendingBuy();
    if (pending.added) {
      navigate("/cart", { replace: true });
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-[100svh] bg-[#050505] text-white flex items-center justify-center px-4 sm:px-6 py-20 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="w-full max-w-md sm:max-w-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 sm:p-8 md:p-10 rounded-sm"
      >
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight">Login</h2>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-white/50 hover:text-white transition-colors py-1"
          >
            Back
          </button>
        </div>

        {authError && (
          <p className="mb-4 sm:mb-5 text-xs sm:text-sm text-rose-300 border border-rose-400/40 bg-rose-400/10 p-3 rounded-sm">{authError}</p>
        )}

        <form className="space-y-3 sm:space-y-4" onSubmit={onSubmit}>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, email: e.target.value }));
              setAuthError("");
            }}
            placeholder="Email"
            className="w-full bg-black/40 border border-white/15 px-4 py-3.5 outline-none focus:border-white/50 transition-colors text-sm rounded-sm"
          />
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, password: e.target.value }));
              setAuthError("");
            }}
            placeholder="Password"
            className="w-full bg-black/40 border border-white/15 px-4 py-3.5 outline-none focus:border-white/50 transition-colors text-sm rounded-sm"
          />
          <button type="submit" disabled={submitting} className="w-full bg-white text-black py-3.5 uppercase tracking-[0.2em] font-bold text-xs sm:text-sm hover:bg-white/90 active:scale-[0.99] transition-all rounded-sm disabled:opacity-60 flex items-center justify-center gap-2">
            {submitting && <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />}
            {submitting ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="mt-5 sm:mt-6 text-xs sm:text-sm text-white/60">
          New here?{" "}
          <Link to="/signup" className="text-white underline hover:text-white/80 transition-colors">
            Create account
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
