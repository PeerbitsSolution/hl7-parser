/**
 * ADT — trigger-event-aware structure (handover doc §5 FR4).
 *
 * Required structure per the handover doc (§9.1, §12): MSH + EVN + PID.
 * EVN has no typed segment model (not one of the eight segments in scope —
 * §5 FR3); it is checked for presence only, via the generic model.
 */
import { getMissingRequiredSegments } from "../validate.js";
import { readMsh, type Msh } from "../segments/msh.js";
import { readPid, type Pid } from "../segments/pid.js";
import { readPv1, type Pv1 } from "../segments/pv1.js";
import type { Message } from "../types.js";

export interface AdtMessage {
  /** MSH-9.2 — the trigger event, e.g. "A01", "A02", "A03", "A04", "A08". */
  triggerEvent: string | undefined;
  msh: Msh | undefined;
  pid: Pid | undefined;
  /** PV1 is optional in the generic HL7 v2.5.1 ADT abstract structure; present when read. */
  pv1: Pv1 | undefined;
  /** Required segments (MSH, EVN, PID) not found in this message, if any. */
  missingSegments: string[];
  /** True when all required ADT segments are present. */
  structurallyValid: boolean;
}

/** Parses an ADT message, identifying its trigger event and typed segment content. */
export function parseAdt(message: Message): AdtMessage {
  const missingSegments = getMissingRequiredSegments(message, "ADT");
  const msh = readMsh(message);
  return {
    triggerEvent: msh?.triggerEvent,
    msh,
    pid: readPid(message),
    pv1: readPv1(message),
    missingSegments,
    structurallyValid: missingSegments.length === 0,
  };
}
