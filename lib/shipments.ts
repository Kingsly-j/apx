import { collection, deleteDoc, doc, getDocsFromServer, onSnapshot, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/utils/firebase/client";

export type ShipmentStatus = "Booked" | "In transit" | "Customs" | "Delivered" | "Order Confirmed" | "Picked by Courier" | "On The Way" | "Custom Hold";
export type ShipmentEvent = { id: string; date: string; status: ShipmentStatus; location: string; description: string };
export type RouteStop = { id: string; label: string; latitude: number; longitude: number; kind: "origin" | "stop" | "current" | "destination" };
export type Shipment = {
  id: string; trackingCode: string; customerName: string; customerEmail: string;
  cargoDescription: string; origin: string; destination: string; location: string;
  status: ShipmentStatus; eta: string; progress: number; photoUrl?: string; photoPath?: string;
  createdBy: string; createdByRole?: "Super admin" | "Admin"; createdAt: string; updatedAt: string;
  note?: string;
  senderName?: string; senderAddress?: string; senderPhone?: string; senderEmail?: string;
  receiverAddress?: string; receiverPhone?: string;
  weight?: string; shipmentType?: string; shippedAt?: string; pickupAt?: string; deliveryMode?: string;
  dutyFees?: string; clearanceFee?: string; currency?: string; verified?: boolean; estimatedDistance?: string; supportEmail?: string;
  history?: ShipmentEvent[]; routeStops?: RouteStop[];
  milestoneDates?: Record<string, string>;
};

export const SHIPMENTS_COLLECTION = "shipments";
export const shipmentStatuses: ShipmentStatus[] = ["Order Confirmed", "Picked by Courier", "On The Way", "Custom Hold", "Delivered", "Booked", "In transit", "Customs"];
export const trackingMilestones = ["Order Confirmed", "Picked by Courier", "On The Way", "Custom Hold", "Delivered"] as const;
export function statusLabel(status: ShipmentStatus) {
  return ({ Booked: "Order Confirmed", "In transit": "On The Way", Customs: "Custom Hold" } as Partial<Record<ShipmentStatus, string>>)[status] ?? status;
}
// Kept for existing UI messages. A successful operation now always means Firestore acknowledged it.
export function shipmentStorageNotice() { return ""; }

async function cloudOperation<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Firebase did not confirm this operation. Refresh to check its status before trying again.")), 15000);
    })]);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "permission-denied") {
      throw new Error("Firebase denied access to shipments. The project's Firestore permissions must allow this app before records can be saved or loaded.");
    }
    if (typeof error === "object" && error && "code" in error && error.code === "unavailable") {
      throw new Error("Firebase is unavailable. This operation was not confirmed. Check your connection and refresh before retrying.");
    }
    throw error;
  } finally { if (timer) clearTimeout(timer); }
}

export function generateTrackingCode() {
  return `BC-${new Date().getFullYear()}-${crypto.randomUUID().replaceAll("-", "").slice(0,12).toUpperCase()}`;
}
export function progressForStatus(status: ShipmentStatus) {
  return { Booked: 18, "Order Confirmed": 18, "Picked by Courier": 35, "In transit": 55, "On The Way": 55, Customs: 78, "Custom Hold": 78, Delivered: 100 }[status];
}
export async function readShipments() {
  const snapshot = await cloudOperation(getDocsFromServer(query(collection(db, SHIPMENTS_COLLECTION), orderBy("createdAt", "desc"))));
  return snapshot.docs.map(item => item.data() as Shipment);
}
export function watchShipment(id: string, onChange: (shipment: Shipment | null) => void, onError: () => void) {
  return onSnapshot(doc(db, SHIPMENTS_COLLECTION, id), snapshot => {
    if (snapshot.metadata.hasPendingWrites) return;
    onChange(snapshot.exists() ? snapshot.data() as Shipment : null);
  }, onError);
}
export async function saveShipment(shipment: Shipment, currentShipments: Shipment[] = []) {
  await cloudOperation(setDoc(doc(db, SHIPMENTS_COLLECTION, shipment.id), shipment));
  return [shipment, ...currentShipments.filter(item => item.id !== shipment.id)];
}
export async function updateShipmentRecord(id: string, updates: Partial<Shipment>, currentShipments: Shipment[]) {
  const patch = { ...updates, updatedAt: updates.updatedAt || new Date().toISOString(), ...(updates.status ? { progress: progressForStatus(updates.status) } : {}) };
  await cloudOperation(updateDoc(doc(db, SHIPMENTS_COLLECTION, id), patch));
  return currentShipments.map(item => item.id === id ? { ...item, ...patch } : item);
}
export async function deleteShipmentRecord(id: string, currentShipments: Shipment[]) {
  await cloudOperation(deleteDoc(doc(db, SHIPMENTS_COLLECTION, id)));
  return currentShipments.filter(item => item.id !== id);
}
export function findShipment(reference: string, shipments: Shipment[]) {
  const normalized = reference.trim().toLowerCase();
  return normalized ? shipments.find(item => item.trackingCode.toLowerCase() === normalized || item.id.toLowerCase() === normalized) ?? null : null;
}
