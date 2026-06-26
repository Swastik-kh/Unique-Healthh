import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, X, Pencil, Trash2, Search, Printer, Loader2, QrCode, UserCircle } from 'lucide-react';
import { ServiceSeekerRecord, User, OrganizationSettings, ServiceItem, OPDRecord, EmergencyRecord, CBIMNCIRecord, IPDRecord } from '../types/coreTypes';
import { Input } from './Input';
import { NepaliDatePicker } from './NepaliDatePicker';
import { PatientSticker } from './PatientSticker';
import { QRScanner } from './QRScanner';
import { PrescriptionPrint } from './PrescriptionPrint';
import axios from 'axios';

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
  paymentMode: 'Cash',
  insuranceNo: '',
  claimId: '',
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
  const [isSearchingHIB, setIsSearchingHIB] = useState(false);
  const [isScanningQR, setIsScanningQR] = useState(false);
  const [hibPatientPhoto, setHibPatientPhoto] = useState<string | null>(null);
  const [hibPatientBalance, setHibPatientBalance] = useState<number | null>(null);
  const [ageUnit, setAgeUnit] = useState<'Days' | 'Months' | 'Years'>('Years');
  const [stickerPatient, setStickerPatient] = useState<ServiceSeekerRecord | null>(null);
  
  const isUnder5 = (ageUnit === 'Years' && formData.ageYears < 5 && (formData.ageYears > 0 || formData.ageMonths > 0)) || 
                   (ageUnit === 'Months' && formData.ageMonths > 0) || 
                   (ageUnit === 'Days' && formData.ageDays > 0);

  useEffect(() => {
    if (isUnder5 && formData.serviceType !== 'CBIMNCI') {
      setFormData(prev => ({ ...prev, serviceType: 'CBIMNCI' }));
    }
  }, [isUnder5, formData.serviceType]);

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
    setHibPatientPhoto(null);
    setHibPatientBalance(null);
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
    setHibPatientPhoto(null);
    setHibPatientBalance(null);
    
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
    setHibPatientPhoto(null);
    setHibPatientBalance(null);
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
    setFormData(prev => {
      const newData = { ...prev, [name]: finalValue };

      // Auto-set serviceFee to 0 if paymentMode is Free
      if (name === 'paymentMode' && finalValue === 'Free') {
        newData.serviceFee = 0;
      }
      
      // Reset serviceFee to default if switching from Free to Cash/HIB
      if (name === 'paymentMode' && prev.paymentMode === 'Free' && finalValue !== 'Free') {
        const mulDartaService = serviceItems.find(s => 
          s.serviceName.toLowerCase().includes('mul darta') || 
          s.serviceName.toLowerCase().includes('मूल दर्ता')
        );
        newData.serviceFee = mulDartaService ? mulDartaService.rate : 0;
      }

      // Update display age string
      if (name === 'ageYears' || name === 'ageMonths' || name === 'ageDays') {
        const y = name === 'ageYears' ? finalValue : prev.ageYears || 0;
        const m = name === 'ageMonths' ? finalValue : prev.ageMonths || 0;
        const d = name === 'ageDays' ? finalValue : prev.ageDays || 0;
        newData.age = `${y}Y ${m}M ${d}D`;
      }
      return newData;
    });
  };

  const handleDateChange = (value: string) => {
    setFormData(prev => ({ ...prev, date: value }));
  };

  const handleSearchHIBPatient = async (insuranceValue?: string) => {
    const insuranceNo = insuranceValue || formData.insuranceNo;
    if (!insuranceNo?.trim()) {
      alert("कृपया पहिले बीमा नम्बर (Insurance No) भर्नुहोस्।");
      return;
    }
    setIsSearchingHIB(true);
    try {
      const headers = {
        'x-hib-base-url': generalSettings?.hibBaseUrl,
        'x-hib-username': generalSettings?.hibUsername,
        'x-hib-password': generalSettings?.hibPassword,
        'x-hib-remote-user': generalSettings?.hibRemoteUser,
        'x-hib-partner-id': generalSettings?.hibPartnerId,
        'x-hib-location-id': generalSettings?.hibLocationId
      };
      const res = await axios.get(`/api/hib/patient/${insuranceNo.trim()}`, { headers });
      const bundle = res.data;
      if (bundle.entry && bundle.entry.length > 0) {
        const patient = bundle.entry[0].resource;
        
        // Auto-fill form
        const nameObj = patient.name?.[0];
        const fullName = `${nameObj?.given?.join(' ') || ''} ${nameObj?.family || ''}`.trim();
        
        // Gender normalization
        let gender: 'Male' | 'Female' | 'Other' = 'Other';
        const rawGender = patient.gender?.toString().toLowerCase().trim();
        if (rawGender === 'male' || rawGender === 'm' || rawGender === '1') gender = 'Male';
        else if (rawGender === 'female' || rawGender === 'f' || rawGender === '2') gender = 'Female';
        
        const birthDate = patient.birthDate; // YYYY-MM-DD (AD)
        
        let dobBs = '';
        let calculatedYears = 0;
        let calculatedMonths = 0;
        let calculatedDays = 0;

        if (birthDate) {
          try {
            const adParts = birthDate.split('-');
            const jsDate = new Date(parseInt(adParts[0]), parseInt(adParts[1]) - 1, parseInt(adParts[2]));
            dobBs = new NepaliDate(jsDate).format('YYYY-MM-DD');

            // Calculate age immediately
            const today = new Date();
            let years = today.getFullYear() - jsDate.getFullYear();
            let months = today.getMonth() - jsDate.getMonth();
            let days = today.getDate() - jsDate.getDate();

            if (days < 0) {
              months--;
              const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
              days += lastMonth.getDate();
            }
            if (months < 0) {
              years--;
              months += 12;
            }
            calculatedYears = years >= 0 ? years : 0;
            calculatedMonths = months >= 0 ? months : 0;
            calculatedDays = days >= 0 ? days : 0;
          } catch (e) {
            console.error("DOB conversion error", e);
          }
        }

        // Robust address concatenation
        let fullAddress = '';
        if (patient.address && patient.address.length > 0) {
          const addr = patient.address[0];
          if (addr.text) {
            fullAddress = addr.text;
          } else {
            const parts = [];
            if (addr.line) parts.push(...addr.line);
            if (addr.city) parts.push(addr.city);
            if (addr.district) parts.push(addr.district);
            if (addr.state) parts.push(addr.state);
            fullAddress = parts.join(', ');
          }
        }

        // Auto-set age unit based on calculated age
        let autoAgeUnit: 'Days' | 'Months' | 'Years' = 'Years';
        if (calculatedYears === 0 && calculatedMonths === 0 && calculatedDays < 60) {
          autoAgeUnit = 'Days';
        } else if (calculatedYears < 5) {
          autoAgeUnit = 'Months';
        }
        setAgeUnit(autoAgeUnit);

        setFormData(prev => ({
          ...prev,
          name: fullName,
          gender: gender,
          dobBs: dobBs,
          dobAd: birthDate,
          address: fullAddress,
          insuranceNo: insuranceNo,
          ageYears: calculatedYears,
          ageMonths: calculatedMonths,
          ageDays: calculatedDays,
          age: `${calculatedYears}Y ${calculatedMonths}M ${calculatedDays}D`
        }));

        // Extract photo
        let photo = null;
        if (patient.photo && patient.photo.length > 0) {
          const photoObj = patient.photo[0];
          if (photoObj.data) {
            photo = `data:${photoObj.contentType || 'image/png'};base64,${photoObj.data}`;
          } else if (photoObj.url) {
            photo = photoObj.url;
          }
        }
        setHibPatientPhoto(photo);
        
        // Fetch Balance/Coverage
        try {
          const covRes = await axios.get(`/api/hib/coverage/${insuranceNo.trim()}`, { headers });
          const covBundle = covRes.data;
          if (covBundle.resourceType === 'Bundle' && covBundle.entry && covBundle.entry.length > 0) {
            const coverage = covBundle.entry[0].resource;
            let balance = null;
            if (coverage.extension) {
              const balExt = coverage.extension.find((e: any) => e.url?.toLowerCase().includes('balance') || e.url?.toLowerCase().includes('remaining'));
              if (balExt) balance = balExt.valueMoney?.value || balExt.valueDecimal || balExt.valueInteger;
            }
            if (balance === null && coverage.class) {
               const balClass = coverage.class.find((c: any) => c.type?.coding?.[0]?.code === 'balance');
               if (balClass) balance = parseFloat(balClass.name);
            }
            setHibPatientBalance(balance);
          } else {
            setHibPatientBalance(null);
          }
        } catch (e) {
          console.error("Balance fetch error", e);
          setHibPatientBalance(null);
        }

        alert(`बिरामी फेला पर्यो: ${fullName}`);
      } else {
        alert("बीमा प्रणालीमा यो नम्बरको बिरामी फेला परेन।");
      }
    } catch (error: any) {
      console.error(error);
      let errorMsg = error.message;
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMsg = error.response.data;
        } else if (error.response.data.error) {
          errorMsg = typeof error.response.data.error === 'object' 
            ? JSON.stringify(error.response.data.error) 
            : error.response.data.error;
          if (error.response.data.details) {
            errorMsg += ` (${error.response.data.details})`;
          }
        } else if (error.response.data.issue) {
          // Handle FHIR OperationOutcome issues
          errorMsg = error.response.data.issue.map((i: any) => i.diagnostics || i.details?.text).join(', ');
        } else {
          errorMsg = JSON.stringify(error.response.data);
        }
      }
      let alertMsg = "बीमा बिरामी खोज्दा त्रुटि भयो: " + errorMsg;
      if (error.response?.status === 404) {
        alertMsg += "\n(API URL मिलेन वा बिरामी फेला परेन)";
      }
      if (error.response?.data?.url) {
        alertMsg += "\nURL: " + error.response.data.url;
      }
      alert(alertMsg);
    } finally {
      setIsSearchingHIB(false);
    }
  };

  const handleDOBChange = (value: string) => {
    let dateAd = '';
    if (value) {
      try {
        const nd = new NepaliDate(value);
        const jsDate = nd.toJsDate();
        const year = jsDate.getFullYear();
        const month = String(jsDate.getMonth() + 1).padStart(2, '0');
        const day = String(jsDate.getDate()).padStart(2, '0');
        dateAd = `${year}-${month}-${day}`;
        
        // Auto-calculate age
        const today = new Date();
        const birthDate = jsDate;
        
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        let days = today.getDate() - birthDate.getDate();

        if (days < 0) {
          months--;
          const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
          days += lastMonth.getDate();
        }

        if (months < 0) {
          years--;
          months += 12;
        }

        const calculatedYears = years >= 0 ? years : 0;
        const calculatedMonths = months >= 0 ? months : 0;
        const calculatedDays = days >= 0 ? days : 0;

        setFormData(prev => ({ 
          ...prev, 
          dobBs: value, 
          dobAd: dateAd,
          ageYears: calculatedYears,
          ageMonths: calculatedMonths,
          ageDays: calculatedDays,
          age: `${calculatedYears}Y ${calculatedMonths}M ${calculatedDays}D`
        }));

        // Auto-set age unit based on calculated age
        if (calculatedYears === 0 && calculatedMonths === 0 && calculatedDays < 60) {
          setAgeUnit('Days');
        } else if (calculatedYears < 5) {
          setAgeUnit('Months');
        } else {
          setAgeUnit('Years');
        }
      } catch (error) {
        console.error("Invalid date for age calculation", error);
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

    // Check where the patient is registered or admitted
    const registeredServices: string[] = [];

    if (opdRecords.some(r => r.uniquePatientId === recordToDelete.uniquePatientId)) {
      registeredServices.push('ओपिडी सेवा (OPD Service)');
    }
    if (emergencyRecords.some(r => r.uniquePatientId === recordToDelete.uniquePatientId)) {
      registeredServices.push('आकस्मिक सेवा (Emergency Service)');
    }
    if (cbimnciRecords.some(r => r.uniquePatientId === recordToDelete.uniquePatientId)) {
      registeredServices.push('सिबिआईएमएनसिआई सेवा (CB-IMNCI Service)');
    }
    if (ipdRecords.some(r => r.uniquePatientId === recordToDelete.uniquePatientId)) {
      registeredServices.push('आइपिडी / भर्ना सेवा (IPD/Admission Service)');
    }

    if (registeredServices.length > 0) {
      alert(`यो बिरामी निम्न सेवा(हरू) मा दर्ता वा भर्ना भइसकेको हुनाले हटाउन मिल्दैन:\n- ${registeredServices.join('\n- ')}\n\n(This patient is already registered/admitted in the above service(s) and cannot be deleted.)`);
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
                <th className="p-4">भुक्तानी</th>
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
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      record.paymentMode === 'HIB' ? 'bg-indigo-50 text-indigo-700' : 
                      record.paymentMode === 'Free' ? 'bg-emerald-50 text-emerald-700' : 
                      'bg-slate-50 text-slate-700'
                    }`}>
                      {record.paymentMode === 'HIB' ? 'बीमा (HIB)' : 
                       record.paymentMode === 'Free' ? 'नि:शुल्क' : 'नगद (Cash)'}
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
        <div className="fixed inset-0 bg-white z-[60] flex flex-col animate-in slide-in-from-bottom-4">
          <div className="flex-none p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="text-2xl font-bold text-slate-800 font-nepali">
              {isEditing ? 'दर्ता विवरण सम्पादन गर्नुहोस्' : 'नयाँ सेवाग्राही दर्ता'}
            </h3>
            <button onClick={handleCloseForm} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="flex flex-col lg:flex-row gap-8">
              <form onSubmit={handleSubmit} className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-600 mb-1 block">दर्ताको किसिम (Payment Type) *</label>
                  <select 
                    name="paymentMode" 
                    value={formData.paymentMode} 
                    onChange={handleChange} 
                    required 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-bold text-indigo-700"
                  >
                    <option value="Cash">नगद (Cash)</option>
                    <option value="HIB">बीमा (HIB - Insurance)</option>
                    <option value="Free">नि:शुल्क (Free)</option>
                  </select>
                </div>

                {formData.paymentMode === 'HIB' && (
                  <>
                    <Input 
                      label="बीमा नम्बर (Insurance No) *" 
                      name="insuranceNo" 
                      value={formData.insuranceNo || ''} 
                      onChange={handleChange} 
                      required 
                      placeholder="उदा: 740500036"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchHIBPatient();
                        }
                      }}
                      suffix={
                        <div className="flex items-center gap-1">
                          <button 
                            type="button"
                            onClick={() => handleSearchHIBPatient()}
                            disabled={isSearchingHIB}
                            className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors disabled:opacity-50"
                            title="Search IMIS"
                          >
                            {isSearchingHIB ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                          </button>
                          <button 
                            type="button"
                            onClick={() => setIsScanningQR(true)}
                            className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors"
                            title="Scan QR Code"
                          >
                            <QrCode size={16} />
                          </button>
                        </div>
                      }
                    />
                    <Input 
                      label="क्लेम आइडी (Claim ID)" 
                      name="claimId" 
                      value={formData.claimId || ''} 
                      onChange={handleChange} 
                      placeholder="Claim ID प्रविष्ट गर्नुहोस्"
                    />
                  </>
                )}

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
                  <label className="text-sm font-medium text-slate-600 mb-1 block">
                    सेवाको प्रकार * {isUnder5 && <span className="text-[10px] text-primary-600 font-bold bg-primary-50 px-1.5 py-0.5 rounded ml-1">AGE LOCKED</span>}
                  </label>
                  <select 
                    name="serviceType" 
                    value={formData.serviceType} 
                    onChange={handleChange} 
                    required 
                    disabled={isUnder5}
                    className={`w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm ${isUnder5 ? 'bg-slate-50 cursor-not-allowed border-primary-200' : ''}`}
                  >
                    <option value="OPD">OPD</option>
                    <option value="CBIMNCI">CBIMNCI</option>
                    <option value="Emergency">Emergency</option>
                    <option value="IPD">IPD (भर्ना)</option>
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

              {formData.paymentMode === 'HIB' && (
                <div className="w-full lg:w-96 shrink-0 space-y-4 animate-in fade-in slide-in-from-right-8 duration-500">
                  <div className="bg-emerald-600 rounded-3xl p-1.5 shadow-2xl overflow-hidden ring-4 ring-emerald-600/20">
                    <div className="bg-white rounded-[20px] overflow-hidden flex flex-col h-full border border-emerald-500/30">
                      {/* Card Header - Official Style */}
                      <div className="bg-emerald-50/50 px-5 py-3 border-b border-emerald-100 flex items-center justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/5 rounded-full -mr-10 -mt-10"></div>
                        <div className="flex items-center gap-3 relative z-10">
                          <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" 
                            alt="Nepal Gov" 
                            className="w-10 h-10 object-contain drop-shadow-sm"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-red-600 leading-tight uppercase tracking-tight">स्वास्थ्य बीमा बोर्ड</span>
                            <span className="text-[9px] font-bold text-blue-800 leading-tight">Health Insurance Board</span>
                            <span className="text-[7px] font-medium text-slate-500 leading-tight italic">Government of Nepal</span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="text-[8px] font-bold text-slate-400">Card Status</span>
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500 text-white rounded-full">
                            <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                            <span className="text-[8px] font-bold">ACTIVE</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5 flex flex-col gap-4 relative">
                        {/* Watermark Logo */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                          <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" 
                            alt="Watermark" 
                            className="w-48 h-48 grayscale"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="flex gap-5 relative z-10">
                          <div className="w-24 h-30 shrink-0 bg-slate-50 rounded-lg overflow-hidden border border-slate-200 shadow-sm relative group">
                            {hibPatientPhoto ? (
                              <img 
                                src={hibPatientPhoto} 
                                alt="Patient" 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-200">
                                <UserCircle size={48} />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col justify-center gap-3.5 flex-1">
                            <div className="space-y-0.5">
                              <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">नाम (Full Name)</label>
                              <p className="text-[13px] font-black text-slate-900 leading-tight">{formData.name || 'N/A'}</p>
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">बीमा नम्बर (Policy No)</label>
                              <p className="text-sm font-black text-emerald-700 font-mono tracking-widest bg-emerald-50 px-2 py-0.5 rounded inline-block">{formData.insuranceNo || 'N/A'}</p>
                            </div>
                            {formData.claimId && (
                              <div className="space-y-0.5 mt-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">क्लेम आइडी (Claim ID)</label>
                                <p className="text-sm font-black text-indigo-600 font-mono">{formData.claimId}</p>
                              </div>
                            )}
                            {hibPatientBalance !== null && (
                              <div className="space-y-0.5 mt-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">बाँकी रकम (Remaining Balance)</label>
                                <p className="text-sm font-black text-orange-600 font-mono">Rs. {hibPatientBalance.toLocaleString()}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-emerald-50 relative z-10">
                          <div className="space-y-0.5">
                            <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">लिंग (Gender)</label>
                            <p className="text-[11px] font-bold text-slate-700">{formData.gender === 'Male' ? 'पुरुष (Male)' : (formData.gender === 'Female' ? 'महिला (Female)' : 'अन्य (Other)')}</p>
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">जन्म मिति (DOB BS)</label>
                            <p className="text-[11px] font-bold text-slate-700">{formData.dobBs || 'N/A'}</p>
                          </div>
                          <div className="space-y-0.5 col-span-2">
                            <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">ठेगाना (Full Address)</label>
                            <p className="text-[11px] font-bold text-slate-700 leading-snug">{formData.address || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="mt-auto bg-emerald-600 px-5 py-2.5 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[7px] font-bold text-emerald-200 uppercase tracking-widest">Digital Health ID</span>
                          <span className="text-[9px] font-black text-white tracking-[0.3em]">NEPAL GOVERNMENT</span>
                        </div>
                        <div className="bg-white/20 p-1 rounded backdrop-blur-sm">
                          <QrCode size={20} className="text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/50 backdrop-blur-sm p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Search size={14} />
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-tight">
                      HIB IMIS प्रणालीबाट प्रमाणित विवरण। <br/>
                      <span className="text-emerald-600 font-bold">Data Synchronization: Real-time</span>
                    </p>
                  </div>
                </div>
              )}
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

      {isScanningQR && (
        <QRScanner 
          onScanSuccess={(decodedText) => {
            setFormData(prev => ({ ...prev, insuranceNo: decodedText }));
            handleSearchHIBPatient(decodedText);
          }}
          onClose={() => setIsScanningQR(false)}
          title="बीमा कार्ड स्क्यान गर्नुहोस्"
        />
      )}
    </div>
  );
};
