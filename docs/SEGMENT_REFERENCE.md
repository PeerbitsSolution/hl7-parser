# Segment Reference

This is the field-level audit trail for the typed accessors in `src/segments/`.
Field positions are grounded in **HL7 v2.5.1**, the baseline version this
repo targets (see README §5 Architecture). This documents the fields the
typed models extract — it is not a complete restatement of every field HL7
v2.5.1 defines for each segment, and it is **not** a substitute for
implementation-guide-specific conformance validation (see `SECURITY.md`
and `src/validate.ts`).

Every segment is also reachable through the generic accessor
(`get(message, segmentName, fieldIndex, componentIndex)`, or `getSegment`/
`getField`/`getComponent` for lower-level access) for any field not listed
here, and for any segment not listed here at all — including Z-segments,
which this repo treats as unsupported/pass-through-only.

"Full value" below means every component of the field, rejoined with the
message's own component separator (e.g. `"2W^204^A"`); a specific
component number (e.g. "PID-5.1") means just that one piece.

---

## MSH — Message Header

| Field | Name | Repo field | Notes |
|---|---|---|---|
| MSH-1 | Field Separator | `fieldSeparator` | The delimiter character itself |
| MSH-2 | Encoding Characters | `encodingCharacters` | Raw 4-character string, e.g. `^~\&` |
| MSH-3.1 | Sending Application | `sendingApplication` | |
| MSH-4.1 | Sending Facility | `sendingFacility` | |
| MSH-5.1 | Receiving Application | `receivingApplication` | |
| MSH-6.1 | Receiving Facility | `receivingFacility` | |
| MSH-7 | Date/Time of Message | `dateTimeOfMessage` | TS, raw string (not date-parsed) |
| MSH-9 | Message Type | `messageType` | Full value, e.g. `ADT^A01^ADT_A01` |
| MSH-9.1 | Message Code | `messageCode` | e.g. `ADT` |
| MSH-9.2 | Trigger Event | `triggerEvent` | e.g. `A01` |
| MSH-9.3 | Message Structure | `messageStructure` | e.g. `ADT_A01` |
| MSH-10 | Message Control ID | `messageControlId` | |
| MSH-11.1 | Processing ID | `processingId` | e.g. `P`, `T`, `D` |
| MSH-12.1 | Version ID | `versionId` | e.g. `2.5.1` |

## PID — Patient Identification

| Field | Name | Repo field | Notes |
|---|---|---|---|
| PID-1 | Set ID | `setId` | |
| PID-3 | Patient Identifier List | `patientIdentifierList` | Every repetition, full value |
| PID-3.1 (rep 1) | Patient ID | `patientId` | |
| PID-5 | Patient Name | `patientName` | Every repetition, full value |
| PID-5.1 (rep 1) | Family Name | `familyName` | |
| PID-5.2 (rep 1) | Given Name | `givenName` | |
| PID-5.3 (rep 1) | Middle Name/Initial | `middleName` | |
| PID-7 | Date/Time of Birth | `dateOfBirth` | TS, raw string |
| PID-8 | Administrative Sex | `sex` | |
| PID-10 | Race | `race` | Every repetition, full value |
| PID-11 | Patient Address | `address` | Every repetition, full value |
| PID-11.1 (rep 1) | Street Address | `addressStreet` | |
| PID-11.3 (rep 1) | City | `addressCity` | |
| PID-11.4 (rep 1) | State/Province | `addressState` | |
| PID-11.5 (rep 1) | Postal Code | `addressPostalCode` | |
| PID-13 | Phone Number, Home | `homePhone` | Every repetition, full value |
| PID-18 | Patient Account Number | `patientAccountNumber` | Component 1 |
| PID-19 | SSN Number | `ssnNumber` | Present in v2.5.1; deprecated in later versions |

## PV1 — Patient Visit

| Field | Name | Repo field | Notes |
|---|---|---|---|
| PV1-1 | Set ID | `setId` | |
| PV1-2 | Patient Class | `patientClass` | e.g. `I`, `O`, `E` |
| PV1-3 | Assigned Patient Location | `assignedPatientLocation` | Full value |
| PV1-3.1 | Point of Care | `pointOfCare` | |
| PV1-3.2 | Room | `room` | |
| PV1-3.3 | Bed | `bed` | |
| PV1-4 | Admission Type | `admissionType` | |
| PV1-7 | Attending Doctor | `attendingDoctor` | Full value |
| PV1-8 | Referring Doctor | `referringDoctor` | Full value |
| PV1-10 | Hospital Service | `hospitalService` | |
| PV1-19.1 | Visit Number | `visitNumber` | |
| PV1-44 | Admit Date/Time | `admitDateTime` | TS, raw string |
| PV1-45 | Discharge Date/Time | `dischargeDateTime` | TS, raw string |

## ORC — Common Order

| Field | Name | Repo field | Notes |
|---|---|---|---|
| ORC-1 | Order Control | `orderControl` | e.g. `NW`, `CA`, `SC` |
| ORC-2.1 | Placer Order Number | `placerOrderNumber` | |
| ORC-3.1 | Filler Order Number | `fillerOrderNumber` | |
| ORC-5 | Order Status | `orderStatus` | |
| ORC-9 | Date/Time of Transaction | `dateTimeOfTransaction` | TS, raw string |
| ORC-12 | Ordering Provider | `orderingProvider` | Full value |

## OBR — Observation Request

| Field | Name | Repo field | Notes |
|---|---|---|---|
| OBR-1 | Set ID | `setId` | |
| OBR-2.1 | Placer Order Number | `placerOrderNumber` | |
| OBR-3.1 | Filler Order Number | `fillerOrderNumber` | |
| OBR-4 | Universal Service Identifier | `universalServiceIdentifier` | Full value |
| OBR-4.1 | Universal Service ID code | `universalServiceCode` | |
| OBR-4.2 | Universal Service ID text | `universalServiceText` | |
| OBR-7 | Observation Date/Time | `observationDateTime` | TS, raw string |
| OBR-16 | Ordering Provider | `orderingProvider` | Full value |
| OBR-22 | Results Rpt/Status Chng Date/Time | `resultsReportStatusChangeDateTime` | TS, raw string |
| OBR-25 | Result Status | `resultStatus` | e.g. `F`, `P`, `C`, `O` |

## OBX — Observation/Result

| Field | Name | Repo field | Notes |
|---|---|---|---|
| OBX-1 | Set ID | `setId` | |
| OBX-2 | Value Type | `valueType` | e.g. `NM`, `ST`, `CE` |
| OBX-3 | Observation Identifier | `observationIdentifier` | Full value |
| OBX-3.1 | Observation ID code | `observationCode` | |
| OBX-3.2 | Observation ID text | `observationText` | |
| OBX-5 | Observation Value | `observationValue` | Full value; shape depends on OBX-2 |
| OBX-6 | Units | `units` | Full value |
| OBX-7 | References Range | `referenceRange` | |
| OBX-8 | Abnormal Flags | `abnormalFlags` | |
| OBX-11 | Observation Result Status | `observationResultStatus` | e.g. `F`, `P`, `C` |
| OBX-14 | Date/Time of the Observation | `dateTimeOfObservation` | TS, raw string |

## NK1 — Next of Kin / Associated Parties

| Field | Name | Repo field | Notes |
|---|---|---|---|
| NK1-1 | Set ID | `setId` | |
| NK1-2 | Name | `name` | Full value |
| NK1-2.1 | Family Name | `familyName` | |
| NK1-2.2 | Given Name | `givenName` | |
| NK1-3 | Relationship | `relationship` | Full value |
| NK1-4 | Address | `address` | Full value |
| NK1-5 | Phone Number | `phoneNumber` | Full value |

## IN1 — Insurance

| Field | Name | Repo field | Notes |
|---|---|---|---|
| IN1-1 | Set ID | `setId` | |
| IN1-2 | Insurance Plan ID | `insurancePlanId` | Full value |
| IN1-3.1 | Insurance Company ID | `insuranceCompanyId` | First repetition |
| IN1-4 | Insurance Company Name | `insuranceCompanyName` | Full value |
| IN1-8 | Group Number | `groupNumber` | |
| IN1-36 | Policy Number | `policyNumber` | |

---

## Message-type structural requirements (`validateMessage`)

`src/validate.ts` checks for these required segments per message type. This
is a structural sanity check, not implementation-guide conformance:

| Message type | Required segments |
|---|---|
| ADT | MSH, EVN, PID |
| ORU | MSH, PID, OBR, OBX |
| ORM | MSH, PID, ORC, OBR |

EVN has no typed segment model in this repo (it's not one of the eight
segments in scope) — its presence is checked through the generic model only.

## Review status

Flagged in the developer handover doc (§15) as needing review by someone
with real interface-engine experience, not just spec-reading, before the
v1.0.0 release — the same category of extra scrutiny given to clinical and
compliance-sensitive repos elsewhere in this initiative.
