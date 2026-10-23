import { X8664Engine } from './arch/x86-64-engine.js';
import { RISCV64Engine } from './arch/riscv64-engine.js';
import { ARM64Engine } from './arch/arm64-engine.js';
import { analyzeImage } from './image-analyzer.js';

export const PH_TXT = {
    "ph-assets": "Hypervisor & BIOS ROMs loaded",
    "ph-ready": "Emulator instance initialized",
    "ph-bios": "SeaBIOS POST banner verified",
    "ph-dev": "Boot device handed off (\"Booting from …\")",
    "ph-guest": "Guest OS active (VGA / COM1 / PS2 Mouse / NIC)"
};

window.phase = function phase(id, st, extra) {
    const e = document.getElementById(id);
    if (!e) return;
    e.className = "ph " + (st === "ok" ? "ok" : st === "err" ? "err" : st === "run" ? "run" : "");
    const icon = st === "ok" ? "✔ " : st === "err" ? "✖ " : st === "run" ? "… " : "○ ";
    e.textContent = icon + (PH_TXT[id] || id) + (extra ? " — " + extra : "");
}
export function phase(id, st, extra) {
    const e = document.getElementById(id);
    if (!e) return;
    e.className = "ph " + (st === "ok" ? "ok" : st === "err" ? "err" : st === "run" ? "run" : "");
    const icon = st === "ok" ? "✔ " : st === "err" ? "✖ " : st === "run" ? "… " : "○ ";
    e.textContent = icon + (PH_TXT[id] || id) + (extra ? " — " + extra : "");
}

export function resetPhases() {
    ["ph-assets", "ph-ready", "ph-bios", "ph-dev", "ph-guest"].forEach(id => {
        phase(id, "", "");
    });
}

export class Hypervisor {
    constructor(vgaCanvas, termOut, termIn) {
        this.vgaCanvas = vgaCanvas;
        this.termOut = termOut;
        this.termIn = termIn;
        this.engine = null;
        this.arch = null;
        this.memory = new ArrayBuffer(32 * 1024 * 1024); // 32MB Memory Buffer
        this.interval = null;
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        if (this.engine) this.engine.running = false;
    }

    loadAndRun(buffer, name, v86Fallback) {
        this.stop();
        const analysis = analyzeImage(buffer, name);
        this.arch = analysis.arch;

        if (this.arch === "x86_64") {
            this.engine = new X8664Engine(this.memory, this.termOut, this.termIn, this.vgaCanvas);
            if (analysis.format === "PE32+_UEFI") {
                this.engine.loadUEFI(new Uint8Array(buffer));
            } else if (analysis.format === "ELF64") {
                this.engine.loadELF64(new Uint8Array(buffer));
            } else {
                this.engine.loadRaw(new Uint8Array(buffer), 0x100000);
            }
        } else if (this.arch === "riscv64") {
            this.engine = new RISCV64Engine(this.memory, this.termOut, this.termIn, this.vgaCanvas);
            this.engine.loadRaw(new Uint8Array(buffer), 0x100000); // Simple raw load for demo
        } else if (this.arch === "aarch64") {
            this.engine = new ARM64Engine(this.memory, this.termOut, this.termIn, this.vgaCanvas);
            this.engine.loadRaw(new Uint8Array(buffer), 0x100000); // Simple raw load for demo
        } else {
            // Fallback to v86 for i686/x86 32-bit
            this.arch = "i686";
            if (v86Fallback) v86Fallback({ fda: { buffer: buffer } }, name, 128);
            return;
        }

        this.engine.running = true;
        this.startRunLoop();
    }

    startRunLoop() {
        this.interval = setInterval(() => {
            if (!this.engine || !this.engine.running) return;
            for(let i=0; i<1000; i++) {
                if(!this.engine.running) break;
                const info = this.engine.step();
                if (window.onCpuStep) {
                    window.onCpuStep(info, this.engine);
                }
            }
        }, 16); // ~60 FPS update
    }

    // Test mutator for Falsifiability Proof
    mutateByte(addr, val) {
        if (this.engine) {
            this.engine.memory[addr] = val;
        }
    }
}
