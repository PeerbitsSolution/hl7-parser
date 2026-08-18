import { describe, expect, it } from "vitest";
import { parseMessage } from "../src/tokenizer";
import { decodeEscapes, encodeEscapes } from "../src/escape";
import { Hl7ParseError, DEFAULT_ENCODING_CHARACTERS, type EncodingCharacters } from "../src/types";

describe("hl7-parser: tokenizer — default encoding characters", () => {
  const message =
    "MSH|^~\\&|TEST APP|TEST FACILITY|TEST RECV APP|TEST RECV FACILITY|20260110080000||ADT^A01^ADT_A01|CTRL001|P|2.5.1\r" +
    "EVN|A01|20260110080000\r" +
    "PID|1||MRN-TEST-1^^^TEST FACILITY^MR~MRN-TEST-2^^^TEST FACILITY 2^MR||TEST^PATIENT^A";

  it("reads MSH-1 (field separator) and MSH-2 (encoding characters) from the message", () => {
    const parsed = parseMessage(message);
    expect(parsed.encodingCharacters).toEqual(DEFAULT_ENCODING_CHARACTERS);
  });

  it("splits the message into segments on the segment terminator", () => {
    const parsed = parseMessage(message);
    expect(parsed.segments.map((s) => s.name)).toEqual(["MSH", "EVN", "PID"]);
  });

  it("splits a repeating field (PID-3) into distinct repetitions", () => {
    const parsed = parseMessage(message);
    const pid = parsed.segments.find((s) => s.name === "PID")!;
    const idField = pid.fields[2]; // PID-3
    expect(idField).toHaveLength(2);
    expect(idField![0]![0]![0]).toBe("MRN-TEST-1");
    expect(idField![1]![0]![0]).toBe("MRN-TEST-2");
  });

  it("splits a composite field (PID-5) into distinct components", () => {
    const parsed = parseMessage(message);
    const pid = parsed.segments.find((s) => s.name === "PID")!;
    const nameField = pid.fields[4]; // PID-5
    expect(nameField![0]!.map((c) => c[0])).toEqual(["TEST", "PATIENT", "A"]);
  });

  it("accepts \\r\\n and bare \\n segment terminators in addition to \\r", () => {
    const crlf = message.replace(/\r/g, "\r\n");
    const lf = message.replace(/\r/g, "\n");
    expect(parseMessage(crlf).segments).toHaveLength(3);
    expect(parseMessage(lf).segments).toHaveLength(3);
  });
});

describe("hl7-parser: tokenizer — non-default encoding characters", () => {
  // field=#, component=@, repetition=$, escape=!, subcomponent=*
  const message =
    "MSH#@$!*#SEND APP#SEND FAC#RECV APP#RECV FAC#20260110080000##ADT@A01@ADT_A01#CTRL002#P#2.5.1\r" +
    "PID#1##MRNTEST1@@@FAC@MR$MRNTEST2@@@FAC2@MR2#FAMILY*SUF@GIVEN";

  it("determines the field separator and all four encoding characters from this specific message", () => {
    const parsed = parseMessage(message);
    const expected: EncodingCharacters = {
      field: "#",
      component: "@",
      repetition: "$",
      escape: "!",
      subcomponent: "*",
    };
    expect(parsed.encodingCharacters).toEqual(expected);
  });

  it("splits fields, repetitions, components, and subcomponents using the declared characters", () => {
    const parsed = parseMessage(message);
    const pid = parsed.segments.find((s) => s.name === "PID")!;

    const idField = pid.fields[2]; // PID-3, repeated with $
    expect(idField).toHaveLength(2);
    expect(idField![0]![0]![0]).toBe("MRNTEST1");
    expect(idField![0]![3]![0]).toBe("FAC");
    expect(idField![1]![0]![0]).toBe("MRNTEST2");

    const nameField = pid.fields[3]; // PID-4 in this shortened fixture, components with @, subcomponents with *
    expect(nameField![0]![0]).toEqual(["FAMILY", "SUF"]); // subcomponents of component 1
    expect(nameField![0]![1]).toEqual(["GIVEN"]);
  });

  it("still identifies MSH-9 correctly using the message's own component separator", () => {
    const parsed = parseMessage(message);
    const msh = parsed.segments[0]!;
    // MSH-9 is field index 8 (0-based) counting MSH-1 and MSH-2 as fields 0 and 1
    const messageType = msh.fields[8];
    expect(messageType![0]!.map((c) => c[0])).toEqual(["ADT", "A01", "ADT_A01"]);
  });
});

describe("hl7-parser: tokenizer — malformed input", () => {
  it("throws Hl7ParseError when the message does not begin with MSH", () => {
    expect(() => parseMessage("PID|1||MRN-TEST-1")).toThrow(Hl7ParseError);
  });

  it("throws Hl7ParseError when MSH-2 is not exactly 4 characters", () => {
    const malformed = "MSH|^~\\|SEND|FAC|RECV|RECVFAC|20260110080000||ADT^A01|CTRL|P|2.5.1";
    expect(() => parseMessage(malformed)).toThrow(Hl7ParseError);
  });

  it("throws Hl7ParseError when the field separator and encoding characters are not all distinct", () => {
    const malformed = "MSH|^^\\&|SEND|FAC|RECV|RECVFAC|20260110080000||ADT^A01|CTRL|P|2.5.1";
    expect(() => parseMessage(malformed)).toThrow(Hl7ParseError);
  });

  it("throws Hl7ParseError for an empty message", () => {
    expect(() => parseMessage("")).toThrow(Hl7ParseError);
  });
});

describe("hl7-parser: escape sequences", () => {
  const enc = DEFAULT_ENCODING_CHARACTERS;

  it.each([
    ["\\F\\", "|"],
    ["\\S\\", "^"],
    ["\\T\\", "&"],
    ["\\R\\", "~"],
    ["\\E\\", "\\"],
  ])("decodes %s to the literal delimiter character", (escaped, literal) => {
    expect(decodeEscapes(escaped, enc)).toBe(literal);
  });

  it("decodes a hex escape (\\Xdd\\) to the corresponding byte value", () => {
    expect(decodeEscapes("\\X41\\", enc)).toBe("A");
    expect(decodeEscapes("\\X0D\\", enc)).toBe("\r");
  });

  it("decodes a Unicode escape (\\Uhhhh\\) to the corresponding code point", () => {
    expect(decodeEscapes("\\U00E9\\", enc)).toBe("é");
  });

  it.each(["|", "^", "~", "\\", "&"])(
    "round-trips a field value containing the literal delimiter character %s",
    (delimiterChar) => {
      const original = `before${delimiterChar}after`;
      const encoded = encodeEscapes(original, enc);
      expect(decodeEscapes(encoded, enc)).toBe(original);
    },
  );

  it("round-trips a non-ASCII character via the Unicode escape", () => {
    const original = "Café";
    const encoded = encodeEscapes(original, enc);
    expect(decodeEscapes(encoded, enc)).toBe(original);
  });

  it("preserves an unrecognized escape code literally instead of dropping data", () => {
    expect(decodeEscapes("\\Z999\\", enc)).toBe("\\Z999\\");
  });
});
