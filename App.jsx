import React, { useState, useEffect, useRef } from "react";
import { motion, useSpring, useTransform, useScroll, AnimatePresence } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";

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
    src: `./image/${filename}`, // Local relative path
    mrp: isDeer ? 2500 : 2000,
    price: isDeer ? 1500 : 999,
  };
});

// --- MAGNETIC EYEBALL (THREE.JS) ---
const Eye = ({ mouse }) => {
  const eyeRef = useRef();
  
  useFrame((state) => {
    if (!eyeRef.current) return;
    // Look at mouse center logic
    const x = (state.pointer.x * state.viewport.width) / 2;
    const y = (state.pointer.y * state.viewport.height) / 2;
    eyeRef.current.lookAt(x, y, 1);
  });

  return (
    <group ref={eyeRef}>
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>
      {/* Pupil */}
      <mesh position={[0, 0, 0.95]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
    </group>
  );
};

// --- CUSTOM CURSOR ---
const CustomCursor = ({ cursorVariant }) => {
  // Use framer-motion springs for the "lagging fluid" physics feel
  const cursorX = useSpring(-100, { stiffness: 400, damping: 28 });
  const cursorY = useSpring(-100, { stiffness: 400, damping: 28 });

  useEffect(() => {
    const moveCursor = (e) => {
      cursorX.set(e.clientX - 16);
      cursorY.set(e.clientY - 16);
    };
    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, [cursorX, cursorY]);

  const variants = {
    default: {
      width: 32,
      height: 32,
      border: "1px solid black",
      backgroundColor: "rgba(0,0,0,0)",
      borderRadius: "50%",
      mixBlendMode: "difference"
    },
    magnetic: {
      width: 64,
      height: 64,
      x: "-16px",
      y: "-16px",
      backgroundColor: "black",
      color: "white",
      borderRadius: "50%",
      mixBlendMode: "normal"
    },
    viewImage: {
      width: 120,
      height: 80,
      x: "-44px",
      y: "-24px",
      backgroundColor: "black",
      borderRadius: "4px",
      mixBlendMode: "normal",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    },
    eye: {
      width: 150,
      height: 150,
      x: "-59px",
      y: "-59px",
      borderRadius: "50%",
      backgroundColor: "transparent",
      backdropFilter: "invert(100%)",
      mixBlendMode: "difference"
    },
  };

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-50 flex items-center justify-center font-bold text-xs"
      style={{ x: cursorX, y: cursorY }}
      variants={variants}
      animate={cursorVariant}
      transition={{ duration: 0.1, ease: "linear" }}
    >
      {cursorVariant === "viewImage" && <span className="text-white tracking-widest leading-none text-center">VIEW<br/>ART</span>}
      {cursorVariant === "eye" && (
        <div className="w-full h-full rounded-full flex items-center justify-center bg-black">
           {/* Fallback CSS Eye Inside Cursor */}
           <div className="w-[80px] h-[80px] bg-white rounded-full flex items-center justify-center relative shadow-inner">
             <motion.div 
               className="w-[30px] h-[30px] bg-black rounded-full absolute"
               animate={{ x: cursorX.get() / 50, y: cursorY.get() / 50 }} 
             />
           </div>
        </div>
      )}
    </motion.div>
  );
};

export default function App() {
  const [cursorVariant, setCursorVariant] = useState("default");
  
  const enterMagnetic = () => setCursorVariant("magnetic");
  const leaveCursor = () => setCursorVariant("default");
  const enterImage = () => setCursorVariant("viewImage");
  const enterEye = () => setCursorVariant("eye");

  return (
    <div className="bg-[#f0f0f0] text-black w-full min-h-screen font-sans selection:bg-black selection:text-white pt-20">
      <CustomCursor cursorVariant={cursorVariant} />

      {/* Header */}
      <header className="fixed top-0 w-full p-6 flex justify-center z-40 mix-blend-difference text-white">
        <h1 className="text-sm font-bold tracking-[0.3em]">THE ART SHOP</h1>
      </header>

      {/* PANEL 1: Hero */}
      <section className="h-screen w-full flex flex-col justify-center items-center snap-center relative overflow-hidden">
        <div className="z-10 text-center pointer-events-none uppercase">
          <motion.h1 
            initial={{ y: 50, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            className="text-[4rem] md:text-[8rem] font-black leading-[0.9] tracking-tighter"
          >
            GEOMETRIC WOOD<br />ORIGINALS
          </motion.h1>
          <p className="mt-4 text-sm tracking-[0.2em] font-medium">REDEFINE YOUR SPACE • THE ART SHOP</p>
        </div>
        
        {/* Ticker marquee */}
        <div className="absolute top-[80%] whitespace-nowrap overflow-hidden w-full flex opacity-10">
          <motion.div 
            className="text-[12rem] font-bold tracking-tight inline-block"
            animate={{ x: ["0%", "-100%"] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 25 }}
          >
            THE ART SHOP • BESPOKE CREATIONS • 
          </motion.div>
        </div>
      </section>

      {/* PANEL 2: Shop Gallery */}
      <section className="min-h-screen w-full px-4 md:px-12 py-32 snap-start bg-black text-white">
        <h2 className="text-3xl font-black mb-16 tracking-tighter">CURATED ORIGINALS</h2>
        
        {/* Asymmetrical grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-y-32">
          {products.map((product, i) => (
            <motion.div 
              key={product.id}
              initial={{ y: 100, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: (i % 3) * 0.1 }}
              className={`flex flex-col relative w-full ${i % 2 === 0 ? 'md:mt-24' : ''}`}
            >
              <div 
                className="overflow-hidden bg-[#111] aspect-[4/5] cursor-none"
                onMouseEnter={enterImage}
                onMouseLeave={leaveCursor}
              >
                <img 
                  src={product.src} 
                  alt={product.title} 
                  className="w-full h-full object-cover opacity-80 hover:opacity-100 hover:scale-105 transition-all duration-700 ease-out grayscale hover:grayscale-0"
                />
              </div>
              <div className="flex justify-between items-start mt-6 group">
                <h3 className="font-bold tracking-widest text-sm">{product.title}</h3>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className="text-xs text-gray-500 line-through">₹{product.mrp}</span>
                  <span className="text-lg font-black tracking-tight" onMouseEnter={enterMagnetic} onMouseLeave={leaveCursor}>
                    ₹{product.price}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PANEL 3: The Craft Interactive */}
      <section className="h-screen w-full snap-start flex justify-between items-center px-4 md:px-12 bg-white text-black relative">
        <div className="w-1/2 z-10 flex flex-col gap-16">
          <div onMouseEnter={enterMagnetic} onMouseLeave={leaveCursor} className="cursor-none">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter hover:text-gray-500 transition-colors">01 PRECISION LASER CUT</h2>
            <p className="mt-2 text-sm uppercase tracking-[0.2em]">Define your essence</p>
          </div>
          <div onMouseEnter={enterMagnetic} onMouseLeave={leaveCursor} className="cursor-none">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter hover:text-gray-500 transition-colors">02 PREMIUM MATERIAL</h2>
            <p className="mt-2 text-sm uppercase tracking-[0.2em]">Build recognition and trust</p>
          </div>
        </div>
        
        {/* Interactive Eye Section */}
        <div 
          className="w-1/2 h-[70vh] relative border border-black/10 flex items-center justify-center p-4 cursor-none overflow-hidden"
          onMouseEnter={enterEye}
          onMouseLeave={leaveCursor}
        >
          {/* Background Text */}
          <h2 className="absolute text-center text-7xl font-bold tracking-tighter opacity-10 uppercase z-0 pointer-events-none">
            Motion<br />Storytelling
          </h2>
          
          {/* THREE JS Canvas */}
          <Canvas id="comp-lp1a07ofwebglcanvas" className="z-10 !w-full !h-full" camera={{ position: [0, 0, 5] }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1.5} />
            <Eye />
          </Canvas>
        </div>
      </section>

      {/* PANEL 4: Footer */}
      <footer className="min-h-screen snap-end bg-black text-white flex flex-col justify-end p-4 md:p-12 relative">
        <div className="w-full flex-grow flex items-center justify-center text-center px-6">
          <h1 className="text-[10vw] font-black leading-[0.85] tracking-tighter uppercase" onMouseEnter={enterMagnetic} onMouseLeave={leaveCursor}>
            LET'S CREATE <br /> <span className="text-transparent border-text-white italic font-serif">extra-ordinary</span> <br /> TOGETHER!
          </h1>
        </div>
        
        <div className="border-t border-white/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-6 text-sm uppercase tracking-widest">
           <form className="flex w-full md:w-1/3" onMouseEnter={enterMagnetic} onMouseLeave={leaveCursor}>
              <input type="email" placeholder="NEWSLETTER SUBSCRIPTION" className="bg-transparent border-b border-white outline-none w-full pb-2 placeholder-white/50 focus:border-white transition-colors" />
           </form>
           <div className="flex gap-4">
             {['Instagram', 'Twitter', 'Dribbble'].map(link => (
               <a href="#" key={link} className="hover:opacity-50 transition-opacity cursor-none" onMouseEnter={enterMagnetic} onMouseLeave={leaveCursor}>{link}</a>
             ))}
           </div>
        </div>
      </footer>
    </div>
  );
}