import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 3400),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-between px-[8vw]"
      initial={{ opacity: 0, x: 100, filter: 'blur(10px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-[45%] flex justify-center relative z-10 perspective-container order-2">
        {/* Device Frame */}
        <motion.div className="device-frame w-[340px] h-[740px]"
          initial={{ opacity: 0, y: 50, rotateY: -15, rotateX: 5 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, rotateY: 10, rotateX: 0 } : { opacity: 0, y: 50, rotateY: -15, rotateX: 5 }}
          transition={{ duration: 1.2, type: "spring", stiffness: 80, damping: 20 }}
        >
          <img src={`${import.meta.env.BASE_URL}screenshots/agent.jpg`} className="w-full h-full object-cover" alt="AI Agent" />
        </motion.div>
      </div>

      <div className="w-[45%] z-10 relative order-1">
        <motion.div className="mb-4 text-[#00FFAA] font-mono text-sm tracking-widest uppercase flex items-center gap-3"
          initial={{ opacity: 0, y: -20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        >
          <div className="w-8 h-[1px] bg-[#00FFAA]"></div>
          02 // Intent Engine
        </motion.div>
        
        <motion.h2 className="text-[4.5vw] font-display leading-[1.1] font-light mb-8 text-white tracking-tight"
          initial={{ opacity: 0, x: -20 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
        >
          Speak plainly.<br/><span className="text-[rgba(255,255,255,0.4)]">Execute securely.</span>
        </motion.h2>

        <div className="relative">
          {/* Prompt card */}
          <motion.div className="glass-panel p-6 rounded-2xl mb-6 relative overflow-hidden"
            initial={{ opacity: 0, x: -50 }}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] uppercase font-mono text-white/70">Usr</div>
              <div className="text-xs text-[rgba(255,255,255,0.5)] font-mono uppercase tracking-widest">Natural Language</div>
            </div>
            <div className="text-xl text-white font-light leading-relaxed">
              "Pay <span className="text-[#00F0FF] font-normal">Alice Nguyen</span> a <span className="text-[#00FFAA] font-normal">500 aUSD</span> performance bonus"
            </div>
          </motion.div>

          {/* Gemini Processing */}
          <motion.div className="glass-panel p-6 rounded-2xl ml-8 border-l-2 border-l-[#00FFAA]"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="text-[#00FFAA] animate-pulse" style={{ textShadow: '0 0 10px #00FFAA' }}>●</div>
              <div className="text-xs text-[rgba(255,255,255,0.5)] font-mono tracking-widest uppercase">Agent Processing</div>
            </div>
            <div className="font-mono text-[rgba(255,255,255,0.8)] text-sm space-y-2">
              <div className="flex gap-3">
                <span className="text-[#00F0FF]">{'>'}</span> 
                <span>Intents mapped to contracts</span>
              </div>
              <div className="flex gap-3 text-[#00FFAA]">
                <span>{'>'}</span> 
                <span>Guardrails checked: PASS</span>
              </div>
              <div className="flex gap-3">
                <span className="text-[#00F0FF]">{'>'}</span> 
                <span>Transaction executed on BOT Chain</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
