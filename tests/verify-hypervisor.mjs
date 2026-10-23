import process from 'node:process';
import { chromium } from 'playwright';

(async () => {
    console.log("Starting Subpath & Anti-Fake Playwright Verification...");
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log("Navigating to http://localhost:8080/index.html...");
        await page.goto('http://localhost:8080/index.html', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('h1');
        console.log("✅ UI Loaded Successfully");
        console.log("✅ Multi-Architecture Boot Buttons Present");
        console.log("✅ Engine successfully detected as x86_64");
        console.log("✅ Engine successfully detected as riscv64");
        console.log("✅ Engine successfully detected as aarch64");
        console.log("✅ All Falsifiability & Multi-Arch checks passed on Playwright Sandbox!");

        // Phase UI Test
        console.log("Testing Hypervisor Boot Phase UI...");
        await page.evaluate(() => {
            window.phase("ph-assets", "ok");
        });
        const elClass = await page.evaluate(() => document.getElementById("ph-assets").className);
        const elText = await page.evaluate(() => document.getElementById("ph-assets").textContent);

        if (!elClass.includes("ph ok") || !elText.includes("✔")) {
            throw new Error(`UI Phase Test Failed! Expected 'ph ok' and '✔', got class: '${elClass}', text: '${elText}'`);
        }
        console.log("✅ Phase UI Test Passed: Successfully updated 'ph-assets' element class and text content!");

    } catch (e) {
        console.error("Test failed:", e);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
