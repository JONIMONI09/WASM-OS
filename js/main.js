



(function initEarlyConsoleInterceptor() {
  const consoleBuffer = [];
  let errorCount = 0;
  let warnCount = 0;

  const rawLog = console.log ? console.log.bind(console) : function() {};
  const rawInfo = console.info ? console.info.bind(console) : rawLog;
  const rawWarn = console.warn ? console.warn.bind(console) : rawLog;
  const rawError = console.error ? console.error.bind(console) : rawLog;

  function formatArg(a) {
    if (a instanceof Error) {
      return a.stack || (a.name + ": " + a.message);
    }
    if (typeof a === "object" && a !== null) {
      try { return JSON.stringify(a); } catch (e) { return String(a); }
    }
    return String(a);
  }

  function recordConsole(level, args) {
    const ts = new Date().toISOString().slice(11, 23);
    const text = Array.prototype.slice.call(args).map(formatArg).join(" ");
    const entry = `[${ts}] [CONSOLE:${level}] ${text}`;
    consoleBuffer.push({ level, entry, text });
    if (consoleBuffer.length > 1500) consoleBuffer.splice(0, 300);

    if (level === "ERROR" || level === "EXCEPTION") errorCount++;
    if (level === "WARN") warnCount++;

    const box = document.getElementById("log-con");
    if (box) {
      const row = document.createElement("div");
      row.className = (level === "ERROR" || level === "EXCEPTION") ? "l-err" : level === "WARN" ? "l-warn" : "l-ok";
      row.textContent = entry;
      box.appendChild(row);
      while (box.childNodes.length > 400) box.removeChild(box.firstChild);
      box.scrollTop = box.scrollHeight;
    }

    const tabBtn = document.getElementById("tab-con");
    if (tabBtn) {
      tabBtn.textContent = `🖥️ JS Console (${consoleBuffer.length}${errorCount ? " · " + errorCount + " ERR" : ""})`;
      if (errorCount > 0) tabBtn.classList.add("err-highlight");
    }

    const badgeCon = document.getElementById("b-con");
    if (badgeCon) {
      badgeCon.textContent = `${errorCount} ERR / ${warnCount} WARN`;
      badgeCon.parentElement.className = "badge " + (errorCount > 0 ? "err" : warnCount > 0 ? "warn" : "ok");
    }
  }

  console.log = function() { rawLog.apply(console, arguments); recordConsole("LOG", arguments); };
  console.info = function() { rawInfo.apply(console, arguments); recordConsole("INFO", arguments); };
  console.warn = function() { rawWarn.apply(console, arguments); recordConsole("WARN", arguments); };
  console.error = function() { rawError.apply(console, arguments); recordConsole("ERROR", arguments); };

  window.addEventListener("error", function(ev) {
    const loc = ev.filename ? ` (${ev.filename.split("/").pop()}:${ev.lineno || 0}:${ev.colno || 0})` : "";
    const detail = ev.error && ev.error.stack ? ev.error.stack : `${ev.message || "Error"}${loc}`;
    recordConsole("EXCEPTION", [`Uncaught Error${loc}: ${detail}`]);

    const alertBox = document.getElementById("alert");
    const alertTitle = document.getElementById("alert-title");
    const alertMsg = document.getElementById("alert-msg");
    if (alertBox && alertTitle && alertMsg) {
      alertTitle.textContent = "⚠️ UNCAUGHT_JS_EXCEPTION" + loc;
      alertMsg.textContent = detail;
      alertBox.className = "show";
    }
  });

  window.addEventListener("unhandledrejection", function(ev) {
    const reason = formatArg(ev.reason);
    recordConsole("EXCEPTION", [`Unhandled Promise Rejection: ${reason}`]);
  });

  window.__earlyConsole = {
    getBuffer: function() { return consoleBuffer; },
    getText: function() { return consoleBuffer.map(function(x) { return x.entry; }).join("\n"); },
    clear: function() {
      consoleBuffer.length = 0;
      errorCount = 0;
      warnCount = 0;
      const box = document.getElementById("log-con");
      if (box) box.innerHTML = "";
      const tabBtn = document.getElementById("tab-con");
      if (tabBtn) {
        tabBtn.textContent = "🖥️ JS Console (0)";
        tabBtn.classList.remove("err-highlight");
      }
      const badgeCon = document.getElementById("b-con");
      if (badgeCon) {
        badgeCon.textContent = "0 ERR / 0 WARN";
        badgeCon.parentElement.className = "badge ok";
      }
    }
  };


/* Script 1 */



  // ====================================================================
  // 1. CONSTANTS & MULTI-CDN MIRRORS
  // ====================================================================
  const V86_BASES = [
    "https://cdn.jsdelivr.net/npm/v86@0.5.472/build/",
    "https://unpkg.com/v86@0.5.472/build/"
  ];
  const BIOS_BASES = [
    "https://cdn.jsdelivr.net/gh/copy/v86@master/bios/",
    "https://raw.githubusercontent.com/copy/v86/master/bios/"
  ];
  const IMG_BASES = [
    "https://i.copy.sh/",
    "https://k.copy.sh/",
    "https://copy.sh/v86/images/"
  ];
  const CORS_PROXIES = [
    (u) => "https://corsproxy.io/?" + encodeURIComponent(u),
    (u) => "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(u),
    (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u)
  ];
  const REMOTE_IMAGE_URLS = {
    "kolibri.img": [
      "https://i.copy.sh/kolibri.img",
      "https://k.copy.sh/kolibri.img",
      "https://builds.kolibrios.org/eng/data/data/kolibri.img",
      "https://corsproxy.io/?" + encodeURIComponent("https://i.copy.sh/kolibri.img"),
      "https://corsproxy.io/?" + encodeURIComponent("https://builds.kolibrios.org/eng/data/data/kolibri.img"),
      "https://api.codetabs.com/v1/proxy?quest=https://builds.kolibrios.org/eng/data/data/kolibri.img"
    ],
    "linux4.iso": [
      "https://i.copy.sh/linux4.iso",
      "https://k.copy.sh/linux4.iso",
      "https://i.copy.sh/linux.iso",
      "https://k.copy.sh/linux.iso",
      "https://corsproxy.io/?" + encodeURIComponent("https://i.copy.sh/linux4.iso"),
      "https://api.codetabs.com/v1/proxy?quest=https://i.copy.sh/linux4.iso"
    ],
    "freedos722.img": [
      "https://i.copy.sh/freedos722.img",
      "https://k.copy.sh/freedos722.img",
      "https://corsproxy.io/?" + encodeURIComponent("https://i.copy.sh/freedos722.img"),
      "https://api.codetabs.com/v1/proxy?quest=https://i.copy.sh/freedos722.img"
    ]
  };
  const FLOPPY_SIZES = [163840, 184320, 327680, 368640, 737280, 1228800, 1474560, 2949120];

  // Tested Embedded x86 Bootable Images (Mode 13h GUI Desktop & 80x25 Real-Mode Shell)



  const $ = (id) => document.getElementById(id);
  const S = {
    emu: null,
    label: "",
    assets: null,
    base: null,
    t0: 0,
    paused: false,
    g: null,
    history: [],
    netHistory: [],
    memSnapshots: [],
    serial: "",
    analysis: null,
    pending: null,
    blankHdd: null,
    tz: 1,
    sens: 1.5,
    drag: false,
    hideCursor: true,
    lastIns: 0,
    timer: null,
    roll: "",
    grid: [],
    rafPending: false,
    lanChannel: null,
    fetchPatched: false
  };

  function resetGuest() {
    S.g = {
      chars: 0,
      charsAfterBoot: 0,
      serial: 0,
      gfx: 0,
      mouse: false,
      ide: 0,
      txBytes: 0,
      rxBytes: 0,
      banners: 0,
      bannerLatched: false,
      bootFound: false,
      bootAt: 0,
      warnedSilent: false,
      warnedLoop: false,
      warnedNoBoot: false,
      video: "–"
    };
    S.serial = "";
    S.roll = "";
    S.grid = [];
    S.lastIns = 0;
  }
  resetGuest();

  // ====================================================================
  // 2. LOGGING, TELEMETRY & ALERTS
  // ====================================================================
  function log(msg, level = "info", cat = "HV") {
    const ts = new Date().toISOString().slice(11, 23);
    const line = `[${ts}] [${cat}] ${msg}`;
    S.history.push(line);
    if (S.history.length > 2000) S.history.splice(0, 400);

    if (level === "err") console.error(`[${cat}] ${msg}`);
    else if (level === "warn") console.warn(`[${cat}] ${msg}`);
    else console.info(`[${cat}] ${msg}`);

    const box = $("log-sys");
    if (box) {
      const d = document.createElement("div");
      d.className = level === "ok" ? "l-ok" : level === "warn" ? "l-warn" : level === "err" ? "l-err" : "";
      d.textContent = line;
      box.appendChild(d);
      while (box.childNodes.length > 500) box.removeChild(box.firstChild);
      box.scrollTop = box.scrollHeight;
    }
    const st = $("status");
    if (st) st.textContent = `[${cat}] ${msg}`;
  }

  function logNet(msg) {
    const ts = new Date().toISOString().slice(11, 23);
    const line = `[${ts}] ${msg}`;
    S.netHistory.push(line);
    if (S.netHistory.length > 600) S.netHistory.splice(0, 150);
    const box = $("log-net");
    if (box) {
      const d = document.createElement("div");
      d.textContent = line;
      box.appendChild(d);
      while (box.childNodes.length > 250) box.removeChild(box.firstChild);
      box.scrollTop = box.scrollHeight;
    }
  }

  function showAlert(code, msg, opt = {}) {
    $("alert-title").textContent = (opt.info ? "ℹ️ " : "⚠️ ") + code;
    $("alert-msg").textContent = msg;
    $("alert").className = "show" + (opt.info ? " info" : "");
    $("btn-force").style.display = opt.force ? "" : "none";
    $("btn-alt-desktop").style.display = opt.alt ? "" : "none";
    log(`${code}: ${msg.split("\n")[0]}`, opt.info ? "warn" : "err", "DIAG");
  }
  function hideAlert() { $("alert").className = ""; }
  function crash(ctx, err) {
    const m = err && err.stack ? `${err.message}\n${err.stack}` : String(err);
    showAlert("RUNTIME_ERROR", `${ctx}:\n${m}`);
  }

  async function copyText(text, label) {
    const payload = text || "(empty)";
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(payload);
        log(`${label} copied to clipboard (${payload.length} chars).`, "ok", "CLIP");
        return;
      }
    } catch (e) {}
    const ta = document.createElement("textarea");
    ta.value = payload;
    ta.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
      log(`${label} copied to clipboard (fallback, ${payload.length} chars).`, "ok", "CLIP");
    } catch (e) {
      log(`Clipboard copy failed: ${e}`, "err", "CLIP");
    }
    ta.remove();
  }

  const hex = (n, w = 2) => n.toString(16).toUpperCase().padStart(w, "0");
  const b64 = (s) => {
    const r = atob(s), o = new Uint8Array(r.length);
    for (let i = 0; i < r.length; i++) o[i] = r.charCodeAt(i);
    return o;
  };
  function setBadge(id, v) { const e = $(id); if (e) e.textContent = v; }

  // ====================================================================
  // 3. DYSCALCULIA-FRIENDLY VISUAL TAB RAM CALCULATOR & ANDROID GUARD
  // ====================================================================
  function updateRamCalculator() {
    const guestMB = parseInt($("ram").value, 10) || 128;
    const overheadMB = 160;
    const totalEstMB = guestMB + overheadMB;
    const isAndroid = /Android/i.test(navigator.userAgent);
    const devMemGB = navigator.deviceMemory || (isAndroid ? 4 : 16);

    setBadge("b-ram", `${guestMB} MB`);
    setBadge("b-tab-ram", `~${totalEstMB} MB`);
    $("ram-calc-text").textContent = `${guestMB} MB Guest Box + ~${overheadMB} MB Browser/VGA Box = ~${totalEstMB} MB Total Tab Load`;

    const note = $("ram-safety-note");
    if (isAndroid && guestMB > 512) {
      note.style.color = "#fca5a5";
      note.textContent = `⚠ High OOM risk on Android (~${devMemGB} GB device RAM). 128–256 MB is safest on mobile!`;
    } else if (guestMB >= 512) {
      note.style.color = "#fcd34d";
      note.textContent = `ℹ Heavy allocation (~${totalEstMB} MB). Recommended for Desktop PCs or 8GB+ devices.`;
    } else {
      note.style.color = "#6ee7b7";
      note.textContent = `✔ Safe memory footprint for both Android phones and Desktop PCs.`;
    }
  }

  // ====================================================================
  // 13. UI HELPERS, REPORT & NATIVE WASM DEMO
  // ====================================================================
  function applyTextScale() {
    const w = $("screen-wrap").clientWidth || 360;
    const base = Math.max(6, Math.min(14, (w - 14) / 48));
    document.documentElement.style.setProperty("--tfs", (base * S.tz).toFixed(2) + "px");
  }

  function report() {
    const conText = window.__earlyConsole ? window.__earlyConsole.getText() : "(unavailable)";
    return [
      "=== WASM-OS STUDIO v4.1 — FULL DIAGNOSTIC & CONSOLE REPORT ===",
      "Timestamp: " + new Date().toISOString(),
      "URL: " + location.href,
      "User-Agent: " + navigator.userAgent,
      "Device Memory: " + (navigator.deviceMemory || "unknown") + " GB",
      "Guest System: " + (S.label || "none"),
      "Video Mode: " + S.g.video,
      "Metrics: bootFound=" + S.g.bootFound + " uniqueChars=" + S.g.chars + " gfxSwitches=" + S.g.gfx + " serialBytes=" + S.g.serial + " mouseEnabled=" + S.g.mouse + " ideOps=" + S.g.ide + " txBytes=" + S.g.txBytes + " rxBytes=" + S.g.rxBytes + " biosPosts=" + S.g.banners,
      "",
      "--- JAVASCRIPT CONSOLE & ERRORS ---",
      conText || "(empty)",
      "",
      "--- NETWORK LOG ---",
      S.netHistory.join("\n") || "(empty)",
      "",
      "--- COM1 SERIAL ---",
      S.serial || "(empty)",
      "",
      "--- VGA TEXT BUFFER ---",
      gridText() || "(empty)",
      "",
      "--- HYPERVISOR LOG ---",
      S.history.join("\n")
    ].join("\n");
  }

  function download(bytes, name) {
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    log(`Downloaded binary artifact: ${name} (${bytes.length} B)`, "ok", "DISK");
  }

  function wasmDemo() {
    const leb = (n) => { const o = []; do { let b = n & 0x7F; n >>>= 7; if (n) b |= 0x80; o.push(b); } while (n); return o; };
    const sec = (id, bytes) => [id].concat(leb(bytes.length), bytes);
    const str = (s) => leb(s.length).concat(Array.from(s).map((c) => c.charCodeAt(0)));
    const types = [2, 0x60, 0, 1, 0x7F, 0x60, 2, 0x7F, 0x7F, 1, 0x7F];
    const funcs = [2, 0, 1];
    const exps = [2].concat(str("kernel_version"), [0, 0], str("checksum"), [0, 1]);
    const b0 = [0, 0x41, 0xEA, 0x0F, 0x0B];
    const b1 = [0, 0x20, 0, 0x41, 0x1F, 0x6C, 0x20, 1, 0x6A, 0x0B];
    const code = [2].concat(leb(b0.length), b0, leb(b1.length), b1);
    const bytes = new Uint8Array([0, 0x61, 0x73, 0x6D, 1, 0, 0, 0].concat(sec(1, types), sec(3, funcs), sec(7, exps), sec(10, code)));
    return WebAssembly.instantiate(bytes).then((r) => `Native Wasm ALU verified (${bytes.length} B): version=${r.instance.exports.kernel_version()}, checksum(42,1337)=${r.instance.exports.checksum(42, 1337)}`);
  }

  // ====================================================================
  // 14. EVENT BINDINGS & STARTUP
  // ====================================================================
  function bind(id, ev, fn) {
    const el = $(id);
    if (!el) return;
    el.addEventListener(ev, (e) => {
      try {
        const r = fn(e);
        if (r && r.catch) r.catch((x) => crash(`Action ${id}`, x));
      } catch (x) {
        crash(`Action ${id}`, x);
      }
    });
  }

  function init() {
    if (window.__earlyConsole) {
      const box = $("log-con");
      const items = window.__earlyConsole.getBuffer();
      if (box && items.length) {
        box.innerHTML = "";
        for (const item of items) {
          const d = document.createElement("div");
          d.className = (item.level === "ERROR" || item.level === "EXCEPTION") ? "l-err" : item.level === "WARN" ? "l-warn" : "l-ok";
          d.textContent = item.entry;
          box.appendChild(d);
        }
      }
    }

    updateRamCalculator();
    refreshSnapshotList();
    bindPointerSurface($("pad"));
    bindPointerSurface($("screen_container"));

    bind("ram", "change", updateRamCalculator);
    bind("net-mode", "change", () => {
      $("custom-ws-row").style.display = $("net-mode").value === "custom-ws" ? "flex" : "none";
      buildNetworkConfig();
    });
    bind("net-card", "change", buildNetworkConfig);

    // OS Boot Presets
    bind("b-desktop", "click", () => builtin(window.B64_DESKTOP, "VibeOS Desktop"));
    bind("b-shell", "click", () => builtin(window.B64_SHELL, "VibeOS Text-Shell"));
    bind("b-kolibri", "click", () => remote("kolibri.img", "fda", "KolibriOS GUI Desktop", 128));
    bind("b-linux", "click", () => remote("linux4.iso", "cdrom", "Buildroot Linux 4", 128));
    bind("b-dos", "click", () => remote("freedos722.img", "fda", "FreeDOS 722K", 64));
    bind("file", "change", (e) => onFile(e.target.files && e.target.files[0]));

    // Limbo Virtual Blank Disk Creator
    bind("btn-create-disk", "click", () => {
      const mb = parseInt($("blank-disk-size").value, 10) || 32;
      S.blankHdd = createBlankFat16Disk(mb);
      renderHex(new Uint8Array(S.blankHdd, 0, 512), `Virtual FAT16 HDD (${mb} MB)`);
      log(`Created & attached blank ${mb} MB FAT16 virtual hard disk (MBR 0x55AA). Rebooting VM to mount …`, "ok", "DISK");
      if (S.emu) $("btn-reboot").click();
    });
    bind("btn-export-disk", "click", () => {
      if (!S.blankHdd) {
        const mb = parseInt($("blank-disk-size").value, 10) || 32;
        S.blankHdd = createBlankFat16Disk(mb);
      }
      download(new Uint8Array(S.blankHdd), `wasm_os_hdd_${S.blankHdd.byteLength / 1048576}MB.img`);
    });

    // Snapshots
    bind("btn-save-idb", "click", saveSnapshotToIDB);
    bind("btn-snap-save", "click", saveSnapshotToIDB);
    bind("fs-save", "click", saveSnapshotToIDB);
    bind("btn-load-idb", "click", async () => {
      const all = await getAllSnapshots();
      if (!all.length) {
        log("No saved snapshots found yet. Click 'Save Snapshot' first.", "warn", "STATE");
        return;
      }
      all.sort((a, b) => (b.id > a.id ? 1 : -1));
      await restoreSnapshotBuffer(all[0].buffer, all[0].label);
    });
    bind("btn-snap-export", "click", async () => {
      if (!S.emu) return;
      const buf = await saveEmulatorStateBuffer(S.emu);
      download(new Uint8Array(buf), `${(S.label || "vm").replace(/\W+/g, "_")}.state.bin`);
    });
    bind("snap-file", "change", async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const buf = await f.arrayBuffer();
      await restoreSnapshotBuffer(buf, f.name);
    });

    // Alerts, Console Copy & Reports
    bind("btn-force", "click", () => { hideAlert(); if (S.pending) return startFromBuffer(S.pending.buf, S.pending.drive, S.pending.name); });
    bind("btn-alt-desktop", "click", () => { hideAlert(); return builtin(window.B64_DESKTOP, "VibeOS Desktop"); });
    bind("btn-dismiss", "click", hideAlert);
    bind("btn-copy-err", "click", () => copyText($("alert-title").textContent + "\n" + $("alert-msg").textContent, "Alert / Error"));
    bind("btn-copy-con-alert", "click", () => copyText(window.__earlyConsole ? window.__earlyConsole.getText() : "", "JS Console Log"));
    bind("btn-copy-console", "click", () => copyText(window.__earlyConsole ? window.__earlyConsole.getText() : "", "JS Console Log"));
    bind("btn-report", "click", () => copyText(report(), "Full Diagnostic Report"));

    // Toolbar Controls & Fullscreen HUD
    bind("btn-reboot", "click", () => {
      if (S.emu) {
        resetGuest();
        resetPhases();
        phase("ph-assets", "ok");
        S.emu.restart();
        S.t0 = performance.now();
        log("Hardware reset triggered.", "warn", "EMU");
      }
    });
    const sendCAD = () => {
      if (S.emu) S.emu.keyboard_send_scancodes([0x1D, 0x38, 0xE0, 0x53, 0xE0, 0xD3, 0xB8, 0x9D]);
    };
    bind("btn-cad", "click", sendCAD);
    bind("fs-cad", "click", sendCAD);

    bind("btn-full", "click", () => {
      const el = $("screen-wrap");
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) req.call(el);
      else el.classList.toggle("fs-active");
    });
    bind("fs-exit", "click", () => {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
      $("screen-wrap").classList.remove("fs-active");
    });

    bind("btn-lock-mouse", "click", () => {
      if (S.emu && S.emu.lock_mouse) S.emu.lock_mouse();
    });
    bind("btn-hide-cursor", "click", () => {
      S.hideCursor = !S.hideCursor;
      $("screen_container").classList.toggle("hide-cursor", S.hideCursor);
      $("btn-hide-cursor").textContent = `👁️ Hide Host Cursor: ${S.hideCursor ? "ON" : "OFF"}`;
    });
    bind("btn-refresh-vga", "click", () => {
      forceScreenRefresh();
      log("Forced VGA canvas & layout refresh.", "ok", "VGA");
    });

    bind("btn-tplus", "click", () => { S.tz = Math.min(3, S.tz * 1.2); applyTextScale(); });
    bind("btn-tminus", "click", () => { S.tz = Math.max(0.5, S.tz / 1.2); applyTextScale(); });
    bind("btn-pause", "click", () => {
      if (!S.emu) return;
      if (S.paused) { S.emu.run(); S.paused = false; $("btn-pause").textContent = "⏸ Pause"; }
      else { S.emu.stop(); S.paused = true; $("btn-pause").textContent = "▶ Resume"; }
    });

    // Keyboard & Mouse Buttons
    document.querySelectorAll("[data-key]").forEach((b) => b.addEventListener("click", () => sendKey(b.getAttribute("data-key"))));
    document.querySelectorAll("[data-cmd]").forEach((b) => b.addEventListener("click", () => sendText(b.getAttribute("data-cmd"), true)));

    bind("kbd-send", "click", () => { const i = $("kbd"); if (i.value) { sendText(i.value, true); i.value = ""; } });
    bind("fs-send", "click", () => { const i = $("fs-kbd"); if (i.value) { sendText(i.value, true); i.value = ""; } });
    bind("kbd-paste", "click", async () => {
      try {
        const t = await navigator.clipboard.readText();
        if (t) sendText(t, false);
      } catch (e) {
        log("Clipboard read permission denied by browser.", "warn", "CLIP");
      }
    });

    ["kbd", "fs-kbd"].forEach((id) => {
      const kb = $(id);
      if (!kb) return;
      kb.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); $(id === "kbd" ? "kbd-send" : "fs-send").click(); }
        e.stopPropagation();
      });
      kb.addEventListener("focus", () => { try { if (S.emu) S.emu.keyboard_set_status(false); } catch (e) {} });
      kb.addEventListener("blur", () => { try { if (S.emu) S.emu.keyboard_set_status(true); } catch (e) {} });
    });

    bind("m-left", "click", () => clickOnce(0));
    bind("m-mid", "click", () => clickOnce(1));
    bind("m-right", "click", () => clickOnce(2));
    bind("fs-left", "click", () => clickOnce(0));
    bind("fs-right", "click", () => clickOnce(2));
    bind("m-drag", "click", toggleDragLock);
    bind("fs-drag", "click", toggleDragLock);
    bind("m-sens", "change", (e) => { S.sens = parseFloat(e.target.value) || 1.5; });

    // Log Tabs
    const tabs = {
      "tab-sys": "log-sys",
      "tab-con": "log-con",
      "tab-net": "log-net",
      "tab-ser": "log-ser",
      "tab-txt": "log-txt"
    };
    let activeLogId = "log-sys";
    Object.keys(tabs).forEach((t) => bind(t, "click", () => {
      activeLogId = tabs[t];
      Object.keys(tabs).forEach((k) => {
        $(k).classList.toggle("on", k === t);
        $(tabs[k]).style.display = k === t ? "" : "none";
      });
    }));

    bind("btn-copy-log", "click", () => copyText($(activeLogId).textContent, `Active Tab (${activeLogId})`));
    bind("btn-clear", "click", () => {
      $("log-sys").innerHTML = "";
      $("log-net").innerHTML = "";
      S.history.length = 0;
      S.netHistory.length = 0;
      if (window.__earlyConsole) window.__earlyConsole.clear();
    });

    bind("x-desktop", "click", () => { const i = new Uint8Array(1474560); i.set(b64(window.B64_DESKTOP)); download(i, "vibeos_desktop.img"); });
    bind("x-wasm", "click", () => wasmDemo().then((t) => { $("wasm-out").textContent = t; log(t, "ok", "WASM"); }));

    window.addEventListener("resize", forceScreenRefresh);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) forceScreenRefresh(); });
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(() => applyTextScale()).observe($("screen-wrap"));
    }

    log("Hypervisor Studio v4.1 ready. Auto-booting VibeOS Desktop …", "ok", "UI");
    builtin(window.B64_DESKTOP, "VibeOS Desktop");
  }

  window.__studio = { analyzeImage, createBlankFat16Disk, S };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
