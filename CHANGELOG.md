# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - TBD
First tagged release. Alpha — API may still change before 1.0.0. See
`docs/RELEASING.md` for how this version number gets published; the
maintainer running the release fills in the real date here at tag time.
### Added
- Delimiter-aware tokenizer reading MSH-1/MSH-2 to determine field,
  component, repetition, escape, and subcomponent characters per message.
- Generic `Message`/`Segment`/`Field` model with a `get()` accessor that
  works for any segment, including ones with no typed model.
- Typed segment accessors for MSH, PID, PV1, ORC, OBR, OBX, NK1, and IN1.
- Message-type-aware parsing for ADT (trigger-event identification), ORU
  (repeating OBR/OBX result groups, not flattened), and ORM (ORC/OBR
  association).
- HL7 v2 escape sequence decode/encode (`\F\ \S\ \T\ \R\ \E\`, hex, and
  Unicode escapes).
- `serialize()` — round-trip serialization back to pipe-delimited HL7 v2.
- `validateMessage()` — structural self-check for required segments per
  message type.
- `buildAck()` — MSA-based ACK/NAK builder for `AA`/`AE`/`AR`.
- Synthetic fixtures for ADT^A01, ORU^R01, and ORM^O01, plus invalid
  fixtures for a missing required segment and malformed delimiters.
- `docs/SEGMENT_REFERENCE.md` documenting every field the typed segments
  extract, sourced from HL7 v2.5.1.
