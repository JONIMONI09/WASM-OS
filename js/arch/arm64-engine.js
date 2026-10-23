export class ARM64Engine {
    constructor(memoryBuffer, termOut, termIn, vgaCanvas) {
        this.memory = new Uint8Array(memoryBuffer);
        this.dataview = new DataView(memoryBuffer);
        this.termOut = termOut;
        this.termIn = termIn;
        this.vga = vgaCanvas ? vgaCanvas.getContext('2d') : null;

        this.registers = new BigUint64Array(31); // X0-X30
        this.sp = 0n;
        this.pc = 0;
        this.nzcv = 0;

        this.instructionsExecuted = 0;
        this.running = false;

        this.UART_BASE = 0x09000000;
        this.FB_BASE = 0x20000000;
    }

    getRegisterName(idx) {
        if (idx === 31) return "SP";
        if (idx === 32) return "PC";
        return "X" + idx;
    }

    getRegister(idx) {
        if (idx === 31) return this.sp;
        if (idx === 32) return BigInt(this.pc);
        return this.registers[idx];
    }

    setRegister(idx, val) {
        if (idx === 31) this.sp = BigInt(val);
        else if (idx === 32) this.pc = Number(val);
        else this.registers[idx] = BigInt(val);
    }

    getRIP() {
        return BigInt(this.pc);
    }

    loadRaw(bytes, addr) {
        this.memory.set(bytes, addr);
        this.pc = addr;
        this.sp = 0x100000n;
    }

    write8(addr, val) {
        if (addr === this.UART_BASE) {
            if (this.termOut) this.termOut(String.fromCharCode(val));
        } else {
            this.dataview.setUint8(addr, val);
        }
    }

    step() {
        const initialPc = this.pc;
        const inst = this.dataview.getUint32(this.pc, true);
        this.pc += 4;

        let executedMnemonic = "UNKNOWN";

        // Very basic decoding subset for the ARM64 demo kernel
        if ((inst & 0x7F800000) === 0x52800000) { // MOVZ Wd, #imm
            const rd = inst & 0x1F;
            const imm16 = (inst >> 5) & 0xFFFF;
            this.setRegister(rd, BigInt(imm16));
            executedMnemonic = `MOVZ X${rd}, #${imm16}`;
        } else if ((inst & 0xFFC00000) === 0x39000000) { // STRB Wt, [Xn, #uimm12]
            const rd = inst & 0x1F;
            const rn = (inst >> 5) & 0x1F;
            const imm12 = (inst >> 10) & 0xFFF;
            const addr = Number(this.getRegister(rn)) + imm12;
            this.write8(addr, Number(this.getRegister(rd) & 0xFFn));
            executedMnemonic = `STRB W${rd}, [X${rn}, #${imm12}]`;
        } else if (inst === 0xD4000001) { // SVC 0
            executedMnemonic = "SVC 0";
            this.running = false;
        } else {
            executedMnemonic = `UNKNOWN 0x${inst.toString(16)}`;
        }

        this.instructionsExecuted++;

        return {
            pc: initialPc,
            bytes: [inst & 0xFF, (inst >> 8) & 0xFF, (inst >> 16) & 0xFF, (inst >> 24) & 0xFF],
            mnemonic: executedMnemonic
        };
    }
}
