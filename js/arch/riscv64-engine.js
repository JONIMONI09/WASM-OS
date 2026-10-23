export class RISCV64Engine {
    constructor(memoryBuffer, termOut, termIn, vgaCanvas) {
        this.memory = new Uint8Array(memoryBuffer);
        this.dataview = new DataView(memoryBuffer);
        this.termOut = termOut;
        this.termIn = termIn;
        this.vga = vgaCanvas ? vgaCanvas.getContext('2d') : null;

        this.registers = new BigUint64Array(32);
        this.pc = 0;
        this.instructionsExecuted = 0;
        this.running = false;

        this.UART_BASE = 0x10000000;
        this.FB_BASE = 0x20000000;
    }

    getRegisterName(idx) {
        return "x" + idx;
    }

    getRegister(idx) {
        return this.registers[idx];
    }

    setRegister(idx, val) {
        if (idx !== 0) this.registers[idx] = BigInt(val);
    }

    getRIP() {
        return BigInt(this.pc);
    }

    loadRaw(bytes, addr) {
        this.memory.set(bytes, addr);
        this.pc = addr;
        this.setRegister(2, 0x100000n); // sp
    }

    write8(addr, val) {
        if (addr === this.UART_BASE) {
            if (this.termOut) this.termOut(String.fromCharCode(val));
        } else {
            this.dataview.setUint8(addr, val);
        }
    }

    read8(addr) {
        if (addr === this.UART_BASE + 5) return 0x60; // LSR ready
        return this.dataview.getUint8(addr);
    }

    step() {
        const initialPc = this.pc;
        const inst = this.dataview.getUint32(this.pc, true);
        this.pc += 4;

        const opcode = inst & 0x7F;
        const rd = (inst >> 7) & 0x1F;
        const rs1 = (inst >> 15) & 0x1F;
        const rs2 = (inst >> 20) & 0x1F;
        const funct3 = (inst >> 12) & 0x07;

        let executedMnemonic = "UNKNOWN";

        if (opcode === 0x37) { // LUI
            const imm = (inst & 0xFFFFF000) >> 0;
            this.setRegister(rd, BigInt(imm));
            executedMnemonic = `LUI x${rd}, ${imm}`;
        } else if (opcode === 0x13) { // ADDI etc
            const imm = (inst >> 20); // sign extend in reality
            const val = this.getRegister(rs1) + BigInt(imm);
            this.setRegister(rd, val);
            executedMnemonic = `ADDI x${rd}, x${rs1}, ${imm}`;
        } else if (opcode === 0x23) { // Store
            const imm = ((inst >> 25) << 5) | ((inst >> 7) & 0x1F);
            const addr = Number(this.getRegister(rs1)) + imm;
            if (funct3 === 0) { // SB
                this.write8(addr, Number(this.getRegister(rs2) & 0xFFn));
                executedMnemonic = `SB x${rs2}, ${imm}(x${rs1})`;
            }
        } else if (opcode === 0x73) { // ECALL / EBREAK
            executedMnemonic = "ECALL/EBREAK";
            this.running = false;
        } else {
            executedMnemonic = `UNKNOWN 0x${opcode.toString(16)}`;
        }

        this.instructionsExecuted++;

        return {
            pc: initialPc,
            bytes: [inst & 0xFF, (inst >> 8) & 0xFF, (inst >> 16) & 0xFF, (inst >> 24) & 0xFF],
            mnemonic: executedMnemonic
        };
    }
}
