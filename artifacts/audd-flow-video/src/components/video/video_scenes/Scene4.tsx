import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
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
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center pt-[5vh]"
      initial={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -50, filter: 'blur(10px)' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div className="text-center z-20 mb-12 flex flex-col items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      >
        <div className="text-[#00FFAA] font-mono text-sm tracking-widest uppercase mb-4 flex items-center gap-3">
          <div className="w-4 h-[1px] bg-[#00FFAA]"></div>
          03 // Verification
          <div className="w-4 h-[1px] bg-[#00FFAA]"></div>
        </div>
        <h2 className="text-[4vw] font-display font-light text-white leading-tight tracking-tight">
          Strict Guardrails. <br/><span className="text-[rgba(255,255,255,0.4)]">Verifiable On-Chain.</span>
        </h2>
      </motion.div>

      <div className="flex items-center justify-center gap-[6vw] w-full max-w-[85vw] z-10 perspective-container">
        {/* Device 1: Settings / Guardrails */}
        <motion.div className="device-frame w-[280px] h-[600px]"
          initial={{ opacity: 0, x: -100, rotateY: 15, rotateZ: -2 }}
          animate={phase >= 2 ? { opacity: 1, x: 0, rotateY: 5, rotateZ: -1 } : { opacity: 0, x: -100, rotateY: 15, rotateZ: -2 }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
        >
          <img src={`${import.meta.env.BASE_URL}screenshots/settings.jpg`} className="w-full h-full object-cover" alt="Security Settings" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
          <div className="absolute bottom-6 left-6 right-6">
            <div className="text-white font-display font-medium text-lg mb-1">Human in the Loop</div>
            <div className="text-xs text-white/60 font-mono">Halt switch & limits</div>
          </div>
        </motion.div>

        {/* Device 2: Activity */}
        <motion.div className="device-frame w-[280px] h-[600px]"
          initial={{ opacity: 0, x: 100, rotateY: -15, rotateZ: 2 }}
          animate={phase >= 3 ? { opacity: 1, x: 0, rotateY: -5, rotateZ: 1 } : { opacity: 0, x: 100, rotateY: -15, rotateZ: 2 }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
        >
          <img src={`${import.meta.env.BASE_URL}screenshots/activity.jpg`} className="w-full h-full object-cover" alt="Activity Feed" />
        </motion.div>
      </div>

      {/* Floating Hash data */}
      <motion.div className="absolute bottom-[6vh] z-30 glass-panel px-10 py-5 rounded-2xl neon-border backdrop-blur-2xl bg-black/70"
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={phase >= 4 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        <div className="flex items-center gap-6">
          <div className="w-3 h-3 rounded-full bg-[#00FFAA] animate-pulse shrink-0" style={{ boxShadow: '0 0 14px #00FFAA' }}></div>
          <div className="flex flex-col">
            <div className="text-[11px] text-[#00FFAA] font-mono uppercase tracking-[0.3em] mb-1.5">BOT Chain Transaction</div>
            <div className="text-white font-mono font-bold text-lg tracking-wide whitespace-nowrap">0xabcfdd7d8909488243425f2cc65a0afe7f9397a25</div>
          </div>
          <div className="w-px h-12 bg-white/25 mx-1 shrink-0"></div>
          <div className="flex flex-col items-start shrink-0">
            <div className="text-[11px] text-white/50 font-mono uppercase tracking-[0.3em] mb-1.5">Chain ID</div>
            <div className="text-white font-mono font-bold text-2xl leading-none">968</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
