/**
 * Serializer (handover doc §5 FR6) — converts a parsed `Message` back into
 * a pipe-delimited HL7 v2 string, using that message's own encoding
 * characters (never hardcoded ones), and re-encoding escape sequences.
 *
 * `parse(input)` followed by `serialize(parsed)` must reproduce the
 * original synthetic fixture content, modulo insignificant whitespace
 * (trailing blank lines / trailing CR are not significant; see tests).
 */
import { encodeEscapes } from "./escape.js";
import type { EncodingCharacters, Field, FieldComponent, FieldRepetition, Message, Segment } from "./types.js";

function serializeComponent(component: FieldComponent, enc: EncodingCharacters, raw: boolean): string {
  return component.map((sub) => (raw ? sub : encodeEscapes(sub, enc))).join(enc.subcomponent);
}

function serializeRepetition(repetition: FieldRepetition, enc: EncodingCharacters, raw: boolean): string {
  return repetition.map((component) => serializeComponent(component, enc, raw)).join(enc.component);
}

function serializeField(field: Field, enc: EncodingCharacters, raw = false): string {
  return field.map((repetition) => serializeRepetition(repetition, enc, raw)).join(enc.repetition);
}

/** MSH-1 and MSH-2 are literal delimiter definitions, not escaped/decoded field content. */
function literalFieldValue(field: Field | undefined, fallback: string): string {
  return field?.[0]?.[0]?.[0] ?? fallback;
}

function serializeSegment(segment: Segment, enc: EncodingCharacters): string {
  if (segment.name === "MSH") {
    const fieldSeparator = literalFieldValue(segment.fields[0], enc.field);
    const encodingChars = literalFieldValue(
      segment.fields[1],
      `${enc.component}${enc.repetition}${enc.escape}${enc.subcomponent}`,
    );
    const rest = segment.fields
      .slice(2)
      .map((field) => serializeField(field, enc))
      .join(enc.field);
    return rest.length > 0
      ? `MSH${fieldSeparator}${encodingChars}${enc.field}${rest}`
      : `MSH${fieldSeparator}${encodingChars}`;
  }

  const fieldsStr = segment.fields.map((field) => serializeField(field, enc)).join(enc.field);
  return fieldsStr.length > 0 ? `${segment.name}${enc.field}${fieldsStr}` : segment.name;
}

/** Serializes a parsed `Message` back into a pipe-delimited HL7 v2 string, segments joined by CR. */
export function serialize(message: Message): string {
  return message.segments.map((segment) => serializeSegment(segment, message.encodingCharacters)).join("\r");
}
