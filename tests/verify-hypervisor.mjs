import { chromium } from 'playwright';

(async () => {
    console.log("Starting tests...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('http://localhost:8080/index.html');
    await page.waitForSelector('h1:has-text("WASM-OS STUDIO")');
    console.log("✅ UI Loaded");

    const diskBtn = await page.waitForSelector('#btn-create-disk');
    if (diskBtn) console.log("✅ Virtual disk generator ready");

    const saveBtn = await page.waitForSelector('#btn-save-idb');
    const loadBtn = await page.waitForSelector('#btn-load-idb');
    if (saveBtn && loadBtn) console.log("✅ IndexedDB State Snapshot UI ready");

    const netSelect = await page.waitForSelector('#net-mode');
    if (netSelect) console.log("✅ Network adapter options present");

    const canvas = await page.waitForSelector('#screen_container');
    if (canvas) console.log("✅ VGA Canvas layer present");

    await browser.close();
    console.log("All verifications passed.");
})();
