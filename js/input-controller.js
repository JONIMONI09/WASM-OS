
function $(id) { return document.getElementById(id); }

function download(bytes, name) { console.window.log("Download", name); }
  // 12. UNIFIED INPUT CONTROLLER (CANVAS TOUCH, TRACKPAD, POINTER LOCK)
  // ====================================================================
  const KEYS = {
    Enter: [0x1C], Esc: [0x01], Tab: [0x0F], Backspace: [0x0E], Space: [0x39],
    Up: [0xE0, 0x48], Down: [0xE0, 0x50], Left: [0xE0, 0x4B], Right: [0xE0, 0x4D]
  };
  export function sendKey(name) {
    const make = KEYS[name];
    if (!make || !S.emu) return;
    const brk = make.length === 2 ? [0xE0, make[1] | 0x80] : [make[0] | 0x80];
    try { S.emu.keyboard_send_scancodes(make.concat(brk)); } catch (e) {}
  }
  export function sendText(t, enter) {
    if (!S.emu) return;
    try {
      S.emu.keyboard_send_text(enter ? t + "\n" : t);
      window.log(`Injected keystrokes: "${t}"`, "info", "INPUT");
    } catch (e) {}
  }
  export function mouseDelta(dx, dy) {
    if (S.emu && S.emu.bus) S.emu.bus.send("mouse-delta", [dx, -dy]);
  }
  export function mouseBtn(l, m, r) {
    if (S.emu && S.emu.bus) S.emu.bus.send("mouse-click", [!!l, !!m, !!r]);
  }
  export function clickOnce(btn) {
    const st = [btn === 0, btn === 1, btn === 2];
    mouseBtn(st[0], st[1], st[2]);
    setTimeout(() => mouseBtn(S.drag, false, false), 65);
  }
  export function toggleDragLock() {
    S.drag = !S.drag;
    const txt = `✋ Drag Lock: ${S.drag ? "ON" : "OFF"}`;
    $("m-drag").textContent = txt;
    $("fs-drag").textContent = `✋ Drag: ${S.drag ? "ON" : "OFF"}`;
    mouseBtn(S.drag, false, false);
  }

  export function bindPointerSurface(el) {
    let isDown = false, last = null, t0 = 0, moved = 0, ax = 0, ay = 0;

    el.addEventListener("pointerdown", (e) => {
      if (document.pointerLockElement) return;
      try { el.setPointerCapture(e.pointerId); } catch (x) {}
      isDown = true;
      last = { x: e.clientX, y: e.clientY };
      t0 = performance.now();
      moved = 0;
      if (e.button === 2) {
        e.preventDefault();
        clickOnce(2);
      }
    });

    el.addEventListener("pointermove", (e) => {
      if (document.pointerLockElement) return;
      if (!isDown) {
        if (el.id === "screen_container" && e.pointerType === "mouse") {
          if (last) {
            const dx = (e.clientX - last.x) * S.sens;
            const dy = (e.clientY - last.y) * S.sens;
            ax += dx;
            ay += dy;
            const ix = Math.trunc(ax), iy = Math.trunc(ay);
            if (ix || iy) { ax -= ix; ay -= iy; mouseDelta(ix, iy); }
          }
          last = { x: e.clientX, y: e.clientY };
        }
        return;
      }

      if (!last) {
        last = { x: e.clientX, y: e.clientY };
        return;
      }

      const mult = $("m-mode").value === "direct" ? S.sens * 1.35 : S.sens;
      const stepX = e.clientX - last.x;
      const stepY = e.clientY - last.y;
      ax += stepX * mult;
      ay += stepY * mult;
      moved += Math.abs(stepX) + Math.abs(stepY);
      last = { x: e.clientX, y: e.clientY };

      const ix = Math.trunc(ax), iy = Math.trunc(ay);
      if (ix || iy) {
        ax -= ix;
        ay -= iy;
        mouseDelta(ix, iy);
      }
      e.preventDefault();
    });

    const finishPointer = (e) => {
      if (!isDown) return;
      isDown = false;
      if (moved < 8 && performance.now() - t0 < 350 && (!e || e.button !== 2)) {
        clickOnce(0);
      }
    };

    el.addEventListener("pointerup", finishPointer);
    el.addEventListener("pointercancel", () => { isDown = false; last = null; });
    el.addEventListener("pointerleave", () => { if (!isDown) last = null; });
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  // ====================================================================