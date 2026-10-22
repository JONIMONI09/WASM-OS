# WASM-OS Studio v4.0

Limbo-Class Browser x86 Hypervisor, Networking & Snapshot Engine.

## Features
- x86 WebAssembly Hypervisor
- Live JS Console & Snapshot Engine
- Cross-Origin Isolation (COOP/COEP) support for GitHub Pages
- Responsive UI with strict Z-index for mobile (Android/iOS)
- Service Worker for offline capabilities

## RAM Budget Guide
- **Guest Box**: Configurable (e.g., 128 MB)
- **Overhead**: ~160 MB (Base Tab + VGA/Wasm JIT)
- **Mobile recommendation**: 128-256 MB max

## Deployment
Automatically deployed to GitHub Pages via GitHub Actions.
Requires COOP/COEP headers handled by the `coi-serviceworker.js`.

[![Deploy to GitHub Pages](https://github.com/vibeos/wasm-os/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/vibeos/wasm-os/actions/workflows/deploy-pages.yml)
