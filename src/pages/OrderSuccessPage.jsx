import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function OrderSuccessPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 200 }}
          className="w-16 h-16 border-2 border-emerald-400 rounded-full flex items-center justify-center mx-auto mb-8"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </motion.div>

        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Order Placed</h1>
        <p className="mt-4 text-sm text-white/50 leading-relaxed">
          Your artwork is on its way. We'll contact you with delivery updates soon.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/profile" className="border border-white/20 px-6 py-3 text-xs uppercase tracking-[0.2em] font-bold hover:bg-white/5 transition-colors">
            View Orders
          </Link>
          <Link to="/" className="bg-white text-black px-6 py-3 text-xs uppercase tracking-[0.2em] font-bold hover:bg-white/90 transition-colors">
            Continue Shopping
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
