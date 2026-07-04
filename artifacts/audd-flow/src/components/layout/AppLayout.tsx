import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-[100dvh] bg-black text-foreground selection:bg-primary/30 font-sans">
      {/* Deep black background with no noisy elements */}
      <div className="fixed inset-0 pointer-events-none bg-black" />
      
      <main className="relative z-10 w-full max-w-md mx-auto min-h-[100dvh] pb-32 flex flex-col">
        {children}
      </main>
      
      <BottomNav />
    </div>
  );
}