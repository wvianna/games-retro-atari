interface SaveState {
  romId: string;
  slot: number;
  data: string;  // base64
  savedAt: number;
}

const DB_NAME = 'AtariVault';
const STORE   = 'saveStates';
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: ['romId', 'slot'] });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function saveState(romId: string, slot: number, data: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const entry: SaveState = { romId, slot, data, savedAt: Date.now() };
    const req = tx.objectStore(STORE).put(entry);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function loadState(romId: string, slot: number): Promise<string | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get([romId, slot]);
    req.onsuccess = () => resolve((req.result as SaveState | undefined)?.data ?? null);
    req.onerror   = () => reject(req.error);
  });
}

export async function listSaves(romId: string): Promise<SaveState[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () =>
      resolve((req.result as SaveState[]).filter((s) => s.romId === romId));
    req.onerror = () => reject(req.error);
  });
}
