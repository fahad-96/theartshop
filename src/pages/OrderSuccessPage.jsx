import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1];

export default function OrderSuccessPage() {
  return (
    <div className="min-h-[100svh] bg-black text-white flex items-center justify-center px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease }}
        className="text-center max-w-sm sm:max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 200 }}
          className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </motion.div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight">Order Placed</h1>
        <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-white/45 leading-relaxed px-2">
          Your artwork is on its way. We'll contact you with delivery updates soon.
        </p>

        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/profile" className="border border-white/20 px-6 py-3.5 text-[10px] sm:text-xs uppercase tracking-[0.2em] font-bold hover:bg-white/5 active:bg-white/10 transition-colors rounded-sm">
            View Orders
          </Link>
          <Link to="/" className="bg-white text-black px-6 py-3.5 text-[10px] sm:text-xs uppercase tracking-[0.2em] font-bold hover:bg-white/90 active:scale-[0.98] transition-all rounded-sm">
            Continue Shopping
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
