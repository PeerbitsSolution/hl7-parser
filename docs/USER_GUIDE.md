# User Guide

A task-oriented walkthrough of `@peerbits/hl7-parser`. For exact function
signatures, see [`API_REFERENCE.md`](./API_REFERENCE.md). For per-segment
field documentation, see [`SEGMENT_REFERENCE.md`](./SEGMENT_REFERENCE.md).

## Contents

1. [Install](#1-install)
2. [Parse your first message](#2-parse-your-first-message)
3. [Read typed segment fields](#3-read-typed-segment-fields)
4. [Reach fields this repo doesn't have a typed model for](#4-reach-fields-this-repo-doesnt-have-a-typed-model-for)
5. [Work with ADT: identify the trigger event](#5-work-with-adt-identify-the-trigger-event)
6. [Work with ORU: don't lose the OBR/OBX grouping](#6-work-with-oru-dont-lose-the-obrobx-grouping)
7. [Work with ORM: ORC/OBR association](#7-work-with-orm-orcobr-association)
8. [Validate a message's structure](#8-validate-a-messages-structure)
9. [Build and send back an ACK](#9-build-and-send-back-an-ack)
10. [Serialize back to HL7 v2](#10-serialize-back-to-hl7-v2)
11. [Escape sequences: when you need to think about them](#11-escape-sequences-when-you-need-to-think-about-them)
12. [Non-default delimiters](#12-non-default-delimiters)
13. [Error handling](#13-error-handling)
14. [What this library deliberately does not do](#14-what-this-library-deliberately-does-not-do)
15. [Troubleshooting / FAQ](#15-troubleshooting--faq)

---

## 1. Install

```bash
npm install @peerbits/hl7-parser
```

Requires Node.js ≥18. Ships as an ESM package with full TypeScript
declarations; zero runtime dependencies.

## 2. Parse your first message

Everything starts with `parseMessage`, which turns a raw string into the
generic `Message` model:

```ts
import { parseMessage } from "@peerbits/hl7-parser";

const raw = [
  "MSH|^~\\&|TEST SENDING APP|TEST SENDING FACILITY|TEST RECEIVING APP|TEST RECEIVING FACILITY|20260110080000||ADT^A01^ADT_A01|TESTCTRLID00001|P|2.5.1",
  "EVN|A01|20260110080000",
  "PID|1||MRN-TEST-00123^^^TEST FACILITY^MR||TEST^PATIENT^A||19800101|M",
].join("\r");

const message = parseMessage(raw);
console.log(message.segments.map((s) => s.name)); // ["MSH", "EVN", "PID"]
console.log(message.encodingCharacters); // { field: "|", component: "^", repetition: "~", escape: "\\", subcomponent: "&" }
```

`message` is a plain, JSON-serializable structure — nothing about it is
tied to the input string once parsed. `\r`, `\r\n`, and bare `\n` are all
accepted as the segment terminator.

## 3. Read typed segment fields

For the eight segments this repo models (MSH, PID, PV1, ORC, OBR, OBX,
NK1, IN1), use the `read*` functions instead of digging through the
generic model by hand:

```ts
import { readPid, readPv1 } from "@peerbits/hl7-parser";

const pid = readPid(message);
console.log(pid?.patientId, pid?.familyName, pid?.givenName, pid?.dateOfBirth);

const pv1 = readPv1(message);
console.log(pv1?.patientClass, pv1?.pointOfCare);
```

Segments that can repeat within one message (OBR, OBX, NK1, IN1) have a
`readAll*` function instead of a single-segment one:

```ts
import { readAllNk1 } from "@peerbits/hl7-parser";

for (const nextOfKin of readAllNk1(message)) {
  console.log(nextOfKin.relationship, nextOfKin.name);
}
```

Every field on these types can be `undefined` — HL7 v2 fields are
routinely absent, and the typed accessors reflect that rather than
returning empty strings that hide the difference between "absent" and
"present but blank."

## 4. Reach fields this repo doesn't have a typed model for

Any segment — including ones with no typed model, like OBX's parent OBR
extension segments, or a Z-segment your trading partner adds — is still
reachable through the generic accessor:

```ts
import { get, getSegment, getField } from "@peerbits/hl7-parser";

// Shorthand: segment name, field number, optional component number (all 1-indexed)
const somethingCustom = get(message, "ZPD", 3, 2); // ZPD-3.2

// Lower-level, if you need the raw structure (e.g. to inspect repetitions):
const zSegment = getSegment(message, "ZPD");
const field3 = zSegment ? getField(zSegment, 3) : undefined;
```

This is the mechanism that keeps the parser useful for message types and
segments beyond ADT/ORU/ORM — nothing in an HL7 v2 message is ever
unreadable, even if this repo has no opinion about what it means.

## 5. Work with ADT: identify the trigger event

`parseAdt` wraps the generic model with ADT-specific structure: the
trigger event (A01, A02, A03, A04, A08, ...) and a required-segment check,
in one call:

```ts
import { parseAdt } from "@peerbits/hl7-parser";

const adt = parseAdt(message);
console.log(adt.triggerEvent); // "A01"
console.log(adt.structurallyValid); // true if MSH+EVN+PID are all present
console.log(adt.pid?.patientId);
```

## 6. Work with ORU: don't lose the OBR/OBX grouping

This is the single easiest mistake to make when hand-rolling HL7 v2
parsing: treating an ORU's OBX (result) segments as one flat list loses
which OBR (order) each result belongs to. `parseOru` keeps them grouped:

```ts
import { parseOru } from "@peerbits/hl7-parser";

const oru = parseOru(message);

for (const group of oru.resultGroups) {
  console.log(group.obr.universalServiceText); // e.g. "COMPLETE BLOOD COUNT"
  for (const result of group.results) {
    console.log(" ", result.observationCode, "=", result.observationValue, result.units);
  }
}
```

Against `fixtures/valid/oru-r01-multi-result.hl7` (two orders, one with 2
results and one with 3), `oru.resultGroups` has length 2, and
`oru.resultGroups[0].results`/`oru.resultGroups[1].results` are correctly
2 and 3 items respectively — verified in `tests/message-types.test.ts`.

If you only need every OBX regardless of which order it belongs to (e.g.
a flat display table where grouping doesn't matter for your use case),
`readAllObx(message)` gives you that — but note it discards the OBR
association, which is exactly what `parseOru` exists to preserve.

## 7. Work with ORM: ORC/OBR association

Symmetric to ORU: `parseOrm` pairs each ORC (order control) with the OBR
(observation request) that follows it.

```ts
import { parseOrm } from "@peerbits/hl7-parser";

const orm = parseOrm(message);

for (const group of orm.orderGroups) {
  console.log(group.orc.orderControl, group.orc.placerOrderNumber, "->", group.obr?.universalServiceText);
}
```

## 8. Validate a message's structure

Before doing anything with a message, it's often worth a quick structural
check — not full conformance validation, just "are the segments this
message type needs actually present":

```ts
import { parseMessage, validateMessage } from "@peerbits/hl7-parser";

const message = parseMessage(raw);
const result = validateMessage(message, "ADT");

if (!result.valid) {
  for (const error of result.errors) {
    console.error(error.message); // e.g. 'Required segment "PID" is missing for message type "ADT".'
  }
}
```

`parseAdt`/`parseOru`/`parseOrm` already run this check internally and
expose it as `.structurallyValid`/`.missingSegments` — call
`validateMessage` directly only if you want the check without the rest of
the typed structure, or need to validate against a message type inferred
at runtime.

## 9. Build and send back an ACK

Any real interface exchange expects an acknowledgement back. `buildAck`
constructs one; `serialize` turns it into a string your own transport
layer can send (this repo does not implement MLLP or any transport — see
[§14](#14-what-this-library-deliberately-does-not-do)):

```ts
import { parseMessage, buildAck, serialize, validateMessage } from "@peerbits/hl7-parser";

const inbound = parseMessage(raw);

// Happy path
const ack = buildAck(inbound, "AA");

// Or, if your own validation rejected the message:
const validation = validateMessage(inbound, "ADT");
const nak = buildAck(inbound, validation.valid ? "AA" : "AE");

const wireFormat = serialize(nak);
// hand `wireFormat` to your own MLLP/transport layer
```

## 10. Serialize back to HL7 v2

`serialize` is the inverse of `parseMessage`. It's round-trip tested
against every fixture type — `parseMessage(serialize(parseMessage(raw)))`
reproduces `raw`'s content, modulo insignificant whitespace:

```ts
import { parseMessage, serialize } from "@peerbits/hl7-parser";

const message = parseMessage(raw);
// ... mutate `message.segments` if you need to, e.g. by editing a field ...
const output = serialize(message);
```

`serialize` always uses `message.encodingCharacters` — the delimiters that
specific message declared — so a message parsed with non-default
delimiters serializes back out with those same delimiters, not the
conventional ones.

## 11. Escape sequences: when you need to think about them

You almost never need to call `decodeEscapes`/`encodeEscapes` directly —
`parseMessage` decodes on the way in and `serialize` encodes on the way
out automatically. The one time it matters is if you're constructing
field content by hand (e.g. building a `Message` programmatically rather
than parsing one) and that content might contain a literal `|`, `^`, `~`,
`\`, or `&`: leave it as the literal character in your string, and
`serialize`'s call to `encodeEscapes` will turn it into the correct
`\F\`/`\S\`/`\R\`/`\E\`/`\T\` escape automatically. You don't need to
pre-escape it yourself.

## 12. Non-default delimiters

Some interface engines declare non-default encoding characters in MSH-2.
This library reads them per-message rather than assuming
`^~\&` — you don't need to configure anything:

```ts
// field=#, component=@, repetition=$, escape=!, subcomponent=*
const raw = "MSH#@$!*#SEND#FAC#RECV#RECVFAC#20260110080000##ADT@A01@ADT_A01#CTRL#P#2.5.1";
const message = parseMessage(raw);
console.log(message.encodingCharacters); // { field: "#", component: "@", repetition: "$", escape: "!", subcomponent: "*" }
```

Every accessor and `serialize` work identically regardless of which
characters a given message declared.

## 13. Error handling

`parseMessage` throws `Hl7ParseError` (never a bare `Error`) for anything
structurally wrong with the input — not starting with MSH, a malformed
MSH-2, non-distinct delimiter characters, or empty input. Catch it
specifically so you can distinguish "this isn't parseable HL7 v2" from a
bug elsewhere in your code:

```ts
import { parseMessage, Hl7ParseError } from "@peerbits/hl7-parser";

function safeParse(raw: string) {
  try {
    return { ok: true as const, message: parseMessage(raw) };
  } catch (err) {
    if (err instanceof Hl7ParseError) {
      return { ok: false as const, reason: err.message };
    }
    throw err; // something unexpected — don't swallow it
  }
}
```

Everything else in the library (typed accessors, `validateMessage`,
`buildAck`, `serialize`) is a pure function over an already-parsed
`Message` and does not throw for missing/absent fields — it returns
`undefined` (or an empty array/`valid: false`) instead, since a missing
field is routine in HL7 v2, not exceptional.

## 14. What this library deliberately does not do

Worth knowing up front so you don't go looking for it:

- **No MLLP or any network/socket transport.** This parses message
  *content* only. Pair it with your own MLLP client/server, or a library
  that does that specifically.
- **No HL7 v2-to-FHIR mapping.** This repo's typed output is meant to be
  the *input* to that mapping in your own code, not the mapping itself.
- **No implementation-guide-specific conformance validation.**
  `validateMessage` is a structural sanity check (required segments
  present), not a substitute for testing against your actual trading
  partner's profile.
- **No client-specific Z-segment definitions.** Z-segments work through
  the generic accessor (§4 above) as pass-through data; this repo will
  never ship a typed model for one, since by definition they're
  site-specific.

See README §7 (Roadmap) for which of these are actually planned as future
repos/work, versus permanently out of scope.

## 15. Troubleshooting / FAQ

**`Hl7ParseError: Message must begin with an MSH segment`**
Your input has leading whitespace/BOM, or isn't HL7 v2 at all (e.g. it's
already been partially parsed, or is a FHIR JSON payload). Confirm the
first three characters of the trimmed string are literally `MSH`.

**`Hl7ParseError: Malformed MSH-2: encoding characters must be exactly 4 characters`**
MSH-2 is missing a character or has an extra one — check the raw message
between the first and second field separators. The default is `^~\&`
(4 characters: component, repetition, escape, subcomponent, in that
order).

**A typed field I expected is `undefined`**
Check `docs/SEGMENT_REFERENCE.md` — the typed models cover the fields
documented there, not every field HL7 v2.5.1 defines for that segment.
Anything not listed is still reachable through the generic accessor
(§4 above).

**My OBX results all show up in one group instead of split by OBR**
Make sure you're calling `parseOru`, not manually collecting `readAllObx`
results — `readAllObx` intentionally returns a flat list (§6 above
explains why `parseOru` exists).

**Round-trip serialization doesn't byte-match my input**
Check whether the difference is only trailing whitespace / a trailing
blank line / CRLF vs. bare CR — those are the "insignificant whitespace"
this repo's round-trip guarantee explicitly excludes (see
`tests/serialize.test.ts`'s `normalize()` helper for the exact rule). If
the difference is anything else, that's a bug — please open an issue with
a synthetic (not real) reproduction fixture.

**Where do I report a security issue or suspected PHI in a fixture?**
See [`SECURITY.md`](../SECURITY.md) — do not open a public issue for
either.
