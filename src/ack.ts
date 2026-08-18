/**
 * ACK/NAK builder (handover doc §5 FR8) — constructs a basic MSA-based
 * acknowledgement message referencing the inbound message's control ID.
 * Supported acknowledgement codes are exactly AA (accept), AE (error), and
 * AR (reject) — no additional acknowledgement protocol is implemented.
 */
import { readMsh } from "./segments/msh.js";
import { DEFAULT_ENCODING_CHARACTERS, type EncodingCharacters, type Field, type Message, type Segment } from "./types.js";

export type AckCode = "AA" | "AE" | "AR";

export interface BuildAckOptions {
  /**
   * The ACK message's own MSH-10 (Message Control ID). Defaults to a
   * generated value if not supplied — callers that need a specific
   * scheme (e.g. matching their own interface engine's ID generation)
   * should pass one explicitly.
   */
  controlId?: string;
}

function scalarField(value: string): Field {
  return [[[value]]];
}

function generateControlId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

function formatHl7Timestamp(date: Date): string {
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
}

/**
 * Builds a basic MSA-based acknowledgement to `inboundMessage`. The ACK's
 * MSH swaps sending/receiving application and facility relative to the
 * inbound message (the ACK is sent back to whoever sent the original), and
 * its MSA segment references the inbound message's MSH-10 control ID.
 */
export function buildAck(inboundMessage: Message, ackCode: AckCode, options: BuildAckOptions = {}): Message {
  const inboundMsh = readMsh(inboundMessage);
  const enc: EncodingCharacters = inboundMessage.encodingCharacters ?? DEFAULT_ENCODING_CHARACTERS;

  const controlId = options.controlId ?? generateControlId();
  const encodingCharsRaw = `${enc.component}${enc.repetition}${enc.escape}${enc.subcomponent}`;

  const mshFields: Field[] = [
    scalarField(enc.field), // MSH-1
    scalarField(encodingCharsRaw), // MSH-2
    scalarField(inboundMsh?.receivingApplication ?? ""), // MSH-3 sending app (swapped)
    scalarField(inboundMsh?.receivingFacility ?? ""), // MSH-4 sending facility (swapped)
    scalarField(inboundMsh?.sendingApplication ?? ""), // MSH-5 receiving app (swapped)
    scalarField(inboundMsh?.sendingFacility ?? ""), // MSH-6 receiving facility (swapped)
    scalarField(formatHl7Timestamp(new Date())), // MSH-7
    scalarField(""), // MSH-8 security (unused)
    [[["ACK"], [inboundMsh?.triggerEvent ?? ""], ["ACK"]]], // MSH-9 message type: ACK^<trigger>^ACK
    scalarField(controlId), // MSH-10
    scalarField(inboundMsh?.processingId ?? "P"), // MSH-11
    scalarField(inboundMsh?.versionId ?? "2.5.1"), // MSH-12
  ];

  const mshSegment: Segment = { name: "MSH", fields: mshFields };

  const msaSegment: Segment = {
    name: "MSA",
    fields: [
      scalarField(ackCode), // MSA-1 Acknowledgment Code
      scalarField(inboundMsh?.messageControlId ?? ""), // MSA-2 Message Control ID (references inbound)
    ],
  };

  return {
    segments: [mshSegment, msaSegment],
    encodingCharacters: enc,
  };
}
