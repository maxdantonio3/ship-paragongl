import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paragon Global Logistics — Shipment Tracking",
  description: "Track your Paragon Global Logistics shipment in real time.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
