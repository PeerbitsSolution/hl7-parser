/**
 * Delimiter-aware low-level parse (handover doc §5 FR1, §7.3 steps 1-3, 6).
 *
 * The single rule this module exists to enforce: the field separator
 * (MSH-1) and the four encoding characters (MSH-2 — component,
 * repetition, escape, subcomponent, in that order) are read from the
 * message itself before anything else is parsed. They are never assumed
 * to be the conventional `| ^ ~ \ &`, even though that's what almost every
 * real message uses — a message that declares different ones must still
 * parse correctly.
 */
import {
  DEFAULT_ENCODING_CHARACTERS,
  Hl7ParseError,
  type EncodingCharacters,
  type Field,
  type FieldComponent,
  type FieldRepetition,
  type Message,
  type Segment,
} from "./types.js";
import { decodeEscapes } from "./escape.js";

/** Re-exported so consumers can build a message model without parsing text (e.g. for buildAck). */
export { DEFAULT_ENCODING_CHARACTERS };

interface MshHeader {
  fieldSeparator: string;
  encodingCharactersRaw: string;
  /** Everything in the MSH segment after MSH-2, i.e. MSH-3 onward, still field-separator-delimited. */
  remainder: string;
}

function readMshHeader(mshSegmentRaw: string): MshHeader {
  if (!mshSegmentRaw.startsWith("MSH")) {
    throw new Hl7ParseError(
      `Message must begin with an MSH segment; found "${mshSegmentRaw.slice(0, 3)}".`,
    );
  }
  if (mshSegmentRaw.length < 8) {
    throw new Hl7ParseError(
      "MSH segment is too short to declare a field separator (MSH-1) and encoding characters (MSH-2).",
    );
  }

  const fieldSeparator = mshSegmentRaw[3] as string;
  const afterFieldSeparator = mshSegmentRaw.slice(4);
  const secondSeparatorIndex = afterFieldSeparator.indexOf(fieldSeparator);
  if (secondSeparatorIndex === -1) {
    throw new Hl7ParseError(
      "Malformed MSH segment: MSH-2 (encoding characters) not found — no second field separator after MSH-1.",
    );
  }

  const encodingCharactersRaw = afterFieldSeparator.slice(0, secondSeparatorIndex);
  const remainder = afterFieldSeparator.slice(secondSeparatorIndex + 1);
  return { fieldSeparator, encodingCharactersRaw, remainder };
}

function resolveEncodingCharacters(header: MshHeader): EncodingCharacters {
  const { fieldSeparator, encodingCharactersRaw } = header;
  if (encodingCharactersRaw.length !== 4) {
    throw new Hl7ParseError(
      `Malformed MSH-2: encoding characters must be exactly 4 characters ` +
        `(component, repetition, escape, subcomponent); got "${encodingCharactersRaw}".`,
    );
  }

  const component = encodingCharactersRaw[0] as string;
  const repetition = encodingCharactersRaw[1] as string;
  const escape = encodingCharactersRaw[2] as string;
  const subcomponent = encodingCharactersRaw[3] as string;

  const distinct = new Set([fieldSeparator, component, repetition, escape, subcomponent]);
  if (distinct.size !== 5) {
    throw new Hl7ParseError(
      "Malformed MSH-1/MSH-2: field separator and the four encoding characters must all be distinct.",
    );
  }

  return { field: fieldSeparator, component, repetition, escape, subcomponent };
}

function parseComponent(raw: string, enc: EncodingCharacters): FieldComponent {
  return raw.split(enc.subcomponent).map((sub) => decodeEscapes(sub, enc));
}

function parseRepetition(raw: string, enc: EncodingCharacters): FieldRepetition {
  return raw.split(enc.component).map((comp) => parseComponent(comp, enc));
}

function parseField(raw: string, enc: EncodingCharacters): Field {
  return raw.split(enc.repetition).map((rep) => parseRepetition(rep, enc));
}

/** A field holding exactly one literal string, unsplit — used for MSH-1/MSH-2 themselves. */
function literalField(value: string): Field {
  return [[[value]]];
}

function parseSegment(segmentRaw: string, enc: EncodingCharacters): Segment {
  const name = segmentRaw.slice(0, 3);

  if (name === "MSH") {
    const header = readMshHeader(segmentRaw);
    const restRaw = header.remainder.length > 0 ? header.remainder.split(header.fieldSeparator) : [];
    const fields: Field[] = [
      literalField(header.fieldSeparator), // MSH-1
      literalField(header.encodingCharactersRaw), // MSH-2
      ...restRaw.map((f) => parseField(f, enc)), // MSH-3 onward
    ];
    return { name, fields };
  }

  const rawFields = segmentRaw.split(enc.field).slice(1);
  const fields = rawFields.map((f) => parseField(f, enc));
  return { name, fields };
}

/**
 * Parses a raw HL7 v2 message string into the generic `Message` model.
 *
 * Segment terminator is the segment terminator, i.e. carriage return per
 * the standard; bare `\n` and `\r\n` are also accepted since messages are
 * frequently pasted/edited with platform-native line endings. Blank lines
 * are ignored.
 */
export function parseMessage(raw: string): Message {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Hl7ParseError("Cannot parse an empty message.");
  }

  const rawSegments = raw
    .split(/\r\n|\r|\n/)
    .map((s) => s.trimEnd())
    .filter((s) => s.length > 0);

  if (rawSegments.length === 0) {
    throw new Hl7ParseError("Message contains no segments.");
  }

  const header = readMshHeader(rawSegments[0] as string);
  const encodingCharacters = resolveEncodingCharacters(header);

  const segments = rawSegments.map((segmentRaw) => parseSegment(segmentRaw, encodingCharacters));

  return { segments, encodingCharacters };
}
