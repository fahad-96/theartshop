import React from "react";
import { Link } from "react-router-dom";

export default function AccountDeletionCompletedPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-xl border border-white/15 bg-white/[0.04] backdrop-blur-sm p-8 md:p-10 text-center">
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Account Deletion Completed</h1>
        <p className="mt-4 text-white/80 text-base md:text-lg">
          Your account has been deleted successfully.
        </p>
        <div className="mt-6">
          <Link
            to="/login"
            className="inline-block bg-white text-black py-3 px-6 uppercase tracking-[0.2em] font-bold"
          >
            Go To Login
          </Link>
        </div>
      </div>
    </div>
  );
}
