/**
 * HL7 v2 escape sequence decode/encode (handover doc §5 FR5).
 *
 * Escape sequences let field content contain a literal delimiter character
 * (which would otherwise be ambiguous with the message's own structure) or
 * a non-ASCII character. Every escape sequence is delimited by the
 * message's own escape character (MSH-2, conventionally `\`) on both sides,
 * e.g. `\F\` for a literal field separator.
 *
 * Supported per spec:
 *   \F\  literal field separator
 *   \S\  literal component separator
 *   \T\  literal subcomponent separator
 *   \R\  literal repetition separator
 *   \E\  literal escape character
 *   \Xdd[dd...]\  hex escape — each `dd` is a two-digit hex byte value
 *   \Uhhhh\       Unicode escape — a four-digit hex code point (this
 *                 implementation's convention for "Unicode escapes" per
 *                 the handover doc; not the official HL7 `\Zdddd\`
 *                 MSH-18-dependent mechanism, which requires knowing the
 *                 message's declared character set to interpret)
 *
 * Decoding happens once, at parse time, so the rest of the model always
 * holds plain decoded strings (see tokenizer.ts). Encoding happens at
 * serialize time to turn those decoded strings back into wire format.
 */
import type { EncodingCharacters } from "./types.js";

const SIMPLE_ESCAPE_CODES = new Set(["F", "S", "T", "R", "E", "H", "N"]);

function decodeEscapeCode(code: string, enc: EncodingCharacters): string {
  switch (code) {
    case "F":
      return enc.field;
    case "S":
      return enc.component;
    case "T":
      return enc.subcomponent;
    case "R":
      return enc.repetition;
    case "E":
      return enc.escape;
    case "H":
    case "N":
      // Highlighting on/off markers (\H\ ... \N\) carry no literal
      // character of their own; drop them rather than invent formatting.
      return "";
    default:
      break;
  }

  if (code.startsWith("X")) {
    const hex = code.slice(1);
    if (hex.length > 0 && hex.length % 2 === 0 && /^[0-9A-Fa-f]+$/.test(hex)) {
      let out = "";
      for (let i = 0; i < hex.length; i += 2) {
        out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
      }
      return out;
    }
  }

  if (code.startsWith("U")) {
    const hex = code.slice(1);
    if (/^[0-9A-Fa-f]{4}$/.test(hex)) {
      return String.fromCodePoint(parseInt(hex, 16));
    }
  }

  // Unrecognized escape sequence — preserve it literally rather than
  // silently dropping data the parser doesn't understand.
  return `${enc.escape}${code}${enc.escape}`;
}

/** Decodes every escape sequence in `value` using this message's own encoding characters. */
export function decodeEscapes(value: string, enc: EncodingCharacters): string {
  if (!value.includes(enc.escape)) return value;

  let out = "";
  let i = 0;
  while (i < value.length) {
    const ch = value[i];
    if (ch !== enc.escape) {
      out += ch;
      i += 1;
      continue;
    }
    const closeIndex = value.indexOf(enc.escape, i + 1);
    if (closeIndex === -1) {
      // Unterminated escape — treat the lone escape char as literal.
      out += ch;
      i += 1;
      continue;
    }
    const code = value.slice(i + 1, closeIndex);
    out += decodeEscapeCode(code, enc);
    i = closeIndex + 1;
  }
  return out;
}

/** Encodes any character in `value` that would collide with a delimiter back into an escape sequence. */
export function encodeEscapes(value: string, enc: EncodingCharacters): string {
  const literalToCode: Array<[string, string]> = [
    [enc.escape, "E"], // must be checked first — the escape char itself
    [enc.field, "F"],
    [enc.component, "S"],
    [enc.subcomponent, "T"],
    [enc.repetition, "R"],
  ];

  let out = "";
  for (const ch of value) {
    const hit = literalToCode.find(([literal]) => literal === ch);
    if (hit) {
      out += `${enc.escape}${hit[1]}${enc.escape}`;
      continue;
    }
    const codePoint = ch.codePointAt(0) ?? 0;
    if (codePoint < 0x20 || codePoint > 0x7e) {
      out += `${enc.escape}U${codePoint.toString(16).toUpperCase().padStart(4, "0")}${enc.escape}`;
      continue;
    }
    out += ch;
  }
  return out;
}

// Exported for tests that want to assert every supported escape code is
// recognized without duplicating the list.
export const SUPPORTED_SIMPLE_ESCAPE_CODES = SIMPLE_ESCAPE_CODES;
