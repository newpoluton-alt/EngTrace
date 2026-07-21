import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "EngTrace · Requirements Intelligence",
  description:
    "Industrial requirements intelligence for traceability, cited answers, change impact, approvals, and measurable quality.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0d0f" },
    { media: "(prefers-color-scheme: light)", color: "#f1f3ef" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
