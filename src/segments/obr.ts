/**
 * OBR — Observation Request (HL7 v2.5.1 §4.5.2).
 */
import {
  getComponent,
  getField,
  getRepetition,
  getSegments,
  type Message,
  type Segment,
} from "../types.js";

export interface Obr {
  /** OBR-1 — Set ID. */
  setId: string | undefined;
  /** OBR-2.1 — Placer Order Number (EI.1). */
  placerOrderNumber: string | undefined;
  /** OBR-3.1 — Filler Order Number (EI.1). */
  fillerOrderNumber: string | undefined;
  /** OBR-4 — Universal Service Identifier (CE), full value. */
  universalServiceIdentifier: string | undefined;
  /** OBR-4.1 — Universal Service Identifier code. */
  universalServiceCode: string | undefined;
  /** OBR-4.2 — Universal Service Identifier text. */
  universalServiceText: string | undefined;
  /** OBR-7 — Observation Date/Time (TS). */
  observationDateTime: string | undefined;
  /** OBR-16 — Ordering Provider (XCN), full value. */
  orderingProvider: string | undefined;
  /** OBR-22 — Results Rpt/Status Chng Date/Time (TS). */
  resultsReportStatusChangeDateTime: string | undefined;
  /** OBR-25 — Result Status, e.g. "F" (final), "P" (preliminary), "C" (corrected). */
  resultStatus: string | undefined;
}

export function readObrSegment(segment: Segment, message: Message): Obr {
  const serviceIdField = getField(segment, 4);
  return {
    setId: getComponent(message, getField(segment, 1)),
    placerOrderNumber: getComponent(message, getField(segment, 2)),
    fillerOrderNumber: getComponent(message, getField(segment, 3)),
    universalServiceIdentifier: getRepetition(message, serviceIdField),
    universalServiceCode: getComponent(message, serviceIdField, 1),
    universalServiceText: getComponent(message, serviceIdField, 2),
    observationDateTime: getComponent(message, getField(segment, 7)),
    orderingProvider: getRepetition(message, getField(segment, 16)),
    resultsReportStatusChangeDateTime: getComponent(message, getField(segment, 22)),
    resultStatus: getComponent(message, getField(segment, 25)),
  };
}

/** Finds and reads every OBR segment in the message, in order. An ORU/ORM message may carry several. */
export function readAllObr(message: Message): Obr[] {
  return getSegments(message, "OBR").map((segment) => readObrSegment(segment, message));
}
