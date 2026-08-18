# Security Policy

## Reporting a vulnerability

If you believe you've found a security vulnerability in hl7-parser,
please **do not open a public issue**. Instead:

- Email: security@peerbits.com  <!-- TODO: confirm actual reporting address -->
- Or use GitHub's private vulnerability reporting: **Security -> Report a
  vulnerability** on this repo.

Please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept code if applicable)
- Any suggested remediation, if you have one

You should expect an acknowledgment within **3 business days**. We'll keep
you updated as we investigate and fix, and will credit you in the release
notes unless you'd prefer to stay anonymous.

## Supported versions

| Version | Supported |
|---|---|
| latest `1.x` | ✅ |
| < 1.0 | ❌ |

## What this repo does and does not contain

This is an open-source reference implementation maintained by Peerbits. It
is intended to be:

- **Spec-grounded** — segment/field definitions are grounded in HL7 v2.5.1
  (see README §5 Architecture and `docs/SEGMENT_REFERENCE.md`). This is a
  structural sanity check, not a certified conformance validator against any
  specific implementation guide.
- **Free of PHI** — no real patient data appears anywhere in this repo,
  including tests, fixtures, and examples. Every `.hl7` fixture is
  synthetic — invented patient names, MRNs, account numbers, and facility
  identifiers using obviously-placeholder conventions (e.g. `TEST^PATIENT`).
- **Free of production credentials** — this is a pure parsing library with
  no network, transport, or credential-handling surface at all.

## What this repo does NOT do

- No MLLP or other network transport — this parses HL7 v2 message content
  only. Sending/receiving over a wire is out of scope; see README §7 Roadmap.
- No HL7 v2-to-FHIR mapping.
- No hospital- or vendor-specific implementation-guide conformance checking.

If you're evaluating this library for a production interface engine, treat
`validateMessage()` as a structural sanity check, not a substitute for your
own conformance testing against your trading partner's actual profile.

## Scanning & dependency policy

- Dependabot is enabled on this repository for both npm and GitHub Actions
  dependencies (weekly).
- CodeQL static analysis runs on every push to `main` and every PR.
- A secret-scan (gitleaks) job runs in CI on every push and PR.
- Dependencies with a known critical/high CVE are patched or removed before
  the next tagged release; see `CHANGELOG.md` for disclosure of any that
  affected a released version.
