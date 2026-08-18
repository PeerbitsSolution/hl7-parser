# API Reference

Complete reference for every symbol exported from `@peerbits/hl7-parser`
(`src/index.ts`). All signatures below are copied from the actual source,
not reconstructed from memory — if this ever drifts from `src/`, the
source is authoritative.

For field-level documentation of what each typed segment extracts, see
[`SEGMENT_REFERENCE.md`](./SEGMENT_REFERENCE.md). For a task-oriented walkthrough,
see [`USER_GUIDE.md`](./USER_GUIDE.md).

## Contents

- [Core parsing](#core-parsing)
- [Generic model & accessors](#generic-model--accessors)
- [Escape sequences](#escape-sequences)
- [Typed segments](#typed-segments)
- [Message-type-aware parsing](#message-type-aware-parsing)
- [Serialization](#serialization)
- [Structural validation](#structural-validation)
- [ACK/NAK builder](#acknak-builder)
- [Errors](#errors)

---

## Core parsing

### `parseMessage(raw: string): Message`

Parses a raw HL7 v2 message string into the generic `Message` model.
Reads MSH-1 (field separator) and MSH-2 (encoding characters) from the
message itself before parsing anything else — never assumes `| ^ ~ \ &`.
Accepts `\r`, `\r\n`, or bare `\n` as the segment terminator; blank lines
are ignored.

Throws [`Hl7ParseError`](#hl7parseerror) if the message doesn't start with
MSH, MSH-2 isn't exactly 4 characters, the field separator and the four
encoding characters aren't all distinct, or the message is empty.

```ts
import { parseMessage } from "@peerbits/hl7-parser";

const message = parseMessage(rawHl7String);
```

---

## Generic model & accessors

These work for **any** segment, including ones with no typed model in
`src/segments/` (Z-segments included — treated as pass-through-only).

### Types

```ts
interface EncodingCharacters {
  readonly field: string;        // MSH-1, conventionally "|"
  readonly component: string;    // MSH-2.1, conventionally "^"
  readonly repetition: string;   // MSH-2.2, conventionally "~"
  readonly escape: string;       // MSH-2.3, conventionally "\"
  readonly subcomponent: string; // MSH-2.4, conventionally "&"
}

type Subcomponent = string;
type FieldComponent = Subcomponent[];
type FieldRepetition = FieldComponent[];
type Field = FieldRepetition[]; // repetitions -> components -> subcomponents

interface Segment {
  readonly name: string;   // e.g. "MSH", "PID", "OBX"
  readonly fields: Field[]; // 1-indexed by position: fields[0] is field 1
}

interface Message {
  readonly segments: Segment[];
  readonly encodingCharacters: EncodingCharacters;
}
```

`DEFAULT_ENCODING_CHARACTERS: EncodingCharacters` — the conventional
`| ^ ~ \ &` set, exported for convenience (e.g. when building a `Message`
programmatically rather than parsing one — see `buildAck`'s source for an
example).

### `get(message, segmentName, fieldIndex, componentIndex?): string | undefined`

The generic field/component accessor (handover doc §5 FR2). Returns the
first matching segment's field N, or component M of it, fully decoded.
Returns `undefined` if the segment or field isn't present.

```ts
import { get } from "@peerbits/hl7-parser";

const patientFamilyName = get(message, "PID", 5, 1); // PID-5.1
const messageType = get(message, "MSH", 9); // full MSH-9 value, e.g. "ADT^A01^ADT_A01"
```

### `getSegment(message: Message, segmentName: string): Segment | undefined`
First segment in the message with the given name, if any.

### `getSegments(message: Message, segmentName: string): Segment[]`
Every segment in the message with the given name, in order — use this for
repeating segments like OBX, OBR, NK1, IN1.

### `getField(segment: Segment, fieldIndex: number): Field | undefined`
Field N (1-indexed) of a segment.

### `getSubcomponent(field, componentIndex = 1, subcomponentIndex = 1, repetitionIndex = 1): string | undefined`
A single subcomponent's decoded string value. All three indices default to
1 — the common case of a plain scalar field.

### `getComponent(message, field, componentIndex = 1, repetitionIndex = 1): string | undefined`
A component's full value, with its subcomponents rejoined using the
message's own subcomponent separator.

### `getRepetition(message, field, repetitionIndex = 1): string | undefined`
A field repetition's full value, with its components rejoined using the
message's own component separator.

### `getAllRepetitions(message: Message, field: Field | undefined): string[]`
Every repetition of a field, each fully rejoined into a plain string.
Returns `[]` if the field is absent. Used for inherently-repeating fields
such as PID-3 (repeated patient identifiers) or PID-5 (repeated names).

---

## Escape sequences

### `decodeEscapes(value: string, enc: EncodingCharacters): string`
### `encodeEscapes(value: string, enc: EncodingCharacters): string`

Decode/encode `\F\ \S\ \T\ \R\ \E\`, hex escapes (`\Xdd[dd...]\`), and this
implementation's Unicode escape convention (`\Uhhhh\`, 4 hex digits — not
the official HL7 `\Zdddd\` mechanism, which depends on the message's
declared character set). `parseMessage` calls `decodeEscapes` internally
on every leaf value; `serialize` calls `encodeEscapes`. You only need
these directly if you're building or inspecting field content by hand.

```ts
import { decodeEscapes, DEFAULT_ENCODING_CHARACTERS } from "@peerbits/hl7-parser";

decodeEscapes("\\F\\", DEFAULT_ENCODING_CHARACTERS); // "|"
```

---

## Typed segments

Each segment module exports a `read<Name>Segment(segment, message)` pure
builder and either a `read<Name>(message)` convenience (for segments that
appear once, like MSH/PID/PV1/ORC) or a `readAll<Name>(message)`
convenience (for segments that repeat, like OBR/OBX/NK1/IN1).

Field-by-field documentation for all eight is in
[`SEGMENT_REFERENCE.md`](./SEGMENT_REFERENCE.md). Signatures:

| Segment | Type | Single reader | Segment-level reader |
|---|---|---|---|
| MSH | `Msh` | `readMsh(message): Msh \| undefined` | `readMshSegment(segment, message): Msh` |
| PID | `Pid` | `readPid(message): Pid \| undefined` | `readPidSegment(segment, message): Pid` |
| PV1 | `Pv1` | `readPv1(message): Pv1 \| undefined` | `readPv1Segment(segment, message): Pv1` |
| ORC | `Orc` | `readOrc(message): Orc \| undefined` | `readOrcSegment(segment, message): Orc` |
| OBR | `Obr` | `readAllObr(message): Obr[]` | `readObrSegment(segment, message): Obr` |
| OBX | `Obx` | `readAllObx(message): Obx[]` | `readObxSegment(segment, message): Obx` |
| NK1 | `Nk1` | `readAllNk1(message): Nk1[]` | `readNk1Segment(segment, message): Nk1` |
| IN1 | `In1` | `readAllIn1(message): In1[]` | `readIn1Segment(segment, message): In1` |

Use the segment-level reader (`read<Name>Segment`) when you've already
located a specific segment instance yourself — e.g. inside a loop over
`getSegments(message, "OBX")` — and the message-level convenience
otherwise. This is exactly how `parseOru`/`parseOrm` are implemented
(see below).

```ts
import { readPid, readAllObx } from "@peerbits/hl7-parser";

const pid = readPid(message);
console.log(pid?.patientId, pid?.familyName, pid?.givenName);

for (const obx of readAllObx(message)) {
  console.log(obx.observationCode, "=", obx.observationValue, obx.units);
}
```

---

## Message-type-aware parsing

### `parseAdt(message: Message): AdtMessage`

```ts
interface AdtMessage {
  triggerEvent: string | undefined; // MSH-9.2, e.g. "A01"
  msh: Msh | undefined;
  pid: Pid | undefined;
  pv1: Pv1 | undefined;
  missingSegments: string[]; // required segments (MSH, EVN, PID) not found
  structurallyValid: boolean;
}
```

### `parseOru(message: Message): OruMessage`

Groups repeating OBR/OBX result sets — **does not flatten them**. Each
`OruResultGroup` pairs one OBR with every OBX that followed it before the
next OBR (or end of message).

```ts
interface OruResultGroup {
  obr: Obr;
  results: Obx[];
}

interface OruMessage {
  msh: Msh | undefined;
  pid: Pid | undefined;
  resultGroups: OruResultGroup[];
  missingSegments: string[]; // required: MSH, PID, OBR, OBX
  structurallyValid: boolean;
}
```

### `parseOrm(message: Message): OrmMessage`

Associates each ORC with its related OBR (the next OBR that follows it).

```ts
interface OrmOrderGroup {
  orc: Orc;
  obr: Obr | undefined;
}

interface OrmMessage {
  msh: Msh | undefined;
  pid: Pid | undefined;
  orderGroups: OrmOrderGroup[];
  missingSegments: string[]; // required: MSH, PID, ORC, OBR
  structurallyValid: boolean;
}
```

---

## Serialization

### `serialize(message: Message): string`

Converts a parsed `Message` back into a pipe-delimited HL7 v2 string,
using that message's own encoding characters and re-encoding escape
sequences. `parseMessage(serialize(parseMessage(raw)))` reproduces the
original content modulo insignificant whitespace (trailing blank
lines/CR). See `tests/serialize.test.ts` for the exact fixtures this is
verified against.

```ts
import { parseMessage, serialize } from "@peerbits/hl7-parser";

const message = parseMessage(raw);
const roundTripped = serialize(message);
```

---

## Structural validation

### `validateMessage(message: Message, messageType: MessageType): ValidationResult`

A structural sanity check — confirms the required segments for
`messageType` are present. **Not** full HL7 conformance validation against
any implementation guide or trading-partner profile.

```ts
type MessageType = "ADT" | "ORU" | "ORM";

interface ValidationError {
  segment: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  messageType: MessageType;
  errors: ValidationError[];
}
```

Required segments per type: ADT = MSH+EVN+PID, ORU = MSH+PID+OBR+OBX,
ORM = MSH+PID+ORC+OBR (see `docs/SEGMENT_REFERENCE.md` for the rationale).

### `getMissingRequiredSegments(message: Message, messageType: MessageType): string[]`

The lower-level helper `validateMessage` is built on — just the list of
missing segment names, if you don't need the full `ValidationResult` shape.

```ts
import { validateMessage } from "@peerbits/hl7-parser";

const result = validateMessage(message, "ADT");
if (!result.valid) {
  for (const error of result.errors) console.error(error.message);
}
```

---

## ACK/NAK builder

### `buildAck(inboundMessage: Message, ackCode: AckCode, options?: BuildAckOptions): Message`

Builds a basic MSA-based acknowledgement to `inboundMessage`. The ACK's
MSH swaps sending/receiving application and facility relative to the
inbound message; its MSA segment references the inbound message's MSH-10
control ID.

```ts
type AckCode = "AA" | "AE" | "AR"; // accept / error / reject

interface BuildAckOptions {
  /** The ACK's own MSH-10. Defaults to a generated value if omitted. */
  controlId?: string;
}
```

```ts
import { parseMessage, buildAck, serialize } from "@peerbits/hl7-parser";

const inbound = parseMessage(raw);
const ack = buildAck(inbound, "AA");
const ackString = serialize(ack); // ready to send back over your own transport
```

No additional acknowledgement protocol (batch ACKs, enhanced-mode
NACK retry, etc.) is implemented — only a basic MSA-referencing ACK/NAK.

---

## Errors

### `Hl7ParseError`

```ts
class Hl7ParseError extends Error {
  name: "Hl7ParseError";
}
```

Thrown by `parseMessage` for any structural parse failure: missing MSH,
malformed MSH-1/MSH-2, non-distinct delimiter characters, or an empty
message. Always check for this specifically rather than a bare `Error` if
you need to distinguish "this input isn't HL7 v2" from a bug elsewhere:

```ts
import { parseMessage, Hl7ParseError } from "@peerbits/hl7-parser";

try {
  const message = parseMessage(raw);
} catch (err) {
  if (err instanceof Hl7ParseError) {
    // malformed input — handle/report, don't crash the process
  } else {
    throw err;
  }
}
```
