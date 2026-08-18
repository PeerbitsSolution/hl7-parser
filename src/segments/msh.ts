/**
 * MSH — Message Header (HL7 v2.5.1 §2.15.9).
 *
 * Field positions below are grounded in the HL7 v2.5.1 standard's MSH
 * segment definition. MSH-1/MSH-2 are the delimiter characters themselves
 * (handled by the tokenizer, not re-derived here).
 */
import { getComponent, getField, getRepetition, getSegment, type Message, type Segment } from "../types.js";

export interface Msh {
  /** MSH-1 — the field separator character used by this message. */
  fieldSeparator: string;
  /** MSH-2 — the four encoding characters (component/repetition/escape/subcomponent), raw. */
  encodingCharacters: string;
  /** MSH-3 — Sending Application (HD.1). */
  sendingApplication: string | undefined;
  /** MSH-4 — Sending Facility (HD.1). */
  sendingFacility: string | undefined;
  /** MSH-5 — Receiving Application (HD.1). */
  receivingApplication: string | undefined;
  /** MSH-6 — Receiving Facility (HD.1). */
  receivingFacility: string | undefined;
  /** MSH-7 — Date/Time of Message (TS). */
  dateTimeOfMessage: string | undefined;
  /** MSH-9 — Message Type (MSG), full value, e.g. "ADT^A01^ADT_A01". */
  messageType: string | undefined;
  /** MSH-9.1 — Message Code, e.g. "ADT". */
  messageCode: string | undefined;
  /** MSH-9.2 — Trigger Event, e.g. "A01". */
  triggerEvent: string | undefined;
  /** MSH-9.3 — Message Structure, e.g. "ADT_A01". */
  messageStructure: string | undefined;
  /** MSH-10 — Message Control ID. */
  messageControlId: string | undefined;
  /** MSH-11 — Processing ID (PT.1), e.g. "P" (production), "T" (training), "D" (debug). */
  processingId: string | undefined;
  /** MSH-12 — Version ID (VID.1), e.g. "2.5.1". */
  versionId: string | undefined;
}

/** Builds a typed `Msh` view from an already-located MSH segment. */
export function readMshSegment(segment: Segment, message: Message): Msh {
  const messageTypeField = getField(segment, 9);
  return {
    fieldSeparator: getComponent(message, getField(segment, 1)) ?? "",
    encodingCharacters: getComponent(message, getField(segment, 2)) ?? "",
    sendingApplication: getComponent(message, getField(segment, 3)),
    sendingFacility: getComponent(message, getField(segment, 4)),
    receivingApplication: getComponent(message, getField(segment, 5)),
    receivingFacility: getComponent(message, getField(segment, 6)),
    dateTimeOfMessage: getComponent(message, getField(segment, 7)),
    messageType: getRepetition(message, messageTypeField),
    messageCode: getComponent(message, messageTypeField, 1),
    triggerEvent: getComponent(message, messageTypeField, 2),
    messageStructure: getComponent(message, messageTypeField, 3),
    messageControlId: getComponent(message, getField(segment, 10)),
    processingId: getComponent(message, getField(segment, 11)),
    versionId: getComponent(message, getField(segment, 12)),
  };
}

/** Finds and reads the message's MSH segment, if present. */
export function readMsh(message: Message): Msh | undefined {
  const segment = getSegment(message, "MSH");
  return segment ? readMshSegment(segment, message) : undefined;
}
