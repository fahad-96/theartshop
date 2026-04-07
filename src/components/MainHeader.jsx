import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black text-white flex flex-col items-center justify-center space-y-8 px-4">
          {["home", "shop", "about", "contact"].map((id) => (
            <button
              key={id}
              type="button"
              className="text-4xl font-bold uppercase tracking-widest hover:text-gray-400 transition-colors"
              onClick={() => handleSectionNavigation(id)}
            >
              {id}
            </button>
          ))}

          <div className="mt-4 h-px w-32 bg-white/20" />

          {authUser ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="border border-white/30 px-5 py-2 text-xs uppercase tracking-[0.2em] hover:bg-white hover:text-black"
              >
                Profile
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate("/");
                }}
                className="border border-white/30 px-5 py-2 text-xs uppercase tracking-[0.2em] hover:bg-white hover:text-black"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/login"
                onClick={() => setIsMenuOpen(false)}
                className="border border-white/30 px-5 py-2 text-xs uppercase tracking-[0.2em] hover:bg-white hover:text-black"
              >
                Login
              </Link>
              <Link
                to="/signup"
                onClick={() => setIsMenuOpen(false)}
                className="border border-white/30 px-5 py-2 text-xs uppercase tracking-[0.2em] hover:bg-white hover:text-black"
              >
                Sign Up
              </Link>
            </div>
          )}

        </div>
      )}

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

        <div className="flex-1 flex justify-end items-center gap-3">
          {!authUser && (
            <Link
              to="/login"
              className="hidden sm:inline-flex border border-white/35 px-4 py-2 text-xs uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-colors"
            >
              Login
            </Link>
          )}
          <Link
            to="/cart"
            className="border border-white/35 px-4 py-2 text-xs uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-colors"
          >
            Cart ({cartCount})
          </Link>

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
