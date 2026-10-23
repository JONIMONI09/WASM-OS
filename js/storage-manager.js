
function $(id) { return document.getElementById(id); }

function download(bytes, name) { console.window.log("Download", name); }
  // 6. LIMBO-STYLE BLANK VIRTUAL DISK GENERATOR (FAT16 + MBR)
  // ====================================================================
  export function createBlankFat16Disk(sizeMB) {
    const totalBytes = sizeMB * 1048576;
    const totalSectors = totalBytes >>> 9;
    const buf = new ArrayBuffer(totalBytes);
    const u8 = new Uint8Array(buf);
    const dv = new DataView(buf);

    u8[0] = 0xEB; u8[1] = 0x3C; u8[2] = 0x90;
    const oem = "VIBEOS41";
    for (let i = 0; i < 8; i++) u8[3 + i] = oem.charCodeAt(i);
    dv.setUint16(11, 512, true);
    u8[13] = 8;
    dv.setUint16(14, 4, true);
    u8[16] = 2;
    dv.setUint16(17, 512, true);
    if (totalSectors < 65536) dv.setUint16(19, totalSectors, true);
    else dv.setUint32(32, totalSectors, true);
    u8[21] = 0xF8;
    dv.setUint16(22, 64, true);
    dv.setUint16(24, 63, true);
    dv.setUint16(26, 16, true);
    u8[36] = 0x80;
    u8[38] = 0x29;
    dv.setUint32(39, 0x20261022, true);
    const label = "WASM_HDD   FAT16   ";
    for (let i = 0; i < label.length; i++) u8[43 + i] = label.charCodeAt(i);

    u8[0x3E] = 0xF4; // HLT
    u8[510] = 0x55;
    u8[511] = 0xAA;

    return buf;
  }

  // ====================================================================
  // 7. INDEXEDDB + MEMORY FALLBACK OS SNAPSHOT ENGINE
  // ====================================================================
  const DB_NAME = "WasmOS_Snapshots_DB";
  const DB_STORE = "snapshots";

  function openSnapDB() {
    return new Promise((res, rej) => {
      if (typeof indexedDB === "undefined") {
        rej(new Error("IndexedDB not available in this context"));
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  }

  // FIXED SYNTAX & DUAL PROMISE/CALLBACK COMPATIBILITY FOR V86 SAVE_STATE
  function saveEmulatorStateBuffer(emu) {
    return new Promise((res, rej) => {
      if (!emu || typeof emu.save_state !== "function") {
        rej(new Error("No running emulator supporting save_state()"));
        return;
      }
      let settled = false;
      const done = (err, buf) => {
        if (settled) return;
        settled = true;
        if (err) rej(err);
        else res(buf);
      };
      try {
        const ret = emu.save_state((err, buf) => done(err, buf));
        if (ret && typeof ret.then === "function") {
          ret.then((buf) => done(null, buf)).catch((err) => done(err));
        }
      } catch (e) {
        done(e);
      }
    });
  }

  export async function saveSnapshotToIDB() {
    if (!window.S.emu) {
      window.log("Cannot save snapshot: No active VM running.", "warn", "STATE");
      return;
    }
    try {
      window.log("Capturing full CPU + RAM + VGA state snapshot …", "info", "STATE");
      const stateBuf = await saveEmulatorStateBuffer(window.S.emu);
      const rec = {
        id: "snap_" + Date.now(),
        label: window.S.label || "Custom OS",
        ramMB: parseInt($("ram").value, 10) || 128,
        timestamp: new Date().toLocaleTimeString(),
        sizeBytes: stateBuf.byteLength,
        buffer: stateBuf
      };

      try {
        const db = await openSnapDB();
        await new Promise((res, rej) => {
          const tx = db.transaction(DB_STORE, "readwrite");
          tx.objectStore(DB_STORE).put(rec);
          tx.oncomplete = res;
          tx.onerror = () => rej(tx.error);
        });
        window.log(`Snapshot saved to IndexedDB: ${rec.label} (${(rec.sizeBytes / 1048576).toFixed(2)} MB)`, "ok", "STATE");
      } catch (dbErr) {
        window.S.memSnapshots.unshift(rec);
        window.log(`IndexedDB restricted (saved in-memory snapshot instead): ${rec.label}`, "warn", "STATE");
      }
      await refreshSnapshotList();
    } catch (e) {
      crash("Snapshot Save Failed", e);
    }
  }

  export async function restoreSnapshotBuffer(buf, desc) {
    if (!window.S.emu) {
      window.log("Starting default hypervisor container before restoring state …", "info", "STATE");
      if(window.builtin) await window.builtin(window.B64_DESKTOP, "VibeOS Desktop");
    }
    try {
      window.log(`Restoring VM state (${desc}, ${(buf.byteLength / 1048576).toFixed(2)} MB) …`, "info", "STATE");
      const ret = window.S.emu.restore_state(buf);
      if (ret && typeof ret.then === "function") await ret;
      window.log(`VM State restored: ${desc}`, "ok", "STATE");
      if(window.forceScreenRefresh) window.forceScreenRefresh();
    } catch (e) {
      crash("Snapshot Restore Failed (Make sure Guest RAM matches the saved snapshot)", e);
    }
  }

  async function getAllSnapshots() {
    try {
      const db = await openSnapDB();
      const items = await new Promise((res, rej) => {
        const tx = db.transaction(DB_STORE, "readonly");
        const req = tx.objectStore(DB_STORE).getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => rej(req.error);
      });
      return items.concat(window.S.memSnapshots);
    } catch (e) {
      return window.S.memSnapshots.slice();
    }
  }

  export async function refreshSnapshotList() {
    const listEl = $("snap-list");
    if (!listEl) return;
    const items = await getAllSnapshots();
    items.sort((a, b) => (b.id > a.id ? 1 : -1));
    listEl.innerHTML = "";
    if (!items.length) {
      listEl.innerHTML = `<div style="font-size:11px;color:var(--mut)">No snapshots saved yet. Click "Save Snapshot" while an OS is running.</div>`;
      return;
    }
    for (const item of items) {
      const row = document.createElement("div");
      row.className = "snap-item";
      row.innerHTML = `
        <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          <b style="color:#6ee7b7">${item.label}</b> (${item.ramMB}MB)
          <span class="sub">${item.timestamp} · ${(item.sizeBytes / 1048576).toFixed(1)} MB</span>
        </div>
        <div class="row" style="flex-wrap:nowrap">
          <button class="btn sm pri" data-restore="${item.id}">Restore</button>
          <button class="btn sm" data-dl="${item.id}">⬇️</button>
          <button class="btn sm warn" data-del="${item.id}">✕</button>
        </div>
      `;
      row.querySelector(`[data-restore]`).addEventListener("click", () => restoreSnapshotBuffer(item.buffer, item.label));
      row.querySelector(`[data-dl]`).addEventListener("click", () => download(new Uint8Array(item.buffer), `${item.label.replace(/\W+/g, "_")}.state.bin`));
      row.querySelector(`[data-del]`).addEventListener("click", async () => {
        window.S.memSnapshots = window.S.memSnapshots.filter((x) => x.id !== item.id);
        try {
          const d = await openSnapDB();
          const tx = d.transaction(DB_STORE, "readwrite");
          tx.objectStore(DB_STORE).delete(item.id);
          tx.oncomplete = () => refreshSnapshotList();
        } catch (e) {
          refreshSnapshotList();
        }
      });
      listEl.appendChild(row);
    }
  }

  // ====================================================================