/**
 * List of available opcodes.
 */
export const opcodes = {
    NOP: 0x0,
    JNE: 0x1,
    JL: 0x2,
    JM: 0x3,
    JE: 0x4,
    FLAGS: 0x5,
    JUMP: 0x6,
    RB2A: 0x7,
    RA2A: 0x8,
    A2RB: 0x9,
    A2RA: 0xa,
    CALL: 0xb,
    V2RA: 0xc,
    SYSCALL: 0xd,
    V2RB: 0xe,
    EXIT: 0xf,
};

/**
 * Converts an opcode into a string representation.
 *
 * @param {number} opcode
 * @returns
 */
export function opcodeToString(opcode) {
    return Object.keys(opcodes).find((key) => opcodes[key] === opcode);
}
