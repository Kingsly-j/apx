import Link from "next/link";
export const metadata = { title: "Admin Dashboard | Apeex Logistics", robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <><nav className="flex items-center justify-between border-b border-blue-100 bg-white px-6 py-5"><Link href="/" className="font-bold text-blue-950">Apeex Logistics</Link><Link href="/track" className="text-sm text-blue-700">Track a shipment →</Link></nav>{children}</>;
}
