export class X8664Engine {
    constructor(memoryBuffer, termOut, termIn, vgaCanvas) {
        this.memory = new Uint8Array(memoryBuffer);
        this.dataview = new DataView(memoryBuffer);
        this.termOut = termOut;
        this.termIn = termIn;
        this.vga = vgaCanvas ? vgaCanvas.getContext('2d') : null;
        this.vgaData = this.vga ? this.vga.createImageData(320, 200) : null;

        this.registers = new BigUint64Array(17);
        // 0: RAX, 1: RCX, 2: RDX, 3: RBX, 4: RSP, 5: RBP, 6: RSI, 7: RDI
        // 8-15: R8-R15
        // 16: RIP
        this.flags = 0n; // RFLAGS
        this.tsc = 0n;

        this.instructionsExecuted = 0;
        this.running = false;

        this.COM1_TX = 0x3F8;
        this.COM1_LSR = 0x3FD;
        this.PCI_CONFIG_ADDR = 0xCF8;
        this.PCI_CONFIG_DATA = 0xCFC;

        this.pciAddress = 0;

        this.VGA_MEM = 0xA0000;
        this.VGA_MEM_64 = 0x20000000;
    }

    getRegisterName(idx) {
        const names = ["RAX", "RCX", "RDX", "RBX", "RSP", "RBP", "RSI", "RDI", "R8", "R9", "R10", "R11", "R12", "R13", "R14", "R15", "RIP"];
        return names[idx];
    }

    getRegister(idx) {
        return this.registers[idx];
    }

    setRegister(idx, val) {
        this.registers[idx] = val;
    }

    getRIP() {
        return this.registers[16];
    }

    setRIP(val) {
        this.registers[16] = val;
    }

    loadELF64(elfBytes) {
        const dv = new DataView(elfBytes.buffer, elfBytes.byteOffset, elfBytes.byteLength);
        if (dv.getUint32(0, false) !== 0x7F454C46) throw new Error("Not an ELF");
        if (dv.getUint8(4) !== 2) throw new Error("Not 64-bit ELF");
        if (dv.getUint16(18, true) !== 0x3E) throw new Error("Not x86_64 ELF");

        const entry = dv.getBigUint64(24, true);
        const phoff = dv.getBigUint64(32, true);
        const phentsize = dv.getUint16(54, true);
        const phnum = dv.getUint16(56, true);

        for (let i = 0; i < phnum; i++) {
            const pType = dv.getUint32(Number(phoff) + i * phentsize, true);
            if (pType === 1) { // PT_LOAD
                const offset = dv.getBigUint64(Number(phoff) + i * phentsize + 8, true);
                const vaddr = dv.getBigUint64(Number(phoff) + i * phentsize + 16, true);
                const filesz = dv.getBigUint64(Number(phoff) + i * phentsize + 32, true);
                this.memory.set(elfBytes.subarray(Number(offset), Number(offset + filesz)), Number(vaddr));
            }
        }

        this.setRIP(entry);
        this.setRegister(4, 0x100000n); // Setup stack
    }

    loadUEFI(peBytes) {
        // Minimal UEFI loader logic
        const dv = new DataView(peBytes.buffer, peBytes.byteOffset, peBytes.byteLength);
        if (dv.getUint16(0, false) !== 0x4D5A) throw new Error("Not PE (MZ)");
        const peOffset = dv.getUint32(0x3C, true);
        if (dv.getUint32(peOffset, false) !== 0x50450000) throw new Error("Not PE signature");
        if (dv.getUint16(peOffset + 4, true) !== 0x8664) throw new Error("Not x86_64 PE");

        const entry = dv.getUint32(peOffset + 40, true);
        const imageBase = dv.getBigUint64(peOffset + 48, true);

        // Copy headers and sections
        const sizeOfHeaders = dv.getUint32(peOffset + 84, true);
        this.memory.set(peBytes.subarray(0, sizeOfHeaders), Number(imageBase));

        const numSections = dv.getUint16(peOffset + 6, true);
        let secOffset = peOffset + 264; // assuming PE32+
        for(let i=0; i<numSections; i++) {
            const vaddr = dv.getUint32(secOffset + 12, true);
            const size = dv.getUint32(secOffset + 16, true);
            const ptr = dv.getUint32(secOffset + 20, true);
            if (size > 0 && ptr > 0) {
                this.memory.set(peBytes.subarray(ptr, ptr + size), Number(imageBase) + vaddr);
            }
            secOffset += 40;
        }

        this.setRIP(imageBase + BigInt(entry));
        this.setRegister(4, 0x100000n);
    }

    loadRaw(bytes, addr) {
        this.memory.set(bytes, addr);
        this.setRIP(BigInt(addr));
        this.setRegister(4, 0x100000n);
    }

    inPort(port) {
        if (port === this.COM1_LSR) return 0x60; // TX Ready
        if (port === this.PCI_CONFIG_DATA) {
            // VirtIO-Blk probe
            return 0x10011AF4;
        }
        return 0;
    }

    outPort(port, val) {
        if (port === this.COM1_TX) {
            if (this.termOut) this.termOut(String.fromCharCode(val & 0xFF));
        } else if (port === this.PCI_CONFIG_ADDR) {
            this.pciAddress = val;
        }
    }

    step() {
        let rip = Number(this.getRIP());
        const initialRip = rip;
        const b = this.memory[rip++];

        // Very basic REX prefix handling
        let rex = 0;
        let op = b;
        if (b >= 0x40 && b <= 0x4F) {
            rex = b;
            op = this.memory[rip++];
        }

        const is64 = (rex & 8) !== 0;

        let executedMnemonic = "UNKNOWN";

        // Basic instruction decoding subset for the demo baremetal kernels
        if (op === 0x90) {
            executedMnemonic = "NOP";
        } else if (op === 0xF4) {
            executedMnemonic = "HLT";
            this.running = false;
        } else if (op === 0x0F) {
            const op2 = this.memory[rip++];
            if (op2 === 0x31) { // RDTSC
                executedMnemonic = "RDTSC";
                this.setRegister(0, this.tsc & 0xFFFFFFFFn);
                this.setRegister(2, this.tsc >> 32n);
                this.tsc += 100n;
            } else if (op2 === 0xA2) { // CPUID
                executedMnemonic = "CPUID";
                this.setRegister(0, 0n);
                this.setRegister(3, 0x756E6547n); // Genu
                this.setRegister(2, 0x49656E69n); // ineI
                this.setRegister(1, 0x6C65746En); // ntel
            }
        } else if ((op & 0xF8) === 0xB8) { // MOV reg, imm32/64
            const reg = (op & 7) | ((rex & 1) ? 8 : 0);
            if (is64) {
                const val = this.dataview.getBigUint64(rip, true);
                rip += 8;
                this.setRegister(reg, val);
            } else {
                const val = this.dataview.getUint32(rip, true);
                rip += 4;
                this.setRegister(reg, BigInt(val));
            }
            executedMnemonic = `MOV ${this.getRegisterName(reg)}, imm`;
        } else if (op === 0xE6 || op === 0xE7) { // OUT imm8, AL/AX/EAX
            const port = this.memory[rip++];
            this.outPort(port, Number(this.getRegister(0) & 0xFFn));
            executedMnemonic = `OUT 0x${port.toString(16)}, AL`;
        } else if (op === 0xEE) { // OUT DX, AL
            const port = Number(this.getRegister(2) & 0xFFFFn);
            this.outPort(port, Number(this.getRegister(0) & 0xFFn));
            executedMnemonic = `OUT DX, AL`;
        } else if (op === 0xEC) { // IN AL, DX
            const port = Number(this.getRegister(2) & 0xFFFFn);
            const val = this.inPort(port);
            let rax = this.getRegister(0);
            rax = (rax & 0xFFFFFFFFFFFFFF00n) | BigInt(val & 0xFF);
            this.setRegister(0, rax);
            executedMnemonic = `IN AL, DX`;
        } else if (op === 0xED) { // IN EAX, DX
            const port = Number(this.getRegister(2) & 0xFFFFn);
            const val = this.inPort(port);
            this.setRegister(0, BigInt(val));
            executedMnemonic = `IN EAX, DX`;
        } else if (op === 0xC3) { // RET
            const rsp = Number(this.getRegister(4));
            const retAddr = this.dataview.getBigUint64(rsp, true);
            this.setRegister(4, BigInt(rsp + 8));
            rip = Number(retAddr);
            executedMnemonic = `RET`;
        } else if (op === 0xE8) { // CALL rel32
            const rel32 = this.dataview.getInt32(rip, true);
            rip += 4;
            let rsp = Number(this.getRegister(4)) - 8;
            this.dataview.setBigUint64(rsp, BigInt(rip), true);
            this.setRegister(4, BigInt(rsp));
            rip = rip + rel32;
            executedMnemonic = `CALL rel32`;
        } else {
            // Simplified fallback for rendering and basic mmio
            // In a real full subset we would implement ModRM decode here.
            // For now, if we hit unknown, just skip it to avoid crashing the whole UI loop in the demo.
            executedMnemonic = `UNKNOWN 0x${op.toString(16)}`;
        }

        this.setRIP(BigInt(rip));
        this.instructionsExecuted++;

        return {
            pc: initialRip,
            bytes: [b, op],
            mnemonic: executedMnemonic
        };
    }
}
