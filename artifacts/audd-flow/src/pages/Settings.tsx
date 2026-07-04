import { useState } from "react";
import { useGetConfig, useGetTreasury, usePauseTreasury, useUnpauseTreasury, useUpdateGuardrail, getGetTreasuryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Power, Network, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { motion, type Variants } from "framer-motion";

export default function Settings() {
  const { data: config, isLoading: isConfigLoading } = useGetConfig();
  const { data: treasury, isLoading: isTreasuryLoading } = useGetTreasury();
  
  const queryClient = useQueryClient();
  const pause = usePauseTreasury();
  const unpause = useUnpauseTreasury();

  const handlePauseToggle = () => {
    if (!treasury) return;
    const action = treasury.paused ? unpause : pause;
    action.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTreasuryQueryKey() });
        toast.success(`Treasury ${treasury.paused ? 'unpaused' : 'paused'}`);
      },
      onError: (err: any) => toast.error(err.message || "Failed to update treasury state")
    });
  };

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <>
      <TopBar title="Settings" />
      <div className="flex-1 px-6 pt-32 pb-20 flex flex-col">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
          {/* Treasury Controls */}
          <motion.section variants={item} className="space-y-4">
            <h2 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2 ml-2">
              <Shield className="w-3 h-3" /> Security Controls
            </h2>
            
            <div className="glass-card rounded-[2.5rem] p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-light text-white">Agent Status</p>
                  <p className="text-xs text-white/40 mt-1 font-light">Halt all AI agent spending</p>
                </div>
                <Button
                  onClick={handlePauseToggle}
                  disabled={pause.isPending || unpause.isPending || isTreasuryLoading}
                  className={`rounded-2xl h-10 px-4 font-medium transition-all duration-300 ${
                    treasury?.paused 
                      ? "bg-primary text-black hover:bg-primary hover:shadow-[0_0_15px_rgba(0,255,255,0.6)]" 
                      : "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 hover:border-destructive/40"
                  }`}
                  data-testid="button-toggle-pause"
                >
                  <Power className="w-4 h-4 mr-2" />
                  {treasury?.paused ? "Resume Agent" : "Halt Agent"}
                </Button>
              </div>

              <div className="h-px bg-white/[0.05]" />

              <div>
                <p className="text-sm font-medium text-white/80 mb-4">Update Guardrails</p>
                <div className="space-y-3">
                  {treasury?.guardrails.map(g => (
                    <GuardrailUpdate key={g.token} guardrail={g} />
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* Network Info */}
          <motion.section variants={item} className="space-y-4">
            <h2 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2 ml-2">
              <Network className="w-3 h-3" /> Network & Contracts
            </h2>
            
            <div className="glass-card rounded-[2.5rem] p-6 space-y-4">
              {isConfigLoading ? <Skeleton className="h-32 w-full rounded-[1.5rem] bg-white/[0.03]" /> : config && (
                <>
                  <InfoRow label="Network" value={config.network.name} />
                  <InfoRow label="Chain ID" value={config.network.chainId.toString()} />
                  <InfoRow label="Treasury" value={config.deployment.treasuryAddress || "Not deployed"} mono />
                  <InfoRow label="Agent Admin" value={config.deployment.agent || "Not set"} mono />
                </>
              )}
            </div>
          </motion.section>
        </motion.div>
      </div>
    </>
  );
}

function InfoRow({ label, value, mono }: { label: string, value: string, mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/[0.02] last:border-0">
      <span className="text-sm text-white/40 font-light">{label}</span>
      <span className={`text-sm text-white/90 ${mono ? 'font-mono text-xs max-w-[150px] tracking-widest truncate' : 'font-light'}`}>{value}</span>
    </div>
  );
}

function GuardrailUpdate({ guardrail }: any) {
  const [open, setOpen] = useState(false);
  const [daily, setDaily] = useState(guardrail.dailyCap);
  const [perTx, setPerTx] = useState(guardrail.perTxCap);
  
  const queryClient = useQueryClient();
  const update = useUpdateGuardrail();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(
      { data: { token: guardrail.symbol, dailyCap: daily, perTxCap: perTx } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTreasuryQueryKey() });
          toast.success("Guardrails updated");
          setOpen(false);
        },
        onError: (err: any) => toast.error(err.message || "Failed to update guardrails")
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-between h-auto py-4 px-5 glass-button rounded-2xl group">
          <div className="text-left">
            <p className="text-base text-white font-light">{guardrail.symbol}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Daily: {guardrail.dailyCapFormatted} <span className="mx-1 text-white/40">|</span> Per Tx: {guardrail.perTxCapFormatted}</p>
          </div>
          <Settings2 className="w-5 h-5 text-white/40 group-hover:text-primary transition-colors" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-black/90 border-white/10 backdrop-blur-2xl sm:max-w-md rounded-[2rem] p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white font-light tracking-tight">Update {guardrail.symbol} Limits</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          <div className="space-y-2">
             <label className="text-[10px] text-white/40 uppercase tracking-widest ml-2">Daily Cap</label>
             <Input value={daily} onChange={e => setDaily(e.target.value)} required type="number" step="0.01" className="bg-white/[0.03] border-white/[0.1] focus-visible:border-primary/50 focus-visible:ring-0 rounded-2xl h-12 text-white px-4 font-light" />
          </div>
          <div className="space-y-2">
             <label className="text-[10px] text-white/40 uppercase tracking-widest ml-2">Per-Tx Cap</label>
             <Input value={perTx} onChange={e => setPerTx(e.target.value)} required type="number" step="0.01" className="bg-white/[0.03] border-white/[0.1] focus-visible:border-primary/50 focus-visible:ring-0 rounded-2xl h-12 text-white px-4 font-light" />
          </div>
          <Button type="submit" disabled={update.isPending} className="w-full bg-primary text-black hover:bg-primary hover:shadow-[0_0_15px_rgba(0,255,255,0.6)] rounded-2xl mt-6 h-12 text-sm font-medium transition-all duration-300">
            {update.isPending ? "Updating..." : "Save Limits"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
