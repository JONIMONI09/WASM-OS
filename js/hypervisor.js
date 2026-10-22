  // 4. BOOT PHASES
  // ====================================================================
  const PH_TXT = {
    "ph-assets": "Hypervisor & BIOS ROMs loaded",
    "ph-ready": "Emulator instance initialized",
    "ph-bios": "SeaBIOS POST banner verified",
    "ph-dev": "Boot device handed off (“Booting from …”)",
    "ph-guest": "Guest OS active (VGA / COM1 / PS2 Mouse / NIC)"
  };
  function phase(id, st, extra) {
    const e = $(id);
    if (!e) return;
    e.className = "ph " + (st === "ok" ? "ok" : st === "err" ? "err" : st === "run" ? "run" : "");
    const icon = st === "ok" ? "✔ " : st === "err" ? "✖ " : st === "run" ? "… " : "○ ";
    e.textContent = icon + PH_TXT[id] + (extra ? " — " + extra : "");
  }
  function resetPhases() { Object.keys(PH_TXT).forEach((k) => phase(k, "")); }
  function guestAlive() { return S.g.charsAfterBoot + S.g.serial + S.g.gfx + (S.g.mouse ? 1 : 0); }

  // ====================================================================
  // 8. HYPERVISOR LOADER & DEDUPLICATED EVENT WIRING
  // ====================================================================
  function loadScript(url) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      let done = false;
      const t = setTimeout if (!done) { done = true; s.remove(); rej(new Error("Timeout")); } }, 25000);
      s.src = url;
      s.async = true;
      s.onload = () => { if (!done) { done = true; clearTimeout(t); res(); } };
      s.onerror = () => { if (!done) { done = true; clearTimeout(t); s.remove(); rej(new Error("Network/CSP error")); } };
      document.head.appendChild(s);
    });
  }

  async function ensureV86() {
    if (window.V86 && S.base) return;
    for (const base of V86_BASES) {
      try {
        log(`Loading libv86.js from ${base}`, "info", "LOAD");
        await loadScript(base + "libv86.js");
        if (typeof window.V86 === "function") {
          S.base = base;
          log("v86 WebAssembly JIT loaded.", "ok", "LOAD");
          return;
        }
      } catch (e) {
        log(`Mirror failed (${base}): ${e.message}`, "warn", "LOAD");
      }
    }
    throw new Error("Could not load libv86.js from any CDN mirror.");
  }

  async function fetchBuf(urls, label, onProg) {
    let last = null;
    const rawFetch = origWindowFetch || window.fetch.bind(window);
    for (const url of urls) {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 90000);
      try {
        log(`Fetching ${label} ← ${url}`, "info", "LOAD");
        const r = await rawFetch(url, { signal: ctl.signal, mode: "cors", credentials: "omit" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const total = Number(r.headers.get("content-length")) || 0;
        let out;
        if (r.body && r.body.getReader) {
          const rd = r.body.getReader(), parts = [];
          let got = 0;
          for (;;) {
            const x = await rd.read();
            if (x.done) break;
            parts.push(x.value);
            got += x.value.length;
            if (onProg) onProg(got, total);
          }
          out = new Uint8Array(got);
          let o = 0;
          for (const p of parts) { out.set(p, o); o += p.length; }
        } else {
          out = new Uint8Array(await r.arrayBuffer());
        }
        if (out.length < 512) throw new Error(`Invalid binary size (${out.length} B)`);
        const headAscii = String.fromCharCode.apply(null, out.subarray(0, 14)).toLowerCase();
        if (headAscii.includes("<!doctype") || headAscii.includes("<html")) {
          throw new Error("Mirror returned HTML error page instead of disk image");
        }
        return out.buffer;
      } catch (e) {
        last = e;
        log(`Mirror failed (${url}): ${e.message || e}`, "warn", "LOAD");
      } finally {
        clearTimeout(to);
      }
    }
    // If all direct CDNs & proxies fail, try fetching via CORS proxies specifically wrapped around copy.sh and kolibri URLs
    for (const makeProxy of CORS_PROXIES) {
      for (const rawUrl of urls.slice(0, 3)) {
        try {
          const proxiedUrl = makeProxy(rawUrl);
          log(`Trying CORS Proxy fallback: ${proxiedUrl}`, "info", "LOAD");
          const r = await rawFetch(proxiedUrl, { mode: "cors" });
          if (!r.ok) continue;
          const out = new Uint8Array(await r.arrayBuffer());
          if (out.length > 512) {
            log(`Successfully fetched via CORS proxy!`, "ok", "LOAD");
            return out.buffer;
          }
        } catch (err) {}
      }
    }
    throw new Error(`${label}: All mirrors & CORS proxies failed (${last && last.message})`);
  }

  function overlay(show, title, sub, pct) {
    $("overlay").className = show ? "show" : "";
    if (title != null) $("ov-title").textContent = title;
    if (sub != null) $("ov-sub").textContent = sub;
    if (pct != null) $("ov-bar").style.width = pct + "%";
  }

  async function ensureAssets() {
    if (S.assets) return;
    overlay(true, "Loading Hypervisor Assets …", "libv86.js + SeaBIOS + VGABIOS", 5);
    await ensureV86();
    const bios = await fetchBuf(BIOS_BASES.map((b) => b + "seabios.bin"), "SeaBIOS", (g, t) => overlay(true, null, "SeaBIOS", 20 + (t ? (g / t) * 30 : 0)));
    const vga = await fetchBuf(BIOS_BASES.map((b) => b + "vgabios.bin"), "VGABIOS", (g, t) => overlay(true, null, "VGABIOS", 55 + (t ? (g / t) * 30 : 0)));
    S.assets = { bios, vga };
    log(`BIOS ROMs verified (${bios.byteLength} + ${vga.byteLength} bytes).`, "ok", "LOAD");
  }

  function recreateScreen() {
    const c = $("screen_container");
    c.innerHTML = "<div></div><canvas></canvas>";
    c.classList.toggle("hide-cursor", S.hideCursor);
    applyTextScale();
    return c;
  }

  function destroyEmu() {
    if (S.timer) { clearInterval(S.timer); S.timer = null; }
    if (S.emu) { try { S.emu.destroy(); } catch (e) {} S.emu = null; }
  }

  function forceScreenRefresh() {
    const c = $("screen_container");
    if (!c) return;
    const cv = c.querySelector("canvas");
    if (cv && cv.style.display !== "none") {
      cv.style.transform = "translateZ(0)";
    }
    applyTextScale();
    scheduleRender();
  }

  function scheduleRender() {
    if (S.rafPending) return;
    S.rafPending = true;
    requestAnimationFrame
      S.rafPending = false;
      let last = "";
      const rows = [];
      for (let r = 0; r < S.grid.length; r++) {
        const row = S.grid[r];
        const t = row ? row.join("").replace(/\s+$/, "") : "";
        rows.push(t);
        if (t) last = t;
      }
      $("vga-last").textContent = last || "Waiting for BIOS / Guest output …";
      $("vga-n").textContent = `${S.g.chars} unique chars`;
      $("log-txt").textContent = rows.join("\n").replace(/\n+$/, "");
      setBadge("b-ser", `${S.g.serial} B`);
      setBadge("b-ide", `${S.g.ide} ops`);
      setBadge("b-net-bytes", `${(S.g.txBytes / 1024).toFixed(1)} / ${(S.g.rxBytes / 1024).toFixed(1)} KB`);
      const ls = $("log-ser");
      if (ls.textContent.length !== S.serial.length) {
        ls.textContent = S.serial;
        ls.scrollTop = ls.scrollHeight;
      }
    });
  }

  function wire(emu) {
    wireNetworkEvents(emu);

    emu.add_listener("emulator-ready", () => {
      log("Emulator hardware buses initialized.", "info", "EMU");
      phase("ph-ready", "ok");
    });
    emu.add_listener("emulator-started", () => {
      phase("ph-ready", "ok");
      phase("ph-bios", "run");
    });
    emu.add_listener("download-error", (e) => {
      log(`Asset download error: ${e && e.file_name ? e.file_name : "unknown"}`, "err", "EMU");
    });
    emu.add_listener("screen-set-size", (a) => {
      const w = a[0], h = a[1], bpp = a[2];
      S.g.video = bpp ? `GFX ${w}×${h}×${bpp}` : `TEXT ${w}×${h}`;
      setBadge("b-video", S.g.video);
      if (bpp) {
        if (!S.g.bootFound) {
          S.g.bootFound = true;
          S.g.bootAt = performance.now();
          phase("ph-bios", "ok");
          phase("ph-dev", "ok", "VGA Framebuffer");
        }
        S.g.gfx++;
        phase("ph-guest", "ok", S.g.video);
        log(`Guest switched to graphics framebuffer: ${w}×${h}×${bpp}`, "ok", "VGA");
      }
    });

    emu.add_listener("screen-put-char", (a) => {
      const r = a[0], c = a[1], ch = a[2];
      const charStr = ch >= 32 && ch < 127 ? String.fromCharCode(ch) : " ";
      const row = S.grid[r] || (S.grid[r] = []);

      if (row[c] === charStr) return;

      row[c] = charStr;
      for (let i = 0; i < c; i++) if (row[i] === undefined) row[i] = " ";

      S.g.chars++;
      if (S.g.bootFound) S.g.charsAfterBoot++;

      const rowStr = row.join("").trim();

      if (r === 0 && c === 0 && charStr === " ") {
        S.g.bannerLatched = false;
      }

      if (rowStr.includes("SeaBIOS (version") && !S.g.bannerLatched && S.g.gfx === 0) {
        S.g.bannerLatched = true;
        S.g.banners++;
        phase("ph-bios", "ok");
        if (S.g.banners > 1) {
          log(`SeaBIOS POST detected (#${S.g.banners}) — Guest triggered hardware reset.`, "warn", "BIOS");
        }
      }

      const bootMatch = /Booting from (.+?)\.\.\./.exec(rowStr);
      if (bootMatch && !S.g.bootFound) {
        S.g.bootFound = true;
        S.g.bootAt = performance.now();
        S.g.charsAfterBoot = 0;
        phase("ph-bios", "ok");
        phase("ph-dev", "ok", bootMatch[1]);
        phase("ph-guest", "run");
        log(`SeaBIOS handing off boot control to: ${bootMatch[1]}`, "ok", "BIOS");
      }

      if (rowStr.includes("Boot failed")) {
        phase("ph-dev", "err", "SeaBIOS Boot failed");
        showAlert("BOOT_FAILED", "SeaBIOS reported 'Boot failed'. Check that the image has a valid 0x55AA signature or switch the drive slot (hda / fda / cdrom).");
      }

      if (S.g.bootFound && guestAlive() > 0) phase("ph-guest", "ok");
      scheduleRender();
    });

    emu.add_listener("serial0-output-byte", (b) => {
      S.g.serial++;
      S.serial += String.fromCharCode(b);
      if (S.serial.length > 25000) S.serial = S.serial.slice(-12000);
      if (!S.g.bootFound) {
        S.g.bootFound = true;
        S.g.bootAt = performance.now();
        phase("ph-bios", "ok");
        phase("ph-dev", "ok", "COM1 Boot");
      }
      phase("ph-guest", "ok", "COM1 Serial");
      scheduleRender();
    });

    emu.add_listener("mouse-enable", (en) => {
      if (en) {
        S.g.mouse = true;
        log("Guest OS initialized PS/2 Mouse driver.", "ok", "INPUT");
        if (!S.g.bootFound) {
          S.g.bootFound = true;
          S.g.bootAt = performance.now();
          phase("ph-bios", "ok");
          phase("ph-dev", "ok", "PS/2 Mouse Init");
        }
        phase("ph-guest", "ok", "PS/2 Mouse");
      }
    });

    emu.add_listener("ide-read-start", () => {
      S.g.ide++;
      scheduleRender();
    });
  }

  async function startEmu(config, label, ramMB) {
    destroyEmu();
    resetGuest();
    resetPhases();
    hideAlert();
    $("log-ser").textContent = "";
    $("log-txt").textContent = "";
    $("vga-last").textContent = "Waiting for BIOS POST …";
    S.label = label;
    S.paused = false;
    $("btn-pause").textContent = "⏸ Pause";

    try {
      phase("ph-assets", "run");
      await ensureAssets();
      phase("ph-assets", "ok");

      const container = recreateScreen();
      const mb = ramMB || parseInt($("ram").value, 10) || 128;
      $("ram").value = String(mb);
      updateRamCalculator();

      setBadge("b-engine", "v86 WASM-JIT");
      setBadge("b-video", "TEXT 80×25");

      const netCfg = buildNetworkConfig();
      const diskCfg = Object.assign({}, config);

      if (S.blankHdd) {
        if (!diskCfg.hda) diskCfg.hda = { buffer: S.blankHdd };
        else if (!diskCfg.hdb) diskCfg.hdb = { buffer: S.blankHdd };
      }

      const opts = Object.assign({
        wasm_path: S.base + "v86.wasm",
        memory_size: mb * 1048576,
        vga_memory_size: 16 * 1048576,
        screen_container: container,
        bios: { buffer: S.assets.bios.slice(0) },
        vga_bios: { buffer: S.assets.vga.slice(0) },
        autostart: true
      }, netCfg, diskCfg);

      log(`Booting "${label}" with ${mb} MB Guest RAM + 16 MB VGA RAM …`, "info", "EMU");
      overlay(false);
      S.t0 = performance.now();
      S.emu = new window.V86(opts);
      wire(S.emu);
      S.timer = setInterval(tick, 1000);
    } catch (e) {
      overlay(false);
      phase("ph-assets", "err");
      showAlert("BOOT_INIT_ERROR", String(e && e.message ? e.message : e));
    }
  }

  // ====================================================================
  // 9. WATCHDOG & PERIODIC CANVAS HEARTBEAT
  // ====================================================================
  function tick() {
    if (!S.emu) return;
    let mips = null;
    try {
      const c = S.emu.get_instruction_counter();
      mips = (c - S.lastIns) / 1e6;
      S.lastIns = c;
    } catch (e) {}
    if (mips != null && !S.paused) setBadge("b-cpu", `${Math.max(0, mips).toFixed(1)} MIPS`);

    scheduleRender();

    const now = performance.now(), g = S.g;
    if (!g.bootFound && !g.warnedNoBoot && now - S.t0 > 22000) {
      g.warnedNoBoot = true;
      phase("ph-dev", "err", "Timeout after 22s");
      showAlert("NO_BOOT_DEVICE", "SeaBIOS did not emit 'Booting from …' within 22s. Check drive slot or image format.");
    }
    if (g.bootFound && !g.warnedSilent && guestAlive() === 0 && now - g.bootAt > 9000) {
      g.warnedSilent = true;
      phase("ph-guest", "err", "Silent for 9s");
      const a = S.analysis;
      let m = "SeaBIOS executed the boot sector, but the guest OS produced no VGA, COM1, or mouse activity for 9s.\n";
      if (a && a.needs64) {
        m += "\nRoot Cause: This image contains a 64-bit (x86_64) ELF kernel or Long Mode transition. v86 emulates 32-bit x86 (i686) only.";
      }
      showAlert("GUEST_SILENT", m, { alt: true });
    }
    if (g.banners >= 4 && !g.warnedLoop && g.gfx === 0) {
      g.warnedLoop = true;
      phase("ph-guest", "err", "Triple-Fault Reset Loop");
      showAlert("REBOOT_LOOP", `SeaBIOS POST banner appeared ${g.banners}× without entering graphics mode — typical of a 64-bit Long Mode Triple Fault in a 32-bit emulator.`, { alt: true });
    }
  }

  function gridText() {
    return S.grid.map((r) => (r ? r.join("").replace(/\s+$/, "") : "")).join("\n").replace(/\n+$/, "");
  }

  // ====================================================================