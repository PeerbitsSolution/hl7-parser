/**
 * NK1 — Next of Kin / Associated Parties (HL7 v2.5.1 §3.4.10).
 */
import { getComponent, getField, getRepetition, getSegments, type Message, type Segment } from "../types.js";

export interface Nk1 {
  /** NK1-1 — Set ID. */
  setId: string | undefined;
  /** NK1-2 — Name (XPN), full value. */
  name: string | undefined;
  /** NK1-2.1 — Family name. */
  familyName: string | undefined;
  /** NK1-2.2 — Given name. */
  givenName: string | undefined;
  /** NK1-3 — Relationship (CE), full value. */
  relationship: string | undefined;
  /** NK1-4 — Address (XAD), full value. */
  address: string | undefined;
  /** NK1-5 — Phone Number (XTN), full value. */
  phoneNumber: string | undefined;
}

export function readNk1Segment(segment: Segment, message: Message): Nk1 {
  const nameField = getField(segment, 2);
  return {
    setId: getComponent(message, getField(segment, 1)),
    name: getRepetition(message, nameField),
    familyName: getComponent(message, nameField, 1),
    givenName: getComponent(message, nameField, 2),
    relationship: getRepetition(message, getField(segment, 3)),
    address: getRepetition(message, getField(segment, 4)),
    phoneNumber: getRepetition(message, getField(segment, 5)),
  };
}

/** Finds and reads every NK1 segment in the message, in order. A patient may have several next-of-kin entries. */
export function readAllNk1(message: Message): Nk1[] {
  return getSegments(message, "NK1").map((segment) => readNk1Segment(segment, message));
}
