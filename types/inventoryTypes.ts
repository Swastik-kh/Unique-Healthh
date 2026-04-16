
import { Signature } from './coreTypes'; // Ensure Signature is imported if it's in coreTypes
export interface ItemEntry {
  id: string;
  itemName: string;
  unit: string;
}

export interface MagItem {
  id: number; // Added 'id' to MagItem
  name: string;
  specification: string;
  unit: string;
  quantity: string;
  remarks: string;
  codeNo?: string;
  rate?: number;
  totalAmount?: number;
  model?: string; // Added model field
  batchNo?: string; // Added for batch selection
  expiryDate?: string; // Added for expiry selection
}

export interface StoreKeeperSignature {
  name: string;
  date?: string;
  verified?: boolean;
  marketRequired?: boolean;
  inStock?: boolean;
}

export interface MagFormEntry {
  id: string;
  fiscalYear: string;
  formNo: string; 
  date: string;
  items: MagItem[];
  status?: 'Pending' | 'Verified' | 'Approved' | 'Rejected';
  demandBy?: Signature;
  recommendedBy?: Signature;
  storeKeeper?: StoreKeeperSignature;
  receiver?: Signature;
  ledgerEntry?: Signature;
  approvedBy?: Signature;
  rejectionReason?: string; 
  issueItemType?: 'Expendable' | 'Non-Expendable'; // Corrected to include both types
  isViewedByRequester?: boolean; // Added for notification tracking
  decisionNo?: string; // New field for PO decision number
  decisionDate?: string; // New field for PO decision date
}

// Added missing PurchaseOrderEntry interface
export interface PurchaseOrderEntry {
  id: string;
  magFormId: string; // Link to the originating MagForm
  magFormNo: string; // MagForm number
  requestDate: string; // Date of the original demand
  items: MagItem[];
  status: 'Pending' | 'Pending Account' | 'Account Verified' | 'Generated' | 'Stock Entry Requested' | 'Completed';
  fiscalYear: string;
  orderNo?: string;
  decisionNo?: string;
  decisionDate?: string;
  vendorDetails?: {
    name: string;
    address?: string;
    pan?: string;
    phone?: string;
  };
  budgetDetails?: {
    budgetSubHeadNo?: string;
    expHeadNo?: string;
    activityNo?: string;
  };
  vatAmount?: number; // Added VAT amount field
  preparedBy?: Signature; // Storekeeper
  recommendedBy?: Signature; // (Optional)
  financeBy?: Signature; // Account
  approvedBy?: Signature; // Admin/Approval
}

export interface InventoryItem {
  id: string;
  itemName: string;
  itemClassification?: string;
  uniqueCode?: string;
  sanketNo?: string;
  ledgerPageNo?: string;
  dakhilaNo?: string; // from where it was received
  itemType: 'Expendable' | 'Non-Expendable';
  specification?: string;
  unit: string;
  currentQuantity: number;
  rate?: number;
  tax?: number; // percentage
  totalAmount?: number;
  batchNo?: string;
  expiryDateAd?: string;
  expiryDateBs?: string;
  lastUpdateDateAd: string;
  lastUpdateDateBs: string;
  fiscalYear: string;
  receiptSource: string;
  remarks?: string;
  storeId: string; // The ID of the store where it is located
  approvedStockLevel?: number; // Approved Stock Level (ASL)
  emergencyOrderPoint?: number; // Emergency Order Point (EOP)
}

export interface FirmEntry {
  id: string;
  firmRegNo: string;
  firmName: string;
  vatPan: string;
  address: string;
  contactNo: string;
  registrationDateAd: string;
  registrationDateBs: string;
  fiscalYear: string;
}

export interface QuotationEntry {
  id: string;
  fiscalYear: string;
  firmId: string;
  firmName: string;
  itemName: string;
  unit: string;
  rate: string;
  quotationDateAd: string;
  quotationDateBs: string;
}

export interface Store {
  id: string;
  regNo: string;
  name: string;
  address: string;
  contactPerson?: string;
  contactPhone?: string;
  fiscalYear: string;
}

export interface StockEntryRequest {
  id: string;
  requestDateBs: string;
  requestDateAd: string;
  fiscalYear: string;
  storeId: string;
  receiptSource: string;
  supplier?: string;
  refNo?: string; // Purchase Order No, HASTANTARAN No, etc.
  items: InventoryItem[];
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedBy: string;
  requesterName: string;
  requesterDesignation: string;
  rejectionReason?: string;
  approvedBy?: string;
  mode: 'opening' | 'add';
  dakhilaNo?: string; // For formal dakhila after approval
}

export interface DakhilaItem {
  id: number;
  name: string;
  codeNo: string;
  specification: string;
  source: string;
  unit: string;
  quantity: number;
  rate: number;
  totalAmount: number;
  vatAmount: number;
  grandTotal: number;
  otherExpenses: number;
  finalTotal: number;
  remarks: string;
  itemType: 'Expendable' | 'Non-Expendable'; // Added itemType
}

export interface DakhilaPratibedanEntry {
  id: string;
  fiscalYear: string;
  dakhilaNo: string;
  date: string;
  orderNo: string; // Purchase Order No or other reference
  items: DakhilaItem[];
  status: 'Draft' | 'Final';
  preparedBy?: Signature;
  approvedBy?: Signature;
  storeId?: string; // Added storeId to indicate which store this dakhila is for
}

export interface IssueReportEntry {
  id: string;
  magFormId: string; // Link to the originating MagForm
  magFormNo: string;
  requestDate: string; // Date of the original demand
  items: MagItem[];
  status: 'Pending' | 'Pending Approval' | 'Issued' | 'Rejected';
  fiscalYear: string;
  issueNo?: string; // For formal Nikasa Pratibedan Number
  issueDate?: string; // For formal Nikasa Pratibedan Issue Date
  preparedBy?: Signature;
  recommendedBy?: Signature;
  approvedBy?: Signature;
  rejectionReason?: string;
  itemType?: 'Expendable' | 'Non-Expendable'; // Crucial for stock reduction logic
  selectedStoreId?: string; // Store from which items are issued
  demandBy?: Signature; // Who demanded these items
}

export interface PropertyUseRow {
  id: string;
  date: string;
  magFormNo: string; // From MagForm or IssueReport
  sanketNo: string; // Code or Sanket no of the item
  name: string;
  model: string;
  specification: string;
  idNo: string; // Unique ID / asset tag number if available
  estLife: string; // Estimated life of the asset
  makeCountry: string; // Make / Country of origin
  source: string; // Source of item (e.g., Purchase, Donation)
  unit: string;
  quantity: number;
  totalCost: number; // Per unit cost
  receiverName: string;
  receiverDesignation: string;
  receiverSignatureDate: string;
  returnedQuantity: number;
  returnDates: string[];
  returnReceivers: string[];
  isCleared: boolean;
}

export interface ReturnItem {
  id: number;
  inventoryId?: string; // Link to original inventory item
  kharchaNikasaNo?: string; // Reference to original issue report if known
  codeNo: string;
  name: string;
  specification: string;
  unit: string;
  quantity: number;
  rate: number;
  totalAmount: number;
  vatAmount?: number;
  grandTotal?: number;
  reasonAndCondition: string; // Reason for return and condition of item
  remarks?: string;
  itemType?: 'Expendable' | 'Non-Expendable'; // Added itemType
  itemClassification?: string; // Added itemClassification
}

export interface ReturnEntry {
  id: string;
  fiscalYear: string;
  formNo: string;
  date: string;
  items: ReturnItem[];
  status: 'Pending' | 'Verified' | 'Approved' | 'Rejected';
  returnedBy: Signature; // Person returning the item
  preparedBy?: Signature; // Storekeeper verifying
  recommendedBy?: Signature;
  approvedBy: Signature; // Final approver for return
  rejectionReason?: string;
}

export interface MarmatItem {
  id: number;
  name: string;
  codeNo: string; // Sanket No or Unique Code
  details: string; // Problem description
  quantity: number;
  unit: string;
  remarks?: string;
}

export interface MarmatEntry {
  id: string;
  fiscalYear: string;
  formNo: string;
  date: string;
  items: MarmatItem[];
  status: 'Pending' | 'Approved' | 'Completed';
  requestedBy: Signature;
  recommendedBy?: Signature;
  approvedBy: Signature;
}

export interface DhuliyaunaItem {
  id: number;
  inventoryId?: string; // Optional: Link to original inventory item
  codeNo: string;
  name: string;
  specification: string;
  unit: string;
  quantity: number;
  rate: number;
  totalAmount: number;
  reason: string; // Reason for disposal (e.g., expired, damaged, obsolete)
  remarks?: string;
}

export interface DhuliyaunaEntry {
  id: string;
  fiscalYear: string;
  formNo: string;
  date: string;
  disposalType: 'Dhuliyauna' | 'Lilaam' | 'Minaha'; // Dhuliyauna (discard), Lilaam (auction), Minaha (write-off)
  items: DhuliyaunaItem[];
  status: 'Pending' | 'Approved';
  preparedBy: Signature;
  approvedBy: Signature;
}

export interface LogBookEntry {
  id: string;
  fiscalYear: string;
  date: string; // Nepali date of the log entry
  inventoryId: string; // ID of the Non-Expendable item (vehicle, machine)
  assetName: string; // Name of the asset
  codeNo: string; // Unique Code / Sanket No of the asset
  details: string; // Description of work done / route / purpose
  startTime: string; // Start reading (Km or Hours)
  endTime: string; // End reading (Km or Hours)
  total: number; // Total difference (Km or Hours)
  fuelConsumed?: number; // Fuel consumed in Liters
  oilConsumed?: number; // Oil consumed in Liters
  operatorName: string; // Name of the operator/driver
  remarks?: string;
}
