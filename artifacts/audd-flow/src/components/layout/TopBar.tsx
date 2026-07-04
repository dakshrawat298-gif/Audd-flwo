import { Link } from "wouter";
import { Settings } from "lucide-react";

interface TopBarProps {
  title: string;
  showSettings?: boolean;
}

export function TopBar({ title, showSettings }: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-black/60 backdrop-blur-2xl border-b border-white/[0.04] pt-14 pb-4 px-6 flex items-center justify-between">
      <h1 className="text-2xl font-semibold tracking-tight text-white/90">{title}</h1>
      {showSettings && (
        <Link href="/settings">
          <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer" data-testid="link-settings">
            <Settings className="w-5 h-5" />
          </div>
        </Link>
      )}
    </header>
  );
}