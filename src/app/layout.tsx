import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ensurePlatformSetup } from "@/lib/bootstrap";
import { getPlatformSettings } from "@/lib/data/platform";
import { PwaRegister } from "@/components/pwa-register";

export async function generateMetadata(): Promise<Metadata> {
  await ensurePlatformSetup();
  const settings = await getPlatformSettings();

  return {
    title: `${settings.siteName} · Universal Learning OS`,
    description: settings.slogan,
    icons: settings.logoData ? { icon: settings.logoData, apple: settings.logoData } : undefined,
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-[var(--mq-bg)] text-[var(--mq-text)] antialiased">{children}</body>
    </html>
  );
}
