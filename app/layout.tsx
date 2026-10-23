import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bozi | Creator campaigns, made clear",
  description: "Discover creator campaigns, submit original work, and earn transparent rewards on Base.",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
