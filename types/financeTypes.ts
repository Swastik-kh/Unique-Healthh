import { Timestamp } from 'firebase/firestore';

export interface FinancialProgram {
  id: string;
  name: string;
  totalBudget: number;
  spentAmount: number;
  fiscalYear: string;
  source: 'Internal' | 'Nagarpalika' | 'Wada' | 'Province' | 'Federal';
  createdAt: string;
}

export interface BudgetHead {
  id: string;
  code: string;
  nameNep: string;
  nameEng: string;
  totalBudget: number;
  spentAmount: number;
  remainingBudget: number;
  fiscalYear: string;
}

export interface ChartOfAccount {
  id: string;
  code: string;
  nameNep: string;
  nameEng: string;
  parentCode?: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  openingBalance: number;
  currentBalance: number;
}

export interface AdvanceRecord {
  id: string;
  employeeId?: string;
  employeeName: string;
  amount: number;
  purpose: string;
  dateBs: string;
  status: 'Pending' | 'Settled' | 'Partially Settled';
  settledAmount: number;
  fiscalYear: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN';
  module: string;
  timestamp: number;
  oldValue?: string; // JSON string
  newValue?: string; // JSON string
  reason?: string;
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
  category: 'Ambulance' | 'Lab' | 'General' | 'Program Payment' | 'Advance' | 'Salary' | 'Administrative';
  type: 'Income' | 'Expense' | 'Transfer';
  status: 'Draft' | 'Submitted' | 'Verified' | 'Approved' | 'Paid';
  incomeSource?: 'Nagarpalika' | 'Wada' | 'Internal' | 'Other';
  amountWithoutVAT?: number;
  amountWithVAT?: number;
  amount?: number;
  vatTaxableAmount?: number;
  isVatBill?: boolean;
  remarks: string;
  partyId?: string;
  programId?: string;
  budgetHeadId?: string;
  fiscalYear: string;
  referenceNo?: string;
  partyName?: string;
  tdsAmount?: number;
  sasukarAmount?: number;
  tax15Amount?: number;
  paymentMethod?: 'Bank' | 'Cash' | 'E-Payment';
  checkNo?: string;
  needsBharpai?: boolean;
  bharpaiUnitType?: 'days' | 'qty';
  bharpaiDays?: number;
  bharpaiRate?: number;
  bharpaiPersons?: BharpaiPerson[];
  voucherId?: string;
  verifiedBy?: string;
  approvedBy?: string;
  paidBy?: string;
  attachments?: string[];
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
    budgetHeadId?: string;
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
