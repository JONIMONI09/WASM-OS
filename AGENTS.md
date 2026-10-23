\# AGENTS.md — Autonomous Engineering Constitution, Self-Critique \\\& Tool-Calling Manual



> \\\*\\\*AUTOMATIC EXECUTION CONTRACT FOR GOOGLE JULES:\\\*\\\*

> You MUST read and obey this file (`AGENTS.md`) as your very first action in every session before creating a plan, invoking any tool, or editing any file.



\## 1\\. MANDATORY FIRST STEPS FOR GOOGLE JULES (EXECUTE IN EXACT ORDER)



Before you write or modify a single line of application code, you MUST execute these 5 steps in order:



\### Step 1: Tool-Calling — Initialize Your Native Task Planner FIRST



\* \*\*Rule\*\*: Immediately invoke your native built-in task tracking / planning tool to break the user's request into verifiable milestones.

\* \*\*Prohibition\*\*: Never create a `TODO.md` file in the git repository. Never mark a task `completed` until its automated bash verification command returns exit code `0`.



\### Step 2: Tool-Calling — Run Pre-Flight Setup \\\& Read Persistent Journals (`.jules/\\\*.md`)



\* If the `silly-agentic-coding` structure (`.jules/`, `agent\\\_sources/`, `agents/`, `build.py`) is not yet present in this repository, fetch it first via bash:



```

&#x20; git clone --depth 1 https://github.com/schacherle/silly-agentic-coding.git /tmp/sac

&#x20; cp -rn /tmp/sac/.jules /tmp/sac/agent\\\_sources /tmp/sac/agents /tmp/sac/agents\\\_bulk /tmp/sac/build.py .

&#x20; cp -rn /tmp/sac/.github/workflows/build-agents.yml .github/workflows/

&#x20; rm -rf /tmp/sac

&#x20; 

&#x20; ```



\* Run `.jules/setup.sh` (or `npm ci || npm install`) to verify Node.js 24, ESLint, and Playwright Chromium.

\* \*\*READ YOUR MEMORY FIRST\*\*: Use your file-reading tool to inspect `.jules/architect.md`, `.jules/bolt.md`, `.jules/palette.md`, `.jules/sentinel.md`, and `.jules/inspector.md` so you never repeat a previously documented mistake.



\### Step 3: Tool-Calling — Inspect Existing Code Before Editing (`git log` \\\& `git show`)



\* Never overwrite a file blindly. Always read the target file first and check previous working commits (e.g., `git show da0edc5:js/hypervisor.js`) so you never accidentally delete working business logic, hardware drivers, or binary images.



\## 2\\. THE 10 CORE RULES FROM `silly-agentic-coding` (`agent\\\_sources/common/`)



Every agent persona (`Architect`, `Bolt`, `Palette`, `Sentinel`, `Inspector`, `Helmsman`, `Stagehand`, `Mason`, `Sledge`, `Watcher`, etc.) MUST obey these 10 compiled rules at all times:



\### Rule 1: Prime Directive \\\& Zero Reward-Hacking (`prime\\\_directive.md` + `anti\\\_stub\\\_rule.md`)



\* \*\*Leave the codebase strictly better, more functional, and cleaner than you found it.\*\*

\* \*\*ABSOLUTE BAN ON FAKE STUBS\*\*: You are strictly forbidden from replacing real application logic (such as `window.V86`, `libv86.js`, `v86.wasm`, `seabios.bin`, `vgabios.bin`, or CPU instruction decoders in `js/arch/\\\*.js`) with fake stubs (e.g., `"\\\[HV] Hypervisor stub started."`) just to make a test pass. Faking state variables for tests is a critical failure.



\### Rule 2: Self-Critical Adversarial Audit (`tone\\\_rules.md` \\\& Self-Critique Protocol)



\* \*\*Be Ruthlessly Critical of Your Own Work\*\*: Never assume your code works because it "looks right."

\* After every edit, ask yourself:



&#x20; 1. \*"Did I actually solve the root cause, or did I just silence the error / stub the function?"\*

&#x20; 2. \*"What happens if a real user clicks every button on GitHub Pages right now?"\*

&#x20; 3. \*"What happens if an external CDN or CORS request fails?"\*

&#x20; 4. \*"Did I accidentally shrink or delete working code from an earlier commit?"\* (Verify with `git diff --stat`!).



\### Rule 3: Continuous Error Learning (`journal\\\_rules.md`)



\* Whenever you encounter a bug, a test failure, a browser quirk (like Firefox CSS selector rejection), or a CI failure, you MUST document the root cause in the corresponding `.jules/<agent>.md` journal before finishing:



```

&#x20; ## YYYY-MM-DD - \\\[Short Technical Title]

&#x20; \\\*\\\*Learning:\\\*\\\* \\\[Exact technical root cause of the failure and why it happened]

&#x20; \\\*\\\*Action:\\\*\\\* \\\[Concrete rule to prevent this mistake in all future sessions]

&#x20; 

&#x20; ```



\### Rule 4: Strict Relative Paths for GitHub Pages (`relative\\\_paths\\\_rule.md`)



\* This application is deployed on GitHub Pages under a project subpath (`https://<user>.github.io/WASM-OS/`).

\* \*\*Mandatory\*\*: Use strictly relative paths (`./js/...`, `./css/...`, `./coi-serviceworker.js`, `./manifest.json`).

\* \*\*Forbidden\*\*: Never use root-relative paths (`/js/...`) that break on subpaths, and \*\*NEVER\*\* include `file:///` URLs anywhere in HTML, CSS, or JS (which triggers `SecurityError` in browsers).



\### Rule 5: Artifact \\\& Repository Hygiene (`artifact\\\_cleanup\\\_rule.md` \\\& `boundary\\\_package.md`)



\* Never leave temporary helper scripts (such as `fix\\\_eslint13.py`), `.log` files, `node\\\_modules/`, `\\\_site/`, or Playwright test results tracked in git.

\* \*\*Lockfile Invariant\*\*: `package.json` and `package-lock.json` MUST always remain tracked in git (`never` add `package\\\*.json` to `.gitignore`), otherwise GitHub Actions `actions/setup-node` fails immediately.



\### Rule 6: Browser \\\& CSS Standards (`boundary\\\_style.md`)



\* \*\*Firefox Selector Invariant\*\*: In `css/studio.css`, NEVER combine `:-webkit-full-screen` and `:fullscreen` in the same comma-separated CSS rule list (e.g., `#screen-wrap:fullscreen, #screen-wrap:-webkit-full-screen`). Per W3C Selectors Level 4 and MDN, Firefox invalidates and drops the \*\*entire CSS rule\*\* if any selector in the comma list has an unknown `-webkit-` pseudo-class. Use standard `:fullscreen` and `.fs-active` only.

\* \*\*Mobile \\\& Z-Index Isolation\*\*: Enforce `100dvh`, `env(safe-area-inset-\\\*)`, minimum `44px x 44px` touch targets, and strict Z-index layering (`Canvas: 1`, `HUD: 100`, `Interactive Controls \\\& Fullscreen HUD: 101`).



\### Rule 7: Security \\\& Cross-Origin Isolation (`security\\\_rules.md`)



\* In `coi-serviceworker.js`, always use `Cross-Origin-Embedder-Policy: credentialless` (never `require-corp`), and wrap `fetch()` in a safe fallback so external CDNs (`cdn.jsdelivr.net`, `unpkg.com`, `i.copy.sh`) and CORS proxies (`api.allorigins.win`, `api.codetabs.com`) are never blocked on GitHub Pages.

\* Never swallow exceptions silently: `crash(ctx, err)` must always format and display the full error name, message, and stack trace in the UI alert and JS Console tab.



\### Rule 8: Scope \\\& Size Discipline (`size\\\_rules.md`)



\* When running a standard micro-agent from `agents/\\\*.md`, keep diffs surgical, focused, and minimal.

\* When running a bulk architecture upgrade from `agents\\\_bulk/\\\*.md` or a user master prompt, ensure 100% of modules are complete with zero truncation comments (`// ...`).



\### Rule 9: Real Execution Verification (`verification\\\_rule.md`)



\* Never claim a feature works without running the real linter (`npm run lint`) and the real Playwright headless browser suite (`npm test` / `node tests/verify-hypervisor.mjs`) via your bash tool.

\* If you modify any file in `agent\\\_sources/`, run `python3 build.py` via bash to recompile `agents/` and `agents\\\_bulk/`.



\### Rule 10: Pre-Pull-Request Gate (`pr\\\_gate.md`)



Before opening a Pull Request or marking your final task completed, run these exact 5 bash checks and inspect their output:



```

\# 1. Verify zero fake stubs exist in js/

! grep -rn -i "Hypervisor stub" js/



\# 2. Verify zero illegal file:// URLs or broken webkit-full-screen selectors exist

! grep -rn "file://" index.html js/ css/ coi-serviceworker.js

! grep -rn "webkit-full-screen" css/



\# 3. Verify package.json and package-lock.json are tracked in git

git ls-files --error-unmatch package.json package-lock.json



\# 4. Recompile agent definitions (if agent\\\_sources/ exists)

if \\\[ -f build.py ]; then python3 build.py; fi



\# 5. Run ESLint and Playwright E2E Verification Suite

npm run lint

npm test



```



\## 3\\. SPECIALIZED AGENT ROSTER (FROM `silly-agentic-coding`)



When working on specific subsystems of this repository, adopt the mindset and constraints of the corresponding agent in `agents/<name>.md`:



|Agent Name|File Path|Core Responsibility in `WASM-OS`|

|-|-|-|

|\*\*Architect\*\*|`agents/architect.md`|Modular structure (`js/hypervisor.js`, `js/arch/\\\*`), clean interfaces, zero circular dependencies.|

|\*\*Bolt\*\*|`agents/bolt.md`|WebAssembly JIT speed, `requestAnimationFrame` batching, delta-grid deduplication.|

|\*\*Palette\*\*|`agents/palette.md`|Mobile-first responsive UI, Z-index isolation (`1` / `100` / `101`), Fullscreen HUD, Firefox/Android CSS.|

|\*\*Sentinel\*\*|`agents/sentinel.md`|`coi-serviceworker.js` (`credentialless`), CORS proxy fallbacks, zero `file://` leaks, safe error handling.|

|\*\*Inspector\*\*|`agents/inspector.md`|`tests/verify-hypervisor.mjs` Playwright verification, anti-stub assertions, RAM mutation proof.|

|\*\*Helmsman\*\*|`agents/helmsman.md`|`.github/workflows/ci.yml` \\\& `deploy-pages.yml` (Node.js 24, clean `\\\_site/` artifact deployment).|

|\*\*Mason\*\*|`agents/mason.md`|Binary headers (`MBR`, `FAT16`, `ISO9660`, `ELF64`, `PE32+` UEFI `bootx64.efi`) in `js/image-analyzer.js`.|

|\*\*Scribe\*\*|`agents/scribe.md`|Accurate `README.md`, inline technical documentation, and `.jules/\\\*.md` journal maintenance.|



\## 4\\. INITIAL JOURNAL ENTRIES TO RECORD IN `.jules/` IMMEDIATELY



When setting up `.jules/` in this repository, ensure these 4 historical lessons from `WASM-OS` are recorded so they are never repeated:



1\. \*\*In `.jules/architect.md`:\*\*



&#x20;  \* \*\*2026-10-23 - Never Stub `js/hypervisor.js` for CI Tests\*\*

&#x20;  \* \*\*Learning:\*\* Replacing `window.V86` with a dummy stub (`"\\\[HV] Hypervisor stub started."`) made Playwright pass superficially while leaving the production web app completely non-functional.

&#x20;  \* \*\*Action:\*\* `js/hypervisor.js` must always load the real `libv86.js`, `v86.wasm`, `seabios.bin`, and `vgabios.bin` and instantiate `new window.V86(opts)`. Playwright tests must assert `typeof window.V86 === "function"` and verify real canvas pixels.

2\. \*\*In `.jules/palette.md`:\*\*



&#x20;  \* \*\*2026-10-23 - Firefox Drops Comma-Separated Selectors Containing `:-webkit-full-screen`\*\*

&#x20;  \* \*\*Learning:\*\* Mixing `#screen-wrap:fullscreen, #screen-wrap:-webkit-full-screen, #screen-wrap.fs-active` in `css/studio.css` caused Firefox to ignore the entire CSS rule block, breaking fullscreen layout and hiding `#fs-hud`.

&#x20;  \* \*\*Action:\*\* Never place `:-webkit-full-screen` inside a shared selector list with standard `:fullscreen` or class selectors.

3\. \*\*In `.jules/sentinel.md`:\*\*



&#x20;  \* \*\*2026-10-23 - `package\\\*.json` in `.gitignore` \\\& COEP `require-corp` Breaks GitHub Pages\*\*

&#x20;  \* \*\*Learning:\*\* Ignoring `package\\\*.json` broke GitHub Actions `setup-node`, and `require-corp` blocked external CDN assets (`jsDelivr`, `i.copy.sh`).

&#x20;  \* \*\*Action:\*\* Always track `package.json` and `package-lock.json` in git, and use `Cross-Origin-Embedder-Policy: credentialless` in `coi-serviceworker.js`.

4\. \*\*In `.jules/inspector.md`:\*\*



&#x20;  \* \*\*2026-10-23 - Deduplicate `screen-put-char` Events in `v86`\*\*

&#x20;  \* \*\*Learning:\*\* `v86` re-emits `screen-put-char` for all 80x25 cells on screen refreshes, which caused false-positive `687x REBOOT\\\_LOOP` alerts when counting SeaBIOS banners blindly.

&#x20;  \* \*\*Action:\*\* Only process `screen-put-char` when `grid\\\[r]\\\[c] !== charStr`, and latch the BIOS banner counter once graphics mode (`bpp > 0`) is active.





