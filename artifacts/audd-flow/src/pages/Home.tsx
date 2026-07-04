import { TopBar } from "@/components/layout/TopBar";
import { useGetTreasury } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, type Variants } from "framer-motion";

export default function Home() {
  const { data: treasury, isLoading } = useGetTreasury();

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <>
      <TopBar title="Treasury" showSettings />
      <div className="flex-1 px-6 pt-32 space-y-6">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-40 w-full rounded-[2rem] bg-white/[0.03]" />
            <Skeleton className="h-48 w-full rounded-[2rem] bg-white/[0.03]" />
          </div>
        ) : treasury ? (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={item} className="glass-card rounded-[2.5rem] p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />
              <p className="text-sm text-white/40 font-medium uppercase tracking-widest mb-3">Total Value</p>
              <div className="space-y-6">
                {treasury.balances.map((b) => (
                  <div key={b.token} className="flex flex-col">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-light text-white tracking-tight">{b.formatted}</span>
                      <span className="text-xl font-medium text-white/50">{b.symbol}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={item} className="glass-card rounded-[2rem] p-6">
              <h2 className="text-sm font-medium text-white/60 mb-6 uppercase tracking-widest">Daily Guardrails</h2>
              <div className="space-y-6">
                {treasury.guardrails.map((g) => {
                  const spent = Number(g.spentToday);
                  const cap = Number(g.dailyCap);
                  const pct = cap > 0 ? (spent / cap) * 100 : 0;
                  
                  return (
                    <div key={g.token} className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/80 font-medium">{g.symbol}</span>
                        <span className="text-white/40">{g.spentTodayFormatted} <span className="text-white/40">/</span> {g.dailyCapFormatted}</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(pct, 100)}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
            
            <motion.div variants={item} className="grid grid-cols-2 gap-4">
               <div className="glass-card rounded-[2rem] p-6">
                  <p className="text-[10px] text-white/40 font-semibold uppercase tracking-widest mb-2">Employees</p>
                  <p className="text-3xl font-light text-white">{treasury.activeEmployeeCount} <span className="text-lg text-white/40 font-normal">/ {treasury.employeeCount}</span></p>
               </div>
               <div className="glass-card rounded-[2rem] p-6">
                  <p className="text-[10px] text-white/40 font-semibold uppercase tracking-widest mb-2">Monthly Payroll</p>
                  <p className="text-2xl font-light text-white truncate">{treasury.monthlyPayrollFormatted}</p>
               </div>
            </motion.div>
          </motion.div>
        ) : (
          <div className="text-center text-white/50 py-10 font-light">Failed to load treasury data.</div>
        )}
      </div>
    </>
  );
}