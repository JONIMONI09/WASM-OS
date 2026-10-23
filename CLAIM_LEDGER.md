# Verification Ledger

- **Restored full real v86 implementation**: `js/main.js` and `js/hypervisor.js` no longer use fake `stub` placeholders.
- **Removed file:// references**: `index.html`, `js/`, `css/`, `coi-serviceworker.js` are free of `file://`.
- **CSS Standards**: `css/studio.css` has `:-webkit-full-screen` and `:fullscreen` properly separated to avoid Firefox invalidating the entire ruleset.
- **Service Worker COEP**: `coi-serviceworker.js` uses `credentialless` for COEP.
- **Playwright Test Execution**: Tests passed and verified that there are no occurrences of "stub" in the console. `V86` object instantiation was asserted in the tests via evaluation instead of blocking `waitForFunction`.
- **Restored Remote Boot Loading**: `remote` function and `startFromBuffer` restored with multi-cdn fallbacks to fix the blank crashes when clicking `b-kolibri` or `b-linux` buttons.
