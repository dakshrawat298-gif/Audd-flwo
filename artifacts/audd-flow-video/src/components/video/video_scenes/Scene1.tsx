import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2800),
      setTimeout(() => setPhase(4), 4000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 1 }}
    >
      <div className="text-center px-12 relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center">
        <motion.div 
          className="h-[1px] bg-gradient-to-r from-transparent via-[rgba(0,240,255,0.5)] to-transparent mb-8"
          initial={{ width: 0, opacity: 0 }}
          animate={phase >= 1 ? { width: '100%', opacity: 1 } : { width: 0, opacity: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />

        <motion.h1 
          className="text-[5vw] font-display tracking-tight text-white leading-tight font-light"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          Managing on-chain treasury <br />
          <span className="text-[rgba(255,255,255,0.3)]">is manual and risky.</span>
        </motion.h1>

        <motion.div
          className="mt-12 glass-panel px-8 py-4 rounded-full flex items-center gap-4 neon-border"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.8, type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className="w-2 h-2 rounded-full bg-[#FF3B30] animate-pulse" style={{ boxShadow: '0 0 10px #FF3B30' }} />
          <span className="text-[1.2vw] font-mono tracking-widest text-[#FF3B30]">SYSTEM INEFFICIENCY DETECTED</span>
        </motion.div>
        
        <motion.div 
          className="h-[1px] bg-gradient-to-r from-transparent via-[rgba(0,240,255,0.5)] to-transparent mt-12"
          initial={{ width: 0, opacity: 0 }}
          animate={phase >= 3 ? { width: '100%', opacity: 1 } : { width: 0, opacity: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </motion.div>
  );
}
