import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bozi | Learn crypto. Earn points.",
  description: "Learn crypto through quests, prove what you know, contribute on X, and earn points."
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}