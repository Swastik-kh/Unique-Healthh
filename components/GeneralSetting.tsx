import React, { useState, useEffect, useMemo } from 'react';
import { Save, Building2, Globe, Phone, Mail, FileText, Percent, Calendar, RotateCcw, Image, CheckCircle2, Lock, ListChecks, Plus, Trash2, GripVertical, Sliders, UserCog, MapPinned, MessageSquare, Key, Server, Send, Eye, EyeOff, Coins, RefreshCw, AlertCircle, Wallet, ClipboardList, Edit2, X, QrCode, ExternalLink, Printer } from 'lucide-react';
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
}

export const GeneralSetting: React.FC<GeneralSettingProps> = ({ currentUser, settings, onUpdateSettings, onUpdateGlobalDhis2Mappings, users, activeOrgName }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [newService, setNewService] = useState('');
  const [showSmsApiKey, setShowSmsApiKey] = useState(false);
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(localSettings);
    
    // If superadmin, also update global DHIS2 mappings
    if (currentUser.role === 'SUPER_ADMIN' && onUpdateGlobalDhis2Mappings) {
        onUpdateGlobalDhis2Mappings({
            dhis2DatasetMappings: localSettings.dhis2DatasetMappings,
            dhis2CellMappings: localSettings.dhis2CellMappings
        });
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
        <form onSubmit={handleSave} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
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
            
            {/* एम्बुलेन्स सेवा र भाडा दर सेटिङ */}
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

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><Globe size={18} className="text-primary-600"/>प्रणाली कन्फिगरेसन</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <Select label="सक्रिय आर्थिक वर्ष" options={FISCAL_YEARS} value={localSettings.activeFiscalYear} onChange={(e) => handleChange('activeFiscalYear', e.target.value)} icon={<Calendar size={16} />} />
                    <Input label="डिफल्ट VAT दर (%)" type="number" value={localSettings.defaultVatRate} onChange={(e) => handleChange('defaultVatRate', e.target.value)} icon={<Percent size={16} />} />
                </div>
                {currentUser?.role === 'SUPER_ADMIN' && (
                    <div className="mt-6 border-t pt-5">
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
                )}
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                    {(() => {
                        const orgUsers = users.filter(u => u.organizationName === currentUser.organizationName);
                        const userOptions = orgUsers.map(u => ({ id: u.id, label: u.fullName, value: u.id }));
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

        <div className="space-y-6">
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
            <div className="bg-slate-50 p-6 rounded-xl border shadow-inner"><div className="flex flex-col gap-3">
              {currentUser?.hasSaveAccess !== false && (
                <button type="submit" className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-3 rounded-lg font-medium hover:bg-slate-900">{isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}{isSaved ? 'सुरक्षित भयो' : 'सेटिङ सुरक्षित गर्नुहोस्'}</button>
              )}
              <button type="button" onClick={handleReset} className="w-full flex items-center justify-center gap-2 bg-white text-red-600 border border-red-200 py-3 rounded-lg font-medium hover:bg-red-50"><RotateCcw size={18} />रिसेट (Reset)</button></div><p className="text-xs text-center text-slate-400 mt-4">Last updated: {new Date().toLocaleDateString()}</p></div>
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