/**
 * ORM/ORC — associates each ORC (order control) with its related OBR
 * (handover doc §5 FR4). Per the HL7 v2.5.1 ORM^O01 abstract structure,
 * an ORDER group is one ORC followed by its OBR (and any order-detail
 * segments in between); each ORC in the message is associated with the
 * next OBR that follows it, before the next ORC (or end of message).
 *
 * Required structure: MSH + PID + ORC + OBR, consistent with §9.1's ORM
 * scope ("ORM's ORC/OBR association is correct") — no explicit required-
 * segment list is given for ORM elsewhere in the spec, so this mirrors the
 * ADT/ORU pattern of "header + patient + the segments this message type is
 * actually about."
 */
import { getMissingRequiredSegments } from "../validate.js";
import { readMsh, type Msh } from "../segments/msh.js";
import { readPid, type Pid } from "../segments/pid.js";
import { readOrcSegment, type Orc } from "../segments/orc.js";
import { readObrSegment, type Obr } from "../segments/obr.js";
import type { Message } from "../types.js";

export interface OrmOrderGroup {
  orc: Orc;
  /** The OBR associated with this ORC, if one follows it. */
  obr: Obr | undefined;
}

export interface OrmMessage {
  msh: Msh | undefined;
  pid: Pid | undefined;
  /** One entry per ORC in the message, each paired with its related OBR. */
  orderGroups: OrmOrderGroup[];
  /** Required segments (MSH, PID, ORC, OBR) not found in this message, if any. */
  missingSegments: string[];
  /** True when all required ORM segments are present. */
  structurallyValid: boolean;
}

/** Parses an ORM message, associating each ORC with its related OBR. */
export function parseOrm(message: Message): OrmMessage {
  const orderGroups: OrmOrderGroup[] = [];
  let currentGroup: OrmOrderGroup | undefined;

  for (const segment of message.segments) {
    if (segment.name === "ORC") {
      currentGroup = { orc: readOrcSegment(segment, message), obr: undefined };
      orderGroups.push(currentGroup);
    } else if (segment.name === "OBR" && currentGroup && currentGroup.obr === undefined) {
      currentGroup.obr = readObrSegment(segment, message);
    }
  }

  const missingSegments = getMissingRequiredSegments(message, "ORM");
  return {
    msh: readMsh(message),
    pid: readPid(message),
    orderGroups,
    missingSegments,
    structurallyValid: missingSegments.length === 0,
  };
}
