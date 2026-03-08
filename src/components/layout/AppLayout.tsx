import { Outlet } from "react-router-dom";
import { useDemo } from "@/contexts/DemoContext";
import { AlertTriangle, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import TopNav from "./TopNav";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

export default function AppLayout() {
  const { isDemo } = useDemo();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {isDemo && (
        <div className="bg-warning/10 border-b border-warning/30 px-4 py-2 flex items-center justify-center gap-2 text-xs text-warning shrink-0">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="font-medium">Demo Mode</span>
          <span className="text-warning/80 hidden sm:inline">— Connect your API keys to go live.</span>
          <Link to="/settings" className="underline hover:text-foreground ml-1 inline-flex items-center gap-1">
            <Settings className="w-3 h-3" />Settings
          </Link>
        </div>
      )}
      <TopNav />
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <Outlet />
      </main>
      <PWAInstallPrompt />
    </div>
  );
}
