  // Receipt images on this device, in IndexedDB.
  //
  // They used to live inside cf_overrides in localStorage — as data URLs in the
  // same JSON string as every occurrence override the household has. The origin
  // gets about 5 MB of localStorage, shared by every key, so a few dozen photos
  // filled it, and once it was full *every* field's write failed, not just the
  // receipts'. IndexedDB is sized for exactly this.
  //
  // Keyed by the same owner key the server uses ('override:<year>:<occId>'),
  // each record holding the data URL and the SHA-256 of its bytes. The digest is
  // what load_household's manifest carries, so a device fetches only the images
  // it does not already hold.
  //
  // Everything here is best-effort and never throws: a browser without
  // IndexedDB (or a private window that refuses it) keeps working, with images
  // held in memory for the session and fetched from the server again next time.
  const RECEIPT_DB = "cf-receipts";
  const RECEIPT_STORE = "receipts";
  let _receiptDb = null;
  function receiptDb() {
    if (_receiptDb) return _receiptDb;
    _receiptDb = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(RECEIPT_DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(RECEIPT_STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error("receipt store blocked"));
      } catch (e) {
        reject(e);
      }
    }).catch(() => {
      _receiptDb = null;
      return null;
    });
    return _receiptDb;
  }
  // One transaction, as a promise of `fn`'s request result (or null on any
  // failure along the way).
  async function receiptTx(mode, fn) {
    const db = await receiptDb();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(RECEIPT_STORE, mode);
        const req = fn(tx.objectStore(RECEIPT_STORE));
        tx.oncomplete = () => resolve(req ? req.result : true);
        tx.onerror = tx.onabort = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }
  // { ownerKey: { dataUrl, sig } } for everything held here.
  async function receiptStoreAll() {
    const db = await receiptDb();
    if (!db) return {};
    return new Promise((resolve) => {
      const out = {};
      try {
        const tx = db.transaction(RECEIPT_STORE, "readonly");
        const req = tx.objectStore(RECEIPT_STORE).openCursor();
        req.onsuccess = () => {
          const c = req.result;
          if (!c) return;
          if (c.value && c.value.dataUrl) out[c.key] = c.value;
          c.continue();
        };
        tx.oncomplete = () => resolve(out);
        tx.onerror = tx.onabort = () => resolve(out);
      } catch (e) {
        resolve(out);
      }
    });
  }
  const receiptStorePut = (key, rec) => receiptTx("readwrite", (s) => s.put(rec, key));
  const receiptStoreDelete = (key) => receiptTx("readwrite", (s) => s.delete(key));
  const receiptStoreClear = () => receiptTx("readwrite", (s) => s.clear());
  // Hex SHA-256 of a data URL's bytes — the same digest the server stores
  // (encode(sha256(data), 'hex')). Null where SubtleCrypto is unavailable
  // (a plain-http origin), which only costs a re-fetch.
  async function receiptSig(dataUrl) {
    try {
      const m = /^data:[^;,]+;base64,(.+)$/.exec(dataUrl || "");
      if (!m || !(crypto && crypto.subtle)) return null;
      const bin = atob(m[1]);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const buf = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
    } catch (e) {
      return null;
    }
  }
