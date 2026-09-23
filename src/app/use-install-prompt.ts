import { useEffect, useState } from "../lib/runtime.js";
  // The browser's "install this app" offer, held until the menu uses it.
  // Moved out of App as is.
  export function useInstallPrompt() {
    const [installPrompt, setInstallPrompt] = useState(null);
    const [showInstall, setShowInstall] = useState(false);
    useEffect(() => {
      const handler = (e) => {
        e.preventDefault();
        setInstallPrompt(e);
        setShowInstall(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      const done = () => {
        setInstallPrompt(null);
        setShowInstall(false);
      };
      window.addEventListener("appinstalled", done);
      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        window.removeEventListener("appinstalled", done);
      };
    }, []);
    const doInstall = async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") {
        setInstallPrompt(null);
        setShowInstall(false);
      }
    };
  return { installPrompt, showInstall, doInstall };
  }
