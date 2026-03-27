import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

/**
 * GOOGLE-LEVEL IMPLEMENTATION: Dual Firebase Application Setup
 * 
 * To handle scaling requirements, we separate:
 * 1. Primary App: Hosting, Authentication, Realtime Database (rtdb), Storage, and Functions.
 * 2. Secondary App: Firestore Database (db).
 */

// --- Primary Project Configuration (learning-tech-14f73) ---
const primaryConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// --- Secondary Project Configuration (learning-tech-530c7) ---
const secondaryConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_SEC_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_SEC_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_SEC_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_SEC_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SEC_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_SEC_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_SEC_MEASUREMENT_ID
};

// Initialize App Instances safely
const appPrimary = !getApps().length ? initializeApp(primaryConfig) : getApp();
const appSecondary = getApps().find(app => app.name === 'secondary') || initializeApp(secondaryConfig, 'secondary');

// EXPORTS: Maintaining existing API names to prevent application-wide breakage
// --------------------------------------------------------------------------

// Firestore is now hosted on the SECONDARY account (530c7)
export const db        = getFirestore(appSecondary);

// Realtime Database remains on the PRIMARY account (14f73)
export const rtdb      = getDatabase(appPrimary);

// Auth, Storage, and Functions remain on the PRIMARY account (14f73)
export const auth      = getAuth(appPrimary);
export const storage   = getStorage(appPrimary);
export const functions = getFunctions(appPrimary);

// Operation Types for Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// Firestore Error Info Interface
export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

/**
 * Professional Error Handler for Firestore Operations
 * Logs detailed context for debugging and tracking across accounts.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('[CRITICAL] Firestore Account 2 Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate Connection to the Secondary Firestore Instance
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Secondary Firestore (530c7) connection test failed. Verify project status.");
    }
  }
}
testConnection();
