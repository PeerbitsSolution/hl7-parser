import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMessage } from "../src/tokenizer";
import { parseAdt } from "../src/message-types/adt";
import { parseOru } from "../src/message-types/oru";
import { parseOrm } from "../src/message-types/orm";

const adtRaw = readFileSync(new URL("../fixtures/valid/adt-a01-admit.hl7", import.meta.url), "utf8");
const oruRaw = readFileSync(new URL("../fixtures/valid/oru-r01-multi-result.hl7", import.meta.url), "utf8");
const ormRaw = readFileSync(new URL("../fixtures/valid/orm-o01-order.hl7", import.meta.url), "utf8");
const adtMissingPidRaw = readFileSync(
  new URL("../fixtures/invalid/adt-missing-pid.hl7", import.meta.url),
  "utf8",
);

describe("hl7-parser: ADT message-type parsing", () => {
  it("correctly identifies the trigger event", () => {
    const adt = parseAdt(parseMessage(adtRaw));
    expect(adt.triggerEvent).toBe("A01");
  });

  it("confirms the required structure (MSH+EVN+PID) is present for a valid fixture", () => {
    const adt = parseAdt(parseMessage(adtRaw));
    expect(adt.structurallyValid).toBe(true);
    expect(adt.missingSegments).toEqual([]);
  });

  it("flags the required structure as invalid when PID is missing", () => {
    const adt = parseAdt(parseMessage(adtMissingPidRaw));
    expect(adt.structurallyValid).toBe(false);
    expect(adt.missingSegments).toContain("PID");
  });
});

describe("hl7-parser: ORU message-type parsing", () => {
  it("groups repeating OBR/OBX sets without flattening them", () => {
    const oru = parseOru(parseMessage(oruRaw));
    expect(oru.resultGroups).toHaveLength(2);
    expect(oru.resultGroups[0]?.results).toHaveLength(2);
    expect(oru.resultGroups[1]?.results).toHaveLength(3);
  });

  it("associates each OBX with the correct OBR (not the wrong group)", () => {
    const oru = parseOru(parseMessage(oruRaw));
    expect(oru.resultGroups[0]?.obr.universalServiceCode).toBe("CBC");
    expect(oru.resultGroups[0]?.results.map((r) => r.observationCode)).toEqual(["WBC", "HGB"]);

    expect(oru.resultGroups[1]?.obr.universalServiceCode).toBe("BMP");
    expect(oru.resultGroups[1]?.results.map((r) => r.observationCode)).toEqual(["NA", "K", "GLU"]);
  });

  it("confirms the required structure (MSH+PID+OBR+OBX) is present", () => {
    const oru = parseOru(parseMessage(oruRaw));
    expect(oru.structurallyValid).toBe(true);
  });
});

describe("hl7-parser: ORM message-type parsing", () => {
  it("correctly associates each ORC with its related OBR", () => {
    const orm = parseOrm(parseMessage(ormRaw));
    expect(orm.orderGroups).toHaveLength(2);

    expect(orm.orderGroups[0]?.orc.placerOrderNumber).toBe("PLACER-TEST-03");
    expect(orm.orderGroups[0]?.obr?.placerOrderNumber).toBe("PLACER-TEST-03");
    expect(orm.orderGroups[0]?.obr?.universalServiceCode).toBe("CXR");

    expect(orm.orderGroups[1]?.orc.placerOrderNumber).toBe("PLACER-TEST-04");
    expect(orm.orderGroups[1]?.obr?.universalServiceCode).toBe("ECG");
  });

  it("confirms the required structure (MSH+PID+ORC+OBR) is present", () => {
    const orm = parseOrm(parseMessage(ormRaw));
    expect(orm.structurallyValid).toBe(true);
  });
});
