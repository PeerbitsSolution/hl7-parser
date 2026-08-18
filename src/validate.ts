/**
 * Structural self-check (handover doc §5 FR7).
 *
 * `validateMessage()` confirms the required segments are present for a
 * given message type. This is a structural sanity check, NOT full HL7
 * conformance validation against any implementation guide or trading-
 * partner profile — see README §5 Architecture and SECURITY.md.
 */
import { getSegment, type Message } from "./types.js";

export type MessageType = "ADT" | "ORU" | "ORM";

/**
 * The required segments per message type, per the handover doc:
 *   - ADT needs MSH + EVN + PID (§9.1, §12)
 *   - ORU needs MSH + PID + OBR + OBX (§9.1, §12)
 *   - ORM needs MSH + PID + ORC + OBR (mirrors the ADT/ORU pattern; see
 *     message-types/orm.ts for why)
 */
const REQUIRED_SEGMENTS: Record<MessageType, readonly string[]> = {
  ADT: ["MSH", "EVN", "PID"],
  ORU: ["MSH", "PID", "OBR", "OBX"],
  ORM: ["MSH", "PID", "ORC", "OBR"],
};

export interface ValidationError {
  /** The segment name that is missing. */
  segment: string;
  /** A specific, human-readable description of what's missing. */
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  messageType: MessageType;
  errors: ValidationError[];
}

/** Returns the required segment names for `messageType` that are absent from `message`. */
export function getMissingRequiredSegments(message: Message, messageType: MessageType): string[] {
  const required = REQUIRED_SEGMENTS[messageType];
  return required.filter((segmentName) => getSegment(message, segmentName) === undefined);
}

/**
 * Confirms the required segments are present for `messageType`. Returns a
 * specific error per missing segment rather than a single pass/fail flag.
 */
export function validateMessage(message: Message, messageType: MessageType): ValidationResult {
  const missing = getMissingRequiredSegments(message, messageType);
  const errors: ValidationError[] = missing.map((segmentName) => ({
    segment: segmentName,
    message: `Required segment "${segmentName}" is missing for message type "${messageType}".`,
  }));
  return { valid: errors.length === 0, messageType, errors };
}
