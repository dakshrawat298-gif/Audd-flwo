import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Background massive logo mark / shape */}
      <motion.div className="absolute w-[100vw] h-[100vw] rounded-full opacity-[0.03] blur-[100px] pointer-events-none mix-blend-screen"
        style={{ background: 'radial-gradient(circle, #00F0FF 0%, transparent 70%)' }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={phase >= 1 ? { scale: 1, opacity: 0.1 } : { scale: 0.5, opacity: 0 }}
        transition={{ duration: 4, ease: "easeOut" }}
      />
      
      <motion.div className="absolute w-[80vw] h-[80vw] rounded-full opacity-[0.03] blur-[80px] pointer-events-none mix-blend-screen"
        style={{ background: 'radial-gradient(circle, #00FFAA 0%, transparent 70%)' }}
        initial={{ scale: 0.5, opacity: 0, x: '20vw', y: '20vh' }}
        animate={phase >= 1 ? { scale: 1.2, opacity: 0.08, x: 0, y: 0 } : { scale: 0.5, opacity: 0, x: '20vw', y: '20vh' }}
        transition={{ duration: 4, ease: "easeOut", delay: 0.2 }}
      />

      <div className="relative z-10 text-center flex flex-col items-center">
        <motion.h1 className="text-[8vw] font-display font-light tracking-tight text-white leading-none mb-8"
          initial={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
          animate={phase >= 2 ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : { opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        >
          Audd Flow <span className="text-[rgba(255,255,255,0.3)]">— Kinetic</span>
        </motion.h1>

        <motion.div className="flex flex-col items-center gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="text-[2vw] text-[rgba(255,255,255,0.5)] font-light font-display">
            The intelligent treasury is here.
          </div>
          
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent my-2"></div>
          
          <div className="flex items-center gap-4 px-8 py-4 rounded-full bg-white/[0.03] border border-white/10 text-white/80 font-mono text-sm tracking-widest backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#00FFAA] animate-pulse" style={{ boxShadow: '0 0 10px #00FFAA' }}></span>
            BUILT ON BOT CHAIN
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
