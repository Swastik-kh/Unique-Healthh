
import React from 'react';
import { InventoryItem } from './inventoryTypes';

export interface FiscalYear {
  id: string;
  label: string; 
  value: string; 
}

export interface Option {
  id: string;
  label: string;
  value: string;
  itemData?: InventoryItem; 
}

export interface LoginFormData {
  fiscalYear: string;
  username: string;
  password: string;
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'STOREKEEPER' | 'ACCOUNT' | 'APPROVAL' | 'HEALTH_SECTION';

export interface BiometricCredential {
  credentialId: string;
  publicKey: string;
  counter: number;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  organizationName: string;
  organizationId?: string; // Add this field
  fullName: string;
  designation: string;
  phoneNumber: string;
  allowedMenus?: string[]; 
  serviceType?: 'Permanent' | 'Temporary' | 'Contract';
  readNotifications?: string[];
  parentId?: string; // ID of the user who created this user
  createdAt?: string; // ISO date string
  subscriptionExpiryDate?: string; // ISO date string
  isSubscribed?: boolean;
  biometricCredential?: BiometricCredential;
  hasSaveAccess?: boolean;
  canDeleteBilling?: boolean;
  canEditBilling?: boolean;
  canDeleteAmbulance?: boolean;
  canManageMenu?: boolean;
  editAccessMenus?: string[];
  deleteAccessMenus?: string[];
  allowSmsAccess?: boolean; // Toggled by Super Admin in User Management
  smsQuota?: number; // Pre-set SMS limit
  smsUsedCount?: number; // Count of SMS sent
}

export interface WardConfig {
  id: string;
  name: string;
  bedCount: number;
}

export interface ConferenceGroup {
  id: string;
  name: string;
  createdBy: string; // User ID
  members: string[]; // Array of User IDs
  createdAt: string; // ISO date string
}

export interface ConferenceMessage {
  id: string;
  groupId: string;
  senderId: string;
  text: string;
  timestamp: string; // ISO date string
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  isEdited?: boolean;
}

export interface OrganizationSettings {
  orgNameNepali: string;
  orgNameEnglish: string;
  subTitleNepali: string;
  subTitleNepali2?: string;
  subTitleNepali3?: string;
  subTitleNepali4?: string;
  officeCode?: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  panNo: string;
  defaultVatRate: string;
  activeFiscalYear: string;
  enableEnglishDate: string;
  logoUrl: string;
  provinceLogoUrl?: string;
  ambulancePhone?: string; // Added field
  ambulanceNo?: string;
  ambulanceDriverName?: string;
  ambulanceRoutes?: string[]; // stored as "From|To|Rate"
  availableServices?: string[];
  allServiceOptions?: string[]; // Added for managing master list of services
  vaccinationSessions?: number[]; 
  vaccinationCenters?: string[]; // Added for managing centers
  vaccinationCenterDays?: Record<string, number[]>; // Added for managing days per center
  vaccineInventory?: Record<string, number>; // Added for tracking received vaccine doses/stock
  allowSmsAccess?: boolean; // Legacy/global toggle
  smsApiProvider?: string; // Universal SMS API Provider (e.g. Sparrow SMS, Aakash SMS, SMSBit)
  smsApiKey?: string; // Universal SMS API Token/Key
  smsSenderId?: string; // Universal SMS Sender ID / Identity
  smsApiUrl?: string; // Universal SMS API Endpoint URL
  smsCampaignId?: string; // SMSBit / SMS Pasal Campaign ID
  smsRouteId?: string; // SMSBit / SMS Pasal Route ID
  ipdWards?: WardConfig[]; 
  isSubscribed?: boolean;
  subscriptionExpiryDate?: string;
  medicineMappings?: Record<string, string[]>;
  customStandardMedicineNames?: string[];
  sewaBillingUserId?: string;
  ambulanceSewaUserId?: string;
  khopReportPreparerUserId?: string;
  vitaminAReportPreparerUserId?: string;
  vitaminAReportCertifierUserId?: string;
  hibBaseUrl?: string;
  hibUsername?: string;
  hibPassword?: string;
  hibRemoteUser?: string;
  hibPartnerId?: string;
  hibLocationId?: string;
  dhis2BaseUrl?: string;
  dhis2Username?: string;
  dhis2Password?: string;
  dhis2DataSetId?: string;
  dhis2OrgUnitId?: string;
  dhis2OrgUnitName?: string;
  dhis2DatasetMappings?: Record<string, string>;
  dhis2CellMappings?: DHIS2CellMapping[];
  menuConfig?: MenuConfigItem[];
}

export interface DHIS2CellMapping {
  id: string;
  sourceKey: string;
  dataElement: string;
  categoryOptionCombo: string;
}

export interface MenuConfigItem {
  id: string;
  subItems?: MenuConfigItem[];
}

export interface SubscriptionRequest {
  id: string;
  userId: string;
  username: string;
  organizationName: string;
  requestDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  durationDays?: number;
  approvedDate?: string;
}

export interface Signature {
  name: string;
  designation?: string;
  date?: string;
  purpose?: string;
}

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveApplication {
  id: string;
  userId: string;
  employeeName: string;
  designation: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedDate: string;
  rejectionReason?: string;
  approvedBy?: string;
  approverDesignation?: string;
  approvalDate?: string;
  fiscalYear?: string;
}

export type ServiceType = 'Permanent' | 'Temporary' | 'Contract';

export interface LeaveBalance {
  id: string;
  userId: string;
  employeeName: string;
  serviceType: ServiceType;
  casual: number;
  sick: number;
  festival: number;
  home: number;
  other: number;
  maternity: number;
  kiriya: number;
  study: number;
  extraordinary: number;
  lastAccrualMonth?: string; // YYYY-MM
  lastFiscalYearReset?: string; // YYYY
}

export interface Darta {
  id: string;
  registrationNumber: string;
  date: string;
  sender: string;
  subject: string;
  recipient: string;
  remarks?: string;
  fiscalYear: string;
  receivedLetterId?: string;
}

export interface ChalaniTable {
  headers: string[];
  rows: string[][];
  columnWidths?: number[];
  rowHeights?: number[];
}

export interface Chalani {
  id: string;
  dispatchNumber: string;
  date: string;
  recipient: string;
  recipientAddress?: string;
  subject: string;
  sender: string;
  senderDesignation?: string;
  remarks?: string;
  letterContent?: string;
  tableData?: ChalaniTable;
  fiscalYear: string;
}

export interface BharmanAdeshEntry {
  id: string;
  date: string;
  sankhya: string;
  chalaniNo: string;
  ksNo: string;
  employeeName: string;
  designation: string;
  office: string;
  destination: string;
  purpose: string;
  fromDate: string;
  toDate: string;
  transportMeans: string;
  travelAllowance: string;
  dailyAllowance: string;
  miscExpense: string;
  otherOrders: string;
  fiscalYear: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string;
  approverDesignation?: string;
  approvalDate?: string;
  rejectionReason?: string;
}

export interface GarbhawotiRecord {
  id: string;
  fiscalYear: string;
  serviceSeekerId?: string;
  name: string;
  husbandName: string;
  address: string;
  age: number;
  lmp: string; // Last Menstrual Period
  edd: string; // Estimated Date of Delivery
  gravida: number;
  ancDate: string;
  weight: number;
  bp: string;
  hb: string;
  ironTablets: number;
  ttDose: string;
}

export interface PartographEntry {
  id: string;
  time: string;
  fetalHeartRate: number;
  amnioticFluid: string; // I, C, M, B
  moulding: string; // 0, +, ++, +++
  cervicalDilation: number;
  descentOfHead: number;
  contractionsPer10Min: number;
  contractionDuration: number;
  oxytocinUUnitsPerMin?: string;
  oxytocinDropsPerMin?: string;
  drugsAndFluids?: string;
  maternalPulse: number;
  maternalBp: string;
  maternalTemp: number;
  urineProtein?: string;
  urineAcetone?: string;
  urineVolume?: string;
}

export interface PrasutiRecord {
  id: string;
  fiscalYear: string;
  serviceSeekerId?: string;
  garbhawotiId: string; // Link to GarbhawotiRecord
  name: string;
  deliveryDate: string;
  deliveryPlace: string;
  deliveredBy: string;
  deliveryOutcome: string; // Live birth, stillbirth
  newbornGender: 'Male' | 'Female' | 'Other';
  newbornWeight: number;
  complications: string;
  birthTime: string;
  transportAllowanceEligible: boolean;
  transportAllowanceReceived: boolean;
  incentiveAllowanceEligible: boolean;
  incentiveAllowanceReceived: boolean;
  partograph?: PartographEntry[];
}

export interface UttarPrasutiRecord {
  id: string;
  fiscalYear: string;
  prasutiId?: string; // Link to PrasutiRecord, now optional
  name: string;
  visitDate: string;
  findings: string;
  remarks?: string;
  // Mother's Health
  motherBp?: string;
  motherWeight?: number;
  motherTemp?: string;
  motherBreastfeeding?: string;
  motherLochia?: string;
  motherUterineInvolution?: string;
  motherGeneralCondition?: string;
  // Baby's Health
  babyWeight?: number;
  babyTemp?: string;
  babyBreastfeeding?: string;
  babyUmbilicalCord?: string;
  babyGeneralCondition?: string;
}

export interface ServiceSeekerRecord {
  id: string;
  uniquePatientId: string; // Unique ID for the patient
  registrationNumber: string;
  mulDartaNo?: string; // Added Mul Darta No
  date: string;
  name: string;
  age: string; // Keep for display/legacy
  ageYears?: number;
  ageMonths?: number;
  ageDays?: number;
  dobBs?: string;
  dobAd?: string;
  gender: 'Male' | 'Female' | 'Other';
  casteCode: string; // Caste/Ethnicity Code
  paloNo?: string; // Added Palo Number
  address: string;
  phone: string;
  serviceType: string; // OPD, Emergency, Vaccination, etc.
  visitType: 'New' | 'Follow-up'; // New or Follow-up
  paymentMode?: 'Cash' | 'HIB' | 'Free'; // Added for HIB auto-fill support
  insuranceNo?: string; // Added for HIB auto-fill support
  claimId?: string; // Added for HIB claim support
  serviceFee?: number; // Added field
  weight?: number;
  height?: number;
  muac?: number;
  fiscalYear: string;
  remarks?: string;
}

export interface PrescriptionItem {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface OPDRecord {
  id: string;
  fiscalYear: string;
  serviceSeekerId: string;
  uniquePatientId: string;
  visitDate: string;
  chiefComplaints: string;
  diagnosis: string;
  investigation: string;
  prescriptions: PrescriptionItem[];
  advice?: string;
  nextVisitDate?: string;
}

export interface EmergencyRecord {
  id: string;
  fiscalYear: string;
  serviceSeekerId: string;
  uniquePatientId: string;
  visitDate: string;
  chiefComplaints: string;
  diagnosis: string;
  investigation: string;
  emergencyPrescriptions: PrescriptionItem[];
  dischargePrescriptions: PrescriptionItem[];
  advice?: string;
  nextVisitDate?: string;
  triage?: 'Red' | 'Yellow' | 'Green' | 'Black';
  vitals?: {
    temp?: string;
    bp?: string;
    pulse?: string;
    rr?: string;
    spo2?: string;
  };
}

export interface CBIMNCIRecord {
  id: string;
  fiscalYear: string;
  serviceSeekerId: string;
  uniquePatientId: string;
  visitDate: string;
  moduleType: 'Infant' | 'Child'; // Infant: up to 2 months, Child: 2 months to 5 years
  assessmentData: any; // Flexible object for module-specific data
  chiefComplaints: string;
  diagnosis: string;
  investigation: string;
  prescriptions: PrescriptionItem[];
  advice?: string;
  nextVisitDate?: string;
  isRefer?: boolean;
  isDeath?: boolean;
  followupDays?: number;
  isFollowup?: boolean;
}

export interface FamilyPlanningRecord {
  id: string;
  serviceSeekerId: string;
  uniquePatientId: string;
  fiscalYear: string;
  visitDate: string;
  
  methodType: 'Temporary' | 'Permanent';
  methodName: string; 
  
  // Temporary Methods
  userType?: 'New' | 'Current' | 'Discontinued';
  quantityDistributed?: number;
  
  // Permanent Methods
  institutionType?: 'Government' | 'Non-Government';
  locationType?: 'Health Facility' | 'Camp';
  
  // Post-partum Family Planning
  isPostPartum?: boolean;
  postPartumTiming?: 'Within 48 hours' | '48 hours to 1 year';
  
  remarks?: string;
}

export interface DispensaryRecord {
  id: string;
  fiscalYear: string;
  serviceSeekerId: string;
  uniquePatientId: string;
  patientName: string;
  dispenseDate: string;
  storeId: string;
  items: {
    medicineName: string;
    quantity: number;
    unit?: string;
    batchNo?: string;
    expiryDate?: string;
    dosage: string;
    instructions?: string;
  }[];
  remarks?: string;
  createdBy?: string;
}

export interface BillingItem {
  id: string;
  serviceName: string;
  price: number;
  quantity: number;
  total: number;
  itemCode?: string;
  remarks?: string; // Added optional remarks field for tests
  category?: string; // Original category of the service from settings
  isRefunded?: boolean;
  refundedQty?: number;
  refundRemarks?: string;
  refundDateBs?: string;
}

export interface BillingRecord {
  id: string;
  fiscalYear: string;
  billDate: string;
  invoiceNumber: string;
  manualInvoiceNumber?: string; // Add optional manual invoice number
  serviceSeekerId: string;
  patientName: string;
  items: BillingItem[];
  subTotal: number;
  discount: number;
  grandTotal: number;
  paymentMode: 'Cash' | 'Online' | 'Credit' | 'Bima'; // Extended payment modes with Bima
  remarks?: string;
  createdBy?: string;
  insuranceNo?: string; // Healthcare insurance identifier
  claimCode?: string; // Official autogenerated claim code (MR)
  claimStatus?: 'Draft' | 'Submitted' | 'Verified' | 'Error'; // Claim adjudication state
  isDirectBilling?: boolean; // Flag to identify direct billing records
  referredBy?: string; // Recommended/referred by user (ID or name)
  refundedAmount?: number;
  refundStatus?: 'Refunded' | 'Partially_Refunded';
  refundRemarks?: string;
  refundDateBs?: string;
  passcode?: string; // 8-character unique online report passcode (with 2 alphabets)
}

export interface SubTest {
  id: string;
  testName: string;
  valueRange?: string;
  unit?: string;
  price: number; // Added price
}

export interface ServiceItem {
  id: string;
  serviceName: string;
  category: string; // e.g., OPD, Lab, X-Ray, etc.
  rate: number;
  valueRange?: string; // Only for Lab Investigation
  unit?: string; // Only for Lab Investigation
  subTests?: SubTest[]; // Added sub-tests
  fiscalYear: string;
}

export interface LabTestResult {
  id: string;
  testName: string;
  result: string;
  normalRange?: string;
  unit?: string;
  remarks?: string;
  sampleCollected?: boolean;
  sampleCollectedDate?: string;
  sampleCollectedBy?: string;
  barcodeId?: string; // Added barcodeId
  parentTestName?: string; // Added parentTestName
}

export interface LabReport {
  id: string;
  fiscalYear: string;
  reportDate: string;
  serviceSeekerId: string;
  patientName: string;
  age: string;
  gender: string;
  referredBy?: string;
  invoiceNumber?: string;
  tests: LabTestResult[];
  status: 'Sample Pending' | 'Sample Collected' | 'Completed';
  isViewedByDoctor?: boolean;
  createdBy?: string;
  barcodeId?: string; // Added barcodeId to LabReport
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  time?: string;
  endDate?: string;
  remarks?: string;
}

export interface IPDRecord {
  id: string;
  fiscalYear: string;
  serviceSeekerId: string;
  uniquePatientId: string;
  patientName: string;
  age: string;
  gender: string;
  admissionDate: string;
  admissionTime: string;
  dischargeDate?: string;
  dischargeTime?: string;
  bedNumber: string;
  wardName: string;
  provisionalDiagnosis: string;
  finalDiagnosis?: string;
  chiefComplaints: string;
  historyOfPresentIllness: string;
  pastHistory?: string;
  physicalExamination?: string;
  investigations?: string;
  treatmentGiven?: string;
  medications?: Medication[];
  dischargeMedications?: Medication[];
  dischargeAdvice?: string;
  status: 'Admitted' | 'Discharged' | 'Referred' | 'LAMA' | 'Death';
  createdBy?: string;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
  helperText?: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Option[] | FiscalYear[];
  error?: string;
  icon?: React.ReactNode;
  placeholder?: string;
  helperText?: string;
}

export interface SentLetter {
  id: string;
  chalaniId: string;
  dispatchNumber: string;
  date: string;
  sender: string;
  senderDesignation?: string;
  recipient: string;
  recipientAddress?: string;
  subject: string;
  remarks?: string;
  letterContent?: string;
  tableData?: ChalaniTable;
  fiscalYear: string;
  recipientOrgName: string;
  sentAt: string;
  senderSettings?: OrganizationSettings;
}

export interface ReceivedLetter {
  id: string;
  chalaniId: string;
  dispatchNumber: string;
  date: string;
  sender: string;
  senderDesignation?: string;
  recipient: string;
  recipientAddress?: string;
  subject: string;
  letterContent?: string;
  tableData?: ChalaniTable;
  fiscalYear: string;
  senderOrgName: string;
  receivedAt: string;
  isRead?: boolean;
  senderSettings?: OrganizationSettings;
}

export interface Talim {
  id: string;
  name: string;
  durationDays: number;
}

export interface KarmachariTalimRecord {
  id: string;
  userId: string;
  talimId: string;
  fromDate: string;
  toDate: string;
  location: string;
}

export interface UserActivityLog {
  id: string;
  userId: string;
  username: string;
  eventType: 'login' | 'logout' | 'activity';
  timestamp: string; // ISO date string
  durationMinutes?: number;
  fiscalYear: string;
}
