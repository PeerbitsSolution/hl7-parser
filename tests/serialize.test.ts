import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMessage } from "../src/tokenizer";
import { serialize } from "../src/serialize";

/** Insignificant-whitespace normalization: trims each segment line and drops blank lines. */
function normalize(hl7: string): string {
  return hl7
    .split(/\r\n|\r|\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .join("\r");
}

const fixtures = [
  ["ADT^A01", "../fixtures/valid/adt-a01-admit.hl7"],
  ["ORU^R01", "../fixtures/valid/oru-r01-multi-result.hl7"],
  ["ORM^O01", "../fixtures/valid/orm-o01-order.hl7"],
] as const;

describe("hl7-parser: serializer round-trip", () => {
  it.each(fixtures)("parse -> serialize reproduces the original %s fixture (modulo whitespace)", (_label, path) => {
    const raw = readFileSync(new URL(path, import.meta.url), "utf8");
    const parsed = parseMessage(raw);
    const serialized = serialize(parsed);
    expect(normalize(serialized)).toBe(normalize(raw));
  });

  it("re-encodes escape sequences on serialize (decode -> encode round-trip)", () => {
    const raw =
      "MSH|^~\\&|SEND|FAC|RECV|RECVFAC|20260110080000||ADT^A01^ADT_A01|CTRL|P|2.5.1\r" +
      "EVN|A01|20260110080000\r" +
      "PID|1||MRN-TEST-1||TEST^PATIENT^A^\\S\\ literal component char\\S\\ in a note";
    const parsed = parseMessage(raw);
    const serialized = serialize(parsed);
    // Decoding the re-serialized output must reproduce the original decoded value.
    const reparsed = parseMessage(serialized);
    const originalNote = parsed.segments[2]!.fields[4]![0]![3]![0]; // PID-5 component 4
    const roundTrippedNote = reparsed.segments[2]!.fields[4]![0]![3]![0];
    expect(roundTrippedNote).toBe(originalNote);
    expect(originalNote).toContain("^"); // confirms the escape was actually decoded to a literal ^
  });
});
