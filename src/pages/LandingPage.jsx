import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
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

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(() => !sessionStorage.getItem("preloaderShown"));
  const [searchTerm, setSearchTerm] = useState("");
  const { products } = useShop();

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

  const { scrollYProgress } = useScroll();
  const yHeroText = useTransform(scrollYProgress, [0, 1], [0, 400]);

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
    <div className="bg-[#f0f0f0] text-black w-full min-h-screen font-sans selection:bg-black selection:text-white relative">
      <AnimatePresence>{isLoading && <Preloader onComplete={() => { sessionStorage.setItem("preloaderShown", "1"); setIsLoading(false); }} />}</AnimatePresence>

      <MainHeader />

      <section id="home" className="min-h-[100svh] w-full flex flex-col justify-center items-center relative overflow-hidden bg-black pt-20 md:pt-0">
        <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-90">
          <source src={HERO_VIDEO_MOBILE_SRC} media="(max-width: 768px)" type="video/mp4" />
          <source src={HERO_VIDEO_SRC} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/35" />

        <motion.div style={{ y: yHeroText }} className="z-10 text-center pointer-events-none uppercase">
          <h1 data-splitting className="text-[16vw] sm:text-[7rem] md:text-[9rem] lg:text-[11rem] font-black leading-none tracking-tighter text-white/0">
            SHOP
            <br />
            THE ART
          </h1>
        </motion.div>

        <div className="absolute bottom-2 md:bottom-[-10%] whitespace-nowrap overflow-hidden w-full flex opacity-10 text-white">
          <motion.div
            className="text-[5rem] sm:text-[8rem] md:text-[12rem] font-black tracking-tight inline-block border-text-black"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 15 }}
          >
            THE ART SHOP • BESPOKE CREATIONS • THE ART SHOP • BESPOKE CREATIONS •
          </motion.div>
        </div>
      </section>

      <section id="shop" className="min-h-[150vh] w-full px-3 md:px-12 py-24 md:py-40 bg-[#0d0d0d] text-white relative overflow-hidden">
        <h2 className="text-4xl md:text-8xl font-black mb-10 md:mb-16 tracking-tighter text-transparent border-text-white z-20 relative text-center">
          CURATED ORIGINALS
        </h2>

        <div className="w-full max-w-md mx-auto mb-12 md:mb-24">
          <div className="relative">
            <input
              type="text"
              placeholder="SEARCH FOR ART..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-b border-white/30 text-white pb-2 pr-8 outline-none focus:border-white transition-colors placeholder:text-white/50 text-sm tracking-[0.2em] font-medium text-center"
            />
            <svg className="absolute right-0 top-0 h-5 w-5 text-white/50 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 md:gap-x-12 md:gap-y-40">
          {filteredProducts.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-28 w-px bg-gradient-to-b from-white/0 to-white/35 pointer-events-none" />
      </section>

      <section className="min-h-[100svh] w-full flex flex-col justify-center items-center bg-black relative py-20 overflow-hidden">
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-white/15 pointer-events-none" />
        <div className="w-full max-w-4xl h-[80vh] relative">
          <video src={SECTION_CONNECTOR_VIDEO_SRC} autoPlay muted loop playsInline className="w-full h-full object-contain" />
        </div>
      </section>

      <section id="about" className="w-full bg-[#060606] text-white relative overflow-hidden">
        {/* Top accent line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-32 w-px bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

        {/* Section header */}
        <div className="pt-32 md:pt-44 pb-16 md:pb-24 px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-[10px] uppercase tracking-[0.5em] text-white/40 font-semibold mb-6"
          >
            Why Choose Us
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-4xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase"
          >
            Craft Beyond
            <br />
            <span className="text-transparent" style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.4)" }}>
              Ordinary
            </span>
          </motion.h2>
        </div>

        {/* Feature cards */}
        <div className="px-4 md:px-12 lg:px-20 pb-32 md:pb-44">
          <div className="grid md:grid-cols-3 gap-px bg-white/[0.06]">
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
                className="bg-[#0a0a0a] p-8 md:p-10 lg:p-14 group hover:bg-[#111] transition-colors duration-700 relative"
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
        {/* Divider line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-24 w-px bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

        {/* CTA Hero */}
        <div className="relative px-6 pt-32 md:pt-44 pb-20 md:pb-28">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-[120px]" />
          </div>

          <div className="relative z-10 text-center max-w-5xl mx-auto">
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-[10px] uppercase tracking-[0.5em] text-white/35 font-semibold mb-8"
            >
              Get in Touch
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-[12vw] sm:text-[8vw] md:text-[6vw] font-black leading-[0.85] tracking-tighter uppercase"
            >
              Let's Create
              <br />
              <span className="text-transparent" style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.3)" }}>
                Something
              </span>
              <br />
              Extraordinary
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 text-sm md:text-base text-white/40 max-w-lg mx-auto leading-relaxed"
            >
              Want a piece that feels custom-built for your space? Message us and we'll help you pick the right artwork, size, and finish.
            </motion.p>
          </div>
        </div>

        {/* Info grid */}
        <div className="border-t border-white/[0.06] mx-6 md:mx-12 lg:mx-20">
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
            {/* Address */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="py-10 md:py-14 md:pr-10"
            >
              <p className="text-[9px] uppercase tracking-[0.4em] text-white/25 font-semibold mb-4">Location</p>
              <p className="text-sm text-white/60 leading-relaxed">
                Downtown Srinagar
                <br />
                Jammu & Kashmir, India
              </p>
            </motion.div>

            {/* Connect */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="py-10 md:py-14 md:px-10"
            >
              <p className="text-[9px] uppercase tracking-[0.4em] text-white/25 font-semibold mb-4">Connect</p>
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
            </motion.div>

            {/* Navigation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="py-10 md:py-14 md:pl-10"
            >
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
            </motion.div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.06] mx-6 md:mx-12 lg:mx-20 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
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
