
import React, { useState, useEffect } from 'react';
import { LoginForm } from './LoginForm';
import { Dashboard } from './Dashboard';
import { APP_NAME, ORG_NAME } from '../constants';
import { Landmark, ShieldCheck, AlertCircle, Database, ShieldAlert, Lock, Unlock } from 'lucide-react';
import { 
  User, OrganizationSettings, MagFormEntry, RabiesPatient, PurchaseOrderEntry, 
  IssueReportEntry, FirmEntry, QuotationEntry, InventoryItem, Store, StockEntryRequest, 
  DakhilaPratibedanEntry, ReturnEntry, MarmatEntry, DhuliyaunaEntry, LogBookEntry, 
  DakhilaItem, TBPatient, GarbhawatiPatient, ChildImmunizationRecord,
  ServiceSeekerRecord, OPDRecord, EmergencyRecord, CBIMNCIRecord, BillingRecord,
  DispensaryRecord, ServiceItem, LabReport, GarbhawotiRecord, PrasutiRecord, UttarPrasutiRecord,
  LeaveApplication, LeaveBalance
} from '../types';
import { db } from '../firebase';
import { ref, onValue, set, remove, update, get, Unsubscribe, off } from "firebase/database";
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
    logoUrl: ''
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
    allowedMenus: ['dashboard', 'inventory', 'settings', 'services', 'khop_sewa', 'conference']
};

const App: React.FC = () => {
  const [allUsers, setAllUsers] = useState<User[]>([DEFAULT_ADMIN]); 
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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
  const [serviceSeekerRecords, setServiceSeekerRecords] = useState<ServiceSeekerRecord[]>([]);
  const [opdRecords, setOpdRecords] = useState<OPDRecord[]>([]);
  const [emergencyRecords, setEmergencyRecords] = useState<EmergencyRecord[]>([]);
  const [cbimnciRecords, setCbimnciRecords] = useState<CBIMNCIRecord[]>([]);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [dispensaryRecords, setDispensaryRecords] = useState<DispensaryRecord[]>([]);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [garbhawotiRecords, setGarbhawotiRecords] = useState<GarbhawotiRecord[]>([]);
  const [prasutiRecords, setPrasutiRecords] = useState<PrasutiRecord[]>([]);
  const [uttarPrasutiRecords, setUttarPrasutiRecords] = useState<UttarPrasutiRecord[]>([]);
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);

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
    if (!currentUser) return;

    const safeOrgName = currentUser.organizationName.trim().replace(/[.#$[\]]/g, "_");
    const orgPath = `orgData/${safeOrgName}`;
    const unsubscribes: Unsubscribe[] = [];

    const setupOrgListener = (subPath: string, setter: Function) => {
        const listenerRef = ref(db, `${orgPath}/${subPath}`);
        const unsub = onValue(listenerRef, (snap) => {
            const data = snap.val();
            setter(data ? Object.keys(data).map(key => ({ ...data[key], id: key })) : []);
        }, (err) => {
            if (err.message.includes("permission_denied")) {
                setDbError(`डेटा रिड पर्मिसन छैन: ${subPath}`);
            }
        });
        unsubscribes.push(unsub);
    };

    onValue(ref(db, `${orgPath}/settings`), (snap) => {
        if (snap.exists()) setGeneralSettings(snap.val());
        else {
            const firstSettings = { ...INITIAL_SETTINGS, orgNameNepali: currentUser.organizationName, orgNameEnglish: currentUser.organizationName };
            set(ref(db, `${orgPath}/settings`), firstSettings).catch(() => {});
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
    setupOrgListener('serviceSeekers', setServiceSeekerRecords);
    setupOrgListener('opdRecords', setOpdRecords);
    setupOrgListener('emergencyRecords', setEmergencyRecords);
    setupOrgListener('cbimnciRecords', setCbimnciRecords);
    setupOrgListener('billingRecords', setBillingRecords);
    setupOrgListener('dispensaryRecords', setDispensaryRecords);
    setupOrgListener('serviceItems', setServiceItems);
    setupOrgListener('labReports', setLabReports);
    setupOrgListener('garbhawotiRecords', setGarbhawotiRecords);
    setupOrgListener('prasutiRecords', setPrasutiRecords);
    setupOrgListener('uttarPrasutiRecords', setUttarPrasutiRecords);
    setupOrgListener('leaveApplications', setLeaveApplications);
    setupOrgListener('leaveBalances', setLeaveBalances);

    return () => unsubscribes.forEach(unsub => unsub());
  }, [currentUser]);

  const handleLoginSuccess = (user: User, fiscalYear: string) => {
    setCurrentUser(user);
    setCurrentFiscalYear(fiscalYear);
  };

  const getOrgRef = (subPath: string) => {
      const safeOrgName = currentUser?.organizationName.trim().replace(/[.#$[\]]/g, "_") || "unknown";
      return ref(db, `orgData/${safeOrgName}/${subPath}`);
  };

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

  const handleDeleteInventoryItem = async (itemId: string) => {
      if (!currentUser) return;
      try {
          await remove(getOrgRef(`inventory/${itemId}`));
      } catch (error) {
          alert("सामान हटाउन सकिएन।");
      }
  };

  const handleDeletePartyPayment = async (id: string) => {
      if (!currentUser) return;
      try {
          await remove(getOrgRef(`payments/${id}`));
      } catch (error) {
          alert("भुक्तानी विवरण हटाउन सकिएन।");
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
          if (report.status === 'Issued' && !!report.selectedStoreId && !!report.itemType) {
              const currentInvSnap = await get(ref(db, `${orgPath}/inventory`));
              const currentInvData = currentInvSnap.val() || {};
              const currentInvList: InventoryItem[] = Object.keys(currentInvData).map(k => ({ ...currentInvData[k], id: k }));
              const nowBs = new NepaliDate().format('YYYY-MM-DD');
              const nowAd = new Date().toISOString().split('T')[0];
              
              // 1. Deduct Stock
              for (const issueItem of report.items) {
                  let remainingIssuedQty = parseFloat(issueItem.quantity) || 0;
                  let potentialInventoryItems = currentInvList.filter(inv => {
                      const nameMatches = inv.itemName.trim().toLowerCase() === issueItem.name.trim().toLowerCase();
                      const storeMatches = inv.storeId === report.selectedStoreId;
                      const typeMatches = inv.itemType === report.itemType;
                      const codeMatches = issueItem.codeNo ? (inv.uniqueCode === issueItem.codeNo || inv.sanketNo === issueItem.codeNo) : true;
                      return nameMatches && storeMatches && typeMatches && codeMatches;
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

              // 2. Update Receiver in Mag Faram
              if (report.magFormId) {
                  const magFormSnap = await get(ref(db, `${orgPath}/magForms/${report.magFormId}`));
                  if (magFormSnap.exists()) {
                      const magFormVal = magFormSnap.val();
                      if (magFormVal.demandBy) {
                          updates[`${orgPath}/magForms/${report.magFormId}/receiver`] = {
                              name: magFormVal.demandBy.name,
                              designation: magFormVal.demandBy.designation,
                              date: report.issueDate || nowBs
                          };
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
                  if (returnedItem.itemType !== 'Non-Expendable') continue; 

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

  return (
    <>
      {currentUser ? (
        <Dashboard 
          onLogout={() => setCurrentUser(null)} currentUser={currentUser} currentFiscalYear={currentFiscalYear} 
          users={allUsers} onAddUser={handleSaveUser}
          onUpdateUser={handleSaveUser} onDeleteUser={handleDeleteUser}
          onChangePassword={(id, pass) => update(ref(db, `users/${id}`), { password: pass })}
          isDbLocked={isDbLocked}
          generalSettings={generalSettings} onUpdateGeneralSettings={(s) => set(getOrgRef('settings'), s)}
          magForms={magForms} onSaveMagForm={handleSaveMagForm} onDeleteMagForm={handleDeleteMagForm}
          purchaseOrders={purchaseOrders} onUpdatePurchaseOrder={(o) => set(getOrgRef(`purchaseOrders/${o.id}`), o)} onDeletePurchaseOrder={(id) => remove(getOrgRef(`purchaseOrders/${id}`))}
          issueReports={issueReports} onUpdateIssueReport={handleUpdateIssueReport}
          rabiesPatients={rabiesPatients} onAddRabiesPatient={(p) => set(getOrgRef(`rabiesPatients/${p.id}`), p)}
          onUpdatePatient={(p) => set(getOrgRef(`rabiesPatients/${p.id}`), p)} onDeletePatient={(id) => remove(getOrgRef(`rabiesPatients/${id}`))}
          tbPatients={tbPatients} onAddTbPatient={(p) => set(getOrgRef(`tbPatients/${p.id}`), p)} onUpdateTbPatient={(p) => set(getOrgRef(`tbPatients/${p.id}`), p)} onDeleteTbPatient={(id) => remove(getOrgRef(`tbPatients/${id}`))}
          garbhawatiPatients={garbhawatiPatients} onAddGarbhawatiPatient={(p) => set(getOrgRef(`garbhawatiPatients/${p.id}`), p)} onUpdateGarbhawatiPatient={(p) => set(getOrgRef(`garbhawatiPatients/${p.id}`), p)} onDeleteGarbhawatiPatient={(id) => remove(getOrgRef(`garbhawatiPatients/${id}`))}
          bachhaImmunizationRecords={bachhaImmunizationRecords} onAddBachhaImmunizationRecord={(r) => set(getOrgRef(`bachhaImmunizationRecords/${r.id}`), r)} onUpdateBachhaImmunizationRecord={(r) => set(getOrgRef(`bachhaImmunizationRecords/${r.id}`), r)} onDeleteBachhaImmunizationRecord={(id) => remove(getOrgRef(`bachhaImmunizationRecords/${id}`))}
          firms={firms} onAddFirm={(f) => set(getOrgRef(`firms/${f.id}`), f)} quotations={quotations} onAddQuotation={(q) => set(getOrgRef(`quotations/${q.id}`), q)}
          inventoryItems={inventoryItems} onAddInventoryItem={(i) => set(getOrgRef(`inventory/${i.id}`), i)} onUpdateInventoryItem={(i) => set(getOrgRef(`inventory/${i.id}`), i)} onDeleteInventoryItem={handleDeleteInventoryItem}
          stockEntryRequests={stockEntryRequests} onRequestStockEntry={(r) => set(getOrgRef(`stockRequests/${r.id}`), r)} onApproveStockEntry={handleApproveStockEntry}
          onRejectStockEntry={(id, res, app) => update(getOrgRef(`stockRequests/${id}`), { status: 'Rejected', rejectionReason: res, approvedBy: app })}
          stores={stores} onAddStore={(s) => set(getOrgRef(`stores/${s.id}`), s)} onUpdateStore={(s) => set(getOrgRef(`stores/${s.id}`), s)} onDeleteStore={(id) => remove(getOrgRef(`stores/${id}`))}
          dakhilaReports={dakhilaReports} onSaveDakhilaReport={(r) => set(getOrgRef(`dakhilaReports/${r.id}`), r)} returnEntries={returnEntries} onSaveReturnEntry={handleSaveReturnEntry}
          marmatEntries={marmatEntries} onSaveMarmatEntry={(e) => set(getOrgRef(`marmatEntries/${e.id}`), e)} dhuliyaunaEntries={dhuliyaunaEntries} onSaveDhuliyaunaEntry={(e) => set(getOrgRef(`disposalEntries/${e.id}`), e)}
          logBookEntries={logBookEntries} onSaveLogBookEntry={(e) => set(getOrgRef(`logBook/${e.id}`), e)} onClearData={(p) => remove(getOrgRef(p))} onUploadData={handleUploadDatabase}
          serviceSeekerRecords={serviceSeekerRecords} onSaveServiceSeekerRecord={(r) => set(getOrgRef(`serviceSeekers/${r.id}`), r)} onDeleteServiceSeekerRecord={(id) => remove(getOrgRef(`serviceSeekers/${id}`))}
          opdRecords={opdRecords} onSaveOPDRecord={(r) => set(getOrgRef(`opdRecords/${r.id}`), r)} onDeleteOPDRecord={(id) => remove(getOrgRef(`opdRecords/${id}`))}
          emergencyRecords={emergencyRecords} onSaveEmergencyRecord={(r) => set(getOrgRef(`emergencyRecords/${r.id}`), r)} onDeleteEmergencyRecord={(id) => remove(getOrgRef(`emergencyRecords/${id}`))}
          cbimnciRecords={cbimnciRecords} onSaveCBIMNCIRecord={(r) => set(getOrgRef(`cbimnciRecords/${r.id}`), r)} onDeleteCBIMNCIRecord={(id) => remove(getOrgRef(`cbimnciRecords/${id}`))}
          billingRecords={billingRecords} onSaveBillingRecord={(r) => set(getOrgRef(`billingRecords/${r.id}`), r)} onDeleteBillingRecord={(id) => remove(getOrgRef(`billingRecords/${id}`))}
          dispensaryRecords={dispensaryRecords} onSaveDispensaryRecord={(r) => set(getOrgRef(`dispensaryRecords/${r.id}`), r)} onDeleteDispensaryRecord={(id) => remove(getOrgRef(`dispensaryRecords/${id}`))}
          serviceItems={serviceItems} onSaveServiceItem={(i) => set(getOrgRef(`serviceItems/${i.id}`), i)} onDeleteServiceItem={(id) => remove(getOrgRef(`serviceItems/${id}`))}
          labReports={labReports} onSaveLabReport={(r) => set(getOrgRef(`labReports/${r.id}`), r)} onDeleteLabReport={(id) => remove(getOrgRef(`labReports/${id}`))}
          garbhawotiRecords={garbhawotiRecords} onSaveGarbhawotiRecord={(r) => set(getOrgRef(`garbhawotiRecords/${r.id}`), r)} onDeleteGarbhawotiRecord={(id) => remove(getOrgRef(`garbhawotiRecords/${id}`))}
          prasutiRecords={prasutiRecords} onSavePrasutiRecord={(r) => set(getOrgRef(`prasutiRecords/${r.id}`), r)} onDeletePrasutiRecord={(id) => remove(getOrgRef(`prasutiRecords/${id}`))}
          uttarPrasutiRecords={uttarPrasutiRecords} onSaveUttarPrasutiRecord={(r) => set(getOrgRef(`uttarPrasutiRecords/${r.id}`), r)} onDeleteUttarPrasutiRecord={(id) => remove(getOrgRef(`uttarPrasutiRecords/${id}`))}
          leaveApplications={leaveApplications} onAddLeaveApplication={(a) => set(getOrgRef(`leaveApplications/${a.id}`), a)}
          onUpdateLeaveStatus={(id, status, rejectionReason) => {
              if (!currentUser) return;
              const safeOrgName = currentUser.organizationName.trim().replace(/[.#$[\]]/g, "_");
              const orgPath = `orgData/${safeOrgName}`;
              const updates: Record<string, any> = {};
              updates[`${orgPath}/leaveApplications/${id}/status`] = status;
              if (rejectionReason) updates[`${orgPath}/leaveApplications/${id}/rejectionReason`] = rejectionReason;
              if (status === 'Approved') {
                  updates[`${orgPath}/leaveApplications/${id}/approvedBy`] = currentUser.fullName;
                  updates[`${orgPath}/leaveApplications/${id}/approvalDate`] = new NepaliDate().format('YYYY-MM-DD');
                  // Note: Balance deduction is handled by BidaAbedan logic calling onSaveLeaveBalance separately if needed,
                  // OR we should handle it here. BidaAbedan calls onSaveLeaveBalance directly?
                  // Let's check BidaAbedan. It calls onUpdateLeaveStatus AND onSaveLeaveBalance?
                  // No, BidaAbedan calls onUpdateLeaveStatus ONLY.
                  // So we MUST deduct balance here.
                  // BUT we need the application details first.
                  get(ref(db, `${orgPath}/leaveApplications/${id}`)).then(snap => {
                      const app = snap.val();
                      if (app) {
                          get(ref(db, `${orgPath}/leaveBalances/${app.userId}`)).then(balSnap => {
                              let balance = balSnap.val();
                              if (!balance) balance = { id: app.userId, userId: app.userId, fiscalYear: currentFiscalYear, casual: 0, festival: 0, sick: 0, home: 0, other: 0, maternity: 0, kiriya: 0, study: 0, extraordinary: 0, serviceType: 'Permanent' };
                              
                              // Calculate days
                              const d1 = new Date(new NepaliDate(app.startDate).toJsDate());
                              const d2 = new Date(new NepaliDate(app.endDate).toJsDate());
                              const diffTime = Math.abs(d2.getTime() - d1.getTime());
                              const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                              let field = '';
                              if (app.leaveType === 'Casual & Festival') field = 'casual'; // Simplified mapping, ideally split
                              else if (app.leaveType === 'Sick Leave') field = 'sick';
                              else if (app.leaveType === 'Home Leave') field = 'home';
                              else if (app.leaveType === 'Maternity Leave') field = 'maternity';
                              else if (app.leaveType === 'Kiriya Leave') field = 'kiriya';
                              else if (app.leaveType === 'Study Leave') field = 'study';
                              else if (app.leaveType === 'Extraordinary Leave') field = 'extraordinary';
                              else if (app.leaveType === 'Other Leave') field = 'other';
                              
                              if (field) {
                                  // @ts-ignore
                                  balance[field] = Math.max(0, (balance[field] || 0) - days);
                                  update(ref(db), { [`${orgPath}/leaveBalances/${app.userId}`]: balance });
                              }
                          });
                      }
                  });
              }
              update(ref(db), updates);
          }}
          onDeleteLeaveApplication={(id) => remove(getOrgRef(`leaveApplications/${id}`))}
          leaveBalances={leaveBalances} onSaveLeaveBalance={(b) => set(getOrgRef(`leaveBalances/${b.id}`), b)}
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
