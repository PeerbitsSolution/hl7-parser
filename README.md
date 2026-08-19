# hl7-parser

> HL7 v2 message parser — structured, typed JSON from pipe-delimited ADT/ORU/ORM messages

[![CI](https://github.com/PeerbitsSolution/hl7-parser/actions/workflows/ci.yml/badge.svg)](https://github.com/PeerbitsSolution/hl7-parser/actions/workflows/ci.yml)
[![CodeQL](https://github.com/PeerbitsSolution/hl7-parser/actions/workflows/codeql.yml/badge.svg)](https://github.com/PeerbitsSolution/hl7-parser/actions/workflows/codeql.yml)
[![npm](https://img.shields.io/npm/v/%40peerbits%2Fhl7-parser.svg)](https://www.npmjs.com/package/@peerbits/hl7-parser)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
[![Node.js >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)

**Category:** FHIR & SMART — Interoperability Libraries · **License:** Apache-2.0 · **Status:** alpha

**Docs:** [User Guide](./docs/USER_GUIDE.md) · [API Reference](./docs/API_REFERENCE.md) · [Segment Reference](./docs/SEGMENT_REFERENCE.md) · [Releasing](./docs/RELEASING.md) · [Security Policy](./SECURITY.md)

---

## 1. What problem does this solve?

Most hospital interface engines still carry substantial HL7 v2 traffic
alongside FHIR — admissions, transfers, lab results, and orders move over
HL7 v2 in the majority of real-world hospital integrations today, not just
in legacy systems being phased out. Every project that touches one of
those interfaces ends up hand-rolling the same parsing logic: splitting a
pipe-delimited message into segments, fields, components, subcomponents,
and repetitions, using encoding characters that are themselves declared
inside the message (MSH-1/MSH-2) rather than fixed. Getting that delimiter
handling wrong silently corrupts data instead of failing loudly, and
getting message-type grouping wrong — e.g. treating an ORU's repeating
OBR/OBX result groups as a flat list — loses the structure that makes lab
results interpretable.

hl7-parser solves that once: a typed, spec-grounded parser for the message
types that carry the most real-world volume — ADT (admit/discharge/
transfer), ORU (observation/lab results), and ORM/ORC (orders) — with a
generic fallback for anything else, plus a serializer for round-trip
fidelity and a basic ACK builder, since any real interface exchange
expects one back.

## 2. Features

- Delimiter-aware tokenizer that reads MSH-1/MSH-2 to determine the actual
  field/component/subcomponent/repetition/escape characters for a given
  message — never hardcoded, so messages with non-default encoding
  characters parse correctly too
- Generic `Message`/`Segment`/`Field` model with a `get(message, segment,
  field, component)` accessor that works for any segment, including ones
  with no typed model (Z-segments included, as pass-through only)
- Typed, documented field access for MSH, PID, PV1, ORC, OBR, OBX, NK1,
  and IN1
- Message-type-aware parsing for ADT (trigger-event identification), ORU
  (repeating OBR/OBX result groups, correctly grouped and never
  flattened), and ORM (ORC/OBR association)
- HL7 v2 escape sequence decode/encode (`\F\ \S\ \T\ \R\ \E\`, hex, and
  Unicode escapes)
- `serialize()` — converts a parsed message back into pipe-delimited HL7
  v2, round-trip tested against synthetic fixtures of every supported type
- `validateMessage()` — a structural self-check confirming required
  segments are present for a given message type (not full conformance
  validation — see §5 Architecture)
- `buildAck()` — a basic MSA-based ACK/NAK builder for `AA`/`AE`/`AR`
- Zero runtime dependencies, full TypeScript strict-mode declarations

## 3. Installation

```bash
npm install @peerbits/hl7-parser
```

## 4. Demo and Quick Start

[Peerbits HealthTech - HL7 Parser Demo](https://healthcare.peerbits.com/demo/hl7-parser)

Input — a synthetic ADT^A01 admit message
(`fixtures/valid/adt-a01-admit.hl7`):

```
MSH|^~\&|TEST SENDING APP|TEST SENDING FACILITY|TEST RECEIVING APP|TEST RECEIVING FACILITY|20260110080000||ADT^A01^ADT_A01|TESTCTRLID00001|P|2.5.1
EVN|A01|20260110080000
PID|1||MRN-TEST-00123^^^TEST FACILITY^MR||TEST^PATIENT^A||19800101|M||TEST-RACE-CODE|123 SAMPLE ST^^TESTVILLE^TS^00000^TESTLAND||(555)555-0100|||||ACCT-TEST-00123|999-99-9999
NK1|1|TEST^NEXTOFKIN^A|SPO|123 SAMPLE ST^^TESTVILLE^TS^00000^TESTLAND|(555)555-0101
PV1|1|I|TESTWARD^101^A^TEST FACILITY|R|||1001^ATTENDING^TEST^A|1002^REFERRING^TEST^B||SUR|||||||||VN-TEST-00123|||||||||||||||||||||||||20260110080000
IN1|1|PLAN-TEST-01^TEST INSURANCE PLAN|COMP-TEST-01|TEST INSURANCE COMPANY|123 PAYER PLAZA^^TESTVILLE^TS^00000^TESTLAND|||GRP-TEST-01||||||||||||||||||||||||||||POLICY-TEST-00123
```

Code:

```ts
import { parseMessage, parseAdt, readAllNk1, readAllIn1 } from "@peerbits/hl7-parser";
import { readFileSync } from "node:fs";

const raw = readFileSync("fixtures/valid/adt-a01-admit.hl7", "utf8");
const message = parseMessage(raw);
const adt = parseAdt(message);

console.log(
  JSON.stringify(
    {
      triggerEvent: adt.triggerEvent,
      structurallyValid: adt.structurallyValid,
      msh: adt.msh,
      pid: adt.pid,
      pv1: adt.pv1,
      nk1: readAllNk1(message),
      in1: readAllIn1(message),
    },
    null,
    2,
  ),
);
```

Output — this is the actual output of the code above, run against the
actual implementation (not hand-written):

```json
{
  "triggerEvent": "A01",
  "structurallyValid": true,
  "msh": {
    "fieldSeparator": "|",
    "encodingCharacters": "^~\\&",
    "sendingApplication": "TEST SENDING APP",
    "sendingFacility": "TEST SENDING FACILITY",
    "receivingApplication": "TEST RECEIVING APP",
    "receivingFacility": "TEST RECEIVING FACILITY",
    "dateTimeOfMessage": "20260110080000",
    "messageType": "ADT^A01^ADT_A01",
    "messageCode": "ADT",
    "triggerEvent": "A01",
    "messageStructure": "ADT_A01",
    "messageControlId": "TESTCTRLID00001",
    "processingId": "P",
    "versionId": "2.5.1"
  },
  "pid": {
    "setId": "1",
    "patientIdentifierList": ["MRN-TEST-00123^^^TEST FACILITY^MR"],
    "patientId": "MRN-TEST-00123",
    "patientName": ["TEST^PATIENT^A"],
    "familyName": "TEST",
    "givenName": "PATIENT",
    "middleName": "A",
    "dateOfBirth": "19800101",
    "sex": "M",
    "race": ["TEST-RACE-CODE"],
    "address": ["123 SAMPLE ST^^TESTVILLE^TS^00000^TESTLAND"],
    "addressStreet": "123 SAMPLE ST",
    "addressCity": "TESTVILLE",
    "addressState": "TS",
    "addressPostalCode": "00000",
    "homePhone": ["(555)555-0100"],
    "patientAccountNumber": "ACCT-TEST-00123",
    "ssnNumber": "999-99-9999"
  },
  "pv1": {
    "setId": "1",
    "patientClass": "I",
    "assignedPatientLocation": "TESTWARD^101^A^TEST FACILITY",
    "pointOfCare": "TESTWARD",
    "room": "101",
    "bed": "A",
    "admissionType": "R",
    "attendingDoctor": "1001^ATTENDING^TEST^A",
    "referringDoctor": "1002^REFERRING^TEST^B",
    "hospitalService": "SUR",
    "visitNumber": "VN-TEST-00123",
    "admitDateTime": "20260110080000"
  },
  "nk1": [
    {
      "setId": "1",
      "name": "TEST^NEXTOFKIN^A",
      "familyName": "TEST",
      "givenName": "NEXTOFKIN",
      "relationship": "SPO",
      "address": "123 SAMPLE ST^^TESTVILLE^TS^00000^TESTLAND",
      "phoneNumber": "(555)555-0101"
    }
  ],
  "in1": [
    {
      "setId": "1",
      "insurancePlanId": "PLAN-TEST-01^TEST INSURANCE PLAN",
      "insuranceCompanyId": "COMP-TEST-01",
      "insuranceCompanyName": "TEST INSURANCE COMPANY",
      "groupNumber": "GRP-TEST-01",
      "policyNumber": "POLICY-TEST-00123"
    }
  ]
}
```

All identifiers above are synthetic placeholders (`TEST^PATIENT`,
`MRN-TEST-*`, `TEST SENDING APP`, etc.) — see §6.1 of the developer
handover and `CONTRIBUTING.md` for the fixture rules this repo follows.

For a longer walkthrough covering ORU result-grouping, ORM order
association, validation, ACKs, non-default delimiters, and error handling,
see the [User Guide](./docs/USER_GUIDE.md).

## 5. Architecture

Full function-by-function signatures for everything below are in the
[API Reference](./docs/API_REFERENCE.md).

- **Tokenizer** (`src/tokenizer.ts`) — reads MSH-1 and MSH-2 from the raw
  message first, then splits it into segments (on the segment terminator),
  fields, repetitions, components, and subcomponents using the characters
  that specific message declared — never a hardcoded `| ^ ~ \ &`.
- **Generic model** (`src/types.ts`) — `Message { segments }`, `Segment {
  name, fields }`, with a `Field` type supporting repetition and
  component/subcomponent nesting, plus a generic `get(message, segment,
  field, component)` accessor that works for any segment name, typed or
  not.
- **Typed segments** (`src/segments/`) — documented field access for MSH,
  PID, PV1, ORC, OBR, OBX, NK1, and IN1. Full field list in
  [`docs/SEGMENT_REFERENCE.md`](./docs/SEGMENT_REFERENCE.md).
- **Message-type-aware parsing** (`src/message-types/`) — `parseAdt`
  (trigger event + required-structure check), `parseOru` (groups repeating
  OBR/OBX result sets without flattening them), and `parseOrm` (associates
  each ORC with its related OBR).
- **Escape handling** (`src/escape.ts`) — decodes `\F\ \S\ \T\ \R\ \E\`
  plus hex and Unicode escapes on parse, re-encodes them on serialize.
- **Serializer** (`src/serialize.ts`) — `serialize(message): string`,
  converts the parsed model back into pipe-delimited HL7 v2 using that
  message's own delimiter characters. Round-trip tested against every
  fixture type.
- **Validation** (`src/validate.ts`) — `validateMessage(message,
  messageType)` is a structural sanity check (required segments present),
  **not** implementation-guide conformance validation against a specific
  trading partner's profile.
- **ACK builder** (`src/ack.ts`) — `buildAck(inboundMessage, ackCode)`
  builds a basic MSA-based acknowledgement referencing the inbound
  message's control ID, for `AA`/`AE`/`AR`.

This is a pure parsing library: no MLLP/socket transport, no dependency on
any specific interface engine vendor, zero runtime dependencies.

## 6. Example Usage

- [User Guide](./docs/USER_GUIDE.md) — task-by-task walkthrough of every
  capability (parsing, typed segments, the generic accessor, ADT/ORU/ORM,
  validation, ACKs, serialization, non-default delimiters, error handling,
  troubleshooting).
- [`docs/examples/basic-adt-parse`](./docs/examples/basic-adt-parse) and
  [`docs/examples/oru-with-multiple-results`](./docs/examples/oru-with-multiple-results)
  — the ORU repeating-group case in particular is the correctness detail
  this repo cares most about, since flattening OBR/OBX groups silently
  loses which results belong to which order.

## 7. Roadmap

- [ ] MLLP transport (out of scope for this repo — see `SECURITY.md`; a
      future repo or documented integration example would cover the
      network/socket layer)
- [ ] HL7 v2-to-FHIR mapping (this repo's typed output is meant to be the
      input to that mapping, not the mapping itself)
- [ ] Additional message types beyond ADT/ORU/ORM (everything else already
      works through the generic segment/field accessor today)

## 8. Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Issues tagged `good first issue`
are a good place to start.

## 9. License

Apache License 2.0 — see [LICENSE](./LICENSE).

## 10. About Peerbits

hl7-parser is part of the [Peerbits HealthTech Open Source](https://github.com/PeerbitsSolution)
initiative — reusable engineering components extracted from our healthcare
technology work, published so other teams don't have to solve the same
problems from scratch. This repository contains generalized, reusable logic
only; it is not tied to any specific client engagement or commercial product.
