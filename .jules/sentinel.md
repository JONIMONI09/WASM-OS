## 2026-10-23 - `package*.json` in `.gitignore` & COEP `require-corp` Breaks GitHub Pages

**Learning:** Ignoring `package*.json` broke GitHub Actions `setup-node`, and `require-corp` blocked external CDN assets (`jsDelivr`, `i.copy.sh`).
**Action:** Always track `package.json` and `package-lock.json` in git, and use `Cross-Origin-Embedder-Policy: credentialless` in `coi-serviceworker.js`.
