import { useState } from "react";
import { useListIntents, useCreateIntent, useExecuteIntent, getListIntentsQueryKey, getGetTreasuryQueryKey, getListActivityQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, ArrowRight, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function Agent() {
  const [prompt, setPrompt] = useState("");
  const queryClient = useQueryClient();
  const { data: intents, isLoading } = useListIntents();
  const createIntent = useCreateIntent();
  const executeIntent = useExecuteIntent();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    createIntent.mutate(
      { data: { prompt } },
      {
        onSuccess: () => {
          setPrompt("");
          queryClient.invalidateQueries({ queryKey: getListIntentsQueryKey() });
          toast.success("Intent created and planned");
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to create intent");
        }
      }
    );
  };

  const handleExecute = (id: number) => {
    executeIntent.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListIntentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTreasuryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListActivityQueryKey() });
          toast.success("Intent executed successfully");
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to execute intent");
        }
      }
    );
  };

  return (
    <>
      <TopBar title="Agent Console" />
      <div className="flex-1 px-4 pt-32 space-y-6 flex flex-col h-full">
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card border-primary/20 rounded-[2rem] p-4 relative z-10 shrink-0 shadow-[0_0_30px_rgba(0,255,255,0.05)]"
        >
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <div className="flex items-center gap-3 px-4 py-3 bg-black/50 rounded-xl border border-white/[0.05] focus-within:border-primary/50 focus-within:shadow-[0_0_15px_rgba(0,255,255,0.2)] transition-all duration-500">
              <Sparkles className="w-5 h-5 text-primary drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]" />
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Instruct the agent..."
                className="border-0 bg-transparent focus-visible:ring-0 px-0 text-white placeholder:text-white/40 h-10 text-lg font-light"
                disabled={createIntent.isPending}
                data-testid="input-agent-prompt"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!prompt.trim() || createIntent.isPending}
                className="rounded-xl h-10 w-10 bg-primary text-black hover:bg-primary hover:shadow-[0_0_15px_rgba(0,255,255,0.6)] transition-all shrink-0 disabled:opacity-50 disabled:shadow-none"
                data-testid="button-create-intent"
              >
                {createIntent.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              </Button>
            </div>
          </form>
        </motion.div>

        <div className="flex-1 overflow-y-auto pb-6 space-y-4">
          <h2 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest ml-2">Recent Intents</h2>
          
          {isLoading ? (
             <div className="space-y-4">
               {[1,2,3].map(i => (
                 <Skeleton key={i} className="h-40 w-full rounded-[2rem] bg-white/[0.03]" />
               ))}
             </div>
          ) : intents?.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-white/50 py-12 glass-card rounded-[2rem]">
              <Sparkles className="w-8 h-8 mx-auto mb-4 opacity-20" />
              <p className="font-light">No intents yet.</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {intents?.map((intent, idx) => (
                  <motion.div 
                    key={intent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="glass-card rounded-[2rem] p-6 flex flex-col gap-5"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <p className="text-white/90 font-light text-xl leading-snug">"{intent.prompt}"</p>
                      {intent.status === "planned" && <Badge variant="warning">Planned</Badge>}
                      {intent.status === "executed" && <Badge variant="success">Executed</Badge>}
                      {intent.status === "failed" && <Badge variant="destructive">Failed</Badge>}
                      {intent.status === "rejected" && <Badge variant="destructive">Rejected</Badge>}
                    </div>
                    
                    <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/[0.04]">
                      <p className="text-sm text-white/60 mb-3 leading-relaxed font-light">{intent.summary}</p>
                      <p className="text-xs text-white/50 italic mb-5 font-light">"{intent.reasoning}"</p>
                      
                      {intent.validation && (
                        <div className="mb-5">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-3">Guardrail Check</p>
                          {intent.validation.ok ? (
                            <div className="flex items-center gap-2 text-primary/80 text-sm font-light">
                              <CheckCircle2 className="w-4 h-4" /> Passed all checks
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2 text-destructive/80 text-sm font-light">
                              <div className="flex items-center gap-2"><XCircle className="w-4 h-4" /> Violations found</div>
                              <ul className="list-disc pl-6 text-xs text-destructive/60">
                                {intent.validation.violations.map((v, i) => <li key={i}>{v}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {intent.status === "planned" && (
                        <Button 
                          onClick={() => handleExecute(intent.id)}
                          disabled={!intent.plan.feasible || executeIntent.isPending || !intent.validation?.ok}
                          className="w-full bg-white/[0.05] hover:bg-primary/20 text-white hover:text-primary border border-white/[0.1] hover:border-primary/50 hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] rounded-xl transition-all duration-300 font-light"
                          data-testid={`button-execute-${intent.id}`}
                        >
                          {executeIntent.isPending ? "Executing..." : "Confirm & Execute"}
                        </Button>
                      )}

                      {intent.txHashes && intent.txHashes.length > 0 && (
                        <div className="mt-5 pt-5 border-t border-white/[0.04]">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-3">Transactions</p>
                          <div className="space-y-2">
                            {intent.txHashes.map(hash => (
                              <p key={hash} className="text-xs text-white/40 font-mono truncate">{hash}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Badge({ children, variant }: { children: React.ReactNode, variant: "success" | "warning" | "destructive" | "default" }) {
  return (
    <span className={cn(
      "px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold border shrink-0",
      variant === "success" && "bg-primary/10 text-primary border-primary/20",
      variant === "warning" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
      variant === "destructive" && "bg-destructive/10 text-destructive border-destructive/20",
      variant === "default" && "bg-white/[0.05] text-white/60 border-white/[0.1]"
    )}>
      {children}
    </span>
  );
}