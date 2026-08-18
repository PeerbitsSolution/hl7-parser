/**
 * IN1 — Insurance (HL7 v2.5.1 §6.5.1).
 */
import { getComponent, getField, getRepetition, getSegments, type Message, type Segment } from "../types.js";

export interface In1 {
  /** IN1-1 — Set ID. */
  setId: string | undefined;
  /** IN1-2 — Insurance Plan ID (CE), full value. */
  insurancePlanId: string | undefined;
  /** IN1-3.1 — Insurance Company ID (first repetition, CX.1). */
  insuranceCompanyId: string | undefined;
  /** IN1-4 — Insurance Company Name (XON), full value. */
  insuranceCompanyName: string | undefined;
  /** IN1-8 — Group Number. */
  groupNumber: string | undefined;
  /** IN1-36 — Policy Number. */
  policyNumber: string | undefined;
}

export function readIn1Segment(segment: Segment, message: Message): In1 {
  return {
    setId: getComponent(message, getField(segment, 1)),
    insurancePlanId: getRepetition(message, getField(segment, 2)),
    insuranceCompanyId: getComponent(message, getField(segment, 3), 1),
    insuranceCompanyName: getRepetition(message, getField(segment, 4)),
    groupNumber: getComponent(message, getField(segment, 8)),
    policyNumber: getComponent(message, getField(segment, 36)),
  };
}

/** Finds and reads every IN1 segment in the message, in order. A patient may have multiple insurance entries (primary/secondary). */
export function readAllIn1(message: Message): In1[] {
  return getSegments(message, "IN1").map((segment) => readIn1Segment(segment, message));
}
