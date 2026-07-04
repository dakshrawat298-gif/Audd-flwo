import { useListActivity } from "@workspace/api-client-react";
import { TopBar } from "@/components/layout/TopBar";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Activity as ActivityIcon } from "lucide-react";
import { motion, type Variants } from "framer-motion";

export default function Activity() {
  const { data: activities, isLoading } = useListActivity();

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item: Variants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <>
      <TopBar title="Activity Feed" />
      <div className="flex-1 px-4 pt-32 pb-6 space-y-4 flex flex-col">
        {isLoading ? (
           <div className="space-y-4 px-2">
             {[1,2,3,4,5].map(i => (
               <Skeleton key={i} className="h-24 w-full rounded-[1.5rem] bg-white/[0.03]" />
             ))}
           </div>
        ) : activities?.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-white/50 py-12 glass-card rounded-[2rem] mx-2">
            <ActivityIcon className="w-8 h-8 mx-auto mb-4 opacity-20" />
            <p className="font-light">No activity yet.</p>
          </motion.div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-3 px-2 pb-20">
            {activities?.map((activity, idx) => (
              <motion.a 
                variants={item}
                key={idx} 
                href={activity.explorerUrl || "#"} 
                target="_blank" 
                rel="noreferrer"
                className="block glass-card rounded-[1.5rem] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_8px_30px_rgba(0,255,255,0.05)] group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-base font-light text-white/90 leading-tight">
                      {activity.title}
                    </h4>
                    <p className="text-xs text-white/40 mt-1 font-light">{activity.subtitle}</p>
                  </div>
                  {activity.amountFormatted && (
                    <div className="text-right flex items-baseline gap-1.5 ml-4 shrink-0">
                      <span className="text-lg font-light text-white tracking-tight">{activity.amountFormatted}</span>
                      <span className="text-[10px] text-white/40 uppercase tracking-widest">{activity.symbol}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-4">
                   <div className="text-[10px] font-mono text-white/40 tracking-widest truncate max-w-[200px]">
                     {activity.txHash ? `${activity.txHash.slice(0,10)}...${activity.txHash.slice(-8)}` : "No hash"}
                   </div>
                   <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-primary transition-colors" />
                </div>
              </motion.a>
            ))}
          </motion.div>
        )}
      </div>
    </>
  );
}
