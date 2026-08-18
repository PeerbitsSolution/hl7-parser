/**
 * ORC — Common Order (HL7 v2.5.1 §4.5.1).
 */
import { getComponent, getField, getRepetition, getSegment, type Message, type Segment } from "../types.js";

export interface Orc {
  /** ORC-1 — Order Control, e.g. "NW" (new order), "CA" (cancel), "SC" (status changed). */
  orderControl: string | undefined;
  /** ORC-2.1 — Placer Order Number (EI.1). */
  placerOrderNumber: string | undefined;
  /** ORC-3.1 — Filler Order Number (EI.1). */
  fillerOrderNumber: string | undefined;
  /** ORC-5 — Order Status. */
  orderStatus: string | undefined;
  /** ORC-9 — Date/Time of Transaction (TS). */
  dateTimeOfTransaction: string | undefined;
  /** ORC-12 — Ordering Provider (XCN), full value. */
  orderingProvider: string | undefined;
}

export function readOrcSegment(segment: Segment, message: Message): Orc {
  return {
    orderControl: getComponent(message, getField(segment, 1)),
    placerOrderNumber: getComponent(message, getField(segment, 2)),
    fillerOrderNumber: getComponent(message, getField(segment, 3)),
    orderStatus: getComponent(message, getField(segment, 5)),
    dateTimeOfTransaction: getComponent(message, getField(segment, 9)),
    orderingProvider: getRepetition(message, getField(segment, 12)),
  };
}

/** Finds and reads the message's (first) ORC segment, if present. Use `readOrcSegment` directly for ORM messages with multiple ORC/OBR groups. */
export function readOrc(message: Message): Orc | undefined {
  const segment = getSegment(message, "ORC");
  return segment ? readOrcSegment(segment, message) : undefined;
}
