import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminFirestore() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not configured.");
  const credential = JSON.parse(raw) as { project_id: string; client_email: string; private_key: string };
  const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId: credential.project_id, clientEmail: credential.client_email, privateKey: credential.private_key.replace(/\\n/g, "\n") }) });
  return getFirestore(app);
}

export { getAdminFirestore };
