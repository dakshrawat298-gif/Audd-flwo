import { useEffect, useState } from "react";
import { useListStreams, useClaimStream, useStopStream, useCreateStream, getListStreamsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Download, Ban, Waves } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, type Variants } from "framer-motion";

export default function Streams() {
  const { data: streams, isLoading } = useListStreams();
  const queryClient = useQueryClient();
  const claimStream = useClaimStream();
  const stopStream = useStopStream();

  const handleClaim = (id: number) => {
    claimStream.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStreamsQueryKey() });
        toast.success("Stream claimed");
      },
      onError: (err: any) => toast.error(err.message || "Failed to claim stream")
    });
  };

  const handleStop = (id: number) => {
    stopStream.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStreamsQueryKey() });
        toast.success("Stream stopped");
      },
      onError: (err: any) => toast.error(err.message || "Failed to stop stream")
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
      <TopBar title="Streams" />
      <div className="flex-1 px-6 pt-32 pb-6 space-y-6 flex flex-col">
        <div className="flex justify-between items-center">
          <h2 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest ml-2">Active Streams</h2>
          <CreateStreamDialog />
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pb-20">
          {isLoading ? (
             <div className="space-y-4">
               {[1,2].map(i => (
                 <Skeleton key={i} className="h-48 w-full rounded-[2rem] bg-white/[0.03]" />
               ))}
             </div>
          ) : streams?.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-white/50 py-12 glass-card rounded-[2rem]">
              <Waves className="w-8 h-8 mx-auto mb-4 opacity-20" />
              <p className="font-light">No active streams.</p>
            </motion.div>
          ) : (
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
              {streams?.map((stream) => (
                <motion.div variants={item} key={stream.id}>
                  <StreamCard stream={stream} onClaim={handleClaim} onStop={handleStop} isClaiming={claimStream.isPending} isStopping={stopStream.isPending} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}

function StreamCard({ stream, onClaim, onStop, isClaiming, isStopping }: any) {
  const [liveClaimable, setLiveClaimable] = useState(Number(stream.claimable));
  const ratePerSecond = Number(stream.ratePerSecond);

  useEffect(() => {
    if (!stream.active) return;
    const interval = setInterval(() => {
      setLiveClaimable(prev => prev + ratePerSecond);
    }, 1000);
    return () => clearInterval(interval);
  }, [stream.active, ratePerSecond]);

  return (
    <div className={cn(
      "glass-card rounded-[2.5rem] p-6 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,255,255,0.1)] hover:border-primary/30", 
      !stream.active && "opacity-60 hover:opacity-100"
    )}>
      {stream.active && <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[60px] -mr-16 -mt-16 pointer-events-none" />}
      
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div>
          <h3 className="text-xl font-light text-white leading-tight">{stream.toName || "Unknown"}</h3>
          <p className="text-[10px] text-white/50 font-mono tracking-widest truncate w-[150px] mt-1">{stream.to}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Rate</p>
          <p className="text-sm font-medium text-white/80">{stream.ratePerDayFormatted} {stream.symbol}/day</p>
        </div>
      </div>
      
      <div className="mb-8 relative z-10">
        <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Claimable Now</p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-light text-white tracking-tight tabular-nums">
            {liveClaimable.toFixed(4)}
          </span>
          <span className="text-xl font-medium text-white/50">{stream.symbol}</span>
        </div>
      </div>

      {stream.active ? (
        <div className="flex gap-3 relative z-10">
          <Button 
            onClick={() => onClaim(stream.id)} 
            disabled={isClaiming || liveClaimable <= 0}
            className="flex-1 glass-button text-white hover:text-primary hover:border-primary/50 hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] rounded-2xl h-12 font-light"
          >
            <Download className="w-4 h-4 mr-2" /> Claim
          </Button>
          <Button 
            variant="ghost"
            onClick={() => onStop(stream.id)} 
            disabled={isStopping}
            className="w-12 h-12 px-0 rounded-2xl bg-white/[0.05] text-white/40 hover:bg-destructive/20 hover:text-destructive border border-white/[0.05] transition-all"
          >
            <Ban className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="text-[10px] font-medium uppercase tracking-widest text-white/50 text-center py-3 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
          Stream stopped
        </div>
      )}
    </div>
  );
}

function CreateStreamDialog() {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [rate, setRate] = useState("");
  const [duration, setDuration] = useState("");
  
  const queryClient = useQueryClient();
  const createStream = useCreateStream();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createStream.mutate(
      { data: { to, ratePerDay: rate, token: "aUSD", durationDays: duration ? Number(duration) : null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStreamsQueryKey() });
          toast.success("Stream created");
          setOpen(false);
          setTo(""); setRate(""); setDuration("");
        },
        onError: (err: any) => toast.error(err.message || "Failed to create stream")
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" className="h-10 w-10 rounded-full bg-white/[0.05] border border-white/[0.1] text-white hover:bg-primary hover:text-black hover:shadow-[0_0_15px_rgba(0,255,255,0.6)] transition-all duration-300">
          <Plus className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-black/90 border-white/10 backdrop-blur-2xl sm:max-w-md rounded-[2rem] p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white font-light tracking-tight">New Stream</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          <div className="space-y-2">
             <label className="text-[10px] text-white/40 uppercase tracking-widest ml-2">Recipient Address</label>
             <Input value={to} onChange={e => setTo(e.target.value)} required className="bg-white/[0.03] border-white/[0.1] focus-visible:border-primary/50 focus-visible:ring-0 rounded-2xl h-12 text-white font-mono text-sm px-4" />
          </div>
          <div className="space-y-2">
             <label className="text-[10px] text-white/40 uppercase tracking-widest ml-2">Rate (aUSD / day)</label>
             <Input value={rate} onChange={e => setRate(e.target.value)} required type="number" step="0.01" className="bg-white/[0.03] border-white/[0.1] focus-visible:border-primary/50 focus-visible:ring-0 rounded-2xl h-12 text-white px-4 font-light" />
          </div>
          <div className="space-y-2">
             <label className="text-[10px] text-white/40 uppercase tracking-widest ml-2">Duration Days (optional)</label>
             <Input value={duration} onChange={e => setDuration(e.target.value)} type="number" placeholder="Continuous if empty" className="bg-white/[0.03] border-white/[0.1] focus-visible:border-primary/50 focus-visible:ring-0 rounded-2xl h-12 text-white px-4 font-light placeholder:text-white/40" />
          </div>
          <Button type="submit" disabled={createStream.isPending} className="w-full bg-primary text-black hover:bg-primary hover:shadow-[0_0_15px_rgba(0,255,255,0.6)] rounded-2xl mt-6 h-12 text-sm font-medium transition-all duration-300">
            {createStream.isPending ? "Creating..." : "Start Streaming"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
