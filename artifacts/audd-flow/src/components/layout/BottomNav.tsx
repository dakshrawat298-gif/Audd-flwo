import { Link, useLocation } from "wouter";
import { Home, Sparkles, Users, Activity, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const tabs = [
  { name: "Treasury", path: "/", icon: Home },
  { name: "Agent", path: "/agent", icon: Sparkles },
  { name: "Team", path: "/employees", icon: Users },
  { name: "Streams", path: "/streams", icon: Waves },
  { name: "Activity", path: "/activity", icon: Activity },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-8 pt-4 pointer-events-none">
      <nav className="mx-auto max-w-md bg-black/60 backdrop-blur-2xl border border-white/[0.06] rounded-full p-2 flex justify-between items-center pointer-events-auto shadow-[0_20px_40px_rgba(0,0,0,0.8)]">
        {tabs.map((tab) => {
          const isActive = location === tab.path || (tab.path !== "/" && location.startsWith(tab.path));
          const Icon = tab.icon;

          return (
            <Link key={tab.path} href={tab.path}>
              <div
                className={cn(
                  "flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-300 relative group cursor-pointer",
                  isActive ? "text-primary" : "text-white/40 hover:text-white/80"
                )}
                data-testid={`nav-${tab.name.toLowerCase()}`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="bottom-nav-indicator"
                    className="absolute inset-0 bg-white/[0.08] border border-white/[0.05] rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={cn(
                    "w-5 h-5 relative z-10 transition-transform duration-300",
                    isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]" : "group-hover:scale-110"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}