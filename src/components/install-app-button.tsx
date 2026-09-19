"use client";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

import { useEffect, useState } from "react";

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
    if (choice.outcome === "accepted") {
      setDone(true);
    }
  }

  if (done) {
    return <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">App installiert</span>;
  }

  if (!visible) {
    return <span className="rounded-full border border-white/8 px-3 py-1 text-xs font-bold text-slate-400">Im Browser installierbar</span>;
  }

  return (
    <button type="button" onClick={install} className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-bold text-slate-950 hover:bg-emerald-300">
      App installieren
    </button>
  );
}
