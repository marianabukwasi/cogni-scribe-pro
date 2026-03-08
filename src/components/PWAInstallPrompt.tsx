import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Check session count
    const sessionCount = parseInt(localStorage.getItem("kloer_session_count") || "0");
    if (sessionCount < 3) return;

    // Check if previously dismissed
    const dismissedAt = localStorage.getItem("kloer_pwa_dismissed");
    if (dismissedAt && Date.now() - parseInt(dismissedAt) < 7 * 24 * 60 * 60 * 1000) return;

    // Detect iOS
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(isiOS);

    if (isiOS) {
      setShowBanner(true);
      return;
    }

    // Android / Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    localStorage.setItem("kloer_pwa_dismissed", String(Date.now()));
  };

  if (!showBanner || dismissed) return null;

  return (
    <>
      <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 glass-card border-primary/30 p-4 shadow-lg animate-in slide-in-from-bottom-4">
        <div className="flex items-start gap-3">
          <Download className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Install Kloer.ai</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Install on your home screen for faster access
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleInstall} className="gap-1.5 text-xs">
                {isIOS ? <Share className="w-3 h-3" /> : <Download className="w-3 h-3" />}
                {isIOS ? "How to Install" : "Install"}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss} className="text-xs text-muted-foreground">
                Not now
              </Button>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
          <div className="glass-card border-primary/30 p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-foreground font-heading text-lg mb-4">Install Kloer.ai on iOS</h3>
            <ol className="space-y-3 text-sm text-foreground">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0">1</span>
                <span>Tap the <Share className="w-4 h-4 inline text-primary" /> Share button in Safari's toolbar</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0">2</span>
                <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0">3</span>
                <span>Tap <strong>"Add"</strong> to confirm</span>
              </li>
            </ol>
            <Button onClick={() => { setShowIOSInstructions(false); handleDismiss(); }} className="w-full mt-5">Got it</Button>
          </div>
        </div>
      )}
    </>
  );
}
