import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMessage } from "../src/tokenizer";
import { readMsh } from "../src/segments/msh";
import { readPid } from "../src/segments/pid";
import { readPv1 } from "../src/segments/pv1";
import { readOrc } from "../src/segments/orc";
import { readAllObr } from "../src/segments/obr";
import { readAllObx } from "../src/segments/obx";
import { readAllNk1 } from "../src/segments/nk1";
import { readAllIn1 } from "../src/segments/in1";

const adtRaw = readFileSync(new URL("../fixtures/valid/adt-a01-admit.hl7", import.meta.url), "utf8");
const oruRaw = readFileSync(new URL("../fixtures/valid/oru-r01-multi-result.hl7", import.meta.url), "utf8");
const ormRaw = readFileSync(new URL("../fixtures/valid/orm-o01-order.hl7", import.meta.url), "utf8");

describe("hl7-parser: typed segments", () => {
  const adt = parseMessage(adtRaw);
  const oru = parseMessage(oruRaw);
  const orm = parseMessage(ormRaw);

  it("MSH — extracts header fields", () => {
    const msh = readMsh(adt);
    expect(msh?.sendingApplication).toBe("TEST SENDING APP");
    expect(msh?.sendingFacility).toBe("TEST SENDING FACILITY");
    expect(msh?.messageCode).toBe("ADT");
    expect(msh?.triggerEvent).toBe("A01");
    expect(msh?.messageStructure).toBe("ADT_A01");
    expect(msh?.messageControlId).toBe("TESTCTRLID00001");
    expect(msh?.processingId).toBe("P");
    expect(msh?.versionId).toBe("2.5.1");
  });

  it("PID — extracts patient demographics", () => {
    const pid = readPid(adt);
    expect(pid?.patientId).toBe("MRN-TEST-00123");
    expect(pid?.familyName).toBe("TEST");
    expect(pid?.givenName).toBe("PATIENT");
    expect(pid?.dateOfBirth).toBe("19800101");
    expect(pid?.sex).toBe("M");
    expect(pid?.addressCity).toBe("TESTVILLE");
    expect(pid?.patientAccountNumber).toBe("ACCT-TEST-00123");
    expect(pid?.ssnNumber).toBe("999-99-9999");
  });

  it("PV1 — extracts visit/encounter fields", () => {
    const pv1 = readPv1(adt);
    expect(pv1?.patientClass).toBe("I");
    expect(pv1?.pointOfCare).toBe("TESTWARD");
    expect(pv1?.room).toBe("101");
    expect(pv1?.hospitalService).toBe("SUR");
    expect(pv1?.visitNumber).toBe("VN-TEST-00123");
  });

  it("NK1 — extracts next-of-kin fields", () => {
    const [nk1] = readAllNk1(adt);
    expect(nk1?.familyName).toBe("TEST");
    expect(nk1?.givenName).toBe("NEXTOFKIN");
    expect(nk1?.relationship).toBe("SPO");
  });

  it("IN1 — extracts insurance fields", () => {
    const [in1] = readAllIn1(adt);
    expect(in1?.insuranceCompanyId).toBe("COMP-TEST-01");
    expect(in1?.insuranceCompanyName).toBe("TEST INSURANCE COMPANY");
    expect(in1?.groupNumber).toBe("GRP-TEST-01");
    expect(in1?.policyNumber).toBe("POLICY-TEST-00123");
  });

  it("OBR — extracts observation request fields", () => {
    const [obr] = readAllObr(oru);
    expect(obr?.placerOrderNumber).toBe("PLACER-TEST-01");
    expect(obr?.fillerOrderNumber).toBe("FILLER-TEST-01");
    expect(obr?.universalServiceCode).toBe("CBC");
    expect(obr?.universalServiceText).toBe("COMPLETE BLOOD COUNT");
    expect(obr?.resultStatus).toBe("F");
  });

  it("OBX — extracts observation/result fields", () => {
    const obxList = readAllObx(oru);
    const wbc = obxList[0];
    expect(wbc?.valueType).toBe("NM");
    expect(wbc?.observationCode).toBe("WBC");
    expect(wbc?.observationValue).toBe("6.8");
    expect(wbc?.units).toBe("10*3/uL");
    expect(wbc?.abnormalFlags).toBe("N");
    expect(wbc?.observationResultStatus).toBe("F");
  });

  it("ORC — extracts order control fields", () => {
    const orc = readOrc(orm);
    expect(orc?.orderControl).toBe("NW");
    expect(orc?.placerOrderNumber).toBe("PLACER-TEST-03");
    expect(orc?.fillerOrderNumber).toBe("FILLER-TEST-03");
    expect(orc?.orderStatus).toBe("SC");
  });
});
