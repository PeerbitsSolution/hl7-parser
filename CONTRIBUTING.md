# Contributing to hl7-parser

Thanks for considering a contribution. This repo is part of the Peerbits
HealthTech Open Source initiative — small, focused, spec-grounded tools, not
full products. Contributions that keep that scope are the easiest to accept.

## Before you start

- Check open issues first — especially ones tagged `good first issue` or
  `help wanted`.
- For anything non-trivial (new segment, new message type, API change),
  open an issue to discuss the approach before writing code. Segment/field
  positions must be grounded in the HL7 v2.5.1 standard — cite the field
  you're adding, don't infer it from a similar-looking segment.
- This repo intentionally does **not** accept:
  - MLLP or any network/socket transport (see README §7 Roadmap — it's an
    explicit future direction, not something to add ad hoc)
  - HL7 v2-to-FHIR mapping logic
  - Client-specific or vendor-specific Z-segments or profiles
  - Real, captured, or redacted interface-engine traffic as a starting
    point for a fixture, even "just for local testing"

## Development setup

```bash
git clone https://github.com/PeerbitsSolution/hl7-parser.git
cd hl7-parser
npm install
npm test
```

## Making a change

1. Fork the repo and create a branch off `main`:
   `git checkout -b feature/short-description` or `fix/short-description`.
2. Write the code and the tests together — a PR that adds behavior without
   a test covering it will be asked to add one before merge.
3. Run the full check locally before opening a PR:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```
4. Keep commits small and messages descriptive. Conventional Commits style
   is preferred (`fix:`, `feat:`, `docs:`, `chore:`) but not strictly enforced.
5. Open a PR against `main` using the PR template. Link the issue it
   addresses.

## Fixture rules (read before adding or editing anything under `/fixtures`)

Every `.hl7` fixture must be **obviously synthetic**:
- Invented patient names using an industry-standard placeholder convention
  (e.g. `TEST^PATIENT`), never a fabricated-but-plausible individual case.
- Invented MRNs, account numbers, and control IDs.
- Invented facility and sending-application identifiers that do not
  resemble any real vendor's or client's actual interface engine config.
- Never start from real, captured, or redacted production HL7 traffic and
  try to sanitize it — write it from scratch against the spec instead.

## Coding conventions

- TypeScript, strict mode. No `any` without a comment explaining why it's
  unavoidable.
- Runtime code in `/src` stays dependency-free — no third-party HL7 parsing
  library, no framework dependency.
- Public API surface stays typed and exported from `src/index.ts`; internal
  modules are not part of the stability contract.
- Do not hardcode HL7 delimiter characters (`| ^ ~ \ &`) anywhere in parsing
  logic — always read them from the message's own MSH-1/MSH-2.

## What we will not merge

- Anything containing real patient data, real credentials, or client-
  identifying content (see `SECURITY.md`).
- MLLP/network transport, HL7-to-FHIR mapping, or client-specific profiles
  (see README §7 Roadmap for what's actually planned).
- Breaking API changes without a version bump discussion (see
  `CHANGELOG.md` and semver policy).

## Code of conduct

Be direct, be kind, assume good faith. Disagreements about approach are
fine and expected; personal attacks or dismissiveness aren't.

## Questions

Open an issue with the `question` label, or start a discussion if the repo
has GitHub Discussions enabled.
