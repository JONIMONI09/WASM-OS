## 2026-10-23 - Deduplicate `screen-put-char` Events in `v86`

**Learning:** `v86` re-emits `screen-put-char` for all 80x25 cells on screen refreshes, which caused false-positive `687x REBOOT_LOOP` alerts when counting SeaBIOS banners blindly.
**Action:** Only process `screen-put-char` when `grid[r][c] !== charStr`, and latch the BIOS banner counter once graphics mode (`bpp > 0`) is active.
