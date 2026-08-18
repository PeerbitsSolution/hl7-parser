# Example: basic ADT parse

Parses a synthetic ADT^A01 (admit) message and reads typed patient/visit
fields from it, using the generic model for anything not covered by the
typed accessors.

```ts
import { parseMessage, readMsh, readPid, readPv1 } from "@peerbits/hl7-parser";

const raw = [
  "MSH|^~\\&|TEST SENDING APP|TEST SENDING FACILITY|TEST RECEIVING APP|TEST RECEIVING FACILITY|20260110080000||ADT^A01^ADT_A01|TESTCTRLID00001|P|2.5.1",
  "EVN|A01|20260110080000",
  "PID|1||MRN-TEST-00123^^^TEST FACILITY^MR||TEST^PATIENT^A||19800101|M",
  "PV1|1|I|TESTWARD^101^A^TEST FACILITY",
].join("\r");

const message = parseMessage(raw);

const msh = readMsh(message);
console.log(msh?.messageCode, msh?.triggerEvent); // "ADT" "A01"

const pid = readPid(message);
console.log(pid?.patientId, pid?.familyName, pid?.givenName);
// "MRN-TEST-00123" "TEST" "PATIENT"

const pv1 = readPv1(message);
console.log(pv1?.patientClass, pv1?.pointOfCare); // "I" "TESTWARD"
```

For the higher-level, trigger-event-aware view (which also runs the
required-segment check), use `parseAdt` instead of reading each segment
individually:

```ts
import { parseAdt } from "@peerbits/hl7-parser";

const adt = parseAdt(message);
console.log(adt.triggerEvent); // "A01"
console.log(adt.structurallyValid); // true — MSH, EVN, and PID are all present
```

See the full generator-produced input/output pair in the README's Quick
Start section, and `fixtures/valid/adt-a01-admit.hl7` for a fuller
synthetic message with NK1/IN1 segments included.
