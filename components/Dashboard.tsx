
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { evaluateTableData, toNepaliDigits } from '../lib/tableUtils';
import { 
  LogOut, Menu, Calendar, Stethoscope, Package, FileText, Settings, LayoutDashboard, 
  ChevronDown, ChevronRight, Syringe, Activity, Info, Building2,
  ClipboardList, FileSpreadsheet, FilePlus, ShoppingCart, FileOutput, 
  BookOpen, Book, Archive, RotateCcw, Wrench, Scroll, BarChart3,
  Sliders, Store, ShieldCheck, Users, Database, KeyRound, UserCog, Lock, Warehouse, ClipboardCheck, Bell, X, CheckCircle2, AlertTriangle, Calculator, Trash2, TrendingUp, TrendingDown, AlertOctagon, Timer, Printer, Baby, Flame, CalendarClock, List,
  Eye, ShieldAlert, ChevronLeft, Send, MapPin, Search, HeartHandshake,
  UserPlus, FlaskConical, Pill, Accessibility, Scan, Waves, Siren, MessageSquare, Truck, MoreVertical, Thermometer
} from 'lucide-react';
import { APP_NAME, FISCAL_YEARS } from '../constants';
import { db } from '../firebase';
import { ref, onValue, get } from 'firebase/database';
import { DashboardProps } from '../types/dashboardTypes'; 
import { PurchaseOrderEntry, InventoryItem, MagFormEntry, StockEntryRequest, DakhilaPratibedanEntry } from '../types/inventoryTypes';
import { User, LeaveApplication, LeaveStatus, Darta, Chalani, BharmanAdeshEntry, GarbhawotiRecord, PrasutiRecord, UttarPrasutiRecord, ServiceSeekerRecord, OPDRecord, EmergencyRecord, CBIMNCIRecord, BillingRecord, ServiceItem, LabReport, DispensaryRecord, PariwarSewaRecord, XRayRecord, ECGRecord, USGRecord, PhysiotherapyRecord, IPDRecord, InterFacilityRequest, AmbulanceRecord, AmbulanceExpenseRecord, SentLetter, ReceivedLetter } from '../types';
import { FinancialProgram, ListedParty, FinancialTransaction, PartyPaymentRecord, PaymentRequest, AllowanceRecord, GoswaraVoucher } from '../types/financeTypes';
import { NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE } from './ChildImmunizationRegistration';
import { TalimByabasthapan } from './TalimByabasthapan';
import { LekhaPrashasan } from './LekhaPrashasan';
import { SujhabPetika } from './SujhabPetika';
import { UserManagement } from './UserManagement';
import { OrganizationManagement } from './OrganizationManagement';
import { Conference } from './Conference';
import { ChangePassword } from './ChangePassword';
import { UserHistory } from './UserHistory';
import { TBPatientRegistration } from './TBPatientRegistration';
import { RabiesRegistration } from './RabiesRegistration';
import { RabiesReport } from './RabiesReport';
import { MagFaram } from './MagFaram';
import { KharidAdesh } from './KharidAdesh';
import { NikashaPratibedan } from './NikashaPratibedan';
import { FirmListing } from './FirmListing'; 
import { Quotation } from './Quotation'; 
import { JinshiMaujdat } from './JinshiMaujdat'; 
import { StoreSetup } from './StoreSetup'; 
import { CBIMNCIReport } from './CBIMNCIReport';
import { ReportingStatusReport } from './ReportingStatusReport';
import { InventoryMonthlyReport } from './InventoryMonthlyReport'; 
import { StockEntryApproval } from './StockEntryApproval'; 
import { DakhilaPratibedan } from './DakhilaPratibedan'; 
import { SahayakJinshiKhata } from './SahayakJinshiKhata'; 
import { JinshiKhata } from './JinshiKhata'; 
import { JinshiFirtaFaram } from './JinshiFirtaFaram'; 
import { MarmatAdesh } from './MarmatAdesh';
import { DatabaseManagement } from './DatabaseManagement';
import { DhuliyaunaFaram } from './DhuliyaunaFaram';
import { BidaAbedan } from './BidaAbedan';
import { LogBook } from './LogBook';
import { GeneralSetting } from './GeneralSetting';
import { HIBSettings } from './HIBSettings';
import { VaccinationServiceTabs } from './VaccinationServiceTabs';
import { ImmunizationTracking } from './ImmunizationTracking';
import { ImmunizationReport } from './ImmunizationReport';
import { Microplanning } from './Microplanning';
import { GaunGharClinic } from './GaunGharClinic';
import { DartaForm } from './DartaForm';
import { ChalaniForm } from './ChalaniForm';
import { BharmanAdesh } from './BharmanAdesh';
import { PrintOptionsModal } from './PrintOptionsModal';
import { OnLeaveToday } from './OnLeaveToday';
import { SafeMotherhoodService } from './SafeMotherhoodService';
import { IPDSewa } from './IPDSewa';
import { GarbhawotiSewa } from './GarbhawotiSewa';
import { PrasutiSewa } from './PrasutiSewa';
import { UttarPrasutiSewa } from './UttarPrasutiSewa';
import { MulDartaSewa } from './MulDartaSewa';
import { OPDSewa } from './OPDSewa';
import { EmergencySewa } from './EmergencySewa';
import { CBIMNCISewa } from './CBIMNCISewa';
import { ServiceBilling } from './ServiceBilling';
import { ServiceSettings } from './ServiceSettings';
import { PrayogsalaSewa } from './PrayogsalaSewa';
import { DispensarySewa } from './DispensarySewa';
import { PariwarSewa } from './PariwarSewa';
import { XRaySewa } from './XRaySewa';
import { ECGSewa } from './ECGSewa';
import { USGSewa } from './USGSewa';
import { PhysiotherapySewa } from './PhysiotherapySewa';
import { TBDSTReport } from './TBDSTReport';
import { LabBillingReport } from './LabBillingReport';
import { DrugQuantification } from './DrugQuantification';
import { FamilyPlanningReport } from './FamilyPlanningReport';
import { GESIReport } from './GESIReport';
import { MCHReport } from './MCHReport';
import { MedicineStatusReport } from './MedicineStatusReport';
import { VitaminAProgram } from './VitaminAProgram';
import { FCHVKaryakram } from './FCHVKaryakram';
import { FCHVCompilationReport } from './FCHVCompilationReport';
import { KhopAbhiyan } from './KhopAbhiyan';
import { AmbulanceSewa } from './AmbulanceSewa';
import { OnlineReport } from './OnlineReport';
import { AuditLogViewer } from './AuditLogViewer';
import { ColdChainLog } from './ColdChainLog';
import { ColdChainEquipmentManager } from './ColdChainEquipment';
import { ALL_MENU_ITEMS, MenuItem } from '../src/constants/menuItems';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';



interface ExtendedDashboardProps extends DashboardProps {
  onUploadData: (sectionId: string, data: any[], extraMeta?: any) => Promise<void>;
  garbhawotiRecords: GarbhawotiRecord[];
  onSaveGarbhawotiRecord: (record: GarbhawotiRecord) => void;
  onDeleteGarbhawotiRecord: (recordId: string) => void;
  prasutiRecords: PrasutiRecord[];
  onSavePrasutiRecord: (record: PrasutiRecord) => void;
  onDeletePrasutiRecord: (recordId: string) => void;
  uttarPrasutiRecords: UttarPrasutiRecord[];
  onSaveUttarPrasutiRecord: (record: UttarPrasutiRecord) => void;
  onDeleteUttarPrasutiRecord: (recordId: string) => void;
  opdRecords: OPDRecord[];
  onSaveOPDRecord: (record: OPDRecord) => void;
  onDeleteOPDRecord: (recordId: string) => void;
  emergencyRecords: EmergencyRecord[];
  onSaveEmergencyRecord: (record: EmergencyRecord) => void;
  onDeleteEmergencyRecord: (recordId: string) => void;
  cbimnciRecords: CBIMNCIRecord[];
  onSaveCBIMNCIRecord: (record: CBIMNCIRecord) => void;
  onDeleteCBIMNCIRecord: (recordId: string) => void;
  billingRecords: BillingRecord[];
  onSaveBillingRecord: (record: BillingRecord) => void;
  onDeleteBillingRecord: (recordId: string) => void;
  dispensaryRecords: DispensaryRecord[];
  onSaveDispensaryRecord: (record: DispensaryRecord) => void;
  onDeleteDispensaryRecord: (recordId: string) => void;
  serviceItems: ServiceItem[];
  onSaveServiceItem: (item: ServiceItem) => void;
  onDeleteServiceItem: (id: string) => void;
  labReports: LabReport[];
  onSaveLabReport: (record: LabReport) => void;
  onDeleteLabReport: (id: string) => void;
  pariwarSewaRecords: PariwarSewaRecord[];
  onSavePariwarSewaRecord: (record: PariwarSewaRecord) => void;
  onDeletePariwarSewaRecord: (id: string) => void;
  xrayRecords: XRayRecord[];
  onSaveXRayRecord: (record: XRayRecord) => void;
  onDeleteXRayRecord: (id: string) => void;
  ecgRecords: ECGRecord[];
  onSaveECGRecord: (record: ECGRecord) => void;
  onDeleteECGRecord: (id: string) => void;
  usgRecords: USGRecord[];
  onSaveUSGRecord: (record: USGRecord) => void;
  onDeleteUSGRecord: (id: string) => void;
  physiotherapyRecords: PhysiotherapyRecord[];
  onSavePhysiotherapyRecord: (record: PhysiotherapyRecord) => void;
  onDeletePhysiotherapyRecord: (id: string) => void;
  ambulanceRecords: AmbulanceRecord[];
  onSaveAmbulanceRecord: (record: AmbulanceRecord) => void;
  onDeleteAmbulanceRecord: (id: string) => void;
  ambulanceExpenseRecords?: AmbulanceExpenseRecord[];
  onSaveAmbulanceExpense?: (record: AmbulanceExpenseRecord) => void;
  onDeleteAmbulanceExpense?: (id: string) => void;
  ipdRecords: IPDRecord[];
  onSaveIPDRecord: (record: IPDRecord) => void;
  onDeleteIPDRecord: (id: string) => void;
  onDeleteAllIPDRecords: () => void;
  interFacilityRequests: InterFacilityRequest[];
  onAddInterFacilityRequest: (req: InterFacilityRequest) => void;
  onUpdateInterFacilityRequest: (req: InterFacilityRequest) => void;
  gaunGharClinicRecords?: any[];
  onSaveGaunGharClinicRecord?: (record: any) => void;
  onDeleteGaunGharClinicRecord?: (id: string) => void;
  onUpdateReadNotifications: (userId: string, readIds: string[]) => void;
  activeOrgName: string;
  onSetActiveOrgName: (orgName: string) => void;
  allUsers: User[];

  // Finance Props
  financialPrograms: FinancialProgram[];
  listedParties: ListedParty[];
  financialTransactions: FinancialTransaction[];
  partyPayments: PartyPaymentRecord[];
  goswaraVouchers: GoswaraVoucher[];
  paymentRequests: PaymentRequest[];
  allowances: AllowanceRecord[];
  onSaveFinancialProgram: (p: any) => void;
  onDeleteFinancialProgram: (id: string) => void;
  onSaveListedParty: (p: any) => void;
  onDeleteListedParty: (id: string) => void;
  onSaveFinancialTransaction: (t: any) => void;
  onDeleteFinancialTransaction: (id: string) => void;
  onSavePartyPayment: (p: any) => void;
  onDeletePartyPayment: (id: string, amount: number, partyId: string, programId: string) => void;
  onSavePaymentRequest: (r: any) => void;
  onSaveAllowance: (a: any) => void;
  onUpdatePaymentRequest: (id: string, r: any) => void;
  onUpdateAllowance: (id: string, a: any) => void;
  onDeletePaymentRequest: (id: string) => void;
  onDeleteAllowance: (id: string) => void;
  onUpdateGlobalDhis2Mappings?: (mappings: any) => void;
}

interface AppNotification {
    id: string;
    title: string;
    description: string;
    time: string;
    targetMenu: string;
    type: 'info' | 'warning' | 'success' | 'error';
    isNew: boolean;
}

const READ_NOTIFS_KEY_PREFIX = 'smart_inv_read_notifs_v4_';

export const Dashboard: React.FC<ExtendedDashboardProps> = (props) => {
  const { 
    onLogout, currentUser: rawCurrentUser, currentFiscalYear, users = [], onAddUser, onUpdateUser, onDeleteUser, onDeleteOrganization, onChangePassword, isDbLocked,
    generalSettings, onUpdateGeneralSettings: rawOnUpdateGeneralSettings, magForms = [], onSaveMagForm: rawOnSaveMagForm, onDeleteMagForm: rawOnDeleteMagForm,
    purchaseOrders = [], onUpdatePurchaseOrder: rawOnUpdatePurchaseOrder, onDeletePurchaseOrder: rawOnDeletePurchaseOrder, issueReports = [], onUpdateIssueReport: rawOnUpdateIssueReport, 
    rabiesPatients = [], onAddRabiesPatient: rawOnAddRabiesPatient, onUpdatePatient: rawOnUpdatePatient, onDeletePatient: rawOnDeletePatient,
    tbPatients = [], onAddTbPatient: rawOnAddTbPatient, onUpdateTbPatient: rawOnUpdateTbPatient, onDeleteTbPatient: rawOnDeleteTbPatient, 
    garbhawatiPatients = [], onAddGarbhawatiPatient: rawOnAddGarbhawatiPatient, onUpdateGarbhawatiPatient: rawOnUpdateGarbhawatiPatient, onDeleteGarbhawatiPatient: rawOnDeleteGarbhawatiPatient, 
    bachhaImmunizationRecords = [], onAddBachhaImmunizationRecord: rawOnAddBachhaImmunizationRecord, onUpdateBachhaImmunizationRecord: rawOnUpdateBachhaImmunizationRecord, onDeleteBachhaImmunizationRecord: rawOnDeleteBachhaImmunizationRecord, 
    firms = [], onAddFirm: rawOnAddFirm, quotations = [], onAddQuotation: rawOnAddQuotation, inventoryItems = [], onAddInventoryItem: rawOnAddInventoryItem, onUpdateInventoryItem: rawOnUpdateInventoryItem, onDeleteInventoryItem: rawOnDeleteInventoryItem,
    stockEntryRequests = [], onRequestStockEntry: rawOnRequestStockEntry, onApproveStockEntry: rawOnApproveStockEntry, onRejectStockEntry: rawOnRejectStockEntry, stores = [], onAddStore: rawOnAddStore, onUpdateStore: rawOnUpdateStore, onDeleteStore: rawOnDeleteStore,
    dakhilaReports = [], onSaveDakhilaReport: rawOnSaveDakhilaReport, returnEntries = [], onSaveReturnEntry: rawOnSaveReturnEntry, 
    marmatEntries = [], onSaveMarmatEntry: rawOnSaveMarmatEntry, dhuliyaunaEntries = [], onSaveDhuliyaunaEntry: rawOnSaveDhuliyaunaEntry,
    logBookEntries = [], onSaveLogBookEntry: rawOnSaveLogBookEntry, itemList = [], onAddItem: rawOnAddItem, onUpdateItem: rawOnUpdateItem, onDeleteItem: rawOnDeleteItem, onClearData, onUploadData,
    leaveApplications = [], onAddLeaveApplication: rawOnAddLeaveApplication, onUpdateLeaveStatus: rawOnUpdateLeaveStatus, onDeleteLeaveApplication: rawOnDeleteLeaveApplication,
    leaveBalances = [], onSaveLeaveBalance: rawOnSaveLeaveBalance,
    dartaEntries = [], onSaveDarta: rawOnSaveDarta, onDeleteDarta: rawOnDeleteDarta,
    chalaniEntries = [], onSaveChalani: rawOnSaveChalani, onDeleteChalani: rawOnDeleteChalani,
    sentLetters = [], receivedLetters = [], onSendLetter: rawOnSendLetter, onDeleteReceivedLetter: rawOnDeleteReceivedLetter, onDeleteSentLetter: rawOnDeleteSentLetter, onMarkReceivedLetterAsRead,
    bharmanAdeshEntries = [], onSaveBharmanAdesh: rawOnSaveBharmanAdesh, onDeleteBharmanAdesh: rawOnDeleteBharmanAdesh,
    garbhawotiRecords = [], onSaveGarbhawotiRecord: rawOnSaveGarbhawotiRecord, onDeleteGarbhawotiRecord: rawOnDeleteGarbhawotiRecord,
    prasutiRecords = [], onSavePrasutiRecord: rawOnSavePrasutiRecord, onDeletePrasutiRecord: rawOnDeletePrasutiRecord,
    uttarPrasutiRecords = [], onSaveUttarPrasutiRecord: rawOnSaveUttarPrasutiRecord, onDeleteUttarPrasutiRecord: rawOnDeleteUttarPrasutiRecord,
    serviceSeekerRecords = [], onSaveServiceSeekerRecord: rawOnSaveServiceSeekerRecord, onDeleteServiceSeekerRecord: rawOnDeleteServiceSeekerRecord,
    opdRecords = [], onSaveOPDRecord: rawOnSaveOPDRecord, onDeleteOPDRecord: rawOnDeleteOPDRecord,
    emergencyRecords = [], onSaveEmergencyRecord: rawOnSaveEmergencyRecord, onDeleteEmergencyRecord: rawOnDeleteEmergencyRecord,
    cbimnciRecords = [], onSaveCBIMNCIRecord: rawOnSaveCBIMNCIRecord, onDeleteCBIMNCIRecord: rawOnDeleteCBIMNCIRecord,
    billingRecords = [], onSaveBillingRecord: rawOnSaveBillingRecord, onDeleteBillingRecord: rawOnDeleteBillingRecord,
    dispensaryRecords = [], onSaveDispensaryRecord: rawOnSaveDispensaryRecord, onDeleteDispensaryRecord: rawOnDeleteDispensaryRecord,
    serviceItems = [], onSaveServiceItem: rawOnSaveServiceItem, onDeleteServiceItem: rawOnDeleteServiceItem,
    labReports = [], onSaveLabReport: rawOnSaveLabReport, onDeleteLabReport: rawOnDeleteLabReport,
    pariwarSewaRecords = [], onSavePariwarSewaRecord: rawOnSavePariwarSewaRecord, onDeletePariwarSewaRecord: rawOnDeletePariwarSewaRecord,
    xrayRecords = [], onSaveXRayRecord: rawOnSaveXRayRecord, onDeleteXRayRecord: rawOnDeleteXRayRecord,
    ecgRecords = [], onSaveECGRecord: rawOnSaveECGRecord, onDeleteECGRecord: rawOnDeleteECGRecord,
    usgRecords = [], onSaveUSGRecord: rawOnSaveUSGRecord, onDeleteUSGRecord: rawOnDeleteUSGRecord,
    physiotherapyRecords = [], onSavePhysiotherapyRecord: rawOnSavePhysiotherapyRecord, onDeletePhysiotherapyRecord: rawOnDeletePhysiotherapyRecord,
    ambulanceRecords = [], onSaveAmbulanceRecord: rawOnSaveAmbulanceRecord, onDeleteAmbulanceRecord: rawOnDeleteAmbulanceRecord,
    ambulanceExpenseRecords = [], onSaveAmbulanceExpense: rawOnSaveAmbulanceExpense = () => {}, onDeleteAmbulanceExpense: rawOnDeleteAmbulanceExpense = () => {},
    ambulanceOdometerRecords = [], onSaveAmbulanceOdometerRecord: rawOnSaveAmbulanceOdometerRecord = () => {}, onDeleteAmbulanceOdometerRecord: rawOnDeleteAmbulanceOdometerRecord = () => {},
    ipdRecords = [], onSaveIPDRecord: rawOnSaveIPDRecord, onDeleteIPDRecord: rawOnDeleteIPDRecord, onDeleteAllIPDRecords: rawOnDeleteAllIPDRecords,
    interFacilityRequests = [], onAddInterFacilityRequest: rawOnAddInterFacilityRequest, onUpdateInterFacilityRequest: rawOnUpdateInterFacilityRequest,
    onUpdateReadNotifications,
    activeOrgName, onSetActiveOrgName, allUsers = [],
    financialPrograms = [], listedParties = [], financialTransactions = [], partyPayments = [], 
    goswaraVouchers = [],
    paymentRequests = [], allowances = [],
    onSaveFinancialProgram: rawOnSaveFinancialProgram, onDeleteFinancialProgram: rawOnDeleteFinancialProgram, onSaveListedParty: rawOnSaveListedParty, onDeleteListedParty: rawOnDeleteListedParty, 
    onSaveFinancialTransaction: rawOnSaveFinancialTransaction, onDeleteFinancialTransaction: rawOnDeleteFinancialTransaction, onSavePartyPayment: rawOnSavePartyPayment, onDeletePartyPayment: rawOnDeletePartyPayment,
    onSavePaymentRequest: rawOnSavePaymentRequest, onSaveAllowance: rawOnSaveAllowance,
    onUpdatePaymentRequest: rawOnUpdatePaymentRequest, onUpdateAllowance: rawOnUpdateAllowance,
    onDeletePaymentRequest: rawOnDeletePaymentRequest, onDeleteAllowance: rawOnDeleteAllowance,
    talimEntries = [], onSaveTalim: rawOnSaveTalim, onDeleteTalim: rawOnDeleteTalim,
    karmachariTalimRecords = [], onSaveKarmachariTalimRecord: rawOnSaveKarmachariTalimRecord, onDeleteKarmachariTalimRecord: rawOnDeleteKarmachariTalimRecord
  } = props;

  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [expandedSubMenu, setExpandedSubMenu] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<string>(() => {
    return localStorage.getItem('smart_inv_active_item') || 'dashboard';
  });

  const currentUser = useMemo(() => {
    if (!rawCurrentUser) return null;
    if (rawCurrentUser.role === 'SUPER_ADMIN') {
      return {
        ...rawCurrentUser,
        hasSaveAccess: true,
      };
    }
    
    // Check if the current user has edit access to the active menu
    const hasEditPermission = rawCurrentUser.editAccessMenus 
      ? rawCurrentUser.editAccessMenus.includes(activeItem)
      : (rawCurrentUser.hasSaveAccess !== false);

    return {
      ...rawCurrentUser,
      hasSaveAccess: hasEditPermission,
    };
  }, [rawCurrentUser, activeItem]);

  const checkEditPermission = useCallback(() => {
    if (!rawCurrentUser) return false;
    if (rawCurrentUser.role === 'SUPER_ADMIN') return true;
    
    // If editAccessMenus is defined, check if activeItem is included
    if (rawCurrentUser.editAccessMenus) {
      const hasEdit = rawCurrentUser.editAccessMenus.includes(activeItem);
      if (!hasEdit) {
        alert("तपाईंलाई यो मेनुमा डाटा सम्पादन/सुरक्षित (Save/Edit) गर्ने अनुमति छैन।");
        return false;
      }
      return true;
    }
    
    // Backward compatibility: If editAccessMenus is undefined, fallback to hasSaveAccess
    if (rawCurrentUser.hasSaveAccess === false) {
      alert("तपाईंलाई डाटा सम्पादन/सुरक्षित (Save/Edit) गर्ने अनुमति छैन।");
      return false;
    }
    return true;
  }, [rawCurrentUser, activeItem]);

  const checkDeletePermission = useCallback(() => {
    if (!rawCurrentUser) return false;
    if (rawCurrentUser.role === 'SUPER_ADMIN') return true;

    // If deleteAccessMenus is defined, check if activeItem is included
    if (rawCurrentUser.deleteAccessMenus) {
      const hasDelete = rawCurrentUser.deleteAccessMenus.includes(activeItem);
      if (!hasDelete) {
        alert("तपाईंलाई यो मेनुमा डाटा मेटाउने (Delete) अनुमति छैन।");
        return false;
      }
      return true;
    }

    // Backward compatibility: If deleteAccessMenus is undefined, fallback to allowedMenus
    return true;
  }, [rawCurrentUser, activeItem]);

  // Wrapped functions
  const onUpdateGeneralSettings = (...args: any[]) => checkEditPermission() && rawOnUpdateGeneralSettings?.(...args);
  const onSaveMagForm = (...args: any[]) => checkEditPermission() && rawOnSaveMagForm?.(...args);
  const onDeleteMagForm = (...args: any[]) => checkDeletePermission() && rawOnDeleteMagForm?.(...args);
  const onUpdatePurchaseOrder = (...args: any[]) => checkEditPermission() && rawOnUpdatePurchaseOrder?.(...args);
  const onDeletePurchaseOrder = (...args: any[]) => checkDeletePermission() && rawOnDeletePurchaseOrder?.(...args);
  const onUpdateIssueReport = (...args: any[]) => checkEditPermission() && rawOnUpdateIssueReport?.(...args);
  const onAddRabiesPatient = (...args: any[]) => checkEditPermission() && rawOnAddRabiesPatient?.(...args);
  const onUpdatePatient = (...args: any[]) => checkEditPermission() && rawOnUpdatePatient?.(...args);
  const onDeletePatient = (...args: any[]) => checkDeletePermission() && rawOnDeletePatient?.(...args);
  const onAddTbPatient = (...args: any[]) => checkEditPermission() && rawOnAddTbPatient?.(...args);
  const onUpdateTbPatient = (...args: any[]) => checkEditPermission() && rawOnUpdateTbPatient?.(...args);
  const onDeleteTbPatient = (...args: any[]) => checkDeletePermission() && rawOnDeleteTbPatient?.(...args);
  const onAddGarbhawatiPatient = (...args: any[]) => checkEditPermission() && rawOnAddGarbhawatiPatient?.(...args);
  const onUpdateGarbhawatiPatient = (...args: any[]) => checkEditPermission() && rawOnUpdateGarbhawatiPatient?.(...args);
  const onDeleteGarbhawatiPatient = (...args: any[]) => checkDeletePermission() && rawOnDeleteGarbhawatiPatient?.(...args);
  const onAddBachhaImmunizationRecord = (...args: any[]) => checkEditPermission() && rawOnAddBachhaImmunizationRecord?.(...args);
  const onUpdateBachhaImmunizationRecord = (...args: any[]) => checkEditPermission() && rawOnUpdateBachhaImmunizationRecord?.(...args);
  const onDeleteBachhaImmunizationRecord = (...args: any[]) => checkDeletePermission() && rawOnDeleteBachhaImmunizationRecord?.(...args);
  const onAddFirm = (...args: any[]) => checkEditPermission() && rawOnAddFirm?.(...args);
  const onAddQuotation = (...args: any[]) => checkEditPermission() && rawOnAddQuotation?.(...args);
  const onAddInventoryItem = (...args: any[]) => checkEditPermission() && rawOnAddInventoryItem?.(...args);
  const onUpdateInventoryItem = (...args: any[]) => checkEditPermission() && rawOnUpdateInventoryItem?.(...args);
  const onDeleteInventoryItem = (...args: any[]) => checkDeletePermission() && rawOnDeleteInventoryItem?.(...args);
  const onRequestStockEntry = (...args: any[]) => checkEditPermission() && rawOnRequestStockEntry?.(...args);
  const onAddStore = (...args: any[]) => checkEditPermission() && rawOnAddStore?.(...args);
  const onUpdateStore = (...args: any[]) => checkEditPermission() && rawOnUpdateStore?.(...args);
  const onDeleteStore = (...args: any[]) => checkDeletePermission() && rawOnDeleteStore?.(...args);
  const onSaveDakhilaReport = (...args: any[]) => checkEditPermission() && rawOnSaveDakhilaReport?.(...args);
  const onSaveReturnEntry = (...args: any[]) => checkEditPermission() && rawOnSaveReturnEntry?.(...args);
  const onSaveMarmatEntry = (...args: any[]) => checkEditPermission() && rawOnSaveMarmatEntry?.(...args);
  const onSaveDhuliyaunaEntry = (...args: any[]) => checkEditPermission() && rawOnSaveDhuliyaunaEntry?.(...args);
  const onSaveLogBookEntry = (...args: any[]) => checkEditPermission() && rawOnSaveLogBookEntry?.(...args);
  const onAddItem = (...args: any[]) => checkEditPermission() && rawOnAddItem?.(...args);
  const onUpdateItem = (...args: any[]) => checkEditPermission() && rawOnUpdateItem?.(...args);
  const onDeleteItem = (...args: any[]) => checkDeletePermission() && rawOnDeleteItem?.(...args);
  const onAddLeaveApplication = (...args: any[]) => checkEditPermission() && rawOnAddLeaveApplication?.(...args);
  const onUpdateLeaveStatus = (...args: any[]) => checkEditPermission() && rawOnUpdateLeaveStatus?.(...args);
  const onDeleteLeaveApplication = (...args: any[]) => checkDeletePermission() && rawOnDeleteLeaveApplication?.(...args);
  const onSaveLeaveBalance = (...args: any[]) => checkEditPermission() && rawOnSaveLeaveBalance?.(...args);
  const onSaveDarta = (...args: any[]) => checkEditPermission() && rawOnSaveDarta?.(...args);
  const onDeleteDarta = (...args: any[]) => checkDeletePermission() && rawOnDeleteDarta?.(...args);
  const onSaveChalani = (...args: any[]) => checkEditPermission() && rawOnSaveChalani?.(...args);
  const onDeleteChalani = (...args: any[]) => checkDeletePermission() && rawOnDeleteChalani?.(...args);
  const onDeleteSentLetter = (...args: any[]) => checkDeletePermission() && rawOnDeleteSentLetter?.(...args);
  const onSendLetter = (...args: any[]) => checkEditPermission() && rawOnSendLetter?.(...args);
  const onDeleteReceivedLetter = (...args: any[]) => checkDeletePermission() && rawOnDeleteReceivedLetter?.(...args);
  const onSaveBharmanAdesh = (...args: any[]) => checkEditPermission() && rawOnSaveBharmanAdesh?.(...args);
  const onDeleteBharmanAdesh = (...args: any[]) => checkDeletePermission() && rawOnDeleteBharmanAdesh?.(...args);
  const onSaveGarbhawotiRecord = (...args: any[]) => checkEditPermission() && rawOnSaveGarbhawotiRecord?.(...args);
  const onDeleteGarbhawotiRecord = (...args: any[]) => checkDeletePermission() && rawOnDeleteGarbhawotiRecord?.(...args);
  const onSavePrasutiRecord = (...args: any[]) => checkEditPermission() && rawOnSavePrasutiRecord?.(...args);
  const onDeletePrasutiRecord = (...args: any[]) => checkDeletePermission() && rawOnDeletePrasutiRecord?.(...args);
  const onSaveUttarPrasutiRecord = (...args: any[]) => checkEditPermission() && rawOnSaveUttarPrasutiRecord?.(...args);
  const onDeleteUttarPrasutiRecord = (...args: any[]) => checkDeletePermission() && rawOnDeleteUttarPrasutiRecord?.(...args);
  const onSaveServiceSeekerRecord = (...args: any[]) => checkEditPermission() && rawOnSaveServiceSeekerRecord?.(...args);
  const onDeleteServiceSeekerRecord = (...args: any[]) => checkDeletePermission() && rawOnDeleteServiceSeekerRecord?.(...args);
  const onSaveOPDRecord = (...args: any[]) => checkEditPermission() && rawOnSaveOPDRecord?.(...args);
  const onDeleteOPDRecord = (...args: any[]) => checkDeletePermission() && rawOnDeleteOPDRecord?.(...args);
  const onSaveEmergencyRecord = (...args: any[]) => checkEditPermission() && rawOnSaveEmergencyRecord?.(...args);
  const onDeleteEmergencyRecord = (...args: any[]) => checkDeletePermission() && rawOnDeleteEmergencyRecord?.(...args);
  const onSaveCBIMNCIRecord = (...args: any[]) => checkEditPermission() && rawOnSaveCBIMNCIRecord?.(...args);
  const onDeleteCBIMNCIRecord = (...args: any[]) => checkDeletePermission() && rawOnDeleteCBIMNCIRecord?.(...args);
  const onSaveBillingRecord = (...args: any[]) => checkEditPermission() && rawOnSaveBillingRecord?.(...args);
  const onDeleteBillingRecord = (...args: any[]) => checkDeletePermission() && rawOnDeleteBillingRecord?.(...args);
  const onSaveDispensaryRecord = (...args: any[]) => checkEditPermission() && rawOnSaveDispensaryRecord?.(...args);
  const onDeleteDispensaryRecord = (...args: any[]) => checkDeletePermission() && rawOnDeleteDispensaryRecord?.(...args);
  const onSaveServiceItem = (...args: any[]) => checkEditPermission() && rawOnSaveServiceItem?.(...args);
  const onDeleteServiceItem = (...args: any[]) => checkDeletePermission() && rawOnDeleteServiceItem?.(...args);
  const onSaveLabReport = (...args: any[]) => checkEditPermission() && rawOnSaveLabReport?.(...args);
  const onDeleteLabReport = (...args: any[]) => checkDeletePermission() && rawOnDeleteLabReport?.(...args);
  const onSavePariwarSewaRecord = (...args: any[]) => checkEditPermission() && rawOnSavePariwarSewaRecord?.(...args);
  const onDeletePariwarSewaRecord = (...args: any[]) => checkDeletePermission() && rawOnDeletePariwarSewaRecord?.(...args);
  const onSaveXRayRecord = (...args: any[]) => checkEditPermission() && rawOnSaveXRayRecord?.(...args);
  const onDeleteXRayRecord = (...args: any[]) => checkDeletePermission() && rawOnDeleteXRayRecord?.(...args);
  const onSaveECGRecord = (...args: any[]) => checkEditPermission() && rawOnSaveECGRecord?.(...args);
  const onDeleteECGRecord = (...args: any[]) => checkDeletePermission() && rawOnDeleteECGRecord?.(...args);
  const onSaveUSGRecord = (...args: any[]) => checkEditPermission() && rawOnSaveUSGRecord?.(...args);
  const onDeleteUSGRecord = (...args: any[]) => checkDeletePermission() && rawOnDeleteUSGRecord?.(...args);
  const onSavePhysiotherapyRecord = (...args: any[]) => checkEditPermission() && rawOnSavePhysiotherapyRecord?.(...args);
  const onDeletePhysiotherapyRecord = (...args: any[]) => checkDeletePermission() && rawOnDeletePhysiotherapyRecord?.(...args);
  const onSaveAmbulanceRecord = (...args: any[]) => checkEditPermission() && rawOnSaveAmbulanceRecord?.(...args);
  const onDeleteAmbulanceRecord = (...args: any[]) => checkDeletePermission() && rawOnDeleteAmbulanceRecord?.(...args);
  const onSaveAmbulanceExpense = (...args: any[]) => checkEditPermission() && rawOnSaveAmbulanceExpense?.(...args);
  const onDeleteAmbulanceExpense = (...args: any[]) => checkDeletePermission() && rawOnDeleteAmbulanceExpense?.(...args);
  const onSaveAmbulanceOdometerRecord = (...args: any[]) => checkEditPermission() && rawOnSaveAmbulanceOdometerRecord?.(...args);
  const onDeleteAmbulanceOdometerRecord = (...args: any[]) => checkDeletePermission() && rawOnDeleteAmbulanceOdometerRecord?.(...args);
  const onSaveIPDRecord = (...args: any[]) => checkEditPermission() && rawOnSaveIPDRecord?.(...args);
  const onDeleteIPDRecord = (...args: any[]) => checkDeletePermission() && rawOnDeleteIPDRecord?.(...args);
  const onDeleteAllIPDRecords = (...args: any[]) => checkDeletePermission() && rawOnDeleteAllIPDRecords?.(...args);
  const onAddInterFacilityRequest = (...args: any[]) => checkEditPermission() && rawOnAddInterFacilityRequest?.(...args);
  const onUpdateInterFacilityRequest = (...args: any[]) => checkEditPermission() && rawOnUpdateInterFacilityRequest?.(...args);
  const onSaveFinancialProgram = (...args: any[]) => checkEditPermission() && rawOnSaveFinancialProgram?.(...args);
  const onDeleteFinancialProgram = (...args: any[]) => checkDeletePermission() && rawOnDeleteFinancialProgram?.(...args);
  const onSaveListedParty = (...args: any[]) => checkEditPermission() && rawOnSaveListedParty?.(...args);
  const onDeleteListedParty = (...args: any[]) => checkDeletePermission() && rawOnDeleteListedParty?.(...args);
  const onSaveFinancialTransaction = (...args: any[]) => checkEditPermission() && rawOnSaveFinancialTransaction?.(...args);
  const onDeleteFinancialTransaction = (...args: any[]) => checkDeletePermission() && rawOnDeleteFinancialTransaction?.(...args);
  const onSavePartyPayment = (...args: any[]) => checkEditPermission() && rawOnSavePartyPayment?.(...args);
  const onDeletePartyPayment = (...args: any[]) => checkDeletePermission() && rawOnDeletePartyPayment?.(...args);
  const onSavePaymentRequest = (...args: any[]) => checkEditPermission() && rawOnSavePaymentRequest?.(...args);
  const onSaveAllowance = (...args: any[]) => checkEditPermission() && rawOnSaveAllowance?.(...args);
  const onUpdatePaymentRequest = (...args: any[]) => checkEditPermission() && rawOnUpdatePaymentRequest?.(...args);
  const onUpdateAllowance = (...args: any[]) => checkEditPermission() && rawOnUpdateAllowance?.(...args);
  const onDeletePaymentRequest = (...args: any[]) => checkDeletePermission() && rawOnDeletePaymentRequest?.(...args);
  const onDeleteAllowance = (...args: any[]) => checkDeletePermission() && rawOnDeleteAllowance?.(...args);
  const onSaveTalim = (...args: any[]) => checkEditPermission() && rawOnSaveTalim?.(...args);
  const onDeleteTalim = (...args: any[]) => checkDeletePermission() && rawOnDeleteTalim?.(...args);
  const onSaveKarmachariTalimRecord = (...args: any[]) => checkEditPermission() && rawOnSaveKarmachariTalimRecord?.(...args);
  const onDeleteKarmachariTalimRecord = (...args: any[]) => checkDeletePermission() && rawOnDeleteKarmachariTalimRecord?.(...args);
  const onApproveStockEntry = (...args: any[]) => checkEditPermission() && rawOnApproveStockEntry?.(...args);
  const onRejectStockEntry = (...args: any[]) => checkEditPermission() && rawOnRejectStockEntry?.(...args);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadConferenceCount, setUnreadConferenceCount] = useState(0);

  useEffect(() => {
    if (!currentUser?.id) return;
    const unreadRef = ref(db, `conferenceUnread/${currentUser.id}`);
    const unsub = onValue(unreadRef, (snap) => {
      const data = snap.val();
      if (data) {
        setUnreadConferenceCount(Object.keys(data).length);
      } else {
        setUnreadConferenceCount(0);
      }
    });
    return () => unsub();
  }, [currentUser?.id]);
  
  const readNotifIds = useMemo(() => currentUser?.readNotifications || [], [currentUser]);

  const [pendingPoDakhila, setPendingPoDakhila] = useState<PurchaseOrderEntry | null>(null);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiryModalType, setExpiryModalType] = useState<'expired' | 'near-expiry'>('expired');
  const [showExpiryPrintOptionsModal, setShowExpiryPrintOptionsModal] = useState(false); 
  const [initialDakhilaReportId, setInitialDakhilaReportId] = useState<string | null>(null);
  const [isDartaFormOpen, setIsDartaFormOpen] = useState(false);
  const [selectedReceivedLetterForDarta, setSelectedReceivedLetterForDarta] = useState<ReceivedLetter | null>(null);
  const [isChalaniFormOpen, setIsChalaniFormOpen] = useState(false);
  const [editingChalani, setEditingChalani] = useState<Chalani | null>(null);
  const [dartaSearchQuery, setDartaSearchQuery] = useState('');
  const [chalaniSearchQuery, setChalaniSearchQuery] = useState('');
  const [dartaActiveSubTab, setDartaActiveSubTab] = useState<'registered' | 'received'>('registered');
  const [chalaniActiveSubTab, setChalaniActiveSubTab] = useState<'dispatched' | 'sent'>('dispatched');
  const [selectedChalaniForSend, setSelectedChalaniForSend] = useState<Chalani | null>(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [recipientOrgForSend, setRecipientOrgForSend] = useState('');
  const [isSendingInProgress, setIsSendingInProgress] = useState(false);
  
  const [previewDakhila, setPreviewDakhila] = useState<DakhilaPratibedanEntry | null>(null);
  
  // New State for Dashboard Date Selection
  const [selectedStatsDate, setSelectedStatsDate] = useState<string>(() => {
      try { return new NepaliDate().format('YYYY-MM-DD'); } catch (e) { return ''; }
  });

  const mainContentRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const canViewFullReport = useMemo(() => {
    if (!currentUser) return false;
    return ['ADMIN', 'SUPER_ADMIN', 'STOREKEEPER', 'ACCOUNT'].includes(currentUser.role);
  }, [currentUser]);

  const systemOrganizations = useMemo(() => {
    return Array.from(new Set(allUsers.map(u => u.organizationName).filter(Boolean)));
  }, [allUsers]);

  const selectableOrganizations = useMemo(() => {
    if (!currentUser) return [];
    return systemOrganizations.filter(o => o !== currentUser.organizationName);
  }, [systemOrganizations, currentUser]);

  useEffect(() => {
    if (mainContentRef.current) mainContentRef.current.scrollTo(0, 0);
    localStorage.setItem('smart_inv_active_item', activeItem);
  }, [activeItem]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Date Manipulation Handlers
  const handlePrevDate = () => {
      try {
          const nd = new NepaliDate(selectedStatsDate);
          nd.setDate(nd.getDate() - 1);
          setSelectedStatsDate(nd.format('YYYY-MM-DD'));
      } catch (e) {}
  };

  const handleNextDate = () => {
      try {
          const nd = new NepaliDate(selectedStatsDate);
          nd.setDate(nd.getDate() + 1);
          setSelectedStatsDate(nd.format('YYYY-MM-DD'));
      } catch (e) {}
  };

  const allDakhilaNotifs = useMemo(() => {
      if (!currentUser) return [];
      return dakhilaReports
          .filter(d => d.fiscalYear === currentFiscalYear)
          .map(d => {
              const notifId = `dakhila-${d.id}`;
              return {
                  id: notifId,
                  title: 'सम्पन्न दाखिला प्रतिवेदन',
                  description: `दाखिला नम्बर ${d.dakhilaNo} सफलतापूर्वक सम्पन्न भयो। सामान विवरण हेर्न क्लिक गर्नुहोस्।`,
                  time: d.date,
                  targetMenu: 'dakhila_pratibedan',
                  type: 'success',
                  isNew: !readNotifIds.includes(notifId)
              } as AppNotification;
          })
          .sort((a, b) => b.id.localeCompare(a.id));
  }, [dakhilaReports, currentUser, readNotifIds, currentFiscalYear]);

  // For the bell dropdown, we only show latest 10 unread ones
  const notifications = useMemo(() => allDakhilaNotifs.filter(n => n.isNew).slice(0, 10), [allDakhilaNotifs]);

  // For the badge, we count ALL unread dakhilas in current fiscal year
  const unreadCount = useMemo(() => allDakhilaNotifs.filter(n => n.isNew).length, [allDakhilaNotifs]);

  // Cold Chain Daily Alerts Calculation
  const coldChainAlerts = useMemo(() => {
    const activeFridges = (props.coldChainEquipment || []).filter(e => e.isActive !== false);
    if (activeFridges.length === 0) return null;

    let todayBs = '';
    try {
      todayBs = new NepaliDate().format('YYYY-MM-DD');
    } catch {
      todayBs = '2081-01-01';
    }

    const currentHour = new Date().getHours();
    const logsToday = (props.coldChainLogs || []).filter(l => l.dateBs === todayBs);

    const missingMorning = activeFridges.filter(f => !logsToday.some(l => l.equipmentId === f.id && l.session === 'Morning'));
    const missingEvening = currentHour >= 16 ? activeFridges.filter(f => !logsToday.some(l => l.equipmentId === f.id && l.session === 'Evening')) : [];
    const outOfRangeToday = logsToday.filter(l => l.isOutOfRange);

    return {
      totalFridges: activeFridges.length,
      missingMorning,
      missingEvening,
      outOfRangeToday,
      todayBs,
      hasAlert: missingMorning.length > 0 || missingEvening.length > 0 || outOfRangeToday.length > 0
    };
  }, [props.coldChainEquipment, props.coldChainLogs]);

  // --- BADGE CALCULATIONS ---
  const counts = useMemo(() => {
    if (!currentUser) return {};

    const res: Record<string, number> = {};

    // Cold Chain badge: missing morning/evening logs or out of range
    if (coldChainAlerts && coldChainAlerts.hasAlert) {
      res.cold_chain_log = coldChainAlerts.missingMorning.length + coldChainAlerts.missingEvening.length + coldChainAlerts.outOfRangeToday.length;
    }

    // 1. Mag Faram Pending
    if (currentUser.role === 'STOREKEEPER') {
        res.mag_faram = magForms.filter(f => f.status === 'Pending').length;
    } else if (['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role)) {
        res.mag_faram = magForms.filter(f => f.status === 'Verified').length;
    }

    // 2. Purchase Order Pending (3-Step Workflow)
    if (currentUser.role === 'STOREKEEPER') {
        // Storekeeper sees 'Pending' (Drafts)
        res.kharid_adesh = purchaseOrders.filter(o => o.status === 'Pending').length;
    } else if (currentUser.role === 'ACCOUNT') {
        // Account sees 'Pending Account' (Sent by Storekeeper)
        res.kharid_adesh = purchaseOrders.filter(o => o.status === 'Pending Account').length;
    } else if (['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role)) {
        // Admin sees 'Account Verified' (Ready for Final Approval)
        res.kharid_adesh = purchaseOrders.filter(o => o.status === 'Account Verified').length;
    }

    // 3. Stock Entry Approval (Admin only)
    if (['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role)) {
        res.stock_entry_approval = stockEntryRequests.filter(r => r.status === 'Pending').length;
    }

    // 4. Issue Reports (Nikasha)
    if (currentUser.role === 'STOREKEEPER') {
        res.nikasha_pratibedan = issueReports.filter(r => r.status === 'Pending').length;
    } else if (['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role)) {
        res.nikasha_pratibedan = issueReports.filter(r => r.status === 'Pending Approval').length;
    }

    // 5. Unread Dakhila Reports
    res.dakhila_pratibedan = unreadCount;

    // 6. Unread Received Letters in active fiscal year
    res.darta = (receivedLetters || []).filter(r => r.fiscalYear === currentFiscalYear && r.isRead !== true).length;

    return res;
  }, [currentUser, magForms, purchaseOrders, stockEntryRequests, issueReports, unreadCount, receivedLetters, currentFiscalYear]);

  const handleMarkDakhilaRead = useCallback((id: string) => {
      const notifId = `dakhila-${id}`;
      if (currentUser && !readNotifIds.includes(notifId)) {
          onUpdateReadNotifications(currentUser.id, [...readNotifIds, notifId]);
      }
  }, [readNotifIds, currentUser, onUpdateReadNotifications]);

  const handleNotifClick = (n: AppNotification) => {
      setShowNotifications(false);
      handleMarkDakhilaRead(n.id.replace('dakhila-', ''));
      
      if (n.id.startsWith('dakhila-')) {
          const reportId = n.id.replace('dakhila-', '');
          const report = dakhilaReports.find(r => r.id === reportId);
          if (report) {
              setPreviewDakhila(report);
          } else {
              setActiveItem(n.targetMenu);
          }
      } else {
          setActiveItem(n.targetMenu);
      }
  };

  const managedOrgs = useMemo(() => {
    if (currentUser?.role === 'SUPER_ADMIN') {
      const orgs = allUsers.map(u => u.organizationName).filter(Boolean);
      return Array.from(new Set([currentUser.organizationName, ...orgs]));
    }
    return [];
  }, [allUsers, currentUser]);

  const handleOpenFullDakhila = () => {
      if (previewDakhila && canViewFullReport) {
          setInitialDakhilaReportId(previewDakhila.id);
          setActiveItem('dakhila_pratibedan');
          setPreviewDakhila(null);
      }
  };

  const clearAllNotifs = () => {
      if (!currentUser) return;
      const allIds = allDakhilaNotifs.map(n => n.id);
      const newReadIds = Array.from(new Set([...readNotifIds, ...allIds]));
      onUpdateReadNotifications(currentUser.id, newReadIds);
      setShowNotifications(false);
  };

  const fixDate = useCallback((d: string) => {
    if (!d) return '';
    const parts = d.split(/[-/]/).map(p => p.padStart(2, '0'));
    return parts.length === 3 ? `${parts[0]}-${parts[1]}-${parts[2]}` : d; 
  }, []);

  const expiredItems = useMemo(() => {
      const now = new Date();
      return inventoryItems.filter(item => item.expiryDateAd && item.currentQuantity > 0 && new Date(item.expiryDateAd) < now);
  }, [inventoryItems]);

  const nearExpiryItems = useMemo(() => {
      const now = new Date();
      const threeMonthsLater = new Date();
      threeMonthsLater.setDate(now.getDate() + 90);
      return inventoryItems.filter(item => item.expiryDateAd && item.currentQuantity > 0 && new Date(item.expiryDateAd) >= now && new Date(item.expiryDateAd) <= threeMonthsLater);
  }, [inventoryItems]);

  const rabiesDoseStats = useMemo(() => {
    const stats = { d0Total: 0, d0Received: 0, d0Progress: 0, d3Total: 0, d3Received: 0, d3Progress: 0, d7Total: 0, d7Received: 0, d7Progress: 0 };
    // Use selectedStatsDate instead of just today
    const targetDate = fixDate(selectedStatsDate);
    
    rabiesPatients.forEach(p => (p.schedule || []).forEach(dose => {
        if (fixDate(dose.dateBs || '') === targetDate) {
            if (dose.day === 0) { stats.d0Total++; if (dose.status === 'Given') stats.d0Received++; }
            else if (dose.day === 3) { stats.d3Total++; if (dose.status === 'Given') stats.d3Received++; }
            else if (dose.day === 7) { stats.d7Total++; if (dose.status === 'Given') stats.d7Received++; }
        }
    }));
    stats.d0Progress = stats.d0Total > 0 ? Math.round((stats.d0Received / stats.d0Total) * 100) : 0;
    stats.d3Progress = stats.d3Total > 0 ? Math.round((stats.d3Received / stats.d3Total) * 100) : 0;
    stats.d7Progress = stats.d7Total > 0 ? Math.round((stats.d7Received / stats.d7Total) * 100) : 0;
    return stats;
  }, [rabiesPatients, fixDate, selectedStatsDate]);

  const vaccineForecast = useMemo(() => {
      const mlPerDose = 0.2;
      let currentMonth = '';
      try { currentMonth = new NepaliDate().format('MM'); } catch (e) { currentMonth = '01'; }
      const monthPatients = rabiesPatients.filter(p => p.regMonth === currentMonth && p.fiscalYear === currentFiscalYear);
      const pendingDoses = monthPatients.reduce((acc, p) => acc + (p.schedule ? p.schedule.filter(d => d.status === 'Pending').length : 0), 0);
      const totalMl = pendingDoses * mlPerDose;
      return { monthPatients: monthPatients.length, pendingDoses, totalMl: totalMl.toFixed(1), vials05: Math.ceil(totalMl / 0.5), vials10: Math.ceil(totalMl / 1.0) };
  }, [rabiesPatients, currentFiscalYear]);

  const inventoryTotalCount = useMemo(() => inventoryItems.filter(i => i.currentQuantity > 0).length, [inventoryItems]);
  const magFormsPendingCount = useMemo(() => magForms.filter(f => f.status === 'Pending').length, [magForms]);

  const DPT1_VACCINE_NAME = useMemo(() => {
    return NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.find(v => v.name.includes('DPT-HepB-Hib-1'))?.name || 'DPT-HepB-Hib-1 (६ हप्ता)';
  }, []);

  const MR2_VACCINE_NAME = useMemo(() => {
    return NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.find(v => v.name.includes('MR-2'))?.name || 'MR-2 (१५ महिना)';
  }, []);

  // Normalize fiscal year format (e.g. "2081/082", "2081/82", "2081082" -> "2081/082")
  const normalizeFy = useCallback((fy?: string | null): string => {
    if (!fy) return '';
    const clean = fy.replace(/[^0-9]/g, '');
    if (clean.length === 7) return `${clean.slice(0, 4)}/${clean.slice(4)}`;
    if (clean.length === 6) return `${clean.slice(0, 4)}/0${clean.slice(4)}`;
    if (clean.length === 8) return `${clean.slice(0, 4)}/0${clean.slice(6, 8)}`;
    return fy.trim();
  }, []);

  // Compute fiscal year from Nepali date (Shrawan month 04 starts the new fiscal year)
  const getFyFromDateBs = useCallback((dateBs?: string | null): string => {
    if (!dateBs || typeof dateBs !== 'string') return '';
    const parts = dateBs.replace(/\//g, '-').split('-');
    if (parts.length < 2) return '';
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (isNaN(year) || isNaN(month)) return '';
    if (month >= 4) {
      const nextYearShort = (year + 1) % 100;
      const nextYearStr = nextYearShort < 10 ? `0${nextYearShort}` : `${nextYearShort}`;
      return `${year}/0${nextYearStr}`;
    } else {
      const prevYear = year - 1;
      const yearShort = year % 100;
      const yearStr = yearShort < 10 ? `0${yearShort}` : `${yearShort}`;
      return `${prevYear}/0${yearStr}`;
    }
  }, []);

  const dropoutStats = useMemo(() => {
    const targetFyNorm = normalizeFy(currentFiscalYear);

    // Checks if a vaccine dose matches the active logged-in fiscal year based on givenDateBs (or record fallback)
    const matchesDoseFy = (vaccine: any, recordFy?: string) => {
      if (vaccine.givenDateBs) {
        const doseFy = normalizeFy(getFyFromDateBs(vaccine.givenDateBs));
        if (doseFy) return doseFy === targetFyNorm;
      }
      return normalizeFy(recordFy) === targetFyNorm;
    };

    const isDpt1 = (v: any) => {
      if (v.status !== 'Given') return false;
      if (v.vaccinatedElsewhere) return false;
      const name = v.name || '';
      const nameLower = name.toLowerCase();
      return name === DPT1_VACCINE_NAME || 
             nameLower.includes('dpt-hepb-hib-1') || 
             nameLower.includes('dpt-hepb-hib 1') || 
             nameLower.includes('dpt 1') || 
             nameLower.includes('penta-1') || 
             nameLower.includes('penta 1') ||
             nameLower.includes('pentavalent-1') ||
             nameLower.includes('pentavalent 1');
    };

    const isMr2 = (v: any) => {
      if (v.status !== 'Given') return false;
      if (v.vaccinatedElsewhere) return false;
      const name = v.name || '';
      const nameLower = name.toLowerCase();
      return name === MR2_VACCINE_NAME || 
             nameLower.includes('mr-2') || 
             nameLower.includes('mr 2') || 
             nameLower.includes('measles 2') ||
             nameLower.includes('mr-२') ||
             nameLower.includes('mr २');
    };

    const dpt1Given = (bachhaImmunizationRecords || []).filter(r =>
      (r.vaccines || []).some(v => isDpt1(v) && matchesDoseFy(v, r.fiscalYear))
    ).length;

    const mr2Given = (bachhaImmunizationRecords || []).filter(r =>
      (r.vaccines || []).some(v => isMr2(v) && matchesDoseFy(v, r.fiscalYear))
    ).length;

    const dropoutCount = Math.max(dpt1Given - mr2Given, 0);
    const dropoutRate = dpt1Given > 0 ? (dropoutCount / dpt1Given) * 100 : 0;

    return { dpt1Given, mr2Given, dropoutCount, dropoutRate };
  }, [bachhaImmunizationRecords, currentFiscalYear, DPT1_VACCINE_NAME, MR2_VACCINE_NAME, normalizeFy, getFyFromDateBs]);

  const hasAccess = useCallback((menuId: string) => {
    if (!currentUser) return false;
    if (menuId === 'organization_management' && currentUser.role !== 'SUPER_ADMIN') return false;
    if (menuId === 'audit_log' && currentUser.role !== 'SUPER_ADMIN') return false;
    if (menuId === 'talim_byabasthapan' && !['SUPER_ADMIN', 'ADMIN', 'HEALTH_SECTION'].includes(currentUser.role)) return false;
    if (menuId === 'general_setting' && currentUser.canManageMenu) return true;
    if (currentUser.role === 'SUPER_ADMIN') return true;
    return currentUser.allowedMenus?.includes(menuId);
  }, [currentUser]);

  useEffect(() => {
    if (activeItem === 'dashboard' && !hasAccess('dashboard')) {
      if (hasAccess('online_report')) {
        setActiveItem('online_report');
      }
    }
  }, [activeItem, hasAccess]);

  const menuItems = useMemo(() => {
    const config = generalSettings.menuConfig;

    const getBaseItem = (id: string, source: MenuItem[]): MenuItem | undefined => {
      for (const item of source) {
        if (item.id === id) return { ...item };
        if (item.subItems) {
          const found = getBaseItem(id, item.subItems);
          if (found) return found;
        }
      }
      return undefined;
    };

    const filterAndProcessItems = (items: MenuItem[]): MenuItem[] => {
      return items.map(item => {
        // Recursively filter sub-items
        const filteredSubItems = item.subItems ? filterAndProcessItems(item.subItems) : undefined;
        
        // Check if the item itself is accessible OR has accessible children
        const isAccessible = hasAccess(item.id);
        const hasAccessibleChildren = filteredSubItems && filteredSubItems.length > 0;
        
        if (isAccessible || hasAccessibleChildren) {
          // Dynamic badge counts from the 'counts' state and other sources
          let dynamicBadge = item.badgeCount;
          if (item.id === 'darta') dynamicBadge = counts.darta;
          if (item.id === 'stock_entry_approval') dynamicBadge = counts.stock_entry_approval;
          if (item.id === 'mag_faram') dynamicBadge = counts.mag_faram;
          if (item.id === 'kharid_adesh') dynamicBadge = counts.kharid_adesh;
          if (item.id === 'nikasha_pratibedan') dynamicBadge = counts.nikasha_pratibedan;
          if (item.id === 'dakhila_pratibedan') dynamicBadge = counts.dakhila_pratibedan;
          if (item.id === 'conference') dynamicBadge = unreadConferenceCount > 0 ? unreadConferenceCount : undefined;

          // Calculate sub-badges sum if not specifically set
          const subBadgesSum = filteredSubItems?.reduce((acc, si) => acc + (si.badgeCount || 0), 0) || 0;
          
          return {
            ...item,
            subItems: filteredSubItems,
            badgeCount: dynamicBadge !== undefined ? dynamicBadge : (subBadgesSum > 0 ? subBadgesSum : undefined)
          };
        }
        return null;
      }).filter(Boolean) as MenuItem[];
    };

    let sourceItems: MenuItem[] = [];
    
    if (config && config.length > 0) {
      // Reconstruct menu from config
      const reconstruct = (cfgList: any[]): MenuItem[] => {
        return cfgList.map(cfg => {
          // If this config item is top-level but ALL_MENU_ITEMS has it nested elsewhere, ignore it at top-level
          const isTopLevelInBase = ALL_MENU_ITEMS.some(m => m.id === cfg.id);
          const base = getBaseItem(cfg.id, ALL_MENU_ITEMS);
          if (!base) return null;
          
          let reconstructedSubItems: MenuItem[] | undefined = undefined;
          if (cfg.subItems) {
            reconstructedSubItems = reconstruct(cfg.subItems);
          }
          
          // If the base item has sub-items, but they aren't fully represented in the config,
          // we should preserve or append the missing sub-items so that updates are automatically shown.
          if (base.subItems && base.subItems.length > 0) {
            reconstructedSubItems = reconstructedSubItems || [];
            base.subItems.forEach(baseSub => {
              if (!reconstructedSubItems?.some(rsi => rsi.id === baseSub.id)) {
                reconstructedSubItems!.push({ ...baseSub });
              }
            });
          }
          
          return {
            ...base,
            subItems: reconstructedSubItems && reconstructedSubItems.length > 0 ? reconstructedSubItems : undefined
          };
        }).filter(Boolean) as MenuItem[];
      };
      
      sourceItems = reconstruct(config.filter(c => ALL_MENU_ITEMS.some(m => m.id === c.id)));
      
      // Add any missing top-level items (in case of updates)
      ALL_MENU_ITEMS.forEach(baseItem => {
        if (!sourceItems.find(si => si.id === baseItem.id)) {
          sourceItems.push({ ...baseItem });
        }
      });
    } else {
      sourceItems = ALL_MENU_ITEMS;
    }

    return filterAndProcessItems(sourceItems);
  }, [currentUser, hasAccess, counts, unreadConferenceCount, generalSettings.menuConfig]);

  const handlePrint = useCallback((printContentId: string, orientation: 'portrait' | 'landscape' = 'portrait') => {
    const printContent = document.getElementById(printContentId);
    if (!printContent) {
      alert('प्रिन्ट गर्नको लागि कुनै डाटा छैन।');
      return;
    }

    // Create a hidden iframe for printing to avoid destroying React state/DOM
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 ${orientation}; margin: 1cm; }
          body { font-family: 'Mukta', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 20px; }
          /* Helper to hide print elements in app but show here */
          .print-container { display: block !important; }
          /* Ensure table borders are visible */
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
          th { background-color: #f8fafc; font-weight: bold; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
           // Wait for resources (fonts/tailwind) to load slightly
           window.onload = function() {
              setTimeout(function() {
                 window.print();
              }, 1000);
           };
        </script>
      </body>
      </html>
    `);
    doc.close();

    // Clean up iframe after a delay to ensure print dialog has opened
    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
        setShowExpiryPrintOptionsModal(false);
    }, 5000); 
  }, []);

  const renderContent = () => {
    if (!currentUser) return null;
    
    // Check if user has access to the active item
    if (activeItem === 'dashboard') {
      if (!hasAccess('dashboard')) {
        if (hasAccess('online_report')) {
          return (
            <OnlineReport 
              currentFiscalYear={currentFiscalYear}
              currentUser={currentUser}
              generalSettings={generalSettings}
              serviceSeekerRecords={serviceSeekerRecords}
              opdRecords={opdRecords}
              emergencyRecords={emergencyRecords}
              billingRecords={billingRecords}
              dispensaryRecords={dispensaryRecords}
              labReports={labReports}
            />
          );
        }
        return null;
      }
    } else if (!hasAccess(activeItem)) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 mt-20">
                <ShieldAlert size={64} className="text-red-400" />
                <h3 className="text-xl font-bold text-slate-600 font-nepali">पहुँच अस्वीकृत (Access Denied)</h3>
                <p className="text-sm">तपाईंसँग यो मेनु चलाउने अनुमति छैन।</p>
                {hasAccess('dashboard') ? (
                  <button onClick={() => setActiveItem('dashboard')} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">ड्यासबोर्डमा जानुहोस्</button>
                ) : hasAccess('online_report') ? (
                  <button onClick={() => setActiveItem('online_report')} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">अनलाइन रिपोर्टमा जानुहोस्</button>
                ) : null}
            </div>
        );
    }

    switch (activeItem) {
      case 'dashboard': return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 shrink-0"><Activity size={24} /></div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 font-nepali">प्रणाली ड्यासबोर्ड (System Dashboard)</h2>
                <p className="text-xs sm:text-sm text-slate-500">प्रणालीको हालको अवस्था र तथ्याङ्क</p>
              </div>
            </div>
            <button onClick={() => handlePrint('dashboard-main-print')} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium shadow-sm hover:bg-slate-900 no-print">
              <Printer size={18} /> प्रिन्ट
            </button>
          </div>
          <div id="dashboard-main-print" className="print-container">
            <div className="hidden print:block text-center mb-6">
              <h1 className="text-xl font-bold text-red-600">{generalSettings.orgNameNepali}</h1>
              <h2 className="text-lg font-bold underline mt-2">प्रणाली ड्यासबोर्ड सारांश</h2>
              <p className="text-sm">मिति: {new NepaliDate().format('YYYY-MM-DD')}</p>
            </div>

            {/* Cold Chain Missed Readings & Temperature Alert Banner */}
            {coldChainAlerts && coldChainAlerts.hasAlert && (
              <div 
                onClick={() => setActiveItem('cold_chain_log')}
                className="bg-gradient-to-r from-amber-500/10 via-cyan-500/10 to-blue-500/10 border border-amber-200 hover:border-cyan-400 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 cursor-pointer transition-all shadow-xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl group-hover:scale-105 transition-transform">
                    <Thermometer size={22} className="text-amber-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-800">
                        कोल्ड चेन दैनिक तापक्रम अलर्ट (Cold Chain Alert)
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        आज {coldChainAlerts.todayBs}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {coldChainAlerts.outOfRangeToday.length > 0 ? (
                        <span className="text-rose-700 font-bold">
                          ⚠️ आज {coldChainAlerts.outOfRangeToday.length} वटा उपकरणमा तापक्रम सुरक्षित दायरा भन्दा बाहिर रेकर्ड भएको छ!{' '}
                        </span>
                      ) : null}
                      {coldChainAlerts.missingMorning.length > 0 ? (
                        <span>बिहानको तापक्रम बाँकी: <b>{coldChainAlerts.missingMorning.map(f => f.name).join(', ')}</b>. </span>
                      ) : null}
                      {coldChainAlerts.missingEvening.length > 0 ? (
                        <span>बेलुकीको तापक्रम बाँकी: <b>{coldChainAlerts.missingEvening.map(f => f.name).join(', ')}</b>. </span>
                      ) : null}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors">
                    तापक्रम दर्ता गर्नुहोस् →
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4 md:gap-6 print:grid-cols-2 print:gap-4 print:mb-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Anti Rabies Clinic Progress</p>
                            <div className="flex items-center gap-2">
                                <button onClick={handlePrevDate} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                                    <ChevronLeft size={14}/>
                                </button>
                                <h3 className="text-sm font-bold text-slate-700 font-nepali">{selectedStatsDate}</h3>
                                <button onClick={handleNextDate} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                                    <ChevronRight size={14}/>
                                </button>
                            </div>
                        </div>
                        <div className="bg-red-100 p-2.5 rounded-xl text-red-600"><Syringe size={20} /></div>
                    </div>
                    <div className="space-y-3">
                        {['D0', 'D3', 'D7'].map((d, idx) => { 
                            const stats = idx === 0 ? { p: rabiesDoseStats.d0Progress, r: rabiesDoseStats.d0Received, t: rabiesDoseStats.d0Total } 
                                : idx === 1 ? { p: rabiesDoseStats.d3Progress, r: rabiesDoseStats.d3Received, t: rabiesDoseStats.d3Total } 
                                : { p: rabiesDoseStats.d7Progress, r: rabiesDoseStats.d7Received, t: rabiesDoseStats.d7Total }; 
                            return ( 
                                <div key={d} className="space-y-1"> 
                                    <div className="flex justify-between text-[10px] font-bold"> 
                                        <span className="text-slate-500">{d} Dose:</span> 
                                        <span className={stats.p === 100 ? 'text-green-600' : 'text-orange-600'}>{stats.r}/{stats.t}</span> 
                                    </div> 
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"> 
                                        <div className={`h-full transition-all duration-700 ${stats.p === 100 ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${stats.p}%` }}></div> 
                                    </div> 
                                </div> 
                            ); 
                        })} 
                    </div>
                </div>
              </div>

              {/* DPT1 vs MR2 Dropout Rate Card */}
              <div 
                className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group transition-all cursor-pointer relative ${
                  dropoutStats.dropoutRate > 10 
                    ? 'hover:border-rose-300' 
                    : dropoutStats.dropoutRate > 5 
                    ? 'hover:border-amber-300' 
                    : 'hover:border-emerald-300'
                }`}
                onClick={() => setActiveItem('report_khop')}
                title="खोप प्रतिवेदन (EPI Report) हेर्न क्लिक गर्नुहोस्"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">EPI Dropout (आ.व. {toNepaliDigits(currentFiscalYear)})</p>
                      <div className="group/tip relative inline-block">
                        <Info size={13} className="text-slate-400 hover:text-slate-600 cursor-help shrink-0" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tip:block z-30 w-64 p-3 bg-slate-800 text-white text-[11px] rounded-xl shadow-xl leading-relaxed">
                          यस संस्थामा DPT1 पाएका तर MR2 नपाएका बालबालिकाको प्रतिशत (अन्यत्र लगाएको समावेश हुँदैन)।
                          <div className="mt-1.5 pt-1.5 border-t border-slate-700 text-slate-300 text-[10px] font-mono">
                            सूत्र: ((DPT1 - MR2) / DPT1) × 100
                          </div>
                        </div>
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-slate-700 font-nepali truncate" title="DPT1 vs MR2 ड्रपआउट दर">
                      DPT1 vs MR2 ड्रपआउट दर
                    </h3>
                  </div>
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    dropoutStats.dropoutRate > 10 
                      ? 'bg-rose-100 text-rose-600' 
                      : dropoutStats.dropoutRate > 5 
                      ? 'bg-amber-100 text-amber-600' 
                      : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    <TrendingDown size={20} />
                  </div>
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className={`text-4xl sm:text-5xl font-black ${
                    dropoutStats.dropoutRate > 10 
                      ? 'text-rose-600' 
                      : dropoutStats.dropoutRate > 5 
                      ? 'text-amber-600' 
                      : 'text-emerald-600'
                  }`}>
                    {dropoutStats.dropoutRate.toFixed(1)}%
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                    dropoutStats.dropoutRate > 10 
                      ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                      : dropoutStats.dropoutRate > 5 
                      ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {dropoutStats.dropoutRate > 10 ? '>10% उच्च' : dropoutStats.dropoutRate > 5 ? '५-१०% मध्यम' : '≤५% सामान्य'}
                  </span>
                </div>

                <p className="text-[11px] font-bold text-slate-500 font-nepali truncate">
                  DPT1: {dropoutStats.dpt1Given} → MR2: {dropoutStats.mr2Given} <span className="text-slate-400 font-normal">(छाडेको: {dropoutStats.dropoutCount})</span>
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group hover:border-blue-300 transition-all cursor-pointer" onClick={() => setActiveItem('jinshi_maujdat')}><div className="flex items-center justify-between mb-6"><div><p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Inventory</p><h3 className="text-sm font-bold text-slate-700 font-nepali">जिन्सी मौज्दात</h3></div><div className="bg-blue-100 p-2.5 rounded-xl text-blue-600"><Warehouse size={20} /></div></div><div className="flex items-baseline gap-2"><span className="text-5xl font-black text-blue-600">{inventoryTotalCount}</span><span className="text-[10px] text-slate-400 font-bold uppercase">Items</span></div></div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><div className="flex items-center justify-between mb-4"><div><p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Forecast (Month)</p><h3 className="text-sm font-bold text-slate-700 font-nepali">खोप पूर्वानुमान</h3></div><div className="bg-cyan-100 p-2.5 rounded-xl text-cyan-600"><Calculator size={20} /></div></div><div className="space-y-3"><div className="flex justify-between items-center"><span className="text-[11px] font-bold text-slate-500">कुल मात्रा:</span><span className="text-xs font-black text-indigo-600">{vaccineForecast.totalMl} ml</span></div><div className="grid grid-cols-2 gap-2"><div className="bg-slate-50 p-1.5 rounded-lg border text-center"><p className="text-[8px] font-bold text-slate-400">1.0 ml Vials</p><p className="text-sm font-black text-indigo-700">{vaccineForecast.vials10}</p></div><div className="bg-slate-50 p-1.5 rounded-lg border text-center"><p className="text-[8px] font-bold text-slate-400">0.5 ml Vials</p><p className="text-sm font-black text-indigo-700">{vaccineForecast.vials05}</p></div></div></div></div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer" onClick={() => setActiveItem('mag_faram')}><div className="flex items-center justify-between mb-6"><div><p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Pending</p><h3 className="text-sm font-bold text-slate-700 font-nepali">बाँकी माग</h3></div><div className="bg-orange-100 p-2.5 rounded-xl text-orange-600"><FilePlus size={20} /></div></div><div className="flex items-baseline gap-2"><span className="text-5xl font-black text-orange-600">{magFormsPendingCount}</span><span className="text-[10px] text-slate-400 font-bold uppercase">Forms</span></div></div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-red-300 transition-all group" onClick={() => { setExpiryModalType('expired'); setShowExpiryModal(true); }}><div className="absolute -right-2 -bottom-2 text-red-50 opacity-10 group-hover:scale-110 transition-transform"><Flame size={80} /></div><div className="relative z-10"><div className="flex items-center justify-between mb-6"><div><p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Safety Alert</p><h3 className="text-sm font-bold text-slate-700 font-nepali">म्याद सकिएका</h3></div><div className="bg-red-100 p-2.5 rounded-xl text-red-600"><AlertOctagon size={20} /></div></div><div className="flex items-baseline gap-2"><span className="text-5xl font-black text-red-600">{expiredItems.length}</span><span className="text-[10px] text-slate-400 font-bold uppercase">Items</span></div></div></div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-amber-300 transition-all group" onClick={() => { setExpiryModalType('near-expiry'); setShowExpiryModal(true); }}><div className="absolute -right-2 -bottom-2 text-amber-50 opacity-10 group-hover:rotate-12 transition-transform"><CalendarClock size={80} /></div><div className="relative z-10"><div className="flex items-center justify-between mb-6"><div><p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Soon</p><h3 className="text-sm font-bold text-slate-700 font-nepali">सकिन लागेका</h3></div><div className="bg-amber-100 p-2.5 rounded-xl text-amber-600"><Timer size={20} /></div></div><div className="flex items-baseline gap-2"><span className="text-5xl font-black text-amber-600">{nearExpiryItems.length}</span><span className="text-[10px] text-slate-400 font-bold uppercase">90 Days</span></div></div></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-1 print:gap-4 print:mt-6">
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                  <h4 className="font-bold text-slate-800 font-nepali mb-4 flex items-center gap-2">
                      <Syringe size={18} className="text-indigo-600"/> 
                      {selectedStatsDate === new NepaliDate().format('YYYY-MM-DD') ? 'आजका एन्टीरेविज' : `${selectedStatsDate} का`} खोप सेवाग्राहीहरू (D0, D3, D7)
                  </h4>
                  <table className="w-full text-xs text-left print-table responsive-table">
                      <thead className="bg-slate-50 font-bold"><tr><th className="p-2 border-b">बिरामीको नाम</th><th className="p-2 border-b text-center">डोज</th><th className="p-2 border-b text-right">सम्पर्क</th></tr></thead>
                      <tbody className="divide-y">
                          {(rabiesPatients || []).filter(p => (p.schedule || []).some(d => fixDate(d.dateBs || '') === fixDate(selectedStatsDate))).map(p => (
                              <tr key={p.id} className="hover:bg-slate-50">
                                <td className="p-2 font-bold" data-label="बिरामीको नाम">{p.name}</td>
                                <td className="p-2 text-center" data-label="डोज">
                                  <div className="flex justify-center md:justify-center gap-1">
                                    {(p.schedule || []).filter(d => fixDate(d.dateBs || '') === fixDate(selectedStatsDate)).map(d => ( 
                                      <span key={d.day} className={`px-2 py-0.5 rounded-full font-black text-[10px] ${d.status === 'Given' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>D{d.day}</span> 
                                    ))}
                                  </div>
                                </td>
                                <td className="p-2 text-right font-mono" data-label="सम्पर्क">{p.phone}</td>
                              </tr>
                          ))}
                          {(rabiesPatients || []).filter(p => (p.schedule || []).some(d => fixDate(d.dateBs || '') === fixDate(selectedStatsDate))).length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400 italic">छानिएको मितिमा कुनै सेवाग्राही छैनन्।</td></tr>}
                      </tbody>
                  </table>
               </div>
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 font-nepali mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-blue-600"/> मौज्दात सारांश
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-center">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-1">खर्च हुने (Expendable)</p>
                      <p className="text-2xl font-black text-blue-700">{inventoryItems.filter(i => i.itemType === 'Expendable' && i.currentQuantity > 0).length}</p>
                    </div>
                    <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-100 text-center">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-1">खर्च नहुने (Non-Exp)</p>
                      <p className="text-2xl font-black text-teal-700">{inventoryItems.filter(i => i.itemType === 'Non-Expendable' && i.currentQuantity > 0).length}</p>
                    </div>
                  </div>
               </div>
               <div className="lg:col-span-2">
                <OnLeaveToday users={users} leaveApplications={leaveApplications} />
               </div>
            </div>
          </div>
        </div>
      );
      case 'khop_sewa': return <VaccinationServiceTabs 
        currentFiscalYear={currentFiscalYear} 
        generalSettings={generalSettings} 
        onUpdateGeneralSettings={onUpdateGeneralSettings} 
        garbhawatiPatients={garbhawatiPatients} 
        onAddGarbhawatiPatient={onAddGarbhawatiPatient} 
        onUpdateGarbhawatiPatient={onUpdateGarbhawatiPatient} 
        onDeleteGarbhawatiPatient={onDeleteGarbhawatiPatient} 
        bachhaImmunizationRecords={bachhaImmunizationRecords} 
        onAddBachhaImmunizationRecord={onAddBachhaImmunizationRecord} 
        onUpdateBachhaImmunizationRecord={onUpdateBachhaImmunizationRecord} 
        onDeleteBachhaImmunizationRecord={onDeleteBachhaImmunizationRecord} 
        activeOrgName={activeOrgName}
        currentUser={currentUser}
        allUsers={allUsers}
        onSetActiveOrgName={onSetActiveOrgName}
      />;
      case 'immunization_tracking': return <ImmunizationTracking 
        currentFiscalYear={currentFiscalYear} 
        records={bachhaImmunizationRecords} 
        garbhawatiPatients={garbhawatiPatients} 
        generalSettings={generalSettings} 
        currentUser={currentUser} 
        onDeleteRecord={onDeleteBachhaImmunizationRecord} 
        onUpdateUser={onUpdateUser}
        allUsers={allUsers}
        activeOrgName={activeOrgName}
        onSetActiveOrgName={onSetActiveOrgName}
      />;
      case 'cold_chain_log': return <ColdChainLog
        coldChainLogs={props.coldChainLogs || []}
        coldChainEquipment={props.coldChainEquipment || []}
        onSaveLog={props.onSaveColdChainLog!}
        onDeleteLog={props.onDeleteColdChainLog!}
        onSaveEquipment={props.onSaveColdChainEquipment!}
        onDeleteEquipment={props.onDeleteColdChainEquipment!}
        currentUser={currentUser}
        generalSettings={generalSettings}
        activeOrgName={activeOrgName}
        onUpdateGeneralSettings={onUpdateGeneralSettings}
      />;
      case 'cold_chain_equipment': return <ColdChainEquipmentManager
        equipmentList={props.coldChainEquipment || []}
        onSaveEquipment={props.onSaveColdChainEquipment!}
        onDeleteEquipment={props.onDeleteColdChainEquipment!}
        currentUser={currentUser}
        generalSettings={generalSettings}
        onBackToLogs={() => setActiveItem('cold_chain_log')}
      />;
      case 'report_khop': return <ImmunizationReport 
        currentFiscalYear={currentFiscalYear} 
        bachhaRecords={bachhaImmunizationRecords} 
        maternalRecords={garbhawatiPatients} 
        generalSettings={generalSettings} 
        currentUser={currentUser}
        allUsers={allUsers}
        activeOrgName={activeOrgName}
        onSetActiveOrgName={onSetActiveOrgName}
      />;
      case 'report_microplanning': return <Microplanning 
        currentFiscalYear={currentFiscalYear} 
        bachhaRecords={bachhaImmunizationRecords} 
        maternalRecords={garbhawatiPatients} 
        generalSettings={generalSettings}
        currentUser={currentUser}
        allUsers={allUsers}
        activeOrgName={activeOrgName}
        onSetActiveOrgName={onSetActiveOrgName}
      />;
      case 'conference': return <Conference currentUser={currentUser} allUsers={users} />;
      case 'organization_management': return <OrganizationManagement currentUser={currentUser} users={users} onUpdateUser={onUpdateUser} onDeleteUser={onDeleteUser} onDeleteOrganization={onDeleteOrganization} />;
      case 'user_management': return <UserManagement currentUser={currentUser} users={users} onAddUser={onAddUser} onUpdateUser={onUpdateUser} onDeleteUser={onDeleteUser} isDbLocked={isDbLocked} />;
      case 'audit_log': return currentUser?.role === 'SUPER_ADMIN' ? <AuditLogViewer auditLogs={props.auditLogs || []} users={users} activeOrgName={activeOrgName} /> : null;
      case 'user_history': return <UserHistory users={users} />;
      case 'change_password': return <ChangePassword currentUser={currentUser} users={users} onChangePassword={onChangePassword} onUpdateUser={onUpdateUser} />;
      case 'store_setup': return <StoreSetup currentUser={currentUser} currentFiscalYear={currentFiscalYear} stores={stores} onAddStore={onAddStore} onUpdateStore={onUpdateStore} onDeleteStore={onDeleteStore} inventoryItems={inventoryItems} onUpdateInventoryItem={onUpdateInventoryItem} />;
      case 'tb_leprosy': return <TBPatientRegistration 
                                  currentFiscalYear={currentFiscalYear} 
                                  patients={tbPatients} 
                                  inventoryItems={inventoryItems}
                                  interFacilityRequests={interFacilityRequests}
                                  allUsers={allUsers}
                                  currentUser={currentUser}
                                  generalSettings={generalSettings}
                                  serviceSeekerRecords={serviceSeekerRecords}
                                  onUpdateGeneralSettings={onUpdateGeneralSettings}
                                  onAddPatient={onAddTbPatient} 
                                  onUpdatePatient={onUpdateTbPatient} 
                                  onDeletePatient={onDeleteTbPatient} 
                                  onAddInterFacilityRequest={onAddInterFacilityRequest}
                                  onUpdateInterFacilityRequest={onUpdateInterFacilityRequest}
                                />;
      case 'fchv_karyakram': return <FCHVKaryakram activeOrgName={activeOrgName} currentFiscalYear={currentFiscalYear} />;
      case 'vitamin_a': return <VitaminAProgram currentFiscalYear={currentFiscalYear} activeOrgName={activeOrgName} generalSettings={generalSettings} currentUser={currentUser} allUsers={allUsers} />;
      case 'khop_abhiyan': return <KhopAbhiyan currentFiscalYear={currentFiscalYear} activeOrgName={activeOrgName} generalSettings={generalSettings} currentUser={currentUser} allUsers={users} />;
      case 'rabies': return <RabiesRegistration currentFiscalYear={currentFiscalYear} patients={rabiesPatients} onAddPatient={onAddRabiesPatient} onUpdatePatient={onUpdatePatient} onDeletePatient={onDeletePatient} currentUser={currentUser} />;
      case 'report_rabies': return <RabiesReport currentFiscalYear={currentFiscalYear} currentUser={currentUser} patients={rabiesPatients} />;
      case 'report_cbimnci': return <CBIMNCIReport cbimnciRecords={cbimnciRecords} serviceSeekerRecords={serviceSeekerRecords} currentFiscalYear={currentFiscalYear} generalSettings={generalSettings} currentUser={currentUser} />;
      case 'report_reporting_status': return <ReportingStatusReport serviceSeekerRecords={serviceSeekerRecords} bachhaImmunizationRecords={bachhaImmunizationRecords} currentFiscalYear={currentFiscalYear} generalSettings={generalSettings} currentUser={currentUser} />;
      case 'report_pariwar_niyojan': return <FamilyPlanningReport records={pariwarSewaRecords} settings={generalSettings} fiscalYear={currentFiscalYear} currentUser={currentUser} />;
      case 'report_fchv': return <FCHVCompilationReport safeOrgName={activeOrgName.trim().replace(/[.#$[\\]]/g, "_")} currentFiscalYear={currentFiscalYear} generalSettings={generalSettings} currentUser={currentUser} />;
      case 'report_gesi': return <GESIReport currentFiscalYear={currentFiscalYear} bachhaRecords={bachhaImmunizationRecords} cbimnciRecords={cbimnciRecords} serviceSeekerRecords={serviceSeekerRecords} prasutiRecords={prasutiRecords} tbPatients={tbPatients} opdRecords={opdRecords} ipdRecords={ipdRecords} generalSettings={generalSettings} currentUser={currentUser} />;
      case 'report_mch': return <MCHReport currentFiscalYear={currentFiscalYear} garbhawotiRecords={garbhawotiRecords} prasutiRecords={prasutiRecords} generalSettings={generalSettings} currentUser={currentUser} />;
      case 'mag_faram': return <MagFaram currentFiscalYear={currentFiscalYear} currentUser={currentUser} existingForms={magForms} onSave={onSaveMagForm} onDelete={onDeleteMagForm} inventoryItems={inventoryItems} stores={stores} generalSettings={generalSettings} itemList={itemList} />;
      case 'kharid_adesh': return <KharidAdesh orders={purchaseOrders} currentFiscalYear={currentFiscalYear} onSave={onUpdatePurchaseOrder} onDelete={onDeletePurchaseOrder} currentUser={currentUser} firms={firms} quotations={quotations} onDakhilaClick={(po) => { setActiveItem('jinshi_maujdat'); setPendingPoDakhila(po); }} generalSettings={generalSettings} inventoryItems={inventoryItems} />;
      case 'nikasha_pratibedan': return <NikashaPratibedan reports={issueReports} onSave={onUpdateIssueReport} currentUser={currentUser} currentFiscalYear={currentFiscalYear} generalSettings={generalSettings} stores={stores} inventoryItems={inventoryItems} />;
      case 'form_suchikaran': return <FirmListing currentFiscalYear={currentFiscalYear} firms={firms} onAddFirm={onAddFirm} />;
      case 'quotation': return <Quotation currentFiscalYear={currentFiscalYear} firms={firms} quotations={quotations} onAddQuotation={onAddQuotation} inventoryItems={inventoryItems} />;
      case 'jinshi_maujdat': return <JinshiMaujdat currentFiscalYear={currentFiscalYear} currentUser={currentUser} inventoryItems={inventoryItems} onAddInventoryItem={onAddInventoryItem} onUpdateInventoryItem={onUpdateInventoryItem} onDeleteInventoryItem={onDeleteInventoryItem} onRequestStockEntry={onRequestStockEntry} stores={stores} pendingPoDakhila={pendingPoDakhila} onClearPendingPoDakhila={() => setPendingPoDakhila(null)} />;
      case 'stock_entry_approval': return <StockEntryApproval requests={stockEntryRequests} currentUser={currentUser} onApprove={onApproveStockEntry} onReject={onRejectStockEntry} stores={stores} />;
      case 'dakhila_pratibedan': return <DakhilaPratibedan 
                                          dakhilaReports={dakhilaReports} 
                                          onSaveDakhilaReport={onSaveDakhilaReport} 
                                          currentFiscalYear={currentFiscalYear} 
                                          currentUser={currentUser} 
                                          stockEntryRequests={stockEntryRequests} 
                                          generalSettings={generalSettings} 
                                          stores={stores} 
                                          initialSelectedReportId={initialDakhilaReportId} 
                                          onInitialReportLoaded={() => setInitialDakhilaReportId(null)}
                                          onMarkAsRead={handleMarkDakhilaRead}
                                          readNotifIds={readNotifIds}
                                        />;
      case 'sahayak_jinshi_khata': return <SahayakJinshiKhata currentFiscalYear={currentFiscalYear} currentUser={currentUser} inventoryItems={inventoryItems} issueReports={issueReports} dakhilaReports={dakhilaReports} users={users} returnEntries={returnEntries} generalSettings={generalSettings} />;
      case 'jinshi_khata': return <JinshiKhata currentFiscalYear={currentFiscalYear} inventoryItems={inventoryItems} issueReports={issueReports} dakhilaReports={dakhilaReports} stockEntryRequests={stockEntryRequests} returnEntries={returnEntries} generalSettings={generalSettings} stores={stores} />;
      case 'jinshi_firta_khata': return <JinshiFirtaFaram currentFiscalYear={currentFiscalYear} currentUser={currentUser} inventoryItems={inventoryItems} returnEntries={returnEntries} onSaveReturnEntry={onSaveReturnEntry} issueReports={issueReports} generalSettings={generalSettings} />;
      case 'marmat_adesh': return <MarmatAdesh currentFiscalYear={currentFiscalYear} currentUser={currentUser} marmatEntries={marmatEntries} onSaveMarmatEntry={onSaveMarmatEntry} inventoryItems={inventoryItems} generalSettings={generalSettings} />;
      case 'dhuliyauna_faram': return <DhuliyaunaFaram currentFiscalYear={currentFiscalYear} currentUser={currentUser} generalSettings={generalSettings} inventoryItems={inventoryItems} dhuliyaunaEntries={dhuliyaunaEntries} onSaveDhuliyaunaEntry={onSaveDhuliyaunaEntry} stores={stores} />;
      case 'bharman_adesh': return <BharmanAdesh currentFiscalYear={currentFiscalYear} currentUser={currentUser} bharmanAdeshEntries={bharmanAdeshEntries} onSaveEntry={onSaveBharmanAdesh} onDeleteEntry={onDeleteBharmanAdesh} users={users} generalSettings={generalSettings} leaveBalances={leaveBalances} />;
      case 'chalani': {
        const entriesForYear = chalaniEntries.filter(c => c.fiscalYear === currentFiscalYear);
        
        const sortedChalaniEntries = [...entriesForYear].sort((a, b) => {
            const numA = parseInt(a.dispatchNumber.split('-')[0]);
            const numB = parseInt(b.dispatchNumber.split('-')[0]);
            return numB - numA;
        });

        const nextSerialNumber = sortedChalaniEntries.length > 0 ? parseInt(sortedChalaniEntries[0].dispatchNumber.split('-')[0]) + 1 : 1;
        const fiscalYearFormatted = currentFiscalYear.slice(1).replace('/', '-');
        const nextDispatchNumber = `${nextSerialNumber}-${fiscalYearFormatted}`;

        const filteredChalaniEntries = sortedChalaniEntries.filter(c => 
            (c.dispatchNumber || '').toLowerCase().includes(chalaniSearchQuery.toLowerCase()) ||
            (c.subject || '').toLowerCase().includes(chalaniSearchQuery.toLowerCase()) ||
            (c.sender || '').toLowerCase().includes(chalaniSearchQuery.toLowerCase()) ||
            (c.recipient || '').toLowerCase().includes(chalaniSearchQuery.toLowerCase())
        );

        const toNepaliDigits = (num: string | number) => {
            if (num === undefined || num === null) return '';
            const numbers = {
                '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
                '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
            };
            return num.toString().split('').map(x => numbers[x as keyof typeof numbers] || x).join('');
        };

        const handlePrintLetter = (chalani: Chalani) => {
            const evaluatedTable = chalani.tableData ? evaluateTableData(chalani.tableData.rows, true) : null;
            
            const printWindow = window.open('', '_blank');
            if (!printWindow) return;

            const letterHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Chalani Letter - ${chalani.dispatchNumber}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
                    <style>
                        @page { size: A4; margin: 15mm 15mm 20mm 15mm; }
                        body { font-family: 'Mukta', sans-serif; line-height: 1.6; color: #333; padding: 10px; }
                        .header-main { display: flex; align-items: start; margin-bottom: 20px; }
                        .header-section { margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                        .logo { width: 130px; height: 130px; object-fit: contain; }
                        .org-details { flex: 1; text-align: center; }
                        .org-name { font-size: 28px; font-weight: 800; color: #b91c1c; margin: 0; }
                        .org-sub { font-size: 16px; font-weight: 600; margin: 0; }
                        .org-address { font-size: 13px; margin-top: 5px; }
                        
                        .meta-row { display: flex; justify-content: space-between; margin-bottom: 30px; font-weight: 600; }
                        .recipient-box { margin-bottom: 40px; }
                        .subject-line { text-align: center; font-size: 18px; font-weight: 800; text-decoration: underline; margin-bottom: 40px; }
                        .content { text-align: justify; white-space: pre-wrap; margin-bottom: 20px; font-size: 16px; padding-bottom: 10px; text-indent: 50px; }
                        .letter-table { width: 100%; border-collapse: collapse; margin-top: 5px; margin-bottom: 30px; page-break-inside: auto; }
                        .letter-table tr { page-break-inside: avoid; page-break-after: auto; }
                        .letter-table th, .letter-table td { border: 1px solid #333; padding: 10px; text-align: left; }
                        .letter-table th { font-weight: bold; text-align: center; }
                        .tapashil-label { font-size: 17px; font-weight: bold; text-decoration: underline; margin-bottom: 10px; }
                        .footer { display: flex; justify-content: flex-end; page-break-inside: avoid; }
                        .signature-box { text-align: center; width: 250px; border-top: 1px solid #333; padding-top: 10px; }
                        .footer-info { 
                            position: fixed;
                            bottom: -15px;
                            left: 0;
                            right: 0;
                            height: 40px;
                            text-align: center;
                            font-size: 12.5px;
                            font-weight: bold;
                            color: #475569;
                            border-top: 1.5px solid #cbd5e1;
                            padding-top: 8px;
                            background: white;
                            width: 100%;
                        }
                        @media print {
                            body { margin-bottom: 60px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header-section">
                        <div class="header-main">
                            <img class="logo" src="${generalSettings.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png'}" />
                            <div class="org-details">
                                <h1 class="org-name">${generalSettings.orgNameNepali}</h1>
                                <p class="org-sub">${generalSettings.subTitleNepali || ''}</p>
                                <p class="org-sub">${generalSettings.subTitleNepali2 || ''}</p>
                                <p class="org-sub">${generalSettings.subTitleNepali3 || ''}</p>
                                <p class="org-sub">${generalSettings.subTitleNepali4 || ''}</p>
                            </div>
                            <img class="logo" src="${generalSettings.provinceLogoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png'}" />
                        </div>
                        <div class="meta-row" style="margin-bottom: 0;">
                            <div style="display: flex; flex-direction: column;">
                                <span>पत्र संख्या : ${toNepaliDigits(currentFiscalYear)}</span>
                                <span>चलानी नम्बर: ${toNepaliDigits(chalani.dispatchNumber)}</span>
                            </div>
                            <span>मिति: ${toNepaliDigits(chalani.date)}</span>
                        </div>
                    </div>

                    <div class="recipient-box">
                        <p>श्री ${chalani.recipient},</p>
                        <p>${chalani.recipientAddress || ''}</p>
                    </div>

                    <div class="subject-line">
                        विषय: ${chalani.subject}
                    </div>

                    <div class="content">
${chalani.letterContent || 'विषयसम्बन्धमा जानकारी गराइन्छ।'}
                    </div>

                    ${chalani.tableData ? `
                        <div class="tapashil-label">तपशिल:</div>
                        <table class="letter-table">
                            <thead>
                                <tr>
                                    ${chalani.tableData.headers.map((h, i) => `
                                        <th style="width: ${chalani.tableData?.columnWidths?.[i] || 'auto'}px">
                                            ${toNepaliDigits(h)}
                                        </th>
                                    `).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${evaluatedTable!.map((row, rIdx) => `
                                    <tr style="height: ${chalani.tableData?.rowHeights?.[rIdx] || 'auto'}px">
                                        ${row.map((cell, cIdx) => `
                                            <td style="width: ${chalani.tableData?.columnWidths?.[cIdx] || 'auto'}px">
                                                ${cell}
                                            </td>
                                        `).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : ''}

                    <div class="footer" style="margin-top: ${chalani.tableData ? '75px' : '35px'};">
                        <div class="signature-box">
                            <p><strong>(${chalani.sender})</strong></p>
                            <p>${currentUser?.designation || 'अधिकृत'}</p>
                        </div>
                    </div>

                    <div class="footer-info">
                        ${[
                            generalSettings.phone ? `फोन नम्बर: ${generalSettings.phone}` : '',
                            generalSettings.email ? `ईमेल: ${generalSettings.email}` : '',
                            generalSettings.website ? `वेबसाइट: ${generalSettings.website}` : ''
                        ].filter(Boolean).join(' &nbsp;|&nbsp; ')}
                    </div>

                    <script>
                        window.onload = () => {
                            setTimeout(() => {
                                window.print();
                                // window.close();
                            }, 500);
                        };
                    </script>
                </body>
                </html>
            `;

            printWindow.document.write(letterHtml);
            printWindow.document.close();
        };

        const sentForYear = (sentLetters || []).filter(s => s.fiscalYear === currentFiscalYear);
        const sortedSent = [...sentForYear].sort((a,b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
        const filteredSent = sortedSent.filter(s => 
            (s.dispatchNumber || '').toLowerCase().includes(chalaniSearchQuery.toLowerCase()) ||
            (s.subject || '').toLowerCase().includes(chalaniSearchQuery.toLowerCase()) ||
            (s.recipientOrgName || '').toLowerCase().includes(chalaniSearchQuery.toLowerCase()) ||
            (s.sender || '').toLowerCase().includes(chalaniSearchQuery.toLowerCase())
        );

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">चलानी व्यवस्थापन (आ.व. {currentFiscalYear})</h2>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="खोज्नुहोस्..." 
                            value={chalaniSearchQuery}
                            onChange={(e) => setChalaniSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        />
                    </div>
                    {chalaniActiveSubTab === 'dispatched' && currentUser?.hasSaveAccess !== false && (
                      <button onClick={() => {
                        setEditingChalani(null);
                        setIsChalaniFormOpen(true);
                      }} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 whitespace-nowrap">
                          <Send size={18} /> नयाँ चलानी
                      </button>
                    )}
                </div>
            </div>

            {/* Sub Tabs Selector */}
            <div className="flex border-b border-slate-200 gap-4">
              <button
                onClick={() => setChalaniActiveSubTab('dispatched')}
                className={`pb-2 px-1 font-semibold text-sm border-b-2 transition-colors ${
                  chalaniActiveSubTab === 'dispatched'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                चलानी दर्तासूची (Dispatched Letters)
              </button>
              <button
                onClick={() => setChalaniActiveSubTab('sent')}
                className={`pb-2 px-1 font-semibold text-sm border-b-2 transition-colors ${
                  chalaniActiveSubTab === 'sent'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                पठाइएका पत्रहरूको रेकर्ड (Sent Letters)
              </button>
            </div>

            {chalaniActiveSubTab === 'dispatched' ? (
              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-sm text-left responsive-table sticky-header">
                      <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="p-3">चलानी नं.</th>
                        <th className="p-3">मिति</th>
                        <th className="p-3">पाउने</th>
                        <th className="p-3">बिषय</th>
                        <th className="p-3">पठाउने</th>
                        <th className="p-3 text-right">कार्य</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredChalaniEntries.map(c => (
                        <tr key={c.id}>
                          <td className="p-3 font-bold" data-label="चलानी नं.">{c.dispatchNumber}</td>
                          <td className="p-3" data-label="मिति">{c.date}</td>
                          <td className="p-3" data-label="पाउने">{c.recipient}</td>
                          <td className="p-3" data-label="बिषय">{c.subject}</td>
                          <td className="p-3" data-label="पठाउने">{c.sender}</td>
                          <td className="p-3 text-right space-x-1 whitespace-nowrap" data-label="कार्य">
                              <button 
                                onClick={() => {
                                  setEditingChalani(c);
                                  setIsChalaniFormOpen(true);
                                }}
                                className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <FileText size={16} />
                              </button>
                              <button 
                                onClick={() => handlePrintLetter(c)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Print Letter"
                              >
                                <Printer size={16} />
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedChalaniForSend(c);
                                  setRecipientOrgForSend('');
                                  setIsSendModalOpen(true);
                                }}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="स्थानान्तरण गर्नुहोस् (Transfer Letter)"
                              >
                                <MoreVertical size={16} />
                              </button>
                              {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && (
                                <button 
                                  onClick={() => {
                                    if (window.confirm('के तपाईं यो चलानी हटाउन चाहनुहुन्छ?')) {
                                      onDeleteChalani(c.id);
                                    }
                                  }}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                          </td>
                        </tr>
                      ))}
                      {filteredChalaniEntries.length === 0 && (
                          <tr>
                              <td colSpan={6} className="p-8 text-center text-slate-500 italic">कुनै चलानी भेटिएन।</td>
                          </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-sm text-left responsive-table sticky-header">
                      <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="p-3">चलानी नं.</th>
                        <th className="p-3">पठाएको मिति</th>
                        <th className="p-3">पाउने संस्था</th>
                        <th className="p-3">बिषय</th>
                        <th className="p-3">पठाउने</th>
                        <th className="p-3 text-right">कार्य</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSent.map(s => (
                        <tr key={s.id}>
                          <td className="p-3 font-bold" data-label="चलानी नं.">{s.dispatchNumber}</td>
                          <td className="p-3" data-label="पठाएको मिति">
                            {new Date(s.sentAt).toLocaleDateString() || s.date}
                          </td>
                          <td className="p-3" data-label="पाउने संस्था">
                            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-semibold">
                              {s.recipientOrgName}
                            </span>
                          </td>
                          <td className="p-3" data-label="बिषय">{s.subject}</td>
                          <td className="p-3" data-label="पठाउने">{s.sender}</td>
                          <td className="p-3 text-right space-x-1 animate-in fade-in" data-label="कार्य">
                              <button 
                                onClick={() => handlePrintLetter(s)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Print Letter"
                              >
                                <Printer size={16} />
                              </button>
                              {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && (
                                <button 
                                  onClick={() => {
                                    if (window.confirm('के तपाईं यो पठाइएको पत्र हटाउन चाहनुहुन्छ?')) {
                                      onDeleteSentLetter(s.id);
                                    }
                                  }}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                          </td>
                        </tr>
                      ))}
                      {filteredSent.length === 0 && (
                          <tr>
                              <td colSpan={6} className="p-8 text-center text-slate-500 italic">कुनै पनि पठाइएको पत्र भेटिएन।</td>
                          </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal for Transferring/Sending Letter */}
            {isSendModalOpen && selectedChalaniForSend && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md relative animate-in zoom-in-95">
                        <button 
                          onClick={() => setIsSendModalOpen(false)}
                          className="absolute right-4 top-4 text-slate-400 hover:text-slate-650"
                        >
                          <X size={20} />
                        </button>
                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <Send size={20} className="text-emerald-600" /> पत्र स्थानान्तरण / चलानी पठाउनुहोस्
                        </h3>
                        
                        <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-600 space-y-1">
                          <p><strong>चलानी नं.:</strong> {selectedChalaniForSend.dispatchNumber}</p>
                          <p><strong>विषय:</strong> {selectedChalaniForSend.subject}</p>
                          <p><strong>पाउने:</strong> {selectedChalaniForSend.recipient}</p>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">पठाउने संस्था छनोट गर्नुहोस् (Select Recipient Org):</label>
                            <select 
                              value={recipientOrgForSend}
                              onChange={(e) => setRecipientOrgForSend(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                            >
                              <option value="">-- संस्था छनोट गर्नुहोस् --</option>
                              {selectableOrganizations.map(org => (
                                <option key={org} value={org}>{org}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                          <button 
                            onClick={() => setIsSendModalOpen(false)}
                            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium"
                          >
                            रद्द गर्नुहोस्
                          </button>
                          <button 
                            disabled={!recipientOrgForSend || isSendingInProgress}
                            onClick={async () => {
                              setIsSendingInProgress(true);
                              try {
                                const success = await onSendLetter(
                                  currentUser!.organizationName,
                                  recipientOrgForSend,
                                  selectedChalaniForSend
                                );
                                if (success) {
                                  setIsSendModalOpen(false);
                                }
                              } catch (e) {
                                console.error(e);
                              } finally {
                                setIsSendingInProgress(false);
                              }
                            }}
                            className={`px-4 py-2 text-white rounded-lg text-sm font-semibold shadow-sm ${
                              !recipientOrgForSend || isSendingInProgress 
                                ? 'bg-slate-300 cursor-not-allowed' 
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            {isSendingInProgress ? 'पठाउँदै...' : 'पठाउनुहोस्'}
                          </button>
                        </div>
                    </div>
                </div>
            )}

            {isChalaniFormOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-start justify-center p-4 overflow-y-auto animate-in fade-in">
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl relative my-8 animate-in zoom-in-95 slide-in-from-bottom-4">
                        <h3 className="text-2xl font-bold text-slate-800 mb-6">{editingChalani ? 'चलानी संशोधन' : 'नयाँ चिठीपत्र चलानी'}</h3>
                        <ChalaniForm 
                            currentUser={currentUser!}
                            nextDispatchNumber={nextDispatchNumber}
                            initialData={editingChalani || undefined}
                            onSave={(chalaniData) => {
                                const finalChalani: Chalani = {
                                    id: editingChalani ? editingChalani.id : Date.now().toString(),
                                    dispatchNumber: editingChalani ? editingChalani.dispatchNumber : nextDispatchNumber,
                                    fiscalYear: editingChalani ? editingChalani.fiscalYear : currentFiscalYear,
                                    senderDesignation: editingChalani?.senderDesignation || currentUser?.designation || 'अधिकृत',
                                    ...chalaniData,
                                };
                                onSaveChalani(finalChalani);
                                setIsChalaniFormOpen(false);
                                setEditingChalani(null);
                                alert(editingChalani ? 'चलानी सफलतापूर्वक संशोधन गरियो!' : 'चलानी सफलतापूर्वक सुरक्षित गरियो!');
                            }}
                            onCancel={() => {
                                setIsChalaniFormOpen(false);
                                setEditingChalani(null);
                            }}
                        />
                        <button onClick={() => {
                            setIsChalaniFormOpen(false);
                            setEditingChalani(null);
                        }} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                            <X size={20}/>
                        </button>
                    </div>
                </div>
            )}
          </div>
        );
      }
      case 'darta': {
        const entriesForYear = dartaEntries.filter(d => d.fiscalYear === currentFiscalYear);
        
        const sortedDartaEntries = [...entriesForYear].sort((a, b) => {
            const numA = parseInt(a.registrationNumber.split('-')[0]);
            const numB = parseInt(b.registrationNumber.split('-')[0]);
            return numB - numA;
        });

        const nextSerialNumber = sortedDartaEntries.length > 0 ? parseInt(sortedDartaEntries[0].registrationNumber.split('-')[0]) + 1 : 1;
        const fiscalYearFormatted = currentFiscalYear.slice(1).replace('/', '-');
        const nextRegistrationNumber = `${nextSerialNumber}-${fiscalYearFormatted}`;

        const filteredDartaEntries = sortedDartaEntries.filter(d => 
            (d.registrationNumber || '').toLowerCase().includes(dartaSearchQuery.toLowerCase()) ||
            (d.subject || '').toLowerCase().includes(dartaSearchQuery.toLowerCase()) ||
            (d.sender || '').toLowerCase().includes(dartaSearchQuery.toLowerCase()) ||
            (d.recipient || '').toLowerCase().includes(dartaSearchQuery.toLowerCase())
        );

        const toNepaliDigits = (num: string | number) => {
            if (num === undefined || num === null) return '';
            const numbers = {
                '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
                '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
            };
            return num.toString().split('').map(x => numbers[x as keyof typeof numbers] || x).join('');
        };

        const receivedForYear = (receivedLetters || []).filter(r => r.fiscalYear === currentFiscalYear);
        const sortedReceived = [...receivedForYear].sort((a,b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
        const filteredReceived = sortedReceived.filter(r => 
            (r.dispatchNumber || '').toLowerCase().includes(dartaSearchQuery.toLowerCase()) ||
            (r.subject || '').toLowerCase().includes(dartaSearchQuery.toLowerCase()) ||
            (r.senderOrgName || '').toLowerCase().includes(dartaSearchQuery.toLowerCase()) ||
            (r.sender || '').toLowerCase().includes(dartaSearchQuery.toLowerCase())
        );

        const handlePrintReceivedLetter = async (receivedLetter: ReceivedLetter) => {
            if (receivedLetter.isRead !== true && onMarkReceivedLetterAsRead) {
                onMarkReceivedLetterAsRead(receivedLetter.id);
            }
            let senderSettings = receivedLetter.senderSettings;
            if (!senderSettings) {
                try {
                    const senderSafeName = (receivedLetter.senderOrgName || '').trim().replace(/[.#$[\]]/g, "_");
                    const snap = await get(ref(db, `orgData/${senderSafeName}/settings`));
                    if (snap.exists()) {
                        senderSettings = snap.val();
                    }
                } catch (error) {
                    console.error("Error loading sender organization settings:", error);
                }
            }

            const evaluatedTable = receivedLetter.tableData ? evaluateTableData(receivedLetter.tableData.rows, true) : null;
            
            const printWindow = window.open('', '_blank');
            if (!printWindow) return;

            const orgName = senderSettings?.orgNameNepali || receivedLetter.senderOrgName;
            const subTitle1 = senderSettings?.subTitleNepali || '';
            const subTitle2 = senderSettings?.subTitleNepali2 || '';
            const subTitle3 = senderSettings?.subTitleNepali3 || '';
            const subTitle4 = senderSettings?.subTitleNepali4 || '';
            const logo = senderSettings?.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png';
            const provinceLogo = senderSettings?.provinceLogoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png';
            
            const phoneVal = senderSettings?.phone || '';
            const emailVal = senderSettings?.email || '';
            const websiteVal = senderSettings?.website || '';

            const letterHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Received Letter - ${receivedLetter.dispatchNumber}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
                    <style>
                        @page { size: A4; margin: 15mm 15mm 20mm 15mm; }
                        body { font-family: 'Mukta', sans-serif; line-height: 1.6; color: #333; padding: 10px; }
                        .header-main { display: flex; align-items: start; margin-bottom: 20px; }
                        .header-section { margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                        .logo { width: 130px; height: 130px; object-fit: contain; }
                        .org-details { flex: 1; text-align: center; }
                        .org-name { font-size: 28px; font-weight: 800; color: #b91c1c; margin: 0; }
                        .org-sub { font-size: 16px; font-weight: 600; margin: 0; }
                        .org-address { font-size: 13px; margin-top: 5px; }
                        
                        .meta-row { display: flex; justify-content: space-between; margin-bottom: 30px; font-weight: 600; }
                        .recipient-box { margin-bottom: 40px; }
                        .subject-line { text-align: center; font-size: 18px; font-weight: 800; text-decoration: underline; margin-bottom: 40px; }
                        .content { text-align: justify; white-space: pre-wrap; margin-bottom: 20px; font-size: 16px; padding-bottom: 10px; text-indent: 50px; }
                        .letter-table { width: 100%; border-collapse: collapse; margin-top: 5px; margin-bottom: 30px; page-break-inside: auto; }
                        .letter-table tr { page-break-inside: avoid; page-break-after: auto; }
                        .letter-table th, .letter-table td { border: 1px solid #333; padding: 10px; text-align: left; }
                        .letter-table th { font-weight: bold; text-align: center; }
                        .tapashil-label { font-size: 17px; font-weight: bold; text-decoration: underline; margin-bottom: 10px; }
                        .footer { display: flex; justify-content: flex-end; page-break-inside: avoid; }
                        .signature-box { text-align: center; width: 250px; border-top: 1px solid #333; padding-top: 10px; }
                        .footer-info { 
                            position: fixed;
                            bottom: -15px;
                            left: 0;
                            right: 0;
                            height: 40px;
                            text-align: center;
                            font-size: 12.5px;
                            font-weight: bold;
                            color: #475569;
                            border-top: 1.5px solid #cbd5e1;
                            padding-top: 8px;
                            background: white;
                            width: 100%;
                        }
                        @media print {
                            body { margin-bottom: 60px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header-section">
                        <div class="header-main">
                            <img class="logo" src="${logo}" />
                            <div class="org-details">
                                <h1 class="org-name">${orgName}</h1>
                                ${subTitle1 ? `<p class="org-sub">${subTitle1}</p>` : ''}
                                ${subTitle2 ? `<p class="org-sub">${subTitle2}</p>` : ''}
                                ${subTitle3 ? `<p class="org-sub">${subTitle3}</p>` : ''}
                                ${subTitle4 ? `<p class="org-sub">${subTitle4}</p>` : ''}
                            </div>
                            <img class="logo" src="${provinceLogo}" />
                        </div>
                        <div class="meta-row" style="margin-bottom: 0;">
                            <span>चलानी नम्बर: ${toNepaliDigits(receivedLetter.dispatchNumber)}</span>
                            <span>मिति: ${toNepaliDigits(receivedLetter.date)}</span>
                        </div>
                    </div>

                    <div class="recipient-box">
                        <p>श्री ${receivedLetter.recipient},</p>
                        ${receivedLetter.recipientAddress ? `<p>${receivedLetter.recipientAddress}</p>` : ''}
                    </div>

                    <div class="subject-line">
                        विषय: ${receivedLetter.subject}
                    </div>

                    <div class="content">
${receivedLetter.letterContent || 'विषयसम्बन्धमा जानकारी गराइन्छ।'}
                    </div>

                    ${receivedLetter.tableData && evaluatedTable ? `
                        <div class="tapashil-label">तपशिल:</div>
                        <table class="letter-table">
                            <thead>
                                <tr>
                                    ${receivedLetter.tableData.headers.map((h: string, i: number) => `
                                        <th style="width: ${receivedLetter.tableData?.columnWidths?.[i] || 'auto'}px">
                                            ${toNepaliDigits(h)}
                                        </th>
                                    `).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${evaluatedTable.map((row: string[], rIdx: number) => `
                                    <tr style="height: ${receivedLetter.tableData?.rowHeights?.[rIdx] || 'auto'}px">
                                        ${row.map((cell: string, cIdx: number) => `
                                            <td style="width: ${receivedLetter.tableData?.columnWidths?.[cIdx] || 'auto'}px">
                                                ${cell}
                                            </td>
                                        `).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : ''}

                    <div class="footer" style="margin-top: ${receivedLetter.tableData ? '75px' : '35px'};">
                        <div class="signature-box">
                            <p><strong>(${receivedLetter.sender})</strong></p>
                            <p>${receivedLetter.senderDesignation || 'प्रेषक संस्था अधिकृत'}</p>
                        </div>
                    </div>

                    <div class="footer-info">
                        ${[
                            phoneVal ? `फोन नम्बर: ${phoneVal}` : '',
                            emailVal ? `ईमेल: ${emailVal}` : '',
                            websiteVal ? `वेबसाइट: ${websiteVal}` : ''
                        ].filter(Boolean).join(' &nbsp;|&nbsp; ')}
                    </div>

                    <script>
                        window.onload = () => {
                            setTimeout(() => {
                                window.print();
                            }, 500);
                        };
                    </script>
                </body>
                </html>
            `;

            printWindow.document.write(letterHtml);
            printWindow.document.close();
        };

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">दर्ता व्यवस्थापन (आ.व. {currentFiscalYear})</h2>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="खोज्नुहोस्..." 
                            value={dartaSearchQuery}
                            onChange={(e) => setDartaSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        />
                    </div>
                    {dartaActiveSubTab === 'registered' && currentUser?.hasSaveAccess !== false && (
                      <button onClick={() => setIsDartaFormOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 whitespace-nowrap">
                          <FilePlus size={18} /> नयाँ दर्ता
                      </button>
                    )}
                </div>
            </div>

            {/* Sub Tabs Selector */}
            <div className="flex border-b border-slate-200 gap-4">
              <button
                onClick={() => setDartaActiveSubTab('registered')}
                className={`pb-2 px-1 font-semibold text-sm border-b-2 transition-colors ${
                  dartaActiveSubTab === 'registered'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                दर्ता भएका पत्रहरू (Registered Letters)
              </button>
              <button
                onClick={() => setDartaActiveSubTab('received')}
                className={`pb-2 px-1 font-semibold text-sm border-b-2 transition-colors relative ${
                  dartaActiveSubTab === 'received'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                सङ्घ संस्थाबाट प्राप्त पत्र सूची (Received Letters)
                {(()=>{
                  const unreadReceivedCount = (filteredReceived || []).filter(r => r.isRead !== true).length;
                  return unreadReceivedCount > 0 ? (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-primary-600 text-white rounded-full">
                      {unreadReceivedCount}
                    </span>
                  ) : null;
                })()}
              </button>
            </div>

            {dartaActiveSubTab === 'registered' ? (
              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-sm text-left responsive-table sticky-header">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="p-3">दर्ता नं.</th>
                        <th className="p-3">मिति</th>
                        <th className="p-3">पठाउने</th>
                        <th className="p-3">बिषय</th>
                        <th className="p-3">बुझ्ने</th>
                        {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && <th className="p-3 text-right">कार्य</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDartaEntries.map(d => (
                        <tr key={d.id}>
                          <td className="p-3 font-bold" data-label="दर्ता नं.">{d.registrationNumber}</td>
                          <td className="p-3" data-label="मिति">{d.date}</td>
                          <td className="p-3" data-label="पठाउने">{d.sender}</td>
                          <td className="p-3" data-label="बिषय">{d.subject}</td>
                          <td className="p-3" data-label="बुझ्ने">{d.recipient}</td>
                          {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && (
                            <td className="p-3 text-right" data-label="कार्य">
                              <button 
                                onClick={() => {
                                  if (window.confirm('के तपाईं यो दर्ता हटाउन चाहनुहुन्छ?')) {
                                    onDeleteDarta(d.id);
                                  }
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {filteredDartaEntries.length === 0 && (
                          <tr>
                              <td colSpan={6} className="p-8 text-center text-slate-500 italic">कुनै दर्ता भेटिएन।</td>
                          </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-sm text-left responsive-table sticky-header">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="p-3">मूल चलानी नं.</th>
                        <th className="p-3">पठाउने संस्था</th>
                        <th className="p-3">प्राप्त मिति</th>
                        <th className="p-3">पठाउने प्रेषक</th>
                        <th className="p-3">बिषय</th>
                        <th className="p-3 text-right">कार्य</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredReceived.map(r => (
                        <tr key={r.id}>
                          <td className="p-3 font-bold text-primary-600" data-label="मूल चलानी नं.">
                            <div className="flex items-center gap-2">
                              <span>{r.dispatchNumber}</span>
                              {r.isRead !== true && (
                                <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-extrabold rounded shadow-sm animate-pulse whitespace-nowrap">
                                  नयाँ
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3" data-label="पठाउने संस्था">
                            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-semibold">
                              {r.senderOrgName}
                            </span>
                          </td>
                          <td className="p-3" data-label="प्राप्त मिति">
                            {(() => {
                              try {
                                return new NepaliDate(new Date(r.receivedAt)).format('YYYY-MM-DD');
                              } catch (e) {
                                return r.date || '';
                              }
                            })()}
                          </td>
                          <td className="p-3" data-label="पठाउने प्रेषक">{r.sender}</td>
                          <td className="p-3" data-label="बिषय">{r.subject}</td>
                         <td className="p-3 text-right space-x-1" data-label="कार्य">
                            <button 
                              onClick={() => {
                                const isRegistered = dartaEntries.some(d => d.receivedLetterId === r.id);
                                if (!isRegistered) {
                                  setSelectedReceivedLetterForDarta(r);
                                  setIsDartaFormOpen(true);
                                } else {
                                  alert('यो पत्र पहिले नै दर्ता भइसकेको छ।');
                                }
                              }}
                              disabled={dartaEntries.some(d => d.receivedLetterId === r.id)}
                              className={`p-2 rounded-lg transition-colors ${dartaEntries.some(d => d.receivedLetterId === r.id) ? 'text-slate-300 cursor-not-allowed' : 'text-emerald-600 hover:bg-emerald-50'}`}
                              title={dartaEntries.some(d => d.receivedLetterId === r.id) ? "पहिले नै दर्ता भइसकेको छ" : "चिठीपत्र दर्ता गर्नुहोस्"}
                            >
                              <FilePlus size={16} />
                            </button>
                            <button 
                              onClick={() => handlePrintReceivedLetter(r)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="प्रिन्ट गर्नुहोस् (Print Received Document)"
                            >
                              <Printer size={16} />
                            </button>
                            {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && (
                              <button 
                                onClick={() => {
                                  if (window.confirm('के तपाईं यो प्राप्त पत्र सूचीबाट हटाउन चाहनुहुन्छ?')) {
                                    onDeleteReceivedLetter(r.id);
                                  }
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Received Letter"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredReceived.length === 0 && (
                          <tr>
                              <td colSpan={6} className="p-8 text-center text-slate-500 italic">कुनै नयाँ प्राप्त पत्रहरू भटिएन।</td>
                          </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {isDartaFormOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-start justify-center p-4 overflow-y-auto animate-in fade-in">
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl relative my-8 animate-in zoom-in-95 slide-in-from-bottom-4">
                        <h3 className="text-2xl font-bold text-slate-800 mb-6">नयाँ चिठीपत्र दर्ता</h3>
                        <DartaForm 
                            currentUser={currentUser!}
                            prefilledData={selectedReceivedLetterForDarta || undefined}
                            nextRegistrationNumber={nextRegistrationNumber}
                            onSave={(dartaData) => {
                                const newDarta: Darta = {
                                    id: Date.now().toString(),
                                    registrationNumber: nextRegistrationNumber,
                                    fiscalYear: currentFiscalYear,
                                    ...dartaData,
                                };
                                onSaveDarta(newDarta);
                                setIsDartaFormOpen(false);
                                setSelectedReceivedLetterForDarta(null);
                                alert('दर्ता सफलतापूर्वक सुरक्षित गरियो!');
                             }}
                            onCancel={() => {
                                setIsDartaFormOpen(false);
                                setSelectedReceivedLetterForDarta(null);
                            }}
                        />
                        <button onClick={() => setIsDartaFormOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                            <X size={20}/>
                        </button>
                    </div>
                </div>
            )}
          </div>
        );
      }
      case 'sujhab_petika': return <SujhabPetika currentUser={currentUser} users={allUsers} />;
      case 'lekha_prashasan': return (
        <LekhaPrashasan 
          programs={financialPrograms || []}
          parties={listedParties || []}
          transactions={financialTransactions || []}
          payments={partyPayments || []}
          vouchers={goswaraVouchers ? goswaraVouchers.filter(v => v.fiscalYear === currentFiscalYear) : []}
          paymentRequests={paymentRequests || []}
          allowances={allowances || []}
          onSaveProgram={onSaveFinancialProgram}
          onDeleteProgram={onDeleteFinancialProgram}
          onSaveParty={onSaveListedParty}
          onDeleteParty={onDeleteListedParty}
          onSaveTransaction={onSaveFinancialTransaction}
          onDeleteTransaction={onDeleteFinancialTransaction}
          onSavePayment={onSavePartyPayment}
          onDeletePayment={onDeletePartyPayment}
          onSavePaymentRequest={onSavePaymentRequest}
          onSaveAllowance={onSaveAllowance}
          onUpdatePaymentRequest={onUpdatePaymentRequest}
          onUpdateAllowance={onUpdateAllowance}
          onDeletePaymentRequest={onDeletePaymentRequest}
          onDeleteAllowance={onDeleteAllowance}
          generalSettings={generalSettings}
          currentFiscalYear={currentFiscalYear}
          isAdmin={currentUser?.role === 'ADMIN'}
          currentUser={currentUser!}
        />
      );
      case 'talim_byabasthapan': return <TalimByabasthapan 
        talimEntries={talimEntries} 
        onSaveTalim={onSaveTalim!} 
        onDeleteTalim={onDeleteTalim!}
        karmachariTalimRecords={karmachariTalimRecords}
        onSaveKarmachariTalimRecord={onSaveKarmachariTalimRecord!}
        onDeleteKarmachariTalimRecord={onDeleteKarmachariTalimRecord!}
        users={allUsers}
        currentUser={currentUser!}
      />;
      case 'bida_abedan': return <BidaAbedan 
        currentUser={currentUser} 
        users={users} 
        leaveApplications={leaveApplications}
        onAddLeaveApplication={onAddLeaveApplication}
        onUpdateLeaveStatus={onUpdateLeaveStatus}
        onDeleteLeaveApplication={onDeleteLeaveApplication}
        leaveBalances={leaveBalances}
        onSaveLeaveBalance={onSaveLeaveBalance}
        currentFiscalYear={currentFiscalYear}
        generalSettings={generalSettings}
      />;
      case 'surakshit_matritwo': return <SafeMotherhoodService />;
      case 'garbhawoti_sewa': return <GarbhawotiSewa 
        records={garbhawotiRecords}
        serviceSeekerRecords={serviceSeekerRecords}
        onSaveRecord={onSaveGarbhawotiRecord}
        onDeleteRecord={onDeleteGarbhawotiRecord}
        currentFiscalYear={currentFiscalYear}
      />;
      case 'prasuti_sewa': return <PrasutiSewa 
        garbhawotiRecords={garbhawotiRecords}
        prasutiRecords={prasutiRecords}
        serviceSeekerRecords={serviceSeekerRecords}
        onSaveRecord={onSavePrasutiRecord}
        onDeleteRecord={onDeletePrasutiRecord}
        currentFiscalYear={currentFiscalYear}
      />;
      case 'uttar_prasuti_sewa': return <UttarPrasutiSewa 
        currentFiscalYear={currentFiscalYear}
        prasutiRecords={prasutiRecords}
        uttarPrasutiRecords={uttarPrasutiRecords}
        serviceSeekerRecords={serviceSeekerRecords}
        onSave={onSaveUttarPrasutiRecord}
        onDelete={onDeleteUttarPrasutiRecord}
      />;
      case 'mul_darta': return <MulDartaSewa 
        records={serviceSeekerRecords}
        opdRecords={opdRecords}
        emergencyRecords={emergencyRecords}
        cbimnciRecords={cbimnciRecords}
        ipdRecords={ipdRecords}
        serviceItems={serviceItems}
        onSaveRecord={onSaveServiceSeekerRecord}
        onDeleteRecord={onDeleteServiceSeekerRecord}
        currentFiscalYear={currentFiscalYear}
        currentUser={currentUser}
        generalSettings={generalSettings}
      />;
      case 'opd_sewa': return <OPDSewa 
        serviceSeekerRecords={serviceSeekerRecords}
        opdRecords={opdRecords}
        onSaveRecord={onSaveOPDRecord}
        onDeleteRecord={onDeleteOPDRecord}
        onSaveServiceSeekerRecord={onSaveServiceSeekerRecord}
        currentFiscalYear={currentFiscalYear}
        currentUser={currentUser}
        generalSettings={generalSettings}
        serviceItems={serviceItems}
        inventoryItems={inventoryItems}
        labReports={labReports}
        xrayRecords={xrayRecords}
        ecgRecords={ecgRecords}
        usgRecords={usgRecords}
        physiotherapyRecords={physiotherapyRecords}
        onSaveLabReport={onSaveLabReport}
        onSaveXRayRecord={onSaveXRayRecord}
        onSaveECGRecord={onSaveECGRecord}
        onSaveUSGRecord={onSaveUSGRecord}
        onSavePhysiotherapyRecord={onSavePhysiotherapyRecord}
      />;
      case 'ipd_sewa': return <IPDSewa 
        serviceSeekerRecords={serviceSeekerRecords}
        ipdRecords={ipdRecords}
        onSaveRecord={onSaveIPDRecord}
        onDeleteRecord={onDeleteIPDRecord}
        onDeleteAllRecords={onDeleteAllIPDRecords}
        currentFiscalYear={currentFiscalYear}
        currentUser={currentUser}
        generalSettings={generalSettings}
        onUpdateSettings={onUpdateGeneralSettings}
      />;
      case 'service_billing': return <ServiceBilling 
        serviceSeekerRecords={serviceSeekerRecords}
        opdRecords={opdRecords}
        cbimnciRecords={cbimnciRecords}
        currentFiscalYear={currentFiscalYear}
        billingRecords={billingRecords}
        onSaveRecord={onSaveBillingRecord}
        onDeleteRecord={onDeleteBillingRecord}
        currentUser={currentUser}
        serviceItems={serviceItems}
        emergencyRecords={emergencyRecords}
        users={users}
        generalSettings={generalSettings}
      />;
      case 'emergency_sewa': return <EmergencySewa 
        serviceSeekerRecords={serviceSeekerRecords}
        emergencyRecords={emergencyRecords}
        onSaveRecord={onSaveEmergencyRecord}
        onDeleteRecord={onDeleteEmergencyRecord}
        currentFiscalYear={currentFiscalYear}
        currentUser={currentUser}
        serviceItems={serviceItems}
        inventoryItems={inventoryItems}
      />;
      case 'cbimnci_sewa': return <CBIMNCISewa 
        serviceSeekerRecords={serviceSeekerRecords}
        cbimnciRecords={cbimnciRecords}
        labReports={labReports}
        onSaveRecord={onSaveCBIMNCIRecord}
        onDeleteRecord={onDeleteCBIMNCIRecord}
        currentFiscalYear={currentFiscalYear}
        currentUser={currentUser}
        serviceItems={serviceItems}
        inventoryItems={inventoryItems}
        generalSettings={generalSettings}
      />;
      case 'prayogsala_sewa': return <PrayogsalaSewa 
        serviceSeekerRecords={serviceSeekerRecords}
        billingRecords={billingRecords}
        serviceItems={serviceItems}
        labReports={labReports}
        onSaveRecord={onSaveLabReport}
        onDeleteRecord={onDeleteLabReport}
        currentFiscalYear={currentFiscalYear}
        currentUser={currentUser}
        generalSettings={generalSettings}
        users={users}
      />;
      case 'dispensory_sewa': return <DispensarySewa 
                                        currentFiscalYear={currentFiscalYear} 
                                        currentUser={currentUser} 
                                        generalSettings={generalSettings} 
                                        serviceSeekerRecords={serviceSeekerRecords} 
                                        opdRecords={opdRecords} 
                                        emergencyRecords={emergencyRecords} 
                                        cbimnciRecords={cbimnciRecords} 
                                        dispensaryRecords={dispensaryRecords} 
                                        onSaveDispensaryRecord={onSaveDispensaryRecord} 
                                        onDeleteDispensaryRecord={onDeleteDispensaryRecord} 
                                        inventoryItems={inventoryItems} 
                                        stores={stores} 
                                        onUpdateInventoryItem={onUpdateInventoryItem} 
                                        tbPatients={tbPatients}
                                        onUpdateTbPatient={onUpdateTbPatient}
                                      />;
      case 'pariwar_niyojan': return <PariwarSewa 
                                        records={pariwarSewaRecords}
                                        serviceSeekers={serviceSeekerRecords}
                                        onSave={onSavePariwarSewaRecord}
                                        onDelete={onDeletePariwarSewaRecord}
                                        currentFiscalYear={currentFiscalYear}
                                      />;
      case 'xray_sewa': return <XRaySewa 
                                  records={xrayRecords}
                                  serviceSeekerRecords={serviceSeekerRecords}
                                  opdRecords={opdRecords}
                                  emergencyRecords={emergencyRecords}
                                  cbimnciRecords={cbimnciRecords}
                                  billingRecords={billingRecords}
                                  onSave={onSaveXRayRecord}
                                  onDelete={onDeleteXRayRecord}
                                  currentFiscalYear={currentFiscalYear}
                                />;
      case 'ecg_sewa': return <ECGSewa 
                                  records={ecgRecords}
                                  serviceSeekerRecords={serviceSeekerRecords}
                                  opdRecords={opdRecords}
                                  emergencyRecords={emergencyRecords}
                                  cbimnciRecords={cbimnciRecords}
                                  onSave={onSaveECGRecord}
                                  onDelete={onDeleteECGRecord}
                                  currentFiscalYear={currentFiscalYear}
                                />;
      case 'usg_sewa': return <USGSewa 
                                  records={usgRecords}
                                  serviceSeekerRecords={serviceSeekerRecords}
                                  opdRecords={opdRecords}
                                  emergencyRecords={emergencyRecords}
                                  cbimnciRecords={cbimnciRecords}
                                  billingRecords={billingRecords}
                                  onSave={onSaveUSGRecord}
                                  onDelete={onDeleteUSGRecord}
                                  currentFiscalYear={currentFiscalYear}
                                />;
      case 'phisiotherapy': return <PhysiotherapySewa 
                                      records={physiotherapyRecords}
                                      serviceSeekerRecords={serviceSeekerRecords}
                                      opdRecords={opdRecords}
                                      emergencyRecords={emergencyRecords}
                                      cbimnciRecords={cbimnciRecords}
                                      onSave={onSavePhysiotherapyRecord}
                                      onDelete={onDeletePhysiotherapyRecord}
                                      currentFiscalYear={currentFiscalYear}
                                    />;
      case 'ambulance_sewa': return <AmbulanceSewa 
                                      records={ambulanceRecords}
                                      expenseRecords={ambulanceExpenseRecords}
                                      odometerRecords={ambulanceOdometerRecords}
                                      serviceSeekerRecords={serviceSeekerRecords}
                                      currentUser={currentUser}
                                      onSave={onSaveAmbulanceRecord}
                                      onDelete={onDeleteAmbulanceRecord}
                                      onSaveExpense={onSaveAmbulanceExpense}
                                      onDeleteExpense={onDeleteAmbulanceExpense}
                                      onSaveOdometer={onSaveAmbulanceOdometerRecord}
                                      onDeleteOdometer={onDeleteAmbulanceOdometerRecord}
                                      currentFiscalYear={currentFiscalYear}
                                      generalSettings={generalSettings}
                                      users={users}
                                    />;
      case 'gaun_ghar_clinic': return <GaunGharClinic 
                                        records={props.gaunGharClinicRecords || []} 
                                        onSaveRecord={props.onSaveGaunGharClinicRecord!} 
                                        onDeleteRecord={props.onDeleteGaunGharClinicRecord!} 
                                        currentFiscalYear={currentFiscalYear} 
                                        currentUser={currentUser} 
                                        generalSettings={generalSettings} 
                                      />;
      case 'log_book': return <LogBook currentUser={currentUser} currentFiscalYear={currentFiscalYear} inventoryItems={inventoryItems} logBookEntries={logBookEntries} onAddLogEntry={onSaveLogBookEntry} />;
      case 'report_tb_dst': return <TBDSTReport patients={tbPatients} currentFiscalYear={currentFiscalYear} />;
      case 'report_inventory_monthly': return <InventoryMonthlyReport 
                                              currentFiscalYear={currentFiscalYear} 
                                              currentUser={currentUser} 
                                              inventoryItems={inventoryItems} 
                                              magForms={magForms} 
                                              onSaveMagForm={onSaveMagForm} 
                                              generalSettings={generalSettings}
                                              dakhilaReports={dakhilaReports} 
                                              issueReports={issueReports} 
                                              stockEntryRequests={stockEntryRequests} 
                                              stores={stores} 
                                            />;
      case 'report_drug_quantification': return <DrugQuantification 
                                                  currentFiscalYear={currentFiscalYear}
                                                  opdRecords={opdRecords}
                                                  emergencyRecords={emergencyRecords}
                                                  cbimnciRecords={cbimnciRecords}
                                                  ipdRecords={ipdRecords}
                                                  inventoryItems={inventoryItems}
                                                  stores={stores}
                                                  generalSettings={generalSettings}
                                                  currentUser={currentUser}
                                                />;
      case 'report_lab_billing': return <LabBillingReport 
                                          billingRecords={billingRecords} 
                                          ambulanceRecords={ambulanceRecords}
                                          ambulanceExpenseRecords={ambulanceExpenseRecords}
                                          currentFiscalYear={currentFiscalYear} 
                                          generalSettings={generalSettings} 
                                          currentUser={currentUser}
                                          users={users}
                                          serviceItems={serviceItems}
                                          serviceSeekerRecords={serviceSeekerRecords}
                                        />;
      case 'online_report': return <OnlineReport 
        currentFiscalYear={currentFiscalYear}
        currentUser={currentUser}
        generalSettings={generalSettings}
        serviceSeekerRecords={serviceSeekerRecords}
        opdRecords={opdRecords}
        emergencyRecords={emergencyRecords}
        billingRecords={billingRecords}
        dispensaryRecords={dispensaryRecords}
        labReports={labReports}
      />;
      case 'database_management': return <DatabaseManagement currentUser={currentUser!} users={users} inventoryItems={inventoryItems} magForms={magForms} purchaseOrders={purchaseOrders} issueReports={issueReports} rabiesPatients={rabiesPatients} tbPatients={tbPatients} billingRecords={billingRecords} firms={firms} stores={stores} dakhilaReports={dakhilaReports} returnEntries={returnEntries} marmatEntries={marmatEntries} dhuliyaunaEntries={dhuliyaunaEntries} logBookEntries={logBookEntries} itemList={itemList} onClearData={onClearData} onUploadData={onUploadData} />;
      case 'general_setting': return <GeneralSetting currentUser={currentUser} settings={generalSettings} onUpdateSettings={onUpdateGeneralSettings} onUpdateGlobalDhis2Mappings={props.onUpdateGlobalDhis2Mappings} users={allUsers} activeOrgName={activeOrgName} />;
      case 'hib_settings': return <HIBSettings currentUser={currentUser} settings={generalSettings} onUpdateSettings={onUpdateGeneralSettings} />;
      case 'service_settings': return <ServiceSettings 
        serviceItems={serviceItems}
        onSaveServiceItem={onSaveServiceItem}
        onDeleteServiceItem={onDeleteServiceItem}
        currentFiscalYear={currentFiscalYear}
      />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-nepali">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 transition-opacity duration-300 no-print"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 z-40 transform transition-transform duration-300 ease-in-out no-print
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary-600 p-2 rounded-xl text-white shadow-lg shadow-primary-200">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-800 tracking-tight">{APP_NAME}</h1>
                <p className="text-[10px] text-primary-600 font-bold uppercase tracking-widest">Management System</p>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
            {menuItems.map((menu) => (
              <div key={menu.id}>
                {menu.subItems ? (
                  <div className="space-y-1">
                    <button
                      onClick={() => setExpandedMenu(expandedMenu === menu.id ? null : menu.id)}
                      className={`
                        w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200
                        ${expandedMenu === menu.id ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50'}
                      `}
                    >
                      <div className="flex items-center gap-3 relative">
                        <span className={`${expandedMenu === menu.id ? 'text-primary-600' : 'text-slate-700'}`}>{menu.icon}</span>
                        <span className="font-bold text-sm">{menu.label}</span>
                        {menu.badgeCount !== undefined && menu.badgeCount > 0 && (
                            <span className="absolute -top-1 -left-2 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white">
                                {menu.badgeCount}
                            </span>
                        )}
                      </div>
                      <span className="transition-transform duration-300">
                        {expandedMenu === menu.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                    </button>
                    
                    {expandedMenu === menu.id && (
                      <div className="pl-12 space-y-1 animate-in slide-in-from-top-2 duration-300">
                        {menu.subItems.map((sub) => (
                          sub.subItems ? (
                            <div key={sub.id} className="space-y-1">
                              <button
                                onClick={() => setExpandedSubMenu(expandedSubMenu === sub.id ? null : sub.id)}
                                className={`
                                  w-full flex items-center justify-between p-2.5 rounded-lg text-sm transition-all
                                  ${expandedSubMenu === sub.id ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'}
                                `}
                              >
                                <div className="flex items-center gap-3">
                                  <span className={`${expandedSubMenu === sub.id ? 'text-primary-600' : 'text-slate-500'}`}>{sub.icon}</span>
                                  <span>{sub.label}</span>
                                </div>
                                <span className="transition-transform duration-300">
                                  {expandedSubMenu === sub.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </span>
                              </button>
                              
                              {expandedSubMenu === sub.id && (
                                <div className="pl-4 space-y-1 border-l-2 border-slate-100 ml-3">
                                  {sub.subItems.map((child) => (
                                    <button
                                      key={child.id}
                                      onClick={() => { setActiveItem(child.id); setIsSidebarOpen(false); }}
                                      className={`
                                        w-full flex items-center gap-3 p-2 rounded-lg text-xs transition-all
                                        ${activeItem === child.id ? 'text-primary-700 font-bold bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
                                      `}
                                    >
                                      <span className={`${activeItem === child.id ? 'text-primary-600' : 'text-slate-400'}`}>{child.icon}</span>
                                      <span>{child.label}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                          <button
                            key={sub.id}
                            onClick={() => { setActiveItem(sub.id); setIsSidebarOpen(false); }}
                            className={`
                              w-full flex items-center gap-3 p-2.5 rounded-lg text-sm transition-all
                              ${activeItem === sub.id ? 'text-primary-700 font-black bg-white shadow-sm' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'}
                            `}
                          >
                            <span className={`${activeItem === sub.id ? 'text-primary-600' : 'text-slate-500'}`}>{sub.icon}</span>
                            <span>{sub.label}</span>
                            {sub.badgeCount !== undefined && sub.badgeCount > 0 && (
                              <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">{sub.badgeCount}</span>
                            )}
                          </button>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => { setActiveItem(menu.id); setExpandedMenu(null); setIsSidebarOpen(false); }}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200
                      ${activeItem === menu.id ? 'bg-primary-600 text-white shadow-lg shadow-primary-200 font-bold' : 'text-slate-700 hover:bg-slate-50'}
                    `}
                  >
                    <div className="relative">
                      <span className={`${activeItem === menu.id ? 'text-white' : 'text-slate-700'}`}>{menu.icon}</span>
                      {menu.badgeCount !== undefined && menu.badgeCount > 0 && (
                          <span className="absolute -top-1 -left-2 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white">
                              {menu.badgeCount}
                          </span>
                      )}
                    </div>
                    <span className="text-sm">{menu.label}</span>
                  </button>
                )}
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                <UserCog size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800 truncate">{currentUser?.fullName}</p>
                <p className="text-[10px] text-slate-500 truncate">{currentUser?.role}</p>
              </div>
              <button 
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="min-h-16 md:h-20 bg-white border-b border-slate-200 px-3 md:px-6 py-2 flex items-center justify-between z-20 shrink-0 no-print">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1 mr-2">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 text-slate-500 hover:bg-slate-50 rounded-lg shrink-0">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <img 
                src={generalSettings.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png"} 
                alt="Logo" 
                className="h-8 w-8 md:h-12 md:w-12 object-contain shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <h1 className="font-black text-slate-800 text-xs sm:text-sm md:text-lg leading-tight truncate sm:whitespace-normal">{generalSettings.orgNameNepali}</h1>
                <div className="hidden sm:flex flex-wrap gap-1.5 md:gap-2 text-[9px] md:text-[10px] text-slate-600 font-bold">
                    {generalSettings.subTitleNepali && <span>{generalSettings.subTitleNepali}</span>}
                    {generalSettings.subTitleNepali2 && <span>| {generalSettings.subTitleNepali2}</span>}
                    {generalSettings.subTitleNepali3 && <span>| {generalSettings.subTitleNepali3}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200">
              <Calendar size={14} className="text-slate-400" />
              <span className="text-[11px] font-bold text-slate-600 font-nepali">आ.व. {toNepaliDigits(currentFiscalYear)}</span>
            </div>

            {currentUser?.role === 'SUPER_ADMIN' && managedOrgs.length > 1 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full border border-indigo-200 shadow-xs">
                <Building2 size={14} className="text-indigo-500" />
                <select 
                  value={activeOrgName}
                  onChange={(e) => onSetActiveOrgName(e.target.value)}
                  className="bg-transparent text-[11px] font-bold text-indigo-800 focus:outline-none cursor-pointer font-nepali pr-1"
                  title="संस्था परिवर्तन गर्नुहोस् (Switch Organization)"
                >
                  {['All', ...managedOrgs].map(org => (
                    <option key={org} value={org}>{org === 'All' ? 'सबै संस्था (All Organizations)' : org}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="relative" ref={notifRef}>
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`p-2 rounded-xl border transition-all relative ${showNotifications ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                    <Bell size={20} className="text-slate-600" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-bounce">
                            {unreadCount}
                        </span>
                    )}
                </button>

                {showNotifications && (
                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                            <button onClick={clearAllNotifs} className="text-[10px] font-bold text-primary-600 hover:underline">Mark all read</button>
                        </div>
                        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
                            {notifications.length > 0 ? (
                                notifications.map(n => (
                                    <button 
                                        key={n.id}
                                        onClick={() => handleNotifClick(n)}
                                        className={`w-full text-left p-3 rounded-xl transition-all border flex gap-3 group
                                            ${n.isNew ? 'bg-primary-50/50 border-primary-100 hover:bg-primary-50' : 'bg-white border-transparent hover:bg-slate-50'}
                                        `}
                                    >
                                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center
                                            ${n.type === 'success' ? 'bg-green-100 text-green-600' : 
                                              n.type === 'warning' ? 'bg-orange-100 text-orange-600' :
                                              n.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}
                                        `}>
                                            {n.type === 'success' ? <CheckCircle2 size={16}/> : n.type === 'error' ? <AlertTriangle size={16}/> : <Info size={16}/>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-800 leading-tight group-hover:text-primary-700">{n.title}</p>
                                            <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{n.description}</p>
                                            <p className="text-[9px] text-slate-400 mt-1 font-nepali">{n.time}</p>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-12 text-center text-slate-400">
                                    <Bell size={32} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-xs italic font-nepali">कुनै सूचना छैन।</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="h-8 w-px bg-slate-200"></div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-none">{currentUser?.fullName}</p>
                <p className="text-[10px] text-slate-400 mt-1">{currentUser?.designation}</p>
                <p className="text-[10px] text-slate-400 mt-1">{currentUser?.organizationName}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                <UserCog size={20} />
              </div>
            </div>
          </div>
        </header>

        <main ref={mainContentRef} className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto min-h-full pb-20 lg:pb-0">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* QUICK PREVIEW MODAL FOR DAKHILA */}
      {previewDakhila && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={() => setPreviewDakhila(null)}></div>
              <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                  <div className="px-8 py-6 border-b bg-indigo-50 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                          <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-600 shadow-sm">
                              <Archive size={28} />
                          </div>
                          <div>
                              <h3 className="text-xl font-black text-indigo-900 font-nepali">दाखिला सामान विवरण</h3>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Quick Item Preview</p>
                          </div>
                      </div>
                      <button onClick={() => setPreviewDakhila(null)} className="p-2 hover:bg-white/50 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="p-8">
                      <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                          <div className="space-y-0.5">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Dakhila Number</p>
                              <p className="text-lg font-black text-slate-700 font-mono">#{previewDakhila.dakhilaNo}</p>
                          </div>
                          <div className="text-right space-y-0.5">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Entry Date</p>
                              <p className="text-lg font-bold text-slate-700 font-nepali">{previewDakhila.date}</p>
                          </div>
                      </div>

                      <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                          <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-500 font-bold">
                                  <tr>
                                      <th className="px-6 py-3 border-b border-slate-100">सामानको नाम</th>
                                      <th className="px-6 py-3 border-b border-slate-100 text-right">परिमाण</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                  {previewDakhila.items.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                          <td className="px-6 py-3 font-bold text-slate-700">{item.name}</td>
                                          <td className="px-6 py-3 text-right">
                                              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-black text-xs">
                                                  {item.quantity} {item.unit}
                                              </span>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>

                      <div className="mt-8 flex flex-col gap-3">
                          {!canViewFullReport && (
                              <div className="bg-red-50 border border-red-100 p-3 rounded-2xl flex items-center gap-3 text-red-700 animate-in fade-in slide-in-from-top-1">
                                  <ShieldAlert size={20} className="shrink-0" />
                                  <p className="text-xs font-bold font-nepali">तपाईंलाई पूर्ण रिपोर्ट हेर्ने अनुमति छैन। कृपया शाखा प्रमुख वा एडमिनसँग सम्पर्क गर्नुहोस्।</p>
                              </div>
                          )}
                          
                          <div className="flex gap-3">
                              <button 
                                onClick={() => setPreviewDakhila(null)}
                                className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-[0.98]"
                              >
                                बन्द गर्नुहोस्
                              </button>
                              {canViewFullReport && (
                                  <button 
                                    onClick={handleOpenFullDakhila}
                                    className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                  >
                                    <Eye size={18} /> पूर्ण रिपोर्ट हेर्नुहोस्
                                  </button>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {showExpiryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowExpiryModal(false)}></div>
              <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
                  <div className={`px-8 py-6 border-b flex justify-between items-center ${expiryModalType === 'expired' ? 'bg-red-50' : 'bg-amber-50'}`}>
                      <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl ${expiryModalType === 'expired' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                              {expiryModalType === 'expired' ? <AlertOctagon size={24} /> : <Timer size={24} />}
                          </div>
                          <div>
                              <h3 className={`text-xl font-black font-nepali ${expiryModalType === 'expired' ? 'text-red-900' : 'text-amber-900'}`}>
                                  {expiryModalType === 'expired' ? 'म्याद सकिएका सामानहरू (Expired Items)' : 'म्याद सकिन लागेका सामानहरू (Near Expiry)'}
                              </h3>
                              <p className={`text-xs font-bold uppercase tracking-widest ${expiryModalType === 'expired' ? 'text-red-600' : 'text-amber-600'}`}>
                                  Safety Monitoring Alert
                              </p>
                          </div>
                      </div>
                      <button onClick={() => setShowExpiryModal(false)} className="p-2 hover:bg-white/50 rounded-full transition-colors"><X size={24} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto" id={expiryModalType === 'expired' ? 'expired-items-print' : 'near-expiry-items-print'}>
                      {/* Print Header */}
                      <div className="hidden print:block text-center mb-6 pt-4">
                          <h1 className="text-2xl font-bold text-red-600">{generalSettings.orgNameNepali}</h1>
                          <h2 className="text-xl font-bold underline mt-2 mb-4">
                              {expiryModalType === 'expired' ? 'म्याद सकिएका सामानहरूको सूची (Expired Items)' : 'म्याद सकिन लागेका सामानहरूको सूची (Near Expiry)'}
                          </h2>
                          <div className="text-sm font-bold text-slate-600 mb-6">
                              मिति: {new NepaliDate().format('YYYY-MM-DD')}
                          </div>
                      </div>
                      
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 z-10 print:static print:bg-slate-100">
                              <tr><th className="px-8 py-4 border-b print:border print:px-2">सामानको नाम</th><th className="px-6 py-4 border-b print:border print:px-2">ब्याच नं</th><th className="px-6 py-4 border-b text-center print:border print:px-2">मौज्दात</th><th className="px-6 py-4 border-b text-right print:border print:px-2">म्याद सकिने मिति</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {(expiryModalType === 'expired' ? expiredItems : nearExpiryItems).map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors print:hover:bg-transparent">
                                      <td className="px-8 py-4 font-bold text-slate-800 print:border print:px-2 print:py-1">{item.itemName}</td>
                                      <td className="px-6 py-4 font-mono text-slate-500 print:border print:px-2 print:py-1">{item.batchNo || '-'}</td>
                                      <td className="px-6 py-4 text-center print:border print:px-2 print:py-1"><span className="px-2.5 py-1 rounded-lg bg-slate-100 font-black text-slate-700 print:bg-transparent print:p-0">{item.currentQuantity} {item.unit}</span></td>
                                      <td className="px-6 py-4 text-right print:border print:px-2 print:py-1"><span className={`font-black font-nepali ${expiryModalType === 'expired' ? 'text-red-600' : 'text-orange-600'}`}>{item.expiryDateBs}</span><br/><span className="text-[10px] text-slate-400 font-mono">({item.expiryDateAd})</span></td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
                  <div className="p-6 border-t bg-slate-50 flex justify-between items-center">
                      <div className="text-xs text-slate-400 italic">Total Items Found: {expiryModalType === 'expired' ? expiredItems.length : nearExpiryItems.length}</div>
                      <button onClick={() => setShowExpiryPrintOptionsModal(true)} className="bg-slate-800 text-white px-8 py-2.5 rounded-2xl font-bold hover:bg-slate-900 shadow-lg shadow-slate-200 transition-all flex items-center gap-2">
                         <Printer size={18} /> प्रिन्ट गर्नुहोस्
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showExpiryPrintOptionsModal && (
        <PrintOptionsModal 
          onClose={() => setShowExpiryPrintOptionsModal(false)} 
          onPrint={(orientation) => handlePrint(expiryModalType === 'expired' ? 'expired-items-print' : 'near-expiry-items-print', orientation)} 
        />
      )}
    </div>
  );
};
