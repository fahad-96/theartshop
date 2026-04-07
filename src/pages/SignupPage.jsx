import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";

export default function SignupPage() {
  const navigate = useNavigate();
  const { authUser, authReady, authError, setAuthError, signup, fulfillPendingBuy } = useShop();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    address: "",
  });

  useEffect(() => {
    if (authReady && authUser) {
      navigate("/", { replace: true });
    }
  }, [authReady, authUser, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const result = await signup(form);
    if (!result.ok) return;

    const pending = fulfillPendingBuy();
    if (pending.added) {
      navigate("/cart", { replace: true });
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-xl border border-white/15 bg-white/[0.04] backdrop-blur-sm p-8 md:p-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Sign Up</h2>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-xs uppercase tracking-[0.25em] text-white/70 hover:text-white"
          >
            Back
          </button>
        </div>

        {authError && (
          <p
            className={`mb-5 text-sm p-3 border ${
              authError.toLowerCase().includes("verify your email")
                ? "text-amber-200 border-amber-400/40 bg-amber-400/10"
                : "text-rose-300 border-rose-400/40 bg-rose-400/10"
            }`}
          >
            {authError}
          </p>
        )}

        <form className="space-y-4" onSubmit={onSubmit}>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, name: e.target.value }));
              setAuthError("");
            }}
            placeholder="Full Name"
            className="w-full bg-black/40 border border-white/20 px-4 py-3 outline-none focus:border-white"
          />
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, email: e.target.value }));
              setAuthError("");
            }}
            placeholder="Email"
            className="w-full bg-black/40 border border-white/20 px-4 py-3 outline-none focus:border-white"
          />
          <input
            type="password"
            minLength={6}
            required
            value={form.password}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, password: e.target.value }));
              setAuthError("");
            }}
            placeholder="Password (min 6 chars)"
            className="w-full bg-black/40 border border-white/20 px-4 py-3 outline-none focus:border-white"
          />
          <button type="submit" className="w-full bg-white text-black py-3 uppercase tracking-[0.2em] font-bold">
            Create Account
          </button>
        </form>

        <div className="mt-6 text-sm text-white/70">
          Already have an account?{" "}
          <Link to="/login" className="text-white underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
