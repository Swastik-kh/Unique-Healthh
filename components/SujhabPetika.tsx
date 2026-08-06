import React, { useEffect, useState, useMemo } from 'react';
import { MessageSquare, Clock, CheckCircle, AlertCircle, AlertTriangle, FileText, User, Phone, Mail, Building, Archive, Settings, X, CheckSquare, Square, QrCode, Printer, Plus, Download, ExternalLink, RefreshCw } from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, where, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db as localDb } from '../firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAtt4_yw8_76inlXJPgMNRV0h0vqPpvgt8",
  authDomain: "asymmetric-flow-scf5x.firebaseapp.com",
  projectId: "asymmetric-flow-scf5x",
  storageBucket: "asymmetric-flow-scf5x.firebasestorage.app",
  messagingSenderId: "1047209545761",
  appId: "1:1047209545761:web:d81af21e1f0d477cf31360"
};

const appName = "sujhabPetikaSource";
const sujhabApp = getApps().find(a => a.name === appName) || initializeApp(firebaseConfig, appName);
const sujhabDb = getFirestore(sujhabApp, "ai-studio-digitalsujabpeti-f3ba13ee-e50b-48cc-bf1e-2244437f6abf");

interface Gunaso {
  id: string;
  trackingCode: string;
  subject: string;
  type: string;
  department?: string;
  description: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  priority?: string;
  status: string;
  createdAt: any;
  remarks?: string;
  assignedOfficer?: string;
  remarksDate?: any;
  office?: string;
}

interface SujhabPetikaProps {
  currentUser?: any;
  users?: any[];
}

export const SujhabPetika: React.FC<SujhabPetikaProps> = ({ currentUser, users = [] }) => {
  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN';
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SUPERADMIN';
  const allOrganizations = useMemo(() => {
    return Array.from(new Set(
      users?.filter(u => u.allowedMenus?.includes('sujhab_petika'))
            .map(u => (u.organizationName || '').trim())
            .filter(Boolean)
    )).sort();
  }, [users]);

  const [gunasos, setGunasos] = useState<Gunaso[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSelectedOrg, setSettingsSelectedOrg] = useState('');
  const [newManualOffice, setNewManualOffice] = useState('');
  const [mappedOrgsInfo, setMappedOrgsInfo] = useState<{org: string, offices: string[]}[]>([]);
  const [allOffices, setAllOffices] = useState<string[]>([]);
  const [selectedOffices, setSelectedOffices] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUnconfigured, setIsUnconfigured] = useState(false);

  const [showActionModal, setShowActionModal] = useState<Gunaso | null>(null);
  const [actionStatus, setActionStatus] = useState('registered');
  const [actionOfficer, setActionOfficer] = useState('');
  const [actionRemarks, setActionRemarks] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrOffice, setQrOffice] = useState('');
  const [newQrOffice, setNewQrOffice] = useState('');
  
  const SUJHAB_PETIKA_APP_URL = "https://gunaso-petika.vercel.app";


  useEffect(() => {
    fetchData();
  }, [currentUser]);
  
  useEffect(() => {
    if (isSuperAdmin) {
      const fetchAllMappings = async () => {
        try {
          const querySnapshot = await getDocs(collection(localDb, 'sujhabPetikaOfficeMap'));
          const mappings: {org: string, offices: string[]}[] = [];
          querySnapshot.forEach((doc) => {
            mappings.push({ org: doc.id, offices: doc.data().officeNames || [] });
          });
          setMappedOrgsInfo(mappings);
        } catch (e) {
          console.error(e);
        }
      };
      fetchAllMappings();
    }
  }, [isSuperAdmin, showSettings]);


  const chunkArray = (array: any[], size: number) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  const fetchData = async () => {
    const orgKey = (currentUser?.organizationName || '').trim();
    if (!orgKey) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setIsUnconfigured(false);
    setFetchError(null);
    
    try {
      // 1. Read mapping from local DB
      const mappingDocRef = doc(localDb, 'sujhabPetikaOfficeMap', orgKey);
      const mappingDoc = await getDoc(mappingDocRef);
      
      let mappedOffices: string[] = [];
      if (mappingDoc.exists()) {
        mappedOffices = mappingDoc.data().officeNames || [];
        setSelectedOffices(mappedOffices);
      }
      
      if (mappedOffices.length === 0) {
        setIsUnconfigured(true);
        setGunasos([]);
        setLoading(false);
        return;
      }
      
      // 2. Fetch from sujhabDb using 'in' chunks
      let allFetchedGunasos: Gunaso[] = [];
      const chunks = chunkArray(mappedOffices, 10);
      
      for (const chunk of chunks) {
        const q = query(collection(sujhabDb, 'gunasos'), where('office', 'in', chunk));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          allFetchedGunasos.push({ id: doc.id, ...doc.data() } as Gunaso);
        });
      }
      
      // 3. Sort by createdAt descending locally
      allFetchedGunasos.sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
          return bTime - aTime;
      });
      
      setGunasos(allFetchedGunasos);
      
    } catch (error: any) {
      console.error("Error fetching data:", error);
      setFetchError(error?.message || 'अज्ञात त्रुटि');
    } finally {
      setLoading(false);
    }
  };


  const addManualOffice = () => {
    if (!newManualOffice.trim()) return;
    const office = newManualOffice.trim();
    if (!allOffices.includes(office)) {
      setAllOffices(prev => [...prev, office].sort());
    }
    if (!selectedOffices.includes(office)) {
      setSelectedOffices(prev => [...prev, office]);
    }
    setNewManualOffice('');
  };

  const loadMappingForOrg = async (orgName: string) => {
      const trimmedOrg = (orgName || '').trim();
      if (!trimmedOrg) {
          setSelectedOffices([]);
          return;
      }
      try {
          const mappingDocRef = doc(localDb, 'sujhabPetikaOfficeMap', trimmedOrg);
          const mappingDoc = await getDoc(mappingDocRef);
          if (mappingDoc.exists()) {
              setSelectedOffices(mappingDoc.data().officeNames || []);
          } else {
              setSelectedOffices([]);
          }
      } catch (e) {
          console.error(e);
      }
  };

  const openSettings = async () => {
    setShowSettings(true);
    const targetOrg = (currentUser?.organizationName || '').trim();
    setSettingsSelectedOrg(targetOrg);
    await loadMappingForOrg(targetOrg);
    try {
        const q = query(collection(sujhabDb, 'gunasos'));
        const querySnapshot = await getDocs(q);
        const offices = new Set<string>();
        
        // From gunasos collection
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.office) {
                offices.add(data.office.trim());
            }
        });

        // From users prop (those with sujhab_petika access)
        users.filter(u => u.allowedMenus?.includes('sujhab_petika'))
             .forEach(u => {
                 if (u.organizationName) {
                     offices.add(u.organizationName.trim());
                 }
             });

        setAllOffices(Array.from(offices).sort());
    } catch(err) {
        console.error("Error fetching distinct offices", err);
    }
  };

  const saveSettings = async () => {
    const orgKey = (settingsSelectedOrg || '').trim();
    if (!orgKey) return;
    setIsSaving(true);
    try {
        const mappingDocRef = doc(localDb, 'sujhabPetikaOfficeMap', orgKey);
        await setDoc(mappingDocRef, { officeNames: selectedOffices }, { merge: true });
        
        if (orgKey === (currentUser?.organizationName || '').trim()) {
            fetchData();
        } else {
            alert("म्यापिङ सफलतापूर्वक सेभ भयो।");
        }
        setShowSettings(false);
    } catch(err) {
        console.error("Error saving mapping", err);
    } finally {
        setIsSaving(false);
    }
  };

  
  const handleAction = async () => {
      if (!showActionModal) return;
      setIsUpdating(true);
      try {
          const gunasoRef = doc(sujhabDb, 'gunasos', showActionModal.id);
          const updateData = {
              status: actionStatus,
              assignedOfficer: actionOfficer,
              remarks: actionRemarks,
              remarksDate: new Date().toISOString()
          };
          
          await updateDoc(gunasoRef, updateData);
          
          // Update local state
          setGunasos(prev => prev.map(g => {
              if (g.id === showActionModal.id) {
                  return { ...g, ...updateData };
              }
              return g;
          }));
          
          setShowActionModal(null);
          alert("कारबाही सफलतापूर्वक सेभ भयो।");
      } catch (error) {
          console.error("Error updating gunaso:", error);
          alert("त्रुटि: अपडेट गर्न सकिएन।");
      } finally {
          setIsUpdating(false);
      }
  };

  const openActionModal = (gunaso: Gunaso) => {
      setShowActionModal(gunaso);
      setActionStatus(gunaso.status || 'registered');
      setActionOfficer(gunaso.assignedOfficer || '');
      setActionRemarks(gunaso.remarks || '');
  };

  const openQRModal = () => {
      if (selectedOffices.length > 0) {
          setQrOffice(selectedOffices[0]);
      } else {
          setQrOffice('');
      }
      setShowQRModal(true);
  };
  
  const handlePrintQR = () => {
      window.print();
  };
  
  const addOfficeForQR = async () => {
      if (!newQrOffice.trim() || !currentUser?.organizationName) return;
      
      const newOffices = [...selectedOffices, newQrOffice.trim()];
      try {
          const mappingDocRef = doc(localDb, 'sujhabPetikaOfficeMap', currentUser.organizationName);
          await setDoc(mappingDocRef, { officeNames: newOffices }, { merge: true });
          setSelectedOffices(newOffices);
          setQrOffice(newQrOffice.trim());
          setNewQrOffice('');
          fetchData();
      } catch(err) {
          console.error("Error adding office for QR mapping", err);
      }
  };

  const toggleOffice = (office: string) => {
      setSelectedOffices(prev => 
          prev.includes(office) ? prev.filter(o => o !== office) : [...prev, office]
      );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><AlertCircle size={12}/> दर्ता भएको</span>;
      case 'processing':
        return <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><Clock size={12}/> प्रक्रियामा</span>;
      case 'resolved':
        return <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircle size={12}/> समाधान भएको</span>;
      case 'archived':
        return <span className="bg-slate-100 text-slate-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><Archive size={12}/> अभिलेख</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><AlertCircle size={12}/> {status}</span>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'suggestion': return 'सुझाव';
      case 'complaint': return 'गुनासो';
      case 'inquiry': return 'सोधपुछ';
      default: return type;
    }
  };

  const getPriorityBadge = (priority: string) => {
      if(!priority) return null;
      switch(priority.toLowerCase()) {
          case 'high': return <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded border border-red-200">उच्च प्राथमिकता</span>;
          case 'medium': return <span className="bg-orange-50 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded border border-orange-200">मध्यम प्राथमिकता</span>;
          case 'low': return <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded border border-green-200">न्यून प्राथमिकता</span>;
          default: return null;
      }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('ne-NP') + ' ' + date.toLocaleTimeString('ne-NP', {hour: '2-digit', minute:'2-digit'});
    } catch (e) {
      return '';
    }
  };

  if (loading) {
      return (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="text-primary-600" size={28} />
              <h2 className="text-2xl font-black text-slate-800 font-nepali">सुझाव पेटिका</h2>
            </div>
          </div>
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center shadow-sm">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
             <p className="mt-4 text-slate-500 font-nepali">डाटा लोड हुँदैछ...</p>
          </div>
        </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="text-primary-600" size={28} />
          <div>
              <h2 className="text-2xl font-black text-slate-800 font-nepali">सुझाव पेटिका</h2>
              <p className="text-sm text-slate-500 font-nepali mt-1">सर्वसाधारणबाट प्राप्त सुझाव तथा गुनासोहरूको सूची (Read-only)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 flex items-center gap-3">
                <div className="text-center">
                    <div className="text-2xl font-black text-primary-700">{gunasos.length}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-nepali">जम्मा</div>
                </div>
            </div>
            
            
            <button 
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 font-nepali font-bold text-sm disabled:opacity-50"
              title="रिफ्रेस गर्नुहोस्"
            >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                रिफ्रेस
            </button>
            
            {isAdmin && (
              <button 
                onClick={openQRModal}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 font-nepali font-bold text-sm"
              >
                  <QrCode size={18} />
                  QR पोस्टर
              </button>
            )}
            
            {isSuperAdmin && (
                <button 
                  onClick={openSettings}
                  className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                  title="कार्यालय म्यापिङ सेटिङ्स"
                >
                    <Settings size={20} />
                </button>
            )}
        </div>
      </div>
      
      {fetchError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-6">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div>
                  <h3 className="text-sm font-bold text-red-800 font-nepali">डाटा ल्याउन समस्या भयो</h3>
                  <p className="text-xs text-red-600 mt-1 font-mono">{fetchError}</p>
              </div>
          </div>
      )}

      {isUnconfigured || gunasos.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center shadow-sm">
          <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="text-slate-400" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-700 font-nepali mb-2">सुझाव पेटिका खाली छ</h3>
          {isUnconfigured ? (
              <p className="text-slate-500 font-nepali">कृपया माथि ⚙️ बाट आफ्नो संस्थासँग मिल्ने office मिलाउनुहोस्।</p>
          ) : (
              <p className="text-slate-500 font-nepali">अहिले कुनै पनि नयाँ सुझाव प्राप्त भएको छैन।</p>
          )}
        </div>
      ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {gunasos.map((g) => (
                  <div key={g.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">

                      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                                  #{g.trackingCode || g.id.slice(0,6)}
                              </span>
                              <span className="text-xs font-bold text-slate-600 bg-slate-200/50 px-2 py-1 rounded font-nepali">
                                  {getTypeLabel(g.type)}
                              </span>
                          </div>
                          <div className="flex items-center gap-2">
                              {getPriorityBadge(g.priority || '')}
                              {getStatusBadge(g.status)}
                              
                              {isAdmin && (
                                  <button
                                      onClick={() => openActionModal(g)}
                                      className="ml-2 px-2 py-1 bg-white border border-primary-200 text-primary-600 rounded text-xs font-bold font-nepali hover:bg-primary-50 transition-colors"
                                  >
                                      कारबाही गर्नुहोस्
                                  </button>
                              )}
                          </div>
                      </div>

                      
                      <div className="p-5 flex-1">
                          <h3 className="text-lg font-bold text-slate-800 font-nepali mb-3">{g.subject}</h3>
                          
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4 text-sm text-slate-600 font-nepali whitespace-pre-wrap">
                              {g.description}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-xs">
                              {g.department && (
                                  <div className="flex items-start gap-2">
                                      <Building size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                      <div>
                                          <div className="font-bold text-slate-500 font-nepali">शाखा/विभाग</div>
                                          <div className="text-slate-700 font-nepali font-medium">{g.department}</div>
                                      </div>
                                  </div>
                              )}
                              
                              {g.office && (
                                  <div className="flex items-start gap-2">
                                      <Building size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                      <div>
                                          <div className="font-bold text-slate-500 font-nepali">कार्यालय</div>
                                          <div className="text-slate-700 font-nepali font-medium">{g.office}</div>
                                      </div>
                                  </div>
                              )}
                              
                              <div className="flex items-start gap-2">
                                  <Clock size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                  <div>
                                      <div className="font-bold text-slate-500 font-nepali">मिति</div>
                                      <div className="text-slate-700 font-mono font-medium">{formatDate(g.createdAt)}</div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      
                      {(g.contactName || g.contactPhone || g.contactEmail) && (
                          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-nepali">सम्पर्क विवरण</div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                                  {g.contactName && (
                                      <div className="flex items-center gap-1.5 text-slate-600">
                                          <User size={13} className="text-slate-400"/>
                                          <span className="font-nepali font-medium">{g.contactName}</span>
                                      </div>
                                  )}
                                  {g.contactPhone && (
                                      <div className="flex items-center gap-1.5 text-slate-600">
                                          <Phone size={13} className="text-slate-400"/>
                                          <span className="font-mono">{g.contactPhone}</span>
                                      </div>
                                  )}
                                  {g.contactEmail && (
                                      <div className="flex items-center gap-1.5 text-slate-600">
                                          <Mail size={13} className="text-slate-400"/>
                                          <span className="font-medium">{g.contactEmail}</span>
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}
                      

                      {g.remarks && (
                          <div className="px-5 py-3 border-t border-yellow-100 bg-yellow-50/30">
                              <div className="flex items-start gap-2">
                                  <FileText size={14} className="text-yellow-600 mt-0.5 shrink-0" />
                                  <div>
                                      <div className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider mb-0.5 font-nepali flex items-center gap-2">
                                          कैफियत / प्रतिक्रिया
                                          {g.assignedOfficer && <span className="lowercase normal-case text-[10px] bg-yellow-100 px-1.5 py-0.5 rounded text-yellow-700">({g.assignedOfficer})</span>}
                                          {g.remarksDate && <span className="lowercase normal-case text-[10px] text-yellow-600 font-mono">{formatDate(g.remarksDate)}</span>}
                                      </div>
                                      <div className="text-xs text-yellow-800 font-nepali whitespace-pre-wrap">{g.remarks}</div>
                                  </div>
                              </div>
                          </div>
                      )}

                  </div>
              ))}
          </div>
      )}
      
      {/* Settings Modal */}
      {showSettings && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800 font-nepali flex items-center gap-2">
                    <Settings size={20} className="text-primary-600" />
                    कार्यालय म्यापिङ (Office Mapping)
                </h2>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={24} />
                </button>
              </div>
              

              <div className="p-6 overflow-y-auto flex-1 bg-white">
                 <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-sm font-bold text-slate-700 font-nepali mb-2">
                        संस्था छान्नुहोस्:
                    </label>
                    <select 
                        value={settingsSelectedOrg}
                        onChange={(e) => {
                            setSettingsSelectedOrg(e.target.value);
                            loadMappingForOrg(e.target.value);
                        }}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-nepali focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="">-- संस्था छान्नुहोस् --</option>
                        {allOrganizations.map((org, idx) => (
                            <option key={idx} value={org}>{org}</option>
                        ))}
                    </select>
                 </div>
                 
                 <p className="text-sm text-slate-500 font-nepali mb-4">
                     लक्षित संस्थामा कुन-कुन कार्यालयका सुझावहरू देखाउने भनेर छनोट गर्नुहोस्:
                 </p>

                 
                 {allOffices.length === 0 ? (
                     <div className="flex justify-center p-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div></div>
                 ) : (
                     <div className="space-y-2 border border-slate-200 rounded-xl p-2 max-h-60 overflow-y-auto bg-slate-50">
                         {allOffices.map((office, idx) => (
                             <div 
                                key={idx} 
                                onClick={() => toggleOffice(office)}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${selectedOffices.includes(office) ? 'bg-primary-50 border-primary-200' : 'bg-white border-transparent hover:border-slate-200'}`}
                             >
                                 <div className={selectedOffices.includes(office) ? 'text-primary-600' : 'text-slate-300'}>
                                     {selectedOffices.includes(office) ? <CheckSquare size={18} /> : <Square size={18} />}
                                 </div>
                                 <span className={`text-sm font-nepali ${selectedOffices.includes(office) ? 'text-primary-900 font-bold' : 'text-slate-700'}`}>
                                     {office}
                                 </span>
                             </div>
                         ))}
                     </div>
                 )}
              </div>
              
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                  <button 
                      onClick={() => setShowSettings(false)}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors font-nepali"
                  >
                      रद्द गर्नुहोस्
                  </button>
                  <button 
                      onClick={saveSettings}
                      disabled={isSaving}
                      className="px-6 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 font-nepali"
                  >
                      {isSaving && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>}
                      सुरक्षित गर्नुहोस्
                  </button>
              </div>
            </div>
          </div>
      )}
      
      {/* Action Modal */}
      {showActionModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800 font-nepali flex items-center gap-2">
                    <FileText size={20} className="text-primary-600" />
                    कारबाही / प्रतिक्रिया
                </h2>
                <button onClick={() => setShowActionModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 bg-white space-y-4">
                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-2">
                    <div className="text-xs font-bold text-slate-500 font-nepali mb-1">सुझाव/गुनासो:</div>
                    <div className="text-sm font-medium text-slate-800 font-nepali">{showActionModal.subject}</div>
                 </div>
                 
                 <div>
                    <label className="block text-sm font-bold text-slate-700 font-nepali mb-1">स्थिति (Status) *</label>
                    <select 
                        value={actionStatus}
                        onChange={(e) => setActionStatus(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-nepali focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="registered">दर्ता भएको (Registered)</option>
                        <option value="processing">प्रक्रियामा (Processing)</option>
                        <option value="resolved">फछ्र्यौट / समाधान भएको (Resolved)</option>
                        <option value="archived">संग्रहित (Archived)</option>
                    </select>
                 </div>
                 
                 <div>
                    <label className="block text-sm font-bold text-slate-700 font-nepali mb-1">जिम्मेवार अधिकारी</label>
                    <input 
                        type="text"
                        value={actionOfficer}
                        onChange={(e) => setActionOfficer(e.target.value)}
                        placeholder="अधिकारीको नाम"
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-nepali focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                 </div>
                 
                 <div>
                    <label className="block text-sm font-bold text-slate-700 font-nepali mb-1">कारबाही / प्रतिक्रिया (Remarks)</label>
                    <textarea 
                        value={actionRemarks}
                        onChange={(e) => setActionRemarks(e.target.value)}
                        rows={4}
                        placeholder="यहाँ प्रतिक्रिया लेख्नुहोस्..."
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-nepali focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                 </div>
              </div>
              
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                  <button 
                      onClick={() => setShowActionModal(null)}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors font-nepali"
                  >
                      रद्द गर्नुहोस्
                  </button>
                  <button 
                      onClick={handleAction}
                      disabled={isUpdating}
                      className="px-6 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 font-nepali"
                  >
                      {isUpdating && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>}
                      सुरक्षित गर्नुहोस्
                  </button>
              </div>
            </div>
          </div>
      )}

      {/* QR Poster Modal / Screen */}
      {showQRModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:bg-white print:p-0 print:inset-0">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[95vh] print:shadow-none print:h-screen print:max-h-screen print:rounded-none">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
                <h2 className="text-lg font-bold text-slate-800 font-nepali flex items-center gap-2">
                    <QrCode size={20} className="text-primary-600" />
                    QR पोस्टर
                </h2>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handlePrintQR}
                        disabled={!qrOffice}
                        className="px-3 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1.5 font-nepali disabled:opacity-50"
                    >
                        <Printer size={16} />
                        <span className="hidden sm:inline">प्रिन्ट</span>
                    </button>
                    {qrOffice && (
                        <>
                            <a 
                                href={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(`${SUJHAB_PETIKA_APP_URL}?office=${qrOffice}`)}`}
                                download={`QR_${qrOffice}.png`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 font-nepali shadow-sm"
                            >
                                <Download size={16} />
                                <span className="hidden sm:inline">डाउनलोड</span>
                            </a>
                            <a 
                                href={`${SUJHAB_PETIKA_APP_URL}?office=${qrOffice}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2 bg-white border border-slate-200 text-primary-600 text-sm font-bold rounded-lg hover:bg-primary-50 transition-colors flex items-center gap-1.5 font-nepali shadow-sm"
                            >
                                <ExternalLink size={16} />
                                <span className="hidden sm:inline">परीक्षण</span>
                            </a>
                        </>
                    )}
                    <button onClick={() => setShowQRModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors ml-1">
                      <X size={24} />
                    </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 bg-slate-100/50 print:bg-white print:overflow-hidden print:p-0">
                  <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
                      <label className="block text-sm font-bold text-slate-700 font-nepali mb-2">QR को लागि कार्यालय छान्नुहोस्:</label>
                      <select 
                          value={qrOffice}
                          onChange={(e) => setQrOffice(e.target.value)}
                          className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-nepali focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
                      >
                          <option value="">-- कार्यालय छान्नुहोस् --</option>
                          {selectedOffices.map((off, idx) => (
                              <option key={idx} value={off}>{off}</option>
                          ))}
                      </select>
                      
                      {isAdmin && (
                          <div className="flex gap-2 items-center pt-4 border-t border-slate-100">
                              <input 
                                  type="text"
                                  value={newQrOffice}
                                  onChange={(e) => setNewQrOffice(e.target.value)}
                                  placeholder="नयाँ कार्यालयको नाम..."
                                  className="flex-1 p-2 border border-slate-300 rounded-lg text-sm font-nepali focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                              <button 
                                  onClick={addOfficeForQR}
                                  disabled={!newQrOffice.trim()}
                                  className="px-3 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-900 transition-colors disabled:opacity-50 flex items-center gap-1 font-nepali"
                              >
                                  <Plus size={16} />
                                  थप्नुहोस्
                              </button>
                          </div>
                      )}
                  </div>
                  
                  {qrOffice ? (
                      <div className="bg-white mx-auto max-w-[210mm] min-h-[297mm] shadow-lg print:shadow-none p-12 flex flex-col items-center justify-center border border-slate-200 print:border-none print:w-full print:h-full relative overflow-hidden">
                          {/* Decorative Background Elements for Print */}
                          <div className="absolute top-0 left-0 w-full h-32 bg-primary-600 print:block"></div>
                          <div className="absolute top-32 left-0 w-full h-2 bg-primary-400 print:block"></div>
                          <div className="absolute bottom-0 left-0 w-full h-8 bg-primary-600 print:block"></div>
                          
                          <div className="relative z-10 flex flex-col items-center justify-center w-full mt-10">
                              <div className="bg-white p-4 rounded-2xl shadow-xl mb-6">
                                  <MessageSquare size={64} className="text-primary-600" />
                              </div>
                              
                              <h1 className="text-4xl font-black text-slate-800 font-nepali mb-2 text-center">
                                  {currentUser?.organizationName || 'संस्था'}
                              </h1>
                              <h2 className="text-2xl font-bold text-primary-700 font-nepali mb-8 text-center">
                                  {qrOffice}
                              </h2>
                              
                              <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-primary-100 mb-8">
                                  <img 
                                      src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`${SUJHAB_PETIKA_APP_URL}?office=${qrOffice}`)}`}
                                      alt="QR Code"
                                      className="w-64 h-64 object-contain"
                                  />
                              </div>
                              
                              <div className="text-center max-w-md">
                                  <h3 className="text-2xl font-black text-slate-800 font-nepali mb-4">
                                      सुझाव तथा गुनासो पेटिका
                                  </h3>
                                  <p className="text-lg text-slate-600 font-nepali leading-relaxed mb-6">
                                      तपाईंको अमूल्य सुझाव वा गुनासो माथिको QR कोड स्क्यान गरी हामीलाई पठाउनुहोस्।
                                  </p>
                                  <div className="bg-slate-50 px-6 py-3 rounded-xl border border-slate-200 inline-block">
                                      <p className="text-sm font-bold text-slate-500 font-nepali">
                                          हामी तपाईंको गोपनीयताको सम्मान गर्दछौं।
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  ) : (
                      <div className="bg-white p-12 text-center rounded-xl border border-slate-200 print:hidden">
                          <QrCode size={48} className="mx-auto text-slate-300 mb-4" />
                          <p className="text-slate-500 font-nepali">कृपया माथिबाट कार्यालय छान्नुहोस्।</p>
                      </div>
                  )}
              </div>
            </div>
          </div>
      )}

      
            {isSuperAdmin && allOrganizations.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-8">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 font-nepali border-b border-slate-100 pb-2">
                  सबै संस्थाहरूको सूची र म्यापिङ स्थिति
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allOrganizations.map((org, idx) => {
                      const mapping = mappedOrgsInfo.find(m => m.org === org);
                      return (
                          <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-2">
                              <div className="font-bold text-slate-800 font-nepali text-sm flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                      <Building size={16} className={mapping ? "text-primary-600" : "text-slate-400"} />
                                      {org}
                                  </div>
                                  {mapping ? (
                                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                                  ) : (
                                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">No Mapping</span>
                                  )}
                              </div>
                              {mapping && mapping.offices.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                      {mapping.offices.map((off, oidx) => (
                                          <span key={oidx} className="text-[10px] bg-white px-2 py-1 rounded-lg border border-slate-200 text-slate-500 font-nepali shadow-sm">
                                              {off}
                                          </span>
                                      ))}
                                  </div>
                              )}
                              {!mapping && (
                                  <p className="text-[10px] text-slate-400 italic font-nepali">सेटिङ्सबाट म्यापिङ गर्नुहोस।</p>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

    </div>
  );
};
