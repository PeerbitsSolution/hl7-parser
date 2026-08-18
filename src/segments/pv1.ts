/**
 * PV1 — Patient Visit (HL7 v2.5.1 §3.4.3).
 */
import { getComponent, getField, getRepetition, getSegment, type Message, type Segment } from "../types.js";

export interface Pv1 {
  /** PV1-1 — Set ID. */
  setId: string | undefined;
  /** PV1-2 — Patient Class, e.g. "I" (inpatient), "O" (outpatient), "E" (emergency). */
  patientClass: string | undefined;
  /** PV1-3 — Assigned Patient Location (PL), full value, e.g. "2W^204^A". */
  assignedPatientLocation: string | undefined;
  /** PV1-3.1 — Point of Care (nursing unit/ward). */
  pointOfCare: string | undefined;
  /** PV1-3.2 — Room. */
  room: string | undefined;
  /** PV1-3.3 — Bed. */
  bed: string | undefined;
  /** PV1-4 — Admission Type. */
  admissionType: string | undefined;
  /** PV1-7 — Attending Doctor (XCN), full value. */
  attendingDoctor: string | undefined;
  /** PV1-8 — Referring Doctor (XCN), full value. */
  referringDoctor: string | undefined;
  /** PV1-10 — Hospital Service. */
  hospitalService: string | undefined;
  /** PV1-19.1 — Visit Number (CX.1). */
  visitNumber: string | undefined;
  /** PV1-44 — Admit Date/Time (TS). */
  admitDateTime: string | undefined;
  /** PV1-45 — Discharge Date/Time (TS). */
  dischargeDateTime: string | undefined;
}

export function readPv1Segment(segment: Segment, message: Message): Pv1 {
  const locationField = getField(segment, 3);
  return {
    setId: getComponent(message, getField(segment, 1)),
    patientClass: getComponent(message, getField(segment, 2)),
    assignedPatientLocation: getRepetition(message, locationField),
    pointOfCare: getComponent(message, locationField, 1),
    room: getComponent(message, locationField, 2),
    bed: getComponent(message, locationField, 3),
    admissionType: getComponent(message, getField(segment, 4)),
    attendingDoctor: getRepetition(message, getField(segment, 7)),
    referringDoctor: getRepetition(message, getField(segment, 8)),
    hospitalService: getComponent(message, getField(segment, 10)),
    visitNumber: getComponent(message, getField(segment, 19)),
    admitDateTime: getComponent(message, getField(segment, 44)),
    dischargeDateTime: getComponent(message, getField(segment, 45)),
  };
}

/** Finds and reads the message's PV1 segment, if present. */
export function readPv1(message: Message): Pv1 | undefined {
  const segment = getSegment(message, "PV1");
  return segment ? readPv1Segment(segment, message) : undefined;
}
