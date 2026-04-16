import React, { useState } from 'react';
import { ClipboardList, Plus, X, Pencil, Trash2, Search, Printer } from 'lucide-react';
import { ServiceSeekerRecord, User, OrganizationSettings, ServiceItem, OPDRecord, EmergencyRecord, CBIMNCIRecord, IPDRecord } from '../types/coreTypes';
import { Input } from './Input';
import { NepaliDatePicker } from './NepaliDatePicker';
import { PatientSticker } from './PatientSticker';
import { PrescriptionPrint } from './PrescriptionPrint';

// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface MulDartaSewaProps {
  records: ServiceSeekerRecord[];
  opdRecords: OPDRecord[];
  emergencyRecords: EmergencyRecord[];
  cbimnciRecords: CBIMNCIRecord[];
  ipdRecords: IPDRecord[];
  serviceItems: ServiceItem[];
  onSaveRecord: (record: ServiceSeekerRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  currentFiscalYear: string;
  currentUser: User;
  generalSettings: OrganizationSettings;
}

const initialFormData: Omit<ServiceSeekerRecord, 'id' | 'fiscalYear'> = {
  uniquePatientId: '',
  registrationNumber: '',
  mulDartaNo: '',
  date: '',
  name: '',
  age: '',
  ageYears: 0,
  ageMonths: 0,
  ageDays: 0,
  dobBs: '',
  dobAd: '',
  gender: 'Male',
  casteCode: '',
  address: '',
  phone: '',
  serviceType: 'OPD',
  visitType: 'New',
  serviceFee: 0,
  remarks: '',
};

export const MulDartaSewa: React.FC<MulDartaSewaProps> = ({ 
  records = [], 
  opdRecords = [],
  emergencyRecords = [],
  cbimnciRecords = [],
  ipdRecords = [],
  serviceItems = [], 
  onSaveRecord, 
  onDeleteRecord, 
  currentFiscalYear, 
  currentUser, 
  generalSettings 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [printRecord, setPrintRecord] = useState<ServiceSeekerRecord | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const [ageUnit, setAgeUnit] = useState<'Days' | 'Months' | 'Years'>('Years');
  const [stickerPatient, setStickerPatient] = useState<ServiceSeekerRecord | null>(null);

  const handlePrintSticker = (record: ServiceSeekerRecord) => {
    // Create a hidden iframe for printing
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

    const stickerData = `ID: ${record.uniquePatientId}\nName: ${record.name}\nAge: ${record.age}\nGender: ${record.gender}`;
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Patient Sticker</title>
        <style>
          @page { size: 4in 2in; margin: 0; }
          body { 
            margin: 0; 
            padding: 0.05in; 
            font-family: sans-serif; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          .sticker-print {
            width: 3.9in;
            height: 1.9in;
            border: 1px solid #000;
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 0.05in;
            font-size: 10px;
            box-sizing: border-box;
            padding: 3px;
          }
          .header { display: flex; align-items: center; gap: 5px; margin-bottom: 5px; }
          .logo { width: 40px; height: 40px; object-fit: contain; }
          .titles { text-align: center; flex: 1; }
          .org-name { font-size: 13px; font-weight: bold; }
          .sub-title { font-size: 10px; }
          .details { flex: 1; }
          .details h3 { font-size: 13px; font-weight: bold; margin: 0 0 2px 0; }
          .details p { margin: 1px 0; }
          .qr-code { width: 0.8in; height: 0.8in; display: flex; flex-direction: column; align-items: center; justify-content: center; }
          canvas { max-width: 100%; max-height: 100%; }
          .footer { font-size: 9px; margin-top: 2px; border-top: 1px solid #ccc; padding-top: 2px; }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
      </head>
      <body>
        <div class="sticker-print">
          <div class="details">
            <div class="header">
              <img src="${generalSettings?.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png'}" class="logo" />
              <div class="titles">
                <div class="org-name">${generalSettings?.orgNameNepali || 'PHC Beltar'}</div>
                ${generalSettings?.subTitleNepali ? `<div class="sub-title">${generalSettings.subTitleNepali}</div>` : ''}
                ${generalSettings?.subTitleNepali2 ? `<div class="sub-title">${generalSettings.subTitleNepali2}</div>` : ''}
                ${generalSettings?.subTitleNepali3 ? `<div class="sub-title">${generalSettings.subTitleNepali3}</div>` : ''}
              </div>
            </div>
            <h3>${record.name}</h3>
            <p><strong>ID:</strong> ${record.uniquePatientId} | <strong>Reg:</strong> ${record.registrationNumber} | <strong>Palo:</strong> ${record.paloNo || 'N/A'}</p>
            <p><strong>Address:</strong> ${record.address || 'N/A'}</p>
            <p><strong>Age/Gender:</strong> ${record.age} / ${record.gender}</p>
            <p><strong>Date/Time:</strong> ${(() => {
              const dateStr = record.date || '';
              const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
              return dateStr.replace(/[0-9]/g, (digit) => nepaliDigits[parseInt(digit)]);
            })()} ${timeString}</p>
            <p><strong>Service Charge:</strong> Rs. ${record.serviceFee || 0}</p>
            <div class="footer"><strong>User:</strong> ${currentUser?.fullName || 'System'}</div>
          </div>
          <div class="qr-code">
            <canvas id="qrcode"></canvas>
            <div style="font-weight: bold; font-size: 14px; margin-top: 5px;">पालो नं: ${record.paloNo}</div>
          </div>
        </div>
        <script>
          function startPrint() {
            console.log("Generating QR code...");
            QRCode.toCanvas(document.getElementById('qrcode'), \`${stickerData}\`, {
              width: 70,
              margin: 0
            }, function (error) {
              if (error) {
                console.error("QR Code Error:", error);
                return;
              }
              console.log("QR Code generated. Triggering print...");
              setTimeout(function() {
                window.print();
              }, 500);
            });
          }
          window.onload = startPrint;
        </script>
      </body>
      </html>
    `);
    doc.close();

    // Clean up iframe after a delay
    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 5000);
  };

  const handlePrintPrescription = (record: ServiceSeekerRecord) => {
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
      <html>
      <head>
        <title>Prescription</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: serif; font-size: 12pt; }
        </style>
      </head>
      <body>
        <div id="print-content"></div>
      </body>
      </html>
    `);
    doc.close();

    // Render PrescriptionPrint into the iframe
    const root = doc.getElementById('print-content');
    if (root) {
      import('react-dom/client').then(({ createRoot }) => {
        createRoot(root).render(<PrescriptionPrint record={record} generalSettings={generalSettings} />);
        
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      });
    }
  };

  const handleAddNew = () => {
    setIsEditing(null);
    const newUniqueId = `PID-${Date.now().toString().slice(-6)}`;
    
    // Calculate next registration number
    const currentYearRecords = records.filter(r => r.fiscalYear === currentFiscalYear);
    const maxRegNum = currentYearRecords.reduce((max, r) => {
      const num = parseInt(r.registrationNumber, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    const nextRegNum = (maxRegNum + 1).toString().padStart(4, '0');
    
    // Auto-populate today's date
    const today = new NepaliDate().format('YYYY-MM-DD');

    // Find "Mul darta" service fee
    const mulDartaService = serviceItems.find(s => 
      s.serviceName.toLowerCase().includes('mul darta') || 
      s.serviceName.toLowerCase().includes('मूल दर्ता')
    );
    const defaultFee = mulDartaService ? mulDartaService.rate : 0;

    setFormData({ 
      ...initialFormData, 
      uniquePatientId: newUniqueId,
      registrationNumber: nextRegNum,
      date: today,
      serviceFee: defaultFee
    });
    setShowForm(true);
  };

  const handleEdit = (record: ServiceSeekerRecord) => {
    setIsEditing(record.id);
    setFormData(record);
    
    // Determine age unit from age string or values
    if (record.age?.endsWith('D')) {
      setAgeUnit('Days');
    } else if (record.age?.endsWith('M') && !record.age?.includes('Y')) {
      setAgeUnit('Months');
    } else {
      setAgeUnit('Years');
    }
    
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setIsEditing(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-detect follow-up logic
    if (name === 'name' || name === 'phone') {
      const checkName = name === 'name' ? value : formData.name;
      const checkPhone = name === 'phone' ? value : formData.phone;
      
      if (checkName && checkName.length > 2) {
        const existingPatient = records.find(r => 
          r.fiscalYear === currentFiscalYear && 
          r.name.toLowerCase() === checkName.toLowerCase() &&
          (!checkPhone || r.phone === checkPhone)
        );
        
        if (existingPatient) {
          setFormData(prev => ({ 
            ...prev, 
            [name]: value,
            visitType: 'Follow-up',
            uniquePatientId: existingPatient.uniquePatientId,
            casteCode: existingPatient.casteCode || prev.casteCode,
            age: existingPatient.age || prev.age,
            ageYears: existingPatient.ageYears || prev.ageYears,
            ageMonths: existingPatient.ageMonths || prev.ageMonths,
            dobBs: existingPatient.dobBs || prev.dobBs,
            dobAd: existingPatient.dobAd || prev.dobAd,
            gender: existingPatient.gender || prev.gender,
            address: existingPatient.address || prev.address,
            phone: existingPatient.phone || prev.phone
          }));
          return;
        }
      }
    }

    const finalValue = (name === 'ageYears' || name === 'ageMonths' || name === 'ageDays' || name === 'serviceFee') ? parseFloat(value) || 0 : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleDateChange = (value: string) => {
    setFormData(prev => ({ ...prev, date: value }));
  };

  const handleDOBChange = (value: string) => {
    let dateAd = '';
    if (value) {
      try {
        const nd = new NepaliDate(value);
        const jsDate = nd.toJsDate();
        dateAd = jsDate.toISOString().split('T')[0];
        
        // Auto-calculate age
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - jsDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        const todayNd = new NepaliDate();
        let diffYears = todayNd.getYear() - nd.getYear();
        let diffMonths = todayNd.getMonth() - nd.getMonth();
        if (diffMonths < 0) {
          diffYears--;
          diffMonths += 12;
        }
        
        setFormData(prev => ({ 
          ...prev, 
          dobBs: value, 
          dobAd: dateAd,
          ageYears: diffYears >= 0 ? diffYears : 0,
          ageMonths: diffMonths >= 0 ? diffMonths : 0,
          ageDays: diffDays >= 0 ? diffDays : 0
        }));

        // Auto-set age unit based on calculated age
        if (diffDays < 60) {
          setAgeUnit('Days');
        } else if (diffYears < 5) {
          setAgeUnit('Months');
        } else {
          setAgeUnit('Years');
        }
      } catch (e) {
        setFormData(prev => ({ ...prev, dobBs: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, dobBs: value, dobAd: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (ageUnit === 'Days' && formData.ageDays > 59) {
      alert('उमेर ५९ दिन भन्दा बढी हुन सक्दैन।');
      return;
    }
    if (ageUnit === 'Months' && formData.ageMonths > 59) {
      alert('उमेर ५९ महिना भन्दा बढी हुन सक्दैन।');
      return;
    }

    let ageString = '';
    if (ageUnit === 'Days') {
      ageString = `${formData.ageDays}D`;
    } else if (ageUnit === 'Months') {
      ageString = `${formData.ageMonths}M`;
    } else {
      ageString = `${formData.ageYears}Y ${formData.ageMonths}M`;
    }

    // Calculate paloNo if it's a new record
    let finalPaloNo = formData.paloNo;
    if (!isEditing) {
      const today = new NepaliDate().format('YYYY-MM-DD');
      const sameDayServiceRecords = records.filter(r => r.date === today && r.serviceType === formData.serviceType);
      const maxPaloNo = sameDayServiceRecords.reduce((max, r) => {
        const num = parseInt(r.paloNo || '0', 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      finalPaloNo = (maxPaloNo + 1).toString();
    }

    const recordToSave: ServiceSeekerRecord = {
      ...formData,
      paloNo: finalPaloNo,
      age: ageString,
      id: isEditing || Date.now().toString(),
      fiscalYear: currentFiscalYear,
    };
    onSaveRecord(recordToSave);
    handleCloseForm();
  };

  const handleDelete = (id: string) => {
    const recordToDelete = records.find(r => r.id === id);
    if (!recordToDelete) return;

    // Check if the patient is registered or admitted in other services
    const isRegisteredInOtherServices = 
      opdRecords.some(r => r.uniquePatientId === recordToDelete.uniquePatientId) ||
      emergencyRecords.some(r => r.uniquePatientId === recordToDelete.uniquePatientId) ||
      cbimnciRecords.some(r => r.uniquePatientId === recordToDelete.uniquePatientId) ||
      ipdRecords.some(r => r.uniquePatientId === recordToDelete.uniquePatientId);

    if (isRegisteredInOtherServices) {
      alert('यो बिरामी अन्य सेवामा दर्ता वा भर्ना भइसकेको हुनाले हटाउन मिल्दैन।');
      return;
    }

    if (window.confirm('के तपाईं यो रेकर्ड हटाउन निश्चित हुनुहुन्छ?')) {
      onDeleteRecord(id);
    }
  };

  const filteredRecords = (records || []).filter(r => 
    r.fiscalYear === currentFiscalYear &&
    (r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     r.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
     (r.mulDartaNo && r.mulDartaNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
     r.phone.includes(searchQuery))
  ).sort((a, b) => parseInt(b.id) - parseInt(a.id));

  const canEditDelete = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <ClipboardList size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">मूल दर्ता सेवा</h2>
            <p className="text-sm text-slate-500">Main Registration Service</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="खोज्नुहोस्..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm w-full sm:w-64"
            />
          </div>
          <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 whitespace-nowrap">
            <Plus size={18} /> नयाँ दर्ता
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="p-4">दर्ता नं.</th>
                <th className="p-4">मूल दर्ता नं.</th>
                <th className="p-4">बिरामी ID</th>
                <th className="p-4">मिति</th>
                <th className="p-4">नाम</th>
                <th className="p-4">उमेर/लिङ्ग</th>
                <th className="p-4">जातिगत कोड</th>
                <th className="p-4">ठेगाना</th>
                <th className="p-4">फोन</th>
                <th className="p-4">सेवाको प्रकार</th>
                <th className="p-4">किसिम</th>
                <th className="p-4 text-right">शुल्क</th>
                <th className="p-4 text-right">कार्य</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map(record => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-primary-700">{record.registrationNumber}</td>
                  <td className="p-4 font-bold text-slate-700">{record.mulDartaNo || '-'}</td>
                  <td className="p-4 font-mono text-xs text-slate-500">{record.uniquePatientId}</td>
                  <td className="p-4">{record.date}</td>
                  <td className="p-4 font-medium">{record.name}</td>
                  <td className="p-4">{record.age} / {record.gender}</td>
                  <td className="p-4 text-center">{record.casteCode || '-'}</td>
                  <td className="p-4">{record.address}</td>
                  <td className="p-4 font-mono">{record.phone}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase">
                      {record.serviceType}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${record.visitType === 'New' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {record.visitType}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-slate-700">Rs. {record.serviceFee || 0}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(record)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors" title="सम्पादन गर्नुहोस्">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => setPrintRecord(record)} className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200" title="प्रिन्ट गर्नुहोस्">
                        <Printer size={18} />
                      </button>
                      {canEditDelete && (
                        <button onClick={() => handleDelete(record.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors" title="हटाउनुहोस्">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center p-12 text-slate-500 italic">कुनै रेकर्ड भेटिएन।</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-none sm:rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl h-full sm:h-auto max-h-screen flex flex-col relative animate-in zoom-in-95 slide-in-from-bottom-4">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 sm:rounded-t-2xl">
              <h3 className="text-2xl font-bold text-slate-800 font-nepali">
                {isEditing ? 'दर्ता विवरण सम्पादन गर्नुहोस्' : 'नयाँ सेवाग्राही दर्ता'}
              </h3>
              <button onClick={handleCloseForm} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input 
                  label="दर्ता नम्बर *" 
                  name="registrationNumber" 
                  value={formData.registrationNumber} 
                  onChange={handleChange} 
                  required 
                  readOnly
                  className="bg-slate-50 text-slate-500 cursor-not-allowed"
                />
                <Input 
                  label="मूल दर्ता नम्बर" 
                  name="mulDartaNo" 
                  value={formData.mulDartaNo || ''} 
                  onChange={handleChange} 
                  placeholder="Mul Darta No"
                />
                <Input 
                  label="बिरामी ID (Unique)" 
                  name="uniquePatientId" 
                  value={formData.uniquePatientId} 
                  onChange={handleChange} 
                  readOnly
                  className="bg-slate-50 text-slate-500 cursor-not-allowed"
                />
                <NepaliDatePicker 
                  label="जन्म मिति (Date of Birth)" 
                  value={formData.dobBs || ''} 
                  onChange={handleDOBChange} 
                />
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-600 mb-1 block">दर्ता मिति *</label>
                  <input 
                    type="text" 
                    value={formData.date} 
                    readOnly 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none bg-slate-50 text-slate-500 cursor-not-allowed text-sm"
                  />
                </div>
                <Input 
                  label="सेवाग्राहीको नाम *" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  required 
                />
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-600 mb-1 block">उमेरको एकाई (Age Unit) *</label>
                  <select 
                    value={ageUnit} 
                    onChange={(e) => setAgeUnit(e.target.value as any)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value="Days">दिन (Days)</option>
                    <option value="Months">महिना (Months)</option>
                    <option value="Years">वर्ष (Years)</option>
                  </select>
                </div>
                {ageUnit === 'Days' && (
                  <Input 
                    label="उमेर (दिन)" 
                    name="ageDays" 
                    type="number"
                    value={formData.ageDays} 
                    onChange={handleChange} 
                  />
                )}
                {ageUnit === 'Months' && (
                  <Input 
                    label="उमेर (महिना)" 
                    name="ageMonths" 
                    type="number"
                    value={formData.ageMonths} 
                    onChange={handleChange} 
                  />
                )}
                {ageUnit === 'Years' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input 
                      label="उमेर (वर्ष)" 
                      name="ageYears" 
                      type="number"
                      value={formData.ageYears} 
                      onChange={handleChange} 
                    />
                    <Input 
                      label="उमेर (महिना)" 
                      name="ageMonths" 
                      type="number"
                      value={formData.ageMonths} 
                      onChange={handleChange} 
                    />
                  </div>
                )}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-600 mb-1 block">जातिगत कोड (Caste Code)</label>
                  <select 
                    name="casteCode" 
                    value={formData.casteCode} 
                    onChange={handleChange} 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value="">छान्नुहोस्</option>
                    <option value="1">1 - दलित (Dalit)</option>
                    <option value="2">2 - जनजाति (Janajati)</option>
                    <option value="3">3 - मधेशी (Madhesi)</option>
                    <option value="4">4 - मुस्लिम (Muslim)</option>
                    <option value="5">5 - ब्राह्मण/क्षेत्री (Brahmin/Chhetri)</option>
                    <option value="6">6 - अन्य (Other)</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-600 mb-1 block">लिङ्ग *</label>
                  <select 
                    name="gender" 
                    value={formData.gender} 
                    onChange={handleChange} 
                    required 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value="Male">पुरुष (Male)</option>
                    <option value="Female">महिला (Female)</option>
                    <option value="Other">अन्य (Other)</option>
                  </select>
                </div>
                <Input 
                  label="ठेगाना *" 
                  name="address" 
                  value={formData.address} 
                  onChange={handleChange} 
                  required 
                />
                <Input 
                  label="फोन नम्बर" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                />
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-600 mb-1 block">बिरामीको किसिम (Visit Type) *</label>
                  <select 
                    name="visitType" 
                    value={formData.visitType} 
                    onChange={handleChange} 
                    required 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value="New">नयाँ (New)</option>
                    <option value="Follow-up">पुनः (Follow-up)</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-600 mb-1 block">सेवाको प्रकार *</label>
                  <select 
                    name="serviceType" 
                    value={formData.serviceType} 
                    onChange={handleChange} 
                    required 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value="OPD">OPD</option>
                    <option value="CBIMNCI">CBIMNCI</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Vaccination">Vaccination (खोप)</option>
                    <option value="Safe Motherhood">Safe Motherhood (सुरक्षित मातृत्व)</option>
                    <option value="TB">क्षयरोग सेवा (TB)</option>
                    <option value="Leprosy">कुष्ठरोग सेवा (Leprosy)</option>
                    <option value="Lab">Lab (प्रयोगशाला)</option>
                    <option value="Other">Other (अन्य)</option>
                  </select>
                </div>
                <Input 
                  label="सेवा शुल्क (Service Fee) *" 
                  name="serviceFee" 
                  type="number"
                  value={formData.serviceFee} 
                  onChange={handleChange} 
                  required
                />
                <div className="md:col-span-3">
                  <Input 
                    label="कैफियत" 
                    name="remarks" 
                    value={formData.remarks} 
                    onChange={handleChange} 
                  />
                </div>
                
                <div className="md:col-span-3 flex justify-end gap-4 pt-6 border-t border-slate-200 sticky bottom-0 bg-white pb-2">
                  <button type="button" onClick={handleCloseForm} className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">रद्द</button>
                  <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium shadow-sm hover:bg-primary-700 transition-colors">सुरक्षित गर्नुहोस्</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {printRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h2 className="text-lg font-bold mb-4">प्रिन्ट विकल्प</h2>
            <div className="flex gap-4">
              <button 
                onClick={() => { handlePrintSticker(printRecord); setPrintRecord(null); }}
                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
              >
                स्टिकर प्रिन्ट
              </button>
              <button 
                onClick={() => { handlePrintPrescription(printRecord); setPrintRecord(null); }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                प्रिस्क्रिप्शन प्रिन्ट
              </button>
              <button 
                onClick={() => setPrintRecord(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                रद्द गर्नुहोस्
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
