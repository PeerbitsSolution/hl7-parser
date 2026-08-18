/**
 * PID — Patient Identification (HL7 v2.5.1 §3.4.2).
 */
import {
  getAllRepetitions,
  getComponent,
  getField,
  getSegment,
  type Message,
  type Segment,
} from "../types.js";

export interface Pid {
  /** PID-1 — Set ID. */
  setId: string | undefined;
  /** PID-3 — Patient Identifier List (CX, repeating). Each entry is the full repetition, e.g. "MRN00123^^^TEST FACILITY^MR". */
  patientIdentifierList: string[];
  /** PID-3.1 of the first repetition — the identifier value itself, e.g. "MRN00123". */
  patientId: string | undefined;
  /** PID-5 — Patient Name (XPN, repeating). Each entry is the full repetition, e.g. "TEST^PATIENT^A". */
  patientName: string[];
  /** PID-5.1 of the first repetition — family name. */
  familyName: string | undefined;
  /** PID-5.2 of the first repetition — given name. */
  givenName: string | undefined;
  /** PID-5.3 of the first repetition — middle name/initial. */
  middleName: string | undefined;
  /** PID-7 — Date/Time of Birth (TS). */
  dateOfBirth: string | undefined;
  /** PID-8 — Administrative Sex. */
  sex: string | undefined;
  /** PID-10 — Race (CE, repeating). */
  race: string[];
  /** PID-11 — Patient Address (XAD, repeating). Each entry is the full repetition. */
  address: string[];
  /** PID-11.1 of the first repetition — street address. */
  addressStreet: string | undefined;
  /** PID-11.3 of the first repetition — city. */
  addressCity: string | undefined;
  /** PID-11.4 of the first repetition — state/province. */
  addressState: string | undefined;
  /** PID-11.5 of the first repetition — postal code. */
  addressPostalCode: string | undefined;
  /** PID-13 — Phone Number, Home (XTN, repeating). */
  homePhone: string[];
  /** PID-18 — Patient Account Number (CX). */
  patientAccountNumber: string | undefined;
  /** PID-19 — SSN Number (deprecated in later versions but present in v2.5.1). */
  ssnNumber: string | undefined;
}

export function readPidSegment(segment: Segment, message: Message): Pid {
  const patientIdField = getField(segment, 3);
  const nameField = getField(segment, 5);
  const raceField = getField(segment, 10);
  const addressField = getField(segment, 11);
  const homePhoneField = getField(segment, 13);

  return {
    setId: getComponent(message, getField(segment, 1)),
    patientIdentifierList: getAllRepetitions(message, patientIdField),
    patientId: getComponent(message, patientIdField, 1),
    patientName: getAllRepetitions(message, nameField),
    familyName: getComponent(message, nameField, 1),
    givenName: getComponent(message, nameField, 2),
    middleName: getComponent(message, nameField, 3),
    dateOfBirth: getComponent(message, getField(segment, 7)),
    sex: getComponent(message, getField(segment, 8)),
    race: getAllRepetitions(message, raceField),
    address: getAllRepetitions(message, addressField),
    addressStreet: getComponent(message, addressField, 1),
    addressCity: getComponent(message, addressField, 3),
    addressState: getComponent(message, addressField, 4),
    addressPostalCode: getComponent(message, addressField, 5),
    homePhone: getAllRepetitions(message, homePhoneField),
    patientAccountNumber: getComponent(message, getField(segment, 18)),
    ssnNumber: getComponent(message, getField(segment, 19)),
  };
}

/** Finds and reads the message's PID segment, if present. */
export function readPid(message: Message): Pid | undefined {
  const segment = getSegment(message, "PID");
  return segment ? readPidSegment(segment, message) : undefined;
}
