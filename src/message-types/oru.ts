/**
 * ORU — repeating OBR/OBX result-group handling (handover doc §5 FR4).
 *
 * This is the single easiest correctness mistake in this repo: an ORU
 * message can carry multiple OBR (order) segments, each followed by its
 * own set of OBX (result) segments, and that grouping must be preserved —
 * NOT flattened into one flat list of OBX records. Each OBX belongs to
 * whichever OBR most recently preceded it in segment order.
 *
 * Required structure per the handover doc (§9.1, §12): MSH + PID + OBR + OBX.
 */
import { getMissingRequiredSegments } from "../validate.js";
import { readMsh, type Msh } from "../segments/msh.js";
import { readPid, type Pid } from "../segments/pid.js";
import { readObrSegment, type Obr } from "../segments/obr.js";
import { readObxSegment, type Obx } from "../segments/obx.js";
import type { Message } from "../types.js";

export interface OruResultGroup {
  obr: Obr;
  /** Every OBX that followed this OBR, before the next OBR (or end of message). */
  results: Obx[];
}

export interface OruMessage {
  msh: Msh | undefined;
  pid: Pid | undefined;
  /** One entry per OBR in the message, each with its own (unflattened) OBX results. */
  resultGroups: OruResultGroup[];
  /** Required segments (MSH, PID, OBR, OBX) not found in this message, if any. */
  missingSegments: string[];
  /** True when all required ORU segments are present. */
  structurallyValid: boolean;
}

/** Parses an ORU message, grouping each OBR with its own repeating OBX result set. */
export function parseOru(message: Message): OruMessage {
  const resultGroups: OruResultGroup[] = [];
  let currentGroup: OruResultGroup | undefined;

  for (const segment of message.segments) {
    if (segment.name === "OBR") {
      currentGroup = { obr: readObrSegment(segment, message), results: [] };
      resultGroups.push(currentGroup);
    } else if (segment.name === "OBX" && currentGroup) {
      currentGroup.results.push(readObxSegment(segment, message));
    }
  }

  const missingSegments = getMissingRequiredSegments(message, "ORU");
  return {
    msh: readMsh(message),
    pid: readPid(message),
    resultGroups,
    missingSegments,
    structurallyValid: missingSegments.length === 0,
  };
}
