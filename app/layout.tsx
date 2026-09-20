import type { Metadata } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";
import AdminAccess from "./admin-access";
import { LanguageProvider } from "./language-provider";
import FloatingTools from "./floating-tools";
import "./globals.css";

const inter = localFont({
  src: "../public/reference/inter-variable.woff2",
  weight: "100 900",
  variable: "--font-site-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const metadataBase = new URL(process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`);
  return {
  metadataBase,
  title: "Apeex Logistics - Premium Global Shipping Solutions",
  description: "Apeex Logistics offers global shipping, freight, courier, and shipment tracking services.",
  openGraph: {
    type: "website",
    siteName: "Apeex Logistics",
    title: "Apeex Logistics — Global Shipping & Tracking",
    description: "Global shipping, freight, courier, and shipment tracking services.",
    images: [{ url: "/apeex-social.jpg", width: 1200, height: 630, alt: "Apeex Logistics logo" }],
  },
  twitter: { card: "summary_large_image", title: "Apeex Logistics", images: ["/apeex-social.jpg"] },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><LanguageProvider><AdminAccess />{children}<FloatingTools /></LanguageProvider></body>
    </html>
  );
}
