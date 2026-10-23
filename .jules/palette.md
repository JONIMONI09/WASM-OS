## 2026-10-23 - Firefox Drops Comma-Separated Selectors Containing `:-webkit-full-screen`

**Learning:** Mixing `#screen-wrap:fullscreen, #screen-wrap:-webkit-full-screen, #screen-wrap.fs-active` in `css/studio.css` caused Firefox to ignore the entire CSS rule block, breaking fullscreen layout and hiding `#fs-hud`.
**Action:** Never place `:-webkit-full-screen` inside a shared selector list with standard `:fullscreen` or class selectors.
