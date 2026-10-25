import { randomBytes, randomInt } from "node:crypto";

// No 0/O, 1/I/L: the code may be read aloud or typed from a screen
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Code of a round's public link (/t/<code>): 8 characters, about 40 bits. */
export function newRoundCode() {
  let code = "";
  for (let i = 0; i < 8; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

/** Secret a guest's browser keeps to change its own orders. */
export function newGuestToken() {
  return randomBytes(24).toString("hex");
}

export function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}
