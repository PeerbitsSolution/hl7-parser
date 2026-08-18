/**
 * OBX — Observation/Result (HL7 v2.5.1 §7.4.2).
 */
import {
  getComponent,
  getField,
  getRepetition,
  getSegments,
  type Message,
  type Segment,
} from "../types.js";

export interface Obx {
  /** OBX-1 — Set ID. */
  setId: string | undefined;
  /** OBX-2 — Value Type, e.g. "NM" (numeric), "ST" (string), "CE" (coded entry). */
  valueType: string | undefined;
  /** OBX-3 — Observation Identifier (CE), full value. */
  observationIdentifier: string | undefined;
  /** OBX-3.1 — Observation Identifier code. */
  observationCode: string | undefined;
  /** OBX-3.2 — Observation Identifier text. */
  observationText: string | undefined;
  /** OBX-5 — Observation Value, full value (shape depends on OBX-2). */
  observationValue: string | undefined;
  /** OBX-6 — Units (CE), full value. */
  units: string | undefined;
  /** OBX-7 — References Range. */
  referenceRange: string | undefined;
  /** OBX-8 — Abnormal Flags. */
  abnormalFlags: string | undefined;
  /** OBX-11 — Observation Result Status, e.g. "F" (final), "P" (preliminary), "C" (corrected). */
  observationResultStatus: string | undefined;
  /** OBX-14 — Date/Time of the Observation (TS). */
  dateTimeOfObservation: string | undefined;
}

export function readObxSegment(segment: Segment, message: Message): Obx {
  const observationIdField = getField(segment, 3);
  return {
    setId: getComponent(message, getField(segment, 1)),
    valueType: getComponent(message, getField(segment, 2)),
    observationIdentifier: getRepetition(message, observationIdField),
    observationCode: getComponent(message, observationIdField, 1),
    observationText: getComponent(message, observationIdField, 2),
    observationValue: getRepetition(message, getField(segment, 5)),
    units: getRepetition(message, getField(segment, 6)),
    referenceRange: getComponent(message, getField(segment, 7)),
    abnormalFlags: getComponent(message, getField(segment, 8)),
    observationResultStatus: getComponent(message, getField(segment, 11)),
    dateTimeOfObservation: getComponent(message, getField(segment, 14)),
  };
}

/** Finds and reads every OBX segment in the message, in order. An OBR typically has several. */
export function readAllObx(message: Message): Obx[] {
  return getSegments(message, "OBX").map((segment) => readObxSegment(segment, message));
}
