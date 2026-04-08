import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform, useInView } from "framer-motion";
import Lenis from "@studio-freight/lenis";
import Splitting from "splitting";
import "splitting/dist/splitting.css";
import "splitting/dist/splitting-cells.css";
import MainHeader from "../components/MainHeader";
import Preloader from "../components/Preloader";
import ProductCard from "../components/ProductCard";
import { useShop } from "../context/ShopContext";
import {
  HERO_VIDEO_MOBILE_SRC,
  HERO_VIDEO_SRC,
  INSTAGRAM_URL,
  SECTION_CONNECTOR_VIDEO_SRC,
} from "../data/products";

const ease = [0.22, 1, 0.36, 1];

function RevealText({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <span ref={ref} className={`inline-block overflow-hidden ${className}`}>
      <motion.span
        className="inline-block"
        initial={{ y: "110%" }}
        animate={isInView ? { y: 0 } : { y: "110%" }}
        transition={{ duration: 0.9, ease, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function FadeUp({ children, className = "", delay = 0, once = true }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.8, ease, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(() => !sessionStorage.getItem("preloaderShown"));
  const [searchTerm, setSearchTerm] = useState("");
  const { products } = useShop();

  const heroRef = useRef(null);
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroScale = useTransform(heroScrollProgress, [0, 1], [1, 1.15]);
  const heroOpacity = useTransform(heroScrollProgress, [0, 0.8], [1, 0]);
  const heroTextY = useTransform(heroScrollProgress, [0, 1], [0, 150]);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      smoothTouch: false,
    });

    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };

    requestAnimationFrame(raf);
    Splitting();

    return () => lenis.destroy();
  }, []);

  const filteredProducts = useMemo(
    () => products.filter((product) => product.title.toLowerCase().includes(searchTerm.toLowerCase())),
    [searchTerm, products]
  );

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="bg-black text-white w-full min-h-screen font-sans selection:bg-white selection:text-black relative">
      <AnimatePresence>{isLoading && <Preloader onComplete={() => { sessionStorage.setItem("preloaderShown", "1"); setIsLoading(false); }} />}</AnimatePresence>

      <MainHeader />

      {/* ══════════ HERO ══════════ */}
      <section
        ref={heroRef}
        id="home"
        className="h-[100svh] w-full flex flex-col justify-end items-center relative overflow-hidden bg-black"
      >
        {/* Video bg with parallax zoom */}
        <motion.div style={{ scale: heroScale }} className="absolute inset-0">
          <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover">
            <source src={HERO_VIDEO_MOBILE_SRC} media="(max-width: 768px)" type="video/mp4" />
            <source src={HERO_VIDEO_SRC} type="video/mp4" />
          </video>
        </motion.div>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-70" />

        {/* Hero content — stacked at bottom for mobile-first */}
        <motion.div
          style={{ y: heroTextY, opacity: heroOpacity }}
          className="relative z-10 w-full px-5 sm:px-8 md:px-14 pb-12 sm:pb-16 md:pb-20"
        >
          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.8, ease }}
            className="text-[9px] sm:text-[10px] uppercase tracking-[0.4em] sm:tracking-[0.5em] text-white/50 mb-4 sm:mb-5 font-medium"
          >
            Bespoke Laser-Cut Artistry
          </motion.p>

          {/* Main heading */}
          <div className="space-y-0">
            <div className="overflow-hidden">
              <motion.h1
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ delay: 0.3, duration: 1, ease }}
                className="text-[15vw] sm:text-[10vw] md:text-[8vw] lg:text-[7vw] font-black leading-[0.9] tracking-[-0.03em] uppercase"
              >
                Shop
              </motion.h1>
            </div>
            <div className="overflow-hidden">
              <motion.h1
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ delay: 0.45, duration: 1, ease }}
                className="text-[15vw] sm:text-[10vw] md:text-[8vw] lg:text-[7vw] font-black leading-[0.9] tracking-[-0.03em] uppercase text-transparent"
                style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.5)" }}
              >
                The Art
              </motion.h1>
            </div>
          </div>

          {/* CTA row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.7, ease }}
            className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6"
          >
            <button
              type="button"
              onClick={() => scrollToSection("shop")}
              className="group flex items-center gap-3 bg-white text-black px-6 py-3 sm:px-7 sm:py-3.5 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-white/90 active:scale-[0.97] transition-all duration-300"
            >
              Explore Collection
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-1 transition-transform">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <p className="text-[10px] sm:text-xs text-white/40 max-w-[220px] leading-relaxed">
              Handcrafted wall art, precision laser-cut in Srinagar
            </p>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="w-5 h-8 rounded-full border border-white/25 flex justify-center pt-1.5"
          >
            <div className="w-[2px] h-2 bg-white/50 rounded-full" />
          </motion.div>
        </motion.div>

        {/* Bottom marquee ticker */}
        <div className="absolute bottom-0 w-full overflow-hidden pointer-events-none opacity-[0.04]">
          <motion.div
            className="text-[4rem] sm:text-[6rem] md:text-[8rem] font-black tracking-tight inline-block whitespace-nowrap"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
          >
            THE ART SHOP • BESPOKE CREATIONS • THE ART SHOP • BESPOKE CREATIONS •&nbsp;
          </motion.div>
        </div>
      </section>

      {/* ══════════ SHOP SECTION ══════════ */}
      <section id="shop" className="w-full px-4 sm:px-6 md:px-12 py-20 sm:py-28 md:py-40 bg-[#0a0a0a] text-white relative overflow-hidden">
        {/* Section header */}
        <div className="text-center mb-12 sm:mb-16 md:mb-24">
          <FadeUp>
            <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.5em] text-white/30 font-medium mb-3 sm:mb-4">Our Collection</p>
          </FadeUp>
          <div className="overflow-hidden">
            <RevealText className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase">
              Curated
            </RevealText>
          </div>
          <div className="overflow-hidden">
            <RevealText delay={0.1} className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase text-transparent" style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.35)" }}>
              Originals
            </RevealText>
          </div>
        </div>

        {/* Search */}
        <FadeUp delay={0.2}>
          <div className="w-full max-w-sm sm:max-w-md mx-auto mb-10 sm:mb-14 md:mb-24">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for art..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-b border-white/20 text-white pb-3 pr-10 outline-none focus:border-white/60 transition-colors placeholder:text-white/30 text-xs sm:text-sm tracking-[0.15em] font-medium"
              />
              <svg className="absolute right-0 bottom-3 h-4 w-4 sm:h-5 sm:w-5 text-white/30 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </FadeUp>

        {/* Product grid — 2 cols on mobile, 3 on lg */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-x-10 md:gap-y-32">
          {filteredProducts.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>

        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-28 w-px bg-gradient-to-b from-white/0 to-white/25 pointer-events-none" />
      </section>

      {/* ══════════ VIDEO CONNECTOR ══════════ */}
      <section className="w-full flex flex-col justify-center items-center bg-black relative py-10 sm:py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-white/10 pointer-events-none" />
        <FadeUp className="w-full max-w-5xl px-4">
          <div className="aspect-video relative rounded-sm overflow-hidden">
            <video src={SECTION_CONNECTOR_VIDEO_SRC} autoPlay muted loop playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 border border-white/5" />
          </div>
        </FadeUp>
      </section>

      {/* ══════════ ABOUT ══════════ */}
      <section id="about" className="w-full bg-[#060606] text-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-32 w-px bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

        <div className="pt-24 sm:pt-32 md:pt-44 pb-12 sm:pb-16 md:pb-24 px-5 sm:px-6 text-center">
          <FadeUp>
            <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.5em] text-white/40 font-semibold mb-4 sm:mb-6">
              Why Choose Us
            </p>
          </FadeUp>
          <div className="overflow-hidden">
            <RevealText className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase">
              Craft Beyond
            </RevealText>
          </div>
          <div className="overflow-hidden">
            <RevealText delay={0.1} className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase text-transparent" style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.4)" }}>
              Ordinary
            </RevealText>
          </div>
        </div>

        <div className="px-4 sm:px-6 md:px-12 lg:px-20 pb-24 sm:pb-32 md:pb-44">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-px bg-white/[0.06]">
            {[
              {
                num: "01",
                title: "Precision\nLaser Cut",
                desc: "State-of-the-art laser technology ensures flawless edges and intricate details, bringing your vision to life with unparalleled precision.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-8 h-8 md:w-10 md:h-10">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                ),
              },
              {
                num: "02",
                title: "Premium\nMaterial",
                desc: "Only the finest, sustainably sourced wood and metal. Beautiful, durable, and long-lasting artwork you can feel proud of.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-8 h-8 md:w-10 md:h-10">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                ),
              },
              {
                num: "03",
                title: "Artisan\nFinish",
                desc: "Each piece is hand-finished by skilled artisans. A personal touch adding unique character to every true masterpiece.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-8 h-8 md:w-10 md:h-10">
                    <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
                  </svg>
                ),
              },
            ].map((item, i) => (
              <motion.div
                key={item.num}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="bg-[#0a0a0a] p-6 sm:p-8 md:p-10 lg:p-14 group hover:bg-[#111] transition-colors duration-700 relative"
              >
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-b from-white/[0.03] to-transparent" />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-8 md:mb-12">
                    <span className="text-[10px] text-white/20 font-mono tracking-wider">{item.num}</span>
                    <span className="text-white/15 group-hover:text-white/40 transition-colors duration-700">
                      {item.icon}
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight uppercase leading-[1.05] whitespace-pre-line group-hover:text-white transition-colors duration-500">
                    {item.title}
                  </h3>
                  <div className="w-8 h-px bg-white/15 group-hover:w-16 group-hover:bg-white/40 transition-all duration-700 mt-6 mb-5" />
                  <p className="text-xs md:text-sm text-white/35 leading-relaxed group-hover:text-white/60 transition-colors duration-500 max-w-sm">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer id="contact" className="bg-[#030303] text-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-24 w-px bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

        {/* CTA */}
        <div className="relative px-5 sm:px-6 pt-24 sm:pt-32 md:pt-44 pb-16 sm:pb-20 md:pb-28">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-white/[0.02] rounded-full blur-[120px]" />
          </div>

          <div className="relative z-10 text-center max-w-5xl mx-auto">
            <FadeUp>
              <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.4em] sm:tracking-[0.5em] text-white/35 font-semibold mb-6 sm:mb-8">
                Get in Touch
              </p>
            </FadeUp>
            <div className="overflow-hidden">
              <RevealText className="text-[13vw] sm:text-[8vw] md:text-[6vw] font-black leading-[0.85] tracking-tighter uppercase">
                Let's Create
              </RevealText>
            </div>
            <div className="overflow-hidden">
              <RevealText delay={0.1} className="text-[13vw] sm:text-[8vw] md:text-[6vw] font-black leading-[0.85] tracking-tighter uppercase text-transparent" style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.3)" }}>
                Something
              </RevealText>
            </div>
            <div className="overflow-hidden">
              <RevealText delay={0.2} className="text-[13vw] sm:text-[8vw] md:text-[6vw] font-black leading-[0.85] tracking-tighter uppercase">
                Extraordinary
              </RevealText>
            </div>
            <FadeUp delay={0.3}>
              <p className="mt-6 sm:mt-8 text-xs sm:text-sm md:text-base text-white/40 max-w-lg mx-auto leading-relaxed px-2">
                Want a piece that feels custom-built for your space? Message us and we'll help you pick the right artwork, size, and finish.
              </p>
            </FadeUp>
          </div>
        </div>

        {/* Info grid */}
        <div className="border-t border-white/[0.06] mx-4 sm:mx-6 md:mx-12 lg:mx-20">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">
            {/* Address */}
            <FadeUp className="py-8 sm:py-10 md:py-14 md:pr-10">
              <p className="text-[9px] uppercase tracking-[0.4em] text-white/25 font-semibold mb-3 sm:mb-4">Location</p>
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                Downtown Srinagar
                <br />
                Jammu & Kashmir, India
              </p>
            </FadeUp>

            {/* Connect */}
            <FadeUp delay={0.1} className="py-8 sm:py-10 md:py-14 md:px-10">
              <p className="text-[9px] uppercase tracking-[0.4em] text-white/25 font-semibold mb-3 sm:mb-4">Connect</p>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors duration-300 group/ig"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 opacity-50 group-hover/ig:opacity-100 transition-opacity">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
                Instagram
              </a>
            </FadeUp>

            {/* Navigation */}
            <FadeUp delay={0.2} className="py-8 sm:py-10 md:py-14 md:pl-10">
              <p className="text-[9px] uppercase tracking-[0.4em] text-white/25 font-semibold mb-4">Navigate</p>
              <nav className="flex flex-col gap-2">
                {["home", "shop", "about", "contact"].map((id) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="text-sm text-white/40 hover:text-white/80 transition-colors duration-300 uppercase tracking-[0.15em] font-medium w-fit"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(id);
                    }}
                  >
                    {id}
                  </a>
                ))}
              </nav>
            </FadeUp>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.06] mx-4 sm:mx-6 md:mx-12 lg:mx-20 py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-[10px] text-white/25 uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} The Art Shop
          </p>
          <p className="text-xs text-white/30" style={{ fontFamily: "cursive" }}>
            Made with <span className="text-white/60">♥</span> by{" "}
            <a
              href="https://fahad-yousuf.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/60 transition-colors"
            >
              Fahad Yousuf
            </a>{" "}
            in Srinagar
          </p>
        </div>
      </footer>
    </div>
  );
}
