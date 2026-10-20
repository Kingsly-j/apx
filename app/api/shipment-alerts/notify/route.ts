import { NextResponse } from "next/server";
import { getMessaging } from "firebase-admin/messaging";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl || new URL(request.headers.get("origin") || "").origin !== new URL(siteUrl).origin) return NextResponse.json({ error: "Request origin not allowed." }, { status: 403 });
    const { shipmentId, summary } = await request.json() as { shipmentId?: unknown; summary?: unknown };
    if (typeof shipmentId !== "string" || shipmentId.length > 150 || typeof summary !== "string" || summary.length > 2000) return NextResponse.json({ error: "Invalid notification request." }, { status: 400 });
    if (!/^https:\/\//.test(siteUrl)) throw new Error("NEXT_PUBLIC_SITE_URL must be set to the HTTPS website origin.");
    const db = getAdminFirestore();
    const shipmentRef = db.collection("shipments").doc(shipmentId);
    const shipmentDoc = await shipmentRef.get();
    if (!shipmentDoc.exists) return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
    const shipment = shipmentDoc.data()!;
    const subscribers = await shipmentRef.collection("push_subscribers").where("active", "==", true).get();
    const results = await Promise.all(subscribers.docs.map(async subscriber => {
      const token = subscriber.get("token");
      if (typeof token !== "string") return false;
      try {
        await getMessaging().send({ token, notification: { title: `Shipment ${shipment.trackingCode} update`, body: `${shipment.status} · ${shipment.location}\n${summary}` }, data: { trackingCode: shipment.trackingCode, url: `/track?code=${encodeURIComponent(shipment.trackingCode)}` }, webpush: { fcmOptions: { link: `${siteUrl}/track?code=${encodeURIComponent(shipment.trackingCode)}` } } });
        return true;
      } catch (error) {
        const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
        if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token")) await subscriber.ref.delete();
        return false;
      }
    }));
    return NextResponse.json({ ok: true, sent: results.filter(Boolean).length });
  } catch (error) {
    console.error("Shipment push notification failed", error);
    return NextResponse.json({ error: "Notification delivery is temporarily unavailable." }, { status: 503 });
  }
}
