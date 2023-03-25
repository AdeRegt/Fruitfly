/**
 * Converts a number to a four-digit hexadecimal string with 'x' prefix.
 *
 * @param {number} value
 * @param {number} padLength
 * @returns
 */
export function toHexString(value, padLength) {
    var hex = value.toString(16).toUpperCase();
    padLength = padLength || 4;
    if (hex.length < padLength) {
        hex = Array(padLength - hex.length + 1).join("0") + hex;
    }

    return "x" + hex;
}
