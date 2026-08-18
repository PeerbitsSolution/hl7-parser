/**
 * Generic HL7 v2 message model (handover doc §5 FR2).
 *
 * A `Message` is just an ordered list of `Segment`s. A `Segment` is a name
 * plus an ordered list of `Field`s. Each `Field` supports repetition,
 * components, and subcomponents — the full HL7 v2 field structure — using
 * the delimiter characters that were discovered by the tokenizer from that
 * specific message's own MSH-1/MSH-2, never hardcoded constants.
 *
 * This model must work for ANY segment name, including ones with no typed
 * accessor in `src/segments/` — that's what keeps the parser useful beyond
 * ADT/ORU/ORM. See `get()` below for the generic accessor.
 */

/** The five delimiter roles declared by a message's own MSH-1/MSH-2. */
export interface EncodingCharacters {
  /** MSH-1 — separates fields. Conventionally `|`. */
  readonly field: string;
  /** First char of MSH-2 — separates components within a field. Conventionally `^`. */
  readonly component: string;
  /** Second char of MSH-2 — separates repeated occurrences of a field. Conventionally `~`. */
  readonly repetition: string;
  /** Third char of MSH-2 — introduces an escape sequence. Conventionally `\`. */
  readonly escape: string;
  /** Fourth char of MSH-2 — separates subcomponents within a component. Conventionally `&`. */
  readonly subcomponent: string;
}

/** The industry-standard default encoding characters (`^~\&` after `|`). */
export const DEFAULT_ENCODING_CHARACTERS: EncodingCharacters = {
  field: "|",
  component: "^",
  repetition: "~",
  escape: "\\",
  subcomponent: "&",
};

/** A single subcomponent value — the leaf of the field structure. Already escape-decoded. */
export type Subcomponent = string;

/** An ordered list of subcomponents. Most components have exactly one. */
export type FieldComponent = Subcomponent[];

/** An ordered list of components — one field repetition. Most fields have exactly one. */
export type FieldRepetition = FieldComponent[];

/**
 * A field's full value: an ordered list of repetitions. Most fields have
 * exactly one repetition, one component, and one subcomponent — i.e. a
 * plain scalar string — but the structure is always present so repeating
 * fields (e.g. PID-3 repeated identifiers) and composite fields (e.g.
 * PID-5 name components) work without a special case.
 */
export type Field = FieldRepetition[];

export interface Segment {
  /** The three-to-four-character segment name, e.g. "MSH", "PID", "OBX". */
  readonly name: string;
  /** Fields in order, 1-indexed by position: `fields[0]` is field 1. */
  readonly fields: Field[];
}

export interface Message {
  readonly segments: Segment[];
  /** The encoding characters this specific message declared in MSH-1/MSH-2. */
  readonly encodingCharacters: EncodingCharacters;
}

/** Raised for any structural parse failure — missing MSH, malformed MSH-1/MSH-2, etc. */
export class Hl7ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Hl7ParseError";
  }
}

// ---------------------------------------------------------------------------
// Generic accessors — work for any segment, typed or not.
// ---------------------------------------------------------------------------

/** Returns the first segment in the message with the given name, if any. */
export function getSegment(message: Message, segmentName: string): Segment | undefined {
  return message.segments.find((s) => s.name === segmentName);
}

/** Returns every segment in the message with the given name, in order. */
export function getSegments(message: Message, segmentName: string): Segment[] {
  return message.segments.filter((s) => s.name === segmentName);
}

/** Returns field N (1-indexed) of a segment, or undefined if the segment doesn't have it. */
export function getField(segment: Segment, fieldIndex: number): Field | undefined {
  return segment.fields[fieldIndex - 1];
}

/**
 * Returns a single subcomponent's decoded string value (1-indexed
 * repetition/component/subcomponent), or undefined if any level is absent.
 * Repetition, component, and subcomponent all default to 1 — the common
 * case of a plain scalar field.
 */
export function getSubcomponent(
  field: Field | undefined,
  componentIndex = 1,
  subcomponentIndex = 1,
  repetitionIndex = 1,
): string | undefined {
  return field?.[repetitionIndex - 1]?.[componentIndex - 1]?.[subcomponentIndex - 1];
}

/**
 * Returns a component's full value (all its subcomponents rejoined with
 * the message's own subcomponent separator), or undefined if absent.
 */
export function getComponent(
  message: Message,
  field: Field | undefined,
  componentIndex = 1,
  repetitionIndex = 1,
): string | undefined {
  const component = field?.[repetitionIndex - 1]?.[componentIndex - 1];
  if (component === undefined) return undefined;
  return component.join(message.encodingCharacters.subcomponent);
}

/**
 * Returns a field repetition's full value (all its components rejoined
 * with the message's own component separator), or undefined if absent.
 */
export function getRepetition(
  message: Message,
  field: Field | undefined,
  repetitionIndex = 1,
): string | undefined {
  const repetition = field?.[repetitionIndex - 1];
  if (repetition === undefined) return undefined;
  return repetition
    .map((component) => component.join(message.encodingCharacters.subcomponent))
    .join(message.encodingCharacters.component);
}

/**
 * Returns every repetition of a field, each fully rejoined into a plain
 * string (components rejoined with the component separator, subcomponents
 * with the subcomponent separator). Returns an empty array if the field is
 * absent. Used for inherently-repeating fields such as PID-3 (repeated
 * patient identifiers) or PID-5 (repeated patient names).
 */
export function getAllRepetitions(message: Message, field: Field | undefined): string[] {
  if (!field) return [];
  return field.map((_, index) => getRepetition(message, field, index + 1) ?? "");
}

/**
 * The generic field/component accessor described in the handover doc
 * (§5 FR2): `get(segmentName, fieldIndex, componentIndex)`. Works for any
 * segment name, including ones with no typed model in `src/segments/`.
 *
 * Returns the first matching segment's field N (optionally, component M
 * of it), fully rejoined into a plain string, or undefined if not present.
 */
export function get(
  message: Message,
  segmentName: string,
  fieldIndex: number,
  componentIndex?: number,
): string | undefined {
  const segment = getSegment(message, segmentName);
  if (!segment) return undefined;
  const field = getField(segment, fieldIndex);
  if (componentIndex === undefined) return getRepetition(message, field);
  return getComponent(message, field, componentIndex);
}
