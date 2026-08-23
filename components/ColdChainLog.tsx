import React, { useState, useMemo, useEffect } from 'react';
import { ColdChainEquipment, ColdChainLogEntry } from '../types/healthTypes';
import { User, OrganizationSettings } from '../types/coreTypes';
import { 
  Thermometer, Plus, Edit2, Trash2, Printer, Download, Search, 
  Calendar, AlertTriangle, CheckCircle2, XCircle, ChevronLeft, 
  ChevronRight, ShieldAlert, Smartphone, Loader2, Send, Clock, 
  Settings, RefreshCw, AlertCircle, Info, Sparkles, Filter, History
} from 'lucide-react';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { NepaliDatePicker } from './NepaliDatePicker';
import { Input } from './Input';
import { Select } from './Select';
import { ColdChainEquipmentManager } from './ColdChainEquipment';
import axios from 'axios';

export const normalizeBsDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  let engStr = String(dateStr).trim();
  for (let i = 0; i < 10; i++) {
    engStr = engStr.split(nepaliDigits[i]).join(String(i));
  }
  engStr = engStr.replace(/\//g, '-');
  const parts = engStr.split('-');
  if (parts.length === 3) {
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return engStr;
};

interface ColdChainLogProps {
  coldChainLogs: ColdChainLogEntry[];
  coldChainEquipment: ColdChainEquipment[];
  onSaveLog: (log: ColdChainLogEntry) => void;
  onDeleteLog: (logId: string) => void;
  onSaveEquipment: (equipment: ColdChainEquipment) => void;
  onDeleteEquipment: (equipmentId: string) => void;
  currentUser: User | null;
  generalSettings: OrganizationSettings;
  activeOrgName?: string;
  onUpdateGeneralSettings?: (settings: Partial<OrganizationSettings>) => void;
}

const NEPALI_MONTHS = [
  { value: '01', label: 'बैशाख (Baisakh)', days: 31 },
  { value: '02', label: 'जेठ (Jestha)', days: 31 },
  { value: '03', label: 'असार (Ashad)', days: 32 },
  { value: '04', label: 'साउन (Shrawan)', days: 32 },
  { value: '05', label: 'भदौ (Bhadra)', days: 31 },
  { value: '06', label: 'असोज (Ashwin)', days: 30 },
  { value: '07', label: 'कार्तिक (Kartik)', days: 30 },
  { value: '08', label: 'मंसिर (Mangsir)', days: 30 },
  { value: '09', label: 'पुष (Poush)', days: 29 },
  { value: '10', label: 'माघ (Magh)', days: 30 },
  { value: '11', label: 'फागुन (Falgun)', days: 30 },
  { value: '12', label: 'चैत्र (Chaitra)', days: 30 }
];

export const ColdChainLog: React.FC<ColdChainLogProps> = ({
  coldChainLogs = [],
  coldChainEquipment = [],
  onSaveLog,
  onDeleteLog,
  onSaveEquipment,
  onDeleteEquipment,
  currentUser,
  generalSettings,
  activeOrgName
}) => {
  // Navigation / View Modes
  const [viewMode, setViewMode] = useState<'LOGS' | 'EQUIPMENT'>('LOGS');

  // Date selections
  const todayNd = useMemo(() => {
    try {
      return new NepaliDate();
    } catch {
      return new NepaliDate(2081, 0, 1);
    }
  }, []);

  const todayBs = useMemo(() => {
    try {
      return normalizeBsDate(todayNd.format('YYYY-MM-DD'));
    } catch {
      return '2081-01-01';
    }
  }, [todayNd]);

  const currentYearBs = useMemo(() => {
    const parts = todayBs.split('-');
    return parts[0] || '2081';
  }, [todayBs]);

  const currentMonthBs = useMemo(() => {
    const parts = todayBs.split('-');
    return parts[1] || '01';
  }, [todayBs]);

  const [selectedYear, setSelectedYear] = useState<string>(currentYearBs);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthBs);

  // Active Equipment selection
  const activeEquipments = useMemo(() => {
    return coldChainEquipment.filter(e => e.isActive !== false);
  }, [coldChainEquipment]);

  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');

  useEffect(() => {
    if (!selectedEquipmentId && activeEquipments.length > 0) {
      setSelectedEquipmentId(activeEquipments[0].id);
    }
  }, [activeEquipments, selectedEquipmentId]);

  const currentEquipment = useMemo(() => {
    return coldChainEquipment.find(e => e.id === selectedEquipmentId) || activeEquipments[0] || null;
  }, [coldChainEquipment, activeEquipments, selectedEquipmentId]);

  // Thresholds
  const minTemp = generalSettings.coldChainMinTempC !== undefined ? generalSettings.coldChainMinTempC : 2;
  const maxTemp = generalSettings.coldChainMaxTempC !== undefined ? generalSettings.coldChainMaxTempC : 8;

  // Temperature Entry Modal State
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  // Form State
  const [formDateBs, setFormDateBs] = useState<string>(todayBs);
  const [formEquipmentId, setFormEquipmentId] = useState<string>('');
  const [formSession, setFormSession] = useState<'Morning' | 'Evening'>('Morning');
  const [formTemp, setFormTemp] = useState<string>('4.0');
  const [formRemarks, setFormRemarks] = useState<string>('');
  const [formCorrectiveAction, setFormCorrectiveAction] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // SMS Alert State
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsStatus, setSmsStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [customPhone, setCustomPhone] = useState<string>('');

  // Live Out of Range check
  const numTemp = parseFloat(formTemp);
  const isFormTempOutOfRange = !isNaN(numTemp) && (numTemp < minTemp || numTemp > maxTemp);

  // Open entry modal with presets
  const handleOpenEntryModal = (dateStr?: string, session?: 'Morning' | 'Evening', eqId?: string) => {
    const targetEqId = eqId || selectedEquipmentId || (activeEquipments[0]?.id ?? '');
    const targetDate = normalizeBsDate(dateStr || todayBs);
    
    // Determine default session: if passed, use it; otherwise, if morning before 12 PM, else evening
    let targetSession: 'Morning' | 'Evening' = session || 'Morning';
    if (!session) {
      const currentHour = new Date().getHours();
      targetSession = currentHour < 12 ? 'Morning' : 'Evening';
    }

    setFormEquipmentId(targetEqId);
    setFormDateBs(targetDate);
    setFormSession(targetSession);
    setSmsStatus(null);
    setFormError('');
    setCustomPhone(generalSettings.coldChainAlertPhone || '');

    // Check if an existing log exists for (targetEqId, targetDate, targetSession)
    const existing = coldChainLogs.find(l => {
      const matchesEq = l.equipmentId === targetEqId || (l.equipmentName && targetEqId && l.equipmentName.trim().toLowerCase() === targetEqId.trim().toLowerCase());
      return matchesEq && normalizeBsDate(l.dateBs) === targetDate && l.session === targetSession;
    });

    if (existing) {
      setEditingLogId(existing.id);
      setFormTemp(String(existing.tempCelsius));
      setFormRemarks(existing.remarks || '');
      setFormCorrectiveAction(existing.correctiveAction || '');
    } else {
      setEditingLogId(null);
      setFormTemp('4.0');
      setFormRemarks('');
      setFormCorrectiveAction('');
    }

    setIsEntryModalOpen(true);
  };

  // Sync existing log when user changes date or session in modal
  useEffect(() => {
    if (isEntryModalOpen && formEquipmentId && formDateBs && formSession) {
      const normDate = normalizeBsDate(formDateBs);
      const existing = coldChainLogs.find(l => {
        const matchesEq = l.equipmentId === formEquipmentId || (l.equipmentName && formEquipmentId && l.equipmentName.trim().toLowerCase() === formEquipmentId.trim().toLowerCase());
        return matchesEq && normalizeBsDate(l.dateBs) === normDate && l.session === formSession;
      });
      if (existing && existing.id !== editingLogId) {
        setEditingLogId(existing.id);
        setFormTemp(String(existing.tempCelsius));
        setFormRemarks(existing.remarks || '');
        setFormCorrectiveAction(existing.correctiveAction || '');
      }
    }
  }, [formEquipmentId, formDateBs, formSession, isEntryModalOpen, coldChainLogs, editingLogId]);

  // Convert Nepali date to AD
  const calculateDateAd = (bsDate: string): string => {
    try {
      const normDate = normalizeBsDate(bsDate);
      const parts = normDate.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0]);
        const m = parseInt(parts[1]) - 1;
        const d = parseInt(parts[2]);
        const nd = new NepaliDate(y, m, d);
        return nd.toJsDate().toISOString().split('T')[0];
      }
    } catch {
      // fallback
    }
    return new Date().toISOString().split('T')[0];
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEquipmentId) {
      setFormError('कृपया उपकरण छनोट गर्नुहोस्।');
      return;
    }
    if (!formDateBs) {
      setFormError('कृपया मिति छनोट गर्नुहोस्।');
      return;
    }
    const tempVal = parseFloat(formTemp);
    if (isNaN(tempVal)) {
      setFormError('कृपया मान्य तापक्रम (°C) प्रविष्ट गर्नुहोस्।');
      return;
    }

    const normDate = normalizeBsDate(formDateBs);
    const eq = coldChainEquipment.find(e => e.id === formEquipmentId);
    const eqName = eq ? eq.name : 'खोप फ्रिज';
    const isOutOfRange = tempVal < minTemp || tempVal > maxTemp;
    const dateAd = calculateDateAd(normDate);

    const logEntry: ColdChainLogEntry = {
      id: editingLogId || `ccl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      equipmentId: formEquipmentId,
      equipmentName: eqName || 'खोप फ्रिज',
      dateBs: normDate,
      dateAd: dateAd || '',
      session: formSession,
      tempCelsius: tempVal,
      recordedBy: currentUser?.fullName || currentUser?.username || 'Staff',
      recordedByUid: currentUser?.id || '',
      isOutOfRange: isOutOfRange,
      remarks: formRemarks.trim() || '',
      correctiveAction: formCorrectiveAction.trim() || '',
      _orgName: currentUser?.organizationName || generalSettings.orgNameNepali || ''
    };

    onSaveLog(logEntry);

    // Synchronize current view so user immediately sees their record in the register table
    setSelectedEquipmentId(formEquipmentId);
    const dateParts = normDate.split('-');
    if (dateParts.length >= 2) {
      setSelectedYear(dateParts[0]);
      setSelectedMonth(dateParts[1].padStart(2, '0'));
    }

    setIsEntryModalOpen(false);
  };

  // Send Alert SMS via /api/sms/send
  const handleSendAlertSms = async () => {
    const targetPhone = customPhone.trim() || generalSettings.coldChainAlertPhone?.trim();
    if (!targetPhone) {
      setSmsStatus({
        type: 'error',
        message: 'कृपया SMS पठाउन मान्य मोबाइल नम्बर प्रविष्ट गर्नुहोस्।'
      });
      return;
    }

    const tempVal = parseFloat(formTemp);
    const eq = coldChainEquipment.find(e => e.id === formEquipmentId);
    const eqName = eq ? eq.name : 'खोप फ्रिज';
    const orgName = generalSettings.orgNameNepali || 'स्वास्थ्य संस्था';

    const message = `⚠️ कोल्ड चेन अलर्ट: ${orgName} मा ${eqName} को तापक्रम ${tempVal}°C रेकर्ड भयो, जुन सुरक्षित दायरा (${minTemp}°C देखि ${maxTemp}°C) भन्दा बाहिर छ। कृपया तुरुन्त निरिक्षण गर्नुहोस्।`;

    setIsSendingSms(true);
    setSmsStatus(null);

    try {
      const response = await axios.post('/api/sms/send', {
        provider: generalSettings.smsApiProvider || 'SMS Pasal',
        apiKey: generalSettings.smsApiKey || '56A71A88EC9CA9',
        senderId: generalSettings.smsSenderId || 'SMSBit',
        apiUrl: generalSettings.smsApiUrl || 'https://sms.smspasal.com/smsapi/index.php',
        campaign: generalSettings.smsCampaignId || '9674',
        routeid: generalSettings.smsRouteId || '10259',
        recipients: [targetPhone],
        message: message
      });

      if (response.data?.success) {
        setSmsStatus({
          type: 'success',
          message: `सफलतापूर्वक SMS अलर्ट ${targetPhone} मा पठाइयो!`
        });
      } else {
        setSmsStatus({
          type: 'error',
          message: `SMS पठाउन असफल: ${response.data?.error || 'प्रणाली त्रुटि'}`
        });
      }
    } catch (err: any) {
      setSmsStatus({
        type: 'error',
        message: `SMS पठाउँदा त्रुटि आयो: ${err.response?.data?.error || err.message}`
      });
    } finally {
      setIsSendingSms(false);
    }
  };

  // Month Navigation
  const handlePrevMonth = () => {
    const mNum = parseInt(selectedMonth);
    if (mNum === 1) {
      setSelectedMonth('12');
      setSelectedYear(String(parseInt(selectedYear) - 1));
    } else {
      setSelectedMonth(String(mNum - 1).padStart(2, '0'));
    }
  };

  const handleNextMonth = () => {
    const mNum = parseInt(selectedMonth);
    if (mNum === 12) {
      setSelectedMonth('01');
      setSelectedYear(String(parseInt(selectedYear) + 1));
    } else {
      setSelectedMonth(String(mNum + 1).padStart(2, '0'));
    }
  };

  const handleCurrentMonth = () => {
    setSelectedYear(currentYearBs);
    setSelectedMonth(currentMonthBs);
  };

  // Compute Daily Rows for Selected Month and Equipment
  const monthMeta = useMemo(() => {
    return NEPALI_MONTHS.find(m => m.value === selectedMonth) || NEPALI_MONTHS[0];
  }, [selectedMonth]);

  const monthLogs = useMemo(() => {
    if (!currentEquipment) return [];
    return coldChainLogs.filter(log => {
      const matchesEq = log.equipmentId === currentEquipment.id || 
                        (log.equipmentName && currentEquipment.name && log.equipmentName.trim().toLowerCase() === currentEquipment.name.trim().toLowerCase());
      if (!matchesEq) return false;
      const normDate = normalizeBsDate(log.dateBs);
      const parts = normDate.split('-');
      if (parts.length < 2) return false;
      return parts[0] === selectedYear && parts[1].padStart(2, '0') === selectedMonth.padStart(2, '0');
    });
  }, [coldChainLogs, currentEquipment, selectedYear, selectedMonth]);

  // Map of dateBs -> { Morning?: LogEntry, Evening?: LogEntry }
  const logsByDate = useMemo(() => {
    const map = new Map<string, { morning?: ColdChainLogEntry; evening?: ColdChainLogEntry }>();
    monthLogs.forEach(log => {
      const normDate = normalizeBsDate(log.dateBs);
      const existing = map.get(normDate) || {};
      if (log.session === 'Morning') {
        existing.morning = log;
      } else if (log.session === 'Evening') {
        existing.evening = log;
      }
      map.set(normDate, existing);
    });
    return map;
  }, [monthLogs]);

  // Out of range count in selected month
  const monthOutOfRangeCount = useMemo(() => {
    return monthLogs.filter(l => l.isOutOfRange || l.tempCelsius < minTemp || l.tempCelsius > maxTemp).length;
  }, [monthLogs, minTemp, maxTemp]);

  // Today's readings for current equipment
  const todayReadings = useMemo(() => {
    if (!currentEquipment) return { morning: null, evening: null };
    const morning = coldChainLogs.find(l => {
      const matchesEq = l.equipmentId === currentEquipment.id || (l.equipmentName && currentEquipment.name && l.equipmentName.trim().toLowerCase() === currentEquipment.name.trim().toLowerCase());
      return matchesEq && normalizeBsDate(l.dateBs) === todayBs && l.session === 'Morning';
    });
    const evening = coldChainLogs.find(l => {
      const matchesEq = l.equipmentId === currentEquipment.id || (l.equipmentName && currentEquipment.name && l.equipmentName.trim().toLowerCase() === currentEquipment.name.trim().toLowerCase());
      return matchesEq && normalizeBsDate(l.dateBs) === todayBs && l.session === 'Evening';
    });
    return { morning, evening };
  }, [coldChainLogs, currentEquipment, todayBs]);

  // Sorted list of all recent logs across the facility
  const sortedRecentLogs = useMemo(() => {
    return [...coldChainLogs].sort((a, b) => {
      const dateA = normalizeBsDate(a.dateBs);
      const dateB = normalizeBsDate(b.dateBs);
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return a.session === 'Evening' ? -1 : 1;
    });
  }, [coldChainLogs]);

  // Print Register Handler
  const handlePrintRegister = () => {
    const printContent = document.getElementById('cold-chain-register-print');
    if (!printContent) return;

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
          <title>कोल्ड चेन दैनिक तापक्रम लग रजिस्टर - ${monthMeta.label} ${selectedYear}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 10mm; }
            body { font-family: 'Mukta', 'Kantipur', sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #64748b; padding: 4px 6px; text-align: center; font-size: 10px; }
            th { background-color: #f1f5f9; font-weight: bold; }
            .header { text-align: center; margin-bottom: 12px; }
            .header h2 { margin: 2px 0; font-size: 16px; color: #0f172a; }
            .header h3 { margin: 2px 0; font-size: 13px; color: #334155; }
            .header p { margin: 2px 0; font-size: 11px; color: #475569; }
            .meta-grid { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 4px; }
            .out-of-range { background-color: #fee2e2 !important; color: #b91c1c; font-weight: bold; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 20px; font-size: 11px; }
            .sig-block { text-align: center; width: 180px; border-top: 1px dashed #475569; padding-top: 6px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 400);
  };

  // CSV Export Handler
  const handleExportCsv = () => {
    if (!currentEquipment) return;
    const daysCount = monthMeta.days || 30;
    const rows = [
      ['Date (BS)', 'Day', 'Equipment', 'Morning Temp (°C)', 'Morning Recorded By', 'Evening Temp (°C)', 'Evening Recorded By', 'Status', 'Remarks / Corrective Action']
    ];

    for (let day = 1; day <= daysCount; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateBs = `${selectedYear}-${selectedMonth}-${dayStr}`;
      const entry = logsByDate.get(dateBs);
      const mTemp = entry?.morning ? entry.morning.tempCelsius : '';
      const mBy = entry?.morning ? entry.morning.recordedBy : '';
      const eTemp = entry?.evening ? entry.evening.tempCelsius : '';
      const eBy = entry?.evening ? entry.evening.recordedBy : '';

      const isMOut = entry?.morning && (entry.morning.tempCelsius < minTemp || entry.morning.tempCelsius > maxTemp);
      const isEOut = entry?.evening && (entry.evening.tempCelsius < minTemp || entry.evening.tempCelsius > maxTemp);
      const isOut = isMOut || isEOut;
      const status = isOut ? 'Out of Range' : (entry?.morning || entry?.evening ? 'Normal' : 'No Reading');
      const remarks = [entry?.morning?.remarks, entry?.evening?.remarks, entry?.morning?.correctiveAction, entry?.evening?.correctiveAction].filter(Boolean).join('; ');

      rows.push([dateBs, dayStr, currentEquipment.name, String(mTemp), mBy, String(eTemp), eBy, status, `"${remarks}"`]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ColdChain_${currentEquipment.name.replace(/\s+/g, '_')}_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render Equipment Management sub-view
  if (viewMode === 'EQUIPMENT') {
    return (
      <ColdChainEquipmentManager
        equipmentList={coldChainEquipment}
        onSaveEquipment={onSaveEquipment}
        onDeleteEquipment={onDeleteEquipment}
        currentUser={currentUser}
        generalSettings={generalSettings}
        onBackToLogs={() => setViewMode('LOGS')}
      />
    );
  }

  const daysCount = monthMeta.days || 31;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 font-nepali">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-100 text-cyan-700 rounded-xl">
              <Thermometer size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-800">कोल्ड चेन तापक्रम लग (EPI Cold Chain Temperature Register)</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                  मानक दायरा: {minTemp}°C - {maxTemp}°C
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                नेपाल सरकार (EPI) मापदण्ड अनुसार खोप फ्रिजको दैनिक दुई पटक (बिहान र बेलुकी) तापक्रम रेकर्ड तथा विचलन ट्र्याकिङ
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setViewMode('EQUIPMENT')}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200"
          >
            <Settings size={15} /> उपकरण व्यवस्थापन (Fridges: {coldChainEquipment.length})
          </button>

          <button
            onClick={() => handleOpenEntryModal(todayBs)}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <Plus size={16} /> आजको तापक्रम दर्ता गर्नुहोस् (Record Temp)
          </button>
        </div>
      </div>

      {/* Equipment Selector Pills & Stats */}
      {activeEquipments.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-base font-bold text-amber-900">कुनै पनि सक्रिय खोप उपकरण (ILR Fridge) फेला परेन</h3>
          <p className="text-xs text-amber-700 max-w-md mx-auto">
            तापक्रम दर्ता गर्नका लागि पहिले संस्थामा रहेको ILR फ्रिज वा डिप फ्रिजर उपकरण दर्ता गर्नुहोस्।
          </p>
          <button
            onClick={() => setViewMode('EQUIPMENT')}
            className="inline-flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Plus size={15} /> पहिलो उपकरण दर्ता गर्नुहोस्
          </button>
        </div>
      ) : (
        <>
          {/* Equipment Pills */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1.5">
                <Thermometer size={15} className="text-cyan-600" /> उपकरण छनोट:
              </span>
              {activeEquipments.map(eq => (
                <button
                  key={eq.id}
                  onClick={() => setSelectedEquipmentId(eq.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    currentEquipment?.id === eq.id
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{eq.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    currentEquipment?.id === eq.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {eq.type}
                  </span>
                </button>
              ))}
            </div>

            {/* Incharge Alert Phone indicator */}
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <Smartphone size={14} className="text-cyan-600" />
              <span className="text-slate-500">अलर्ट नम्बर:</span>
              <span className="font-mono font-bold text-slate-700">
                {generalSettings.coldChainAlertPhone || 'कन्फिगर गरिएको छैन'}
              </span>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Fridge Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">छानिएको उपकरण</p>
              <h4 className="text-base font-bold text-slate-800 mt-1 truncate">{currentEquipment?.name}</h4>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 font-mono">
                <span>SN: {currentEquipment?.serialNumber || 'N/A'}</span>
                <span>•</span>
                <span>{currentEquipment?.location || 'खोप कक्ष'}</span>
              </div>
            </div>

            {/* Today's Morning Reading Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">आजको बिहान (Morning)</p>
                <Clock size={16} className="text-amber-500" />
              </div>
              {todayReadings.morning ? (
                <div className="mt-1 flex items-baseline gap-2">
                  <span className={`text-2xl font-black font-mono ${
                    todayReadings.morning.isOutOfRange ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {todayReadings.morning.tempCelsius}°C
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    todayReadings.morning.isOutOfRange ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {todayReadings.morning.isOutOfRange ? '⚠️ विचलन' : '✓ सामान्य'}
                  </span>
                </div>
              ) : (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-400">रेकर्ड बाँकी</span>
                  <button
                    onClick={() => handleOpenEntryModal(todayBs, 'Morning')}
                    className="text-[11px] font-bold text-cyan-600 hover:text-cyan-700 underline"
                  >
                    दर्ता गर्नुहोस्
                  </button>
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1 truncate">
                {todayReadings.morning ? `रेकर्डकर्ता: ${todayReadings.morning.recordedBy}` : 'समय: बिहान (Morning)'}
              </p>
            </div>

            {/* Today's Evening Reading Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">आजको बेलुकी (Evening)</p>
                <Clock size={16} className="text-indigo-500" />
              </div>
              {todayReadings.evening ? (
                <div className="mt-1 flex items-baseline gap-2">
                  <span className={`text-2xl font-black font-mono ${
                    todayReadings.evening.isOutOfRange ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {todayReadings.evening.tempCelsius}°C
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    todayReadings.evening.isOutOfRange ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {todayReadings.evening.isOutOfRange ? '⚠️ विचलन' : '✓ सामान्य'}
                  </span>
                </div>
              ) : (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-400">रेकर्ड बाँकी</span>
                  <button
                    onClick={() => handleOpenEntryModal(todayBs, 'Evening')}
                    className="text-[11px] font-bold text-cyan-600 hover:text-cyan-700 underline"
                  >
                    दर्ता गर्नुहोस्
                  </button>
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1 truncate">
                {todayReadings.evening ? `रेकर्डकर्ता: ${todayReadings.evening.recordedBy}` : 'समय: बेलुकी (Evening)'}
              </p>
            </div>

            {/* Out of range incidents this month */}
            <div className={`p-5 rounded-2xl border shadow-xs ${
              monthOutOfRangeCount > 0
                ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">महिनाको विचलन (Incidents)</p>
                <AlertCircle size={16} className={monthOutOfRangeCount > 0 ? 'text-rose-600' : 'text-slate-400'} />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={`text-2xl font-black font-mono ${monthOutOfRangeCount > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                  {monthOutOfRangeCount}
                </span>
                <span className="text-xs opacity-75">पटक दायरा बाहिर</span>
              </div>
              <p className="text-[10px] opacity-75 mt-1">
                सुरक्षित दायरा ({minTemp}°C - {maxTemp}°C) भन्दा बाहिर गएको संख्या
              </p>
            </div>
          </div>

          {/* Month Navigation & Action Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                title="अघिल्लो महिना"
              >
                <ChevronLeft size={18} />
              </button>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                {['2080', '2081', '2082', '2083', '2084'].map(y => (
                  <option key={y} value={y}>{y} साल</option>
                ))}
              </select>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                {NEPALI_MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>

              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                title="अर्को महिना"
              >
                <ChevronRight size={18} />
              </button>

              <button
                onClick={handleCurrentMonth}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors ml-1"
              >
                चालू महिना (Current)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200"
              >
                <Download size={14} /> CSV डाउनलोड
              </button>
              <button
                onClick={handlePrintRegister}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Printer size={14} /> प्रिन्ट रजिस्टर (Print Register)
              </button>
            </div>
          </div>

          {/* Daily Log Register Table (EPI Standard Format) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  {currentEquipment?.name} — {monthMeta.label} {selectedYear} को दैनिक तापक्रम रेकर्ड
                </h3>
                <p className="text-[11px] text-slate-500">
                  प्रत्येक दिन बिहान (१०:०० बजे भित्र) र बेलुकी (४:०० बजे पछि) लिइएको तापक्रम
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                  <span className="text-slate-600">सामान्य ({minTemp}°C - {maxTemp}°C)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                  <span className="text-slate-600">विचलन / जोखिम (&lt;{minTemp}°C वा &gt;{maxTemp}°C)</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="p-3 pl-4 text-center w-16">गते (Day)</th>
                    <th className="p-3 text-center border-l border-slate-200 bg-amber-50/50" colSpan={3}>
                      बिहान (Morning Session)
                    </th>
                    <th className="p-3 text-center border-l border-slate-200 bg-indigo-50/50" colSpan={3}>
                      बेलुकी (Evening Session)
                    </th>
                    <th className="p-3 text-center border-l border-slate-200 w-28">स्थिति (Status)</th>
                    <th className="p-3 border-l border-slate-200">कैफियत / सुधारात्मक कदम (Remarks)</th>
                    <th className="p-3 text-right pr-4 border-l border-slate-200 w-28">कार्य (Action)</th>
                  </tr>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-bold">
                    <th className="p-2 pl-4 text-center">मिति BS</th>
                    {/* Morning */}
                    <th className="p-2 text-center border-l border-slate-200 w-24">तापक्रम (°C)</th>
                    <th className="p-2 border-l border-slate-200">रेकर्डकर्ता</th>
                    <th className="p-2 text-center border-l border-slate-200 w-16">प्रविष्टि</th>
                    {/* Evening */}
                    <th className="p-2 text-center border-l border-slate-200 w-24">तापक्रम (°C)</th>
                    <th className="p-2 border-l border-slate-200">रेकर्डकर्ता</th>
                    <th className="p-2 text-center border-l border-slate-200 w-16">प्रविष्टि</th>
                    {/* Status & Remarks */}
                    <th className="p-2 text-center border-l border-slate-200">सुरक्षा</th>
                    <th className="p-2 border-l border-slate-200">विवरण</th>
                    <th className="p-2 text-right pr-4 border-l border-slate-200">हटाउनुहोस्</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Array.from({ length: daysCount }, (_, i) => i + 1).map(day => {
                    const dayStr = String(day).padStart(2, '0');
                    const dateBs = `${selectedYear}-${selectedMonth}-${dayStr}`;
                    const isToday = dateBs === todayBs;
                    const dayEntries = logsByDate.get(dateBs);
                    const morning = dayEntries?.morning;
                    const evening = dayEntries?.evening;

                    const isMorningOutOfRange = morning && (morning.isOutOfRange || morning.tempCelsius < minTemp || morning.tempCelsius > maxTemp);
                    const isEveningOutOfRange = evening && (evening.isOutOfRange || evening.tempCelsius < minTemp || evening.tempCelsius > maxTemp);
                    const hasOutOfRange = isMorningOutOfRange || isEveningOutOfRange;

                    return (
                      <tr
                        key={dateBs}
                        className={`transition-colors ${
                          hasOutOfRange
                            ? 'bg-rose-50/60 hover:bg-rose-100/50'
                            : isToday
                            ? 'bg-cyan-50/40 hover:bg-cyan-50/70 font-semibold'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Day / Date */}
                        <td className="p-2.5 pl-4 text-center font-mono font-bold text-slate-700">
                          <span className={`inline-block px-2 py-0.5 rounded-md ${
                            isToday ? 'bg-cyan-600 text-white' : 'text-slate-700'
                          }`}>
                            {dayStr}
                          </span>
                        </td>

                        {/* Morning Temp */}
                        <td className="p-2.5 text-center border-l border-slate-200 font-mono">
                          {morning ? (
                            <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-xs ${
                              isMorningOutOfRange
                                ? 'bg-rose-600 text-white animate-pulse'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {morning.tempCelsius.toFixed(1)}°C
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Morning Recorded By */}
                        <td className="p-2.5 border-l border-slate-200 text-slate-600 truncate max-w-[120px]">
                          {morning?.recordedBy || '—'}
                        </td>

                        {/* Morning Action */}
                        <td className="p-2.5 text-center border-l border-slate-200">
                          <button
                            onClick={() => handleOpenEntryModal(dateBs, 'Morning')}
                            className="p-1 text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 rounded transition-colors"
                            title={morning ? "सम्पादन गर्नुहोस्" : "बिहानको तापक्रम दर्ता गर्नुहोस्"}
                          >
                            {morning ? <Edit2 size={13} /> : <Plus size={13} className="text-cyan-600" />}
                          </button>
                        </td>

                        {/* Evening Temp */}
                        <td className="p-2.5 text-center border-l border-slate-200 font-mono">
                          {evening ? (
                            <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-xs ${
                              isEveningOutOfRange
                                ? 'bg-rose-600 text-white animate-pulse'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {evening.tempCelsius.toFixed(1)}°C
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Evening Recorded By */}
                        <td className="p-2.5 border-l border-slate-200 text-slate-600 truncate max-w-[120px]">
                          {evening?.recordedBy || '—'}
                        </td>

                        {/* Evening Action */}
                        <td className="p-2.5 text-center border-l border-slate-200">
                          <button
                            onClick={() => handleOpenEntryModal(dateBs, 'Evening')}
                            className="p-1 text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 rounded transition-colors"
                            title={evening ? "सम्पादन गर्नुहोस्" : "बेलुकीको तापक्रम दर्ता गर्नुहोस्"}
                          >
                            {evening ? <Edit2 size={13} /> : <Plus size={13} className="text-cyan-600" />}
                          </button>
                        </td>

                        {/* Status */}
                        <td className="p-2.5 text-center border-l border-slate-200">
                          {hasOutOfRange ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertTriangle size={11} /> विचलन
                            </span>
                          ) : (morning || evening) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={11} /> सामान्य
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Remarks */}
                        <td className="p-2.5 border-l border-slate-200 text-slate-600">
                          {morning?.remarks || evening?.remarks || morning?.correctiveAction || evening?.correctiveAction ? (
                            <div className="space-y-0.5">
                              {(morning?.remarks || evening?.remarks) && (
                                <p className="text-slate-700">{morning?.remarks || evening?.remarks}</p>
                              )}
                              {(morning?.correctiveAction || evening?.correctiveAction) && (
                                <p className="text-[11px] text-rose-700 font-semibold">
                                  कदम: {morning?.correctiveAction || evening?.correctiveAction}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 italic">कुनै कैफियत छैन</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-2.5 text-right pr-4 border-l border-slate-200">
                          {(morning || evening) ? (
                            <div className="flex items-center justify-end gap-1">
                              {morning && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`के तपाईं ${dateBs} को बिहानको लग हटाउन चाहनुहुन्छ?`)) {
                                      onDeleteLog(morning.id);
                                    }
                                  }}
                                  className="text-[10px] text-slate-400 hover:text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50"
                                  title="बिहानको लग हटाउनुहोस्"
                                >
                                  M<Trash2 size={10} className="inline ml-0.5" />
                                </button>
                              )}
                              {evening && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`के तपाईं ${dateBs} को बेलुकीको लग हटाउन चाहनुहुन्छ?`)) {
                                      onDeleteLog(evening.id);
                                    }
                                  }}
                                  className="text-[10px] text-slate-400 hover:text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50"
                                  title="बेलुकीको लग हटाउनुहोस्"
                                >
                                  E<Trash2 size={10} className="inline ml-0.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Logs List for Facility Overview */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                    हालै रेकर्ड गरिएका दैनिक तापक्रम विवरणहरू (Recent Logged Readings)
                  </h3>
                  <p className="text-xs text-slate-500">
                    कुल {coldChainLogs.length} वटा रेकर्ड दर्ता छन्
                  </p>
                </div>
              </div>
            </div>

            {sortedRecentLogs.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg text-slate-500 text-xs sm:text-sm">
                अहिलेसम्म कुनै तापक्रम लग रेकर्ड गरिएको छैन। माथिको "+ तापक्रम दर्ता गर्नुहोस्" बटनबाट नयाँ लग थप्नुहोस्।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">मिति (वि.सं.)</th>
                      <th className="p-2.5">समय / सत्र</th>
                      <th className="p-2.5">उपकरणको नाम</th>
                      <th className="p-2.5 text-center">तापक्रम (°C)</th>
                      <th className="p-2.5 text-center">स्थिति</th>
                      <th className="p-2.5">रेकर्डकर्ता</th>
                      <th className="p-2.5">कैफियत</th>
                      <th className="p-2.5 text-right">कार्य</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedRecentLogs.slice(0, 10).map((log) => {
                      const isOut = log.isOutOfRange || log.tempCelsius < minTemp || log.tempCelsius > maxTemp;
                      return (
                        <tr key={log.id} className={`hover:bg-slate-50/80 transition-colors ${isOut ? 'bg-rose-50/40' : ''}`}>
                          <td className="p-2.5 font-bold text-slate-800 font-mono">{log.dateBs}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.session === 'Morning' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {log.session === 'Morning' ? 'बिहान (Morning)' : 'बेलुकी (Evening)'}
                            </span>
                          </td>
                          <td className="p-2.5 font-medium text-slate-800">{log.equipmentName || 'खोप फ्रिज'}</td>
                          <td className="p-2.5 text-center font-bold font-mono text-sm">
                            <span className={isOut ? 'text-rose-600' : 'text-emerald-700'}>
                              {log.tempCelsius.toFixed(1)}°C
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            {isOut ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                <AlertTriangle size={10} /> विचलन
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 size={10} /> सामान्य
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-600">{log.recordedBy || '—'}</td>
                          <td className="p-2.5 text-slate-500 max-w-[150px] truncate">{log.remarks || log.correctiveAction || '—'}</td>
                          <td className="p-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEntryModal(log.dateBs, log.session, log.equipmentId)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="सम्पादन गर्नुहोस्"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`के तपाईं यो रेकर्ड (${log.dateBs} - ${log.session}) हटाउन चाहनुहुन्छ?`)) {
                                    onDeleteLog(log.id);
                                  }
                                }}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                title="हटाउनुहोस्"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Hidden Printable EPI Register Format */}
      <div id="cold-chain-register-print" className="hidden">
        <div className="header">
          <h2>{generalSettings.orgNameNepali}</h2>
          <h3>{generalSettings.subTitleNepali || 'स्वास्थ्य शाखा / खोप ईकाई'}</h3>
          <p>{generalSettings.address || ''}</p>
          <h3 style={{ marginTop: '10px', textDecoration: 'underline' }}>
            कोल्ड चेन (खोप फ्रिज) तापक्रम रेकर्ड रजिस्टर (EPI Cold Chain Daily Temperature Register)
          </h3>
        </div>

        <div className="meta-grid">
          <div><b>उपकरणको नाम:</b> {currentEquipment?.name || 'ILR Fridge'} ({currentEquipment?.type})</div>
          <div><b>सिरियल नम्बर:</b> {currentEquipment?.serialNumber || 'N/A'}</div>
          <div><b>महिना र साल:</b> {monthMeta.label} {selectedYear}</div>
          <div><b>मानक सुरक्षित दायरा:</b> {minTemp}°C देखि {maxTemp}°C सम्म</div>
        </div>

        <table>
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: '40px' }}>गते (Day)</th>
              <th colSpan={2}>बिहानको रेकर्ड (Morning - 10:00 AM)</th>
              <th colSpan={2}>बेलुकीको रेकर्ड (Evening - 4:00 PM)</th>
              <th rowSpan={2} style={{ width: '60px' }}>स्थिति</th>
              <th rowSpan={2}>कैफियत / सुधारात्मक कदम (Remarks / Corrective Action)</th>
            </tr>
            <tr>
              <th style={{ width: '70px' }}>तापक्रम (°C)</th>
              <th style={{ width: '100px' }}>रेकर्डकर्ता</th>
              <th style={{ width: '70px' }}>तापक्रम (°C)</th>
              <th style={{ width: '100px' }}>रेकर्डकर्ता</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: daysCount }, (_, i) => i + 1).map(day => {
              const dayStr = String(day).padStart(2, '0');
              const dateBs = `${selectedYear}-${selectedMonth}-${dayStr}`;
              const entry = logsByDate.get(dateBs);
              const morning = entry?.morning;
              const evening = entry?.evening;

              const isMOut = morning && (morning.tempCelsius < minTemp || morning.tempCelsius > maxTemp);
              const isEOut = evening && (evening.tempCelsius < minTemp || evening.tempCelsius > maxTemp);
              const isOut = isMOut || isEOut;

              const remarks = [morning?.remarks, evening?.remarks, morning?.correctiveAction, evening?.correctiveAction].filter(Boolean).join('; ');

              return (
                <tr key={dateBs} className={isOut ? 'out-of-range' : ''}>
                  <td><b>{dayStr}</b></td>
                  <td className={isMOut ? 'out-of-range' : ''}>{morning ? `${morning.tempCelsius.toFixed(1)}°C` : ''}</td>
                  <td>{morning?.recordedBy || ''}</td>
                  <td className={isEOut ? 'out-of-range' : ''}>{evening ? `${evening.tempCelsius.toFixed(1)}°C` : ''}</td>
                  <td>{evening?.recordedBy || ''}</td>
                  <td>{isOut ? 'विचलन' : (morning || evening ? 'सामान्य' : '')}</td>
                  <td style={{ textAlign: 'left', paddingLeft: '8px' }}>{remarks}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="signatures">
          <div className="sig-block">
            <b>तयार गर्ने (Recorded By)</b>
            <p style={{ margin: '2px 0' }}>खोप सुपरभाइजर / फोकल पर्सन</p>
          </div>
          <div className="sig-block">
            <b>प्रमाणित गर्ने (Verified By)</b>
            <p style={{ margin: '2px 0' }}>कोल्ड चेन अधिकृत</p>
          </div>
          <div className="sig-block">
            <b>स्वास्थ्य संस्था प्रमुख (In-charge)</b>
            <p style={{ margin: '2px 0' }}>हस्ताक्षर र मिति</p>
          </div>
        </div>
      </div>

      {/* Record Temperature Modal */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200 font-nepali">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[92vh] my-auto overflow-hidden">
            {/* Header */}
            <div className={`p-5 text-white flex items-center justify-between shrink-0 transition-colors ${
              isFormTempOutOfRange
                ? 'bg-gradient-to-r from-rose-600 to-amber-700'
                : 'bg-gradient-to-r from-cyan-600 to-blue-700'
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Thermometer size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingLogId ? 'तापक्रम सम्पादन (Edit Temperature)' : 'दैनिक तापक्रम दर्ता (Record Daily Temperature)'}
                  </h3>
                  <p className="text-xs text-cyan-100">
                    सुरक्षित मानक दायरा: {minTemp}°C देखि {maxTemp}°C
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEntryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form Body - Scrollable */}
            <form onSubmit={handleSaveEntry} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Equipment & Session */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="उपकरण छनोट (Equipment) *"
                    value={formEquipmentId}
                    onChange={(e) => setFormEquipmentId(e.target.value)}
                    options={activeEquipments.map(eq => ({ value: eq.id, label: `${eq.name} (${eq.type})` }))}
                  />

                  <Select
                    label="समय / सत्र (Session) *"
                    value={formSession}
                    onChange={(e) => setFormSession(e.target.value as any)}
                    options={[
                      { value: 'Morning', label: 'बिहान (Morning - 10:00 AM)' },
                      { value: 'Evening', label: 'बेलुकी (Evening - 04:00 PM)' }
                    ]}
                  />
                </div>

                {/* Date BS & Temp */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NepaliDatePicker
                    label="मिति (Date BS) *"
                    value={formDateBs}
                    onChange={(val) => setFormDateBs(val)}
                    required
                  />

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      तापक्रम (°C Celsius) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={formTemp}
                        onChange={(e) => setFormTemp(e.target.value)}
                        className={`w-full px-3.5 py-2.5 text-base font-bold font-mono border rounded-xl focus:outline-none transition-all ${
                          isFormTempOutOfRange
                            ? 'border-rose-400 bg-rose-50/40 text-rose-700 focus:ring-2 focus:ring-rose-500'
                            : 'border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-cyan-500'
                        }`}
                        placeholder="उदा: 4.5"
                        required
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                        °C
                      </span>
                    </div>
                  </div>
                </div>

                {/* Real-time Out of Range Alert Box */}
                {isFormTempOutOfRange && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 animate-in fade-in">
                    <div className="flex items-start gap-2.5 text-rose-800">
                      <ShieldAlert size={20} className="text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold">⚠️ तापक्रम मान्य दायरा भन्दा बाहिर छ! (Temperature Breach)</h4>
                        <p className="text-[11px] text-rose-700 mt-0.5">
                          प्रविष्ट तापक्रम <b>{formTemp}°C</b> सुरक्षित भण्डारण दायरा ({minTemp}°C - {maxTemp}°C) भन्दा बाहिर छ। कृपया सुधारात्मक कदम तुरुन्त चाल्नुहोस्।
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1 border-t border-rose-200">
                      <label className="block text-[11px] font-bold text-rose-900">
                        सुधारात्मक कदम (Corrective Action Taken) *
                      </label>
                      <input
                        type="text"
                        value={formCorrectiveAction}
                        onChange={(e) => setFormCorrectiveAction(e.target.value)}
                        placeholder="उदा: जेनेरेटर चालु गरियो / थर्मोस्ट्याट मिलाइयो / खोप बक्समा सारियो"
                        className="w-full text-xs px-3 py-2 border border-rose-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
                      />
                    </div>

                    {/* SMS Alert Section */}
                    <div className="bg-white/80 p-3 rounded-xl border border-rose-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <Smartphone size={14} className="text-rose-600" />
                          अलर्ट SMS पठाउने नम्बर:
                        </span>
                        {smsStatus && (
                          <span className={`text-[10px] font-bold ${
                            smsStatus.type === 'success' ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {smsStatus.message}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="tel"
                          value={customPhone}
                          onChange={(e) => setCustomPhone(e.target.value)}
                          placeholder="९८XXXXXXXX"
                          className="flex-1 text-xs px-3 py-1.5 border border-slate-200 rounded-lg font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleSendAlertSms}
                          disabled={isSendingSms}
                          className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isSendingSms ? (
                            <>
                              <Loader2 size={13} className="animate-spin" /> पठाउँदैछ...
                            </>
                          ) : (
                            <>
                              <Send size={13} /> SMS पठाउनुहोस्
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Remarks */}
                <Input
                  label="कैफियत (Remarks)"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="कुनै अतिरिक्त टिप्पणी भए यहाँ लेख्नुहोस्..."
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  रद्द गर्नुहोस्
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer ${
                    isFormTempOutOfRange
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                      : 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-600/20'
                  }`}
                >
                  सुरक्षित गर्नुहोस् (Save)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
