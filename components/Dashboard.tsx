
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  LogOut, Menu, Calendar, Stethoscope, Package, FileText, Settings, LayoutDashboard, 
  ChevronDown, ChevronRight, Syringe, Activity, Info, Building2,
  ClipboardList, FileSpreadsheet, FilePlus, ShoppingCart, FileOutput, 
  BookOpen, Book, Archive, RotateCcw, Wrench, Scroll, BarChart3,
  Sliders, Store, ShieldCheck, Users, Database, KeyRound, UserCog, Lock, Warehouse, ClipboardCheck, Bell, X, CheckCircle2, AlertTriangle, Calculator, Trash2, TrendingUp, AlertOctagon, Timer, Printer, Baby, Flame, CalendarClock, List,
  Eye, ShieldAlert, ChevronLeft, Send, MapPin, Search, HeartHandshake,
  UserPlus, FlaskConical, Pill, Accessibility, Scan, Waves, Siren, MessageSquare
} from 'lucide-react';
import { APP_NAME, FISCAL_YEARS } from '../constants';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { DashboardProps } from '../types/dashboardTypes'; 
import { PurchaseOrderEntry, InventoryItem, MagFormEntry, StockEntryRequest, DakhilaPratibedanEntry } from '../types/inventoryTypes';
import { User, LeaveApplication, LeaveStatus, Darta, Chalani, BharmanAdeshEntry, GarbhawotiRecord, PrasutiRecord, UttarPrasutiRecord, ServiceSeekerRecord, OPDRecord, EmergencyRecord, CBIMNCIRecord, BillingRecord, ServiceItem, LabReport, DispensaryRecord, PariwarSewaRecord, XRayRecord, ECGRecord, USGRecord, PhysiotherapyRecord, IPDRecord, InterFacilityRequest } from '../types';
import { UserManagement } from './UserManagement';
import { Conference } from './Conference';
import { ChangePassword } from './ChangePassword';
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
import { VaccinationServiceTabs } from './VaccinationServiceTabs';
import { ImmunizationTracking } from './ImmunizationTracking';
import { ImmunizationReport } from './ImmunizationReport';
import { Microplanning } from './Microplanning';
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
import { FamilyPlanningReport } from './FamilyPlanningReport';
import { GESIReport } from './GESIReport';
import { GESIOPDReport } from './GESIOPDReport';
import { GESICBIMNCIReport } from './GESICBIMNCIReport';
import { MCHReport } from './MCHReport';
import { MedicineStatusReport } from './MedicineStatusReport';
import { DHISReport } from './DHISReport';
import { VitaminAProgram } from './VitaminAProgram';
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
  ipdRecords: IPDRecord[];
  onSaveIPDRecord: (record: IPDRecord) => void;
  onDeleteIPDRecord: (id: string) => void;
  onDeleteAllIPDRecords: () => void;
  interFacilityRequests: InterFacilityRequest[];
  onAddInterFacilityRequest: (req: InterFacilityRequest) => void;
  onUpdateInterFacilityRequest: (req: InterFacilityRequest) => void;
  onUpdateReadNotifications: (userId: string, readIds: string[]) => void;
  activeOrgName: string;
  onSetActiveOrgName: (orgName: string) => void;
  allUsers: User[];
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

export const Dashboard: React.FC<ExtendedDashboardProps> = ({ 
  onLogout, currentUser, currentFiscalYear, users = [], onAddUser, onUpdateUser, onDeleteUser, onChangePassword, isDbLocked,
  generalSettings, onUpdateGeneralSettings, magForms = [], onSaveMagForm, onDeleteMagForm,
  purchaseOrders = [], onUpdatePurchaseOrder, onDeletePurchaseOrder, issueReports = [], onUpdateIssueReport, 
  rabiesPatients = [], onAddRabiesPatient, onUpdatePatient, onDeletePatient,
  tbPatients = [], onAddTbPatient, onUpdateTbPatient, onDeleteTbPatient, 
  garbhawatiPatients = [], onAddGarbhawatiPatient, onUpdateGarbhawatiPatient, onDeleteGarbhawatiPatient, 
  bachhaImmunizationRecords = [], onAddBachhaImmunizationRecord, onUpdateBachhaImmunizationRecord, onDeleteBachhaImmunizationRecord, 
  firms = [], onAddFirm, quotations = [], onAddQuotation, inventoryItems = [], onAddInventoryItem, onUpdateInventoryItem, onDeleteInventoryItem,
  stockEntryRequests = [], onRequestStockEntry, onApproveStockEntry, onRejectStockEntry, stores = [], onAddStore, onUpdateStore, onDeleteStore,
  dakhilaReports = [], onSaveDakhilaReport, returnEntries = [], onSaveReturnEntry, 
  marmatEntries = [], onSaveMarmatEntry, dhuliyaunaEntries = [], onSaveDhuliyaunaEntry,
  logBookEntries = [], onSaveLogBookEntry, itemList = [], onAddItem, onUpdateItem, onDeleteItem, onClearData, onUploadData,
  leaveApplications = [], onAddLeaveApplication, onUpdateLeaveStatus, onDeleteLeaveApplication,
  leaveBalances = [], onSaveLeaveBalance,
  dartaEntries = [], onSaveDarta, onDeleteDarta,
  chalaniEntries = [], onSaveChalani, onDeleteChalani,
  bharmanAdeshEntries = [], onSaveBharmanAdesh, onDeleteBharmanAdesh,
  garbhawotiRecords = [], onSaveGarbhawotiRecord, onDeleteGarbhawotiRecord,
  prasutiRecords = [], onSavePrasutiRecord, onDeletePrasutiRecord,
  uttarPrasutiRecords = [], onSaveUttarPrasutiRecord, onDeleteUttarPrasutiRecord,
  serviceSeekerRecords = [], onSaveServiceSeekerRecord, onDeleteServiceSeekerRecord,
  opdRecords = [], onSaveOPDRecord, onDeleteOPDRecord,
  emergencyRecords = [], onSaveEmergencyRecord, onDeleteEmergencyRecord,
  cbimnciRecords = [], onSaveCBIMNCIRecord, onDeleteCBIMNCIRecord,
  billingRecords = [], onSaveBillingRecord, onDeleteBillingRecord,
  dispensaryRecords = [], onSaveDispensaryRecord, onDeleteDispensaryRecord,
  serviceItems = [], onSaveServiceItem, onDeleteServiceItem,
  labReports = [], onSaveLabReport, onDeleteLabReport,
  pariwarSewaRecords = [], onSavePariwarSewaRecord, onDeletePariwarSewaRecord,
  xrayRecords = [], onSaveXRayRecord, onDeleteXRayRecord,
  ecgRecords = [], onSaveECGRecord, onDeleteECGRecord,
  usgRecords = [], onSaveUSGRecord, onDeleteUSGRecord,
  physiotherapyRecords = [], onSavePhysiotherapyRecord, onDeletePhysiotherapyRecord,
  ipdRecords = [], onSaveIPDRecord, onDeleteIPDRecord, onDeleteAllIPDRecords,
  interFacilityRequests = [], onAddInterFacilityRequest, onUpdateInterFacilityRequest,
  onUpdateReadNotifications,
  activeOrgName, onSetActiveOrgName, allUsers = []
}) => {
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [expandedSubMenu, setExpandedSubMenu] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<string>(() => {
    return localStorage.getItem('smart_inv_active_item') || 'dashboard';
  });
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
  const [isChalaniFormOpen, setIsChalaniFormOpen] = useState(false);
  const [dartaSearchQuery, setDartaSearchQuery] = useState('');
  const [chalaniSearchQuery, setChalaniSearchQuery] = useState('');
  
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

  // --- BADGE CALCULATIONS ---
  const counts = useMemo(() => {
    if (!currentUser) return {};

    const res: Record<string, number> = {};

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

    return res;
  }, [currentUser, magForms, purchaseOrders, stockEntryRequests, issueReports, unreadCount]);

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
    if (currentUser?.role !== 'HEALTH_SECTION') return [];
    const orgs = allUsers
      .filter(u => u.parentId === currentUser.id && u.role === 'ADMIN')
      .map(u => u.organizationName);
    return Array.from(new Set([currentUser.organizationName, ...orgs]));
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

  const hasAccess = useCallback((menuId: string) => {
    if (!currentUser) return false;
    if (currentUser.role === 'SUPER_ADMIN') return true;
    return currentUser.allowedMenus?.includes(menuId) || menuId === 'dashboard' || menuId === 'change_password' || menuId === 'bida_abedan';
  }, [currentUser]);

  interface MenuItem { id: string; label: string; icon: React.ReactNode; subItems?: MenuItem[]; badgeCount?: number; }
  
  const allMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'ड्यासबोर्ड', icon: <LayoutDashboard size={20} /> },
    { 
      id: 'services', 
      label: 'सेवा (Services)', 
      icon: <Stethoscope size={20} />, 
      subItems: [ 
        { id: 'mul_darta', label: 'मूल दर्ता सेवा', icon: <ClipboardList size={16} /> },
        { 
          id: 'karyakram', 
          label: 'कार्यक्रम (Programs)', 
          icon: <Activity size={16} />,
          subItems: [
            { id: 'vitamin_a', label: 'भिटामिन ए कार्यक्रम', icon: <CheckCircle2 size={16} /> }
          ]
        },
        { id: 'opd_sewa', label: 'ओ.पी.डी. सेवा', icon: <UserPlus size={16} /> },
        { id: 'ipd_sewa', label: 'आई.पी.डी. सेवा (IPD)', icon: <Building2 size={16} /> },
        { id: 'emergency_sewa', label: 'आकस्मिक सेवा (Emergency)', icon: <Siren size={16} /> },
        { id: 'cbimnci_sewa', label: 'CBIMNCI सेवा', icon: <Baby size={16} /> },
        { id: 'service_billing', label: 'सेवा बिलिङ (Service Billing)', icon: <FileText size={16} /> },
        { id: 'prayogsala_sewa', label: 'प्रयोगशाला सेवा', icon: <FlaskConical size={16} /> },
        { id: 'dispensory_sewa', label: 'डिस्पेन्सरी सेवा', icon: <Pill size={16} /> },
        { id: 'pariwar_niyojan', label: 'परिवार नियोजन सेवा', icon: <Users size={16} /> },
        { id: 'xray_sewa', label: 'एक्स-रे सेवा', icon: <Scan size={16} /> },
        { id: 'ecg_sewa', label: 'ई.सी.जी. सेवा', icon: <Activity size={16} /> },
        { id: 'usg_sewa', label: 'यु.एस.जी. सेवा', icon: <Waves size={16} /> },
        { id: 'phisiotherapy', label: 'फिजियोथेरापी सेवा', icon: <Accessibility size={16} /> },
        { 
          id: 'administration', 
          label: 'प्रशासन', 
          icon: <Users size={16} />,
          subItems: [
            { id: 'darta', label: 'दर्ता', icon: <FileText size={16} /> },
            { id: 'chalani', label: 'चलानी', icon: <Send size={16} /> },
            { id: 'bharman_adesh', label: 'भ्रमण आदेश दर्ता', icon: <MapPin size={16} /> },
            { id: 'bida_abedan', label: 'बिदा आवेदन', icon: <Calendar size={16} /> },
          ]
        },
        { 
          id: 'tb_leprosy_group', 
          label: 'क्षयरोग/कुष्ठरोग', 
          icon: <Activity size={16} />,
          subItems: [
            { id: 'tb_leprosy', label: 'बिरामी दर्ता', icon: <UserPlus size={16} /> },
          ]
        },
        { id: 'khop_sewa', label: 'खोप सेवा', icon: <Baby size={16} /> }, 
        { id: 'rabies', label: 'रेबिज़ खोप क्लिनिक', icon: <Syringe size={16} /> }, 
        { 
          id: 'surakshit_matritwo', 
          label: 'सुरक्षित मातृत्व सेवा', 
          icon: <Baby size={16} />,
          subItems: [
            { id: 'garbhawoti_sewa', label: 'गर्भवती सेवा', icon: <HeartHandshake size={16} /> },
            { id: 'prasuti_sewa', label: 'प्रसूति सेवा', icon: <Baby size={16} /> },
            { id: 'uttar_prasuti_sewa', label: 'उत्तर प्रसूति सेवा', icon: <Baby size={16} /> },
          ]
        },
        { id: 'immunization_tracking', label: 'खोप अनुगमन', icon: <Baby size={16} /> } 
      ] 
    },
    {
      id: 'inventory',
      label: 'जिन्सी व्यवस्थापन',
      icon: <Package size={20} />,
      subItems: [
        { id: 'jinshi_maujdat', label: 'जिन्सी मौज्दात', icon: <Warehouse size={16} /> },
        { id: 'stock_entry_approval', label: 'स्टक दाखिला अनुमति', icon: <ClipboardCheck size={16} />, badgeCount: counts.stock_entry_approval },
        { id: 'mag_faram', label: 'माग फारम', icon: <FilePlus size={16} />, badgeCount: counts.mag_faram },
        { id: 'kharid_adesh', label: 'खरिद आदेश', icon: <ShoppingCart size={16} />, badgeCount: counts.kharid_adesh },
        { id: 'nikasha_pratibedan', label: 'निकासा प्रतिवेदन', icon: <FileOutput size={16} />, badgeCount: counts.nikasha_pratibedan },
        { id: 'dakhila_pratibedan', label: 'दाखिला प्रतिवेदन', icon: <Archive size={16} />, badgeCount: counts.dakhila_pratibedan },
        { id: 'jinshi_khata', label: 'जिन्सी खाता', icon: <Book size={16} /> },
        { id: 'sahayak_jinshi_khata', label: 'सहायक जिन्सी खाता', icon: <BookOpen size={16} /> },
        { id: 'jinshi_firta_khata', label: 'जिन्सी फिर्ता', icon: <RotateCcw size={16} /> },
        { id: 'marmat_adesh', label: 'मर्मत आवेदन', icon: <Wrench size={16} /> },
        { id: 'dhuliyauna_faram', label: 'लिलाम/धुल्याउने', icon: <Trash2 size={16} /> },
        { id: 'log_book', label: 'लग बुक', icon: <Scroll size={16} /> },
        { id: 'form_suchikaran', label: 'फर्म सुचीकरण', icon: <ClipboardList size={16} /> },
        { id: 'quotation', label: 'सामानको कोटेशन', icon: <FileSpreadsheet size={16} /> },
      ]
    },
    {
      id: 'reports',
      label: 'रिपोर्टहरू',
      icon: <BarChart3 size={20} />,
      subItems: [
        { 
          id: 'report_khop_group', 
          label: 'खोप रिपोर्ट', 
          icon: <Baby size={16} />,
          subItems: [
             { id: 'report_khop', label: 'खोप रिपोर्ट (Main)', icon: <Baby size={16} /> },
             { id: 'report_microplanning', label: 'Microplanning', icon: <Calendar size={16} /> }
          ]
        },
        { id: 'report_rabies', label: 'रेबिज़ रिपोर्ट', icon: <Syringe size={16} /> },
        { id: 'report_cbimnci', label: 'CBIMNCI रिपोर्ट', icon: <FileText size={16} /> },
        { id: 'report_reporting_status', label: 'रिपोर्टिङ स्थिति', icon: <FileText size={16} /> },
        { id: 'report_pariwar_niyojan', label: 'परिवार नियोजन रिपोर्ट', icon: <Users size={16} /> },
        { id: 'report_gesi', label: 'Gender Equity and social inclusion', icon: <FileText size={16} /> },
        { id: 'report_gesi_opd', label: 'GESI OPD सेवा रिपोर्ट', icon: <FileText size={16} /> },
        { id: 'report_gesi_cbimnci', label: 'GESI CBIMNCI रिपोर्ट', icon: <FileText size={16} /> },
        { id: 'report_mch', label: 'MCH रिपोर्ट', icon: <Baby size={16} /> },
        { id: 'report_tb_dst', label: 'TBDST रिपोर्ट', icon: <FileText size={16} /> },
        { id: 'report_inventory_monthly', label: 'जिन्सी मासिक रिपोर्ट', icon: <FileText size={16} /> },
        { 
          id: 'report_dhis', 
          label: 'DHIS रिपोर्ट',
          icon: <BarChart3 size={16} />,
          subItems: [
              { id: 'report_dhis_general', label: 'DHIS सामान्य रिपोर्ट', icon: <FileText size={16} /> }
          ]
        }
      ]
    },
    {
      id: 'conference',
      label: 'कन्फरेन्स (Conference)',
      icon: <MessageSquare size={20} />,
      badgeCount: unreadConferenceCount > 0 ? unreadConferenceCount : undefined
    },
    {
      id: 'settings',
      label: 'सेटिङ',
      icon: <Settings size={20} />,
      subItems: [
        { id: 'general_setting', label: 'सामान्य सेटिङ', icon: <Sliders size={16} /> },
        { id: 'service_settings', label: 'सेवा सेटिङ (Service Settings)', icon: <Activity size={16} /> },
        { id: 'store_setup', label: 'स्टोर सेटअप', icon: <Store size={16} /> },
        { id: 'user_management', label: 'प्रयोगकर्ता व्यवस्थापन', icon: <Users size={16} /> },
        { id: 'change_password', label: 'पासवर्ड परिवर्तन', icon: <KeyRound size={16} /> },
        { id: 'database_management', label: 'डाटाबेस व्यवस्थापन', icon: <Database size={16} /> },
      ]
    }
  ];

  const menuItems = useMemo(() => {
    const filterItems = (items: MenuItem[]): MenuItem[] => {
      return items.map(item => {
        // Recursively filter sub-items
        const filteredSubItems = item.subItems ? filterItems(item.subItems) : undefined;
        
        // Check if the item itself is accessible OR has accessible children
        const isAccessible = hasAccess(item.id);
        const hasAccessibleChildren = filteredSubItems && filteredSubItems.length > 0;
        
        if (isAccessible || hasAccessibleChildren) {
          // Calculate badge count (sum of children if not set on parent)
          const subBadgesSum = filteredSubItems?.reduce((acc, si) => acc + (si.badgeCount || 0), 0) || 0;
          
          return {
            ...item,
            subItems: filteredSubItems,
            badgeCount: item.badgeCount !== undefined ? item.badgeCount : (subBadgesSum > 0 ? subBadgesSum : undefined)
          };
        }
        return null;
      }).filter(Boolean) as MenuItem[];
    };

    return filterItems(allMenuItems);
  }, [currentUser, hasAccess, counts, unreadConferenceCount]);

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
    switch (activeItem) {
      case 'dashboard': return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Activity size={24} /></div>
              <div><h2 className="text-xl font-bold text-slate-800 font-nepali">प्रणाली ड्यासबोर्ड (System Dashboard)</h2><p className="text-sm text-slate-500">प्रणालीको हालको अवस्था र तथ्याङ्क</p></div>
            </div>
            <button onClick={() => handlePrint('dashboard-main-print')} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium shadow-sm hover:bg-slate-900 no-print">
              <Printer size={18} /> प्रिन्ट
            </button>
          </div>
          <div id="dashboard-main-print" className="print-container">
            <div className="hidden print:block text-center mb-6">
              <h1 className="text-xl font-bold text-red-600">{generalSettings.orgNameNepali}</h1>
              <h2 className="text-lg font-bold underline mt-2">प्रणाली ड्यासबोर्ड सारांश</h2>
              <p className="text-sm">मिति: {new NepaliDate().format('YYYY-MM-DD')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6 print:grid-cols-2 print:gap-4 print:mb-6">
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
                                <td className="p-2 font-bold" data-label="Name">{p.name}</td>
                                <td className="p-2 text-center" data-label="Dose">
                                  <div className="flex justify-center md:justify-center gap-1">
                                    {(p.schedule || []).filter(d => fixDate(d.dateBs || '') === fixDate(selectedStatsDate)).map(d => ( 
                                      <span key={d.day} className={`px-2 py-0.5 rounded-full font-black text-[10px] ${d.status === 'Given' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>D{d.day}</span> 
                                    ))}
                                  </div>
                                </td>
                                <td className="p-2 text-right font-mono" data-label="Phone">{p.phone}</td>
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
      case 'khop_sewa': return <VaccinationServiceTabs currentFiscalYear={currentFiscalYear} generalSettings={generalSettings} onUpdateGeneralSettings={onUpdateGeneralSettings} garbhawatiPatients={garbhawatiPatients} onAddGarbhawatiPatient={onAddGarbhawatiPatient} onUpdateGarbhawatiPatient={onUpdateGarbhawatiPatient} onDeleteGarbhawatiPatient={onDeleteGarbhawatiPatient} bachhaImmunizationRecords={bachhaImmunizationRecords} onAddBachhaImmunizationRecord={onAddBachhaImmunizationRecord} onUpdateBachhaImmunizationRecord={onUpdateBachhaImmunizationRecord} onDeleteBachhaImmunizationRecord={onDeleteBachhaImmunizationRecord} />;
      case 'immunization_tracking': return <ImmunizationTracking currentFiscalYear={currentFiscalYear} records={bachhaImmunizationRecords} generalSettings={generalSettings} />;
      case 'report_khop': return <ImmunizationReport currentFiscalYear={currentFiscalYear} bachhaRecords={bachhaImmunizationRecords} maternalRecords={garbhawatiPatients} generalSettings={generalSettings} />;
      case 'report_microplanning': return <Microplanning currentFiscalYear={currentFiscalYear} bachhaRecords={bachhaImmunizationRecords} />;
      case 'conference': return <Conference currentUser={currentUser} allUsers={users} />;
      case 'user_management': return <UserManagement currentUser={currentUser} users={users} onAddUser={onAddUser} onUpdateUser={onUpdateUser} onDeleteUser={onDeleteUser} isDbLocked={isDbLocked} />;
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
      case 'vitamin_a': return <VitaminAProgram currentFiscalYear={currentFiscalYear} />;
      case 'rabies': return <RabiesRegistration currentFiscalYear={currentFiscalYear} patients={rabiesPatients} onAddPatient={onAddRabiesPatient} onUpdatePatient={onUpdatePatient} onDeletePatient={onDeletePatient} currentUser={currentUser} />;
      case 'report_rabies': return <RabiesReport currentFiscalYear={currentFiscalYear} currentUser={currentUser} patients={rabiesPatients} />;
      case 'report_cbimnci': return <CBIMNCIReport cbimnciRecords={cbimnciRecords} serviceSeekerRecords={serviceSeekerRecords} currentFiscalYear={currentFiscalYear} />;
      case 'report_reporting_status': return <ReportingStatusReport serviceSeekerRecords={serviceSeekerRecords} bachhaImmunizationRecords={bachhaImmunizationRecords} currentFiscalYear={currentFiscalYear} generalSettings={generalSettings} />;
      case 'report_pariwar_niyojan': return <FamilyPlanningReport records={pariwarSewaRecords} settings={generalSettings} fiscalYear={currentFiscalYear} />;
      case 'report_gesi': return <GESIReport currentFiscalYear={currentFiscalYear} bachhaRecords={bachhaImmunizationRecords} cbimnciRecords={cbimnciRecords} serviceSeekerRecords={serviceSeekerRecords} prasutiRecords={prasutiRecords} tbPatients={tbPatients} opdRecords={opdRecords} ipdRecords={ipdRecords} />;
      case 'report_gesi_opd': return <GESIOPDReport currentFiscalYear={currentFiscalYear} serviceSeekerRecords={serviceSeekerRecords} opdRecords={opdRecords} />;
      case 'report_gesi_cbimnci': return <GESICBIMNCIReport currentFiscalYear={currentFiscalYear} serviceSeekerRecords={serviceSeekerRecords} cbimnciRecords={cbimnciRecords} />;
      case 'report_mch': return <MCHReport currentFiscalYear={currentFiscalYear} garbhawotiRecords={garbhawotiRecords} prasutiRecords={prasutiRecords} generalSettings={generalSettings} />;
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
      case 'dhuliyauna_faram': return <DhuliyaunaFaram currentFiscalYear={currentFiscalYear} currentUser={currentUser} inventoryItems={inventoryItems} dhuliyaunaEntries={dhuliyaunaEntries} onSaveDhuliyaunaEntry={onSaveDhuliyaunaEntry} stores={stores} />;
      case 'bharman_adesh': return <BharmanAdesh currentFiscalYear={currentFiscalYear} currentUser={currentUser} bharmanAdeshEntries={bharmanAdeshEntries} onSaveEntry={onSaveBharmanAdesh} onDeleteEntry={onDeleteBharmanAdesh} users={users} generalSettings={generalSettings} leaveBalances={leaveBalances} />;
      case 'chalani': {
        const fiscalYearSuffix = currentFiscalYear.slice(2, 4) + currentFiscalYear.slice(7, 9);
        const entriesForYear = chalaniEntries.filter(c => c.fiscalYear === currentFiscalYear);
        
        const sortedChalaniEntries = [...entriesForYear].sort((a, b) => {
            const numA = parseInt(a.dispatchNumber.split('-')[0]);
            const numB = parseInt(b.dispatchNumber.split('-')[0]);
            return numB - numA;
        });

        const nextSerialNumber = sortedChalaniEntries.length > 0 ? parseInt(sortedChalaniEntries[0].dispatchNumber.split('-')[0]) + 1 : 1;
        const nextDispatchNumber = `${nextSerialNumber}-${fiscalYearSuffix}`;

        const filteredChalaniEntries = sortedChalaniEntries.filter(c => 
            c.dispatchNumber.toLowerCase().includes(chalaniSearchQuery.toLowerCase()) ||
            c.subject.toLowerCase().includes(chalaniSearchQuery.toLowerCase()) ||
            c.sender.toLowerCase().includes(chalaniSearchQuery.toLowerCase()) ||
            c.recipient.toLowerCase().includes(chalaniSearchQuery.toLowerCase())
        );

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">चलानी सूची (आ.व. {currentFiscalYear})</h2>
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
                    <button onClick={() => setIsChalaniFormOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700">
                        <Send size={18} /> नयाँ चलानी
                    </button>
                </div>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left responsive-table">
                  <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                    <tr>
                      <th className="p-3">चलानी नं.</th>
                      <th className="p-3">मिति</th>
                      <th className="p-3">पाउने</th>
                      <th className="p-3">बिषय</th>
                      <th className="p-3">पठाउने</th>
                      {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && <th className="p-3 text-right">कार्य</th>}
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
                        {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && (
                          <td className="p-3 text-right" data-label="कार्य">
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
                          </td>
                        )}
                      </tr>
                    ))}
                    {filteredChalaniEntries.length === 0 && (
                        <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500 italic">कुनै चलानी भेटिएन।</td>
                        </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {isChalaniFormOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl relative animate-in zoom-in-95 slide-in-from-bottom-4">
                        <h3 className="text-2xl font-bold text-slate-800 mb-6">नयाँ चिठीपत्र चलानी</h3>
                        <ChalaniForm 
                            currentUser={currentUser!}
                            nextDispatchNumber={nextDispatchNumber}
                            onSave={(chalaniData) => {
                                const newChalani: Chalani = {
                                    id: Date.now().toString(),
                                    dispatchNumber: nextDispatchNumber,
                                    fiscalYear: currentFiscalYear,
                                    ...chalaniData,
                                };
                                onSaveChalani(newChalani);
                                setIsChalaniFormOpen(false);
                                alert('चलानी सफलतापूर्वक सुरक्षित गरियो!');
                            }}
                            onCancel={() => setIsChalaniFormOpen(false)}
                        />
                        <button onClick={() => setIsChalaniFormOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                            <X size={20}/>
                        </button>
                    </div>
                </div>
            )}
          </div>
        );
      }
      case 'darta': {
        const fiscalYearSuffix = currentFiscalYear.slice(2, 4) + currentFiscalYear.slice(7, 9);
        const entriesForYear = dartaEntries.filter(d => d.fiscalYear === currentFiscalYear);
        
        const sortedDartaEntries = [...entriesForYear].sort((a, b) => {
            const numA = parseInt(a.registrationNumber.split('-')[0]);
            const numB = parseInt(b.registrationNumber.split('-')[0]);
            return numB - numA;
        });

        const nextSerialNumber = sortedDartaEntries.length > 0 ? parseInt(sortedDartaEntries[0].registrationNumber.split('-')[0]) + 1 : 1;
        const nextRegistrationNumber = `${nextSerialNumber}-${fiscalYearSuffix}`;

        const filteredDartaEntries = sortedDartaEntries.filter(d => 
            d.registrationNumber.toLowerCase().includes(dartaSearchQuery.toLowerCase()) ||
            d.subject.toLowerCase().includes(dartaSearchQuery.toLowerCase()) ||
            d.sender.toLowerCase().includes(dartaSearchQuery.toLowerCase()) ||
            d.recipient.toLowerCase().includes(dartaSearchQuery.toLowerCase())
        );

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">दर्ता सूची (आ.व. {currentFiscalYear})</h2>
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
                    <button onClick={() => setIsDartaFormOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700">
                        <FilePlus size={18} /> नयाँ दर्ता
                    </button>
                </div>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left responsive-table">
                  <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
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
                            <td colSpan={5} className="p-8 text-center text-slate-500 italic">कुनै दर्ता भेटिएन।</td>
                        </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {isDartaFormOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl relative animate-in zoom-in-95 slide-in-from-bottom-4">
                        <h3 className="text-2xl font-bold text-slate-800 mb-6">नयाँ चिठीपत्र दर्ता</h3>
                        <DartaForm 
                            currentUser={currentUser!}
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
                                alert('दर्ता सफलतापूर्वक सुरक्षित गरियो!');
                            }}
                            onCancel={() => setIsDartaFormOpen(false)}
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
      case 'report_dhis_general': return <DHISReport currentFiscalYear={currentFiscalYear} />;
      case 'database_management': return <DatabaseManagement currentUser={currentUser} users={users} inventoryItems={inventoryItems} magForms={magForms} purchaseOrders={purchaseOrders} issueReports={issueReports} rabiesPatients={rabiesPatients} tbPatients={tbPatients} firms={firms} stores={stores} dakhilaReports={dakhilaReports} returnEntries={returnEntries} marmatEntries={marmatEntries} dhuliyaunaEntries={dhuliyaunaEntries} logBookEntries={logBookEntries} itemList={itemList} onClearData={onClearData} onUploadData={onUploadData} />;
      case 'general_setting': return <GeneralSetting currentUser={currentUser} settings={generalSettings} onUpdateSettings={onUpdateGeneralSettings} />;
      case 'service_settings': return <ServiceSettings 
        serviceItems={serviceItems}
        onSaveServiceItem={onSaveServiceItem}
        onDeleteServiceItem={onDeleteServiceItem}
        currentFiscalYear={currentFiscalYear}
      />;
      case 'store_setup': return <StoreSetup stores={stores} onAddStore={onAddStore} onUpdateStore={onUpdateStore} onDeleteStore={onDeleteStore} />;
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
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between z-20 shrink-0 no-print">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg">
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200">
              <Calendar size={14} className="text-slate-400" />
              <span className="text-[11px] font-bold text-slate-600 font-nepali">आ.व. {currentFiscalYear}</span>
            </div>

            {currentUser?.role === 'HEALTH_SECTION' && managedOrgs.length > 1 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full border border-indigo-200">
                <Building2 size={14} className="text-indigo-400" />
                <select 
                  value={activeOrgName}
                  onChange={(e) => onSetActiveOrgName(e.target.value)}
                  className="bg-transparent text-[11px] font-bold text-indigo-700 focus:outline-none cursor-pointer font-nepali"
                >
                  {['All', ...managedOrgs].map(org => (
                    <option key={org} value={org}>{org === 'All' ? 'सबै (All)' : org}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
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
