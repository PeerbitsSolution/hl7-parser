# Example: ORU with multiple result groups

This is the correctness-sensitive case this repo cares most about: an ORU
message where one order (OBR) has several results (OBX), and a second
OBR has its own separate set of results. The two groups must stay
separate — not get flattened into one list of OBX records.

```ts
import { parseMessage, parseOru } from "@peerbits/hl7-parser";
import { readFileSync } from "node:fs";

const raw = readFileSync("fixtures/valid/oru-r01-multi-result.hl7", "utf8");
const message = parseMessage(raw);
const oru = parseOru(message);

console.log(oru.resultGroups.length); // 2

for (const group of oru.resultGroups) {
  console.log(group.obr.universalServiceText, "->", group.results.length, "results");
}
// "COMPLETE BLOOD COUNT" -> 2 results
// "BASIC METABOLIC PANEL" -> 3 results

console.log(oru.resultGroups[0]?.results.map((r) => r.observationCode));
// ["WBC", "HGB"]
console.log(oru.resultGroups[1]?.results.map((r) => r.observationCode));
// ["NA", "K", "GLU"]
```

If you only need the flat list of every OBX in the message regardless of
which OBR it belongs to (e.g. for a simple display table), use the generic
`readAllObx(message)` from `src/segments/obx.ts` instead — but note that
loses the OBR association, which is exactly what `parseOru` exists to
preserve.

See `tests/message-types.test.ts` for the assertions that pin this
behavior down, and `docs/SEGMENT_REFERENCE.md` for the full OBR/OBX field
list.
