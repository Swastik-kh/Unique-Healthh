import React, { useState, useRef } from 'react';
import { BharmanAdeshEntry, User, OrganizationSettings, LeaveBalance } from '../types/coreTypes';
import { Plus, Printer, Save, X, Eye, Trash2 } from 'lucide-react';
import { LogoDisplay } from './LogoDisplay';
import { Input } from './Input';
import { NepaliDatePicker } from './NepaliDatePicker';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { useReactToPrint } from 'react-to-print';

interface BharmanAdeshProps {
  currentFiscalYear: string;
  currentUser: User | null;
  bharmanAdeshEntries: BharmanAdeshEntry[];
  onSaveEntry: (entry: BharmanAdeshEntry) => void;
  onDeleteEntry: (id: string) => void;
  users: User[];
  generalSettings: OrganizationSettings;
  leaveBalances: LeaveBalance[];
}

const TRANSPORT_MEANS = [
  'बस',
  'जिप/कार',
  'मोटरसाइकल',
  'हवाईजहाज',
  'पैदल',
  'अन्य'
];

export const BharmanAdesh: React.FC<BharmanAdeshProps> = ({
  currentFiscalYear,
  currentUser,
  bharmanAdeshEntries,
  onSaveEntry,
  onDeleteEntry,
  users,
  generalSettings,
  leaveBalances
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<BharmanAdeshEntry | null>(null);

  const getInitialFormData = (): Omit<BharmanAdeshEntry, 'id' | 'fiscalYear'> => {
    let today = '';
    try {
      today = new NepaliDate().format('YYYY-MM-DD');
    } catch (e) {}

    const entriesForYear = bharmanAdeshEntries.filter(e => e.fiscalYear === currentFiscalYear);
    const sortedEntries = [...entriesForYear].sort((a, b) => {
        const numA = parseInt(a.chalaniNo.split('-')[0]) || 0;
        const numB = parseInt(b.chalaniNo.split('-')[0]) || 0;
        return numB - numA;
    });
    const nextSerialNumber = sortedEntries.length > 0 ? (parseInt(sortedEntries[0].chalaniNo.split('-')[0]) || 0) + 1 : 1;
    const fiscalYearSuffix = currentFiscalYear.slice(2, 4) + currentFiscalYear.slice(7, 9);
    const paddedSerialNumber = nextSerialNumber.toString().padStart(3, '0');
    const nextChalaniNo = `${paddedSerialNumber}-${fiscalYearSuffix}`;

    return {
      date: today,
      sankhya: currentFiscalYear,
      chalaniNo: nextChalaniNo,
      ksNo: '',
      employeeName: currentUser?.fullName || '',
      designation: currentUser?.designation || '',
      office: 'आधारभूत नगर अस्पताल बेल्टार',
      destination: '',
      purpose: '',
      fromDate: today,
      toDate: today,
      transportMeans: 'बस',
      travelAllowance: '',
      dailyAllowance: '',
      miscExpense: '',
      otherOrders: '',
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: BharmanAdeshEntry = {
      id: Date.now().toString(),
      fiscalYear: currentFiscalYear,
      ...formData,
    };
    onSaveEntry(newEntry);
    setIsFormOpen(false);
    setFormData(getInitialFormData());
    alert('भ्रमण आदेश सफलतापूर्वक सुरक्षित गरियो!');
  };

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Bharman_Adesh',
    pageStyle: `
      @page {
        size: A4;
        margin: 10mm;
      }
      @media print {
        body {
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-container-a4 {
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          border: none !important;
          box-shadow: none !important;
          background: white !important;
        }
      }
    `
  });

  const entriesForYear = bharmanAdeshEntries.filter(e => e.fiscalYear === currentFiscalYear);

  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  const toNepaliDigits = (num: string | number) => {
    if (!num) return '';
    return num.toString().split('').map(digit => {
      const d = parseInt(digit);
      return isNaN(d) ? digit : nepaliDigits[d];
    }).join('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">भ्रमण आदेश (आ.व. {currentFiscalYear})</h2>
        <button 
          onClick={() => {
            setFormData(getInitialFormData());
            setIsFormOpen(true);
          }} 
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700"
        >
          <Plus size={18} /> नयाँ आदेश
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="p-3">च.नं.</th>
                <th className="p-3">मिति</th>
                <th className="p-3">कर्मचारीको नाम</th>
                <th className="p-3">भ्रमण गर्ने स्थान</th>
                <th className="p-3">उद्देश्य</th>
                <th className="p-3 text-right">कार्य</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entriesForYear.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold">{entry.chalaniNo}</td>
                  <td className="p-3">{entry.date}</td>
                  <td className="p-3 font-medium">{entry.employeeName}</td>
                  <td className="p-3">{entry.destination}</td>
                  <td className="p-3">{entry.purpose}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setSelectedEntry(entry)}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="प्रिन्ट / हेर्नुहोस्"
                      >
                        <Printer size={18} />
                      </button>
                      {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && (
                        <button 
                          onClick={() => {
                            if (window.confirm('के तपाईं यो भ्रमण आदेश हटाउन चाहनुहुन्छ?')) {
                              onDeleteEntry(entry.id);
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {entriesForYear.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 italic">कुनै भ्रमण आदेश भेटिएन।</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-slate-800 mb-6">नयाँ भ्रमण आदेश</h3>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
              <NepaliDatePicker
                label="मिति"
                value={formData.date}
                onChange={val => setFormData({ ...formData, date: val })}
                required
              />
              <Input
                label="संख्या (आ.व.)"
                value={formData.sankhya}
                onChange={e => setFormData({ ...formData, sankhya: e.target.value })}
                required
              />
              <Input
                label="च.नं."
                value={formData.chalaniNo}
                onChange={e => setFormData({ ...formData, chalaniNo: e.target.value })}
                disabled
              />
              <Input
                label="क.स.नं."
                value={formData.ksNo}
                onChange={e => setFormData({ ...formData, ksNo: e.target.value })}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-slate-700">१. भ्रमण गर्ने पदाधिकारी वा कर्मचारीको नाम</label>
                <select
                  value={formData.employeeName}
                  onChange={e => {
                    const selectedName = e.target.value;
                    const selectedUser = users.find(u => u.fullName === selectedName);
                    
                    // Find leave balance record for the selected user
                    const userBalance = selectedUser ? leaveBalances.find(b => b.userId === selectedUser.id) : undefined;
                    
                    // Auto-fill ksNo only if serviceType is 'Permanent' in leave balance record
                    const autoKsNo = (userBalance && userBalance.serviceType === 'Permanent') ? userBalance.userId : '';

                    setFormData({ 
                      ...formData, 
                      employeeName: selectedName,
                      designation: selectedUser?.designation || '',
                      ksNo: autoKsNo
                    });
                  }}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                  required
                >
                  <option value="">छान्नुहोस्</option>
                  {users.map(u => (
                    <option key={u.id} value={u.fullName}>{u.fullName}</option>
                  ))}
                </select>
              </div>
              <Input
                label="२. पद"
                value={formData.designation}
                onChange={e => setFormData({ ...formData, designation: e.target.value })}
                required
              />
              <Input
                label="३. कार्यालय"
                value={formData.office}
                onChange={e => setFormData({ ...formData, office: e.target.value })}
                required
              />
              <Input
                label="४. भ्रमण गर्ने स्थान"
                value={formData.destination}
                onChange={e => setFormData({ ...formData, destination: e.target.value })}
                required
              />
              <div className="md:col-span-2">
                <Input
                  label="५. भ्रमणको उद्देश्य"
                  value={formData.purpose}
                  onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                  required
                />
              </div>
              <NepaliDatePicker
                label="६. भ्रमण गर्ने अवधि (देखि)"
                value={formData.fromDate}
                onChange={val => setFormData({ ...formData, fromDate: val })}
                required
              />
              <NepaliDatePicker
                label="६. भ्रमण गर्ने अवधि (सम्म)"
                value={formData.toDate}
                onChange={val => setFormData({ ...formData, toDate: val })}
                required
              />
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-sm font-bold text-slate-700">७. भ्रमण गर्ने साधन</label>
                <select
                  value={formData.transportMeans}
                  onChange={e => setFormData({ ...formData, transportMeans: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                  required
                >
                  <option value="">छान्नुहोस्</option>
                  {TRANSPORT_MEANS.map(means => (
                    <option key={means} value={means}>{means}</option>
                  ))}
                </select>
              </div>
              
              <div className="md:col-span-2 border-t border-slate-200 pt-4 mt-2">
                <h4 className="font-bold text-slate-700 mb-4">८. भ्रमणको निमित्त माग गरेको पेश्की खर्च</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <Input
                    label="भ्रमणभत्ता"
                    value={formData.travelAllowance}
                    onChange={e => setFormData({ ...formData, travelAllowance: e.target.value })}
                  />
                  <Input
                    label="दैनिकभत्ता"
                    value={formData.dailyAllowance}
                    onChange={e => setFormData({ ...formData, dailyAllowance: e.target.value })}
                  />
                  <Input
                    label="फुटकर खर्च"
                    value={formData.miscExpense}
                    onChange={e => setFormData({ ...formData, miscExpense: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="md:col-span-2">
                <Input
                  label="९. भ्रमण सम्बन्धि अन्य आदेश"
                  value={formData.otherOrders}
                  onChange={e => setFormData({ ...formData, otherOrders: e.target.value })}
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex items-center gap-2 px-6 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg shadow-sm transition-all font-medium"
                >
                  <X size={18} /> रद्द
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg shadow-sm transition-all font-medium"
                >
                  <Save size={18} /> सुरक्षित गर्नुहोस्
                </button>
              </div>
            </form>
            <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full">
              <X size={20}/>
            </button>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl relative flex flex-col max-h-[95vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 no-print">
              <h3 className="text-xl font-bold text-slate-800">भ्रमण आदेश प्रिन्ट</h3>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">
                  <Printer size={18} /> प्रिन्ट
                </button>
                <button onClick={() => setSelectedEntry(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                  <X size={20}/>
                </button>
              </div>
            </div>
            
            <div className="p-8 overflow-y-auto bg-slate-50 flex-1 flex justify-center no-print">
              {/* Print Content */}
              <div 
                ref={printRef} 
                className="bg-white p-8 shadow-sm border border-slate-200 print-container-a4"
                style={{
                  width: '100%',
                  maxWidth: '210mm',
                  minHeight: '270mm',
                  margin: '0 auto',
                  fontFamily: '"Kalimati", "Mangal", sans-serif',
                  color: '#000',
                  fontSize: '15px',
                  lineHeight: '1.5',
                  boxSizing: 'border-box'
                }}
              >
                <div className="text-center mb-6 relative">
                  <div className="absolute left-0 top-0">
                    <LogoDisplay settings={generalSettings} />
                  </div>
                  <div className="font-bold text-xs">अनुसूची - १</div>
                  <div className="text-[10px]">(नियम ३ को उपनियम (४) सँग सम्बन्धित)</div>
                  <div className="font-bold text-xl mt-1">{generalSettings.orgNameNepali}</div>
                  {generalSettings.subTitleNepali && <div className="font-bold text-lg leading-tight">{generalSettings.subTitleNepali}</div>}
                  {generalSettings.subTitleNepali2 && <div className="font-bold text-lg leading-tight">{generalSettings.subTitleNepali2}</div>}
                  {generalSettings.subTitleNepali3 && <div className="font-bold text-lg leading-tight">{generalSettings.subTitleNepali3}</div>}
                  <div className="font-bold text-2xl mt-4 underline underline-offset-4">भ्रमण आदेश</div>
                </div>

                <div className="flex justify-between mb-4">
                  <div className="space-y-0.5">
                    <div>संख्या : {toNepaliDigits(selectedEntry.sankhya)}</div>
                    <div>च.नं. : {toNepaliDigits(selectedEntry.chalaniNo)}</div>
                    <div>क.स.नं. : {toNepaliDigits(selectedEntry.ksNo)}</div>
                  </div>
                  <div className="text-right">
                    <div>मिति : {toNepaliDigits(selectedEntry.date)}</div>
                  </div>
                </div>

                <div className="space-y-2 mb-8">
                  <div className="flex"><span className="w-6 shrink-0">१.</span><span>भ्रमण गर्ने पदाधिकारी वा कर्मचारीको नाम :- <span className="font-bold">{selectedEntry.employeeName}</span> ।</span></div>
                  <div className="flex"><span className="w-6 shrink-0">२.</span><span>पद :- {selectedEntry.designation} ।</span></div>
                  <div className="flex"><span className="w-6 shrink-0">३.</span><span>कार्यालय :- {selectedEntry.office} ।</span></div>
                  <div className="flex"><span className="w-6 shrink-0">४.</span><span>भ्रमण गर्ने स्थान :- {selectedEntry.destination} ।</span></div>
                  <div className="flex"><span className="w-6 shrink-0">५.</span><span>भ्रमणको उद्देश्य :- {selectedEntry.purpose} ।</span></div>
                  <div className="flex"><span className="w-6 shrink-0">६.</span><span>भ्रमण गर्ने अवधि :- मिति {toNepaliDigits(selectedEntry.fromDate)} गते देखि {toNepaliDigits(selectedEntry.toDate)} गते सम्म ।</span></div>
                  <div className="flex"><span className="w-6 shrink-0">७.</span><span>भ्रमण गर्ने साधन :- {selectedEntry.transportMeans} ।</span></div>
                  <div className="flex"><span className="w-6 shrink-0">८.</span><span>भ्रमणको निमित्त माग गरेको पेश्की खर्च :-</span></div>
                  
                  <div className="pl-8 space-y-0.5">
                    <div>भ्रमणभत्ता : {toNepaliDigits(selectedEntry.travelAllowance) || '-'}</div>
                    <div>दैनिकभत्ता : {toNepaliDigits(selectedEntry.dailyAllowance) || '-'}</div>
                    <div>फुटकर खर्च : {toNepaliDigits(selectedEntry.miscExpense) || '-'}</div>
                  </div>

                  <div className="flex"><span className="w-6 shrink-0">९.</span><span>भ्रमण सम्बन्धि अन्य आदेश : {selectedEntry.otherOrders || '-'}</span></div>
                </div>

                <div className="grid grid-cols-3 gap-8 mt-12">
                  <div className="text-left">
                    <div className="border-b border-dashed border-black mb-2 w-full"></div>
                    <div className="font-bold text-sm">भ्रमण गर्ने कर्मचारी</div>
                    <div className="mt-1 text-xs">मिति :- ....................</div>
                  </div>
                  <div className="text-center">
                    <div className="border-b border-dashed border-black mb-2 w-full"></div>
                    <div className="font-bold text-sm">सिफारिस गर्ने</div>
                    <div className="mt-1 text-xs">मिति :- ....................</div>
                  </div>
                  <div className="text-right">
                    <div className="border-b border-dashed border-black mb-2 w-full"></div>
                    <div className="font-bold text-sm">भ्रमण स्वीकृत गर्ने पदाधिकारी</div>
                    <div className="mt-1 text-xs">मिति :- ....................</div>
                  </div>
                </div>

                <div className="flex justify-center mt-8">
                  <div className="border border-black p-5 w-full">
                    <div className="text-center font-bold underline mb-1 text-sm">(आर्थिक प्रशासनशाखाको प्रयोजनका लागि)</div>
                    <div className="text-center font-bold underline mb-3">भ्रमणखर्च</div>
                    
                    <div className="mb-2 text-sm">
                      बजेट नं.................................................. बाट नगद/चेक नं.................................................. रु..................................................
                    </div>
                    <div className="mb-6 text-sm">
                      अक्षरेपी.................................................................................................... दिइएको छ ।
                    </div>

                    <div className="flex justify-between text-sm">
                      <div>
                        <div className="mb-2">बुझिलिनेको सही ..................................................</div>
                        <div>नाम थर :-</div>
                        <div>मिति :-</div>
                      </div>
                      <div className="text-center">
                        <div className="mb-2">..................................................</div>
                        <div>(आर्थिक प्रशासनशाखा)</div>
                        <div>मिति :-</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
