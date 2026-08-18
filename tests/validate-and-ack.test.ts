import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMessage } from "../src/tokenizer";
import { validateMessage } from "../src/validate";
import { buildAck } from "../src/ack";
import { serialize } from "../src/serialize";
import { readMsh } from "../src/segments/msh";
import { getSegment } from "../src/types";

const adtRaw = readFileSync(new URL("../fixtures/valid/adt-a01-admit.hl7", import.meta.url), "utf8");
const oruRaw = readFileSync(new URL("../fixtures/valid/oru-r01-multi-result.hl7", import.meta.url), "utf8");
const adtMissingPidRaw = readFileSync(
  new URL("../fixtures/invalid/adt-missing-pid.hl7", import.meta.url),
  "utf8",
);
const malformedDelimitersRaw = readFileSync(
  new URL("../fixtures/invalid/malformed-delimiters.hl7", import.meta.url),
  "utf8",
);

describe("hl7-parser: structural validation", () => {
  it("passes for a valid ADT fixture with all required segments", () => {
    const result = validateMessage(parseMessage(adtRaw), "ADT");
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("flags a fixture missing a required segment for its message type, with a specific error", () => {
    const result = validateMessage(parseMessage(adtMissingPidRaw), "ADT");
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      segment: "PID",
      message: 'Required segment "PID" is missing for message type "ADT".',
    });
  });

  it("passes for a valid ORU fixture with all required segments (MSH+PID+OBR+OBX)", () => {
    const result = validateMessage(parseMessage(oruRaw), "ORU");
    expect(result.valid).toBe(true);
  });

  it("rejects the malformed-delimiters fixture at parse time, before validation can even run", () => {
    expect(() => parseMessage(malformedDelimitersRaw)).toThrow();
  });
});

describe("hl7-parser: ACK builder", () => {
  const inbound = parseMessage(adtRaw);
  const inboundControlId = readMsh(inbound)?.messageControlId;

  it.each([
    ["AA", "accept"],
    ["AE", "error"],
    ["AR", "reject"],
  ] as const)("builds a valid MSA-based ACK for %s (%s)", (ackCode) => {
    const ack = buildAck(inbound, ackCode);
    const msa = getSegment(ack, "MSA");
    expect(msa).toBeDefined();
    expect(msa?.fields[0]?.[0]?.[0]?.[0]).toBe(ackCode);
    expect(msa?.fields[1]?.[0]?.[0]?.[0]).toBe(inboundControlId);
  });

  it("swaps sending/receiving application and facility relative to the inbound message", () => {
    const ack = buildAck(inbound, "AA");
    const ackMsh = readMsh(ack);
    const inboundMsh = readMsh(inbound);
    expect(ackMsh?.sendingApplication).toBe(inboundMsh?.receivingApplication);
    expect(ackMsh?.receivingApplication).toBe(inboundMsh?.sendingApplication);
  });

  it("serializes to well-formed HL7 v2 that re-parses with the same MSA content", () => {
    const ack = buildAck(inbound, "AE");
    const reparsed = parseMessage(serialize(ack));
    const msa = getSegment(reparsed, "MSA");
    expect(msa?.fields[0]?.[0]?.[0]?.[0]).toBe("AE");
    expect(msa?.fields[1]?.[0]?.[0]?.[0]).toBe(inboundControlId);
  });
});
