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
}

export interface JournalEntry {
  accountName: string;
  activityName?: string;
  debit?: number;
  credit?: number;
}
