import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const inter = localFont({
  src: "../public/reference/inter-variable.woff2",
  weight: "100 900",
  variable: "--font-site-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Welcome to Bluecrest Logistics - Premium Global Shipping Solutions",
  description: "Bluecrest Logistics offers global shipping, freight, courier, and shipment tracking services.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
