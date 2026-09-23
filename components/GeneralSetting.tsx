import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Save, Building2, Globe, Phone, Mail, FileText, Percent, Calendar, RotateCcw, Image, CheckCircle2, Lock, ListChecks, Plus, Trash2, GripVertical, Sliders, UserCog, MapPinned, MessageSquare, Key, Server, Send, Eye, EyeOff, Coins, RefreshCw, AlertCircle, Wallet, ClipboardList, Edit2, X, QrCode, ExternalLink, Printer, Thermometer, ShieldAlert, Sparkles, Megaphone, Search, Truck, Syringe, BedDouble, Monitor, UserCheck, ShieldCheck, ChevronLeft, ChevronRight, Users, Clock, Check, AlertTriangle, ArrowRight, Unlock, CalendarDays, Zap, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown, ArrowUpDown } from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Input } from './Input';
import { Select } from './Select';
import { FISCAL_YEARS, AVAILABLE_SERVICES } from '../constants';
import { OrganizationSettings, User as UserType, MenuConfigItem } from '../types/coreTypes'; // Changed import
import { MenuManagement } from './MenuManagement';
import { SearchableSelect } from './SearchableSelect';
import { DHIS2_DATA_ELEMENTS, DHIS2_COMBOS, DHIS2_SOURCE_KEYS, DHIS2_DATASETS } from '../constants/dhis2Metadata';
import { db as localDb } from '../firestore';
import { db as rtdb } from '../firebase';
import { ref, set } from 'firebase/database';
import { sortUsersByHierarchy, getDefaultHierarchyOrder, getRoleRankWeight, getDesignationLevelWeight } from '../lib/userHierarchyUtils';

const sujhabFirebaseConfig = {
  apiKey: "AIzaSyAtt4_yw8_76inlXJPgMNRV0h0vqPpvgt8",
  authDomain: "asymmetric-flow-scf5x.firebaseapp.com",
  projectId: "asymmetric-flow-scf5x",
  storageBucket: "asymmetric-flow-scf5x.firebasestorage.app",
  messagingSenderId: "1047209545761",
  appId: "1:1047209545761:web:d81af21e1f0d477cf31360"
};

const SUJHAB_APP_NAME = "sujhabPetikaSource";
const sujhabApp = getApps().find(a => a.name === SUJHAB_APP_NAME) || initializeApp(sujhabFirebaseConfig, SUJHAB_APP_NAME);
const sujhabDb = getFirestore(sujhabApp, "ai-studio-digitalsujabpeti-f3ba13ee-e50b-48cc-bf1e-2244437f6abf");

interface CitizenService {
    id: string;
    serviceNep: string;
    serviceEng?: string;
    departmentNep: string;
    docsNep: string;
    timeNep: string;
    feeNep: string;
    officerNep: string;
    roomNo: string;
    category: 'opd' | 'maternity' | 'immunization' | 'pharmacy' | 'lab' | 'emergency' | 'admin';
    office: string;
}

interface GeneralSettingProps {
    currentUser: UserType;
    settings: OrganizationSettings;
    onUpdateSettings: (settings: OrganizationSettings) => void;
    onUpdateGlobalDhis2Mappings?: (mappings: any) => void;
    users: UserType[];
    activeOrgName: string;
    onUpdateUser?: (user: UserType) => Promise<void> | void;
}

export const GeneralSetting: React.FC<GeneralSettingProps> = ({ currentUser, settings, onUpdateSettings, onUpdateGlobalDhis2Mappings, users, activeOrgName, onUpdateUser }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [newService, setNewService] = useState('');
  const [showSmsApiKey, setShowSmsApiKey] = useState(false);
  const [showEmailApiKey, setShowEmailApiKey] = useState(false);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
  const [smsBalanceInfo, setSmsBalanceInfo] = useState<{
    totalBalance?: number;
    routes?: Array<{ routeId?: string | number; routeName?: string; balance: number }>;
    error?: string;
    lastChecked?: string;
  } | null>(null);

  const fetchSmsBalance = async () => {
    setIsFetchingBalance(true);
    try {
      const keyToUse = localSettings.smsApiKey || '56A71A88EC9CA9';
      const res = await fetch('/api/sms/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyToUse })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSmsBalanceInfo({
          totalBalance: data.totalBalance,
          routes: data.routes,
          lastChecked: new Date().toLocaleTimeString('ne-NP')
        });
      } else {
        setSmsBalanceInfo({
          error: data.error || 'ब्यालेन्स चेक गर्न सकिएन।',
          lastChecked: new Date().toLocaleTimeString('ne-NP')
        });
      }
    } catch (err: any) {
      setSmsBalanceInfo({
        error: err.message || 'नेटवर्क त्रुटि भयो।',
        lastChecked: new Date().toLocaleTimeString('ne-NP')
      });
    } finally {
      setIsFetchingBalance(false);
    }
  };

  useEffect(() => {
    if (currentUser.role === 'SUPER_ADMIN') {
      fetchSmsBalance();
    }
  }, [currentUser.role]);

  const [activeTab, setActiveTab] = useState<'general' | 'menu' | 'nagarik_badapatra'>(
    (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') ? 'general' : 'menu'
  );
  const [generalSubTab, setGeneralSubTab] = useState<string>('basic');
  const [settingsSearchQuery, setSettingsSearchQuery] = useState<string>('');
  const categoriesScrollRef = useRef<HTMLDivElement>(null);

  // Allow horizontal scroll on mouse wheel over categories navigation
  useEffect(() => {
    const el = categoriesScrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // If user is already scrolling horizontally (Shift key or trackpad horizontal delta), let native handle it
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        return;
      }
      // If user rotates vertical mouse wheel, scroll horizontally
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [activeTab]);

  const [citizenServices, setCitizenServices] = useState<CitizenService[]>([]);
  const [hiddenSharedServiceIds, setHiddenSharedServiceIds] = useState<string[]>([]);
  const [isServicesLoading, setIsServicesLoading] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [editingService, setEditingService] = useState<CitizenService | null>(null);
  const [mappedOfficeNames, setMappedOfficeNames] = useState<string[]>([]);
  const [serviceForm, setServiceForm] = useState<Partial<CitizenService>>({
      category: 'admin',
      office: ''
  });

  // Super Admin Institutional Subscription Management State
  const organizationList = useMemo(() => {
    const set = new Set<string>();
    if (currentUser?.organizationName) set.add(currentUser.organizationName.trim());
    if (activeOrgName && activeOrgName !== 'All') set.add(activeOrgName.trim());
    users.forEach(u => {
      if (u.organizationName && u.organizationName.trim()) {
        set.add(u.organizationName.trim());
      }
    });
    return Array.from(set).filter(Boolean).sort();
  }, [users, currentUser, activeOrgName]);

  const [selectedSubOrg, setSelectedSubOrg] = useState<string>(() => {
    return (activeOrgName && activeOrgName !== 'All') ? activeOrgName : (currentUser?.organizationName || '');
  });

  const selectedOrgUsers = useMemo(() => {
    if (!selectedSubOrg) return [];
    return users.filter(u => u.organizationName === selectedSubOrg);
  }, [users, selectedSubOrg]);

  const [subIsActive, setSubIsActive] = useState<boolean>(() => {
    const isCurrentActive = selectedSubOrg === (activeOrgName && activeOrgName !== 'All' ? activeOrgName : currentUser?.organizationName);
    if (isCurrentActive) return !!settings.isSubscribed;
    const orgAdmin = users.find(u => u.organizationName === selectedSubOrg && u.role === 'ADMIN') || users.find(u => u.organizationName === selectedSubOrg);
    return orgAdmin?.isSubscribed ?? false;
  });

  const [subExpiryDate, setSubExpiryDate] = useState<string>(() => {
    const isCurrentActive = selectedSubOrg === (activeOrgName && activeOrgName !== 'All' ? activeOrgName : currentUser?.organizationName);
    if (isCurrentActive) return settings.subscriptionExpiryDate || '';
    const orgAdmin = users.find(u => u.organizationName === selectedSubOrg && u.role === 'ADMIN') || users.find(u => u.organizationName === selectedSubOrg);
    return orgAdmin?.subscriptionExpiryDate || '';
  });

  const [subApplying, setSubApplying] = useState(false);
  const [subSuccessMsg, setSubSuccessMsg] = useState<string | null>(null);
  const [showOrgUsersList, setShowOrgUsersList] = useState(true);

  // Sync state whenever selectedSubOrg or localSettings changes
  useEffect(() => {
    const isCurrentActive = selectedSubOrg === (activeOrgName && activeOrgName !== 'All' ? activeOrgName : currentUser?.organizationName);
    if (isCurrentActive) {
      setSubIsActive(!!localSettings.isSubscribed);
      setSubExpiryDate(localSettings.subscriptionExpiryDate || '');
    } else {
      const orgAdmin = selectedOrgUsers.find(u => u.role === 'ADMIN') || selectedOrgUsers[0];
      setSubIsActive(orgAdmin?.isSubscribed ?? false);
      setSubExpiryDate(orgAdmin?.subscriptionExpiryDate || '');
    }
    setSubSuccessMsg(null);
  }, [selectedSubOrg, selectedOrgUsers, activeOrgName, currentUser?.organizationName, localSettings.isSubscribed, localSettings.subscriptionExpiryDate]);

  const handleQuickSetDuration = (days: number) => {
    const base = subExpiryDate && !isNaN(new Date(subExpiryDate).getTime()) && new Date(subExpiryDate) > new Date()
      ? new Date(subExpiryDate)
      : new Date();
    base.setDate(base.getDate() + days);
    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, '0');
    const dd = String(base.getDate()).padStart(2, '0');
    setSubExpiryDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleSetLifetime = () => {
    setSubExpiryDate('2099-12-31');
  };

  const getDaysRemaining = (expiryDateStr?: string) => {
    if (!expiryDateStr) return null;
    const expiry = new Date(expiryDateStr);
    if (isNaN(expiry.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleApplyInstitutionalSubscription = async () => {
    if (currentUser?.role !== 'SUPER_ADMIN') {
      alert("यो कार्य केवल सुपर एडमिन (Super Admin) ले मात्र गर्न सक्नुहुन्छ।");
      return;
    }
    if (!selectedSubOrg) {
      alert("कृपया पहिले संस्था छान्नुहोस्।");
      return;
    }

    setSubApplying(true);
    try {
      const isCurrentActive = selectedSubOrg === (activeOrgName && activeOrgName !== 'All' ? activeOrgName : currentUser?.organizationName);
      
      // 1. If modifying current active org, update localSettings and onUpdateSettings
      if (isCurrentActive) {
        const updated = {
          ...localSettings,
          isSubscribed: subIsActive,
          subscriptionExpiryDate: subExpiryDate
        };
        setLocalSettings(updated);
        onUpdateSettings(updated);
      }

      // 2. Update RTDB config for this organization
      try {
        const safeOrgKey = encodeURIComponent(selectedSubOrg).replace(/\./g, '%2E');
        await set(ref(rtdb, `organizationSettings/config/${safeOrgKey}/isSubscribed`), subIsActive);
        await set(ref(rtdb, `organizationSettings/config/${safeOrgKey}/subscriptionExpiryDate`), subExpiryDate || '');
      } catch (e) {
        console.warn("RTDB org config update:", e);
      }

      // 3. Update all users in this organization
      let updatedCount = 0;
      if (onUpdateUser && selectedOrgUsers.length > 0) {
        for (const u of selectedOrgUsers) {
          try {
            await onUpdateUser({
              ...u,
              isSubscribed: subIsActive,
              subscriptionExpiryDate: subExpiryDate || '',
              isFrozen: subIsActive ? false : u.isFrozen
            });
            updatedCount++;
          } catch (err) {
            console.error(`Failed to update user ${u.username}:`, err);
          }
        }
      }

      setSubSuccessMsg(`संस्था '${selectedSubOrg}' का ${updatedCount > 0 ? updatedCount : selectedOrgUsers.length} जना प्रयोगकर्ताहरूको लागि एप ${subIsActive ? 'सक्रिय' : 'निष्कृय'} गरियो र समाप्ति मिति ${subExpiryDate || 'नतोकिएको'} सम्म सफलतापूर्वक लागु गरियो।`);
      setTimeout(() => {
        setSubSuccessMsg(null);
      }, 6000);
    } catch (err) {
      console.error("Institutional subscription error:", err);
      alert("त्रुटि: सदस्यता अपडेट गर्न सकिएन।");
    } finally {
      setSubApplying(false);
    }
  };

  // ===== User Hierarchy Management State & Handlers =====
  const [hierarchyOrg, setHierarchyOrg] = useState<string>(() => {
    return (activeOrgName && activeOrgName !== 'All') ? activeOrgName : (currentUser?.organizationName || '');
  });
  const [hierarchySearch, setHierarchySearch] = useState<string>('');
  const [hierarchyOrderList, setHierarchyOrderList] = useState<string[]>(() => {
    return localSettings.userHierarchyOrder || [];
  });
  const [hierarchySuccessMsg, setHierarchySuccessMsg] = useState<string | null>(null);

  // Sync hierarchy order when settings prop changes
  useEffect(() => {
    if (localSettings.userHierarchyOrder && Array.isArray(localSettings.userHierarchyOrder)) {
      setHierarchyOrderList(localSettings.userHierarchyOrder);
    }
  }, [localSettings.userHierarchyOrder]);

  // Target office users sorted by current hierarchyOrderList
  const targetOfficeUsers = useMemo(() => {
    const org = hierarchyOrg || currentUser?.organizationName || '';
    const filtered = users.filter(u => !org || org === 'All' || u.organizationName === org);
    return sortUsersByHierarchy(filtered, hierarchyOrderList);
  }, [users, hierarchyOrg, currentUser?.organizationName, hierarchyOrderList]);

  // Handler: Move User Up
  const handleMoveUserUp = (userId: string) => {
    const currentList = targetOfficeUsers.map(u => u.id);
    const idx = currentList.indexOf(userId);
    if (idx <= 0) return;
    const updated = [...currentList];
    const temp = updated[idx - 1];
    updated[idx - 1] = updated[idx];
    updated[idx] = temp;
    setHierarchyOrderList(updated);
    handleChange('userHierarchyOrder', updated);
  };

  // Handler: Move User Down
  const handleMoveUserDown = (userId: string) => {
    const currentList = targetOfficeUsers.map(u => u.id);
    const idx = currentList.indexOf(userId);
    if (idx === -1 || idx >= currentList.length - 1) return;
    const updated = [...currentList];
    const temp = updated[idx + 1];
    updated[idx + 1] = updated[idx];
    updated[idx] = temp;
    setHierarchyOrderList(updated);
    handleChange('userHierarchyOrder', updated);
  };

  // Handler: Move User to Top
  const handleMoveUserToTop = (userId: string) => {
    const currentList = targetOfficeUsers.map(u => u.id);
    const idx = currentList.indexOf(userId);
    if (idx <= 0) return;
    const filtered = currentList.filter(id => id !== userId);
    const updated = [userId, ...filtered];
    setHierarchyOrderList(updated);
    handleChange('userHierarchyOrder', updated);
  };

  // Handler: Move User to Bottom
  const handleMoveUserToBottom = (userId: string) => {
    const currentList = targetOfficeUsers.map(u => u.id);
    const idx = currentList.indexOf(userId);
    if (idx === -1 || idx >= currentList.length - 1) return;
    const filtered = currentList.filter(id => id !== userId);
    const updated = [...filtered, userId];
    setHierarchyOrderList(updated);
    handleChange('userHierarchyOrder', updated);
  };

  // Handler: Set direct rank (1-based)
  const handleSetUserRank = (userId: string, newRank1Based: number) => {
    const currentList = targetOfficeUsers.map(u => u.id);
    const idx = currentList.indexOf(userId);
    if (idx === -1) return;
    const targetIdx = Math.max(0, Math.min(currentList.length - 1, newRank1Based - 1));
    if (idx === targetIdx) return;
    const updated = [...currentList];
    const [removed] = updated.splice(idx, 1);
    updated.splice(targetIdx, 0, removed);
    setHierarchyOrderList(updated);
    handleChange('userHierarchyOrder', updated);
  };

  // Handler: Auto Sort by Role Rank & Designation Level
  const handleAutoSortHierarchy = () => {
    const org = hierarchyOrg || currentUser?.organizationName || '';
    const rawUsers = users.filter(u => !org || org === 'All' || u.organizationName === org);
    const autoOrder = getDefaultHierarchyOrder(rawUsers);
    setHierarchyOrderList(autoOrder);
    handleChange('userHierarchyOrder', autoOrder);
    setHierarchySuccessMsg("कर्मचारीहरूलाई पद तथा तह अनुसार स्वतः पदानुक्रम मिलाइयो!");
    setTimeout(() => setHierarchySuccessMsg(null), 3500);
  };

  // Handler: Sort Alphabetically
  const handleSortAlphabetical = () => {
    const org = hierarchyOrg || currentUser?.organizationName || '';
    const rawUsers = users.filter(u => !org || org === 'All' || u.organizationName === org);
    const sorted = [...rawUsers].sort((a, b) => (a.fullName || a.username || '').localeCompare(b.fullName || b.username || '', 'ne'));
    const order = sorted.map(u => u.id);
    setHierarchyOrderList(order);
    handleChange('userHierarchyOrder', order);
    setHierarchySuccessMsg("कर्मचारीहरूलाई वर्णानुक्रम (A-Z) अनुसार मिलाइयो!");
    setTimeout(() => setHierarchySuccessMsg(null), 3500);
  };

  // Handler: Reset Hierarchy Order
  const handleResetHierarchy = () => {
    if (window.confirm("के तपाईं पदानुक्रम रिसेट गर्न चाहनुहुन्छ?")) {
      const org = hierarchyOrg || currentUser?.organizationName || '';
      const rawUsers = users.filter(u => !org || org === 'All' || u.organizationName === org);
      const defaultOrder = rawUsers.map(u => u.id);
      setHierarchyOrderList(defaultOrder);
      handleChange('userHierarchyOrder', defaultOrder);
      setHierarchySuccessMsg("पदानुक्रम साविक क्रममा रिसेट गरियो!");
      setTimeout(() => setHierarchySuccessMsg(null), 3500);
    }
  };

  // Handler: Direct Save Hierarchy
  const handleSaveHierarchyOrder = async () => {
    try {
      const updated = {
        ...localSettings,
        userHierarchyOrder: hierarchyOrderList
      };
      setLocalSettings(updated);
      onUpdateSettings(updated);
      setHierarchySuccessMsg("कर्मचारी पदानुक्रम (Hierarchy Order) सफलतापूर्वक सुरक्षित गरियो!");
      setTimeout(() => setHierarchySuccessMsg(null), 4000);
    } catch (err: any) {
      alert("त्रुटि: " + (err.message || 'Error saving hierarchy'));
    }
  };

  useEffect(() => {
    if (activeTab === 'nagarik_badapatra') {
      setIsServicesLoading(true);
      const orgKey = (activeOrgName || currentUser?.organizationName || '').trim();
      
      // Office Mapping from localDb
      const mappingRef = doc(localDb, 'sujhabPetikaOfficeMap', orgKey);
      const unsubOfficeMap = onSnapshot(mappingRef, (d) => {
        const names = d.exists() ? (d.data().officeNames || []) : [];
        const uniqueNames = Array.from(new Set(names.map((n: string) => (n || '').trim()).filter(Boolean)));
        setMappedOfficeNames(uniqueNames.length > 0 ? uniqueNames : [orgKey]);
      });

      const settingsDocRef = doc(sujhabDb, 'officeSettings', orgKey);
      const unsubMapping = onSnapshot(settingsDocRef, (d) => {
          if (d.exists()) {
              setHiddenSharedServiceIds(d.data().hiddenSharedServiceIds || []);
          } else {
              setHiddenSharedServiceIds([]);
          }
      });

      const unsubServices = onSnapshot(collection(sujhabDb, 'citizenServices'), (snapshot) => {
        const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CitizenService));
        setCitizenServices(services);
        setIsServicesLoading(false);
      }, (err) => {
        console.error("Error fetching services:", err);
        setIsServicesLoading(false);
      });

      return () => {
          unsubOfficeMap();
          unsubMapping();
          unsubServices();
      };
    }
  }, [activeTab, currentUser.organizationName, activeOrgName]);

  const displayedServices = useMemo(() => {
      const orgKey = (activeOrgName || currentUser?.organizationName || '').trim();
      return citizenServices.filter(s => {
          const isOwn = mappedOfficeNames.includes((s.office || '').trim());
          const isShared = s.office === 'all' || !s.office;
          const isHidden = hiddenSharedServiceIds.includes(s.id);
          return isOwn || (isShared && !isHidden);
      }).sort((a, b) => a.serviceNep.localeCompare(b.serviceNep, 'ne'));
  }, [citizenServices, hiddenSharedServiceIds, currentUser.organizationName, activeOrgName, mappedOfficeNames]);

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.serviceNep) return;
    
    const orgKey = (activeOrgName || currentUser?.organizationName || '').trim();
    const targetOffice = serviceForm.office || mappedOfficeNames[0] || orgKey;
    
    const isEditingShared = editingService && (editingService.office === 'all' || !editingService.office);
    
    // If editing shared, we create a NEW doc and hide the old one for this org
    const id = isEditingShared ? `svc_${Date.now()}` : (editingService?.id || `svc_${Date.now()}`);
    
    const data = {
        ...serviceForm,
        id,
        office: targetOffice
    };
    
    try {
        await setDoc(doc(sujhabDb, 'citizenServices', id), data);
        
        if (isEditingShared && editingService) {
            const settingsDocRef = doc(sujhabDb, 'officeSettings', orgKey);
            const newHidden = Array.from(new Set([...hiddenSharedServiceIds, editingService.id]));
            await setDoc(settingsDocRef, { hiddenSharedServiceIds: newHidden }, { merge: true });
        }

        setShowServiceModal(false);
        setEditingService(null);
        setServiceForm({ category: 'admin', office: '' });
    } catch (err) {
        console.error("Error saving service:", err);
        alert("त्रुटि: डेटा सेभ गर्न सकिएन।");
    }
  };

  const handleDeleteService = async (service: CitizenService) => {
    const isShared = service.office === 'all' || !service.office;
    const msg = isShared 
        ? "के तपाईं यो साझा सेवालाई आफ्नो सूचीबाट हटाउन चाहनुहुन्छ? (यसले अरू संस्थालाई असर गर्ने छैन)" 
        : "के तपाईं यो सेवा हटाउन चाहनुहुन्छ?";

    if (!window.confirm(msg)) return;
    
    try {
        const orgKey = (activeOrgName || currentUser?.organizationName || '').trim();
        if (isShared) {
            const settingsDocRef = doc(sujhabDb, 'officeSettings', orgKey);
            const newHidden = Array.from(new Set([...hiddenSharedServiceIds, service.id]));
            await setDoc(settingsDocRef, { hiddenSharedServiceIds: newHidden }, { merge: true });
        } else {
            await deleteDoc(doc(sujhabDb, 'citizenServices', service.id));
        }
    } catch (err) {
        console.error("Error deleting service:", err);
        alert("त्रुटि: डेटा मेटाउन सकिएन।");
    }
  };

  // Security Guard: Admin, Super Admin, or users explicitly granted Menu Management Access
  const isAuthorized = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN' || !!currentUser.canManageMenu;

  useEffect(() => {
      setLocalSettings(settings);
  }, [settings]);

  if (!isAuthorized) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 animate-in fade-in zoom-in-95">
            <div className="bg-red-50 p-6 rounded-full mb-4"><Lock size={48} className="text-red-400" /></div>
            <h3 className="text-xl font-bold text-slate-700 font-nepali mb-2">पहुँच अस्वीकृत (Access Denied)</h3>
            <p className="text-sm text-slate-500 max-w-md text-center">प्रणाली सेटिङ व्यवस्थापन गर्न तपाईंलाई अनुमति छैन।</p>
        </div>
    );
  }

  const handleChange = (field: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleAddService = () => {
    if (!newService.trim()) return;
    
    const currentOptions = localSettings.allServiceOptions || AVAILABLE_SERVICES;
    if (currentOptions.includes(newService.trim())) {
        alert('यो सेवा पहिले नै सूचीमा छ।');
        return;
    }

    const updatedOptions = [...currentOptions, newService.trim()];
    handleChange('allServiceOptions', updatedOptions);
    setNewService('');
  };

  const handleRemoveService = (serviceToRemove: string) => {
    if (!window.confirm(`के तपाईं "${serviceToRemove}" लाई उपलब्ध सेवाहरूको सूचीबाट हटाउन चाहनुहुन्छ?`)) return;

    const currentOptions = localSettings.allServiceOptions || AVAILABLE_SERVICES;
    const updatedOptions = currentOptions.filter(s => s !== serviceToRemove);
    
    const currentSelected = localSettings.availableServices || [];
    const updatedSelected = currentSelected.filter(s => s !== serviceToRemove);

    setLocalSettings(prev => ({
        ...prev,
        allServiceOptions: updatedOptions,
        availableServices: updatedSelected
    }));
    setIsSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(localSettings);
    
    // Save Download Center Link Globally to ensure all users across any org get it
    try {
        if (localSettings.downloadCenterUrl !== undefined) {
            const urlToSave = (localSettings.downloadCenterUrl || '').trim();
            await set(ref(rtdb, 'globalData/downloadCenterUrl'), urlToSave);
            await set(ref(rtdb, 'organizationSettings/config/downloadCenterUrl'), urlToSave);
            await set(ref(rtdb, 'downloadCenterUrl'), urlToSave);
        }
    } catch (err) {
        console.error("Global Download Center Link Save Failed:", err);
    }

    // Save Login Ribbon / Kudos Notice Globally for Universal Access
    try {
        const ribbonData = {
            enable: !!localSettings.enableLoginRibbonMessage,
            message: (localSettings.loginRibbonMessage || '').trim()
        };
        await set(ref(rtdb, 'globalData/loginRibbon'), ribbonData);
        await set(ref(rtdb, 'organizationSettings/config/loginRibbon'), ribbonData);
    } catch (err) {
        console.error("Global Login Ribbon Save Failed:", err);
    }

    // If superadmin, also update global DHIS2 mappings
    if (currentUser.role === 'SUPER_ADMIN') {
        if (onUpdateGlobalDhis2Mappings) {
            onUpdateGlobalDhis2Mappings({
                dhis2DatasetMappings: localSettings.dhis2DatasetMappings,
                dhis2CellMappings: localSettings.dhis2CellMappings
            });
        }
        
        // Save Email Settings Globally to organizationSettings/config
        try {
            await set(ref(rtdb, 'organizationSettings/config'), {
                emailApiKey: localSettings.emailApiKey || '',
                emailSenderAddress: localSettings.emailSenderAddress || '',
                emailSenderName: localSettings.emailSenderName || '',
                emailApiProvider: localSettings.emailApiProvider || 'Resend'
            });
        } catch (err) {
            console.error("Global Email Config Save Failed:", err);
        }
    }
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleReset = () => {
    if(window.confirm('के तपाइँ सेटिङहरू रिसेट गर्न चाहनुहुन्छ?')) {
        setLocalSettings(settings);
        setIsSaved(false);
    }
  };

  const handleSaveMenuConfig = (config: MenuConfigItem[]) => {
    const updatedSettings = { ...localSettings, menuConfig: config };
    setLocalSettings(updatedSettings);
    onUpdateSettings(updatedSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const serviceOptions = localSettings.allServiceOptions || AVAILABLE_SERVICES;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 p-2 rounded-lg text-white"><Building2 size={24} /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">सेटिङ (Settings)</h2>
            <p className="text-sm text-slate-500">संस्था र प्रणाली कन्फिगरेसन व्यवस्थापन गर्नुहोस्</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') && (
              <button 
                onClick={() => setActiveTab('general')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'general' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Sliders size={14} /> सामान्य (General)
              </button>
            )}
            {(currentUser.role === 'SUPER_ADMIN' || !!currentUser.canManageMenu) && (
              <button 
                onClick={() => setActiveTab('menu')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'menu' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <GripVertical size={14} /> मेनु (Menu)
              </button>
            )}
            {currentUser.allowedMenus?.includes('sujhab_petika') && (
              <button 
                onClick={() => setActiveTab('nagarik_badapatra')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'nagarik_badapatra' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <ClipboardList size={14} /> नागरिक बडापत्र (Citizen Charter)
              </button>
            )}
        </div>
      </div>

      {activeTab === 'general' && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Subcategory Navigation Header & Search Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base font-nepali">
                    सामान्य सेटिङ श्रेणीकरण (Settings Categories)
                  </h3>
                  <p className="text-xs text-slate-400 font-nepali">
                    विषयगत सेटिङहरू सहज रूपमा खोज्न वा व्यवस्थापन गर्न तलको श्रेणी छान्नुहोस्
                  </p>
                </div>
              </div>

              {/* Search Box */}
              <div className="relative min-w-[260px] sm:min-w-[320px]">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="सेटिङहरू खोज्नुहोस् (उदा. खोप, VAT, SMS, छुट, एम्बुलेन्स)..."
                  value={settingsSearchQuery}
                  onChange={(e) => setSettingsSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-nepali"
                />
                {settingsSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setSettingsSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* 12 Subcategory Navigation Tabs with horizontal mouse wheel & scroll buttons */}
            <div className="relative flex items-center group">
              <button
                type="button"
                onClick={() => {
                  if (categoriesScrollRef.current) {
                    categoriesScrollRef.current.scrollBy({ left: -220, behavior: 'smooth' });
                  }
                }}
                className="hidden md:flex absolute left-0 z-10 -translate-x-2 w-7 h-7 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                title="अगाडि स्क्रोल गर्नुहोस्"
              >
                <ChevronLeft size={16} />
              </button>

              <div
                ref={categoriesScrollRef}
                className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-1 scrollbar-thin scroll-smooth w-full select-none"
              >
                {[
                  { id: 'basic', label: '१. आधारभूत विवरण', icon: Building2 },
                  { id: 'ambulance', label: '२. एम्बुलेन्स सेवा', icon: Truck },
                  { id: 'discounts', label: '३. छुट नियम', icon: Coins },
                  { id: 'vaccination', label: '४. खोप केन्द्र', icon: Syringe },
                  { id: 'coldchain', label: '५. कोल्ड चेन', icon: Thermometer },
                  { id: 'sms', label: '६. SMS गेटवे', icon: MessageSquare },
                  { id: 'email', label: '७. इमेल गेटवे', icon: Mail },
                  { id: 'integrations', label: '८. बाह्य प्रणाली', icon: Globe },
                  { id: 'ipd', label: '९. IPD वार्ड', icon: BedDouble },
                  { id: 'portal', label: '१०. पोर्टल/लगइन', icon: Monitor },
                  { id: 'users', label: '११. पदानुक्रम तथा प्रतिवेदन अधिकारी', icon: UserCheck },
                  { id: 'subscription', label: '१२. सदस्यता', icon: ShieldCheck },
                ].map((cat) => {
                  const IconComponent = cat.icon;
                  const isSelected = (!settingsSearchQuery && generalSubTab === cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setGeneralSubTab(cat.id);
                        setSettingsSearchQuery('');
                      }}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer font-nepali ${
                        isSelected
                          ? 'bg-slate-800 text-white shadow-sm ring-2 ring-slate-800/10'
                          : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      <IconComponent size={14} className={isSelected ? 'text-primary-400' : 'text-slate-500'} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (categoriesScrollRef.current) {
                    categoriesScrollRef.current.scrollBy({ left: 220, behavior: 'smooth' });
                  }
                }}
                className="hidden md:flex absolute right-0 z-10 translate-x-2 w-7 h-7 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                title="पछाडि स्क्रोल गर्नुहोस्"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Search Result Banner when search query is active */}
          {settingsSearchQuery.trim() && (
            <div className="bg-primary-50/70 border border-primary-200/80 p-3.5 rounded-2xl flex items-center justify-between text-xs font-nepali text-primary-900">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-primary-600 shrink-0" />
                <span>
                  <strong>"{settingsSearchQuery}"</strong> को लागि खोजी परिणामहरू देखाइँदैछ। (१२ वटै श्रेणीहरूबाट फिल्टर गरिएको)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSettingsSearchQuery('')}
                className="underline hover:text-primary-700 font-bold ml-3 shrink-0 cursor-pointer"
              >
                फिल्टर हटाउनुहोस्
              </button>
            </div>
          )}

          {/* 1. Basic Info */}
          {(!settingsSearchQuery.trim() ? generalSubTab === 'basic' : ["आधारभूत","संस्था","नाम","office","ठेगाना","phone","email","pan","vat","fiscal","logo","लोगो","सेवा","services","basic","vat rate","आर्थिक वर्ष"].some(t => t.toLowerCase().includes(settingsSearchQuery.toLowerCase().trim()) || settingsSearchQuery.toLowerCase().trim().includes(t.toLowerCase()))) && (
            <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><Building2 size={18} className="text-primary-600"/>संस्थाको विवरण</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="१. मुख्य नाम" value={localSettings.orgNameNepali} onChange={(e) => handleChange('orgNameNepali', e.target.value)} required />
                    <Input label="२. उप-शीर्षक १" value={localSettings.subTitleNepali} onChange={(e) => handleChange('subTitleNepali', e.target.value)} />
                    <Input label="३. उप-शीर्षक २" value={localSettings.subTitleNepali2 || ''} onChange={(e) => handleChange('subTitleNepali2', e.target.value)} />
                    <Input label="४. उप-शीर्षक ३" value={localSettings.subTitleNepali3 || ''} onChange={(e) => handleChange('subTitleNepali3', e.target.value)} />
                    <Input label="५. उप-शीर्षक ४" value={localSettings.subTitleNepali4 || ''} onChange={(e) => handleChange('subTitleNepali4', e.target.value)} />
                    <Input label="६. कार्यालय कोड नं." value={localSettings.officeCode || ''} onChange={(e) => handleChange('officeCode', e.target.value)} />
                </div>
                <hr className="my-4 border-slate-100" />
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="संस्थाको नाम (English)" value={localSettings.orgNameEnglish} onChange={(e) => handleChange('orgNameEnglish', e.target.value)} />
                    <Input label="ठेगाना" value={localSettings.address} onChange={(e) => handleChange('address', e.target.value)} required />
                </div>
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <Input label="फोन नं." value={localSettings.phone} onChange={(e) => handleChange('phone', e.target.value)} icon={<Phone size={16} />} />
                    <Input label="एम्बुलेन्स सेवा नं." value={localSettings.ambulancePhone || ''} onChange={(e) => handleChange('ambulancePhone', e.target.value)} icon={<Phone size={16} />} />
                    <Input label="ईमेल" value={localSettings.email} onChange={(e) => handleChange('email', e.target.value)} icon={<Mail size={16} />} />
                    <Input label="वेबसाइट" value={localSettings.website} onChange={(e) => handleChange('website', e.target.value)} icon={<Globe size={16} />} />
                </div>
                <div className="mt-4"><Input label="PAN/VAT No" value={localSettings.panNo} onChange={(e) => handleChange('panNo', e.target.value)} icon={<FileText size={16} />} /></div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Image size={18} className="text-primary-600"/>लोगो सेटिङ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-slate-50 cursor-pointer group" onClick={() => document.getElementById('logo-upload')?.click()}>
                        <input type="file" id="logo-upload" className="hidden" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    const base64String = reader.result as string;
                                    const updatedSettings = { ...localSettings, logoUrl: base64String };
                                    setLocalSettings(updatedSettings);
                                    onUpdateSettings(updatedSettings);
                                    alert('लोगो सफलतापूर्वक सेट भयो!');
                                };
                                reader.onerror = () => {
                                    alert('लोगो लोड गर्न समस्या भयो');
                                }
                                reader.readAsDataURL(file);
                            }
                        }} />
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-105 transition-transform overflow-hidden relative border shadow-sm">
                            <img 
                                key={localSettings.logoUrl}
                                src={localSettings.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png"} 
                                alt="Logo" 
                                className="w-full h-full object-cover" 
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] text-center p-1">
                                लोगो परिवर्तन गर्न क्लिक गर्नुहोस्
                            </div>
                        </div>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">नेपाल सरकारको लोगो</span>
                        <span className="text-xs font-medium text-primary-600">नयाँ लोगो अपलोड गर्नुहोस्</span>
                    </div>

                    <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-slate-50 cursor-pointer group" onClick={() => document.getElementById('province-logo-upload')?.click()}>
                        <input type="file" id="province-logo-upload" className="hidden" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    const base64String = reader.result as string;
                                    const updatedSettings = { ...localSettings, provinceLogoUrl: base64String };
                                    setLocalSettings(updatedSettings);
                                    onUpdateSettings(updatedSettings);
                                    alert('प्रदेश लोगो सफलतापूर्वक सेट भयो!');
                                };
                                reader.onerror = () => {
                                    alert('लोगो लोड गर्न समस्या भयो');
                                }
                                reader.readAsDataURL(file);
                            }
                        }} />
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-105 transition-transform overflow-hidden relative border shadow-sm">
                            <img 
                                key={localSettings.provinceLogoUrl}
                                src={localSettings.provinceLogoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png"} 
                                alt="Province Logo" 
                                className="w-full h-full object-cover" 
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] text-center p-1">
                                लोगो परिवर्तन गर्न क्लिक गर्नुहोस्
                            </div>
                        </div>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">प्रदेश लोगो</span>
                        <span className="text-xs font-medium text-primary-600">नयाँ लोगो अपलोड गर्नुहोस्</span>
                    </div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2">
                        <input 
                            type="text" 
                            placeholder="नयाँ सेवा थप्नुहोस्..." 
                            value={newService}
                            onChange={(e) => setNewService(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddService();
                                }
                            }}
                            className="text-xs px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <button 
                            type="button"
                            onClick={handleAddService}
                            className="bg-primary-600 text-white p-1.5 rounded-lg hover:bg-primary-700 transition-colors"
                            title="थप्नुहोस्"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    {serviceOptions.map(service => (
                        <div key={service} className="flex items-center justify-between group p-2 hover:bg-slate-50 rounded-lg transition-colors">
                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                                <input 
                                    type="checkbox" 
                                    checked={localSettings.availableServices?.includes(service) || false}
                                    onChange={(e) => {
                                        const services = localSettings.availableServices || [];
                                        const newServices = e.target.checked 
                                            ? [...services, service] 
                                            : services.filter(s => s !== service);
                                        handleChange('availableServices', newServices);
                                    }}
                                    className="w-4 h-4 text-primary-600 rounded"
                                />
                                <span className="text-sm text-slate-700">{service}</span>
                            </label>
                            <button 
                                type="button"
                                onClick={() => handleRemoveService(service)}
                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                title="हटाउनुहोस्"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            
            {/* सेवा बिलिङ तथा छुट सिफारिसकर्ता सेटिङ */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><Calendar size={18} className="text-primary-600"/>आर्थिक वर्ष तथा कर सेटिङ (Fiscal Year & VAT)</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <Select label="सक्रिय आर्थिक वर्ष" options={FISCAL_YEARS} value={localSettings.activeFiscalYear} onChange={(e) => handleChange('activeFiscalYear', e.target.value)} icon={<Calendar size={16} />} />
                    <Input label="डिफल्ट VAT दर (%)" type="number" value={localSettings.defaultVatRate} onChange={(e) => handleChange('defaultVatRate', e.target.value)} icon={<Percent size={16} />} />
                </div>
            </div>
            </div>
          )}

          {/* 2. Ambulance */}
          {(!settingsSearchQuery.trim() ? generalSubTab === 'ambulance' : ["एम्बुलेन्स","ambulance","fare","भाडा","incentive","प्रोत्साहन","tds","कर","रुट","चालक","driver","मार्ग"].some(t => t.toLowerCase().includes(settingsSearchQuery.toLowerCase().trim()) || settingsSearchQuery.toLowerCase().trim().includes(t.toLowerCase()))) && (
            <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2 border-b pb-2">
                    <Percent size={18} className="text-red-600"/> एम्बुलेन्स चालक प्रोत्साहन तथा कर सेटिङ (Ambulance Incentive & TDS)
                </h3>
                <p className="text-xs text-slate-500 font-nepali">
                    एम्बुलेन्स सेवाबाट संकलन भएको कुल रकममा चालक प्रोत्साहन प्रतिशत र प्रोत्साहन भत्तामा लाग्ने TDS प्रतिशत सेट गर्नुहोस्।
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                    <Input 
                        label="चालक प्रोत्साहन प्रतिशत (% Incentive)" 
                        type="number"
                        step="0.1"
                        value={localSettings.ambulanceDriverIncentivePercent !== undefined ? localSettings.ambulanceDriverIncentivePercent : 15} 
                        onChange={(e) => handleChange('ambulanceDriverIncentivePercent', parseFloat(e.target.value) || 15)} 
                        placeholder="15"
                    />
                    <Input 
                        label="प्रोत्साहन कर (TDS %) प्रतिशत" 
                        type="number"
                        step="0.1"
                        value={localSettings.ambulanceProtsahanTdsPercent !== undefined ? localSettings.ambulanceProtsahanTdsPercent : 15} 
                        onChange={(e) => handleChange('ambulanceProtsahanTdsPercent', parseFloat(e.target.value) || 15)} 
                        placeholder="15"
                    />
                </div>
            </div>

            {/* कोल्ड चेन (खोप फ्रिज) तापक्रम सेटिङ */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2 border-b pb-2">
                    <Trash2 size={18} className="text-rose-600"/> एम्बुलेन्स सेवा र भाडा दर सेटिङ
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <Input 
                        label="डिफल्ट एम्बुलेन्स नम्बर (Default Ambulance No.)" 
                        value={localSettings.ambulanceNo || ''} 
                        onChange={(e) => handleChange('ambulanceNo', e.target.value)} 
                        placeholder="उदा: बा १ झ ९४८८"
                    />
                    <Input 
                        label="डिफल्ट चालकको नाम (Default Driver Name)" 
                        value={localSettings.ambulanceDriverName || ''} 
                        onChange={(e) => handleChange('ambulanceDriverName', e.target.value)} 
                        placeholder="उदा: राम बहादुर"
                    />
                </div>

                <div className="border-t pt-4">
                    <label className="block text-xs font-bold text-slate-600 mb-2">एम्बुलेन्स छुट सिफारिसकर्ताहरू (Discount Recommenders Config)</label>
                    <p className="text-xs text-slate-400 mb-3">यहाँ छुट दिन मिल्ने सिफारिसकर्ताहरूको सूची थप्नुहोस् वा हटाउनुहोस्।</p>
                    <div className="flex gap-2 mb-3">
                        <input
                            type="text"
                            className="flex-1 p-2 text-xs border rounded-lg focus:ring-2 focus:ring-rose-500"
                            placeholder="नयाँ सिफारिसकर्ताको नाम"
                            id="newRoleInput"
                        />
                        <button
                            className="px-3 py-2 bg-rose-600 text-white text-xs rounded-lg hover:bg-rose-700"
                            onClick={() => {
                                const input = document.getElementById('newRoleInput') as HTMLInputElement;
                                if (input.value) {
                                    const newRoles = [...(localSettings.discountRoles || ['नगर प्रमुख', 'नगर उपप्रमुख', 'अध्यक्ष', 'स्वास्थ्य चौकी प्रमुख', 'एम्बुलेन्स चालक स्वयमको निर्णय', 'अन्य']), input.value];
                                    handleChange('discountRoles', newRoles);
                                    input.value = '';
                                }
                            }}
                        >थप्नुहोस्</button>
                    </div>
                    <div className="space-y-2">
                        {(localSettings.discountRoles || ['नगर प्रमुख', 'नगर उपप्रमुख', 'अध्यक्ष', 'स्वास्थ्य चौकी प्रमुख', 'एम्बुलेन्स चालक स्वयमको निर्णय', 'अन्य']).map((role, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <span className="text-xs font-medium text-slate-500 w-48">{role}:</span>
                                <input
                                    type="number"
                                    className="w-24 p-2 text-xs border rounded-lg focus:ring-2 focus:ring-rose-500"
                                    value={localSettings.discountLimits?.[role] || 0}
                                    onChange={(e) => {
                                        const newLimits = { ...(localSettings.discountLimits || {}) };
                                        newLimits[role] = Number(e.target.value);
                                        handleChange('discountLimits', newLimits);
                                    }}
                                    placeholder="Max %"
                                />
                                <span className="text-xs text-slate-400">%</span>
                                <button
                                    className="p-1 text-red-500 hover:text-red-700"
                                    onClick={() => {
                                        const newRoles = (localSettings.discountRoles || ['नगर प्रमुख', 'नगर उपप्रमुख', 'अध्यक्ष', 'स्वास्थ्य चौकी प्रमुख', 'एम्बुलेन्स चालक स्वयमको निर्णय', 'अन्य']).filter((_, i) => i !== idx);
                                        handleChange('discountRoles', newRoles);
                                    }}
                                >×</button>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="border-t pt-4">
                    <label className="block text-xs font-bold text-slate-600 mb-2">एम्बुलेन्स मार्ग र निर्धारित भाडा दर (Routes & Fare Rates Config)</label>
                    <p className="text-xs text-slate-400 mb-3">यहाँ नयाँ रुट तथा सो रुटको भाडा दर प्रविष्ट गर्नुहोस्। एम्बुलेन्स सेवा इन्ट्री गर्दा यी रुटहरू छान्न मिल्नेछ र भाडा दर स्वयम् भरिनेछ।</p>
                    <div className="space-y-3">
                        {(localSettings.ambulanceRoutes || []).map((route, index) => {
                            const [fromLoc, toLoc, rate, distance = ''] = route.includes('|') ? route.split('|') : ['', '', '0', ''];
                            return (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end border border-slate-200 p-3 rounded-xl bg-slate-50 relative shadow-sm hover:border-slate-300 transition-all">
                                    <Input 
                                        label="कहाँबाट (From)" 
                                        value={fromLoc} 
                                        onChange={(e) => {
                                            const newRoutes = [...(localSettings.ambulanceRoutes || [])];
                                            newRoutes[index] = `${e.target.value}|${toLoc}|${rate}|${distance}`;
                                            handleChange('ambulanceRoutes', newRoutes);
                                        }} 
                                        placeholder="प्रस्थान स्थान"
                                    />
                                    <Input 
                                        label="कहाँसम्म (To)" 
                                        value={toLoc} 
                                        onChange={(e) => {
                                            const newRoutes = [...(localSettings.ambulanceRoutes || [])];
                                            newRoutes[index] = `${fromLoc}|${e.target.value}|${rate}|${distance}`;
                                            handleChange('ambulanceRoutes', newRoutes);
                                        }} 
                                        placeholder="गन्तव्य स्थान"
                                    />
                                    <Input 
                                        label="दुरी कि.मी. (Distance KM)" 
                                        type="number"
                                        step="0.1"
                                        value={distance} 
                                        onChange={(e) => {
                                            const newRoutes = [...(localSettings.ambulanceRoutes || [])];
                                            newRoutes[index] = `${fromLoc}|${toLoc}|${rate}|${e.target.value}`;
                                            handleChange('ambulanceRoutes', newRoutes);
                                        }} 
                                        placeholder="उदा: 12.5"
                                    />
                                    <div className="flex gap-2 items-center">
                                        <div className="flex-1">
                                            <Input 
                                                label="भाडा दर रु. (Rate)" 
                                                type="number"
                                                value={rate} 
                                                onChange={(e) => {
                                                    const newRoutes = [...(localSettings.ambulanceRoutes || [])];
                                                    newRoutes[index] = `${fromLoc}|${toLoc}|${e.target.value}|${distance}`;
                                                    handleChange('ambulanceRoutes', newRoutes);
                                                }} 
                                                placeholder="भाडा रकम"
                                            />
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                const newRoutes = (localSettings.ambulanceRoutes || []).filter((_, i) => i !== index);
                                                handleChange('ambulanceRoutes', newRoutes);
                                            }} 
                                            className="text-rose-500 hover:text-rose-700 p-2.5 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors mt-5 shadow-sm border border-rose-100"
                                            title="हटाउनुहोस्"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        <button 
                            type="button" 
                            onClick={() => {
                                handleChange('ambulanceRoutes', [...(localSettings.ambulanceRoutes || []), '||0|']);
                            }} 
                            className="flex items-center gap-2 text-rose-600 hover:text-rose-700 text-sm font-bold bg-rose-50 hover:bg-rose-100 p-2.5 rounded-xl transition-all shadow-sm border border-rose-100 border-dashed"
                        >
                            <Plus size={16}/> नयाँ मार्ग / भाडा दर थप्नुहोस् (Add New Route)
                        </button>
                    </div>
                </div>
            </div>

            </div>
          )}

          {/* 3. Discounts */}
          {(!settingsSearchQuery.trim() ? generalSubTab === 'discounts' : ["छुट","discount","सिफारिस","billing discount","sewa discount","recommender","सीमा","बिलिङ"].some(t => t.toLowerCase().includes(settingsSearchQuery.toLowerCase().trim()) || settingsSearchQuery.toLowerCase().trim().includes(t.toLowerCase()))) && (
            <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2 border-b pb-2">
                    <Coins size={18} className="text-emerald-600"/> सेवा बिलिङ छुट तथा सिफारिसकर्ता सेटिङ (Sewa Billing Discount Config)
                </h3>
                
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">डिफल्ट सेवा बिलिङ अधिकतम छुट सीमा (Default Sewa Billing Max Discount %)</label>
                    <p className="text-xs text-slate-400 mb-2">सिफारिसकर्ता नछानिएको अवस्थामा वा सामान्य अवस्थामा दिन मिल्ने अधिकतम छुट प्रतिशत सेट गर्नुहोस्।</p>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            max={100}
                            min={0}
                            className="w-36 p-2 text-xs border rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold font-mono"
                            placeholder="उदा: 100"
                            value={localSettings.maxSewaDiscountPercent !== undefined ? localSettings.maxSewaDiscountPercent : ''}
                            onChange={(e) => handleChange('maxSewaDiscountPercent', e.target.value ? Number(e.target.value) : undefined)}
                        />
                        <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                </div>

                <div className="border-t pt-4">
                    <label className="block text-xs font-bold text-slate-600 mb-1">सेवा बिलिङ छुट सिफारिसकर्ताहरू र अधिकतम छुट सीमा (Sewa Discount Recommenders & Max Limits %)</label>
                    <p className="text-xs text-slate-400 mb-3">यहाँ सेवा बिलिङ (प्रत्यक्ष र नियमित) मा छुट सिफारिस गर्न पाउने पदाधिकारी/सिफारिसकर्ताहरू र उनीहरूको लागि अधिकतम छुट प्रतिशत (%) सीमा सेट गर्नुहोस्।</p>
                    <div className="flex gap-2 mb-3">
                        <input
                            type="text"
                            className="flex-1 p-2 text-xs border rounded-lg focus:ring-2 focus:ring-emerald-500"
                            placeholder="नयाँ सिफारिसकर्ताको पद/नाम (उदा: वडा अध्यक्ष, शाखा प्रमुख)"
                            id="newSewaRoleInput"
                        />
                        <button
                            type="button"
                            className="px-3 py-2 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 font-medium"
                            onClick={() => {
                                const input = document.getElementById('newSewaRoleInput') as HTMLInputElement;
                                if (input && input.value.trim()) {
                                    const defaultSewaRoles = ['नगर प्रमुख', 'नगर उपप्रमुख', 'वडा अध्यक्ष', 'स्वास्थ्य शाखा प्रमुख', 'स्वास्थ्य चौकी प्रमुख', 'कर्मचारी स्वयम', 'अन्य'];
                                    const currentRoles = localSettings.sewaDiscountRoles || defaultSewaRoles;
                                    if (!currentRoles.includes(input.value.trim())) {
                                        const newRoles = [...currentRoles, input.value.trim()];
                                        handleChange('sewaDiscountRoles', newRoles);
                                    }
                                    input.value = '';
                                }
                            }}
                        >+ थप्नुहोस्</button>
                    </div>
                    <div className="space-y-2">
                        {(localSettings.sewaDiscountRoles || ['नगर प्रमुख', 'नगर उपप्रमुख', 'वडा अध्यक्ष', 'स्वास्थ्य शाखा प्रमुख', 'स्वास्थ्य चौकी प्रमुख', 'कर्मचारी स्वयम', 'अन्य']).map((role, idx) => (
                            <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-150">
                                <span className="text-xs font-semibold text-slate-700 w-52 truncate">{role}:</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    className="w-24 p-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold font-mono bg-white text-right"
                                    value={localSettings.sewaDiscountLimits?.[role] !== undefined ? localSettings.sewaDiscountLimits[role] : (localSettings.discountLimits?.[role] || 0)}
                                    onChange={(e) => {
                                        const newLimits = { ...(localSettings.sewaDiscountLimits || {}) };
                                        newLimits[role] = Number(e.target.value);
                                        handleChange('sewaDiscountLimits', newLimits);
                                    }}
                                    placeholder="Max %"
                                />
                                <span className="text-xs font-bold text-slate-500">%</span>
                                <button
                                    type="button"
                                    className="p-1 text-red-500 hover:text-red-700 ml-auto hover:bg-red-50 rounded"
                                    onClick={() => {
                                        const defaultSewaRoles = ['नगर प्रमुख', 'नगर उपप्रमुख', 'वडा अध्यक्ष', 'स्वास्थ्य शाखा प्रमुख', 'स्वास्थ्य चौकी प्रमुख', 'कर्मचारी स्वयम', 'अन्य'];
                                        const newRoles = (localSettings.sewaDiscountRoles || defaultSewaRoles).filter((_, i) => i !== idx);
                                        handleChange('sewaDiscountRoles', newRoles);
                                    }}
                                    title="हटाउनुहोस्"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* एम्बुलेन्स सेवा र भाडा दर सेटिङ */}
            </div>
          )}

          {/* 4. Vaccination */}
          {(!settingsSearchQuery.trim() ? generalSubTab === 'vaccination' : ["खोप","vaccine","vaccination","center","केन्द्र","तालिका","मिति","khop"].some(t => t.toLowerCase().includes(settingsSearchQuery.toLowerCase().trim()) || settingsSearchQuery.toLowerCase().trim().includes(t.toLowerCase()))) && (
            <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><Calendar size={18} className="text-primary-600"/>खोप केन्द्र व्यवस्थापन</h3>
                <p className="text-xs text-slate-500 mb-4">केन्द्रको नाम र खोप चल्ने मिति (e.g., 'मुख्य अस्पताल|आइत-बिही')</p>
                <div className="space-y-2">
                    {(localSettings.vaccinationCenters || []).map((center, index) => {
                        const [name, dates] = center.includes('|') ? center.split('|') : [center, ''];
                        return (
                            <div key={index} className="flex gap-2">
                                <Input label="नाम" value={name} onChange={(e) => {
                                    const newCenters = [...(localSettings.vaccinationCenters || [])];
                                    newCenters[index] = `${e.target.value}|${dates}`;
                                    handleChange('vaccinationCenters', newCenters);
                                }} />
                                <Input label="मिति" value={dates} onChange={(e) => {
                                    const newCenters = [...(localSettings.vaccinationCenters || [])];
                                    newCenters[index] = `${name}|${e.target.value}`;
                                    handleChange('vaccinationCenters', newCenters);
                                }} />
                                <button type="button" onClick={() => {
                                    const newCenters = (localSettings.vaccinationCenters || []).filter((_, i) => i !== index);
                                    handleChange('vaccinationCenters', newCenters);
                                }} className="text-red-500 p-2"><Trash2 size={16}/></button>
                            </div>
                        );
                    })}
                    <button type="button" onClick={() => {
                        handleChange('vaccinationCenters', [...(localSettings.vaccinationCenters || []), '|']);
                    }} className="flex items-center gap-2 text-primary-600 text-sm font-bold"><Plus size={16}/> थप्नुहोस्</button>
                </div>
            </div>

            {/* एम्बुलेन्स चालक प्रोत्साहन तथा कर सेटिङ */}
            </div>
          )}

          {/* 5. Cold chain */}
          {(!settingsSearchQuery.trim() ? generalSubTab === 'coldchain' : ["कोल्ड चेन","cold chain","तापक्रम","temperature","fridge","फ्रिज","alert","अलर्ट","मोबाईल"].some(t => t.toLowerCase().includes(settingsSearchQuery.toLowerCase().trim()) || settingsSearchQuery.toLowerCase().trim().includes(t.toLowerCase()))) && (
            <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2 border-b pb-2">
                    <Thermometer size={18} className="text-cyan-600"/> कोल्ड चेन (खोप फ्रिज) सेटिङ (Cold Chain EPI Settings)
                </h3>
                <p className="text-xs text-slate-500 font-nepali">
                    नेपाल सरकार (EPI) मापदण्ड अनुसार खोप भण्डारणको सामान्य सुरक्षित दायरा २°C देखि ८°C हो। तापक्रम यो सीमा भन्दा बाहिर गएमा प्रणालीले तत्काल चेतावनी दिनेछ।
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                    <Input 
                        label="न्यूनतम तापक्रम (°C Min Temp)" 
                        type="number"
                        step="0.1"
                        value={localSettings.coldChainMinTempC !== undefined ? localSettings.coldChainMinTempC : 2} 
                        onChange={(e) => handleChange('coldChainMinTempC', parseFloat(e.target.value) || 0)} 
                        placeholder="2"
                    />
                    <Input 
                        label="अधिकतम तापक्रम (°C Max Temp)" 
                        type="number"
                        step="0.1"
                        value={localSettings.coldChainMaxTempC !== undefined ? localSettings.coldChainMaxTempC : 8} 
                        onChange={(e) => handleChange('coldChainMaxTempC', parseFloat(e.target.value) || 0)} 
                        placeholder="8"
                    />
                    <Input 
                        label="आपतकालीन अलर्ट मोबाइल (Alert Mobile No.)" 
                        type="tel"
                        value={localSettings.coldChainAlertPhone || ''} 
                        onChange={(e) => handleChange('coldChainAlertPhone', e.target.value)} 
                        placeholder="९८XXXXXXXX (Incharge Mobile)"
                    />
                </div>
                <div className="flex items-start gap-2.5 p-3 bg-cyan-50/70 border border-cyan-100 rounded-xl text-xs text-cyan-900 font-nepali">
                    <ShieldAlert size={16} className="text-cyan-600 shrink-0 mt-0.5" />
                    <span>
                        तापक्रम रेकर्ड गर्दा सीमा नाघेमा यो फोन नम्बरमा तुरुन्त SMS अलर्ट पठाउने सुविधा उपलब्ध हुनेछ।
                    </span>
                </div>
            </div>

            </div>
          )}

          {/* 6. SMS */}
          {(!settingsSearchQuery.trim() ? generalSubTab === 'sms' : ["sms","मैसेज","gateway","sparrow","aakash","smspasal","balance","ब्यालेन्स","क्रेडिट","api token","sender"].some(t => t.toLowerCase().includes(settingsSearchQuery.toLowerCase().trim()) || settingsSearchQuery.toLowerCase().trim().includes(t.toLowerCase()))) && (
            <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><MessageSquare size={18} className="text-blue-600"/>Universal SMS Gateway API सेटिङ</h3>
                {currentUser?.role === 'SUPER_ADMIN' ? (
                    <div>
                        <h4 className="font-bold text-blue-900 mb-1 flex items-center gap-2 font-nepali text-sm">
                            <MessageSquare size={18} className="text-blue-600"/>
                            Universal SMS Gateway API सेटिङ (Super Admin Only)
                        </h4>
                        <p className="text-xs text-slate-500 font-nepali mb-4">
                            यहाँ गेटवे (उदा. Sparrow SMS, Aakash SMS आदि) को API विवरणहरू सुरक्षित गरेपछि प्रयोगकर्ता व्यवस्थापनबाट अनुमति पाएका युजरहरूले खोप अनुगमन लगायतका ठाउँबाट SMS पठाउन पाउनेछन्।
                        </p>
                        <div className="grid md:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                            <Select 
                                label="SMS गेटवे प्रदायक (SMS Provider)" 
                                options={[
                                    { id: 'smspasal', value: 'SMS Pasal', label: 'SMSBit / SMS Pasal (sms.smspasal.com)' },
                                    { id: 'sparrow', value: 'Sparrow SMS', label: 'Sparrow SMS (नेपाल)' },
                                    { id: 'aakash', value: 'Aakash SMS', label: 'Aakash SMS (नेपाल)' },
                                    { id: 'custom', value: 'Custom Gateway', label: 'अन्य / Custom Gateway API' }
                                ]} 
                                value={localSettings.smsApiProvider || 'SMS Pasal'} 
                                onChange={(e) => {
                                    const provider = e.target.value;
                                    handleChange('smsApiProvider', provider);
                                    if (provider === 'SMS Pasal') {
                                        if (!localSettings.smsApiUrl) handleChange('smsApiUrl', 'https://sms.smspasal.com/smsapi/index.php');
                                        if (!localSettings.smsApiKey) handleChange('smsApiKey', '56A71A88EC9CA9');
                                        if (!localSettings.smsSenderId) handleChange('smsSenderId', 'SMSBit');
                                        if (!localSettings.smsCampaignId) handleChange('smsCampaignId', '9674');
                                        if (!localSettings.smsRouteId) handleChange('smsRouteId', '10259');
                                    }
                                }} 
                                icon={<Server size={16} />} 
                            />
                            <Input 
                                label="Sender ID / Header" 
                                value={localSettings.smsSenderId || ''} 
                                onChange={(e) => handleChange('smsSenderId', e.target.value)} 
                                placeholder="उदा: SMSBit / Chaudandigadhi" 
                                icon={<Send size={16} />} 
                            />
                            <Input 
                                label="API Token / Key (गोप्य)" 
                                type={showSmsApiKey ? "text" : "password"} 
                                value={localSettings.smsApiKey || ''} 
                                onChange={(e) => handleChange('smsApiKey', e.target.value)} 
                                placeholder="56A71A88EC9CA9" 
                                icon={<Key size={16} />} 
                                suffix={
                                  <button
                                    type="button"
                                    onClick={() => setShowSmsApiKey(!showSmsApiKey)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                                    title={showSmsApiKey ? "Key लुकाउनुहोस्" : "Key देख्नुहोस्"}
                                  >
                                    {showSmsApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                                }
                            />
                            <Input 
                                label="API Endpoint URL" 
                                value={localSettings.smsApiUrl || ''} 
                                onChange={(e) => handleChange('smsApiUrl', e.target.value)} 
                                placeholder="https://sms.smspasal.com/smsapi/index.php" 
                                icon={<Globe size={16} />} 
                            />
                            <Input 
                                label="SMS Campaign ID (SMS Pasal Dashboard बाट)" 
                                value={localSettings.smsCampaignId || ''} 
                                onChange={(e) => handleChange('smsCampaignId', e.target.value)} 
                                placeholder="उदा: 9674" 
                                icon={<Server size={16} />} 
                            />
                            <Input 
                                label="SMS Route ID (SMS Pasal Dashboard बाट)" 
                                value={localSettings.smsRouteId || ''} 
                                onChange={(e) => handleChange('smsRouteId', e.target.value)} 
                                placeholder="उदा: 10259" 
                                icon={<Server size={16} />} 
                            />

                            {/* SMS Pasal Credit Balance Card */}
                            <div className="md:col-span-2 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-indigo-800/50 space-y-3 mt-2">
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-800/60 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-300 border border-indigo-500/30">
                                            <Wallet size={20} />
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-sm text-white font-nepali flex items-center gap-2">
                                                SMS गेटवे क्रेडिट ब्यालेन्स (SMS Pasal Credit Balance)
                                            </h5>
                                            <p className="text-[11px] text-indigo-200/80 font-mono flex items-center gap-1.5 mt-0.5">
                                                <span>API Call:</span>
                                                <code className="bg-black/40 px-2 py-0.5 rounded border border-indigo-800 text-amber-300 text-[10px]">
                                                    https://sms.smspasal.com/miscapi/{localSettings.smsApiKey || '56A71A88EC9CA9'}/getBalance/true/
                                                </code>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={fetchSmsBalance}
                                        disabled={isFetchingBalance}
                                        className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer font-nepali"
                                    >
                                        <RefreshCw size={14} className={isFetchingBalance ? "animate-spin" : ""} />
                                        {isFetchingBalance ? "ब्यालेन्स चेक हुँदैछ..." : "ब्यालेन्स अपडेट (Check Balance)"}
                                    </button>
                                </div>

                                {smsBalanceInfo?.error ? (
                                    <div className="bg-rose-950/70 border border-rose-700/60 text-rose-200 p-3 rounded-xl text-xs flex items-center gap-2.5 font-nepali">
                                        <AlertCircle size={18} className="text-rose-400 shrink-0" />
                                        <div>
                                            <div className="font-bold">ब्यालेन्स प्राप्त हुन सकेन:</div>
                                            <div>{smsBalanceInfo.error}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                                        <div className="flex items-baseline gap-3">
                                            <span className="text-xs text-indigo-200 font-nepali font-semibold">उपलब्ध कूल SMS ब्यालेन्स (Credit):</span>
                                            <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${smsBalanceInfo?.totalBalance && smsBalanceInfo.totalBalance > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {smsBalanceInfo?.totalBalance !== undefined ? smsBalanceInfo.totalBalance : '...'} <span className="text-sm font-normal text-slate-300">SMS</span>
                                            </span>
                                        </div>

                                        {smsBalanceInfo?.totalBalance !== undefined && (
                                            <div className="flex items-center gap-2">
                                                {smsBalanceInfo.totalBalance > 0 ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold px-3 py-1 rounded-full">
                                                        <CheckCircle2 size={14} className="text-emerald-400" />
                                                        पर्याप्त ब्यालेन्स (Active Balance)
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                                                        <AlertCircle size={14} className="text-rose-400" />
                                                        ब्यालेन्स समाप्त (Recharge Required)
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {smsBalanceInfo?.routes && smsBalanceInfo.routes.length > 0 && (
                                    <div className="pt-2 border-t border-indigo-900/60">
                                        <span className="text-[11px] text-indigo-200/90 font-bold block mb-1.5 font-nepali">रुट अनुसारको ब्यालेन्स (Route Details):</span>
                                        <div className="flex flex-wrap gap-2">
                                            {smsBalanceInfo.routes.map((rt, idx) => (
                                                <div key={idx} className="bg-indigo-900/60 border border-indigo-700/60 px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-2">
                                                    <span className="text-indigo-200 font-semibold">{rt.routeName || 'Default Route'}</span>
                                                    {rt.routeId && <span className="text-[10px] text-indigo-300/70">(ID: {rt.routeId})</span>}
                                                    <span className="text-emerald-400 font-bold ml-1">{rt.balance} SMS</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {smsBalanceInfo?.lastChecked && (
                                    <div className="text-[10px] text-indigo-300/70 italic text-right font-nepali">
                                        अन्तिम पटक चेक गरिएको समय: {smsBalanceInfo.lastChecked}
                                    </div>
                                )}
                            </div>
                    </div>
                    </div>
                ) : (
                    <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-sm font-nepali border border-amber-200">यो सेटिङ सुपर एडमिन (Super Admin) ले मात्र परिवर्तन गर्न सक्नुहुन्छ।</div>
                )}
            </div>
            </div>
          )}

          {/* 7. Email */}
          {(!settingsSearchQuery.trim() ? generalSubTab === 'email' : ["email","इमेल","ईमेल","resend","api key","sender address","डाँक"].some(t => t.toLowerCase().includes(settingsSearchQuery.toLowerCase().trim()) || settingsSearchQuery.toLowerCase().trim().includes(t.toLowerCase()))) && (
            <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2 border-b pb-2"><Mail size={18} className="text-indigo-600"/>Email API सेटिङ (Resend)</h3>
                {currentUser?.role === 'SUPER_ADMIN' ? (
                    <div>
                                <h4 className="font-bold text-indigo-900 mb-1 flex items-center gap-2 font-nepali text-sm">
                                    <Mail size={18} className="text-indigo-600"/>
                                    Email API सेटिङ (Resend) - (Super Admin Only)
                                </h4>
                                <p className="text-xs text-slate-500 font-nepali mb-4">
                                    Resend API प्रयोग गरेर प्रणालीबाट स्वचालित ईमेल पठाउनको लागि यहाँ विवरणहरू भर्नुहोस्।
                                </p>
                                <div className="grid md:grid-cols-2 gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                                    <Input 
                                        label="Email API Provider" 
                                        value={localSettings.emailApiProvider || 'Resend'} 
                                        onChange={(e) => handleChange('emailApiProvider', e.target.value)} 
                                        placeholder="Resend"
                                        readOnly
                                        icon={<Server size={16} />} 
                                    />
                                    <Input 
                                        label="Resend API Key (गोप्य)" 
                                        type={showEmailApiKey ? "text" : "password"}
                                        value={localSettings.emailApiKey || ''} 
                                        onChange={(e) => handleChange('emailApiKey', e.target.value)} 
                                        placeholder="re_xxxx..." 
                                        icon={<Key size={16} />}
                                        suffix={
                                          <button
                                            type="button"
                                            onClick={() => setShowEmailApiKey(!showEmailApiKey)}
                                            className="p-1.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                                            title={showEmailApiKey ? "Key लुकाउनुहोस्" : "Key देख्नुहोस्"}
                                          >
                                            {showEmailApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                          </button>
                                        }
                                    />
                                    <Input 
                                        label="Email Sender Address" 
                                        value={localSettings.emailSenderAddress || ''} 
                                        onChange={(e) => handleChange('emailSenderAddress', e.target.value)} 
                                        placeholder="noreply@smartinventoryy.com"
                                        icon={<Mail size={16} />} 
                                    />
                                    <Input 
                                        label="Email Sender Name" 
                                        value={localSettings.emailSenderName || ''} 
                                        onChange={(e) => handleChange('emailSenderName', e.target.value)} 
                                        placeholder="Unique Health"
                                        icon={<UserCog size={16} />} 
                                    />
                                </div>
                    </div>
                ) : (
                    <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-sm font-nepali border border-amber-200">यो सेटिङ सुपर एडमिन (Super Admin) ले मात्र परिवर्तन गर्न सक्नुहुन्छ।</div>
                )}
            </div>
            </div>
          )}

          {/* 8. Integrations */}
          {(!settingsSearchQuery.trim() ? generalSubTab === 'integrations' : ["dhis2","hib","बीमा","एकीकरण","integration","dhis","dataset","orgunit","mapping"].some(t => t.toLowerCase().includes(settingsSearchQuery.toLowerCase().trim()) || settingsSearchQuery.toLowerCase().trim().includes(t.toLowerCase()))) && (
            <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><Globe size={18} className="text-primary-600"/>DHIS2 API कन्फिगरेसन</h3>
                <div className="grid grid-cols-1 gap-4">
                    <Input 
                        label="DHIS2 Base URL" 
                        value={localSettings.dhis2BaseUrl || ''} 
                        onChange={(e) => handleChange('dhis2BaseUrl', e.target.value)} 
                        placeholder="https://play.dhis2.org/2.40.0/api/"
                        icon={<Globe size={16} />}
                    />
                    <div className="grid md:grid-cols-2 gap-4">
                        <Input 
                            label="DHIS2 Username" 
                            value={localSettings.dhis2Username || ''} 
                            onChange={(e) => handleChange('dhis2Username', e.target.value)} 
                            placeholder="admin"
                            icon={<UserCog size={16} />}
                        />
                        <Input 
                            label="DHIS2 Password" 
                            type="password"
                            value={localSettings.dhis2Password || ''} 
                            onChange={(e) => handleChange('dhis2Password', e.target.value)} 
                            placeholder="••••••••"
                            icon={<Lock size={16} />}
                        />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Input 
                            label="DHIS2 OrgUnit ID" 
                            value={localSettings.dhis2OrgUnitId || ''} 
                            onChange={(e) => handleChange('dhis2OrgUnitId', e.target.value)} 
                            placeholder="fBTyYLt6u8l"
                            icon={<MapPinned size={16} />}
                        />
                        <Input 
                            label="DHIS2 OrgUnit Name" 
                            value={localSettings.dhis2OrgUnitName || ''} 
                            onChange={(e) => handleChange('dhis2OrgUnitName', e.target.value)} 
                            placeholder="Health Post Name"
                            icon={<MapPinned size={16} />}
                        />
                    </div>
                    {currentUser.role === 'SUPER_ADMIN' && (
                        <>
                            <div className="mt-4">
                                <label className="block text-xs font-bold text-slate-600 mb-2">DataSet ID Mappings (Global)</label>
                                <div className="space-y-3">
                                    {['Reporting Status', 'Immunization', 'MCH Report', 'Family Planning', 'CBIMNCI Report', 'GESI Report', 'FCHV Report'].map(module => (
                                        <div key={module} className="flex gap-2 items-center">
                                            <span className="text-xs font-medium text-slate-500 w-32">{module}:</span>
                                            <SearchableSelect 
                                                label="" 
                                                className="flex-1"
                                                options={DHIS2_DATASETS}
                                                value={localSettings.dhis2DatasetMappings?.[module] || ''} 
                                                onChange={(val) => {
                                                    const newMappings = { ...(localSettings.dhis2DatasetMappings || {}) };
                                                    newMappings[module] = val;
                                                    handleChange('dhis2DatasetMappings', newMappings);
                                                }} 
                                                placeholder="Select DataSet"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 border-t pt-4">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="block text-xs font-bold text-slate-600">Individual Cell Mappings (Global)</label>
                                    <button 
                                        onClick={() => {
                                            const newMappings = [...(localSettings.dhis2CellMappings || [])];
                                            newMappings.push({ id: crypto.randomUUID(), sourceKey: '', dataElement: '', categoryOptionCombo: '' });
                                            handleChange('dhis2CellMappings', newMappings);
                                        }}
                                        className="flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md hover:bg-indigo-100 font-bold uppercase transition-colors"
                                    >
                                        <Plus size={12} /> Add Mapping
                                    </button>
                                </div>
                                
                                <div className="space-y-2">
                                    {(localSettings.dhis2CellMappings || []).map((mapping, index) => (
                                        <div key={mapping.id} className="grid grid-cols-12 gap-2 items-end bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <div className="col-span-3">
                                                <SearchableSelect 
                                                    label="Source Key" 
                                                    options={DHIS2_SOURCE_KEYS}
                                                    value={mapping.sourceKey} 
                                                    onChange={(val) => {
                                                        const newMappings = [...(localSettings.dhis2CellMappings || [])];
                                                        newMappings[index].sourceKey = val;
                                                        
                                                        // Auto-mapping logic
                                                        const sourceKeyLabel = DHIS2_SOURCE_KEYS.find(sk => sk.value === val)?.label?.toLowerCase() || '';
                                                        
                                                        // Find best matching DataElement
                                                        const matchingElement = DHIS2_DATA_ELEMENTS.find(de => 
                                                            de.label.toLowerCase().includes(sourceKeyLabel.replace('child vax ', '').replace(' female', '').replace(' male', ''))
                                                        );
                                                        
                                                        if (matchingElement) {
                                                            newMappings[index].dataElement = matchingElement.value;
                                                        }
                                                        
                                                        // Auto-mapping Combo based on Gender
                                                        if (val.includes('FEMALE')) {
                                                            newMappings[index].categoryOptionCombo = 'ye1QuAMRG5Z';
                                                        } else if (val.includes('MALE')) {
                                                            newMappings[index].categoryOptionCombo = 'PflKpozpO7b';
                                                        } else {
                                                            newMappings[index].categoryOptionCombo = 'kdsirVNKdhm'; // default
                                                        }

                                                        handleChange('dhis2CellMappings', newMappings);
                                                    }}
                                                    placeholder="Select Source"
                                                    className="text-xs"
                                                />
                                            </div>
                                            <div className="col-span-4">
                                                <SearchableSelect 
                                                    label="DataElement UID" 
                                                    options={DHIS2_DATA_ELEMENTS}
                                                    value={mapping.dataElement} 
                                                    onChange={(val) => {
                                                        const newMappings = [...(localSettings.dhis2CellMappings || [])];
                                                        newMappings[index].dataElement = val;
                                                        handleChange('dhis2CellMappings', newMappings);
                                                    }}
                                                    placeholder="UID"
                                                    className="text-xs"
                                                />
                                            </div>
                                            <div className="col-span-4">
                                                <SearchableSelect 
                                                    label="Combo UID" 
                                                    options={DHIS2_COMBOS}
                                                    value={mapping.categoryOptionCombo} 
                                                    onChange={(val) => {
                                                        const newMappings = [...(localSettings.dhis2CellMappings || [])];
                                                        newMappings[index].categoryOptionCombo = val;
                                                        handleChange('dhis2CellMappings', newMappings);
                                                    }}
                                                    placeholder="UID"
                                                    className="text-xs"
                                                />
                                            </div>
                                            <div className="col-span-1 flex justify-center pb-2">
                                                <button 
                                                    onClick={() => {
                                                        const newMappings = (localSettings.dhis2CellMappings || []).filter(m => m.id !== mapping.id);
                                                        handleChange('dhis2CellMappings', newMappings);
                                                    }}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {(localSettings.dhis2CellMappings || []).length === 0 && (
                                        <p className="text-center text-[10px] text-slate-400 py-4 italic">No individual cell mappings defined.</p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><ShieldCheck size={18} className="text-emerald-600"/>स्वास्थ्य बीमा बोर्ड (HIB) API एकीकरण</h3>
                <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h4 className="font-bold text-slate-800 font-nepali text-sm">स्वास्थ्य बीमा बोर्ड (HIB) दाबी तथा API व्यवस्थापन</h4>
                        <p className="text-xs text-slate-500 font-nepali mt-1">स्वास्थ्य बीमा दाबी, टोकन, सर्भर IP र HIB API कन्फिगरेसन बायाँ मेनुको समर्पित 'HIB सेटिङ' स्क्रिनबाट व्यवस्थापन गरिन्छ।</p>
                    </div>
                    <div className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold shrink-0 font-nepali">HIB Settings मेनु उपलब्ध</div>
                </div>
            </div>
            </div>
          )}

          {/* 9. IPD */}
          {(!settingsSearchQuery.trim() ? generalSubTab === 'ipd' : ["ipd","वार्ड","शय्या","bed","ward","अन्तरङ्ग","भर्ना"].some(t => t.toLowerCase().includes(settingsSearchQuery.toLowerCase().trim()) || settingsSearchQuery.toLowerCase().trim().includes(t.toLowerCase()))) && (
            <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><BedDouble size={18} className="text-indigo-600"/>IPD वार्ड तथा शय्या (Beds) व्यवस्थापन</h3>
                <p className="text-xs text-slate-500 font-nepali mb-3">अन्तरङ्ग विभाग (IPD) का वार्डहरू र शय्या संख्या कन्फिगरेसन IPD सेवा मोड्युलमा प्रत्यक्ष रूपमा उपलब्ध छ।</p>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {(localSettings.ipdWards && localSettings.ipdWards.length > 0) ? (
                        localSettings.ipdWards.map((w, idx) => (
                            <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-sm text-slate-800 font-nepali">{w.name}</div>
                                    <div className="text-xs text-slate-500">कुल शय्या: {w.bedCount || 0}</div>
                                </div>
                                <BedDouble size={20} className="text-indigo-500" />
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full p-4 bg-slate-50 text-slate-500 rounded-xl text-xs font-nepali text-center border border-dashed border-slate-200">हालसम्म कुनै पनि IPD वार्ड कन्फिगर गरिएको छैन। IPD सेवा स्क्रिनबाट नयाँ वार्ड र बेड थप्न सकिन्छ।</div>
                    )}
                </div>
            </div>
            </div>
          )}

          {/* 10. Portal & Login */}
          {(!settingsSearchQuery.trim() ? generalSubTab === 'portal' : ["portal","डाउनलोड","download","ribbon","रिबन","कुडोस","login","लगइन","सूचना"].some(t => t.toLowerCase().includes(settingsSearchQuery.toLowerCase().trim()) || settingsSearchQuery.toLowerCase().trim().includes(t.toLowerCase()))) && (
            <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><ExternalLink size={18} className="text-emerald-600"/>पोर्टल तथा लगइन पृष्ठ सेटिङ</h3>
                {currentUser?.role === 'SUPER_ADMIN' ? (
                    <div className="space-y-6">
                                <h4 className="font-bold text-emerald-900 mb-1 flex items-center gap-2 font-nepali text-sm">
                                    <ExternalLink size={18} className="text-emerald-600"/>
                                    डाउनलोड सेन्टर लिङ्क सेटिङ (Super Admin Only)
                                </h4>
                                <p className="text-xs text-slate-500 font-nepali mb-4">
                                    यहाँ राखिएको डाउनलोड लिङ्क (URL) प्रणालीका प्रयोगकर्ताहरूका लागि 'डाउनलोड (Download)' मेनुमा उपलब्ध हुनेछ।
                                </p>
                                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                                    <Input 
                                        label="डाउनलोड सेन्टर लिङ्क (Download Center Link URL)" 
                                        value={localSettings.downloadCenterUrl || ''} 
                                        onChange={(e) => handleChange('downloadCenterUrl', e.target.value)} 
                                        placeholder="उदा: https://drive.google.com/file/d/xyz/view वा APK/फाइलको लिङ्क"
                                        icon={<ExternalLink size={16} />} 
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                    <h4 className="font-bold text-rose-950 flex items-center gap-2 font-nepali text-sm">
                                        <Megaphone size={18} className="text-rose-600"/>
                                        लगइन पृष्ठ सन्देश / कुडोस रिबन सेटिङ (Login Page Ribbon & Kudos Message)
                                    </h4>
                                    <span className="text-[11px] bg-rose-100 text-rose-800 font-semibold px-2.5 py-0.5 rounded-full font-nepali self-start sm:self-auto">
                                        विश्वव्यापी (Universal)
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 font-nepali mb-4">
                                    यहाँ सेट गरिएको सन्देश लगइन पृष्ठको <strong>'आर्थिक वर्ष (Fiscal Year)'</strong> को फिल्डभन्दा माथि <strong>रातो रङको फन्ट (Red Font)</strong> मा दायाँबाट बायाँ (Right-to-Left) स्क्रोल भएर देखिनेछ। यो सन्देश सबै प्रयोगकर्ताहरूको लगइन स्क्रिनमा विश्वव्यापी (Universal) रूपमा लागु हुन्छ। यदि सन्देश प्रदर्शन गर्न नचाहेमा तलको चेकबक्स अनचेक (Disable) गर्न सक्नुहुन्छ।
                                </p>
                                <div className="bg-rose-50/60 p-5 rounded-2xl border border-rose-100 space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer select-none bg-white p-3.5 rounded-xl border border-rose-200 hover:border-rose-300 transition-colors shadow-xs">
                                        <input 
                                            type="checkbox" 
                                            checked={!!localSettings.enableLoginRibbonMessage}
                                            onChange={(e) => handleChange('enableLoginRibbonMessage', e.target.checked)}
                                            className="w-4 h-4 text-rose-600 rounded border-rose-300 focus:ring-rose-500"
                                        />
                                        <div>
                                            <span className="text-xs font-bold text-slate-800 font-nepali block">
                                                लगइन पृष्ठमा सन्देश रिबन देखाउनुहोस् (Display Kudos/Notice Ribbon on Login Page)
                                            </span>
                                            <span className="text-[11px] text-slate-500 font-nepali block mt-0.5">
                                                {localSettings.enableLoginRibbonMessage ? 'हाल लगइन स्क्रिनमा सन्देश प्रदर्शन सक्रिय छ।' : 'सन्देश प्रदर्शन निष्क्रिय गरिएको छ (लगइन स्क्रिनमा केही देखिने छैन)।'}
                                            </span>
                                        </div>
                                    </label>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 font-nepali mb-1.5 flex items-center justify-between">
                                            <span>सन्देश / कुडोस व्यहोरा (Notice / Kudos Message Text):</span>
                                            <span className="text-[11px] font-normal text-slate-400">
                                                {(localSettings.loginRibbonMessage || '').length} अक्षर
                                            </span>
                                        </label>
                                        <textarea 
                                            rows={2}
                                            value={localSettings.loginRibbonMessage || ''}
                                            onChange={(e) => handleChange('loginRibbonMessage', e.target.value)}
                                            placeholder="उदा: स्वास्थ्य सेवा प्रणालीमा यहाँलाई स्वागत छ! सेवाग्राहीलाई छिटो र प्रभावकारी सेवा प्रदान गरौं..."
                                            className="w-full text-xs font-nepali p-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none bg-white transition-all text-slate-800"
                                        />
                                    </div>

                                    {/* Live Preview of the Ribbon */}
                                    <div className="pt-2 border-t border-rose-200/60">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[11px] font-bold text-rose-800 font-nepali flex items-center gap-1.5">
                                                <Sparkles size={13} className="text-rose-600" />
                                                प्रत्यक्ष पूर्वावलोकन (Live Preview in Login Screen):
                                            </span>
                                            {!localSettings.enableLoginRibbonMessage && (
                                                <span className="text-[10px] text-slate-400 font-nepali bg-slate-100 px-2 py-0.5 rounded">
                                                    (निष्क्रिय गरिएकोले लगइनमा लुक्नेछ)
                                                </span>
                                            )}
                                        </div>
                                        <div className="w-full overflow-hidden bg-white border border-rose-200 rounded-xl py-2 px-3 shadow-xs flex items-center gap-2">
                                            <div className="flex items-center gap-1 shrink-0 bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md font-nepali">
                                                <Sparkles size={11} className="animate-pulse" />
                                                <span>सूचना:</span>
                                            </div>
                                            <div className="relative overflow-hidden w-full h-5 flex items-center">
                                                {localSettings.loginRibbonMessage?.trim() ? (
                                                    <div className="whitespace-nowrap inline-block font-bold text-rose-600 text-xs sm:text-sm font-nepali animate-marquee-rtl">
                                                        {localSettings.loginRibbonMessage}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic font-nepali">
                                                        कुनै सन्देश लेखिएको छैन...
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                    </div>
                ) : (
                    <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-sm font-nepali border border-amber-200">यो सेटिङ सुपर एडमिन (Super Admin) ले मात्र परिवर्तन गर्न सक्नुहुन्छ।</div>
                )}
            </div>
            </div>
          )}

          {/* 11. User Hierarchy & Report Officers */}
          {(!settingsSearchQuery.trim() ? generalSubTab === 'users' : ["पदानुक्रम","hierarchy","पदानुक्रम मिलाउने","कर्मचारी","प्रतिवेदन","अधिकारी","report","signer","certifier","preparer","तयार गर्ने","प्रमाणित","प्रयोगकर्ता","order","staff"].some(t => t.toLowerCase().includes(settingsSearchQuery.toLowerCase().trim()) || settingsSearchQuery.toLowerCase().trim().includes(t.toLowerCase()))) && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Success Notification Banner */}
              {hierarchySuccessMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-start gap-3 shadow-xs animate-in slide-in-from-top-2">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-nepali text-sm font-semibold">
                    {hierarchySuccessMsg}
                  </div>
                  <button type="button" onClick={() => setHierarchySuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 p-1">
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* 11.1 Office User Hierarchy Adjustment */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 font-nepali">
                      <Users size={20} className="text-primary-600" />
                      कार्यालय कर्मचारी पदानुक्रम व्यवस्थापन (Office Staff Hierarchy & Sequence)
                    </h3>
                    <p className="text-xs text-slate-500 font-nepali mt-1">
                      कर्मचारीहरूको प्राथमिकता क्रम (Hierarchy) तल-माथि सारेर वा सिधै क्रम नम्बर राखेर मिलाउनुहोस्। यो क्रम तलबी भरपाई, उपस्थिति, माग फाराम तथा सबै प्रतिवेदनहरूमा क्रमशः लागु हुनेछ।
                    </p>
                  </div>

                  {currentUser?.role === 'SUPER_ADMIN' && (
                    <div className="w-full sm:w-64">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1 font-nepali">
                        संस्था/कार्यालय छनोट:
                      </label>
                      <select
                        value={hierarchyOrg}
                        onChange={(e) => setHierarchyOrg(e.target.value)}
                        className="w-full text-xs font-nepali p-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                      >
                        {Array.from(new Set(users.map(u => u.organizationName).filter(Boolean))).map(orgName => (
                          <option key={orgName} value={orgName}>{orgName}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Explanatory Banner */}
                <div className="p-4 bg-primary-50/60 border border-primary-100 rounded-2xl flex items-start gap-3">
                  <Sparkles size={18} className="text-primary-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 font-nepali leading-relaxed">
                    <strong className="text-primary-900 font-bold">💡 पदानुक्रम (Hierarchy Order) को महत्त्व: </strong>
                    यहाँ मिलाइएको क्रम अनुसार <strong>तलबी भरपाई (Talabi Bharpai)</strong>, कर्मचारी विवरण, हाजिरी (Attendance), माग फाराम तथा विभिन्न प्रतिवेदनहरू र दस्तखत गर्ने अधिकारीहरूको सूचीमा कर्मचारीहरू पहिलो, दोस्रो हुँदै सोही क्रममा स्वतः प्रदर्शित हुनेछन्।
                  </div>
                </div>

                {/* Hierarchy Toolbar */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1 max-w-xs">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={hierarchySearch}
                        onChange={(e) => setHierarchySearch(e.target.value)}
                        placeholder="कर्मचारी खोज्नुहोस्..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs font-nepali bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-600 font-nepali whitespace-nowrap bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                      कुल कर्मचारी: {targetOfficeUsers.length} जना
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={handleAutoSortHierarchy}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition-colors flex items-center gap-1 font-nepali cursor-pointer"
                      title="पद, तह तथा भूमिका अनुसार स्वतः पदानुक्रम मिलाउनुहोस्"
                    >
                      <Zap size={14} /> पद/तह अनुसार मिलाउने
                    </button>
                    <button
                      type="button"
                      onClick={handleSortAlphabetical}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold border border-purple-200 transition-colors flex items-center gap-1 font-nepali cursor-pointer"
                      title="नामको वर्णानुक्रम अनुसार मिलाउनुहोस्"
                    >
                      <ArrowUpDown size={14} /> वर्णानुक्रम (A-Z)
                    </button>
                    <button
                      type="button"
                      onClick={handleResetHierarchy}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1 font-nepali cursor-pointer"
                      title="साविक क्रममा रिसेट गर्नुहोस्"
                    >
                      <RotateCcw size={14} /> रिसेट
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveHierarchyOrder}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 font-nepali cursor-pointer"
                    >
                      <Save size={14} /> पदानुक्रम सुरक्षित गर्नुहोस्
                    </button>
                  </div>
                </div>

                {/* User Hierarchy Reorder List */}
                <div className="space-y-2">
                  {targetOfficeUsers.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-nepali border border-dashed border-slate-200 rounded-2xl">
                      यो कार्यालयमा कुनै प्रयोगकर्ता/कर्मचारी फेला परेन।
                    </div>
                  ) : (
                    targetOfficeUsers
                      .filter(u => !hierarchySearch.trim() || (u.fullName || '').toLowerCase().includes(hierarchySearch.toLowerCase()) || (u.username || '').toLowerCase().includes(hierarchySearch.toLowerCase()) || (u.designation || '').toLowerCase().includes(hierarchySearch.toLowerCase()))
                      .map((user, idx) => {
                        const trueIndex = targetOfficeUsers.findIndex(u => u.id === user.id);
                        const isFirst = trueIndex === 0;
                        const isLast = trueIndex === targetOfficeUsers.length - 1;
                        const isFrozen = user.isFrozen;

                        return (
                          <div
                            key={user.id}
                            className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                              trueIndex === 0
                                ? 'bg-amber-50/60 border-amber-200 shadow-2xs'
                                : trueIndex === 1
                                ? 'bg-slate-50 border-slate-300'
                                : trueIndex === 2
                                ? 'bg-orange-50/40 border-orange-200'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {/* Left: Rank & User Info */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {/* Priority Rank Badge */}
                              <div className="flex flex-col items-center justify-center shrink-0">
                                <span
                                  className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center font-nepali shadow-2xs ${
                                    trueIndex === 0
                                      ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                                      : trueIndex === 1
                                      ? 'bg-slate-700 text-white'
                                      : trueIndex === 2
                                      ? 'bg-orange-600 text-white'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                  title={`पदानुक्रम क्रम नं. ${trueIndex + 1}`}
                                >
                                  #{trueIndex + 1}
                                </span>
                              </div>

                              {/* Avatar & Names */}
                              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs shrink-0 border border-primary-200 uppercase">
                                {(user.fullName || user.username || 'U').charAt(0)}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-800 text-sm font-nepali">
                                    {user.fullName || user.username}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    (@{user.username})
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                    user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                    user.role === 'ADMIN' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                    user.role === 'HEALTH_SECTION' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                                    user.role === 'DOCTOR' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                    'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}>
                                    {user.role}
                                  </span>
                                  {isFrozen && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-nepali">
                                      रोक्का (Frozen)
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 font-nepali mt-0.5 flex items-center gap-2">
                                  <span>पद: <strong>{user.designation || 'पद नतोकिएको'}</strong></span>
                                  {user.phoneNumber && <span>| फोन: {user.phoneNumber}</span>}
                                </div>
                              </div>
                            </div>

                            {/* Right: Sequence Movement Controls */}
                            <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                              {/* Direct Rank Input */}
                              <div className="flex items-center gap-1 mr-2">
                                <span className="text-[11px] text-slate-400 font-nepali">क्रम:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={targetOfficeUsers.length}
                                  value={trueIndex + 1}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val)) {
                                      handleSetUserRank(user.id, val);
                                    }
                                  }}
                                  className="w-12 text-center text-xs font-bold py-1 px-1 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                  title="सिधै क्रम नम्बर राख्नुहोस्"
                                />
                              </div>

                              {/* Move Top */}
                              <button
                                type="button"
                                onClick={() => handleMoveUserToTop(user.id)}
                                disabled={isFirst}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-primary-50 hover:text-primary-700 text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                title="सबैभन्दा माथि पुर्‍याउनुहोस् (Top)"
                              >
                                <ChevronsUp size={15} />
                              </button>

                              {/* Move Up */}
                              <button
                                type="button"
                                onClick={() => handleMoveUserUp(user.id)}
                                disabled={isFirst}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-primary-50 hover:text-primary-700 text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                title="एक तह माथि सार्नुहोस् (Move Up)"
                              >
                                <ArrowUp size={15} />
                              </button>

                              {/* Move Down */}
                              <button
                                type="button"
                                onClick={() => handleMoveUserDown(user.id)}
                                disabled={isLast}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-primary-50 hover:text-primary-700 text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                title="एक तह तल सार्नुहोस् (Move Down)"
                              >
                                <ArrowDown size={15} />
                              </button>

                              {/* Move Bottom */}
                              <button
                                type="button"
                                onClick={() => handleMoveUserToBottom(user.id)}
                                disabled={isLast}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-primary-50 hover:text-primary-700 text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                title="सबैभन्दा तल पुर्‍याउनुहोस् (Bottom)"
                              >
                                <ChevronsDown size={15} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>

                {targetOfficeUsers.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveHierarchyOrder}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 font-nepali cursor-pointer"
                    >
                      <Save size={16} /> पदानुक्रम परिवर्तन सुरक्षित गर्नुहोस्
                    </button>
                  </div>
                )}
              </div>

              {/* 11.2 Report Signing Officers */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b border-slate-100 pb-3 font-nepali">
                  <UserCheck size={20} className="text-primary-600"/>
                  प्रतिवेदन प्रमाणित गर्ने र जिम्मेवार अधिकारी सेटिङ (Report Signing Officers)
                </h3>
                <p className="text-xs text-slate-500 font-nepali mb-2">
                  विभिन्न प्रतिवेदनहरूमा स्वतः तयार गर्ने तथा प्रमाणित गर्ने व्यक्तिको नाम छनोट गर्नुहोस्। छनोट सूची पदानुक्रम अनुसार क्रमबद्ध छ।
                </p>
                <div className="grid md:grid-cols-2 gap-6 mt-4">
                  {(() => {
                    const userOptions = targetOfficeUsers.map(u => ({
                      id: u.id,
                      label: `${u.fullName || u.username} (${u.designation || u.role})`,
                      value: u.id
                    }));

                    return (
                      <>
                        <Select 
                          label="सेवा बिलिङ प्रतिवेदन तयार गर्ने" 
                          options={userOptions} 
                          value={localSettings.sewaBillingUserId || ''} 
                          onChange={(e) => handleChange('sewaBillingUserId', e.target.value)} 
                        />
                        <Select 
                          label="एम्बुलेन्स सेवा प्रतिवेदन तयार गर्ने" 
                          options={userOptions} 
                          value={localSettings.ambulanceSewaUserId || ''} 
                          onChange={(e) => handleChange('ambulanceSewaUserId', e.target.value)} 
                        />
                        <Select 
                          label="खोप अभियान प्रतिवेदन तयार गर्ने" 
                          options={userOptions} 
                          value={localSettings.khopReportPreparerUserId || ''} 
                          onChange={(e) => handleChange('khopReportPreparerUserId', e.target.value)} 
                        />
                        <Select 
                          label="भिटामिन ए तथा जुकाको औषधि वितरण प्रतिवेदन तयार गर्ने" 
                          options={userOptions} 
                          value={localSettings.vitaminAReportPreparerUserId || ''} 
                          onChange={(e) => handleChange('vitaminAReportPreparerUserId', e.target.value)} 
                        />
                        <Select 
                          label="भिटामिन ए तथा जुकाको औषधि वितरण प्रतिवेदन प्रमाणित गर्ने" 
                          options={userOptions} 
                          value={localSettings.vitaminAReportCertifierUserId || ''} 
                          onChange={(e) => handleChange('vitaminAReportCertifierUserId', e.target.value)} 
                        />
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* 12. Subscription */}
          {(!settingsSearchQuery.trim() ? generalSubTab === 'subscription' : ["subscription","सदस्यता","expiry","नवीकरण","सक्रिय","संस्थागत","active"].some(t => t.toLowerCase().includes(settingsSearchQuery.toLowerCase().trim()) || settingsSearchQuery.toLowerCase().trim().includes(t.toLowerCase()))) && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Success Notification Banner */}
              {subSuccessMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-start gap-3 shadow-xs animate-in slide-in-from-top-2">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-nepali text-sm font-semibold">
                    {subSuccessMsg}
                  </div>
                  <button type="button" onClick={() => setSubSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 p-1">
                    <X size={16} />
                  </button>
                </div>
              )}

              {currentUser?.role === 'SUPER_ADMIN' ? (
                <div className="space-y-6">
                  {/* Super Admin Control Panel */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 font-nepali">
                          <ShieldCheck size={20} className="text-amber-600" />
                          संस्थागत सदस्यता तथा एप सक्रियता व्यवस्थापन (Institutional Subscription & Activation)
                        </h3>
                        <p className="text-xs text-slate-500 font-nepali mt-1">
                          सुपर एडमिनले कुनै पनि दर्ता भएका संस्थाको सम्पूर्ण प्रयोगकर्ताहरूको लागि एप सक्रिय गर्न तथा सदस्यता म्याद तोक्न सक्नुहुन्छ।
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold font-nepali self-start sm:self-auto flex items-center gap-1.5">
                        <Sparkles size={13} className="text-amber-600" /> सुपर एडमिन नियन्त्रण
                      </span>
                    </div>

                    {/* Organization Selection Box */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                      <label className="block text-xs font-bold text-slate-700 font-nepali flex items-center gap-2">
                        <Building2 size={15} className="text-primary-600" />
                        संस्था छनोट गर्नुहोस् (Select Target Organization)
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div className="md:col-span-2">
                          <select
                            value={selectedSubOrg}
                            onChange={(e) => setSelectedSubOrg(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 focus:outline-none font-nepali cursor-pointer shadow-xs"
                          >
                            {organizationList.map(org => {
                              const orgUsersCount = users.filter(u => u.organizationName === org).length;
                              return (
                                <option key={org} value={org}>
                                  🏢 {org} ({orgUsersCount} जना कर्मचारी/प्रयोगकर्ता)
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-2 bg-white text-slate-700 rounded-xl border border-slate-200 text-xs font-bold font-nepali w-full text-center shadow-2xs">
                            जम्मा कर्मचारी: <strong>{selectedOrgUsers.length}</strong> जना
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Subscription Status Toggle & Expiry Setup */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left: App Status Toggle */}
                      <div className={`p-5 rounded-2xl border transition-all ${
                        subIsActive 
                          ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 shadow-xs' 
                          : 'bg-gradient-to-br from-amber-50 to-rose-50 border-amber-200 shadow-xs'
                      }`}>
                        <div className="flex items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2.5 rounded-xl ${subIsActive ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                              <Zap size={20} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-800 font-nepali">एप सक्रियता स्थिति</h4>
                              <p className="text-xs text-slate-500 font-nepali">संस्थागत स्तरमा एप पहुँच</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold font-nepali ${
                            subIsActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {subIsActive ? 'सक्रिय (Active)' : 'निष्कृय (Inactive)'}
                          </span>
                        </div>

                        <label className="flex items-center gap-3 p-3.5 bg-white/90 rounded-xl border border-slate-200/80 cursor-pointer hover:bg-white transition-all shadow-2xs">
                          <input
                            type="checkbox"
                            checked={subIsActive}
                            onChange={(e) => setSubIsActive(e.target.checked)}
                            className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-800 font-nepali">
                              {selectedSubOrg} को लागि एप पूर्ण सक्रिय गर्नुहोस्
                            </span>
                            <span className="text-[11px] text-slate-500 font-nepali">
                              सक्रिय गर्दा यस संस्थाका फ्रिज गरिएका प्रयोगकर्ताहरू स्वतः अनफ्रिज हुनेछन्।
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Right: Expiry Date & Days Remaining */}
                      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-xs font-bold text-slate-700 font-nepali flex items-center gap-1.5">
                            <CalendarDays size={16} className="text-primary-600" />
                            सदस्यता समाप्त हुने मिति (Expiry Date)
                          </label>
                          {(() => {
                            const days = getDaysRemaining(subExpiryDate);
                            if (days === null) {
                              return <span className="text-[11px] text-slate-400 font-nepali">मिति नतोकिएको</span>;
                            }
                            if (days <= 0) {
                              return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 font-nepali">म्याद सकिएको</span>;
                            }
                            if (days <= 30) {
                              return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 font-nepali">बाँकी: {days} दिन</span>;
                            }
                            return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 font-nepali">बाँकी: {days} दिन</span>;
                          })()}
                        </div>

                        <div>
                          <input
                            type="date"
                            value={subExpiryDate}
                            onChange={(e) => setSubExpiryDate(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-2xs"
                          />
                        </div>

                        {/* Quick Duration Buttons */}
                        <div>
                          <p className="text-[11px] font-bold text-slate-500 font-nepali mb-2">द्रुत अवधि थप गर्नुहोस् (Quick Presets):</p>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                            {[
                              { label: '+१ महिना', days: 30 },
                              { label: '+३ महिना', days: 90 },
                              { label: '+६ महिना', days: 180 },
                              { label: '+१ वर्ष', days: 365 },
                              { label: '+२ वर्ष', days: 730 },
                            ].map(preset => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => handleQuickSetDuration(preset.days)}
                                className="px-2 py-1.5 bg-slate-100 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 font-nepali transition-all cursor-pointer text-center"
                              >
                                {preset.label}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={handleSetLifetime}
                              className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold font-nepali transition-all cursor-pointer text-center"
                              title="२०९९ सम्म"
                            >
                              आजीवन
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Apply Institutional Subscription Button */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/10 rounded-xl">
                          <Users size={20} className="text-amber-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold font-nepali">संस्थागत लागु गर्नुहोस् (Institutional Sync)</h4>
                          <p className="text-[11px] text-slate-300 font-nepali">
                            चयन गरिएको संस्थाका सम्पूर्ण ({selectedOrgUsers.length}) प्रयोगकर्ताहरूमा एप सक्रियता र म्याद तुरुन्त लागु हुनेछ।
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={subApplying}
                        onClick={handleApplyInstitutionalSubscription}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-xl text-xs font-nepali transition-all shadow-md cursor-pointer disabled:opacity-50"
                      >
                        {subApplying ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                        {subApplying ? 'लागु हुँदैछ...' : 'संस्थागत रूपमा लागु गर्नुहोस्'}
                      </button>
                    </div>

                    {/* Expandable Users List for Selected Organization */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowOrgUsersList(!showOrgUsersList)}
                        className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-bold text-slate-700 font-nepali flex items-center gap-2">
                          <Users size={15} className="text-primary-600" />
                          संस्थाका दर्ता भएका प्रयोगकर्ताहरू ({selectedOrgUsers.length} जना)
                        </span>
                        <span className="text-xs text-slate-400 font-nepali">
                          {showOrgUsersList ? 'सूची लुकाउनुहोस् ▲' : 'सूची हेर्नुहोस् ▼'}
                        </span>
                      </button>

                      {showOrgUsersList && (
                        <div className="p-3 bg-white divide-y divide-slate-100 max-h-64 overflow-y-auto">
                          {selectedOrgUsers.length === 0 ? (
                            <p className="text-xs text-slate-400 font-nepali py-3 text-center">यस संस्थामा कुनै पनि प्रयोगकर्ता दर्ता भएका छैनन्।</p>
                          ) : (
                            selectedOrgUsers.map(u => (
                              <div key={u.id} className="py-2.5 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                                    {u.fullName?.charAt(0) || u.username?.charAt(0) || 'U'}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-800 font-nepali">{u.fullName || u.username}</span>
                                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-nepali">@{u.username}</span>
                                      <span className="text-[10px] px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded font-bold">{u.role}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-nepali">{u.designation || 'पद नखुलेको'} {u.phoneNumber ? `| 📞 ${u.phoneNumber}` : ''}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-nepali ${
                                    u.isSubscribed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}>
                                    {u.isSubscribed ? 'सक्रिय' : 'निष्कृय'}
                                  </span>
                                  {u.isFrozen && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-nepali">
                                      फ्रिज
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Non-Super Admin Read-Only Card */
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2 font-nepali">
                    <ShieldCheck size={18} className="text-amber-600" />
                    संस्थागत सदस्यता स्थिति (Subscription Status)
                  </h3>
                  <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-nepali ${
                          localSettings.isSubscribed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {localSettings.isSubscribed ? 'सक्रिय सदस्यता (Active Subscription)' : 'परीक्षण / नवीकरण आवश्यक'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-2 font-nepali">
                        समाप्त हुने मिति: <strong>{localSettings.subscriptionExpiryDate ? new Date(localSettings.subscriptionExpiryDate).toLocaleDateString() : 'नतोकिएको'}</strong>
                      </p>
                      {(() => {
                        const days = getDaysRemaining(localSettings.subscriptionExpiryDate);
                        if (days !== null) {
                          return (
                            <p className="text-[11px] text-slate-500 font-nepali mt-1">
                              बाँकी अवधि: <strong>{days > 0 ? `${days} दिन` : 'म्याद सकिएको'}</strong>
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-nepali">
                    💡 सदस्यता नवीकरण वा संस्थागत एप सक्रियताको लागि कृपया सिस्टम सुपर एडमिन (Super Admin) सँग सम्पर्क गर्नुहोस्।
                  </div>
                </div>
              )}
            </div>
          )}

            {/* Save & Reset Action Bar */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-slate-700 font-nepali">सेटिङ सुरक्षित गर्नुहोस्</p>
                <p className="text-[11px] text-slate-400 font-nepali">तपाईंले गरेका सम्पूर्ण परिवर्तनहरू डाटाबेसमा तत्काल सुरक्षित हुनेछन्।</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-rose-600 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-50 transition-all cursor-pointer font-nepali shadow-xs"
                >
                  <RotateCcw size={15} /> रिसेट (Reset)
                </button>
                {currentUser?.hasSaveAccess !== false && (
                  <button
                    type="submit"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all cursor-pointer font-nepali shadow-sm"
                  >
                    {isSaved ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Save size={16} />}
                    {isSaved ? 'सुरक्षित भयो' : 'सेटिङ सुरक्षित गर्नुहोस्'}
                  </button>
                )}
              </div>
            </div>
        </form>
      )}

      {activeTab === 'menu' && (
        <MenuManagement currentConfig={localSettings.menuConfig} onSave={handleSaveMenuConfig} />
      )}

      {activeTab === 'nagarik_badapatra' && (
          <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b pb-4">
                      <div>
                          <h3 className="text-lg font-bold text-slate-800 font-nepali flex items-center gap-2">
                              <ClipboardList className="text-primary-600" size={20} /> नागरिक बडापत्र व्यवस्थापन
                          </h3>
                          <p className="text-xs text-slate-500">तपाईंको संस्थाले प्रदान गर्ने सेवाहरूको विवरण (Citizen Charter)</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                          <button 
                              onClick={() => setShowQrModal(true)}
                              className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm"
                          >
                              <QrCode size={18} /> QR पोस्टर
                          </button>
                          <button 
                              onClick={() => {
                                  setEditingService(null);
                                  setServiceForm({ category: 'admin' });
                                  setShowServiceModal(true);
                              }}
                              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors shadow-sm"
                          >
                              <Plus size={18} /> नयाँ सेवा थप्नुहोस्
                          </button>
                      </div>
                  </div>

                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-y border-slate-200">
                              <tr>
                                  <th className="px-4 py-3 font-nepali">सेवा (Service)</th>
                                  <th className="px-4 py-3 font-nepali">शाखा (Department)</th>
                                  <th className="px-4 py-3 font-nepali">समय (Time)</th>
                                  <th className="px-4 py-3 font-nepali text-center">दस्तुर (Fee)</th>
                                  <th className="px-4 py-3 font-nepali">कर्मचारी (Officer)</th>
                                  <th className="px-4 py-3 font-nepali text-center">कार्य (Action)</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {displayedServices.length > 0 ? (
                                  displayedServices.map((svc) => (
                                      <tr key={svc.id} className="hover:bg-slate-50/80 transition-colors group">
                                          <td className="px-4 py-4">
                                              <div className="font-bold text-slate-800 font-nepali">{svc.serviceNep}</div>
                                              <div className="text-[10px] text-slate-400 font-mono uppercase">{svc.category}</div>
                                          </td>
                                          <td className="px-4 py-4 text-slate-600 font-nepali">{svc.departmentNep}</td>
                                          <td className="px-4 py-4 text-slate-600 font-nepali">{svc.timeNep}</td>
                                          <td className="px-4 py-4 text-slate-600 font-nepali text-center">{svc.feeNep}</td>
                                          <td className="px-4 py-4 text-slate-600 font-nepali">
                                              <div>{svc.officerNep}</div>
                                              <div className="text-[10px] text-slate-400">कक्ष नं: {svc.roomNo}</div>
                                          </td>
                                          <td className="px-4 py-4">
                                              <div className="flex justify-center items-center gap-1">
                                                  <button 
                                                      onClick={() => {
                                                          setEditingService(svc);
                                                          setServiceForm(svc);
                                                          setShowServiceModal(true);
                                                      }}
                                                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                      title="सम्पादन गर्नुहोस्"
                                                  >
                                                      <Edit2 size={14} />
                                                  </button>
                                                  <button 
                                                      onClick={() => handleDeleteService(svc)}
                                                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                      title="मेटाउनुहोस्"
                                                  >
                                                      <Trash2 size={14} />
                                                  </button>
                                                  {(svc.office !== currentUser.organizationName) && (
                                                      <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">साझा</span>
                                                  )}
                                              </div>
                                          </td>
                                      </tr>
                                  ))
                              ) : (
                                  <tr>
                                      <td colSpan={6} className="px-4 py-16 text-center">
                                          {isServicesLoading ? (
                                              <div className="flex flex-col items-center gap-2">
                                                  <RefreshCw className="animate-spin text-slate-300" size={24} />
                                                  <p className="text-slate-400 text-xs">लोड हुँदैछ...</p>
                                              </div>
                                          ) : (
                                              <p className="text-slate-400 text-xs italic">कुनै सेवा फेला परेन।</p>
                                          )}
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {showServiceModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
                      <h3 className="font-bold text-slate-800 font-nepali flex items-center gap-2">
                          {editingService ? 'सेवा सम्पादन गर्नुहोस्' : 'नयाँ सेवा थप्नुहोस्'}
                      </h3>
                      <button onClick={() => setShowServiceModal(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={20} />
                      </button>
                  </div>
                  <form onSubmit={handleSaveService} className="flex flex-col overflow-hidden">
                      <div className="p-6 overflow-y-auto">
                          <div className="grid md:grid-cols-2 gap-4">
                              {mappedOfficeNames.length > 1 && (
                                  <div className="md:col-span-2">
                                      <Select 
                                          label="कुन कार्यालयको लागि थप्ने? (Select Office)" 
                                          options={Array.from(new Set(mappedOfficeNames)).map(name => ({ id: name, value: name, label: name }))} 
                                          value={serviceForm.office || mappedOfficeNames[0]} 
                                          onChange={e => setServiceForm({...serviceForm, office: e.target.value})} 
                                          required
                                      />
                                  </div>
                              )}
                              <Input 
                                  label="सेवाको नाम (नेपाली)" 
                                  value={serviceForm.serviceNep || ''} 
                                  onChange={e => setServiceForm({...serviceForm, serviceNep: e.target.value})} 
                                  required 
                              />
                              <Input 
                                  label="सेवाको नाम (English)" 
                                  value={serviceForm.serviceEng || ''} 
                                  onChange={e => setServiceForm({...serviceForm, serviceEng: e.target.value})} 
                              />
                              <Input 
                                  label="शाखा/इकाई" 
                                  value={serviceForm.departmentNep || ''} 
                                  onChange={e => setServiceForm({...serviceForm, departmentNep: e.target.value})} 
                              />
                              <Select 
                                  label="श्रेणी (Category)" 
                                  options={[
                                      { id: 'admin', value: 'admin', label: 'प्रशासन (Admin)' },
                                      { id: 'opd', value: 'opd', label: 'OPD' },
                                      { id: 'maternity', value: 'maternity', label: 'प्रसुती (Maternity)' },
                                      { id: 'immunization', value: 'immunization', label: 'खोप (Immunization)' },
                                      { id: 'pharmacy', value: 'pharmacy', label: 'फार्मेसी (Pharmacy)' },
                                      { id: 'lab', value: 'lab', label: 'प्रयोगशाला (Lab)' },
                                      { id: 'emergency', value: 'emergency', label: 'आकस्मिक (Emergency)' }
                                  ]} 
                                  value={serviceForm.category || 'admin'} 
                                  onChange={e => setServiceForm({...serviceForm, category: e.target.value as any})} 
                              />
                              <Input 
                                  label="लाग्ने समय" 
                                  value={serviceForm.timeNep || ''} 
                                  onChange={e => setServiceForm({...serviceForm, timeNep: e.target.value})} 
                              />
                              <Input 
                                  label="दस्तुर (Fee)" 
                                  value={serviceForm.feeNep || ''} 
                                  onChange={e => setServiceForm({...serviceForm, feeNep: e.target.value})} 
                              />
                              <Input 
                                  label="जिम्मेवार कर्मचारी" 
                                  value={serviceForm.officerNep || ''} 
                                  onChange={e => setServiceForm({...serviceForm, officerNep: e.target.value})} 
                              />
                              <Input 
                                  label="कक्ष नं." 
                                  value={serviceForm.roomNo || ''} 
                                  onChange={e => setServiceForm({...serviceForm, roomNo: e.target.value})} 
                              />
                          </div>
                          <div className="mt-4">
                              <label className="block text-xs font-bold text-slate-600 mb-1 font-nepali">आवश्यक कागजातहरू</label>
                              <textarea 
                                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none min-h-[100px]"
                                  value={serviceForm.docsNep || ''}
                                  onChange={e => setServiceForm({...serviceForm, docsNep: e.target.value})}
                                  placeholder="कागजातहरूको सूची..."
                              />
                          </div>
                      </div>
                      <div className="p-4 flex justify-end gap-3 border-t bg-slate-50 shrink-0">
                          <button 
                              type="button" 
                              onClick={() => setShowServiceModal(false)}
                              className="px-6 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                          >
                              रद्द गर्नुहोस्
                          </button>
                          <button 
                              type="submit"
                              className="px-8 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-all flex items-center gap-2 shadow-sm"
                          >
                              <Save size={18} /> सुरक्षित गर्नुहोस्
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {showQrModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
                      <h3 className="font-bold text-slate-800 font-nepali flex items-center gap-2">
                          <QrCode size={18} /> नागरिक बडापत्र QR पोस्टर
                      </h3>
                      <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-8 overflow-y-auto flex flex-col items-center text-center">
                      <div className="mb-6 p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm print:shadow-none print:border-0">
                          <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`https://gunaso-petika.vercel.app?office=${encodeURIComponent(currentUser.organizationName)}&view=charter`)}`}
                              alt="QR Code"
                              className="w-64 h-64"
                          />
                      </div>
                      <h4 className="text-xl font-bold text-slate-800 font-nepali mb-2">{currentUser.organizationName}</h4>
                      <p className="text-slate-600 font-nepali text-sm max-w-xs mb-8">
                          यो QR कोड स्क्यान गरेर नागरिकहरूले हाम्रो संस्थाको डिजिटल नागरिक बडापत्र हेर्न सक्नुहुन्छ।
                      </p>

                      <div className="flex flex-wrap justify-center gap-3 w-full">
                          <button 
                              onClick={() => window.print()}
                              className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-900 transition-all shadow-md"
                          >
                              <Printer size={18} /> प्रिन्ट गर्नुहोस्
                          </button>
                          <a 
                              href={`https://gunaso-petika.vercel.app?office=${encodeURIComponent(currentUser.organizationName)}&view=charter`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all"
                          >
                              <ExternalLink size={18} /> लिङ्क खोल्नुहोस्
                          </a>
                      </div>
                  </div>
                  <div className="p-4 bg-slate-50 border-t text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Generated for Digital Sujhab Petika</p>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};