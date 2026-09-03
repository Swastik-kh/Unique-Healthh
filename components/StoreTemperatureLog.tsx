import React, { useState, useMemo, useEffect } from 'react';
import { StoreRoom, StoreTemperatureLogEntry } from '../types/healthTypes';
import { User, OrganizationSettings } from '../types/coreTypes';
import { 
  Warehouse, Thermometer, Droplets, Plus, Edit2, Trash2, Printer, 
  Search, Calendar, AlertTriangle, CheckCircle2, ChevronLeft, 
  ChevronRight, Clock, Settings, RefreshCw, AlertCircle, Info, Sparkles, X, ShieldAlert
} from 'lucide-react';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { NepaliDatePicker } from './NepaliDatePicker';
import { Input } from './Input';
import { Select } from './Select';

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

export const toNepaliDigits = (num: number | string): string => {
  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return String(num).replace(/[0-9]/g, (digit) => nepaliDigits[parseInt(digit)]);
};

export const DEFAULT_STORE_ROOMS: StoreRoom[] = [
  {
    id: 'room-main-medicine',
    name: 'मुख्य औषधि स्टोर (Main Medicine Store)',
    roomCode: 'STR-01',
    location: 'मूल भवन, पहिलो तल्ला',
    minTempC: 15,
    maxTempC: 25,
    maxHumidityPercent: 65,
    isActive: true,
    remarks: 'औषधि तथा सर्जिकल सामग्री भण्डारण'
  },
  {
    id: 'room-vaccine-storage',
    name: 'खोप तथा भ्याक्सिन कोठा (Vaccine Room)',
    roomCode: 'STR-02',
    location: 'खोप शाखा',
    minTempC: 15,
    maxTempC: 25,
    maxHumidityPercent: 60,
    isActive: true,
    remarks: 'खोप सामग्री तथा सहायक उपकरण कक्ष'
  },
  {
    id: 'room-general-inventory',
    name: 'जिन्सी तथा प्रशासनिक स्टोर (General Store)',
    roomCode: 'STR-03',
    location: 'जिन्सी शाखा',
    minTempC: 15,
    maxTempC: 30,
    maxHumidityPercent: 70,
    isActive: true,
    remarks: 'जिन्सी सामान तथा स्टेशनरी भण्डारण'
  },
  {
    id: 'room-dispensary-store',
    name: 'डिस्पेन्सरी / फार्मेसी स्टोर (Dispensary Store)',
    roomCode: 'STR-04',
    location: 'ओपिडी भवन',
    minTempC: 15,
    maxTempC: 25,
    maxHumidityPercent: 65,
    isActive: true,
    remarks: 'दैनिक वितरण औषधि कक्ष'
  }
];

export const NEPALI_MONTHS = [
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

interface StoreTemperatureLogProps {
  storeRooms?: StoreRoom[];
  storeTemperatureLogs?: StoreTemperatureLogEntry[];
  onSaveLog: (log: StoreTemperatureLogEntry) => void;
  onDeleteLog: (logId: string) => void;
  onSaveRoom: (room: StoreRoom) => void;
  onDeleteRoom: (roomId: string) => void;
  currentUser: User | null;
  generalSettings: OrganizationSettings;
  activeOrgName?: string;
  onNavigateToColdChain?: () => void;
}

export const StoreTemperatureLog: React.FC<StoreTemperatureLogProps> = ({
  storeRooms = [],
  storeTemperatureLogs = [],
  onSaveLog,
  onDeleteLog,
  onSaveRoom,
  onDeleteRoom,
  currentUser,
  generalSettings,
  activeOrgName,
  onNavigateToColdChain
}) => {
  // Effective rooms list (with defaults if empty)
  const effectiveRooms = useMemo(() => {
    if (storeRooms && storeRooms.length > 0) {
      return storeRooms;
    }
    return DEFAULT_STORE_ROOMS;
  }, [storeRooms]);

  const activeRooms = useMemo(() => {
    return effectiveRooms.filter(r => r.isActive !== false);
  }, [effectiveRooms]);

  // View modes: LOGS vs ROOMS_MANAGE
  const [activeTab, setActiveTab] = useState<'LOGS' | 'ROOMS'>('LOGS');

  // Today BS Date
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
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  useEffect(() => {
    if (!selectedRoomId && activeRooms.length > 0) {
      setSelectedRoomId(activeRooms[0].id);
    }
  }, [activeRooms, selectedRoomId]);

  const currentRoom = useMemo(() => {
    return activeRooms.find(r => r.id === selectedRoomId) || activeRooms[0] || null;
  }, [activeRooms, selectedRoomId]);

  // Target thresholds for the currently selected room
  const minTemp = currentRoom?.minTempC ?? 15;
  const maxTemp = currentRoom?.maxTempC ?? 25;
  const maxHumidity = currentRoom?.maxHumidityPercent ?? 65;

  // Modals
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  // Form State for Entry
  const [formDateBs, setFormDateBs] = useState<string>(todayBs);
  const [formRoomId, setFormRoomId] = useState<string>('');
  const [formSession, setFormSession] = useState<'Morning' | 'Evening'>('Morning');
  const [formTemp, setFormTemp] = useState<string>('21.0');
  const [formHumidity, setFormHumidity] = useState<string>('55');
  const [formRemarks, setFormRemarks] = useState<string>('');
  const [formCorrectiveAction, setFormCorrectiveAction] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Room Manage Modal State
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<StoreRoom | null>(null);
  const [roomFormData, setRoomFormData] = useState<Partial<StoreRoom>>({
    name: '',
    roomCode: '',
    location: '',
    minTempC: 15,
    maxTempC: 25,
    maxHumidityPercent: 65,
    isActive: true,
    remarks: ''
  });
  const [roomFormError, setRoomFormError] = useState('');

  // Open Entry Modal with pre-filling
  const handleOpenEntryModal = (dateStr?: string, session?: 'Morning' | 'Evening', roomId?: string) => {
    const targetRoomId = roomId || selectedRoomId || (activeRooms[0]?.id ?? '');
    const targetDate = normalizeBsDate(dateStr || todayBs);

    let targetSession: 'Morning' | 'Evening' = session || 'Morning';
    if (!session) {
      const currentHour = new Date().getHours();
      targetSession = currentHour < 13 ? 'Morning' : 'Evening';
    }

    setFormRoomId(targetRoomId);
    setFormDateBs(targetDate);
    setFormSession(targetSession);
    setFormError('');

    // Check if an existing log exists
    const existing = storeTemperatureLogs.find(l => {
      const matchesRoom = l.roomId === targetRoomId || (l.roomName && targetRoomId && l.roomName.trim().toLowerCase() === targetRoomId.trim().toLowerCase());
      return matchesRoom && normalizeBsDate(l.dateBs) === targetDate && l.session === targetSession;
    });

    if (existing) {
      setEditingLogId(existing.id);
      setFormTemp(String(existing.tempCelsius));
      setFormHumidity(existing.humidityPercent !== undefined ? String(existing.humidityPercent) : '55');
      setFormRemarks(existing.remarks || '');
      setFormCorrectiveAction(existing.correctiveAction || '');
    } else {
      setEditingLogId(null);
      setFormTemp('21.0');
      setFormHumidity('55');
      setFormRemarks('');
      setFormCorrectiveAction('');
    }

    setIsEntryModalOpen(true);
  };

  // Sync existing log when user changes room/date/session in modal
  useEffect(() => {
    if (isEntryModalOpen && formRoomId && formDateBs && formSession) {
      const normDate = normalizeBsDate(formDateBs);
      const existing = storeTemperatureLogs.find(l => {
        const matchesRoom = l.roomId === formRoomId || (l.roomName && formRoomId && l.roomName.trim().toLowerCase() === formRoomId.trim().toLowerCase());
        return matchesRoom && normalizeBsDate(l.dateBs) === normDate && l.session === formSession;
      });
      if (existing && existing.id !== editingLogId) {
        setEditingLogId(existing.id);
        setFormTemp(String(existing.tempCelsius));
        setFormHumidity(existing.humidityPercent !== undefined ? String(existing.humidityPercent) : '55');
        setFormRemarks(existing.remarks || '');
        setFormCorrectiveAction(existing.correctiveAction || '');
      }
    }
  }, [formRoomId, formDateBs, formSession, isEntryModalOpen, storeTemperatureLogs, editingLogId]);

  // Convert BS to AD
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
    if (!formRoomId) {
      setFormError('कृपया स्टोर कोठा/कक्ष छनोट गर्नुहोस्।');
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

    const humidVal = formHumidity ? parseFloat(formHumidity) : undefined;
    if (humidVal !== undefined && (isNaN(humidVal) || humidVal < 0 || humidVal > 100)) {
      setFormError('कृपया मान्य आद्रता (० देखि १००%) प्रविष्ट गर्नुहोस्।');
      return;
    }

    const normDate = normalizeBsDate(formDateBs);
    const room = effectiveRooms.find(r => r.id === formRoomId);
    const roomName = room ? room.name : 'स्टोर कोठा';
    
    const rMin = room?.minTempC ?? 15;
    const rMax = room?.maxTempC ?? 25;
    const rMaxHumid = room?.maxHumidityPercent ?? 65;

    const isOutOfRange = (tempVal < rMin || tempVal > rMax) || (humidVal !== undefined && humidVal > rMaxHumid);
    const dateAd = calculateDateAd(normDate);

    const logEntry: StoreTemperatureLogEntry = {
      id: editingLogId || `stl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      roomId: formRoomId,
      roomName: roomName,
      dateBs: normDate,
      dateAd: dateAd || '',
      session: formSession,
      tempCelsius: tempVal,
      humidityPercent: humidVal,
      isOutOfRange: isOutOfRange,
      recordedBy: currentUser?.fullName || currentUser?.username || 'स्टोर कर्मचारी',
      recordedByUid: currentUser?.id || '',
      remarks: formRemarks.trim() || '',
      correctiveAction: formCorrectiveAction.trim() || '',
      _orgName: activeOrgName || generalSettings.orgNameNepali || ''
    };

    onSaveLog(logEntry);
    setIsEntryModalOpen(false);
  };

  // Filter logs for selected year, month, and room
  const monthlyLogs = useMemo(() => {
    if (!currentRoom) return [];
    return storeTemperatureLogs.filter(log => {
      const matchesRoom = log.roomId === currentRoom.id || (log.roomName && currentRoom.name && log.roomName.trim().toLowerCase() === currentRoom.name.trim().toLowerCase());
      const normDate = normalizeBsDate(log.dateBs);
      const parts = normDate.split('-');
      const matchesYear = parts[0] === selectedYear;
      const matchesMonth = parts[1] === selectedMonth;
      return matchesRoom && matchesYear && matchesMonth;
    });
  }, [storeTemperatureLogs, currentRoom, selectedYear, selectedMonth]);

  // Days map for current month
  const daysInSelectedMonth = useMemo(() => {
    const m = NEPALI_MONTHS.find(mon => mon.value === selectedMonth);
    return m ? m.days : 32;
  }, [selectedMonth]);

  const monthlyDayMap = useMemo(() => {
    const map = new Map<number, { morning?: StoreTemperatureLogEntry; evening?: StoreTemperatureLogEntry }>();
    monthlyLogs.forEach(log => {
      const parts = normalizeBsDate(log.dateBs).split('-');
      const d = parseInt(parts[2], 10);
      if (!isNaN(d)) {
        const cur = map.get(d) || {};
        if (log.session === 'Morning') cur.morning = log;
        else cur.evening = log;
        map.set(d, cur);
      }
    });
    return map;
  }, [monthlyLogs]);

  // Today's readings
  const todayLogs = useMemo(() => {
    if (!currentRoom) return { morning: undefined, evening: undefined };
    const morning = storeTemperatureLogs.find(l => {
      const matchesRoom = l.roomId === currentRoom.id || (l.roomName && currentRoom.name && l.roomName.trim().toLowerCase() === currentRoom.name.trim().toLowerCase());
      return matchesRoom && normalizeBsDate(l.dateBs) === todayBs && l.session === 'Morning';
    });
    const evening = storeTemperatureLogs.find(l => {
      const matchesRoom = l.roomId === currentRoom.id || (l.roomName && currentRoom.name && l.roomName.trim().toLowerCase() === currentRoom.name.trim().toLowerCase());
      return matchesRoom && normalizeBsDate(l.dateBs) === todayBs && l.session === 'Evening';
    });
    return { morning, evening };
  }, [storeTemperatureLogs, currentRoom, todayBs]);

  // Monthly stats
  const monthlyStats = useMemo(() => {
    if (monthlyLogs.length === 0) {
      return { avgTemp: 0, minTempRecorded: 0, maxTempRecorded: 0, avgHumid: 0, outOfRangeCount: 0 };
    }
    const temps = monthlyLogs.map(l => l.tempCelsius).filter(t => !isNaN(t));
    const humids = monthlyLogs.map(l => l.humidityPercent).filter((h): h is number => h !== undefined && !isNaN(h));
    const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
    const avgHumid = humids.length > 0 ? humids.reduce((a, b) => a + b, 0) / humids.length : 0;
    const minTempRecorded = temps.length > 0 ? Math.min(...temps) : 0;
    const maxTempRecorded = temps.length > 0 ? Math.max(...temps) : 0;
    const outOfRangeCount = monthlyLogs.filter(l => l.isOutOfRange).length;

    return {
      avgTemp: Number(avgTemp.toFixed(1)),
      minTempRecorded: Number(minTempRecorded.toFixed(1)),
      maxTempRecorded: Number(maxTempRecorded.toFixed(1)),
      avgHumid: Number(avgHumid.toFixed(0)),
      outOfRangeCount
    };
  }, [monthlyLogs]);

  // Print Handler: Guarantees exact 1-page fit in A4 Portrait
  const handlePrintMonthlyLog = () => {
    const printContent = document.getElementById('store-temperature-print-content');
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

    const monthLabel = NEPALI_MONTHS.find(m => m.value === selectedMonth)?.label || selectedMonth;
    const roomTitle = currentRoom?.name || 'स्टोर कक्ष';

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>स्टोर तापक्रम तथा आद्रता लग - ${roomTitle} (${monthLabel} ${selectedYear})</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@400;600;700;800&family=Fira+Code:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 4mm 6mm 3mm 6mm;
            }
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                height: 100% !important;
                overflow: hidden !important;
              }
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Mukta', sans-serif;
              font-size: 9px;
              line-height: 1.15;
              color: #0f172a;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .sheet-wrap {
              width: 100%;
              max-width: 100%;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .header-box {
              position: relative;
              text-align: center;
              padding-bottom: 2px;
              margin-bottom: 3px;
              border-bottom: 1.5px solid #0f172a;
            }
            .header-logo {
              position: absolute;
              left: 2px;
              top: 0;
              height: 38px;
              width: 38px;
              object-fit: contain;
            }
            .header-texts {
              padding: 0 42px;
            }
            .org-title {
              font-size: 13.5px;
              font-weight: 800;
              color: #dc2626;
              line-height: 1.15;
              margin: 0;
            }
            .sub-title-1 {
              font-size: 10.5px;
              font-weight: 700;
              color: #1e293b;
              line-height: 1.15;
              margin: 1px 0 0 0;
            }
            .sub-title-2 {
              font-size: 9.5px;
              font-weight: 600;
              color: #475569;
              line-height: 1.15;
              margin: 0;
            }
            .doc-title {
              margin-top: 2px;
              font-size: 11px;
              font-weight: 800;
              color: #0f172a;
              text-decoration: underline;
              line-height: 1.15;
            }
            .meta-strip {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 9.5px;
              font-weight: 700;
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 3px;
              padding: 2px 6px;
              margin-bottom: 3px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            th, td {
              border: 1px solid #334155;
              padding: 1px 2px;
              text-align: center;
              font-size: 8.5px;
              line-height: 1.15;
              height: 16px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            th {
              background-color: #f1f5f9;
              font-weight: 700;
              font-size: 9px;
              padding: 1.5px 2px;
            }
            .bg-morning { background-color: #fef3c7 !important; }
            .bg-evening { background-color: #e0f2fe !important; }
            .out-of-range {
              background-color: #fee2e2 !important;
              color: #b91c1c !important;
              font-weight: bold;
            }
            .font-mono { font-family: 'Fira Code', monospace; }
            .summary-row td {
              background-color: #f8fafc;
              font-weight: bold;
              font-size: 8.5px;
              height: 17px;
            }
            .signatures-grid {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 6px;
              padding: 0 12px;
              font-size: 9px;
              font-weight: 700;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .sig-col {
              width: 180px;
              text-align: center;
            }
            .sig-line {
              border-top: 1px dashed #475569;
              margin-top: 14px;
              padding-top: 2px;
              color: #334155;
            }
          </style>
        </head>
        <body>
          <div class="sheet-wrap">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 400);
  };

  // Room Management Save
  const handleSaveRoomModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomFormData.name?.trim()) {
      setRoomFormError('कृपया स्टोर कोठा/कक्षको नाम प्रविष्ट गर्नुहोस्।');
      return;
    }
    const minT = Number(roomFormData.minTempC) || 15;
    const maxT = Number(roomFormData.maxTempC) || 25;
    const maxH = Number(roomFormData.maxHumidityPercent) || 65;

    if (minT >= maxT) {
      setRoomFormError('न्यूनतम तापक्रम अधिकतम तापक्रम भन्दा कम हुनुपर्छ।');
      return;
    }

    const roomToSave: StoreRoom = {
      id: editingRoom?.id || `room-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: roomFormData.name.trim(),
      roomCode: roomFormData.roomCode?.trim() || '',
      location: roomFormData.location?.trim() || '',
      minTempC: minT,
      maxTempC: maxT,
      maxHumidityPercent: maxH,
      isActive: roomFormData.isActive !== false,
      remarks: roomFormData.remarks?.trim() || '',
      _orgName: activeOrgName || generalSettings.orgNameNepali || ''
    };

    onSaveRoom(roomToSave);
    setIsRoomModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Menu / Sub-menu Navigation Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-200 shadow-2xs">
            <Warehouse size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800 font-nepali">
                तापक्रम रेकर्ड लग (Temperature Record Log)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                स्टोर तापक्रम लग
              </span>
            </div>
            <p className="text-xs text-slate-500 font-nepali mt-0.5">
              औषधि, खोप सामग्री तथा जिन्सी स्टोर कक्षको दैनिक तापक्रम तथा आद्रता अनुगमन प्रणाली
            </p>
          </div>
        </div>

        {/* Sub-menu Tabs */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner w-full md:w-auto">
          <button
            type="button"
            onClick={() => onNavigateToColdChain?.()}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 transition-all font-nepali"
          >
            <Thermometer size={15} className="text-blue-600" />
            कोल्ड चेन लग (Cold Chain)
          </button>
          <button
            type="button"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-white text-amber-700 shadow-sm transition-all font-nepali"
          >
            <Warehouse size={15} className="text-amber-600" />
            स्टोर तापक्रम लग (Store Log)
          </button>
        </div>
      </div>

      {/* Main View Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-6 no-print">
        {/* Controls Bar: Room Selector + Year/Month + Actions */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Room Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 font-nepali mr-1 flex items-center gap-1">
              <Warehouse size={14} /> स्टोर कक्ष:
            </span>
            {activeRooms.map(room => (
              <button
                key={room.id}
                onClick={() => setSelectedRoomId(room.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all font-nepali border ${
                  selectedRoomId === room.id
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {room.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setEditingRoom(null);
                setRoomFormData({
                  name: '',
                  roomCode: '',
                  location: '',
                  minTempC: 15,
                  maxTempC: 25,
                  maxHumidityPercent: 65,
                  isActive: true,
                  remarks: ''
                });
                setRoomFormError('');
                setIsRoomModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors font-nepali flex items-center gap-1"
              title="नयाँ स्टोर कक्ष थप्नुहोस्"
            >
              <Plus size={13} /> थप कोठा
            </button>
          </div>

          {/* Year & Month + Quick Record & Print */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end">
            <div className="w-28">
              <Select
                label=""
                options={[
                  { value: '2080', label: '२०८०' },
                  { value: '2081', label: '२०८१' },
                  { value: '2082', label: '२०८२' },
                  { value: '2083', label: '२०८३' },
                  { value: '2084', label: '२०८४' }
                ]}
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Select
                label=""
                options={NEPALI_MONTHS.map(m => ({ value: m.value, label: m.label }))}
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              />
            </div>
            <button
              onClick={() => handleOpenEntryModal(todayBs, undefined, selectedRoomId)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all font-nepali cursor-pointer"
            >
              <Plus size={15} /> आजको रेकर्ड दर्ता
            </button>
            <button
              onClick={handlePrintMonthlyLog}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all font-nepali cursor-pointer"
            >
              <Printer size={15} /> मासिक पाना प्रिन्ट
            </button>
          </div>
        </div>

        {/* Selected Room Info & Target Guide */}
        {currentRoom && (
          <div className="bg-gradient-to-r from-amber-50/60 via-orange-50/40 to-slate-50 p-4 rounded-xl border border-amber-200/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-800 font-nepali">
                  {currentRoom.name}
                </h2>
                {currentRoom.roomCode && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white text-slate-600 border border-slate-200">
                    {currentRoom.roomCode}
                  </span>
                )}
                {currentRoom.location && (
                  <span className="text-xs text-slate-500 font-nepali">
                    ({currentRoom.location})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 font-nepali">
                {currentRoom.remarks || 'औषधि, सर्जिकल सामग्री तथा भण्डारण कक्ष'}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-amber-200 text-xs font-bold text-amber-800 font-nepali shadow-2xs">
                <Thermometer size={14} className="text-amber-600" />
                मानक तापक्रम: {toNepaliDigits(minTemp)}°C देखि {toNepaliDigits(maxTemp)}°C सम्म
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-blue-200 text-xs font-bold text-blue-800 font-nepali shadow-2xs">
                <Droplets size={14} className="text-blue-600" />
                अधिकतम आद्रता: {toNepaliDigits(maxHumidity)}% RH
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingRoom(currentRoom);
                  setRoomFormData({
                    name: currentRoom.name,
                    roomCode: currentRoom.roomCode || '',
                    location: currentRoom.location || '',
                    minTempC: currentRoom.minTempC,
                    maxTempC: currentRoom.maxTempC,
                    maxHumidityPercent: currentRoom.maxHumidityPercent || 65,
                    isActive: currentRoom.isActive !== false,
                    remarks: currentRoom.remarks || ''
                  });
                  setRoomFormError('');
                  setIsRoomModalOpen(true);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white transition-colors"
                title="कोठा सम्पादन गर्नुहोस्"
              >
                <Edit2 size={14} />
              </button>
            </div>
          </div>
        )}

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Today Morning */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-nepali font-bold">
              <span>आज बिहानको तापक्रम (Morning)</span>
              <Clock size={14} className="text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              {todayLogs.morning ? (
                <div>
                  <span className={`text-2xl font-black ${todayLogs.morning.isOutOfRange ? 'text-red-600' : 'text-slate-800'}`}>
                    {todayLogs.morning.tempCelsius}°C
                  </span>
                  {todayLogs.morning.humidityPercent !== undefined && (
                    <span className="ml-2 text-xs font-bold text-blue-600">
                      | {todayLogs.morning.humidityPercent}% RH
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm font-bold text-slate-400 font-nepali italic">
                  दर्ता हुन बाँकी
                </span>
              )}
              <button
                onClick={() => handleOpenEntryModal(todayBs, 'Morning', selectedRoomId)}
                className="text-xs font-bold text-amber-700 hover:underline font-nepali"
              >
                {todayLogs.morning ? 'सम्पादन' : '+ प्रविष्टि'}
              </button>
            </div>
          </div>

          {/* Card 2: Today Evening */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-nepali font-bold">
              <span>आज अपराह्नको तापक्रम (Evening)</span>
              <Clock size={14} className="text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              {todayLogs.evening ? (
                <div>
                  <span className={`text-2xl font-black ${todayLogs.evening.isOutOfRange ? 'text-red-600' : 'text-slate-800'}`}>
                    {todayLogs.evening.tempCelsius}°C
                  </span>
                  {todayLogs.evening.humidityPercent !== undefined && (
                    <span className="ml-2 text-xs font-bold text-blue-600">
                      | {todayLogs.evening.humidityPercent}% RH
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm font-bold text-slate-400 font-nepali italic">
                  दर्ता हुन बाँकी
                </span>
              )}
              <button
                onClick={() => handleOpenEntryModal(todayBs, 'Evening', selectedRoomId)}
                className="text-xs font-bold text-blue-700 hover:underline font-nepali"
              >
                {todayLogs.evening ? 'सम्पादन' : '+ प्रविष्टि'}
              </button>
            </div>
          </div>

          {/* Card 3: Monthly Average */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-nepali font-bold">
              <span>मासिक औसत (Avg Temp / Humid)</span>
              <Thermometer size={14} className="text-emerald-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-800">
                {monthlyStats.avgTemp > 0 ? `${monthlyStats.avgTemp}°C` : '-'}
              </span>
              {monthlyStats.avgHumid > 0 && (
                <span className="ml-2 text-xs font-bold text-blue-600">
                  | {monthlyStats.avgHumid}% RH
                </span>
              )}
              <p className="text-[11px] text-slate-500 font-nepali mt-1">
                न्यूनतम: {monthlyStats.minTempRecorded}°C | अधिकतम: {monthlyStats.maxTempRecorded}°C
              </p>
            </div>
          </div>

          {/* Card 4: Out of Range */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-nepali font-bold">
              <span>दायरा बाहिर (Out of Range)</span>
              <AlertTriangle size={14} className="text-red-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-black ${monthlyStats.outOfRangeCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {toNepaliDigits(monthlyStats.outOfRangeCount)} पटक
              </span>
              <span className="text-[11px] text-slate-500 font-nepali">
                {monthlyStats.outOfRangeCount === 0 ? 'पूर्ण सुरक्षित' : 'सुधार कार्य आवश्यक'}
              </span>
            </div>
          </div>
        </div>

        {/* Monthly Interactive Calendar (1 to 32 days) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 font-nepali flex items-center gap-2">
              <Calendar size={16} className="text-amber-600" />
              {NEPALI_MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear} को दैनिक तापक्रम तथा आद्रता पात्रो (Daily Calendar)
            </h3>
            <span className="text-xs text-slate-500 font-nepali">
              कुनै पनि गतेको कोठामा क्लिक गरी तत्काल रेकर्ड दर्ता वा सम्पादन गर्न सक्नुहुन्छ
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
            {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map(day => {
              const dayStr = String(day).padStart(2, '0');
              const fullDateBs = `${selectedYear}-${selectedMonth}-${dayStr}`;
              const dayData = monthlyDayMap.get(day);
              const isToday = fullDateBs === todayBs;

              const morning = dayData?.morning;
              const evening = dayData?.evening;

              const hasWarning = (morning?.isOutOfRange) || (evening?.isOutOfRange);

              return (
                <div
                  key={day}
                  onClick={() => handleOpenEntryModal(fullDateBs, undefined, selectedRoomId)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[96px] ${
                    isToday
                      ? 'border-amber-500 bg-amber-50/50 shadow-xs ring-2 ring-amber-200'
                      : hasWarning
                      ? 'border-red-200 bg-red-50/40 hover:bg-red-50'
                      : (morning || evening)
                      ? 'border-slate-200 bg-white hover:border-amber-300 hover:shadow-xs'
                      : 'border-slate-100 bg-slate-50/60 hover:bg-white text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black font-mono ${isToday ? 'text-amber-700 underline' : 'text-slate-700'}`}>
                      {toNepaliDigits(day)} गते
                    </span>
                    {hasWarning && (
                      <AlertTriangle size={12} className="text-red-600" />
                    )}
                    {isToday && (
                      <span className="text-[9px] bg-amber-600 text-white px-1 rounded font-nepali font-bold">
                        आज
                      </span>
                    )}
                  </div>

                  <div className="my-1.5 space-y-1">
                    {/* Morning */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[10px] text-slate-500 font-nepali">बि:</span>
                      {morning ? (
                        <span className={`font-mono font-bold ${morning.isOutOfRange ? 'text-red-600' : 'text-slate-800'}`}>
                          {morning.tempCelsius}°C
                          {morning.humidityPercent !== undefined && (
                            <span className="text-[9.5px] text-blue-600 ml-0.5 font-normal">/{morning.humidityPercent}%</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </div>

                    {/* Evening */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[10px] text-slate-500 font-nepali">अप:</span>
                      {evening ? (
                        <span className={`font-mono font-bold ${evening.isOutOfRange ? 'text-red-600' : 'text-slate-800'}`}>
                          {evening.tempCelsius}°C
                          {evening.humidityPercent !== undefined && (
                            <span className="text-[9.5px] text-blue-600 ml-0.5 font-normal">/{evening.humidityPercent}%</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </div>
                  </div>

                  <div className="text-[9px] text-slate-400 font-nepali truncate">
                    {morning?.recordedBy || evening?.recordedBy ? (morning?.recordedBy || evening?.recordedBy) : '+ प्रविष्टि'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Monthly Table View with Edit/Delete */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 font-nepali">
              मासिक लग विवरण (Detailed Log Records) - {NEPALI_MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
            </h3>
            <span className="text-xs text-slate-500 font-nepali">
              कुल {monthlyLogs.length} वटा रेकर्ड दर्ता छन्
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-nepali font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">मिति (BS)</th>
                  <th className="p-3">समय (Session)</th>
                  <th className="p-3">तापक्रम (°C)</th>
                  <th className="p-3">आद्रता (% RH)</th>
                  <th className="p-3">अवस्था</th>
                  <th className="p-3">दर्ता गर्ने कर्मचारी</th>
                  <th className="p-3">कैफियत / सुधार कार्य</th>
                  <th className="p-3 text-right">कार्य</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-nepali">
                {monthlyLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400 italic font-nepali">
                      यस महिनामा कुनै तापक्रम रेकर्ड दर्ता गरिएको छैन।
                    </td>
                  </tr>
                ) : (
                  monthlyLogs
                    .sort((a, b) => b.dateBs.localeCompare(a.dateBs) || a.session.localeCompare(b.session))
                    .map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-800">
                          {log.dateBs}
                        </td>
                        <td className="p-3 font-bold">
                          {log.session === 'Morning' ? 'बिहान (Morning)' : 'अपराह्न (Evening)'}
                        </td>
                        <td className="p-3 font-mono font-black text-sm">
                          <span className={log.isOutOfRange ? 'text-red-600' : 'text-slate-800'}>
                            {log.tempCelsius}°C
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-700">
                          {log.humidityPercent !== undefined ? `${log.humidityPercent}%` : '-'}
                        </td>
                        <td className="p-3">
                          {log.isOutOfRange ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 inline-flex items-center gap-1">
                              <AlertTriangle size={11} /> आउट-अफ-रेन्ज
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 size={11} /> सामान्य
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-medium text-slate-600">
                          {log.recordedBy}
                        </td>
                        <td className="p-3 text-slate-500 max-w-xs truncate" title={log.correctiveAction || log.remarks}>
                          {log.correctiveAction ? `सुधार: ${log.correctiveAction}` : (log.remarks || '-')}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingLogId(log.id);
                                setFormRoomId(log.roomId);
                                setFormDateBs(log.dateBs);
                                setFormSession(log.session);
                                setFormTemp(String(log.tempCelsius));
                                setFormHumidity(log.humidityPercent !== undefined ? String(log.humidityPercent) : '55');
                                setFormRemarks(log.remarks || '');
                                setFormCorrectiveAction(log.correctiveAction || '');
                                setIsEntryModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                              title="सम्पादन गर्नुहोस्"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`के तपाईं मिति ${log.dateBs} (${log.session}) को रेकर्ड मेटाउन निश्चित हुनुहुन्छ?`)) {
                                  onDeleteLog(log.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="मेटाउनुहोस्"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PRINTABLE REPORT SHEET: Full 1 to 32 days Store Room Temperature & Humidity Sheet (Guaranteed 1-Page Fit) */}
      <div id="store-temperature-print" className="hidden">
        <div id="store-temperature-print-content">
          {/* Header */}
          <div className="header-box">
            <img 
              src={generalSettings.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png"} 
              alt="Nepal Emblem" 
              className="header-logo" 
            />
            <div className="header-texts">
              <h1 className="org-title">{generalSettings.orgNameNepali || 'स्वास्थ्य संस्था'}</h1>
              {generalSettings.subTitleNepali && <h2 className="sub-title-1">{generalSettings.subTitleNepali}</h2>}
              {generalSettings.subTitleNepali2 && <h3 className="sub-title-2">{generalSettings.subTitleNepali2}</h3>}
              <div className="doc-title">
                औषधि तथा सामग्री भण्डारण कक्ष दैनिक तापक्रम तथा आद्रता लग पाना
              </div>
            </div>
          </div>

          {/* Meta Info Strip */}
          <div className="meta-strip">
            <span><b>कक्ष:</b> {currentRoom?.name || 'मुख्य औषधि स्टोर'} {currentRoom?.roomCode ? `(${currentRoom.roomCode})` : ''}</span>
            <span><b>मानक दायरा:</b> {toNepaliDigits(minTemp)}°C देखि {toNepaliDigits(maxTemp)}°C | <b>आद्रता:</b> &lt; {toNepaliDigits(maxHumidity)}% RH</span>
            <span><b>अवधि:</b> {NEPALI_MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear} ({toNepaliDigits(daysInSelectedMonth)} दिन)</span>
          </div>

          {/* 1-32 Days Table */}
          <table>
            <thead>
              <tr>
                <th rowSpan={2} style={{ width: '32px' }}>गते</th>
                <th colSpan={3} className="bg-morning">बिहानको समय (०९:०० - १०:००)</th>
                <th colSpan={3} className="bg-evening">अपराह्नको समय (०४:०० - ०५:००)</th>
                <th rowSpan={2} style={{ width: '44px' }}>अवस्था</th>
                <th rowSpan={2}>कैफियत / सुधारात्मक कदम (Remarks / Action)</th>
              </tr>
              <tr>
                <th style={{ width: '54px' }}>तापक्रम (°C)</th>
                <th style={{ width: '50px' }}>आद्रता (% RH)</th>
                <th style={{ width: '68px' }}>रेकर्डकर्ता</th>
                <th style={{ width: '54px' }}>तापक्रम (°C)</th>
                <th style={{ width: '50px' }}>आद्रता (% RH)</th>
                <th style={{ width: '68px' }}>रेकर्डकर्ता</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map(day => {
                const dayData = monthlyDayMap.get(day);
                const m = dayData?.morning;
                const e = dayData?.evening;

                const mOutOfRange = m?.isOutOfRange;
                const eOutOfRange = e?.isOutOfRange;
                const isBreach = mOutOfRange || eOutOfRange;

                const remarksList = [m?.correctiveAction || m?.remarks, e?.correctiveAction || e?.remarks].filter(Boolean);

                return (
                  <tr key={day}>
                    <td className="font-mono"><b>{toNepaliDigits(day)}</b></td>
                    
                    {/* Morning */}
                    <td className={`font-mono ${mOutOfRange ? 'out-of-range' : ''}`}>
                      {m ? `${m.tempCelsius}°C` : ''}
                    </td>
                    <td className="font-mono">
                      {m?.humidityPercent !== undefined ? `${m.humidityPercent}%` : ''}
                    </td>
                    <td>
                      {m?.recordedBy || ''}
                    </td>

                    {/* Evening */}
                    <td className={`font-mono ${eOutOfRange ? 'out-of-range' : ''}`}>
                      {e ? `${e.tempCelsius}°C` : ''}
                    </td>
                    <td className="font-mono">
                      {e?.humidityPercent !== undefined ? `${e.humidityPercent}%` : ''}
                    </td>
                    <td>
                      {e?.recordedBy || ''}
                    </td>

                    {/* Status */}
                    <td className={isBreach ? 'out-of-range' : ''}>
                      {isBreach ? 'विचलन' : (m || e ? 'सामान्य' : '-')}
                    </td>

                    {/* Remarks */}
                    <td style={{ textAlign: 'left', paddingLeft: '4px' }}>
                      {remarksList.join('; ')}
                    </td>
                  </tr>
                );
              })}

              {/* Monthly Summary Row */}
              <tr className="summary-row">
                <td><b>औसत</b></td>
                <td className="font-mono">
                  {monthlyLogs.filter(l => l.session === 'Morning').length > 0 ? (
                    `${(monthlyLogs.filter(l => l.session === 'Morning').reduce((acc, l) => acc + l.tempCelsius, 0) / monthlyLogs.filter(l => l.session === 'Morning').length).toFixed(1)}°C`
                  ) : '-'}
                </td>
                <td className="font-mono">
                  {monthlyLogs.filter(l => l.session === 'Morning' && l.humidityPercent !== undefined).length > 0 ? (
                    `${Math.round(monthlyLogs.filter(l => l.session === 'Morning' && l.humidityPercent !== undefined).reduce((acc, l) => acc + (l.humidityPercent || 0), 0) / monthlyLogs.filter(l => l.session === 'Morning' && l.humidityPercent !== undefined).length)}%`
                  ) : '-'}
                </td>
                <td>-</td>
                <td className="font-mono">
                  {monthlyLogs.filter(l => l.session === 'Evening').length > 0 ? (
                    `${(monthlyLogs.filter(l => l.session === 'Evening').reduce((acc, l) => acc + l.tempCelsius, 0) / monthlyLogs.filter(l => l.session === 'Evening').length).toFixed(1)}°C`
                  ) : '-'}
                </td>
                <td className="font-mono">
                  {monthlyLogs.filter(l => l.session === 'Evening' && l.humidityPercent !== undefined).length > 0 ? (
                    `${Math.round(monthlyLogs.filter(l => l.session === 'Evening' && l.humidityPercent !== undefined).reduce((acc, l) => acc + (l.humidityPercent || 0), 0) / monthlyLogs.filter(l => l.session === 'Evening' && l.humidityPercent !== undefined).length)}%`
                  ) : '-'}
                </td>
                <td>-</td>
                <td className={monthlyStats.outOfRangeCount > 0 ? 'out-of-range' : ''}>
                  {monthlyStats.outOfRangeCount > 0 ? `${toNepaliDigits(monthlyStats.outOfRangeCount)} विचलन` : 'सुरक्षित'}
                </td>
                <td style={{ textAlign: 'left', paddingLeft: '4px' }}>
                  {monthlyStats.outOfRangeCount > 0 ? 'विचलन रेकर्ड भएकोमा सुधारात्मक कदम चालिएको छ।' : 'सम्पूर्ण महिना तापक्रम तथा आद्रता सुरक्षित दायराभित्र रहेको।'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Signatures */}
          <div className="signatures-grid">
            <div className="sig-col">
              <p>तयार गर्ने (स्टोरकिपर / शाखा प्रमुख):</p>
              <div className="sig-line">
                <p>दस्तखत र मिति</p>
              </div>
            </div>
            <div className="sig-col">
              <p>प्रमाणीकरण गर्ने (स्वास्थ्य संस्था / कार्यालय प्रमुख):</p>
              <div className="sig-line">
                <p>हस्ताक्षर, नाम र कार्यालयको छाप</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ENTRY MODAL */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Warehouse size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base font-nepali">
                    {editingLogId ? 'स्टोर तापक्रम रेकर्ड सम्पादन' : 'स्टोर दैनिक तापक्रम तथा आद्रता प्रविष्टि'}
                  </h3>
                  <p className="text-xs text-slate-500 font-nepali">
                    {currentRoom?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEntryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEntry} className="space-y-4 font-nepali">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    स्टोर कोठा/कक्ष *
                  </label>
                  <select
                    value={formRoomId}
                    onChange={e => setFormRoomId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden"
                  >
                    {activeRooms.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    रेकर्ड गर्ने समय (Session) *
                  </label>
                  <select
                    value={formSession}
                    onChange={e => setFormSession(e.target.value as 'Morning' | 'Evening')}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden"
                  >
                    <option value="Morning">बिहानको समय (०९:०० - १०:००)</option>
                    <option value="Evening">अपराह्नको समय (०४:०० - ०५:००)</option>
                  </select>
                </div>
              </div>

              <div>
                <NepaliDatePicker
                  label="मिति (BS) *"
                  value={formDateBs}
                  onChange={val => setFormDateBs(val)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    तापक्रम (°C) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formTemp}
                      onChange={e => setFormTemp(e.target.value)}
                      placeholder="e.g. 21.5"
                      className={`w-full p-2.5 pr-10 border rounded-xl text-sm font-mono font-bold outline-hidden focus:ring-2 ${
                        parseFloat(formTemp) < minTemp || parseFloat(formTemp) > maxTemp
                          ? 'border-red-400 bg-red-50/50 text-red-700 focus:ring-red-400'
                          : 'border-slate-300 focus:ring-amber-500 text-slate-800'
                      }`}
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">°C</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    तोकिएको दायरा: {minTemp}°C देखि {maxTemp}°C सम्म
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    आद्रता (% RH)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={formHumidity}
                      onChange={e => setFormHumidity(e.target.value)}
                      placeholder="e.g. 55"
                      className={`w-full p-2.5 pr-10 border rounded-xl text-sm font-mono font-bold outline-hidden focus:ring-2 ${
                        parseFloat(formHumidity) > maxHumidity
                          ? 'border-amber-400 bg-amber-50/50 text-amber-800 focus:ring-amber-400'
                          : 'border-slate-300 focus:ring-blue-500 text-slate-800'
                      }`}
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    अधिकतम सिमा: &lt; {maxHumidity}% RH
                  </span>
                </div>
              </div>

              {/* Warning Banner if Temp or Humidity out of range */}
              {(() => {
                const t = parseFloat(formTemp);
                const h = parseFloat(formHumidity);
                const tOut = !isNaN(t) && (t < minTemp || t > maxTemp);
                const hOut = !isNaN(h) && h > maxHumidity;

                if (tOut || hOut) {
                  return (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle size={14} className="text-red-600" />
                        चेतावनी: तापक्रम वा आद्रता तोकिएको मानक दायरा भन्दा बाहिर छ!
                      </div>
                      <p className="text-[11px] text-red-600">
                        कृपया कोठाको AC/भेन्टिलेसन जाँच गर्नुहोस् र आवश्यक सुधार कार्य (Corrective Action) तल खुलाउनुहोस्।
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  कैफियत (Remarks)
                </label>
                <input
                  type="text"
                  value={formRemarks}
                  onChange={e => setFormRemarks(e.target.value)}
                  placeholder="e.g. कोठा सामान्य, भेन्टिलेसन चालु"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  सुधार कार्य (Corrective Action - यदि आवश्यक परेमा)
                </label>
                <input
                  type="text"
                  value={formCorrectiveAction}
                  onChange={e => setFormCorrectiveAction(e.target.value)}
                  placeholder="e.g. AC चालु गरियो, झ्याल खुला गरियो, तापमान नियन्त्रणमा"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  रद्द गर्नुहोस्
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm transition-all"
                >
                  {editingLogId ? 'रेकर्ड अद्यावधिक गर्नुहोस्' : 'रेकर्ड सुरक्षित गर्नुहोस्'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STORE ROOM MANAGEMENT MODAL */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Warehouse size={18} />
                </div>
                <h3 className="font-bold text-slate-800 text-base font-nepali">
                  {editingRoom ? 'स्टोर कोठा सम्पादन' : 'नयाँ स्टोर कोठा/कक्ष दर्ता'}
                </h3>
              </div>
              <button
                onClick={() => setIsRoomModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {roomFormError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
                {roomFormError}
              </div>
            )}

            <form onSubmit={handleSaveRoomModal} className="space-y-4 font-nepali">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  स्टोर कोठा/कक्षको नाम *
                </label>
                <input
                  type="text"
                  required
                  value={roomFormData.name || ''}
                  onChange={e => setRoomFormData({ ...roomFormData, name: e.target.value })}
                  placeholder="e.g. मुख्य औषधि स्टोर"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    कोठा कोड (Room Code)
                  </label>
                  <input
                    type="text"
                    value={roomFormData.roomCode || ''}
                    onChange={e => setRoomFormData({ ...roomFormData, roomCode: e.target.value })}
                    placeholder="e.g. STR-01"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    स्थान (Location)
                  </label>
                  <input
                    type="text"
                    value={roomFormData.location || ''}
                    onChange={e => setRoomFormData({ ...roomFormData, location: e.target.value })}
                    placeholder="e.g. पहिलो तल्ला"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    न्यूनतम तापक्रम (°C)
                  </label>
                  <input
                    type="number"
                    value={roomFormData.minTempC ?? 15}
                    onChange={e => setRoomFormData({ ...roomFormData, minTempC: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    अधिकतम तापक्रम (°C)
                  </label>
                  <input
                    type="number"
                    value={roomFormData.maxTempC ?? 25}
                    onChange={e => setRoomFormData({ ...roomFormData, maxTempC: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    अधिकतम आद्रता (%)
                  </label>
                  <input
                    type="number"
                    value={roomFormData.maxHumidityPercent ?? 65}
                    onChange={e => setRoomFormData({ ...roomFormData, maxHumidityPercent: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  कैफियत (Remarks)
                </label>
                <input
                  type="text"
                  value={roomFormData.remarks || ''}
                  onChange={e => setRoomFormData({ ...roomFormData, remarks: e.target.value })}
                  placeholder="e.g. औषधि तथा खोप सामग्री भण्डारण"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="room-is-active"
                  checked={roomFormData.isActive !== false}
                  onChange={e => setRoomFormData({ ...roomFormData, isActive: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="room-is-active" className="text-xs font-bold text-slate-700 cursor-pointer">
                  सक्रिय कोठा (Active Store Room)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  रद्द गर्नुहोस्
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm transition-all"
                >
                  सुरक्षित गर्नुहोस्
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
