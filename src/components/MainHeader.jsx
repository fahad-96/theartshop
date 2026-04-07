import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LOGO_SRC } from "../data/products";
import { useShop } from "../context/ShopContext";

export default function MainHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser, cartCount, logout } = useShop();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname, location.hash]);

  const onHomeClick = () => {
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate("/");
  };

  const handleSectionNavigation = (id) => {
    if (location.pathname === "/") {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setIsMenuOpen(false);
      return;
    }

    if (id === "home") {
      navigate("/");
      return;
    }

    navigate(`/#${id}`);
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Slide-in Panel */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
            className="fixed top-0 right-0 h-full w-[min(380px,85vw)] z-50 bg-[#0a0a0a] border-l border-white/10 flex flex-col"
          >
            {/* Close button */}
            <div className="flex justify-end p-6">
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="text-white/50 hover:text-white transition-colors"
                aria-label="Close menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 flex flex-col justify-center px-10 gap-1">
              {["home", "shop", "about", "contact"].map((id, i) => (
                <motion.button
                  key={id}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.07, duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
                  type="button"
                  className="text-left text-3xl sm:text-4xl font-black uppercase tracking-[0.15em] text-white/80 hover:text-white hover:tracking-[0.25em] transition-all duration-500 py-3"
                  onClick={() => handleSectionNavigation(id)}
                >
                  {id}
                </motion.button>
              ))}
            </div>

            {/* Bottom section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              className="px-10 pb-10"
            >
              <div className="h-px w-full bg-white/10 mb-6" />

              {authUser ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/profile")}
                    className="flex-1 border border-white/20 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:bg-white hover:text-black transition-all duration-300"
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      navigate("/");
                    }}
                    className="flex-1 border border-white/20 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:bg-white hover:text-black transition-all duration-300"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex-1 text-center border border-white/20 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:bg-white hover:text-black transition-all duration-300"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex-1 text-center bg-white text-black px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-white/90 transition-all duration-300"
                  >
                    Sign Up
                  </Link>
                </div>
              )}

              <p className="text-[9px] text-white/25 uppercase tracking-[0.3em] text-center mt-6">
                The Art Shop
              </p>
            </motion.div>
          </motion.nav>
        )}
      </AnimatePresence>

      <header className="fixed top-0 w-full py-4 px-6 md:px-12 flex justify-between items-center z-50 bg-black text-white">
        <div className="flex-1 flex justify-start items-center">
          <img
            src={LOGO_SRC}
            alt="Logo"
            className="h-[40px] md:h-[60px] w-auto object-contain cursor-pointer"
            onClick={onHomeClick}
          />
        </div>

        <div className="flex-1 flex justify-center items-center">
          {/* Intentionally left open for balance in nav layout */}
        </div>

        <div className="flex-1 flex justify-end items-center gap-2 sm:gap-3">
          {!authUser && (
            <Link
              to="/login"
              className="inline-flex border border-white/35 px-3 py-2 text-[10px] sm:text-xs uppercase tracking-[0.16em] sm:tracking-[0.2em] whitespace-nowrap hover:bg-white hover:text-black transition-colors"
            >
              Login
            </Link>
          )}
          {authUser && (
            <Link
              to="/cart"
              className="border border-white/35 px-3 py-2 text-[10px] sm:text-xs uppercase tracking-[0.16em] sm:tracking-[0.2em] whitespace-nowrap hover:bg-white hover:text-black transition-colors"
            >
              Cart ({cartCount})
            </Link>
          )}

          <button
            type="button"
            className="flex flex-col gap-[6px] cursor-pointer group p-2 z-50 relative"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Open navigation"
          >
            <span className={`w-8 h-[2px] bg-white transition-all transform origin-right ${isMenuOpen ? "-rotate-45 -translate-y-2" : "group-hover:scale-x-75"}`} />
            <span className={`w-8 h-[2px] bg-white transition-all ${isMenuOpen ? "opacity-0" : ""}`} />
            <span className={`w-8 h-[2px] bg-white transition-all transform origin-right ${isMenuOpen ? "rotate-45 translate-y-2" : "group-hover:scale-x-75"}`} />
          </button>
        </div>
      </header>
    </>
  );
}
