import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AccountActivatedPage() {
  const navigate = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/login", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-xl border border-white/15 bg-white/[0.04] backdrop-blur-sm p-8 md:p-10 text-center">
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Account Activated</h1>
        <p className="mt-4 text-white/80 text-base md:text-lg">
          Your account is ready to use. Please go back to the login page.
        </p>
        <p className="mt-2 text-sm text-white/60">Redirecting to login in {secondsLeft}s...</p>
      </div>
    </div>
  );
}
