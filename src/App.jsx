import React, { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Lenis from '@studio-freight/lenis'
import Splitting from "splitting";
import "splitting/dist/splitting.css";
import "splitting/dist/splitting-cells.css";

const BASE_URL = import.meta.env.BASE_URL;

// --- PRODUCT DATA AND PRICING LOGIC ---
const filenames = [
  "CR7.jpeg", "SpiderGlobe.jpeg", "Spidy.jpeg", "Messi.jpeg", "THINK.jpeg",
  "art.jpeg", "BAT.jpeg", "Bike.jpeg", "birds.jpeg", "bow Tie.jpeg", "butter Fly.jpeg", 
  "cat emo.jpeg", "cat Window.jpeg", "cats.jpeg", "deer head 2.jpeg", "deer head 3.jpeg", 
  "Deer head.jpeg", "deer skull.jpeg", "dragon.jpeg", "eagle.jpeg", "frame.jpeg", 
  "Heart with Hands.jpeg", "heartHuman.jpeg", "Lion.jpeg", "load balance.jpeg", 
  "lofi 2.jpeg", "lofi.jpeg", "Moon.jpeg", "mountain.jpeg", "mountains.jpeg", 
  "rose.jpeg", "S letter Snake.jpeg", "sipderMan.jpeg", "standing Cat.jpeg", 
  "windowBrids.jpeg", "wolf head.jpeg"
];

const productCopy = {
  CR7: {
    info: "A high-energy portrait piece built for bold interiors and football fans who like strong contrast.",
    short: "Bold sports-inspired wall art with a sharp modern finish.",
  },
  SpiderGlobe: {
    info: "A globe-like spider motif with layered lines that gives the piece a futuristic motion feel.",
    short: "A sharp, web-like piece with a clean futuristic look.",
  },
  Spidy: {
    info: "A dynamic spider-inspired cut art with movement, edge, and a darker street-art vibe.",
    short: "Compact and dramatic with an urban character.",
  },
  Messi: {
    info: "A minimal icon-style portrait piece that feels clean, premium, and instantly recognizable.",
    short: "Minimal and iconic for a clean premium wall.",
  },
  THINK: {
    info: "A thoughtful statement piece that brings calm structure and a modern editorial feel.",
    short: "Simple, thoughtful, and designed to stand out softly.",
  },
};

const getDefaultProductInfo = (title) => {
  if (title.toLowerCase().includes("deer")) {
    return "A refined deer silhouette piece with a premium handcrafted look for warm, natural spaces.";
  }

  return "A handcrafted wall art piece designed to add depth, edge, and personality to your space.";
};

const getPricing = (title) => {
  const isDeer = title.toLowerCase().includes("deer");
  return isDeer
    ? { S: 999, L: 1499, XL: 1999 }
    : { S: 599, L: 999, XL: 1499 };
};

const products = filenames.map((filename, i) => {
  const title = filename.replace(".jpeg", "").toUpperCase();
  return {
    id: i,
    title,
    src: `${BASE_URL}image/${encodeURIComponent(filename)}`,
    pricing: getPricing(title),
    info: productCopy[title]?.info || getDefaultProductInfo(title),
    shortInfo: productCopy[title]?.short || getDefaultProductInfo(title),
    category: title.toLowerCase().includes("deer") ? "Deer" : "Art",
  };
});
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
  const [viewProduct, setViewProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("L");
  
  const filteredProducts = products.filter(product => 
    product.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openProductView = (product) => {
    setSelectedSize("L");
    setViewProduct(product);
  };

  const closeProductView = () => {
    setViewProduct(null);
  };

  const getWhatsAppLink = (product, size) => {
    const message = `I'm interested in ${product.title} in size ${size}. Please share availability and delivery details.`;
    return `https://wa.me/+916006448855?text=${encodeURIComponent(message)}`;
  };
  
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
      <section id="shop" className="min-h-[150vh] w-full px-3 md:px-12 py-24 md:py-40 bg-[#0d0d0d] text-white relative overflow-hidden">
        <h2 className="text-4xl md:text-8xl font-black mb-10 md:mb-16 tracking-tighter text-transparent border-text-white z-20 relative text-center">CURATED ORIGINALS</h2>
        
        <div className="w-full max-w-md mx-auto mb-12 md:mb-24">
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

        <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-x-12 md:gap-y-40">
          {filteredProducts.map((product, i) => (
            <motion.div key={product.id} initial={{ y: 150, opacity: 0, scale: 0.95 }} whileInView={{ y: 0, opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 1.2, delay: (i % 3) * 0.1, ease: [0.76, 0, 0.24, 1] }} className={`flex flex-col relative w-full ${i % 3 === 1 ? 'md:mt-32' : ''}`}>
              <div className="overflow-hidden bg-[#1f1f1f] aspect-[2/3] md:aspect-[3/4] relative mask-container group">
                <motion.img src={product.src} alt={product.title} className="w-full h-full object-cover scale-[1.15] opacity-60 group-hover:opacity-100 group-hover:scale-100 transition-all duration-[1s] ease-[cubic-bezier(0.76,0,0.24,1)] grayscale group-hover:grayscale-0" />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-[1s] pointer-events-none" />
              </div>
              <div className="flex flex-col gap-2 mt-3 md:mt-8 group mb-4 md:mb-12">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold tracking-[0.08em] md:tracking-[0.2em] text-[9px] sm:text-[10px] md:text-xs uppercase truncate max-w-[68%]">{product.title}</h3>
                  <div className="text-right flex flex-col items-end gap-0.5 shrink-0">
                    <span className="text-[8px] md:text-[9px] text-white/35 uppercase tracking-[0.14em] md:tracking-[0.2em]">From</span>
                    <span className="text-sm md:text-xl font-black tracking-tight">₹{product.pricing.S}</span>
                  </div>
                </div>
                <p className="hidden sm:block text-[9px] md:text-[10px] leading-tight text-white/45 max-h-8 overflow-hidden">
                  {product.shortInfo}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openProductView(product)}
                    className="border border-white/50 text-white px-2.5 md:px-4 py-1 text-[9px] md:text-xs uppercase tracking-[0.1em] md:tracking-widest font-bold hover:bg-white hover:text-black transition-colors"
                  >
                    VIEW
                  </button>
                  <a 
                    href={getWhatsAppLink(product, "L")} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="border border-white/50 text-white px-2.5 md:px-4 py-1 text-[9px] md:text-xs uppercase tracking-[0.1em] md:tracking-widest font-bold hover:bg-white hover:text-black transition-colors"
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

      <AnimatePresence>
        {viewProduct && (
          <motion.div
            key={viewProduct.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black text-white overflow-y-auto"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)] pointer-events-none" />
            <button
              type="button"
              onClick={closeProductView}
              className="absolute top-4 right-4 md:top-8 md:right-8 z-20 h-12 w-12 rounded-full border border-white/20 bg-black/60 backdrop-blur flex items-center justify-center text-2xl leading-none hover:bg-white hover:text-black transition-colors"
              aria-label="Close product view"
            >
              ×
            </button>

            <div className="min-h-screen grid lg:grid-cols-[1.15fr_0.85fr]">
              <div className="relative min-h-[52vh] lg:min-h-screen flex items-center justify-center p-6 md:p-10 bg-black">
                <img
                  src={viewProduct.src}
                  alt={viewProduct.title}
                  className="w-full h-full max-h-[82vh] object-contain select-none"
                />
              </div>

              <div className="relative border-t lg:border-t-0 lg:border-l border-white/10 px-6 py-10 md:px-10 lg:px-14 lg:py-16 flex flex-col justify-center gap-8 bg-[#070707]">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/45">View Product Page</p>
                  <h3 className="mt-3 text-4xl md:text-6xl font-black tracking-tighter uppercase">{viewProduct.title}</h3>
                  <p className="mt-5 max-w-xl text-white/70 leading-relaxed">{viewProduct.info}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">Choose Size</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {Object.entries(viewProduct.pricing).map(([size, price]) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`rounded-2xl border px-4 py-4 text-left transition-colors ${selectedSize === size ? 'border-white bg-white text-black' : 'border-white/15 bg-white/5 text-white hover:bg-white/10'}`}
                      >
                        <span className="block text-xs uppercase tracking-[0.25em] opacity-70">{size}</span>
                        <span className="mt-2 block text-2xl font-black">₹{price}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/45">Selected Size</p>
                      <p className="mt-2 text-3xl font-black uppercase tracking-tight">{selectedSize}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/45">Price</p>
                      <p className="mt-2 text-4xl font-black tracking-tight">₹{viewProduct.pricing[selectedSize]}</p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm text-white/60 leading-relaxed">{viewProduct.shortInfo}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={getWhatsAppLink(viewProduct, selectedSize)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black hover:bg-white/90 transition-colors"
                  >
                    GET
                  </a>
                  <button
                    type="button"
                    onClick={closeProductView}
                    className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white hover:bg-white/10 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            <div className="text-white/70 text-xs uppercase tracking-[0.22em] font-semibold">
              Connect via{" "}
              <a
                href="https://www.instagram.com/theartshop.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:underline transition-colors normal-case tracking-normal"
              >
                Instagram
              </a>
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