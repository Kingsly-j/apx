"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { findShipment, readShipments, watchShipment, shipmentStatuses, progressForStatus, type Shipment } from "@/lib/shipments";

export default function TrackPage() {
  const [code, setCode] = useState("");
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const shipmentId = shipment?.id;
  useEffect(() => {
    if (!shipmentId) return;
    return watchShipment(shipmentId, updated => {
      setShipment(updated);
      setError("");
    }, () => setError("Live updates are temporarily unavailable. Showing the last received shipment details; search again to refresh."));
  }, [shipmentId]);

  useEffect(() => {
    let active = true;
    const initial = new URLSearchParams(window.location.search).get("code")?.trim();
    if (!initial) return;
    const timer = setTimeout(async () => {
      setCode(initial);
      setLoading(true);
      try {
        const records = await readShipments();
        if (active) { setShipment(findShipment(initial, records)); setSearched(true); }
      } catch { if (active) setError("Tracking is temporarily unavailable. Please try again."); }
      finally { if (active) setLoading(false); }
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, []);

  async function track(event: FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setLoading(true); setError(""); setShipment(null);
    try { setShipment(findShipment(code, await readShipments())); setSearched(true); }
    catch { setError("Tracking is temporarily unavailable. Please try again."); }
    finally { setLoading(false); }
  }

  const location = shipment?.location.trim() || "";
  const mappableLocation = location && !/^(awaiting|pending|unknown|not available|n\/a)/i.test(location);
  const mapUrl = mappableLocation ? `https://maps.google.com/maps?q=${encodeURIComponent(location)}&z=11&output=embed` : "";
  const routeUrl = shipment ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(shipment.origin)}&destination=${encodeURIComponent(shipment.destination)}` : "";

  return <main className="min-h-screen bg-slate-50">
    <nav className="flex items-center justify-between bg-white px-6 py-5"><Link href="/" className="font-bold text-blue-950">Bluecrest Logistics</Link><Link href="/contact" className="text-sm text-blue-700">Contact support</Link></nav>
    <div className="mx-auto max-w-4xl px-5 py-14">
      <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Shipment tracking</p><h1 className="mt-3 text-4xl font-bold text-blue-950">Follow your delivery.</h1><p className="mt-4 text-slate-600">Enter your tracking code to see the latest recorded shipment update.</p>
      <form onSubmit={track} className="mt-8 flex flex-col gap-3 sm:flex-row"><label className="flex-1"><span className="sr-only">Tracking code</span><input required value={code} onChange={e => setCode(e.target.value)} placeholder="BC-2026-XXXXXXXX" className="w-full rounded-xl border border-slate-300 bg-white px-5 py-4" /></label><button disabled={loading} className="rounded-xl bg-blue-600 px-7 py-4 font-semibold text-white disabled:opacity-50">{loading ? "Checking…" : "Track shipment"}</button></form>
      <div role="status" className="mt-4 text-slate-600">{error || (searched && !shipment && !loading ? "No matching shipment was found. Check your code or contact support@bluecrestlogistics.com." : "")}</div>
      {shipment && <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Shipment details">
        <div className="bg-blue-950 p-7 text-white"><p className="text-sm text-blue-200">{shipment.trackingCode}</p><h2 className="mt-2 text-3xl font-bold">{shipment.status}</h2><p className="mt-2 text-blue-100">Current location: {shipment.location}</p></div>
        <div className="p-7"><ol className="grid grid-cols-2 gap-4 sm:grid-cols-4">{shipmentStatuses.map((status, i) => <li key={status} className={progressForStatus(status) <= shipment.progress ? "font-semibold text-blue-700" : "text-slate-400"}><span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">{i + 1}</span>{status}</li>)}</ol>
        <div className="mt-7 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Shipment progress" aria-valuenow={shipment.progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-blue-600" style={{width: `${shipment.progress}%`}} /></div>
        <dl className="mt-8 grid gap-6 sm:grid-cols-2">{[["Origin",shipment.origin],["Destination",shipment.destination],["Estimated delivery",shipment.eta],["Cargo",shipment.cargoDescription]].map(([label,value])=><div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 font-medium text-blue-950">{value}</dd></div>)}</dl>
        {shipment.note?.trim() && <section className="mt-7 rounded-xl border border-blue-200 bg-blue-50 p-5" aria-labelledby="tracking-note-heading">
          <h3 id="tracking-note-heading" className="font-semibold text-blue-950">Shipment note</h3>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-blue-900">{shipment.note}</p>
        </section>}
        <section className="mt-8 overflow-hidden rounded-xl border border-slate-200" aria-labelledby="shipment-map-heading">
          <div className="flex flex-col gap-3 bg-slate-50 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div><h3 id="shipment-map-heading" className="text-lg font-semibold text-blue-950">Shipment location map</h3><p className="mt-1 text-sm text-slate-600">{mapUrl ? location : "Waiting for a specific shipment location."}</p><p className="mt-2 max-w-lg text-xs leading-5 text-slate-500">Updates automatically when our team records a new location. This is the last reported position, not continuous GPS tracking.</p></div>
            <a href={routeUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700">View route ↗</a>
          </div>
          {mapUrl ? <iframe key={mapUrl} src={mapUrl} title="Shipment current location map" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen className="h-80 w-full border-0 sm:h-96" /> : <div className="px-5 py-12 text-center text-sm text-slate-500">The map will appear when a city, address, or coordinates are recorded.</div>}
          {mapUrl && <div className="border-t border-slate-200 px-5 py-3 text-sm"><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Open current location in Google Maps</a></div>}
        </section>
        {shipment.photoUrl && <div className="mt-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shipment.photoUrl} alt="Shipment cargo" className="max-h-96 w-full rounded-xl object-contain bg-slate-50" />
        </div>}
        <p className="mt-7 text-xs text-slate-500">Last recorded update: {new Date(shipment.updatedAt).toLocaleString()}</p></div>
      </section>}
    </div>
  </main>;
}
