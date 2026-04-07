import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function Preloader({ onComplete }) {
  const words = ["The", "Art", "Shop"];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index === words.length) {
      const timer = setTimeout(onComplete, 500);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setIndex(index + 1);
    }, 500);

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
}
