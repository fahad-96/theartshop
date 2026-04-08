import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LOGO_SRC, FAVICON_SRC } from "../data/products";
import { useShop } from "../context/ShopContext";

const ease = [0.76, 0, 0.24, 1];

const NavIcon = ({ d }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d={d} /></svg>
);

const NAV_SECTIONS = [
  { id: "home", label: "Home", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id: "shop", label: "Shop", icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" },
  { id: "about", label: "About", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "contact", label: "Contact", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
];

const USER_SECTIONS = [
  { id: "wishlist", label: "Wishlist", icon: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z", route: "/wishlist" },
  { id: "cart", label: "Cart", icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z", route: "/cart" },
  { id: "profile", label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", route: "/profile" },
];

export default function MainHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser, cartCount, logout, wishlistItems } = useShop();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMenuOpen]);

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
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      setIsMenuOpen(false);
      return;
    }
    if (id === "home") { navigate("/"); return; }
    navigate(`/#${id}`);
  };

  return (
    <>
      {/* ── Backdrop ── */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            key="menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Side Panel Menu ── */}
      <AnimatePresence mode="wait">
        {isMenuOpen && (
          <motion.aside
            key="menu-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.5, ease }}
            className="fixed top-0 right-0 h-full w-[85vw] sm:w-[380px] md:w-[420px] z-[95] flex flex-col bg-[#09090b] border-l border-white/[0.06] shadow-[-20px_0_60px_rgba(0,0,0,0.8)]"
          >
            {/* User / Brand header */}
            <div className="p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden">
                  <img src={FAVICON_SRC} alt="The Art Shop" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold tracking-tight truncate">
                    {authUser?.user_metadata?.name || "The Art Shop"}
                  </h2>
                  <p className="text-[10px] text-white/40 truncate">
                    {authUser?.email || "Welcome, Guest"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="ml-auto w-8 h-8 flex items-center justify-center text-white/30 hover:text-white active:scale-90 transition-all shrink-0"
                  aria-label="Close menu"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Navigation label */}
            <div className="px-6 mb-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/25 font-semibold">Menu</p>
            </div>

            {/* Main nav */}
            <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
              {NAV_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleSectionNavigation(section.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all duration-200"
                >
                  <NavIcon d={section.icon} />
                  {section.label}
                </button>
              ))}

              {authUser && (
                <>
                  <div className="pt-3 pb-1 px-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/25 font-semibold">Account</p>
                  </div>
                  {USER_SECTIONS.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => { navigate(section.route); setIsMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                        location.pathname === section.route
                          ? "bg-white/[0.08] text-white"
                          : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                      }`}
                    >
                      <NavIcon d={section.icon} />
                      {section.label}
                      {section.id === "wishlist" && wishlistItems?.length > 0 && (
                        <span className="ml-auto text-[10px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded-full font-bold">{wishlistItems.length}</span>
                      )}
                      {section.id === "cart" && cartCount > 0 && (
                        <span className="ml-auto text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-bold">{cartCount}</span>
                      )}
                    </button>
                  ))}
                </>
              )}
            </nav>

            {/* Bottom section */}
            <div className="p-3 mt-auto space-y-1 border-t border-white/[0.06]">
              {authUser ? (
                <button
                  type="button"
                  onClick={async () => { await logout(); navigate("/"); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/[0.06] transition-all"
                >
                  <NavIcon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  Logout
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { navigate("/login"); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all"
                  >
                    <NavIcon d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => { navigate("/signup"); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all"
                  >
                    <NavIcon d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Top Header Bar ── */}
      <header
        className={`fixed top-0 w-full z-[80] transition-all duration-500 ${
          scrolled
            ? "py-2.5 bg-black/90 backdrop-blur-xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
            : "py-3.5 sm:py-4 bg-black/80 backdrop-blur-sm"
        }`}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 md:px-10 lg:px-14">
          {/* Logo */}
          <motion.div
            className="flex items-center cursor-pointer shrink-0"
            onClick={onHomeClick}
            whileTap={{ scale: 0.95 }}
          >
            <img
              src={LOGO_SRC}
              alt="The Art Shop"
              className={`w-auto object-contain transition-all duration-500 ${scrolled ? "h-8 sm:h-10" : "h-9 sm:h-12 md:h-14"}`}
            />
          </motion.div>

          {/* Desktop nav (hidden on <=md) */}
          <nav className="hidden lg:flex items-center gap-8">
            {NAV_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => handleSectionNavigation(section.id)}
                className="text-[11px] uppercase tracking-[0.25em] text-white/50 hover:text-white transition-colors duration-300 font-medium"
              >
                {section.label}
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Wishlist — desktop only */}
            {authUser && (
              <Link
                to="/wishlist"
                className="hidden sm:flex items-center justify-center w-9 h-9 text-white/50 hover:text-white transition-all relative"
                aria-label="Wishlist"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={wishlistItems?.length > 0 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
                {wishlistItems?.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-black text-[8px] font-bold rounded-full flex items-center justify-center">
                    {wishlistItems.length}
                  </span>
                )}
              </Link>
            )}

            {/* Cart */}
            {authUser && (
              <Link
                to="/cart"
                className="flex items-center gap-1.5 border border-white/20 px-3 py-2 text-[10px] sm:text-[11px] uppercase tracking-[0.12em] sm:tracking-[0.18em] whitespace-nowrap hover:bg-white hover:text-black transition-all duration-300 rounded-sm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="sm:hidden">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
                </svg>
                <span className="hidden sm:inline">Cart</span>
                <span>({cartCount})</span>
              </Link>
            )}

            {/* Login — when not logged in */}
            {!authUser && (
              <Link
                to="/login"
                className="border border-white/25 px-3 py-2 text-[10px] sm:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.2em] whitespace-nowrap hover:bg-white hover:text-black transition-all duration-300 rounded-sm"
              >
                Login
              </Link>
            )}

            {/* Hamburger */}
            <button
              type="button"
              className="flex flex-col items-center justify-center w-10 h-10 gap-[6px] cursor-pointer relative z-[96]"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation"
            >
              <motion.span
                animate={isMenuOpen ? { rotate: 45, y: 7.5, width: 24 } : { rotate: 0, y: 0, width: 26 }}
                transition={{ duration: 0.4, ease }}
                className="h-[1.5px] bg-white origin-center block"
              />
              <motion.span
                animate={isMenuOpen ? { opacity: 0, width: 0 } : { opacity: 0.5, width: 18 }}
                transition={{ duration: 0.25 }}
                className="h-[1.5px] bg-white block"
              />
              <motion.span
                animate={isMenuOpen ? { rotate: -45, y: -7.5, width: 24 } : { rotate: 0, y: 0, width: 26 }}
                transition={{ duration: 0.4, ease }}
                className="h-[1.5px] bg-white origin-center block"
              />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
