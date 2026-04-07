import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { authUser, authReady, authError, setAuthError, login, fulfillPendingBuy } = useShop();
  const [form, setForm] = useState({ email: "", password: "" });

  useEffect(() => {
    if (authReady && authUser) {
      navigate("/", { replace: true });
    }
  }, [authReady, authUser, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const result = await login(form);
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
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Login</h2>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-xs uppercase tracking-[0.25em] text-white/70 hover:text-white"
          >
            Back
          </button>
        </div>

        {authError && (
          <p className="mb-5 text-sm text-rose-300 border border-rose-400/40 bg-rose-400/10 p-3">{authError}</p>
        )}

        <form className="space-y-4" onSubmit={onSubmit}>
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
            required
            value={form.password}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, password: e.target.value }));
              setAuthError("");
            }}
            placeholder="Password"
            className="w-full bg-black/40 border border-white/20 px-4 py-3 outline-none focus:border-white"
          />
          <button type="submit" className="w-full bg-white text-black py-3 uppercase tracking-[0.2em] font-bold">
            Login
          </button>
        </form>

        <div className="mt-6 text-sm text-white/70">
          New here?{" "}
          <Link to="/signup" className="text-white underline">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
