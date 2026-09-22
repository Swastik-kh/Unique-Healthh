import { Timestamp } from 'firebase/firestore';

export interface FinancialProgram {
  id: string;
  name: string;
  source?: 'Nagarpalika' | 'Wada' | 'Internal' | 'Other';
  totalBudget: number;
  spentAmount: number;
  fiscalYear: string;
  createdAt: string;
}

export interface ListedParty {
  id: string;
  name: string;
  panNumber: string;
  address: string;
  phone: string;
  totalContractAmount: number;
  totalPaidAmount: number;
}

export interface BharpaiPerson {
  name: string;
  days: number;
  rate: number;
}

export interface FinancialTransaction {
  id: string;
  dateBs: string;
  dateAd: string;
  category: 'Ambulance' | 'Lab' | 'General' | 'Program Payment';
  type: 'Income' | 'Expense';
  incomeSource?: 'Nagarpalika' | 'Wada' | 'Internal' | 'Other';
  amountWithoutVAT?: number;
  amountWithVAT?: number;
  amount?: number;
  vatTaxableAmount?: number;
  isVatBill?: boolean;
  remarks: string;
  partyId?: string;
  programId?: string;
  fiscalYear: string;
  referenceNo?: string;
  partyName?: string;
  tdsAmount?: number;
  sasukarAmount?: number;
  tax15Amount?: number;
  paymentMethod?: 'Bank' | 'Cash';
  checkNo?: string;
  needsBharpai?: boolean;
  bharpaiUnitType?: 'days' | 'qty';
  bharpaiDays?: number;
  bharpaiRate?: number;
  bharpaiPersons?: BharpaiPerson[];
  items?: {
    remarks: string;
    amount: number;
    amountWithVAT?: number;
    amountWithoutVAT?: number;
    vatTaxableAmount?: number;
    isVatBill?: boolean;
    tdsAmount?: number;
    sasukarAmount?: number;
    tax15Amount?: number;
    partyName?: string;
    programId?: string;
    needsBharpai?: boolean;
    bharpaiUnitType?: 'days' | 'qty';
    bharpaiDays?: number;
    bharpaiRate?: number;
    bharpaiPersons?: BharpaiPerson[];
  }[];
}

export interface PartyPaymentRecord {
  id: string;
  partyId: string;
  manualPartyName?: string;
  programId: string;
  transactionId?: string;
  amount: number;
  tdsAmount?: number;
  sasukarAmount?: number;
  dateBs: string;
  fiscalYear: string;
  paymentMethod: string;
  remarks: string;
  isPeski?: boolean;
}

export interface PaymentRequest {
  id: string;
  programId: string;
  customProgramName?: string;
  amountRequested: number;
  amountPaid: number;
  status: 'Submitted' | 'Partial' | 'Paid';
  dateBs: string;
  remarks: string;
  fiscalYear: string;
  _orgName?: string;
}

export interface AllowanceRecord {
  id: string;
  programId: string;
  customProgramName?: string;
  employeeName: string;
  amount: number;
  dateBs: string;
  isPaid: boolean;
  remarks: string;
  fiscalYear: string;
  _orgName?: string;
}

export interface GoswaraVoucher {
  id: string;
  dateBs: string;
  transactionId: string;
  entries: JournalEntry[];
  totalAmount: number;
  fiscalYear: string;
  remarks?: string;
  paymentMethod?: 'Bank' | 'Cash';
  checkNo?: string;
}

export interface JournalEntry {
  accountName: string;
  activityName?: string;
  debit?: number;
  credit?: number;
}

export interface SalaryEmployeeItem {
  id: string;
  userId?: string;
  employeeName: string;
  designation: string;
  level?: string;
  employeeCode?: string;
  bankAccountNumber?: string;
  bankName?: string;
  panNumber?: string;
  citNumber?: string;
  pfNumber?: string;
  serviceType?: 'Permanent' | 'Temporary' | 'Contract' | 'DailyWages' | string;

  // Earnings
  basicScale: number;
  gradeCount: number;
  gradeRate: number;
  gradeAmount: number;
  totalBasicSalary: number;
  dearnessAllowance: number;
  incentiveAllowance: number;
  fieldAllowance: number;
  dressAllowance: number;
  medicalAllowance: number;
  otherAllowances: number;
  grossSalary: number;

  // Deductions
  providentFund: number;
  citDeduction: number;
  insuranceDeduction: number;
  taxDeduction: number;
  loanOrAdvanceDeduction: number;
  otherDeductions: number;
  totalDeductions: number;

  // Net
  netPayable: number;
  remarks?: string;
}

export interface MonthlySalaryReceipt {
  id: string;
  fiscalYear: string;
  month: string; // e.g. "04", "05", ... "03"
  monthNameNepali: string; // e.g. "साउन", "भदौ", ...
  receiptNumber?: string;
  dateBs: string;
  paymentMethod?: 'Bank' | 'Cash' | 'Cheque';
  bankName?: string;
  chequeOrVoucherNo?: string;
  budgetHeadName?: string;
  budgetCode?: string;
  employees: SalaryEmployeeItem[];

  // Aggregates
  totalBasicSalary: number;
  totalGradeAmount: number;
  totalAllowances: number;
  totalGrossSalary: number;
  totalDeductions: number;
  totalNetPayable: number;

  // Signatures
  preparedBy?: { name: string; designation: string; date?: string };
  verifiedBy?: { name: string; designation: string; date?: string };
  approvedBy?: { name: string; designation: string; date?: string };

  status: 'Draft' | 'Approved' | 'Paid';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  _orgName?: string;
}

export interface EmployeeSalaryProfile {
  id: string;
  userId?: string;
  employeeName: string;
  designation: string;
  level?: string;
  employeeCode?: string;
  bankAccountNumber?: string;
  bankName?: string;
  panNumber?: string;
  citNumber?: string;
  pfNumber?: string;
  serviceType?: 'Permanent' | 'Temporary' | 'Contract' | 'DailyWages' | string;
  basicScale: number;
  gradeCount: number;
  gradeRate: number;
  dearnessAllowance: number;
  incentiveAllowance: number;
  fieldAllowance: number;
  dressAllowance: number;
  medicalAllowance: number;
  otherAllowances: number;
  providentFund: number;
  citDeduction: number;
  insuranceDeduction: number;
  taxDeduction: number;
  loanOrAdvanceDeduction: number;
  otherDeductions: number;
  _orgName?: string;
}

