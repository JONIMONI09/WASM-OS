export function analyzeImage(buf, name) {
    const u = new Uint8Array(buf);
    const a = { name, size: u.length, arch: "i686", format: "raw", type: "raw" };

    a.mbr = u.length >= 512 && u[510] === 0x55 && u[511] === 0xAA;
    a.iso = u.length > 0x8006 && String.fromCharCode(u[0x8001], u[0x8002], u[0x8003], u[0x8004], u[0x8005]) === "CD001";

    // Check for MZ / PE headers
    if (u.length > 512 && u[0] === 0x4D && u[1] === 0x5A) {
        const dv = new DataView(buf);
        const peOffset = dv.getUint32(0x3C, true);
        if (peOffset > 0 && peOffset + 24 < u.length && dv.getUint32(peOffset, false) === 0x50450000) {
            const machine = dv.getUint16(peOffset + 4, true);
            if (machine === 0x8664) {
                a.arch = "x86_64";
                a.format = "PE32+_UEFI";
                return a;
            }
        }
    }

    // Check for ELF headers
    if (u.length > 512 && u[0] === 0x7F && u[1] === 0x45 && u[2] === 0x4C && u[3] === 0x46) {
        const cls = u[4];
        const dv = new DataView(buf);
        const machine = dv.getUint16(18, true);

        if (cls === 2) {
            if (machine === 0x3E) {
                a.arch = "x86_64";
                a.format = "ELF64";
            } else if (machine === 0xF3) {
                a.arch = "riscv64";
                a.format = "ELF64";
            } else if (machine === 0xB7) {
                a.arch = "aarch64";
                a.format = "ELF64";
            }
        } else {
            a.format = "ELF32";
        }
        return a;
    }

    if (a.iso) {
        a.format = "ISO9660";
    } else if (a.mbr) {
        a.format = "MBR";
    }

    return a;
}
