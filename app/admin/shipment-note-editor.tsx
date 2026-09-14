"use client";

import { useState } from "react";

export default function ShipmentNoteEditor({ note, onSave }: { note?: string; onSave: (note: string) => Promise<void> }) {
  const [draft, setDraft] = useState(note ?? "");
  const [saved, setSaved] = useState(note ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true); setMessage("");
    const value = draft.trim();
    try {
      await onSave(value);
      setDraft(value); setSaved(value);
      setMessage(value ? "Note saved to the tracking page." : "Note removed from the tracking page.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save the note. Please try again.");
    } finally { setSaving(false); }
  }

  return <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5" aria-labelledby="shipment-note-editor-heading">
    <h3 id="shipment-note-editor-heading" className="font-semibold text-blue-950">Customer note</h3>
    <p className="mt-2 text-sm leading-6 text-slate-600">Optional. This message is visible to anyone tracking this shipment. Clear it and save to hide the note.</p>
    <label className="mt-4 grid gap-2"><span className="text-sm font-medium text-blue-950">Tracking note</span><textarea aria-label="Tracking note" rows={4} maxLength={2000} value={draft} disabled={saving} onChange={event => {setDraft(event.target.value);setMessage("");}} placeholder="e.g. Please have someone available to receive the delivery." className="w-full rounded-xl border border-blue-200 bg-white p-3 text-blue-950 outline-none focus:border-blue-500 disabled:opacity-60" /></label>
    <div className="mt-3 flex items-center justify-between gap-4"><span className="text-xs text-slate-500">{draft.length}/2000 characters</span><button type="button" disabled={saving || draft.trim() === saved.trim()} onClick={save} className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving note…" : "Save note"}</button></div>
    <p role="status" className="mt-3 text-sm text-blue-800">{message}</p>
  </section>;
}
