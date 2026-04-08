import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { isAdminUser } from "../lib/adminApi";

const ADMIN_SESSION_CHECK_TIMEOUT_MS = 4000;

const withTimeout = (promise, timeoutMs, timeoutMessage) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
};

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkExistingSession = async () => {
      if (!supabase) {
        if (mounted) setCheckingSession(false);
        return;
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const hasSession = Boolean(sessionData.session?.user);

        if (!hasSession) {
          if (mounted) setCheckingSession(false);
          return;
        }

        const admin = await withTimeout(
          isAdminUser(supabase),
          ADMIN_SESSION_CHECK_TIMEOUT_MS,
          "Admin session check timed out. Please retry."
        );

        if (admin) {
          navigate("/admin/dashboard", { replace: true });
          return;
        }

        if (mounted) setCheckingSession(false);
      } catch (error) {
        console.error("Admin session check failed", error);
        if (mounted) {
          setMessage(error.message || "Could not verify your admin session.");
          setCheckingSession(false);
        }
      }
    };

    const { data: authListener } = supabase?.auth?.onAuthStateChange?.((_event, session) => {
      if (session?.user) {
        withTimeout(
          isAdminUser(supabase),
          ADMIN_SESSION_CHECK_TIMEOUT_MS,
          "Admin session check timed out. Please retry."
        )
          .then((admin) => {
            if (admin) {
              navigate("/admin/dashboard", { replace: true });
            }
          })
          .catch((error) => {
            if (mounted) setMessage(error.message || "Could not verify your admin session.");
          });
      } else if (mounted) {
        setCheckingSession(false);
      }
    }) || {};

    checkExistingSession();

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, [navigate]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (error) {
        throw error;
      }

      const user = data.session?.user || data.user || null;
      if (!user) {
        throw new Error("Admin session could not be created.");
      }

      const admin = await isAdminUser(supabase);
      if (!admin) {
        await supabase.auth.signOut();
        throw new Error("This account is not registered as an admin.");
      }

      navigate("/admin/dashboard", { replace: true });
    } catch (error) {
      setMessage(error.message || "Admin login failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!supabase) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 text-center">
        <div className="max-w-lg border border-white/10 bg-white/[0.03] p-8">
          <h1 className="text-3xl font-black uppercase">Admin Login Disabled</h1>
          <p className="mt-3 text-white/70">Configure Supabase URL and anon key before using the admin area.</p>
        </div>
      </div>
    );
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4 py-24">
        <div className="w-full max-w-lg border border-white/15 bg-white/[0.04] backdrop-blur-sm p-8 md:p-10 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/45">Restricted Access</p>
          <h2 className="mt-2 text-3xl md:text-4xl font-black uppercase tracking-tight">Admin Login</h2>
          <p className="mt-6 text-white/70">Checking your existing session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-lg border border-white/15 bg-white/[0.04] backdrop-blur-sm p-8 md:p-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Restricted Access</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-black uppercase tracking-tight">Admin Login</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-xs uppercase tracking-[0.25em] text-white/70 hover:text-white"
          >
            Site
          </button>
        </div>

        {message && (
          <p className="mb-5 text-sm text-rose-300 border border-rose-400/40 bg-rose-400/10 p-3">{message}</p>
        )}

        <form className="space-y-4" onSubmit={onSubmit}>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Admin Email"
            className="w-full bg-black/40 border border-white/20 px-4 py-3 outline-none focus:border-white"
          />
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            placeholder="Password"
            className="w-full bg-black/40 border border-white/20 px-4 py-3 outline-none focus:border-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3 uppercase tracking-[0.2em] font-bold disabled:opacity-60"
          >
            {loading ? "Checking..." : "Enter Admin"}
          </button>
        </form>

      </div>
    </div>
  );
}
