/**
 * hl7-parser — HL7 v2 message parser: structured, typed JSON from
 * pipe-delimited ADT/ORU/ORM messages. See README.md §5 Architecture and
 * docs/SEGMENT_REFERENCE.md.
 *
 * Public API surface — everything a consumer should import lives here.
 * Internal modules are not part of the stability contract and can change
 * without a major version bump.
 */

export const VERSION = "0.1.0";

// Generic model (handover doc §5 FR2)
export {
  DEFAULT_ENCODING_CHARACTERS,
  Hl7ParseError,
  get,
  getAllRepetitions,
  getComponent,
  getField,
  getRepetition,
  getSegment,
  getSegments,
  getSubcomponent,
} from "./types.js";
export type {
  EncodingCharacters,
  Field,
  FieldComponent,
  FieldRepetition,
  Message,
  Segment,
  Subcomponent,
} from "./types.js";

// Tokenizer (handover doc §5 FR1)
export { parseMessage } from "./tokenizer.js";

// Escape sequence handling (handover doc §5 FR5)
export { decodeEscapes, encodeEscapes } from "./escape.js";

// Typed segment models (handover doc §5 FR3)
export { readMsh, readMshSegment } from "./segments/msh.js";
export type { Msh } from "./segments/msh.js";
export { readPid, readPidSegment } from "./segments/pid.js";
export type { Pid } from "./segments/pid.js";
export { readPv1, readPv1Segment } from "./segments/pv1.js";
export type { Pv1 } from "./segments/pv1.js";
export { readOrc, readOrcSegment } from "./segments/orc.js";
export type { Orc } from "./segments/orc.js";
export { readAllObr, readObrSegment } from "./segments/obr.js";
export type { Obr } from "./segments/obr.js";
export { readAllObx, readObxSegment } from "./segments/obx.js";
export type { Obx } from "./segments/obx.js";
export { readAllNk1, readNk1Segment } from "./segments/nk1.js";
export type { Nk1 } from "./segments/nk1.js";
export { readAllIn1, readIn1Segment } from "./segments/in1.js";
export type { In1 } from "./segments/in1.js";

// Message-type-aware parsing (handover doc §5 FR4)
export { parseAdt } from "./message-types/adt.js";
export type { AdtMessage } from "./message-types/adt.js";
export { parseOru } from "./message-types/oru.js";
export type { OruMessage, OruResultGroup } from "./message-types/oru.js";
export { parseOrm } from "./message-types/orm.js";
export type { OrmMessage, OrmOrderGroup } from "./message-types/orm.js";

// Serializer (handover doc §5 FR6)
export { serialize } from "./serialize.js";

// Structural validation (handover doc §5 FR7)
export { validateMessage, getMissingRequiredSegments } from "./validate.js";
export type { MessageType, ValidationError, ValidationResult } from "./validate.js";

// ACK/NAK builder (handover doc §5 FR8)
export { buildAck } from "./ack.js";
export type { AckCode, BuildAckOptions } from "./ack.js";
