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
  const [isLoading, setIsLoading] = useState(true);
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
      <AnimatePresence>{isLoading && <Preloader onComplete={() => setIsLoading(false)} />}</AnimatePresence>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-x-12 md:gap-y-40">
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

      <section id="about" className="min-h-screen w-full flex items-center justify-center px-4 md:px-12 py-32 bg-white text-black relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-28 w-px bg-gradient-to-b from-black/35 to-black/0 pointer-events-none" />
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-24 text-center">
          <div className="group">
            <h2 className="text-4xl md:text-7xl font-black tracking-tighter hover:text-gray-400 transition-colors duration-500">01 PRECISION LASER CUT</h2>
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.3em] opacity-50 group-hover:opacity-100 transition-opacity max-w-2xl mx-auto">Our state-of-the-art laser cutting technology ensures every piece has flawless edges and intricate details, bringing your vision to life with unparalleled precision.</p>
          </div>
          <div className="group">
            <h2 className="text-4xl md:text-7xl font-black tracking-tighter hover:text-gray-400 transition-colors duration-500">02 PREMIUM MATERIAL</h2>
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.3em] opacity-50 group-hover:opacity-100 transition-opacity max-w-2xl mx-auto">We use only the finest, sustainably sourced wood and metal. Our commitment to quality materials means your artwork is not only beautiful but also durable and long-lasting.</p>
          </div>
          <div className="group">
            <h2 className="text-4xl md:text-7xl font-black tracking-tighter hover:text-gray-400 transition-colors duration-500">03 ARTISAN FINISH</h2>
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.3em] opacity-50 group-hover:opacity-100 transition-opacity max-w-2xl mx-auto">Each piece is hand-finished by our skilled artisans. This personal touch adds a unique character and ensures that your artwork is a true masterpiece.</p>
          </div>
        </div>
      </section>

      <footer id="contact" className="bg-black text-white flex flex-col p-4 md:p-12 relative overflow-hidden">
        <div className="w-full flex flex-col items-center justify-center text-center px-6 z-10 relative pt-24 md:pt-28">
          <h1 className="text-[16vw] sm:text-[12vw] font-black leading-[0.8] tracking-tighter uppercase whitespace-nowrap">LET'S CREATE</h1>
          <h1 className="text-[16vw] sm:text-[12vw] font-black leading-[0.8] tracking-tighter uppercase whitespace-nowrap border-text-white">extra-ordinary</h1>
          <h1 className="text-[16vw] sm:text-[12vw] font-black leading-[0.8] tracking-tighter uppercase whitespace-nowrap">TOGETHER!</h1>
        </div>
        <div className="mt-20 md:mt-24 border-t border-white/15 pt-10 flex flex-col gap-10 z-10 relative">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
            <div className="max-w-xl">
              <p className="text-xs uppercase tracking-[0.28em] text-white/60 font-semibold">Contact</p>
              <p className="mt-4 text-white/85 leading-relaxed">Want a piece that feels custom-built for your space? Message us and we will help you pick the right artwork, size, and finish.</p>
              <p className="mt-4 text-white/65 text-sm">Address: Downtown Srinagar, Jammu and Kashmir, India</p>
            </div>
            <form className="flex w-full md:w-[420px]" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="ENTER YOUR EMAIL" className="bg-transparent border-b border-white/25 outline-none w-full pb-3 placeholder-white/35 focus:border-white transition-colors text-sm" />
            </form>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10 text-xs uppercase tracking-[0.22em] font-semibold">
            <nav className="flex flex-wrap gap-x-8 gap-y-4 text-white/70">
              {["home", "shop", "about", "contact"].map((id) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="hover:text-white transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(id);
                  }}
                >
                  {id}
                </a>
              ))}
            </nav>
            <div className="text-white/70 text-xs uppercase tracking-[0.22em] font-semibold">
              Connect via{" "}
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-white hover:underline transition-colors normal-case tracking-normal">Instagram</a>
            </div>
          </div>
          <div className="w-full pt-8 mt-8 border-t border-white/10 text-center text-sm text-white/55" style={{ fontFamily: "cursive" }}>
            Made with <span className="text-white">♥</span> by{" "}
            <a href="https://fahad-yousuf.netlify.app/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition-colors">
              Fahad Yousuf
            </a>{" "}
            in Srinagar
          </div>
        </div>
      </footer>
    </div>
  );
}
