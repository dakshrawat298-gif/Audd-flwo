import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 3000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-between px-[8vw]"
      initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: -100, filter: 'blur(10px)' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-[45%] z-10 relative">
        <motion.div className="mb-4 text-[#00F0FF] font-mono text-sm tracking-widest uppercase flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
        >
          <div className="w-8 h-[1px] bg-[#00F0FF]"></div>
          01 // The Cockpit
        </motion.div>
        
        <motion.h2 className="text-[4.5vw] font-display leading-[1.1] font-light mb-6 text-white tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        >
          Total visibility.<br/><span className="text-[rgba(255,255,255,0.4)]">Zero friction.</span>
        </motion.h2>

        <motion.div className="flex flex-col gap-5 mt-10"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        >
          <div className="glass-panel p-6 rounded-2xl border-l-2 border-l-[#00F0FF] flex items-center justify-between">
            <div>
              <div className="text-[rgba(255,255,255,0.5)] text-xs uppercase tracking-widest mb-2 font-mono">Treasury Balance</div>
              <div className="text-3xl font-light font-display text-white">99,500 <span className="text-[#00F0FF] text-xl font-mono">aUSD</span></div>
            </div>
          </div>
          
          <div className="glass-panel p-6 rounded-2xl border-l-2 border-l-white/20 flex items-center justify-between">
            <div>
              <div className="text-[rgba(255,255,255,0.5)] text-xs uppercase tracking-widest mb-2 font-mono">Monthly Payroll</div>
              <div className="text-3xl font-light font-display text-white">19,500 <span className="text-white/50 text-xl font-mono">aUSD</span></div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="w-[45%] flex justify-center relative z-10 perspective-container">
        {/* Device Frame */}
        <motion.div className="device-frame w-[340px] h-[740px]"
          initial={{ opacity: 0, y: 50, rotateY: 15, rotateX: 5 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, rotateY: -10, rotateX: 0 } : { opacity: 0, y: 50, rotateY: 15, rotateX: 5 }}
          transition={{ duration: 1.2, type: "spring", stiffness: 80, damping: 20 }}
        >
          <img src={`${import.meta.env.BASE_URL}screenshots/treasury.jpg`} className="w-full h-full object-cover" alt="Treasury Dashboard" />
          
          {/* Scanning effect */}
          <motion.div className="absolute left-0 right-0 h-[1px] bg-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.8)]"
            animate={{ top: ['-10%', '110%', '-10%'] }}
            transition={{ duration: 6, ease: "linear", repeat: Infinity }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
