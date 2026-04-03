import React, { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Lenis from '@studio-freight/lenis'
import Splitting from "splitting";
import "splitting/dist/splitting.css";
import "splitting/dist/splitting-cells.css";

// --- PRODUCT DATA AND PRICING LOGIC ---
const filenames = [
  "art.jpeg", "BAT.jpeg", "Bike.jpeg", "birds.jpeg", "bow Tie.jpeg", "butter Fly.jpeg", 
  "cat emo.jpeg", "cat Window.jpeg", "cats.jpeg", "deer head 2.jpeg", "deer head 3.jpeg", 
  "Deer head.jpeg", "deer skull.jpeg", "dragon.jpeg", "eagle.jpeg", "frame.jpeg", 
  "Heart with Hands.jpeg", "heartHuman.jpeg", "Lion.jpeg", "load balance.jpeg", 
  "lofi 2.jpeg", "lofi.jpeg", "Moon.jpeg", "mountain.jpeg", "mountains.jpeg", 
  "rose.jpeg", "S letter Snake.jpeg", "sipderMan.jpeg", "standing Cat.jpeg", 
  "windowBrids.jpeg", "wolf head.jpeg"
];

const products = filenames.map((filename, i) => {
  const isDeer = filename.toLowerCase().includes("deer");
  return {
    id: i,
    title: filename.replace(".jpeg", "").toUpperCase(),
    src: `./image/${filename}`, // NOTE: Must be stored in public/image/ directory
    mrp: isDeer ? 2500 : 2000,
    price: isDeer ? 1500 : 999,
  };
});

const BASE_URL = import.meta.env.BASE_URL;
const HERO_VIDEO_SRC = `${BASE_URL}videos/hero.mp4`;
const HERO_VIDEO_MOBILE_SRC = `${BASE_URL}videos/hero-mobile.mp4`;
const SECTION_CONNECTOR_VIDEO_SRC = `${BASE_URL}videos/section-connector.mp4`;

const Preloader = ({ onComplete }) => {
  const words = ["The", "Art", "Shop"];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index === words.length) {
      const timer = setTimeout(onComplete, 500); // Wait before hiding preloader
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setIndex(index + 1);
    }, 500); // Time between each word drop

    return () => clearTimeout(timer);
  }, [index, onComplete]);

  return (
    <motion.div
      exit={{ y: "-100%" }}
      transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
    >
      <AnimatePresence>
        <motion.div
          key={index}
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="text-white text-6xl"
          style={{ fontFamily: "cursive" }}
        >
          {words[index]}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const filteredProducts = products.filter(product => 
    product.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  useEffect(() => {
    // Lenis Smooth Scroll Setup for Ultra-Premium feel
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      smoothTouch: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Text animation with Splitting.js
    Splitting();

    return () => lenis.destroy();
  }, []);

  const { scrollYProgress } = useScroll();
  const yHeroText = useTransform(scrollYProgress, [0, 1], [0, 400]);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="bg-[#f0f0f0] text-black w-full min-h-screen font-sans selection:bg-black selection:text-white relative">

      <AnimatePresence>
        {isLoading && <Preloader onComplete={() => setIsLoading(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-black text-white flex flex-col items-center justify-center space-y-8"
          >
            <a href="#home" className="text-4xl font-bold uppercase tracking-widest hover:text-gray-400 transition-colors" onClick={(e) => { e.preventDefault(); scrollToSection("home"); setIsMenuOpen(false); }}>Home</a>
            <a href="#shop" className="text-4xl font-bold uppercase tracking-widest hover:text-gray-400 transition-colors" onClick={(e) => { e.preventDefault(); scrollToSection("shop"); setIsMenuOpen(false); }}>Shop</a>
            <a href="#about" className="text-4xl font-bold uppercase tracking-widest hover:text-gray-400 transition-colors" onClick={(e) => { e.preventDefault(); scrollToSection("about"); setIsMenuOpen(false); }}>About</a>
            <a href="#contact" className="text-4xl font-bold uppercase tracking-widest hover:text-gray-400 transition-colors" onClick={(e) => { e.preventDefault(); scrollToSection("contact"); setIsMenuOpen(false); }}>Contact</a>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={!isLoading ? { y: 0, opacity: 1 } : {}}
        transition={{ delay: 0.5, duration: 1 }}
        className="fixed top-0 w-full py-4 px-6 md:px-12 flex justify-between items-center z-50 bg-black text-white"
      >
        <div className="flex-1 flex justify-start items-center">
          <img src={`${BASE_URL}logo.svg`} alt="Logo" className="h-[40px] md:h-[60px] w-auto object-contain cursor-pointer" />
        </div>
        
        <div className="flex-1 flex justify-center items-center">
          {/* Search bar removed from here */}
        </div>

        <div className="flex-1 flex justify-end items-center">
          <button 
            className="flex flex-col gap-[6px] cursor-pointer group p-2 z-50 relative"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className={`w-8 h-[2px] bg-white transition-all transform origin-right ${isMenuOpen ? '-rotate-45 -translate-y-2' : 'group-hover:scale-x-75'}`}></span>
            <span className={`w-8 h-[2px] bg-white transition-all ${isMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`w-8 h-[2px] bg-white transition-all transform origin-right ${isMenuOpen ? 'rotate-45 translate-y-2' : 'group-hover:scale-x-75'}`}></span>
          </button>
        </div>
      </motion.header>

      {/* PANEL 1: Hero */}
      <section id="home" className="h-screen w-full flex flex-col justify-center items-center relative overflow-hidden bg-black">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        >
          <source src={HERO_VIDEO_MOBILE_SRC} media="(max-width: 768px)" type="video/mp4" />
          <source src={HERO_VIDEO_SRC} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/35" />
        {/* This is removed as requested */}
        {/* <motion.div style={{ y: yHeroText }} className="z-10 text-center pointer-events-none uppercase">
          <h1 data-splitting className="text-[6rem] sm:text-[8rem] md:text-[10rem] lg:text-[12rem] font-black leading-none tracking-tighter">
            WE TRANSFORM<br />SPACES
          </h1>
          <motion.p 
            initial={{ opacity: 0 }} animate={!isLoading ? { opacity: 1 } : {}} transition={{ delay: 1, duration: 1 }}
            className="mt-6 text-sm tracking-[0.3em] font-medium"
          >
            REDEFINE YOUR SPACE • THE ART SHOP
          </motion.p>
        </motion.div> */}

        {/* Floating Marquee Background (Les Marteau style) */}
        <div className="absolute bottom-[-10%] whitespace-nowrap overflow-hidden w-full flex opacity-10 text-white">
          <motion.div className="text-[12rem] font-black tracking-tight inline-block border-text-black" animate={{ x: ["0%", "-50%"] }} transition={{ repeat: Infinity, ease: "linear", duration: 15 }}>
            THE ART SHOP • BESPOKE CREATIONS • THE ART SHOP • BESPOKE CREATIONS • 
          </motion.div>
        </div>
      </section>

      {/* PANEL 2: Shop Gallery */}
      <section id="shop" className="min-h-[150vh] w-full px-4 md:px-12 py-40 bg-[#0d0d0d] text-white relative overflow-hidden">
        <h2 className="text-5xl md:text-8xl font-black mb-16 tracking-tighter text-transparent border-text-white z-20 relative text-center">CURATED ORIGINALS</h2>
        
        <div className="w-full max-w-md mx-auto mb-24">
          <div className="relative">
            <input 
              type="text" 
              placeholder="SEARCH FOR ART..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-b border-white/30 text-white pb-2 pr-8 outline-none focus:border-white transition-colors placeholder:text-white/50 text-sm tracking-[0.2em] font-medium text-center"
            />
            <svg 
              className="absolute right-0 top-0 h-5 w-5 text-white/50 pointer-events-none" 
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-x-12 md:gap-y-40">
          {filteredProducts.map((product, i) => (
            <motion.div key={product.id} initial={{ y: 150, opacity: 0, scale: 0.95 }} whileInView={{ y: 0, opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 1.2, delay: (i % 3) * 0.1, ease: [0.76, 0, 0.24, 1] }} className={`flex flex-col relative w-full ${i % 3 === 1 ? 'md:mt-32' : ''}`}>
              <div className="overflow-hidden bg-[#1f1f1f] aspect-[3/4] relative mask-container group">
                <motion.img src={product.src} alt={product.title} className="w-full h-full object-cover scale-[1.15] opacity-60 group-hover:opacity-100 group-hover:scale-100 transition-all duration-[1s] ease-[cubic-bezier(0.76,0,0.24,1)] grayscale group-hover:grayscale-0" />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-[1s] pointer-events-none" />
              </div>
              <div className="flex justify-between items-start mt-8 group mb-12">
                <h3 className="font-bold tracking-[0.2em] text-xs uppercase">{product.title}</h3>
                <div className="text-right flex flex-col items-end gap-2">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-white/30 line-through tracking-widest">₹{product.mrp}</span>
                    <span className="text-xl font-black tracking-tight">₹{product.price}</span>
                  </div>
                  <a 
                    href={`https://wa.me/+916006448855?text=I'm interested in buying ${encodeURIComponent(product.title)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-2 border border-white/50 text-white px-4 py-1 text-xs uppercase tracking-widest font-bold hover:bg-white hover:text-black transition-colors"
                  >
                    Get
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-28 w-px bg-gradient-to-b from-white/0 to-white/35 pointer-events-none" />
      </section>

      {/* Section Connector */}
      <section className="h-screen w-full flex flex-col justify-center items-center bg-black relative py-20 overflow-hidden">
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-white/15 pointer-events-none" />
        <div className="w-full max-w-4xl h-[80vh] relative">
          <video
            src={SECTION_CONNECTOR_VIDEO_SRC}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-contain"
          />
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
          <h1 className="text-[12vw] font-black leading-[0.8] tracking-tighter uppercase whitespace-nowrap">
            LET'S CREATE
          </h1>
          <h1 className="text-[12vw] font-black leading-[0.8] tracking-tighter uppercase whitespace-nowrap border-text-white">
            extra-ordinary
          </h1>
          <h1 className="text-[12vw] font-black leading-[0.8] tracking-tighter uppercase whitespace-nowrap">
            TOGETHER!
          </h1>
        </div>
        <div className="mt-20 md:mt-24 border-t border-white/15 pt-10 flex flex-col gap-10 z-10 relative">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
            <div className="max-w-xl">
              <p className="text-xs uppercase tracking-[0.28em] text-white/60 font-semibold">Contact</p>
              <p className="mt-4 text-white/85 leading-relaxed">
                Want a piece that feels custom-built for your space? Message us and we’ll help you pick the right artwork, size, and finish.
              </p>
            </div>
            <form className="flex w-full md:w-[420px]">
              <input type="email" placeholder="ENTER YOUR EMAIL" className="bg-transparent border-b border-white/25 outline-none w-full pb-3 placeholder-white/35 focus:border-white transition-colors text-sm" />
            </form>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10 text-xs uppercase tracking-[0.22em] font-semibold">
            <nav className="flex flex-wrap gap-x-8 gap-y-4 text-white/70">
              {[
                { label: "Home", id: "home" },
                { label: "Shop", id: "shop" },
                { label: "About", id: "about" },
                { label: "Contact", id: "contact" },
              ].map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="hover:text-white transition-colors"
                  onClick={(e) => { e.preventDefault(); scrollToSection(item.id); }}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="flex gap-8 text-white/60">
              {["Instagram", "Twitter", "Dribbble"].map((link) => (
                <a href="#" key={link} className="hover:text-white transition-colors">{link}</a>
              ))}
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