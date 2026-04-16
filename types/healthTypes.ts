
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
  lmpBs: string;
  lmpAd: string;
  eddBs: string;
  eddAd: string;
  td1DateBs?: string | null;
  td1DateAd?: string | null;
  td2DateBs?: string | null;
  td2DateAd?: string | null;
  tdBoosterDateBs?: string | null;
  tdBoosterDateAd?: string | null;
  remarks?: string | null;
}

export interface ChildImmunizationVaccine {
  name: string;
  scheduledDateBs: string;
  scheduledDateAd: string;
  givenDateBs?: string | null;
  givenDateAd?: string | null;
  status: 'Pending' | 'Given' | 'Missed';
}

export interface ChildImmunizationRecord {
  id: string;
  fiscalYear: string;
  regNo: string;
  childName: string;
  gender: 'Male' | 'Female' | 'Other';
  dobBs: string;
  dobAd: string;
  jatCode?: string; 
  motherName: string;
  fatherName: string;
  address: string;
  phone: string;
  birthWeightKg?: number;
  vaccines: ChildImmunizationVaccine[];
  remarks?: string;
  vaccinationCenter?: string; // Added for center tracking
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
