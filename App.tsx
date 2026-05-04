
import React, { useState, useEffect, useMemo } from 'react';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { ECGWave } from './components/ECGWave';
import { APP_NAME, ORG_NAME, AVAILABLE_SERVICES } from './constants';
import { Landmark, ShieldCheck, AlertCircle, Database, ShieldAlert, Lock, Unlock } from 'lucide-react';
import { 
  User, OrganizationSettings, MagFormEntry, RabiesPatient, PurchaseOrderEntry, 
  IssueReportEntry, FirmEntry, QuotationEntry, InventoryItem, Store, StockEntryRequest, 
  DakhilaPratibedanEntry, ReturnEntry, MarmatEntry, DhuliyaunaEntry, LogBookEntry, 
  DakhilaItem, TBPatient, GarbhawatiPatient, ChildImmunizationRecord, LeaveApplication, LeaveStatus, LeaveBalance, Darta, Chalani, BharmanAdeshEntry,
  GarbhawotiRecord, PrasutiRecord, ServiceSeekerRecord, OPDRecord, EmergencyRecord, CBIMNCIRecord, BillingRecord, ServiceItem, LabReport, DispensaryRecord, PariwarSewaRecord, XRayRecord, ECGRecord, USGRecord, PhysiotherapyRecord, IPDRecord, ItemEntry, InterFacilityRequest
} from './types';
import { db } from './firebase';
import { ref, onValue, set, remove, update, get, Unsubscribe, off, push } from "firebase/database";
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

const INITIAL_SETTINGS: OrganizationSettings = {
    orgNameNepali: 'Smart Inventory System',
    orgNameEnglish: 'Smart Inventory System',
    subTitleNepali: 'जिन्सी व्यवस्थापन प्रणाली',
    address: 'City, Nepal',
    phone: '01-XXXXXXX',
    email: 'info@smartinventory.com',
    website: 'www.smartinventory.com',
    panNo: 'XXXXXXXXX',
    defaultVatRate: '13',
    activeFiscalYear: '2082/083',
    enableEnglishDate: 'no',
    logoUrl: '',
    allServiceOptions: AVAILABLE_SERVICES
};

const DEFAULT_ADMIN: User = {
    id: 'superadmin',
    username: 'admin',
    password: 'admin',
    role: 'SUPER_ADMIN',
    organizationName: 'Smart Inventory HQ',
    fullName: 'Administrator',
    designation: 'System Manager',
    phoneNumber: '98XXXXXXXX',
    allowedMenus: ['dashboard', 'inventory', 'settings', 'services', 'khop_sewa', 'emergency_sewa', 'cbimnci_sewa', 'conference']
};

const App: React.FC = () => {
  const [allUsers, setAllUsers] = useState<User[]>([DEFAULT_ADMIN]); 
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeOrgName, setActiveOrgName] = useState<string>('');
  const [currentFiscalYear, setCurrentFiscalYear] = useState<string>('2082/083');
  const [generalSettings, setGeneralSettings] = useState<OrganizationSettings>(INITIAL_SETTINGS);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isDbLocked, setIsDbLocked] = useState(false);
  
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [magForms, setMagForms] = useState<MagFormEntry[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderEntry[]>([]);
  const [issueReports, setIssueReports] = useState<IssueReportEntry[]>([]);
  const [stockEntryRequests, setStockEntryRequests] = useState<StockEntryRequest[]>([]);
  const [dakhilaReports, setDakhilaReports] = useState<DakhilaPratibedanEntry[]>([]);
  const [returnEntries, setReturnEntries] = useState<ReturnEntry[]>([]);
  const [firms, setFirms] = useState<FirmEntry[]>([]);
  const [quotations, setQuotations] = useState<QuotationEntry[]>([]);
  const [rabiesPatients, setRabiesPatients] = useState<RabiesPatient[]>([]);
  const [tbPatients, setTbPatients] = useState<TBPatient[]>([]); 
  const [garbhawatiPatients, setGarbhawatiPatients] = useState<GarbhawatiPatient[]>([]);
  const [bachhaImmunizationRecords, setBachhaImmunizationRecords] = useState<ChildImmunizationRecord[]>([]);
  const [marmatEntries, setMarmatEntries] = useState<MarmatEntry[]>([]);
  const [dhuliyaunaEntries, setDhuliyaunaEntries] = useState<DhuliyaunaEntry[]>([]);
  const [logBookEntries, setLogBookEntries] = useState<LogBookEntry[]>([]);
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [dartaEntries, setDartaEntries] = useState<Darta[]>([]);
  const [chalaniEntries, setChalaniEntries] = useState<Chalani[]>([]);
  const [bharmanAdeshEntries, setBharmanAdeshEntries] = useState<BharmanAdeshEntry[]>([]);
  const [garbhawotiRecords, setGarbhawotiRecords] = useState<GarbhawotiRecord[]>([]);
  const [prasutiRecords, setPrasutiRecords] = useState<PrasutiRecord[]>([]);
  const [serviceSeekerRecords, setServiceSeekerRecords] = useState<ServiceSeekerRecord[]>([]);
  const [opdRecords, setOpdRecords] = useState<OPDRecord[]>([]);
  const [dispensaryRecords, setDispensaryRecords] = useState<DispensaryRecord[]>([]);
  const [emergencyRecords, setEmergencyRecords] = useState<EmergencyRecord[]>([]);
  const [cbimnciRecords, setCbimnciRecords] = useState<CBIMNCIRecord[]>([]);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [pariwarSewaRecords, setPariwarSewaRecords] = useState<PariwarSewaRecord[]>([]);
  const [xrayRecords, setXrayRecords] = useState<XRayRecord[]>([]);
  const [ecgRecords, setEcgRecords] = useState<ECGRecord[]>([]);
  const [usgRecords, setUsgRecords] = useState<USGRecord[]>([]);
  const [physiotherapyRecords, setPhysiotherapyRecords] = useState<PhysiotherapyRecord[]>([]);
  const [ipdRecords, setIpdRecords] = useState<IPDRecord[]>([]);
  const [interFacilityRequests, setInterFacilityRequests] = useState<InterFacilityRequest[]>([]);
  const [itemList, setItemList] = useState<ItemEntry[]>([]);
  
  // Financial State
  const [financialPrograms, setFinancialPrograms] = useState<any[]>([]);
  const [listedParties, setListedParties] = useState<any[]>([]);
  const [financialTransactions, setFinancialTransactions] = useState<any[]>([]);
  const [partyPayments, setPartyPayments] = useState<any[]>([]);

  const managedOrgs = useMemo(() => {
      if (currentUser?.role !== 'HEALTH_SECTION') return [];
      const orgs = allUsers
        .filter(u => u.parentId === currentUser.id && u.role === 'ADMIN')
        .map(u => u.organizationName);
      return Array.from(new Set([currentUser.organizationName, ...orgs]));
  }, [allUsers, currentUser]);

  useEffect(() => {
    const connectedRef = ref(db, ".info/connected");
    const onConnect = onValue(connectedRef, (snap) => {
        setIsDbConnected(snap.val() === true);
    });

    const usersRef = ref(db, 'users');
    const unsubUsers = onValue(usersRef, (snap) => {
        try {
            const data = snap.val();
            if (data) {
                const userList = Object.keys(data).map(key => ({ ...data[key], id: key }));
                const hasAdmin = userList.some(u => u.username === 'admin');
                setAllUsers(hasAdmin ? userList : [DEFAULT_ADMIN, ...userList]);
                setIsDbLocked(false);
                setDbError(null);
            } else {
                setAllUsers([DEFAULT_ADMIN]);
            }
        } catch (e) {
            console.error("User list parse error", e);
        }
    }, (error) => {
        if (error.message.includes("permission_denied")) {
            setIsDbLocked(true);
            setDbError("डेटाबेस एक्सेस अस्वीकृत! (Permission Denied)");
        }
    });

    return () => {
        off(connectedRef, 'value', onConnect);
        unsubUsers();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setActiveOrgName('');
      return;
    }

    if (!activeOrgName) {
      setActiveOrgName(currentUser.organizationName);
      return;
    }

    const safeOrgName = activeOrgName.trim().replace(/[.#$[\]]/g, "_");
    
    // If 'All' is selected, we need to fetch data from all managed organizations
    const isAllOrgs = activeOrgName === 'All';
    const targetOrgs = isAllOrgs ? managedOrgs : [activeOrgName];

    const unsubscribes: Unsubscribe[] = [];

    const setupOrgListener = (subPath: string, setter: Function) => {
        const orgDataMap = new Map<string, any[]>();
        
        targetOrgs.forEach(orgName => {
            const safeName = orgName.trim().replace(/[.#$[\]]/g, "_");
            const listenerRef = ref(db, `orgData/${safeName}/${subPath}`);
            const unsub = onValue(listenerRef, (snap) => {
                const data = snap.val();
                const orgData = data ? Object.keys(data).map(key => ({ ...data[key], id: key })) : [];
                orgDataMap.set(orgName, orgData);
                
                // Aggregate all data
                const aggregatedData = Array.from(orgDataMap.values()).flat();
                setter(aggregatedData);
            }, (err) => {
                if (err.message.includes("permission_denied")) {
                    setDbError(`डेटा रिड पर्मिसन छैन: ${subPath}`);
                }
            });
            unsubscribes.push(unsub);
        });
    };

    // For settings, we just take the first organization's settings if 'All' is selected, 
    // or we could aggregate them if needed. For now, take the first one.
    const settingsOrg = isAllOrgs ? targetOrgs[0] : activeOrgName;
    const safeSettingsOrg = settingsOrg.trim().replace(/[.#$[\]]/g, "_");

    onValue(ref(db, `orgData/${safeSettingsOrg}/settings`), (snap) => {
        if (snap.exists()) setGeneralSettings(snap.val());
        else {
            const firstSettings = { ...INITIAL_SETTINGS, orgNameNepali: settingsOrg, orgNameEnglish: settingsOrg };
            set(ref(db, `orgData/${safeSettingsOrg}/settings`), firstSettings).catch(() => {});
            setGeneralSettings(firstSettings);
        }
    });

    setupOrgListener('inventory', setInventoryItems);
    setupOrgListener('stores', setStores);
    setupOrgListener('magForms', setMagForms);
    setupOrgListener('purchaseOrders', setPurchaseOrders);
    setupOrgListener('issueReports', setIssueReports);
    setupOrgListener('stockRequests', setStockEntryRequests);
    setupOrgListener('dakhilaReports', setDakhilaReports);
    setupOrgListener('returnEntries', setReturnEntries);
    setupOrgListener('firms', setFirms);
    setupOrgListener('quotations', setQuotations);
    setupOrgListener('rabiesPatients', setRabiesPatients);
    setupOrgListener('tbPatients', setTbPatients); 
    setupOrgListener('garbhawatiPatients', setGarbhawatiPatients);
    setupOrgListener('bachhaImmunizationRecords', setBachhaImmunizationRecords);
    setupOrgListener('marmatEntries', setMarmatEntries);
    setupOrgListener('disposalEntries', setDhuliyaunaEntries);
    setupOrgListener('logBook', setLogBookEntries);
    setupOrgListener('leaveApplications', setLeaveApplications);
    setupOrgListener('leaveBalances', setLeaveBalances);
    setupOrgListener('dartaEntries', setDartaEntries);
    setupOrgListener('chalaniEntries', setChalaniEntries);
    setupOrgListener('bharmanAdeshEntries', setBharmanAdeshEntries);
    setupOrgListener('garbhawotiRecords', setGarbhawotiRecords);
    setupOrgListener('prasutiRecords', setPrasutiRecords);
    setupOrgListener('serviceSeekerRecords', setServiceSeekerRecords);
    setupOrgListener('opdRecords', setOpdRecords);
    setupOrgListener('dispensaryRecords', setDispensaryRecords);
    setupOrgListener('emergencyRecords', setEmergencyRecords);
    setupOrgListener('cbimnciRecords', setCbimnciRecords);
    setupOrgListener('billingRecords', setBillingRecords);
    setupOrgListener('serviceItems', setServiceItems);
    setupOrgListener('labReports', setLabReports);
    setupOrgListener('pariwarSewaRecords', setPariwarSewaRecords);
    setupOrgListener('xrayRecords', setXrayRecords);
    setupOrgListener('ecgRecords', setEcgRecords);
    setupOrgListener('usgRecords', setUsgRecords);
    setupOrgListener('physiotherapyRecords', setPhysiotherapyRecords);
    setupOrgListener('ipdRecords', setIpdRecords);
    setupOrgListener('itemList', setItemList);

    // Financial Listeners
    setupOrgListener('financialPrograms', setFinancialPrograms);
    setupOrgListener('listedParties', setListedParties);
    setupOrgListener('financialTransactions', setFinancialTransactions);
    setupOrgListener('partyPayments', setPartyPayments);

    // Global Inter-Facility Requests Listener
    const globalRequestsRef = ref(db, 'interFacilityRequests');
    const unsubGlobalRequests = onValue(globalRequestsRef, (snap) => {
        const data = snap.val();
        const requests = data ? Object.keys(data).map(key => ({ ...data[key], id: key })) : [];
        setInterFacilityRequests(requests);
    }, (err) => {
        console.error("Global requests listener error", err);
    });

    unsubscribes.push(unsubGlobalRequests);

    return () => unsubscribes.forEach(unsub => unsub());
  }, [currentUser, activeOrgName]);

  useEffect(() => {
    if (currentUser) {
      const updatedUser = allUsers.find(u => u.id === currentUser.id);
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
        setCurrentUser(updatedUser);
      }
    }
  }, [allUsers, currentUser]);

  const handleAddGlobal = async (sectionId: string, data: any) => {
    const dbRef = ref(db, sectionId);
    const newRef = push(dbRef);
    await set(newRef, { ...data, id: newRef.key });
  };

  const handleUpdateGlobal = async (sectionId: string, data: any) => {
    const dbRef = ref(db, `${sectionId}/${data.id}`);
    await set(dbRef, data);
  };

  const handleUpdateReadNotifications = async (userId: string, readIds: string[]) => {
    try {
      await update(ref(db, `users/${userId}`), { readNotifications: readIds });
    } catch (error) {
      console.error("Error updating read notifications", error);
    }
  };

  const handleLoginSuccess = (user: User, fiscalYear: string) => {
    setCurrentUser(user);
    setActiveOrgName(user.organizationName);
    setCurrentFiscalYear(fiscalYear);
    localStorage.removeItem('smart_inv_active_item');
  };

  const getOrgRef = (subPath: string) => {
      const safeOrgName = activeOrgName.trim().replace(/[.#$[\\]]/g, "_") || "unknown";
      return ref(db, `orgData/${safeOrgName}/${subPath}`);
  };

  const handleAddLeaveApplication = async (app: LeaveApplication) => {
      if (!currentUser) return;
      try {
          const orgRef = getOrgRef('leaveApplications');
          const newRef = push(orgRef);
          await set(newRef, { ...app, id: newRef.key });
      } catch (error) {
          alert("बिदा आवेदन सुरक्षित गर्न सकिएन।");
      }
  };

  const handleSaveLeaveBalance = async (balance: LeaveBalance) => {
      if (!currentUser) return;
      try {
          await set(getOrgRef(`leaveBalances/${balance.id}`), balance);
      } catch (error) {
          console.error("Error saving leave balance", error);
          alert("सञ्चित बिदा विवरण सुरक्षित गर्न सकिएन।");
      }
  };

  const handleSaveDarta = async (darta: Darta) => {
    if (!currentUser) return;
    try {
      await set(getOrgRef(`dartaEntries/${darta.id}`), darta);
    } catch (error) { 
      alert("दर्ता सुरक्षित गर्न सकिएन।");
    }
  };

  const handleSaveChalani = async (chalani: Chalani) => {
    if (!currentUser) return;
    try {
      await set(getOrgRef(`chalaniEntries/${chalani.id}`), chalani);
    } catch (error) { 
      alert("चलानी सुरक्षित गर्न सकिएन।");
    }
  };

  const handleSaveBharmanAdesh = async (entry: BharmanAdeshEntry) => {
    if (!currentUser) return;
    try {
      await set(getOrgRef(`bharmanAdeshEntries/${entry.id}`), entry);
    } catch (error) { 
      alert("भ्रमण आदेश सुरक्षित गर्न सकिएन।");
    }
  };

  const handleDeleteDarta = async (id: string) => {
    if (!currentUser) return;
    try {
      await remove(getOrgRef(`dartaEntries/${id}`));
    } catch (error) {
      alert("दर्ता हटाउन सकिएन।");
    }
  };

  const handleDeleteChalani = async (id: string) => {
    if (!currentUser) return;
    try {
      await remove(getOrgRef(`chalaniEntries/${id}`));
    } catch (error) {
      alert("चलानी हटाउन सकिएन।");
    }
  };

  const handleDeleteBharmanAdesh = async (id: string) => {
    if (!currentUser) return;
    try {
      await remove(getOrgRef(`bharmanAdeshEntries/${id}`));
    } catch (error) {
      alert("भ्रमण आदेश हटाउन सकिएन।");
    }
  };

  const handleSaveGarbhawotiRecord = async (record: GarbhawotiRecord) => {
    if (!currentUser) return;
    try {
      await set(getOrgRef(`garbhawotiRecords/${record.id}`), record);
    } catch (error) {
      alert("गर्भवती रेकर्ड सुरक्षित गर्न सकिएन।");
    }
  };

  const handleDeleteGarbhawotiRecord = async (id: string) => {
    if (!currentUser) return;
    try {
      await remove(getOrgRef(`garbhawotiRecords/${id}`));
    } catch (error) {
      alert("गर्भवती रेकर्ड हटाउन सकिएन।");
    }
  };

  const handleSavePrasutiRecord = async (record: PrasutiRecord) => {
    if (!currentUser) return;
    try {
      await set(getOrgRef(`prasutiRecords/${record.id}`), record);
    } catch (error) {
      alert("प्रसूति रेकर्ड सुरक्षित गर्न सकिएन।");
    }
  };

  const handleDeletePrasutiRecord = async (id: string) => {
    if (!currentUser) return;
    try {
      await remove(getOrgRef(`prasutiRecords/${id}`));
    } catch (error) {
      alert("प्रसूति रेकर्ड हटाउन सकिएन।");
    }
  };

  const handleSaveServiceSeekerRecord = async (record: ServiceSeekerRecord) => {
    if (!currentUser) return;
    try {
      await set(getOrgRef(`serviceSeekerRecords/${record.id}`), record);
    } catch (error) {
      alert("सेवाग्राही दर्ता सुरक्षित गर्न सकिएन।");
    }
  };

  const handleDeleteServiceSeekerRecord = async (id: string) => {
    if (!currentUser) return;
    try {
      await remove(getOrgRef(`serviceSeekerRecords/${id}`));
    } catch (error) {
      alert("सेवाग्राही दर्ता हटाउन सकिएन।");
    }
  };

  const handleSaveOPDRecord = async (record: OPDRecord) => {
    if (!currentUser) return;
    try {
      await set(getOrgRef(`opdRecords/${record.id}`), record);
    } catch (error) {
      alert("OPD रेकर्ड सुरक्षित गर्न सकिएन।");
    }
  };

  const handleDeleteOPDRecord = async (id: string) => {
    if (!currentUser) return;
    try {
      await remove(getOrgRef(`opdRecords/${id}`));
    } catch (error) {
      alert("OPD रेकर्ड हटाउन सकिएन।");
    }
  };

  const handleSaveDispensaryRecord = async (record: DispensaryRecord) => {
    if (!currentUser) return;
    try {
      await set(getOrgRef(`dispensaryRecords/${record.id}`), record);
    } catch (error) {
      alert("डिस्पेन्सरी रेकर्ड सुरक्षित गर्न सकिएन।");
    }
  };

  const handleDeleteDispensaryRecord = async (id: string) => {
    if (!currentUser) return;
    try {
      await remove(getOrgRef(`dispensaryRecords/${id}`));
    } catch (error) {
      alert("डिस्पेन्सरी रेकर्ड हटाउन सकिएन।");
    }
  };

  const handleSaveEmergencyRecord = async (record: EmergencyRecord) => {
    if (!currentUser) return;
    try {
      await set(getOrgRef(`emergencyRecords/${record.id}`), record);
    } catch (error) {
      alert("Emergency रेकर्ड सुरक्षित गर्न सकिएन।");
    }
  };

  const handleDeleteEmergencyRecord = async (id: string) => {
    if (!currentUser) return;
    try {
      await remove(getOrgRef(`emergencyRecords/${id}`));
    } catch (error) {
      alert("Emergency रेकर्ड हटाउन सकिएन।");
    }
  };

  const handleSaveCBIMNCIRecord = async (record: CBIMNCIRecord) => {
    if (!currentUser) return;
    try {
      await set(getOrgRef(`cbimnciRecords/${record.id}`), record);
    } catch (error) {
      alert("CBIMNCI रेकर्ड सुरक्षित गर्न सकिएन।");
    }
  };

  const handleDeleteCBIMNCIRecord = async (id: string) => {
    if (!currentUser) return;
    try {
      await remove(getOrgRef(`cbimnciRecords/${id}`));
    } catch (error) {
      alert("CBIMNCI रेकर्ड हटाउन सकिएन।");
    }
  };

  const handleSaveBillingRecord = async (record: BillingRecord) => {
    if (!currentUser) return;
    try {
      await set(getOrgRef(`billingRecords/${record.id}`), record);
    } catch (error) {
      alert("बिलिङ रेकर्ड सुरक्षित गर्न सकिएन।");
    }
  };

  const handleDeleteBillingRecord = async (id: string) => {
    if (!currentUser) return;
    try {
      await remove(getOrgRef(`billingRecords/${id}`));
    } catch (error) {
      alert("बिलिङ रेकर्ड हटाउन सकिएन।");
    }
  };

  const handleSaveServiceItem = async (item: ServiceItem) => {
    if (!currentUser) return;
    try {
      await set(getOrgRef(`serviceItems/${item.id}`), item);
    } catch (error) {
      alert("सेवा सुरक्षित गर्न सकिएन।");
    }
  };

  const handleDeleteServiceItem = async (id: string) => {
    if (!currentUser) return;
    try {
      await remove(getOrgRef(`serviceItems/${id}`));
    } catch (error) {
      alert("सेवा हटाउन सकिएन।");
    }
  };

  const handleSaveLabReport = async (record: LabReport) => {
    if (!currentUser) return;
    try {
      await set(getOrgRef(`labReports/${record.id}`), record);
    } catch (error) {
      alert("ल्याब रिपोर्ट सुरक्षित गर्न सकिएन।");
    }
  };

  const handleDeleteLabReport = async (id: string) => {
    if (!currentUser) return;
    try {
      await remove(getOrgRef(`labReports/${id}`));
    } catch (error) {
      alert("ल्याब रिपोर्ट हटाउन सकिएन।");
    }
  };

  const handleSavePariwarSewaRecord = async (record: PariwarSewaRecord) => {
    if (!currentUser) return;
    try {
      await set(getOrgRef(`pariwarSewaRecords/${record.id}`), record);
    } catch (error) {
      alert("परिवार नियोजन रेकर्ड सुरक्षित गर्न सकिएन।");
    }
  };

  const handleDeletePariwarSewaRecord = async (id: string) => {
    if (!currentUser) return;
    try {
      await remove(getOrgRef(`pariwarSewaRecords/${id}`));
    } catch (error) {
      alert("परिवार नियोजन रेकर्ड हटाउन सकिएन।");
    }
  };

  const handleSaveXRayRecord = async (record: XRayRecord) => {
    if (!currentUser) return;
    try {
      await set(getOrgRef(`xrayRecords/${record.id}`), record);
    } catch (error) {
      alert("एक्स-रे रेकर्ड सुरक्षित गर्न सकिएन।");
    }
  };

  const handleDeleteXRayRecord = async (id: string) => {
    if (!currentUser) return;
    try {
      await remove(getOrgRef(`xrayRecords/${id}`));
    } catch (error) {
      alert("एक्स-रे रेकर्ड हटाउन सकिएन।");
    }
  };

  const handleSaveECGRecord = async (record: ECGRecord) => {
    if (!currentUser) return;
    try {
      await set(getOrgRef(`ecgRecords/${record.id}`), record);
    } catch (error) {
      alert("ई.सी.जी. रेकर्ड सुरक्षित गर्न सकिएन।");
    }
  };

  const handleDeleteECGRecord = async (id: string) => {
    if (!currentUser) return;
    try {
      await remove(getOrgRef(`ecgRecords/${id}`));
    } catch (error) {
      alert("ई.सी.जी. रेकर्ड हटाउन सकिएन।");
    }
  };

  const handleSaveUSGRecord = async (record: USGRecord) => {
    if (!currentUser) return;
    try {
      await set(getOrgRef(`usgRecords/${record.id}`), record);
    } catch (error) {
      alert("यु.एस.जी. रेकर्ड सुरक्षित गर्न सकिएन।");
    }
  };

  const handleDeleteUSGRecord = async (id: string) => {
    if (!currentUser) return;
    try {
      await remove(getOrgRef(`usgRecords/${id}`));
    } catch (error) {
      alert("यु.एस.जी. रेकर्ड हटाउन सकिएन।");
    }
  };

  const handleSavePhysiotherapyRecord = async (record: PhysiotherapyRecord) => {
    if (!currentUser) return;
    try {
      await set(getOrgRef(`physiotherapyRecords/${record.id}`), record);
    } catch (error) {
      alert("फिजियोथेरापी रेकर्ड सुरक्षित गर्न सकिएन।");
    }
  };

  const handleDeletePhysiotherapyRecord = async (id: string) => {
    if (!currentUser) return;
    try {
      await remove(getOrgRef(`physiotherapyRecords/${id}`));
    } catch (error) {
      alert("फिजियोथेरापी रेकर्ड हटाउन सकिएन।");
    }
  };

  const handleSaveIPDRecord = async (record: IPDRecord) => {
    if (!currentUser) return;
    try {
      await set(getOrgRef(`ipdRecords/${record.id}`), record);
    } catch (error) {
      alert("IPD रेकर्ड सुरक्षित गर्न सकिएन।");
    }
  };

  const handleDeleteIPDRecord = async (id: string) => {
    if (!currentUser) return;
    try {
      await remove(getOrgRef(`ipdRecords/${id}`));
    } catch (error) {
      alert("IPD रेकर्ड हटाउन सकिएन।");
    }
  };

  const handleUpdateLeaveStatus = async (id: string, status: LeaveStatus, rejectionReason?: string) => {
      if (!currentUser) return;
      try {
          const appRef = getOrgRef(`leaveApplications/${id}`);
          const application = leaveApplications.find(a => a.id === id);

          if (status === 'Approved' && application) {
              const balance = leaveBalances.find(b => b.userId === application.userId);
              if (balance) {
                  const calculateDuration = (start: string, end: string) => {
                      try {
                          const d1 = new Date(new NepaliDate(start).toJsDate());
                          const d2 = new Date(new NepaliDate(end).toJsDate());
                          const diffTime = Math.abs(d2.getTime() - d1.getTime());
                          return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                      } catch (e) { return 0; }
                  };

                  const duration = calculateDuration(application.startDate, application.endDate);
                  const newBalance = { ...balance };
                  
                  if (application.leaveType === 'Casual & Festival') {
                      // Deduct from Casual first, then Festival
                      let remainingToDeduct = duration;
                      
                      if (newBalance.casual >= remainingToDeduct) {
                          newBalance.casual -= remainingToDeduct;
                          remainingToDeduct = 0;
                      } else {
                          remainingToDeduct -= newBalance.casual;
                          newBalance.casual = 0;
                      }

                      if (remainingToDeduct > 0) {
                          newBalance.festival = Math.max(0, (newBalance.festival || 0) - remainingToDeduct);
                      }
                  } else if (application.leaveType === 'Sick') {
                      newBalance.sick = (newBalance.sick || 0) - duration;
                  } else if (application.leaveType === 'Home') {
                      newBalance.home = (newBalance.home || 0) - duration;
                  } else if (application.leaveType === 'Maternity') {
                      newBalance.maternity = (newBalance.maternity || 0) - duration;
                  } else if (application.leaveType === 'Kiriya') {
                      newBalance.kiriya = (newBalance.kiriya || 0) - duration;
                  } else if (application.leaveType === 'Study') {
                      newBalance.study = (newBalance.study || 0) - duration;
                  } else if (application.leaveType === 'Extraordinary') {
                      newBalance.extraordinary = (newBalance.extraordinary || 0) - duration;
                  } else if (application.leaveType === 'Other') {
                      newBalance.other = (newBalance.other || 0) - duration;
                  }

                  await set(getOrgRef(`leaveBalances/${balance.id}`), newBalance);
              }
          }

          await update(appRef, { 
              status, 
              rejectionReason: rejectionReason || null, 
              approvedBy: currentUser.fullName,
              approverDesignation: allUsers.find(u => u.id === currentUser.id)?.designation || currentUser.designation,
              approvalDate: new NepaliDate().format('YYYY-MM-DD')
          });
      } catch (error) {
          alert("बिदाको अवस्था अपडेट गर्न सकिएन।");
      }
  };

  const handleDeleteLeaveApplication = async (id: string) => {
    if (!currentUser) return;
    try {
      await remove(getOrgRef(`leaveApplications/${id}`));
    } catch (error) {
      alert("बिदा आवेदन हटाउन सकिएन।");
    }
  };

  // Auto Accrual Logic
  useEffect(() => {
      if (!currentUser || leaveBalances.length === 0) return;

      const today = new NepaliDate();
      const currentMonth = today.format('YYYY-MM');
      const currentYear = today.format('YYYY');

      const processAccruals = async () => {
          for (const balance of leaveBalances) {
              let updated = false;
              const newBalance = { ...balance };

              // Monthly Accrual for Permanent Employees ONLY
              if (balance.serviceType === 'Permanent' && balance.lastAccrualMonth !== currentMonth) {
                  newBalance.home = (newBalance.home || 0) + 2.5;
                  newBalance.sick = (newBalance.sick || 0) + 1;
                  newBalance.lastAccrualMonth = currentMonth;
                  updated = true;
              }

              // Fiscal Year Reset for Permanent Employees ONLY
              if (balance.serviceType === 'Permanent' && balance.lastFiscalYearReset !== currentYear) {
                  newBalance.casual = 6;
                  newBalance.festival = 6;
                  newBalance.lastFiscalYearReset = currentYear;
                  updated = true;
              }

              if (updated) {
                  await set(getOrgRef(`leaveBalances/${balance.id}`), newBalance);
              }
          }
      };

      processAccruals();
  }, [currentUser, leaveBalances.length]);

  const handleSaveUser = async (u: User) => {
      try {
          await set(ref(db, `users/${u.id}`), u);
      } catch (err: any) {
          alert(`त्रुटि: प्रयोगकर्ता सुरक्षित गर्न सकिएन। (${err.message})`);
          throw err;
      }
  };

  const handleDeleteUser = async (id: string) => {
      try {
          await remove(ref(db, `users/${id}`));
      } catch (err: any) {
          alert("त्रुटि: प्रयोगकर्ता मेटाउन अनुमति छैन।");
          throw err;
      }
  };

  const handleDeleteMagForm = async (formId: string) => {
      if (!currentUser) return;
      try {
          await remove(getOrgRef(`magForms/${formId}`));
      } catch (error) {
          alert("माग फारम हटाउन सकिएन।");
      }
  };

  // Financial Handlers
  const handleSaveFinancialProgram = async (program: any) => {
      if (!currentUser) return;
      try {
          const id = program.id || push(getOrgRef('financialPrograms')).key;
          await set(getOrgRef(`financialPrograms/${id}`), { ...program, id });
      } catch (error) {
          alert("कार्यक्रम सुरक्षित गर्न सकिएन।");
      }
  };

  const handleDeleteFinancialProgram = async (id: string) => {
      if (!currentUser) return;
      if (!window.confirm("के तपाईं यो कार्यक्रम हटाउन चाहनुहुन्छ?")) return;
      try {
          await remove(getOrgRef(`financialPrograms/${id}`));
      } catch (error) {
          alert("कार्यक्रम हटाउन सकिएन।");
      }
  };

  const handleSaveListedParty = async (party: any) => {
      if (!currentUser) return;
      try {
          const id = party.id || push(getOrgRef('listedParties')).key;
          const currentTotalPaid = party.totalPaidAmount || 0;
          await set(getOrgRef(`listedParties/${id}`), { ...party, id, totalPaidAmount: currentTotalPaid });
      } catch (error) {
          alert("पार्टी विवरण सुरक्षित गर्न सकिएन।");
      }
  };

  const handleDeleteListedParty = async (id: string) => {
      if (!currentUser) return;
      if (!window.confirm("के तपाईं यो पार्टी विवरण हटाउन चाहनुहुन्छ?")) return;
      try {
          await remove(getOrgRef(`listedParties/${id}`));
      } catch (error) {
          alert("पार्टी विवरण हटाउन सकिएन।");
      }
  };

  const handleSaveFinancialTransaction = async (transaction: any) => {
      if (!currentUser) return;
      try {
          const id = transaction.id || push(getOrgRef('financialTransactions')).key;
          await set(getOrgRef(`financialTransactions/${id}`), { ...transaction, id });
      } catch (error) {
          alert("कारोबार सुरक्षित गर्न सकिएन।");
      }
  };

  const handleDeleteFinancialTransaction = async (id: string) => {
      if (!currentUser) return;
      if (!window.confirm("के तपाईं यो कारोबार हटाउन चाहनुहुन्छ?")) return;
      try {
          await remove(getOrgRef(`financialTransactions/${id}`));
      } catch (error) {
          alert("कारोबार हटाउन सकिएन।");
      }
  };

  const handleSavePartyPayment = async (payment: any) => {
      if (!currentUser) return;
      try {
          const id = payment.id || push(getOrgRef('partyPayments')).key;
          await set(getOrgRef(`partyPayments/${id}`), { ...payment, id });
          
          // Update party's total paid amount
          const party = listedParties.find(p => p.id === payment.partyId);
          if (party) {
              const newTotalPaid = (party.totalPaidAmount || 0) + payment.amount;
              await update(getOrgRef(`listedParties/${payment.partyId}`), { totalPaidAmount: newTotalPaid });
          }

          // Update program's spent amount
          const program = financialPrograms.find(p => p.id === payment.programId);
          if (program) {
              const newSpent = (program.spentAmount || 0) + payment.amount;
              await update(getOrgRef(`financialPrograms/${payment.programId}`), { spentAmount: newSpent });
          }
      } catch (error) {
          alert("भुक्तानी सुरक्षित गर्न सकिएन।");
      }
  };

  const handleDeleteInventoryItem = async (itemId: string) => {
      if (!currentUser) return;
      try {
          await remove(getOrgRef(`inventory/${itemId}`));
      } catch (error) {
          alert("सामान हटाउन सकिएन।");
      }
  };

  const handleSaveMagForm = async (f: MagFormEntry) => {
      if (!currentUser) return;
      try {
          const safeOrgName = currentUser.organizationName.trim().replace(/[.#$[\]]/g, "_");
          const orgPath = `orgData/${safeOrgName}`;
          const updates: Record<string, any> = {};
          updates[`${orgPath}/magForms/${f.id}`] = f;
          if (f.status === 'Approved' && f.storeKeeper?.marketRequired) { 
              const poId = `PO-${f.id}`;
              const poSnap = await get(ref(db, `${orgPath}/purchaseOrders/${poId}`));
              if (!poSnap.exists()) {
                  updates[`${orgPath}/purchaseOrders/${poId}`] = {
                      id: poId, magFormId: f.id, magFormNo: f.formNo, requestDate: f.date, items: f.items,
                      status: 'Pending', fiscalYear: f.fiscalYear, preparedBy: { name: '', designation: '', date: '' },
                      recommendedBy: { name: '', designation: '', date: '', purpose: '' }, 
                      financeBy: { name: '', designation: '', date: '', purpose: '' },       
                      approvedBy: { name: '', designation: '', date: '', purpose: '' }      
                  };
              }
          }
          if (f.status === 'Approved' && f.storeKeeper?.inStock) {
              const issueReportId = `ISSUE-${f.id}`;
              const issueReportSnap = await get(ref(db, `${orgPath}/issueReports/${issueReportId}`));
              if (!issueReportSnap.exists()) {
                  updates[`${orgPath}/issueReports/${issueReportId}`] = {
                      id: issueReportId, magFormId: f.id, magFormNo: f.formNo, requestDate: f.date, items: f.items,
                      status: 'Pending', fiscalYear: f.fiscalYear, itemType: f.issueItemType,
                      demandBy: f.demandBy,
                      preparedBy: { name: '', designation: '', date: '', purpose: '' }, 
                      recommendedBy: { name: '', designation: '', date: '', purpose: '' }, 
                      approvedBy: { name: '', designation: '', date: '', purpose: '' }, 
                  };
              }
          }
          await update(ref(db), updates);
      } catch (error) { alert("माग फारम सुरक्षित गर्दा समस्या आयो।"); }
  };

  const handleUpdateIssueReport = async (report: IssueReportEntry) => {
      if (!currentUser) return;
      try {
          const safeOrgName = currentUser.organizationName.trim().replace(/[.#$[\]]/g, "_");
          const orgPath = `orgData/${safeOrgName}`;
          const updates: Record<string, any> = {};
          updates[`${orgPath}/issueReports/${report.id}`] = report;
          if (report.status === 'Issued') {
              const magFormSnap = await get(ref(db, `${orgPath}/magForms/${report.magFormId}`));
              if (magFormSnap.exists()) {
                  const magForm = magFormSnap.val();
                  if (magForm.demandBy) {
                      updates[`${orgPath}/magForms/${report.magFormId}/receiver`] = magForm.demandBy;
                  }
              }
          }
          if (report.status === 'Issued' && !!report.selectedStoreId && !!report.itemType) {
              const currentInvSnap = await get(ref(db, `${orgPath}/inventory`));
              const currentInvData = currentInvSnap.val() || {};
              const currentInvList: InventoryItem[] = Object.keys(currentInvData).map(k => ({ ...currentInvData[k], id: k }));
              const nowBs = new NepaliDate().format('YYYY-MM-DD');
              const nowAd = new Date().toISOString().split('T')[0];
              for (const issueItem of report.items) {
                  let remainingIssuedQty = parseFloat(issueItem.quantity) || 0;
                  let potentialInventoryItems = currentInvList.filter(inv => {
                      const nameMatches = inv.itemName.trim().toLowerCase() === issueItem.name.trim().toLowerCase();
                      const storeMatches = inv.storeId === report.selectedStoreId;
                      const typeMatches = inv.itemType === report.itemType;
                      const codeMatches = issueItem.codeNo ? (inv.uniqueCode === issueItem.codeNo || inv.sanketNo === issueItem.codeNo) : true;
                      
                      // If a specific batch was selected, prioritize it
                      const batchMatches = issueItem.batchNo ? inv.batchNo === issueItem.batchNo : true;
                      
                      return nameMatches && storeMatches && typeMatches && codeMatches && batchMatches;
                  });
                  potentialInventoryItems.sort((a, b) => {
                      const dateA = a.expiryDateAd ? new Date(a.expiryDateAd).getTime() : Infinity;
                      const dateB = b.expiryDateAd ? new Date(b.expiryDateAd).getTime() : Infinity;
                      return dateA - dateB;
                  });
                  for (const invItem of potentialInventoryItems) {
                      if (remainingIssuedQty <= 0) break;
                      const availableQtyInInvItem = Number(invItem.currentQuantity) || 0;
                      const qtyToDeduct = Math.min(remainingIssuedQty, availableQtyInInvItem);
                      if (qtyToDeduct > 0) {
                          const newQuantity = availableQtyInInvItem - qtyToDeduct;
                          const newTotalAmount = (Number(invItem.totalAmount) || 0) - (qtyToDeduct * (Number(invItem.rate) || 0));
                          updates[`${orgPath}/inventory/${invItem.id}`] = {
                              ...invItem, currentQuantity: Math.max(0, newQuantity), totalAmount: Math.max(0, newTotalAmount),
                              lastUpdateDateBs: nowBs, lastUpdateDateAd: nowAd, receiptSource: 'Issued',
                          };
                          remainingIssuedQty -= qtyToDeduct;
                      }
                  }
              }
          }
          await update(ref(db), updates);
      } catch (error) { alert("निकासा प्रतिवेदन सुरक्षित गर्दा समस्या आयो।"); }
  };

  const handleApproveStockEntry = async (requestId: string, approverName: string, approverDesignation: string) => {
      if (!currentUser) return;
      try {
          const safeOrgName = currentUser.organizationName.trim().replace(/[.#$[\]]/g, "_");
          const orgPath = `orgData/${safeOrgName}`;
          const requestSnap = await get(ref(db, `${orgPath}/stockRequests/${requestId}`));
          if (!requestSnap.exists()) return;
          const request: StockEntryRequest = requestSnap.val();
          const invAllSnap = await get(ref(db, `${orgPath}/inventory`));
          const currentInvData = invAllSnap.val() || {};
          const currentInvList: InventoryItem[] = Object.keys(currentInvData).map(k => ({ ...currentInvData[k], id: k }));
          const updates: Record<string, any> = {};
          const dakhilaItems: DakhilaItem[] = [];
          for (const item of request.items) {
              const existingItem = currentInvList.find(i => i.itemName.trim().toLowerCase() === item.itemName.trim().toLowerCase() && i.storeId === request.storeId && i.itemType === item.itemType);
              const incomingQty = Number(item.currentQuantity) || 0;
              const incomingRate = Number(item.rate) || 0;
              const incomingTax = Number(item.tax) || 0;
              const incomingTotal = incomingQty * incomingRate * (1 + incomingTax / 100);
              dakhilaItems.push({
                  id: Date.now() + Math.random(), name: item.itemName, codeNo: item.sanketNo || item.uniqueCode || '',
                  specification: item.specification || '', source: request.receiptSource, unit: item.unit,
                  quantity: incomingQty, rate: incomingRate, totalAmount: incomingQty * incomingRate,
                  vatAmount: (incomingQty * incomingRate) * (incomingTax / 100), grandTotal: incomingTotal,
                  otherExpenses: 0, finalTotal: incomingTotal, remarks: item.remarks || '', itemType: item.itemType 
              });
              if (existingItem) {
                  updates[`${orgPath}/inventory/${existingItem.id}`] = { ...existingItem, currentQuantity: (Number(existingItem.currentQuantity) || 0) + incomingQty, totalAmount: (Number(existingItem.totalAmount) || 0) + incomingTotal, lastUpdateDateBs: request.requestDateBs, lastUpdateDateAd: request.requestDateAd, dakhilaNo: request.dakhilaNo || item.dakhilaNo || existingItem.dakhilaNo };
              } else {
                  const newId = item.id.startsWith('TEMP') ? `ITEM-${Date.now()}-${Math.random().toString(36).substring(7)}` : item.id;
                  updates[`${orgPath}/inventory/${newId}`] = { ...item, id: newId, currentQuantity: incomingQty, totalAmount: incomingTotal, lastUpdateDateBs: request.requestDateBs, lastUpdateDateAd: request.requestDateAd, storeId: request.storeId, fiscalYear: request.fiscalYear, dakhilaNo: request.dakhilaNo || item.dakhilaNo };
              }
          }
          updates[`${orgPath}/stockRequests/${requestId}/status`] = 'Approved';
          updates[`${orgPath}/stockRequests/${requestId}/approvedBy`] = approverName;
          const formalDakhilaId = `DA-${Date.now()}`;
          updates[`${orgPath}/dakhilaReports/${formalDakhilaId}`] = {
              id: formalDakhilaId, fiscalYear: request.fiscalYear, dakhilaNo: request.dakhilaNo || formalDakhilaId,
              date: request.requestDateBs, orderNo: request.refNo || 'BULK-ENTRY', items: dakhilaItems, status: 'Final',
              preparedBy: { name: request.requesterName || request.requestedBy, designation: request.requesterDesignation || 'Staff', date: request.requestDateBs, purpose: '' },
              approvedBy: { name: approverName, designation: approverDesignation, date: request.requestDateBs, purpose: '' },
              storeId: request.storeId 
          };
          await update(ref(db), updates);
      } catch (error) { alert("सिस्टममा समस्या आयो।"); }
  };

  const handleUploadDatabase = async (sectionId: string, data: any[], extraMeta?: any) => {
    if (!currentUser) return;
    try {
        const safeOrgName = currentUser.organizationName.trim().replace(/[.#$[\]]/g, "_");
        const orgPath = `orgData/${safeOrgName}`;
        const updates: Record<string, any> = {};

        if (sectionId === 'inventory') {
            data.forEach((row, idx) => {
                const itemId = `ITEM-UPLOAD-${Date.now()}-${idx}`;
                let expiryBs = '';
                const expiryAd = row['Expiry (AD)'];
                if (expiryAd && expiryAd !== '-') {
                    try {
                        const adDate = new Date(expiryAd);
                        if (!isNaN(adDate.getTime())) {
                            expiryBs = new NepaliDate(adDate).format('YYYY-MM-DD');
                        }
                    } catch(e) {}
                }
                const qty = Number(row['Qty']) || 0;
                const rate = Number(row['Rate']) || 0;
                const tax = Number(row['Tax %']) || 0;
                const total = qty * rate * (1 + tax / 100);
                const newItem: InventoryItem = {
                    id: itemId,
                    itemName: String(row['Item Name'] || 'Unnamed Item'),
                    itemClassification: String(row['Item Classification'] || 'Other'),
                    uniqueCode: String(row['Unique Code'] || ''),
                    sanketNo: String(row['Sanket No'] || ''),
                    ledgerPageNo: String(row['Ledger Page'] || ''),
                    unit: String(row['Unit'] || 'Nos'),
                    currentQuantity: qty,
                    rate: rate,
                    tax: tax,
                    totalAmount: total,
                    batchNo: String(row['Batch No'] || ''),
                    expiryDateAd: expiryAd || '',
                    expiryDateBs: expiryBs,
                    specification: String(row['Specification'] || ''),
                    remarks: String(row['Remarks'] || ''),
                    itemType: extraMeta?.itemType || 'Expendable',
                    storeId: extraMeta?.storeId || '',
                    fiscalYear: currentFiscalYear,
                    lastUpdateDateBs: new NepaliDate().format('YYYY-MM-DD'),
                    lastUpdateDateAd: new Date().toISOString().split('T')[0],
                    receiptSource: 'Database Bulk Import'
                };
                updates[`${orgPath}/inventory/${itemId}`] = newItem;
            });
        } else if (sectionId === 'item_list') {
            data.forEach((row, idx) => {
                const itemId = `ITEMLIST-${Date.now()}-${idx}`;
                const newItem: ItemEntry = {
                    id: itemId,
                    itemName: String(row['Item Name'] || row['itemName'] || 'Unnamed Item'),
                    unit: String(row['Unit'] || row['unit'] || 'Nos')
                };
                updates[`${orgPath}/itemList/${itemId}`] = newItem;
            });
        } else {
            data.forEach((row, idx) => {
                const entryId = `${sectionId.toUpperCase()}-${Date.now()}-${idx}`;
                updates[`${orgPath}/${sectionId}/${entryId}`] = row;
            });
        }
        await update(ref(db), updates);
    } catch (error) {
        console.error("Critical Upload Error:", error);
        throw error;
    }
  };

  const handleSaveReturnEntry = async (entry: ReturnEntry) => {
      if (!currentUser) return;
      try {
          const safeOrgName = currentUser.organizationName.trim().replace(/[.#$[\]]/g, "_");
          const orgPath = `orgData/${safeOrgName}`;
          const updates: Record<string, any> = {};
          
          updates[`${orgPath}/returnEntries/${entry.id}`] = entry;

          if (entry.status === 'Approved') {
              const invAllSnap = await get(ref(db, `${orgPath}/inventory`));
              const currentInvData = invAllSnap.val() || {};
              const currentInvList: InventoryItem[] = Object.keys(currentInvData).map(k => ({ ...currentInvData[k], id: k }));

              for (const returnedItem of entry.items) {
                  // Allowing both Expendable and Non-Expendable items to be added back to stock upon return approval.
                  const existingItem = currentInvList.find(i => 
                      i.id === returnedItem.inventoryId || 
                      (i.itemName.trim().toLowerCase() === returnedItem.name.trim().toLowerCase() && 
                       (i.uniqueCode?.trim().toLowerCase() === returnedItem.codeNo?.trim().toLowerCase() ||
                        i.sanketNo?.trim().toLowerCase() === returnedItem.codeNo?.trim().toLowerCase()) &&
                        i.itemType === returnedItem.itemType
                      )
                  );

                  if (existingItem) {
                      const newQty = (Number(existingItem.currentQuantity) || 0) + (Number(returnedItem.quantity) || 0);
                      const newTotalAmount = (Number(existingItem.totalAmount) || 0) + (Number(returnedItem.totalAmount) || 0);

                      updates[`${orgPath}/inventory/${existingItem.id}`] = { 
                          ...existingItem, 
                          currentQuantity: newQty, 
                          totalAmount: newTotalAmount, 
                          lastUpdateDateBs: entry.date, 
                          lastUpdateDateAd: new Date().toISOString().split('T')[0],
                          receiptSource: 'Returned'
                      };
                  } else {
                      const newInventoryId = returnedItem.inventoryId || `ITEM-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                      updates[`${orgPath}/inventory/${newInventoryId}`] = {
                          id: newInventoryId,
                          itemName: returnedItem.name,
                          uniqueCode: returnedItem.codeNo,
                          sanketNo: returnedItem.codeNo,
                          ledgerPageNo: "", 
                          itemType: returnedItem.itemType || "Non-Expendable", 
                          itemClassification: returnedItem.itemClassification || "", 
                          specification: returnedItem.specification || "", 
                          unit: returnedItem.unit,
                          currentQuantity: returnedItem.quantity,
                          rate: returnedItem.rate,
                          tax: 0, 
                          totalAmount: returnedItem.totalAmount,
                          batchNo: "",
                          expiryDateAd: "",
                          expiryDateBs: "",
                          lastUpdateDateAd: new Date().toISOString().split('T')[0],
                          lastUpdateDateBs: entry.date,
                          fiscalYear: entry.fiscalYear,
                          receiptSource: 'Returned',
                          remarks: `Returned via form ${entry.formNo}. Original remarks: ${returnedItem.remarks}`,
                          storeId: "" 
                      };
                  }
              }
          }
          await update(ref(db), updates);
      } catch (error) {
          alert("जिन्सी फिर्ता सुरक्षित गर्दा समस्या आयो।");
      }
  };

  const handleSaveDhuliyaunaEntry = async (entry: DhuliyaunaEntry) => {
      if (!currentUser) return;
      try {
          const safeOrgName = currentUser.organizationName.trim().replace(/[.#$[\]]/g, "_");
          const orgPath = `orgData/${safeOrgName}`;
          const updates: Record<string, any> = {};
          
          updates[`${orgPath}/disposalEntries/${entry.id}`] = entry;

          if (entry.status === 'Approved') {
              const invAllSnap = await get(ref(db, `${orgPath}/inventory`));
              const currentInvData = invAllSnap.val() || {};
              const currentInvList: InventoryItem[] = Object.keys(currentInvData).map(k => ({ ...currentInvData[k], id: k }));

              for (const disposalItem of entry.items) {
                  const existingItem = currentInvList.find(i => 
                      i.id === disposalItem.inventoryId || 
                      (i.itemName.trim().toLowerCase() === disposalItem.name.trim().toLowerCase() && 
                       (i.uniqueCode?.trim().toLowerCase() === disposalItem.codeNo?.trim().toLowerCase() ||
                        i.sanketNo?.trim().toLowerCase() === disposalItem.codeNo?.trim().toLowerCase())
                      )
                  );

                  if (existingItem) {
                      // Set quantity to 0 as requested: "sambhandit stock ko quantity 0 hos"
                      updates[`${orgPath}/inventory/${existingItem.id}`] = { 
                          ...existingItem, 
                          currentQuantity: 0, 
                          totalAmount: 0, 
                          lastUpdateDateBs: entry.date, 
                          lastUpdateDateAd: new Date().toISOString().split('T')[0],
                          receiptSource: 'Disposed'
                      };
                  }
              }
          }
          await update(ref(db), updates);
      } catch (error) {
          alert("लिलाम/धुल्याउने प्रविष्टि सुरक्षित गर्दा समस्या आयो।");
      }
  };

  return (
    <>
      {currentUser ? (
        <Dashboard 
          onLogout={() => {
            setCurrentUser(null);
            localStorage.removeItem('smart_inv_active_item');
          }} currentUser={currentUser} currentFiscalYear={currentFiscalYear} 
          users={allUsers} onAddUser={handleSaveUser}
          onUpdateUser={handleSaveUser} onDeleteUser={handleDeleteUser}
          onChangePassword={(id, pass) => update(ref(db, `users/${id}`), { password: pass })}
          isDbLocked={isDbLocked}
          generalSettings={generalSettings} onUpdateGeneralSettings={(s) => set(getOrgRef('settings'), s)}
          magForms={magForms} onSaveMagForm={handleSaveMagForm} onDeleteMagForm={handleDeleteMagForm}
          purchaseOrders={purchaseOrders} onUpdatePurchaseOrder={(o) => set(getOrgRef(`purchaseOrders/${o.id}`), o)}
          issueReports={issueReports} onUpdateIssueReport={handleUpdateIssueReport}
          rabiesPatients={rabiesPatients} onAddRabiesPatient={(p) => set(getOrgRef(`rabiesPatients/${p.id}`), JSON.parse(JSON.stringify(p)))}
          onUpdatePatient={(p) => set(getOrgRef(`rabiesPatients/${p.id}`), JSON.parse(JSON.stringify(p)))} onDeletePatient={(id) => remove(getOrgRef(`rabiesPatients/${id}`))}
          tbPatients={tbPatients} onAddTbPatient={(p) => set(getOrgRef(`tbPatients/${p.id}`), JSON.parse(JSON.stringify(p)))} onUpdateTbPatient={(p, sourceOrgName) => set(sourceOrgName ? ref(db, `orgData/${sourceOrgName.trim().replace(/[.#$[\]]/g, "_")}/tbPatients/${p.id}`) : getOrgRef(`tbPatients/${p.id}`), JSON.parse(JSON.stringify(p)))} 
          onDeleteTbPatient={async (id) => {
            try {
              // 1. Remove associated inter-facility requests
              const globalRequestsRef = ref(db, 'interFacilityRequests');
              const snap = await get(globalRequestsRef);
              if (snap.exists()) {
                const requests = snap.val();
                const updates: Record<string, any> = {};
                Object.keys(requests).forEach(key => {
                  if (requests[key].patientId === id) {
                    updates[key] = null;
                  }
                });
                if (Object.keys(updates).length > 0) {
                  await update(globalRequestsRef, updates);
                }
              }
              // 2. Remove the patient record
              await remove(getOrgRef(`tbPatients/${id}`));
            } catch (error) {
              console.error("Error deleting patient and requests", error);
              alert("बिरामीको विवरण हटाउन सकिएन।");
            }
          }}
          garbhawatiPatients={garbhawatiPatients} onAddGarbhawatiPatient={(p) => set(getOrgRef(`garbhawatiPatients/${p.id}`), JSON.parse(JSON.stringify(p)))} onUpdateGarbhawatiPatient={(p) => set(getOrgRef(`garbhawatiPatients/${p.id}`), JSON.parse(JSON.stringify(p)))} onDeleteGarbhawatiPatient={(id) => remove(getOrgRef(`garbhawatiPatients/${id}`))}
          bachhaImmunizationRecords={bachhaImmunizationRecords} onAddBachhaImmunizationRecord={(r) => set(getOrgRef(`bachhaImmunizationRecords/${r.id}`), JSON.parse(JSON.stringify(r)))} onUpdateBachhaImmunizationRecord={(r) => set(getOrgRef(`bachhaImmunizationRecords/${r.id}`), JSON.parse(JSON.stringify(r)))} onDeleteBachhaImmunizationRecord={(id) => remove(getOrgRef(`bachhaImmunizationRecords/${id}`))}
          firms={firms} onAddFirm={(f) => set(getOrgRef(`firms/${f.id}`), f)} quotations={quotations} onAddQuotation={(q) => set(getOrgRef(`quotations/${q.id}`), q)}
          inventoryItems={inventoryItems} onAddInventoryItem={(i) => set(getOrgRef(`inventory/${i.id}`), i)} onUpdateInventoryItem={(i) => set(getOrgRef(`inventory/${i.id}`), i)} onDeleteInventoryItem={handleDeleteInventoryItem}
          stockEntryRequests={stockEntryRequests} onRequestStockEntry={(r) => set(getOrgRef(`stockRequests/${r.id}`), r)} onApproveStockEntry={handleApproveStockEntry}
          onRejectStockEntry={(id, res, app) => update(getOrgRef(`stockRequests/${id}`), { status: 'Rejected', rejectionReason: res, approvedBy: app })}
          stores={stores} onAddStore={(s) => set(getOrgRef(`stores/${s.id}`), s)} onUpdateStore={(s) => set(getOrgRef(`stores/${s.id}`), s)} onDeleteStore={(id) => remove(getOrgRef(`stores/${id}`))}
          dakhilaReports={dakhilaReports} onSaveDakhilaReport={(r) => set(getOrgRef(`dakhilaReports/${r.id}`), r)} returnEntries={returnEntries} onSaveReturnEntry={handleSaveReturnEntry}
          marmatEntries={marmatEntries} onSaveMarmatEntry={(e) => set(getOrgRef(`marmatEntries/${e.id}`), e)} dhuliyaunaEntries={dhuliyaunaEntries} onSaveDhuliyaunaEntry={handleSaveDhuliyaunaEntry}
          logBookEntries={logBookEntries} onSaveLogBookEntry={(e) => set(getOrgRef(`logBook/${e.id}`), e)} onClearData={(p) => remove(getOrgRef(p))} onUploadData={handleUploadDatabase}
          leaveApplications={leaveApplications}
          onAddLeaveApplication={handleAddLeaveApplication}
          onUpdateLeaveStatus={handleUpdateLeaveStatus}
          onDeleteLeaveApplication={handleDeleteLeaveApplication}
          leaveBalances={leaveBalances}
          onSaveLeaveBalance={handleSaveLeaveBalance}
    dartaEntries={dartaEntries}
    onSaveDarta={handleSaveDarta}
    onDeleteDarta={handleDeleteDarta}
    chalaniEntries={chalaniEntries}
    onSaveChalani={handleSaveChalani}
    onDeleteChalani={handleDeleteChalani}
    bharmanAdeshEntries={bharmanAdeshEntries}
    onSaveBharmanAdesh={handleSaveBharmanAdesh}
    onDeleteBharmanAdesh={handleDeleteBharmanAdesh}
    garbhawotiRecords={garbhawotiRecords}
    onSaveGarbhawotiRecord={handleSaveGarbhawotiRecord}
    onDeleteGarbhawotiRecord={handleDeleteGarbhawotiRecord}
    prasutiRecords={prasutiRecords}
    onSavePrasutiRecord={handleSavePrasutiRecord}
    onDeletePrasutiRecord={handleDeletePrasutiRecord}
    serviceSeekerRecords={serviceSeekerRecords}
    onSaveServiceSeekerRecord={handleSaveServiceSeekerRecord}
    onDeleteServiceSeekerRecord={handleDeleteServiceSeekerRecord}
    opdRecords={opdRecords}
    onSaveOPDRecord={handleSaveOPDRecord}
    onDeleteOPDRecord={handleDeleteOPDRecord}
    dispensaryRecords={dispensaryRecords}
    onSaveDispensaryRecord={handleSaveDispensaryRecord}
    onDeleteDispensaryRecord={handleDeleteDispensaryRecord}
    emergencyRecords={emergencyRecords}
    onSaveEmergencyRecord={handleSaveEmergencyRecord}
    onDeleteEmergencyRecord={handleDeleteEmergencyRecord}
    cbimnciRecords={cbimnciRecords}
    onSaveCBIMNCIRecord={handleSaveCBIMNCIRecord}
    onDeleteCBIMNCIRecord={handleDeleteCBIMNCIRecord}
    billingRecords={billingRecords}
    onSaveBillingRecord={handleSaveBillingRecord}
    onDeleteBillingRecord={handleDeleteBillingRecord}
    serviceItems={serviceItems}
    onSaveServiceItem={handleSaveServiceItem}
    onDeleteServiceItem={handleDeleteServiceItem}
    labReports={labReports}
    onSaveLabReport={handleSaveLabReport}
    onDeleteLabReport={handleDeleteLabReport}
    pariwarSewaRecords={pariwarSewaRecords}
    onSavePariwarSewaRecord={handleSavePariwarSewaRecord}
    onDeletePariwarSewaRecord={handleDeletePariwarSewaRecord}
    xrayRecords={xrayRecords}
    onSaveXRayRecord={handleSaveXRayRecord}
    onDeleteXRayRecord={handleDeleteXRayRecord}
    ecgRecords={ecgRecords}
    onSaveECGRecord={handleSaveECGRecord}
    onDeleteECGRecord={handleDeleteECGRecord}
    usgRecords={usgRecords}
    onSaveUSGRecord={handleSaveUSGRecord}
    onDeleteUSGRecord={handleDeleteUSGRecord}
    physiotherapyRecords={physiotherapyRecords}
    onSavePhysiotherapyRecord={handleSavePhysiotherapyRecord}
    onDeletePhysiotherapyRecord={handleDeletePhysiotherapyRecord}
    ipdRecords={ipdRecords}
    onSaveIPDRecord={handleSaveIPDRecord}
    onDeleteIPDRecord={handleDeleteIPDRecord}
    interFacilityRequests={interFacilityRequests}
    onAddInterFacilityRequest={(req) => handleAddGlobal('interFacilityRequests', req)}
    onUpdateInterFacilityRequest={(req) => handleUpdateGlobal('interFacilityRequests', req)}
    itemList={itemList}
    onUpdateReadNotifications={handleUpdateReadNotifications}
    activeOrgName={activeOrgName}
    onSetActiveOrgName={setActiveOrgName}
    allUsers={allUsers}
    // Financial Props
    financialPrograms={financialPrograms}
    listedParties={listedParties}
    financialTransactions={financialTransactions}
    partyPayments={partyPayments}
    onSaveFinancialProgram={handleSaveFinancialProgram}
    onDeleteFinancialProgram={handleDeleteFinancialProgram}
    onSaveListedParty={handleSaveListedParty}
    onDeleteListedParty={handleDeleteListedParty}
    onSaveFinancialTransaction={handleSaveFinancialTransaction}
    onDeleteFinancialTransaction={handleDeleteFinancialTransaction}
    onSavePartyPayment={handleSavePartyPayment}
        />
      ) : (
        <div className="min-h-screen w-full bg-[#f8fafc] flex items-center justify-center p-6 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
          <div className="w-full max-w-[440px] animate-in fade-in zoom-in-95 duration-500">
            {dbError && (
                <div className="mb-4 bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 flex items-start gap-3 shadow-lg shadow-red-500/10">
                    <ShieldAlert className="shrink-0 mt-1" size={20} />
                    <div>
                        <p className="font-bold text-xs font-nepali">सिस्टम जडान चेतावनी:</p>
                        <p className="text-[11px] leading-tight mt-1">डेटाबेस लक गरिएको छ। पुराना प्रयोगकर्ताहरू देखा पर्ने छैनन्।</p>
                        <p className="text-[10px] mt-2 font-bold text-red-400">उपचार: Firebase Console मा गएर Rules लाई Public बनाउनुहोस्।</p>
                    </div>
                </div>
            )}
            <div className="bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-100">
              <div className="bg-primary-600 p-12 text-center text-white relative overflow-hidden">
                <ECGWave />
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0 100 C 20 0 50 0 100 100 Z" fill="currentColor"></path>
                    </svg>
                </div>
                <div className="relative z-10">
                    <div className="bg-white/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md shadow-inner border border-white/30">
                        <Landmark className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-extrabold font-nepali tracking-tight mb-2">{APP_NAME}</h1>
                    <p className="text-primary-100 font-semibold tracking-wide uppercase text-xs">जिन्सी व्यवस्थापन पोर्टल</p>
                </div>
              </div>
              <div className="p-10">
                <LoginForm 
                    users={allUsers} 
                    onLoginSuccess={handleLoginSuccess} 
                    initialFiscalYear={'2082/083'} 
                />
              </div>
              <div className="bg-slate-50 p-5 text-center border-t border-slate-100 flex items-center justify-center gap-3">
                 <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200">
                    <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-green-50 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-50 animate-pulse'}`}></span>
                    <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider">{isDbConnected ? 'System Online' : 'System Offline'}</span>
                 </div>
                 <div className="flex items-center gap-1.5 text-slate-400">
                    {isDbLocked ? <Lock size={14} className="text-red-400" /> : <Unlock size={14} className="text-green-400" />}
                    <span className="text-[11px] font-medium">{isDbLocked ? 'Restricted' : 'Full Access'}</span>
                 </div>
              </div>
            </div>
            <p className="text-center mt-8 text-slate-400 text-xs font-medium uppercase tracking-widest">
                &copy; {new Date().getFullYear()} Smart Inventory Solutions
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
