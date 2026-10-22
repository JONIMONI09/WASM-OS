  // 10. BINARY IMAGE & ELF32/ELF64 ANALYZER
  // ====================================================================
  function findSeq(u8, seq, limit) {
    const n = Math.min(u8.length, limit || u8.length) - seq.length;
    outer: for (let i = 0; i <= n; i++) {
      for (let j = 0; j < seq.length; j++) if (u8[i + j] !== seq[j]) continue outer;
      return i;
    }
    return -1;
  }

  function analyzeImage(buf, name) {
    const u = new Uint8Array(buf), a = { name, size: u.length };
    a.mbr = u.length >= 512 && u[510] === 0x55 && u[511] === 0xAA;
    a.iso = u.length > 0x8006 && String.fromCharCode(u[0x8001], u[0x8002], u[0x8003], u[0x8004], u[0x8005]) === "CD001";
    a.parts = [];
    if (a.mbr) {
      for (let i = 0; i < 4; i++) {
        const o = 446 + i * 16, type = u[o + 4];
        if (type) {
          a.parts.push({
            n: i + 1,
            boot: u[o] === 0x80,
            type,
            lba: u[o + 8] | (u[o + 9] << 8) | (u[o + 10] << 16) | (u[o + 11] << 24)
          });
        }
      }
    }
    a.int13ext = findSeq(u, [0xB4, 0x41, 0xBB, 0xAA, 0x55, 0xCD, 0x13], 1024) >= 0;
    a.elf = [];
    const lim = Math.min(u.length - 20, 64 * 1048576);
    for (let i = 0; i < lim && a.elf.length < 6; i++) {
      if (u[i] === 0x7F && u[i + 1] === 0x45 && u[i + 2] === 0x4C && u[i + 3] === 0x46) {
        const cls = u[i + 4], mach = u[i + 18] | (u[i + 19] << 8);
        if ((cls === 1 || cls === 2) && u[i + 5] === 1 && (mach === 0x3E || mach === 0x03)) {
          a.elf.push({ off: i, bits: cls === 2 ? 64 : 32, mach });
        }
      }
    }
    a.elf64 = a.elf.some((e) => e.bits === 64 && e.mach === 0x3E);
    const scan = u.subarray(0, Math.min(u.length, 16 * 1048576));
    a.efer = findSeq(scan, [0xB9, 0x80, 0x00, 0x00, 0xC0, 0x0F, 0x32]) >= 0;
    a.needs64 = a.elf64 || (a.efer && a.int13ext);
    const lower = (name || "").toLowerCase();
    if (a.iso || lower.endsWith(".iso")) a.drive = "cdrom";
    else if (FLOPPY_SIZES.indexOf(u.length) >= 0 && a.parts.length === 0) a.drive = "fda";
    else a.drive = "hda";
    return a;
  }

  function renderAnalysis(a) {
    const rows = [];
    const add = (cls, t) => rows.push(`<div class="${cls}">${t}</div>`);
    add("a-inf", `File: <b>${a.name.replace(/[<&]/g, "")}</b> · ${(a.size / 1024).toFixed(1)} KB`);
    add(a.mbr ? "a-ok" : "a-warn", `${a.mbr ? "✔" : "⚠"} MBR signature 0x55 0xAA at offset 510`);
    if (a.iso) add("a-ok", "✔ ISO-9660 (CD001) optical image detected → cdrom");
    if (a.elf.length) add("a-inf", "ELF Headers: " + a.elf.map((e) => `ELF${e.bits} @0x${e.off.toString(16)}`).join(", "));
    if (a.needs64) add("a-bad", "✖ <b>x86_64 Long Mode kernel detected — v86 is 32-bit only.</b>");
    else add("a-ok", "✔ 32-bit / Real-Mode compatible image.");
    add("a-inf", `Recommended mount slot: <b>${a.drive}</b>`);
    const el = $("analysis");
    el.innerHTML = rows.join("");
    el.className = "show";
  }

  function renderHex(u8, label) {
    const b = $("hex-badge"), el = $("hex");
    const ok = u8.length >= 512 && u8[510] === 0x55 && u8[511] === 0xAA;
    b.textContent = u8.length >= 512 ? (ok ? "MBR 0x55 0xAA ✔" : `End 0x${hex(u8[510])} 0x${hex(u8[511])}`) : `${u8.length} Bytes`;
    b.style.color = ok ? "#6ee7b7" : "#fcd34d";
    const row = (o) => {
      let h = "", t = "";
      for (let i = 0; i < 16; i++) {
        const v = u8[o + i];
        if (v === undefined) { h += "   "; continue; }
        h += hex(v) + " ";
        t += v >= 32 && v < 127 ? String.fromCharCode(v) : ".";
      }
      return `${hex(o, 4)}: ${h} |${t}|\n`;
    };
    let out = `--- ${label} (${u8.length} B, first 512 B) ---\n`;
    const n = Math.min(u8.length, 512);
    for (let o = 0; o < Math.min(n, 160); o += 16) out += row(o);
    if (n > 160) {
      out += "…\n";
      for (let o = 480; o < n; o += 16) out += row(o);
    }
    el.textContent = out;
  }

  // ====================================================================
  // 11. IMAGE & REMOTE OS LAUNCHERS
  // ====================================================================
  function padTo(buf, size) {
    const o = new Uint8Array(size);
    o.set(new Uint8Array(buf));
    return o.buffer;
  }
  function floppyBuffer(buf) {
    const len = buf.byteLength;
    for (const s of FLOPPY_SIZES) if (len <= s) return len === s ? buf : padTo(buf, s);
    return buf;
  }
  function startFromBuffer(buf, drive, name) {
    const ram = parseInt($("ram").value, 10) || 128;
    const cfg = {};
    if (drive === "fda" || drive === "fdb") cfg[drive] = { buffer: floppyBuffer(buf) };
    else if (drive === "cdrom") cfg.cdrom = { buffer: buf };
    else cfg[drive] = { buffer: buf.byteLength % 512 ? padTo(buf, Math.ceil(buf.byteLength / 512) * 512) : buf };
    return startEmu(cfg, `${name} (${drive})`, ram);
  }

  async function onFile(file) {
    if (!file) return;
    try {
      log(`Reading local image "${file.name}" (${(file.size / 1024).toFixed(1)} KB) …`, "info", "DISK");
      const buf = await file.arrayBuffer();
      const a = analyzeImage(buf, file.name);
      S.analysis = a;
      renderAnalysis(a);
      renderHex(new Uint8Array(buf, 0, Math.min(512, buf.byteLength)), file.name);
      const sel = $("drive-type").value, drive = sel === "auto" ? a.drive : sel;
      S.pending = { buf, drive, name: file.name };
      if (a.needs64) {
        showAlert("X86_64_KERNEL_DETECTED",
          `"${file.name}" contains a 64-bit x86_64 kernel.\nv86 emulates a 32-bit (i686) CPU and cannot execute 64-bit Long Mode instructions. Click "Force Boot Anyway" to test the bootloader stage.`,
          { force: true, alt: true });
        return;
      }
      await startFromBuffer(buf, drive, file.name);
    } catch (e) {
      crash("Failed to load image file", e);
    }
  }

  function builtin(b64s, name) {
    const raw = b64(b64s), img = new Uint8Array(1474560);
    img.set(raw);
    renderHex(img.subarray(0, 512), name);
    S.analysis = null;
    const ram = parseInt($("ram").value, 10) || 64;
    return startEmu({ fda: { buffer: img.buffer } }, name, ram);
  }

  async function remote(file, drive, label, defaultRam) {
    try {
      await ensureAssets();
      overlay(true, `Downloading ${label}`, file, 0);
      const candidateUrls = REMOTE_IMAGE_URLS[file] || IMG_BASES.map((b) => b + file);
      let buf = null;
      try {
        buf = await fetchBuf(
          candidateUrls,
          label,
          (g, t) => overlay(true, null, `${(g / 1048576).toFixed(1)} MB` + (t ? ` / ${(t / 1048576).toFixed(1)} MB` : ""), t ? (g / t) * 100 : 50)
        );
      } catch (downloadErr) {
        overlay(false);
        log(`Remote CDN download blocked or offline (${downloadErr.message}) — falling back to Direct Streaming URL mode …`, "warn", "LOAD");
      }

      overlay(false);
      if ((file.includes("kolibri") || file.includes("linux")) && $("net-card").value === "none") {
        $("net-card").value = "ne2k";
      }

      const cfg = {};
      if (buf) {
        renderHex(new Uint8Array(buf, 0, Math.min(512, buf.byteLength)), file);
        S.analysis = analyzeImage(buf, file);
        cfg[drive] = { buffer: drive === "fda" ? floppyBuffer(buf) : buf };
      } else {
        const directUrl = file === "kolibri.img"
          ? "https://builds.kolibrios.org/eng/data/data/kolibri.img"
          : ("https://i.copy.sh/" + file);
        log(`Attempting direct v86 URL mount: ${directUrl}`, "info", "LOAD");
        cfg[drive] = { url: directUrl, async: false };
      }

      const chosenRam = Math.max(defaultRam, parseInt($("ram").value, 10) || defaultRam);
      await startEmu(cfg, label, chosenRam);
    } catch (e) {
      overlay(false);
      showAlert("IMAGE_DOWNLOAD_ERROR", String(e.message || e), { alt: true });
    }
  }

  // ====================================================================