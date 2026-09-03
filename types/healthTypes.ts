
import { Signature } from './coreTypes';

export interface VaccinationDose {
  day: number;
  date: string; 
  dateBs?: string;
  status: 'Pending' | 'Given' | 'Missed';
  givenDate?: string;
}

export interface RabiesPatient {
  id: string;
  fiscalYear: string; 
  regNo: string;
  regNo_numeric?: number; 
  regMonth: string; 
  regDateBs: string; 
  regDateAd: string; 
  vaccineStartDateBs?: string;
  vaccineStartDateAd?: string;
  name: string;
  age: string; 
  sex: string;
  address: string;
  phone: string;
  animalType: string;
  exposureCategory: string; 
  bodyPart: string;
  exposureDateBs: string; 
  regimen: 'Intradermal' | 'Intramuscular';
  schedule: VaccinationDose[];
  // New fields for previous history
  hasPreviousVaccine?: boolean;
  previousVaccineDateBs?: string;
}

export interface TBReport {
  id?: string;
  month: number;
  result: string;
  labNo: string;
  date: string;
  dateNepali?: string;
  testDate?: string;
  grading?: string;
  geneXpertResult?: string;
  geneXpertLabNo?: string;
  geneXpertDate?: string;
  geneXpertDateNepali?: string;
  isInterFacility?: boolean;
  reportingOrgId?: string;
  reportingOrgName?: string;
}

export interface InterFacilityRequest {
  id: string;
  patientId: string;
  patientName: string;
  patientDetails?: Partial<TBPatient>;
  month: number;
  requestDate: string;
  requestDateBs: string;
  targetPalikaId?: string; // UID of the parent Palika
  targetPalikaName?: string;
  targetFacilityId: string; // UID of the target facility
  targetFacilityName: string;
  sourceOrgName: string; // Name of the requesting facility
  sourceOrgId: string; // UID of the requesting facility
  status: 'Pending' | 'Completed';
  viewedBySource?: boolean;
  report?: TBReport;
  result?: string;
  labNo?: string;
  completedDate?: string;
  completedDateBs?: string;
}

export interface TBPatient {
  id: string;
  patientId: string;
  name: string;
  age: string;
  address: string;
  phone: string;
  regType: string;
  classification: string;
  gender: 'Male' | 'Female' | 'Other';
  ethnicity: string;
  registrationDate: string;
  treatmentStartDate?: string; // Nepali date (BS)
  serviceType: 'TB' | 'Leprosy';
  leprosyType?: 'MB' | 'PB'; 
  weight?: string;
  regimen?: 'Adult' | 'Child';
  treatmentType?: string;
  labResultMonth2Positive?: boolean; 
  serviceSeekerId?: string;
  completedSchedule: number[];
  newReportAvailable?: boolean;
  latestResult?: string;
  latestReportMonth?: number;
  reports: TBReport[];
  dailyDoses?: string[]; // Array of YYYY-MM-DD strings representing days when medicine was taken/dispensed
  isDefaulter?: boolean;
  fiscalYear: string;
  status?: 'Active' | 'Transfer Out' | 'Completed' | 'Died' | 'Loss to Follow-up';
  statusDateBs?: string | null; // Date when the status was changed
  interFacilityRequests?: InterFacilityRequest[];
  intensivePhaseExtensionDays?: number;
  continuationPhaseExtensionDays?: number;
}

export interface GarbhawatiPatient {
  id: string;
  fiscalYear: string;
  regNo: string;
  name: string;
  age: string;
  address: string;
  phone: string;
  gravida: number;
  previousTdCount?: string;
  td1DateBs?: string | null;
  td1DateAd?: string | null;
  td1VaccinatedElsewhere?: boolean;
  td2DateBs?: string | null;
  td2DateAd?: string | null;
  td2VaccinatedElsewhere?: boolean;
  tdBoosterDateBs?: string | null;
  tdBoosterDateAd?: string | null;
  tdBoosterVaccinatedElsewhere?: boolean;
  remarks?: string | null;
  vaccinationCenter?: string | null;
}

export interface ChildImmunizationVaccine {
  name: string;
  cluster?: string;
  scheduledDateBs: string;
  scheduledDateAd: string;
  givenDateBs?: string | null;
  givenDateAd?: string | null;
  status: 'Pending' | 'Given' | 'Missed';
  vaccinatedElsewhere?: boolean;
}

export interface ChildImmunizationRecord {
  id: string;
  fiscalYear: string;
  regNo: string;
  childName: string;
  nameNotAssigned?: boolean;
  gender: 'Male' | 'Female' | 'Other';
  dobBs: string;
  dobAd: string;
  jatCode?: string; 
  motherName: string;
  fatherName: string;
  address: string;
  isOtherAddress?: boolean;
  phone: string;
  birthWeightKg?: number;
  regDateBs?: string;
  regDateAd?: string;
  vaccines: ChildImmunizationVaccine[];
  remarks?: string;
  vaccinationCenter?: string; // Added for center tracking
}

export function getChildDisplayName(record?: { nameNotAssigned?: boolean; childName?: string } | null): string {
  if (!record) return '';
  if (record.nameNotAssigned && (!record.childName || !record.childName.trim())) {
    return '(नाम अझै राखिएको छैन)';
  }
  return record.childName || (record.nameNotAssigned ? '(नाम अझै राखिएको छैन)' : '');
}

export function hasAssignedName(record?: { nameNotAssigned?: boolean; childName?: string } | null): boolean {
  if (!record) return false;
  if (record.nameNotAssigned && (!record.childName || !record.childName.trim())) {
    return false;
  }
  return Boolean(record.childName && record.childName.trim());
}

export interface PariwarSewaRecord {
  id: string;
  fiscalYear: string;
  dateBs: string;
  serviceSeekerId: string;
  patientName: string;
  patientId?: string;
  age: string;
  address: string;
  phone: string;
  
  // Temporary Methods
  tempMethod?: 'Condom' | 'Pills' | 'Depo' | 'IUCD' | 'Implant 5 yrs' | 'Implant 3 yrs' | 'Sayana Press' | 'Emergency Contraceptive' | '';
  userType?: 'New' | 'Current' | 'Discontinued' | '';
  quantity?: number;

  // Permanent Methods
  permMethod?: 'Minilap - Female' | 'Vasectomy - Male' | '';
  institutionType?: 'Government' | 'Non-Government' | '';
  location?: 'Health Facility' | 'Camp' | '';

  // Post-partum FP
  postPartumFP?: 'Within 48 hrs' | '48 hrs to 1 yr' | '';
  
  remarks?: string;
}

export interface XRayRecord {
  id: string;
  fiscalYear: string;
  dateBs: string;
  serviceSeekerId: string;
  patientName: string;
  patientId?: string;
  age: string;
  address: string;
  phone: string;
  xrayType: string[]; // e.g., Chest, Limb, etc.
  filmSize: string; // e.g., 8x10, 10x12, 12x15, 14x17
  quantity: number;
  result?: string;
  referredBy?: string; // Doctor or Service (OPD/ER)
  isViewedByDoctor?: boolean;
  remarks?: string;
}

export interface ECGRecord {
  id: string;
  fiscalYear: string;
  dateBs: string;
  serviceSeekerId: string;
  patientName: string;
  patientId?: string;
  age: string;
  address: string;
  phone: string;
  ecgType?: string; // e.g., Resting, Stress, etc.
  result?: string;
  referredBy?: string; // Doctor or Service (OPD/ER)
  isViewedByDoctor?: boolean;
  remarks?: string;
}

export interface USGRecord {
  id: string;
  fiscalYear: string;
  dateBs: string;
  serviceSeekerId: string;
  patientName: string;
  patientId?: string;
  age: string;
  address: string;
  phone: string;
  usgType: string[]; // e.g., Abdomen, Pelvis, Obstetric, etc.
  result?: string;
  referredBy?: string;
  isViewedByDoctor?: boolean;
  remarks?: string;
}

export interface PhysiotherapyRecord {
  id: string;
  fiscalYear: string;
  dateBs: string;
  serviceSeekerId: string;
  patientName: string;
  patientId?: string;
  age: string;
  address: string;
  phone: string;
  diagnosis: string;
  treatmentType: string; // e.g., Exercise, Modality, etc.
  sessionNumber: number;
  referredBy?: string;
  isViewedByDoctor?: boolean;
  remarks?: string;
}

export interface AmbulanceRecord {
  id: string;
  fiscalYear: string;
  dateBs: string;
  serviceSeekerId?: string;
  patientName: string;
  age?: string;
  billNo?: string;
  address?: string;
  phone?: string;
  driverName: string;
  ambulanceNo: string;
  startLocation: string;
  destination: string;
  distanceKm?: number;
  startOdometer?: number;
  endOdometer?: number;
  amountCharged: number;
  receivedAmount: number;
  remarks?: string;
}

export interface AmbulanceExpenseRecord {
  id: string;
  fiscalYear: string;
  dateBs: string;
  expenseCategory: string; // fuel, maintenance, driver_allowance, other
  amount: number;
  fuelLiters?: number;
  ambulanceNo?: string;
  billNo?: string;
  paidTo?: string;
  driverName?: string;
  remarks?: string;
}

export interface AmbulanceOdometerRecord {
  id: string;
  fiscalYear: string;
  month: string; // "04", "05", ..., "12", "01", "02", "03" or "1"..."12"
  monthName?: string;
  ambulanceNo?: string;
  driverName?: string;
  startOdometer: number;
  endOdometer: number;
  totalDistanceKm: number; // endOdometer - startOdometer
  fuelLiters?: number;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
  recordedAt?: string;
  recordedBy?: string;
}

export interface GaunGharClinicRecord {
  id: string;
  fiscalYear: string;
  dateBs: string;
  patientName: string;
  age: string;
  gender: 'Male' | 'Female' | 'Other';
  address: string;
  phone: string;
  serviceType: string;
  treatmentGiven: string;
  remarks?: string;
  createdBy?: string;
  _orgName?: string;
}

export interface AuditLogChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface AuditLogEntry {
  id: string;
  timestampMs: number;
  actorUid: string;
  actorName: string;
  actorRole: string;
  orgName: string;
  module: string;
  action: 'VACCINE_DOSE_UPDATED' | 'VACCINE_DOSE_RESET_TO_PENDING' | 'RECORD_CREATED' | 'RECORD_UPDATED' | 'RECORD_DELETED' | string;
  recordId: string;
  recordLabel: string;
  changes: AuditLogChange[];
}

export interface ColdChainEquipment {
  id: string;
  name: string; // e.g. "ILR Fridge 1", "Deep Freezer 2"
  type: 'ILR' | 'Deep Freezer' | 'Cold Box' | 'Other';
  serialNumber?: string;
  model?: string;
  location?: string;
  isActive: boolean;
  remarks?: string;
  _orgName?: string;
}

export interface ColdChainLogEntry {
  id: string;
  equipmentId: string;
  equipmentName: string;
  dateBs: string;
  dateAd: string;
  session: 'Morning' | 'Evening';
  tempCelsius: number;
  recordedBy: string;
  recordedByUid: string;
  isOutOfRange: boolean;
  remarks?: string;
  correctiveAction?: string;
  _orgName?: string;
}

export interface StoreRoom {
  id: string;
  name: string; // e.g. "मुख्य औषधि स्टोर (Main Medicine Store)", "खोप कक्ष (Vaccine Room)", "जिन्सी तथा सर्जिकल स्टोर (Surgical/General Store)"
  roomCode?: string;
  location?: string;
  minTempC: number; // default 15
  maxTempC: number; // default 25
  maxHumidityPercent?: number; // default 65
  isActive: boolean;
  remarks?: string;
  _orgName?: string;
}

export interface StoreTemperatureLogEntry {
  id: string;
  roomId: string;
  roomName: string;
  dateBs: string;
  dateAd: string;
  session: 'Morning' | 'Evening';
  tempCelsius: number;
  humidityPercent?: number;
  isOutOfRange: boolean;
  recordedBy: string;
  recordedByUid: string;
  remarks?: string;
  correctiveAction?: string;
  _orgName?: string;
}



