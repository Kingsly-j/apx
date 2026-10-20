import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { trackingCode?: unknown; token?: unknown };
    if (typeof body.trackingCode !== "string" || body.trackingCode.length > 80 || typeof body.token !== "string" || body.token.length < 40 || body.token.length > 4096) {
      return NextResponse.json({ error: "Invalid device subscription." }, { status: 400 });
    }
    const db = getAdminFirestore();
    const matching = await db.collection("shipments").where("trackingCode", "==", body.trackingCode.trim()).limit(1).get();
    if (matching.empty) return NextResponse.json({ error: "We could not find that shipment." }, { status: 404 });
    const shipment = matching.docs[0];
    const ref = shipment.ref.collection("push_subscribers").doc(Buffer.from(body.token).toString("base64url"));
    const existing = await ref.get();
    await ref.set({ token: body.token, subscribedAt: existing.data()?.subscribedAt ?? new Date().toISOString(), active: true }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Shipment alert subscription failed", error);
    return NextResponse.json({ error: "Subscription is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}


