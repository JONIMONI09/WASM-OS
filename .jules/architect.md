## 2026-10-23 - Never Stub `js/hypervisor.js` for CI Tests

**Learning:** Replacing `window.V86` with a dummy stub (`"[HV] Hypervisor stub started."`) made Playwright pass superficially while leaving the production web app completely non-functional.
**Action:** `js/hypervisor.js` must always load the real `libv86.js`, `v86.wasm`, `seabios.bin`, and `vgabios.bin` and instantiate `new window.V86(opts)`. Playwright tests must assert `typeof window.V86 === "function"` and verify real canvas pixels.
