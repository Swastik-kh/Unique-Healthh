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
  amount: number;
  remarks: string;
  partyId?: string;
  programId?: string;
  fiscalYear: string;
  referenceNo?: string;
}

export interface PartyPaymentRecord {
  id: string;
  partyId: string;
  programId: string;
  transactionId?: string;
  amount: number;
  dateBs: string;
  fiscalYear: string;
  paymentMethod: string;
  remarks: string;
}
