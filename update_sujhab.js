import fs from 'fs';

let content = fs.readFileSync('components/SujhabPetika.tsx', 'utf-8');

// Update imports
content = content.replace(
  `import { getFirestore, collection, getDocs, query, orderBy, where, doc, getDoc, setDoc } from 'firebase/firestore';`,
  `import { getFirestore, collection, getDocs, query, orderBy, where, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';`
);

content = content.replace(
  `import { MessageSquare, Clock, CheckCircle, AlertCircle, FileText, User, Phone, Mail, Building, Archive, Settings, X, CheckSquare, Square } from 'lucide-react';`,
  `import { MessageSquare, Clock, CheckCircle, AlertCircle, FileText, User, Phone, Mail, Building, Archive, Settings, X, CheckSquare, Square, QrCode, Printer, Plus } from 'lucide-react';`
);

// Add fields to Gunaso
content = content.replace(
  `  remarks?: string;`,
  `  remarks?: string;\n  assignedOfficer?: string;\n  remarksDate?: any;`
);

// We need to inject states and methods inside the component
let newStates = `
  const [showActionModal, setShowActionModal] = useState<Gunaso | null>(null);
  const [actionStatus, setActionStatus] = useState('registered');
  const [actionOfficer, setActionOfficer] = useState('');
  const [actionRemarks, setActionRemarks] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrOffice, setQrOffice] = useState('');
  const [newQrOffice, setNewQrOffice] = useState('');
  
  const SUJHAB_PETIKA_APP_URL = "https://digitalsujabpeti.web.app";
`;

content = content.replace(
  `const [isUnconfigured, setIsUnconfigured] = useState(false);`,
  `const [isUnconfigured, setIsUnconfigured] = useState(false);\n${newStates}`
);

let newMethods = `
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
`;

content = content.replace(
  `const toggleOffice = (office: string) => {`,
  `${newMethods}\n  const toggleOffice = (office: string) => {`
);

let headerButtons = `
            <button 
              onClick={openQRModal}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 font-nepali font-bold text-sm"
            >
                <QrCode size={18} />
                QR पोस्टर
            </button>
            
            {isAdmin && (
`;

content = content.replace(
  `{isAdmin && (`,
  headerButtons
);


let itemActions = `
                      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
`;

let itemActionsReplacement = `
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
`;
content = content.replace(
    `                      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
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
                          </div>
                      </div>`,
    itemActionsReplacement
);


let remarksSection = `
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
`;

content = content.replace(
  `                      {g.remarks && (
                          <div className="px-5 py-3 border-t border-yellow-100 bg-yellow-50/30">
                              <div className="flex items-start gap-2">
                                  <FileText size={14} className="text-yellow-600 mt-0.5 shrink-0" />
                                  <div>
                                      <div className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider mb-0.5 font-nepali">कैफियत / प्रतिक्रिया</div>
                                      <div className="text-xs text-yellow-800 font-nepali whitespace-pre-wrap">{g.remarks}</div>
                                  </div>
                              </div>
                          </div>
                      )}`,
  remarksSection
);


let modals = `
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
                        className="px-4 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 font-nepali disabled:opacity-50"
                    >
                        <Printer size={16} />
                        प्रिन्ट गर्नुहोस्
                    </button>
                    <button onClick={() => setShowQRModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors ml-2">
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
                                      src={\`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=\${encodeURIComponent(\`\${SUJHAB_PETIKA_APP_URL}?office=\${qrOffice}\`)}\`}
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
`;


content = content.replace(
  `    </div>
  );
};`,
  `      ${modals}
    </div>
  );
};`
);


fs.writeFileSync('components/SujhabPetika.tsx', content);
