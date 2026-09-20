import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import ReferencePage from "../reference-page";

const pages = ["about", "services", "order", "contact", "diplomatic"];
export function generateStaticParams() { return pages.map((slug) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const titles: Record<string, string> = { about: "About Us", services: "Our Services", order: "Track Your Shipment", contact: "Contact Us", diplomatic: "Diplomatic Services" };
  return { title: `${titles[slug] || "Page"} | Apeex Logistics` };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!pages.includes(slug)) notFound();
  const html = await readFile(path.join(process.cwd(), `app/content/${slug}.html`), "utf8");
  return <ReferencePage key={slug} html={html} />;
}
