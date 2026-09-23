// The copy of the household this device last agreed with the server on, and
// the per-field versions it had then: the "base" of a three-way merge
// (sync-merge.ts). Kept in IndexedDB so edits made offline and carried across
// a reload can still be merged with what others saved meanwhile, instead of
// forcing a choice between the two whole versions.
//
// One record per household. Best-effort like receipt-store.ts: without
// IndexedDB the base lives in memory for the session, and a reload with
// unsaved edits falls back to asking (the divergence dialog), as it always has.
import type { HouseholdPayload } from "../types.js";

export interface SyncBase {
  householdId: string;
  /** The synced fields as last agreed, in the client's normalised form. */
  data: Partial<HouseholdPayload>;
  /** field -> the server version that data is. */
  versions: Record<string, string>;
}

const DB = "cf-sync";
const STORE = "base";
let db: Promise<IDBDatabase | null> | null = null;
function open(): Promise<IDBDatabase | null> {
  if (db) return db;
  db = new Promise<IDBDatabase | null>((resolve, reject) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error("sync store blocked"));
    } catch (e) {
      reject(e);
    }
  }).catch(() => {
    db = null;
    return null;
  });
  return db;
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T | null> {
  const d = await open();
  if (!d) return null;
  return new Promise((resolve) => {
    try {
      const t = d.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req ? (req.result as T) : null);
      t.onerror = t.onabort = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}
export const syncBaseGet = (householdId: string): Promise<SyncBase | null> => tx<SyncBase>("readonly", (s) => s.get(householdId));
export const syncBasePut = (base: SyncBase): Promise<unknown> => tx("readwrite", (s) => s.put(base, base.householdId));
export const syncBaseClear = (): Promise<unknown> => tx("readwrite", (s) => s.clear());
