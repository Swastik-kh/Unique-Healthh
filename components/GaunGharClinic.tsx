import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Building2, Plus, Search, Trash2, Save, FileText, User, Calendar, MapPin, 
  Phone, Briefcase, ClipboardList, Settings, X, CalendarClock, CheckCircle2, 
  Globe, Navigation, Layers, ExternalLink, Crosshair, AlertCircle, RefreshCw
} from 'lucide-react';
import L from 'leaflet';
import { Input } from './Input';
import { NepaliDatePicker } from './NepaliDatePicker';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { OrganizationSettings } from '../types/coreTypes';
import { GaunGharClinicRecord } from '../types/healthTypes';
import { safeEncodeKey } from '../firebase';
import { PatientLocationPickerModal } from './PatientLocationPickerModal';

interface GaunGharClinicProps {
  records: GaunGharClinicRecord[];
  onSaveRecord: (record: GaunGharClinicRecord) => void;
  onDeleteRecord: (id: string) => void;
  currentFiscalYear: string;
  currentUser: any;
  generalSettings: OrganizationSettings;
  onUpdateGeneralSettings?: (settings: OrganizationSettings) => void;
}

export const GaunGharClinic: React.FC<GaunGharClinicProps> = ({
  records = [],
  onSaveRecord,
  onDeleteRecord,
  currentFiscalYear,
  currentUser,
  generalSettings,
  onUpdateGeneralSettings,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSatelliteMap, setShowSatelliteMap] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pickingForRecord, setPickingForRecord] = useState<Partial<GaunGharClinicRecord> | null>(null);

  const [newCenter, setNewCenter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCenterFilter, setSelectedCenterFilter] = useState('all');
  const [tableDateBsFilter, setTableDateBsFilter] = useState('');
  const [isGettingGPS, setIsGettingGPS] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  // Satellite Map Specific State
  const [mapCenterFilter, setMapCenterFilter] = useState('all');
  const [mapFiscalYearFilter, setMapFiscalYearFilter] = useState(currentFiscalYear);
  const [mapDateBsFilter, setMapDateBsFilter] = useState('');
  const [mapSearchTerm, setMapSearchTerm] = useState('');
  const [mapType, setMapType] = useState<'hybrid' | 'satellite' | 'standard'>('hybrid');
  const [selectedMapRecordCard, setSelectedMapRecordCard] = useState<GaunGharClinicRecord | null>(null);

  // Refs for Satellite Map
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Centers & Operating Days from settings (Defaults to ['मुख्य गाउँघर क्लिनिक'])
  const centers = useMemo(() => {
    return generalSettings.gaunGharClinicCenters || ['मुख्य गाउँघर क्लिनिक'];
  }, [generalSettings.gaunGharClinicCenters]);

  const centerDaysMap = useMemo(() => {
    return generalSettings.gaunGharClinicCenterDays || {};
  }, [generalSettings.gaunGharClinicCenterDays]);

  const [formData, setFormData] = useState<Partial<GaunGharClinicRecord>>({
    dateBs: new NepaliDate().format('YYYY-MM-DD'),
    clinicCenter: centers[0] || 'मुख्य गाउँघर क्लिनिक',
    patientName: '',
    age: '',
    gender: 'Male',
    address: '',
    phone: '',
    serviceType: '',
    treatmentGiven: '',
    remarks: '',
    latitude: undefined,
    longitude: undefined,
  });

  const filteredRecords = useMemo(() => {
    return records
      .filter(r => r.fiscalYear === currentFiscalYear)
      .filter(r => selectedCenterFilter === 'all' || (r.clinicCenter || centers[0]) === selectedCenterFilter)
      .filter(r => {
        if (!tableDateBsFilter || !tableDateBsFilter.trim()) return true;
        const normFilter = tableDateBsFilter.trim().replace(/\//g, '-');
        const normDate = (r.dateBs || '').replace(/\//g, '-');
        return normDate === normFilter;
      })
      .filter(r => 
        r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.phone.includes(searchTerm) ||
        r.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.serviceType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.clinicCenter || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const dateCompare = b.dateBs.localeCompare(a.dateBs);
        if (dateCompare !== 0) return dateCompare;
        return b.id.localeCompare(a.id);
      });
  }, [records, currentFiscalYear, selectedCenterFilter, tableDateBsFilter, searchTerm, centers]);

  // Satellite Map Filtered Records
  const mapFilteredRecords = useMemo(() => {
    return records.filter(r => {
      // Fiscal year filter
      if (mapFiscalYearFilter !== 'all' && r.fiscalYear !== mapFiscalYearFilter) {
        return false;
      }
      // Center filter
      if (mapCenterFilter !== 'all' && (r.clinicCenter || centers[0]) !== mapCenterFilter) {
        return false;
      }
      // Date BS filter
      if (mapDateBsFilter && mapDateBsFilter.trim()) {
        const normFilter = mapDateBsFilter.trim().replace(/\//g, '-');
        const normDate = (r.dateBs || '').replace(/\//g, '-');
        if (normDate !== normFilter) return false;
      }
      // Search term
      if (mapSearchTerm.trim()) {
        const q = mapSearchTerm.toLowerCase().trim();
        const matchName = r.patientName.toLowerCase().includes(q);
        const matchPhone = r.phone.includes(q);
        const matchAddress = r.address.toLowerCase().includes(q);
        const matchCenter = (r.clinicCenter || '').toLowerCase().includes(q);
        const matchService = (r.serviceType || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchAddress && !matchCenter && !matchService) {
          return false;
        }
      }
      return true;
    });
  }, [records, mapFiscalYearFilter, mapCenterFilter, mapDateBsFilter, mapSearchTerm, centers]);

  const mappedMapRecords = useMemo(() => {
    return mapFilteredRecords.filter(r => typeof r.latitude === 'number' && typeof r.longitude === 'number' && !isNaN(r.latitude) && !isNaN(r.longitude));
  }, [mapFilteredRecords]);

  const unmappedMapRecords = useMemo(() => {
    return mapFilteredRecords.filter(r => typeof r.latitude !== 'number' || typeof r.longitude !== 'number' || isNaN(r.latitude) || isNaN(r.longitude));
  }, [mapFilteredRecords]);

  // Auto-inherit GPS from existing center record OR auto-fetch GPS if first case
  const autoInheritOrFetchGPS = (centerName: string) => {
    const existingMapped = records.find(r => 
      (r.clinicCenter || centers[0]) === centerName && 
      typeof r.latitude === 'number' && 
      typeof r.longitude === 'number' &&
      !isNaN(r.latitude) && 
      !isNaN(r.longitude)
    );

    if (existingMapped) {
      setFormData(prev => ({
        ...prev,
        latitude: existingMapped.latitude,
        longitude: existingMapped.longitude,
      }));
      setGpsMessage(`सम्बन्धित केन्द्र "${centerName}" को साविकको GPS अक्षांश र देशान्तर स्वतः राखिएको छ।`);
    } else {
      // First case for this center - attempt GPS auto fetch
      fetchDeviceGPS();
    }
  };

  // Fetch device GPS coordinates using browser API
  const fetchDeviceGPS = () => {
    if (!navigator.geolocation) {
      setGpsMessage("तपाईंको ब्राउजरमा GPS सपोर्ट छैन। कृपया नक्साबाट छान्नुहोस्।");
      return;
    }

    setIsGettingGPS(true);
    setGpsMessage("GPS लोकेसन खोजिँदैछ, कृपया पर्खनुहोस्...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        setIsGettingGPS(false);
        setGpsMessage(`GPS लोकेसन प्राप्त भयो: (Lat: ${lat}, Lng: ${lng})`);
      },
      (err) => {
        setIsGettingGPS(false);
        setGpsMessage("GPS लोकेसन प्राप्त हुन सकेन। कृपया 'नक्साबाट रोज्नुहोस्' बटन प्रयोग गर्नुहोस्।");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Handle Center change in form
  const handleCenterChange = (newCenterVal: string) => {
    setFormData(prev => ({
      ...prev,
      clinicCenter: newCenterVal,
    }));
    autoInheritOrFetchGPS(newCenterVal);
  };

  // Handle Adding New GaunGhar Clinic Center
  const handleAddCenter = () => {
    if (!newCenter.trim()) return;
    const trimmed = newCenter.trim();
    if (centers.includes(trimmed)) {
      alert("यो गाउँघर क्लिनिक केन्द्र पहिले नै दर्ता छ।");
      return;
    }
    const updatedCenters = [...centers, trimmed];
    if (onUpdateGeneralSettings) {
      onUpdateGeneralSettings({
        ...generalSettings,
        gaunGharClinicCenters: updatedCenters,
      });
    }
    setNewCenter('');
  };

  // Handle Removing GaunGhar Clinic Center
  const handleRemoveCenter = (centerName: string) => {
    if (centers.length <= 1) {
      alert("कम्तिमा एउटा गाउँघर क्लिनिक केन्द्र हुनुपर्छ।");
      return;
    }

    const hasAssignedRecords = records.some(r => (r.clinicCenter || centers[0]) === centerName);
    if (hasAssignedRecords) {
      alert(`"${centerName}" गाउँघर क्लिनिक केन्द्रमा सेवाग्राहीको रेकर्ड दर्ता भएकाले यो केन्द्र मेटाउन मिल्दैन।`);
      return;
    }

    const updatedCenters = centers.filter(c => c !== centerName);
    if (onUpdateGeneralSettings) {
      onUpdateGeneralSettings({
        ...generalSettings,
        gaunGharClinicCenters: updatedCenters,
      });
    }
  };

  // Handle Operating Days Selection for a Center
  const handleToggleCenterDay = (centerName: string, day: number) => {
    if (!onUpdateGeneralSettings) return;
    const encodedKey = safeEncodeKey(centerName);
    const currentDays: number[] = centerDaysMap[encodedKey] || [];
    
    let updatedDays = [...currentDays];
    if (updatedDays.includes(day)) {
      updatedDays = updatedDays.filter(d => d !== day);
    } else {
      updatedDays.push(day);
      updatedDays.sort((a, b) => a - b);
    }

    const updatedMap = {
      ...centerDaysMap,
      [encodedKey]: updatedDays,
    };

    onUpdateGeneralSettings({
      ...generalSettings,
      gaunGharClinicCenterDays: updatedMap,
    });
  };

  // Select all 1-32 days for a center
  const handleSelectAllDays = (centerName: string) => {
    if (!onUpdateGeneralSettings) return;
    const encodedKey = safeEncodeKey(centerName);
    const allDays = Array.from({ length: 32 }, (_, i) => i + 1);

    onUpdateGeneralSettings({
      ...generalSettings,
      gaunGharClinicCenterDays: {
        ...centerDaysMap,
        [encodedKey]: allDays,
      },
    });
  };

  // Clear all days for a center
  const handleClearAllDays = (centerName: string) => {
    if (!onUpdateGeneralSettings) return;
    const encodedKey = safeEncodeKey(centerName);

    onUpdateGeneralSettings({
      ...generalSettings,
      gaunGharClinicCenterDays: {
        ...centerDaysMap,
        [encodedKey]: [],
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName || !formData.dateBs) {
      alert("कृपया आवश्यक विवरणहरू भर्नुहोस्।");
      return;
    }

    const record: GaunGharClinicRecord = {
      id: formData.id || `GGC-${Date.now()}`,
      fiscalYear: currentFiscalYear,
      dateBs: formData.dateBs!,
      clinicCenter: formData.clinicCenter || centers[0] || 'मुख्य गाउँघर क्लिनिक',
      patientName: formData.patientName!,
      age: formData.age || '',
      gender: (formData.gender as any) || 'Male',
      address: formData.address || '',
      phone: formData.phone || '',
      serviceType: formData.serviceType || '',
      treatmentGiven: formData.treatmentGiven || '',
      remarks: formData.remarks || '',
      latitude: formData.latitude,
      longitude: formData.longitude,
      createdBy: currentUser?.username || 'user',
    };

    onSaveRecord(record);
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    const defaultCenter = centers[0] || 'मुख्य गाउँघर क्लिनिक';
    setFormData({
      dateBs: new NepaliDate().format('YYYY-MM-DD'),
      clinicCenter: defaultCenter,
      patientName: '',
      age: '',
      gender: 'Male',
      address: '',
      phone: '',
      serviceType: '',
      treatmentGiven: '',
      remarks: '',
      latitude: undefined,
      longitude: undefined,
    });
    setGpsMessage(null);
    autoInheritOrFetchGPS(defaultCenter);
  };

  const handleEdit = (record: GaunGharClinicRecord) => {
    setFormData({
      ...record,
      clinicCenter: record.clinicCenter || centers[0] || 'मुख्य गाउँघर क्लिनिक',
    });
    setGpsMessage(null);
    setShowForm(true);
  };

  // Check if selected date's day number matches center's schedule
  const selectedDayNumber = useMemo(() => {
    if (!formData.dateBs) return null;
    const parts = formData.dateBs.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      return isNaN(day) ? null : day;
    }
    return null;
  }, [formData.dateBs]);

  const currentCenterScheduledDays = useMemo(() => {
    const center = formData.clinicCenter || centers[0];
    if (!center) return [];
    const encodedKey = safeEncodeKey(center);
    return centerDaysMap[encodedKey] || [];
  }, [formData.clinicCenter, centers, centerDaysMap]);

  const isSelectedDateOnSchedule = useMemo(() => {
    if (currentCenterScheduledDays.length === 0) return true; // No restriction
    if (selectedDayNumber === null) return true;
    return currentCenterScheduledDays.includes(selectedDayNumber);
  }, [currentCenterScheduledDays, selectedDayNumber]);

  // Leaflet Satellite Map Effect Initialization
  useEffect(() => {
    if (!showSatelliteMap || !mapContainerRef.current) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerGroupRef.current = null;
      }
      return;
    }

    // Default center: First mapped location or Nepal Center (Lat: 28.2096, Lng: 83.9856)
    let initLat = 28.2096;
    let initLng = 83.9856;
    let initZoom = 7;

    if (mappedMapRecords.length > 0) {
      initLat = mappedMapRecords[0].latitude!;
      initLng = mappedMapRecords[0].longitude!;
      initZoom = 13;
    }

    // If map already exists, remove it first to ensure clean attachment to current DOM element
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markersLayerGroupRef.current = null;
    }

    // Ensure DOM container is clean before creating new map
    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    const map = L.map(mapContainerRef.current, {
      center: [initLat, initLng],
      zoom: initZoom,
      zoomControl: true,
    });

    mapInstanceRef.current = map;
    markersLayerGroupRef.current = L.layerGroup().addTo(map);

    // Add Tile Layer based on mapType
    if (mapType === 'standard') {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
    } else if (mapType === 'satellite') {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri World Imagery'
      }).addTo(map);
    } else {
      // Hybrid Map (Satellite + Reference Labels)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri World Imagery'
      }).addTo(map);

      L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Labels &copy; Esri'
      }).addTo(map);
    }

    // Render Markers
    if (markersLayerGroupRef.current) {
      markersLayerGroupRef.current.clearLayers();

      mappedMapRecords.forEach((rec) => {
        const centerName = rec.clinicCenter || centers[0] || 'मुख्य गाउँघर क्लिनिक';
        
        const customPinIcon = L.divIcon({
          className: 'custom-gaunghar-labeled-pin',
          html: `
            <div style="position: relative; display: flex; align-items: center; cursor: pointer; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.6)); font-family: system-ui, -apple-system, sans-serif;">
              <!-- Pin Circle Icon -->
              <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex-shrink: 0; z-index: 2;">
                <div style="position: absolute; width: 36px; height: 36px; background-color: #0284c7; opacity: 0.4; border-radius: 50%; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #0284c7, #1d4ed8); border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; color: white;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
              </div>
              
              <!-- Google Maps Style Location Label Card -->
              <div style="margin-left: 6px; background: rgba(15, 23, 42, 0.94); backdrop-filter: blur(8px); color: #ffffff; border: 1.5px solid rgba(56, 189, 248, 0.8); padding: 5px 11px; border-radius: 12px; display: flex; flex-direction: column; justify-content: center; min-width: 150px; max-width: 260px; box-shadow: 0 6px 18px rgba(0,0,0,0.6); pointer-events: auto;">
                <div style="font-size: 12px; font-weight: 800; color: #38bdf8; display: flex; align-items: center; gap: 4px; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  <span>🏥 ${centerName}</span>
                </div>
                <div style="font-size: 11px; font-weight: 700; color: #f8fafc; line-height: 1.2; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  👤 ${rec.patientName} ${rec.address ? `(${rec.address})` : ''}
                </div>
                <div style="font-size: 10px; color: #94a3b8; font-weight: 600; margin-top: 1px;">
                  📅 ${rec.dateBs} | 📍 ${rec.latitude?.toFixed(4)}, ${rec.longitude?.toFixed(4)}
                </div>
              </div>
            </div>
          `,
          iconSize: [280, 48],
          iconAnchor: [18, 24],
        });

        const marker = L.marker([rec.latitude!, rec.longitude!], { icon: customPinIcon });
        
        const popupContent = `
          <div style="font-family: sans-serif; padding: 4px; min-width: 230px;">
            <div style="background-color: #eff6ff; border-radius: 8px; padding: 8px; border: 1px solid #bfdbfe; margin-bottom: 8px;">
              <div style="font-size: 11px; font-weight: bold; color: #1e40af; text-transform: uppercase;">🏥 गाउँघर क्लिनिक केन्द्र:</div>
              <div style="font-size: 14px; font-weight: 800; color: #1e3a8a;">${centerName}</div>
              <div style="font-size: 11px; color: #475569; margin-top: 2px;">मिति: <b>${rec.dateBs}</b> (आ.व. ${rec.fiscalYear})</div>
            </div>

            <div style="font-size: 13px; font-weight: bold; color: #0f172a;">👤 बिरामी: ${rec.patientName}</div>
            <div style="font-size: 11px; color: #334155; margin-top: 2px;">उमेर/लिंग: ${rec.age ? rec.age + ' वर्ष - ' : ''}${rec.gender === 'Male' ? 'पुरुष' : rec.gender === 'Female' ? 'महिला' : 'अन्य'}</div>
            <div style="font-size: 11px; color: #334155;">ठेगाना: ${rec.address || '-'} | फोन: ${rec.phone || '-'}</div>
            
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #1e293b;">
              <div><b>सेवा/उपचार:</b> ${rec.serviceType || '-'} - ${rec.treatmentGiven || '-'}</div>
            </div>

            <div style="margin-top: 8px; font-size: 10px; font-family: monospace; color: #64748b;">
              📍 Lat: ${rec.latitude?.toFixed(6)}, Lng: ${rec.longitude?.toFixed(6)}
            </div>

            <div style="margin-top: 8px;">
              <a href="https://www.google.com/maps?q=${rec.latitude},${rec.longitude}" target="_blank" rel="noreferrer" style="display: block; text-align: center; background-color: #2563eb; color: white; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; text-decoration: none;">
                🗺️ Google Maps मा हेर्नुहोस्
              </a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('click', () => {
          setSelectedMapRecordCard(rec);
        });

        markersLayerGroupRef.current?.addLayer(marker);
      });

      // Fit bounds if mapped markers exist
      if (mappedMapRecords.length > 0) {
        const bounds = L.latLngBounds(mappedMapRecords.map(r => [r.latitude!, r.longitude!]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      }
    }

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerGroupRef.current = null;
      }
    };
  }, [showSatelliteMap, mapType, mappedMapRecords, centers]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 font-nepali">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b pb-4 gap-4">
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 p-2.5 rounded-2xl text-blue-600 shrink-0">
            <Building2 size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">गाउँ घर क्लिनिक (Gaun Ghar Clinic)</h2>
            <p className="text-sm text-slate-500">गाउँ घर क्लिनिक केन्द्र, GPS लोकेसन नक्साङ्कन र सञ्चालन मिति व्यवस्थापन</p>
            
            {/* Center Operating Schedule Summary Badges */}
            <div className="flex flex-wrap gap-2 mt-2">
              {centers.map(center => {
                const encodedKey = safeEncodeKey(center);
                const days: number[] = centerDaysMap[encodedKey] || [];
                const centerMappedCount = records.filter(r => (r.clinicCenter || centers[0]) === center && typeof r.latitude === 'number' && typeof r.longitude === 'number').length;
                return (
                  <span key={center} className="inline-flex items-center gap-1.5 text-xs bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg">
                    <MapPin size={12} className="text-blue-600 shrink-0" />
                    <span className="font-bold">{center}</span>
                    <span className="text-slate-400">|</span>
                    <span className="font-mono text-blue-700 font-semibold">
                      {days.length > 0 ? `गते: ${days.join(', ')}` : 'सबै गते'}
                    </span>
                    {centerMappedCount > 0 && (
                      <span className="bg-blue-600 text-white font-mono font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                        📍 {centerMappedCount}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap font-bold text-sm">
          {/* Satellite Map View Button */}
          <button
            onClick={() => setShowSatelliteMap(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-4 py-2 rounded-lg hover:from-slate-800 hover:to-indigo-900 transition-all shadow-md active:scale-95 cursor-pointer border border-indigo-500/30"
            title="स्याटेलाइट नक्सामा क्लिनिक केन्द्रहरू हेर्नुहोस्"
          >
            <Globe size={18} className="text-cyan-400 animate-pulse" />
            <span>स्याटेलाइट म्याप (Satellite Map)</span>
          </button>

          {onUpdateGeneralSettings && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all border cursor-pointer ${
                showSettings 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
              }`}
              title="केन्द्र र सञ्चालन मिति सेटिङ"
            >
              <Settings size={18} className={showSettings ? 'animate-spin-slow' : ''} />
              <span>केन्द्र र मिति सेटिङ</span>
            </button>
          )}

          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus size={18} /> नयाँ रेकर्ड थप्नुहोस्
          </button>
        </div>
      </div>

      {/* Satellite Map Modal */}
      {showSatelliteMap && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex flex-col font-nepali">
          {/* Map Top Bar */}
          <div className="bg-slate-900 border-b border-slate-800 text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600/30 border border-indigo-400/30 rounded-xl text-cyan-400">
                <Globe size={22} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  गाउँघर क्लिनिक स्याटेलाइट नक्सा (Satellite Location Map)
                </h3>
                <p className="text-xs text-slate-400">
                  केन्द्र र नेपाली मिति अनुसार नक्साङ्कित क्लिनिक लोकेसन तथा भौगोलिक स्थिति
                </p>
              </div>
            </div>

            {/* Controls and Filters */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              {/* Center Filter */}
              <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-3 py-1 rounded-xl">
                <span className="text-slate-300 font-bold">केन्द्र:</span>
                <select
                  value={mapCenterFilter}
                  onChange={(e) => setMapCenterFilter(e.target.value)}
                  className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer [&>option]:bg-slate-900 [&>option]:text-white"
                >
                  <option value="all">सबै क्लिनिक केन्द्रहरू</option>
                  {centers.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Fiscal Year Filter */}
              <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-3 py-1 rounded-xl">
                <span className="text-slate-300 font-bold">आ.व.:</span>
                <select
                  value={mapFiscalYearFilter}
                  onChange={(e) => setMapFiscalYearFilter(e.target.value)}
                  className="bg-transparent text-cyan-300 font-bold font-mono focus:outline-none cursor-pointer [&>option]:bg-slate-900 [&>option]:text-white"
                >
                  <option value="all">सबै आ.व.</option>
                  <option value={currentFiscalYear}>{currentFiscalYear}</option>
                </select>
              </div>

              {/* Nepali Date Picker Filter */}
              <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-xl">
                <span className="text-slate-300 font-bold whitespace-nowrap">मिति (BS):</span>
                <div className="w-36">
                  <NepaliDatePicker
                    value={mapDateBsFilter}
                    onChange={(val) => setMapDateBsFilter(val)}
                    label=""
                    placeholder="सबै मिति"
                    inputClassName="!bg-slate-900 !text-cyan-300 !border-slate-700 !py-1 !px-2 !text-xs !font-bold"
                    hideIcon={false}
                  />
                </div>
                {mapDateBsFilter && (
                  <button
                    type="button"
                    onClick={() => setMapDateBsFilter('')}
                    className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="मिति रिसेट गर्नुहोस्"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Map Type Toggle */}
              <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setMapType('hybrid')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    mapType === 'hybrid' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  हाइब्रिड
                </button>
                <button
                  type="button"
                  onClick={() => setMapType('satellite')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    mapType === 'satellite' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  स्याटेलाइट
                </button>
                <button
                  type="button"
                  onClick={() => setMapType('standard')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    mapType === 'standard' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  म्याप
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="खोज्नुहोस्..."
                  value={mapSearchTerm}
                  onChange={(e) => setMapSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 w-32 sm:w-40"
                />
              </div>

              <button
                onClick={() => setShowSatelliteMap(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer ml-1"
                title="बन्द गर्नुहोस्"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-2 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-300 shrink-0">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <MapPin size={15} /> नक्साङ्कित केसहरू: <strong className="text-white font-mono text-sm">{mappedMapRecords.length}</strong>
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1.5 text-amber-300">
                <AlertCircle size={15} /> लोकेसन नभएका: <strong className="text-white font-mono text-sm">{unmappedMapRecords.length}</strong>
              </span>
              {mapDateBsFilter && (
                <>
                  <span className="text-slate-600">|</span>
                  <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-800/60">
                    <Calendar size={13} /> रोजिएको मिति: <strong className="text-white font-mono">{mapDateBsFilter}</strong>
                  </span>
                </>
              )}
            </div>

            <div className="text-[11px] text-slate-400 italic">
              * नेपाली क्यालेन्डरबाट मिति रोजेर सो मितिको नक्साङ्कन सजिलै हेर्न सकिन्छ।
            </div>
          </div>

          {/* Map Body Layout */}
          <div className="flex-1 relative flex overflow-hidden">
            {/* Map Container */}
            <div ref={mapContainerRef} className="w-full h-full z-0 bg-slate-950" />

            {/* Unmapped Sidebar Drawer (Optional overlay) */}
            {unmappedMapRecords.length > 0 && (
              <div className="absolute right-4 top-4 z-10 w-80 bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-2xl backdrop-blur-md max-h-[85vh] overflow-y-auto space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h4 className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                    <AlertCircle size={15} /> GPS लोकेसन बाँकी ({unmappedMapRecords.length})
                  </h4>
                </div>
                <div className="space-y-2 text-xs">
                  {unmappedMapRecords.slice(0, 10).map((r) => (
                    <div key={r.id} className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-200">{r.patientName}</div>
                        <div className="text-[10px] text-slate-400">{r.clinicCenter || centers[0]} | {r.dateBs}</div>
                      </div>
                      <button
                        onClick={() => {
                          setPickingForRecord(r);
                          setShowLocationPicker(true);
                        }}
                        className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold text-[10px] whitespace-nowrap cursor-pointer shadow-xs"
                      >
                        📍 लोकेसन थप्नुहोस्
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location Picker Modal for Map or Form */}
      {showLocationPicker && (
        <PatientLocationPickerModal
          initialLat={pickingForRecord ? pickingForRecord.latitude : formData.latitude}
          initialLng={pickingForRecord ? pickingForRecord.longitude : formData.longitude}
          patientName={pickingForRecord ? `${pickingForRecord.patientName} (${pickingForRecord.clinicCenter || 'गाउँघर क्लिनिक'})` : formData.patientName || 'गाउँघर क्लिनिक केन्द्र'}
          onSave={(lat, lng) => {
            if (pickingForRecord) {
              const updatedRecord: GaunGharClinicRecord = {
                ...(pickingForRecord as GaunGharClinicRecord),
                latitude: lat,
                longitude: lng,
              };
              onSaveRecord(updatedRecord);
              setPickingForRecord(null);
            } else {
              setFormData(prev => ({
                ...prev,
                latitude: lat,
                longitude: lng,
              }));
              setGpsMessage(`नक्साबाट लोकेसन रोजियो: (Lat: ${lat}, Lng: ${lng})`);
            }
            setShowLocationPicker(false);
          }}
          onClose={() => {
            setShowLocationPicker(false);
            setPickingForRecord(null);
          }}
        />
      )}

      {/* Settings Modal (Center Management & Operating Days 1-32) */}
      {showSettings && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSettings(false);
          }}
        >
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-200 max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 text-left">
            <div className="flex justify-between items-center border-b border-blue-50 pb-4">
              <div>
                <h3 className="font-bold text-blue-900 flex items-center gap-2 text-lg">
                  <Settings size={22} className="text-blue-600 animate-spin-slow" /> गाउँघर क्लिनिक केन्द्रहरू तथा सञ्चालन हुने गतेहरू (१-३२)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  यहाँबाट गाउँघर क्लिनिकका केन्द्रहरू थप्न/मेटाउन तथा हरेक केन्द्रमा सेवा सञ्चालन हुने नेपाली गतेहरू (१-३२) रोज्न सक्नुहुन्छ।
                </p>
              </div>
              <button 
                onClick={() => setShowSettings(false)} 
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                title="बन्द गर्नुहोस्"
              >
                <X size={20}/>
              </button>
            </div>

            <div className="space-y-6">
              {/* Add Center Form */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <MapPin size={16} className="text-blue-600"/> नयाँ गाउँघर क्लिनिक केन्द्र थप्नुहोस्:
                </label>
                <div className="flex gap-2 max-w-md">
                  <input 
                    type="text"
                    value={newCenter}
                    onChange={(e) => setNewCenter(e.target.value)}
                    placeholder="उदा: वडा नं. १ क्लिनिक केन्द्र..."
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm bg-white"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCenter()}
                  />
                  <button 
                    onClick={handleAddCenter}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus size={18}/> थप्नुहोस्
                  </button>
                </div>
              </div>

              {/* Active Centers & Day Selectors */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {centers.map(center => {
                  const encodedKey = safeEncodeKey(center);
                  const centerDays: number[] = centerDaysMap[encodedKey] || [];
                  return (
                    <div key={center} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:border-blue-300 transition-all">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                          <MapPin size={16} className="text-blue-600 shrink-0" />
                          {center}
                        </span>
                        <button 
                          onClick={() => handleRemoveCenter(center)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="केन्द्र हटाउनुहोस्"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center mb-1 text-[11px]">
                          <span className="text-slate-600 font-bold">
                            सञ्चालन हुने गतेहरू (१-३२):
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSelectAllDays(center)}
                              className="text-blue-600 hover:text-blue-800 font-bold text-[10px] cursor-pointer"
                            >
                              सबै छान्नुहोस्
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => handleClearAllDays(center)}
                              className="text-rose-500 hover:text-rose-700 font-bold text-[10px] cursor-pointer"
                            >
                              सबै हटाउनुहोस्
                            </button>
                          </div>
                        </div>

                        {/* 1-32 Days Grid */}
                        <div className="grid grid-cols-8 gap-1">
                          {Array.from({ length: 32 }, (_, i) => i + 1).map(day => {
                            const isSelected = centerDays.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => handleToggleCenterDay(center, day)}
                                className={`h-6 rounded-md text-[10px] font-mono font-bold transition-all border flex items-center justify-center cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>

                        <div className="text-[10px] text-slate-500 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {centerDays.length > 0 
                            ? `छनोट गरिएका गतेहरू: ${centerDays.join(', ')}`
                            : 'कुनै गते रोजिएको छैन (सबै गते सञ्चालन हुनेछ)'
                          }
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={() => setShowSettings(false)}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-sm cursor-pointer"
              >
                <CheckCircle2 size={16} className="inline mr-1.5" /> परिवर्तनहरू सुरक्षित भयो / बन्द गर्नुहोस्
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration / Edit Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in zoom-in-95">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              {formData.id ? 'गाउँघर क्लिनिक सेवा विवरण सम्पादन गर्नुहोस्' : 'नयाँ गाउँघर क्लिनिक सेवा विवरण थप्नुहोस्'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
              <Plus size={20} className="rotate-45" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-6">
            {/* Center Selector Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block flex items-center gap-1">
                <MapPin size={14} className="text-blue-600" /> गाउँघर क्लिनिक केन्द्र <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.clinicCenter || centers[0] || 'मुख्य गाउँघर क्लिनिक'}
                onChange={e => handleCenterChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none bg-white font-bold text-slate-800 cursor-pointer"
                required
              >
                {centers.map(center => (
                  <option key={center} value={center}>{center}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <NepaliDatePicker
                label="सेवा दिन/मिति (BS) *"
                value={formData.dateBs || ''}
                onChange={val => setFormData({ ...formData, dateBs: val })}
                required
              />
              {/* Schedule Check Badge */}
              {currentCenterScheduledDays.length > 0 && (
                <div className={`text-[11px] font-semibold mt-1 px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                  isSelectedDateOnSchedule 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-amber-50 text-amber-900 border-amber-300'
                }`}>
                  <CalendarClock size={13} className="shrink-0" />
                  {isSelectedDateOnSchedule ? (
                    <span>नियमित सञ्चालन गतेसँग मिलेको छ।</span>
                  ) : (
                    <span>
                      ध्यान दिनुहोस्: यो केन्द्रको नियमित सञ्चालन गतेहरू: <strong className="font-mono text-blue-900">{currentCenterScheduledDays.join(', ')}</strong> हुन्।
                    </span>
                  )}
                </div>
              )}
            </div>

            <Input
              label="बिरामीको नाम *"
              value={formData.patientName}
              onChange={e => setFormData({ ...formData, patientName: e.target.value })}
              required
              icon={<User size={16} />}
            />

            <Input
              label="उमेर"
              value={formData.age}
              onChange={e => setFormData({ ...formData, age: e.target.value })}
              icon={<Calendar size={16} />}
              placeholder="उदा: २५ वर्ष"
            />
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">लिंग</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {(['Male', 'Female', 'Other'] as const).map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: g })}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      formData.gender === g ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {g === 'Male' ? 'पुरुष' : g === 'Female' ? 'महिला' : 'अन्य'}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="ठेगाना"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              icon={<MapPin size={16} />}
              placeholder="गाउँ/वडा नं."
            />

            <Input
              label="फोन नं."
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              icon={<Phone size={16} />}
              placeholder="मोबाइल नम्बर"
            />

            <Input
              label="सेवाको प्रकार"
              value={formData.serviceType}
              onChange={e => setFormData({ ...formData, serviceType: e.target.value })}
              icon={<Briefcase size={16} />}
              placeholder="उदा: स्वास्थ्य जाँच, परामर्श, औषधि वितरण"
            />

            <div className="md:col-span-2">
              <Input
                label="दिइएको उपचार/परामर्श"
                value={formData.treatmentGiven}
                onChange={e => setFormData({ ...formData, treatmentGiven: e.target.value })}
                icon={<FileText size={16} />}
                placeholder="उपचार/औषधिको नाम तथा परामर्श..."
              />
            </div>

            <Input
              label="कैफियत"
              value={formData.remarks}
              onChange={e => setFormData({ ...formData, remarks: e.target.value })}
              icon={<FileText size={16} />}
            />

            {/* GPS Coordinates Section */}
            <div className="md:col-span-3 bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                    <Navigation size={15} className="text-blue-600" /> भौगोलिक स्थान (GPS Coordinates - Lat/Lng):
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    केन्द्रको पहिलो केस वा नयाँ लोकेसन दर्ता गर्दा GPS अक्षांश र देशान्तर रेकर्ड गरिन्छ।
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchDeviceGPS}
                    disabled={isGettingGPS}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Crosshair size={14} className={isGettingGPS ? 'animate-spin' : ''} />
                    <span>{isGettingGPS ? 'खोजिँदैछ...' : '📍 GPS लोकेसन लिनुहोस्'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPickingForRecord(null);
                      setShowLocationPicker(true);
                    }}
                    className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Globe size={14} className="text-indigo-600" />
                    <span>🗺️ नक्साबाट रोज्नुहोस्</span>
                  </button>
                </div>
              </div>

              {/* GPS Coordinates Display Badges */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {typeof formData.latitude === 'number' && typeof formData.longitude === 'number' ? (
                  <div className="inline-flex items-center gap-2 bg-emerald-100/90 text-emerald-900 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border border-emerald-200 shadow-xs">
                    <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                    <span>Latitude: {formData.latitude.toFixed(6)}</span>
                    <span className="opacity-40">|</span>
                    <span>Longitude: {formData.longitude.toFixed(6)}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-semibold border border-amber-200">
                    <AlertCircle size={15} className="text-amber-700 shrink-0" />
                    <span>GPS लोकेसन प्राप्त भएको छैन (वैकल्पिक तर स्याटेलाइट म्यापिङका लागि आवश्यक)</span>
                  </div>
                )}
              </div>

              {gpsMessage && (
                <div className="text-[11px] text-blue-800 font-semibold bg-white p-2 rounded-xl border border-blue-100">
                  {gpsMessage}
                </div>
              )}
            </div>

            <div className="md:col-span-3 flex justify-end gap-3 pt-4 border-t font-bold">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-sm cursor-pointer"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                type="submit"
                className="px-8 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200 flex items-center gap-2 transition-all active:scale-95 text-sm cursor-pointer"
              >
                <Save size={18} /> सुरक्षित गर्नुहोस्
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Record List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-blue-600" />
            <h3 className="font-bold text-slate-800">गाउँघर क्लिनिक रेकर्ड सूची</h3>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold font-mono">
              {filteredRecords.length}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Center Filter */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-600 whitespace-nowrap">केन्द्र:</span>
              <select
                value={selectedCenterFilter}
                onChange={e => setSelectedCenterFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white cursor-pointer"
              >
                <option value="all">सबै गाउँघर क्लिनिक केन्द्रहरू</option>
                {centers.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Nepali Date Picker Filter for Main Table */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-600 whitespace-nowrap">मिति (BS):</span>
              <div className="w-36">
                <NepaliDatePicker
                  value={tableDateBsFilter}
                  onChange={(val) => setTableDateBsFilter(val)}
                  label=""
                  placeholder="सबै मिति"
                  inputClassName="!bg-white !py-1 !px-2.5 !text-xs !font-bold !border-slate-300"
                  hideIcon={false}
                />
              </div>
              {tableDateBsFilter && (
                <button
                  type="button"
                  onClick={() => setTableDateBsFilter('')}
                  className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
                  title="मिति रिसेट गर्नुहोस्"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="नाम, फोन, ठेगाना वा केन्द्र खोज्नुहोस्..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-xs"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="p-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">मिति (BS)</th>
                <th className="p-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">क्लिनिक केन्द्र</th>
                <th className="p-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">बिरामीको नाम</th>
                <th className="p-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">उमेर / लिंग</th>
                <th className="p-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">ठेगाना / फोन</th>
                <th className="p-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">सेवा / उपचार</th>
                <th className="p-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider text-center">GPS नक्सांकन</th>
                <th className="p-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider text-center">कार्य</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    कुनै गाउँघर क्लिनिक रेकर्ड फेला परेन।
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => (
                  <tr key={record.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-3.5 text-sm text-slate-700 font-mono font-medium">{record.dateBs}</td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-100">
                        <MapPin size={11} className="text-blue-600 shrink-0" />
                        {record.clinicCenter || centers[0] || 'मुख्य गाउँघर क्लिनिक'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800 text-sm">{record.patientName}</div>
                      {record._orgName && record._orgName !== generalSettings.orgNameNepali && (
                        <div className="text-[10px] text-blue-500 uppercase font-bold">{record._orgName}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-xs text-slate-600">
                      {record.age ? `${record.age} - ` : ''}
                      {record.gender === 'Male' ? 'पुरुष' : record.gender === 'Female' ? 'महिला' : 'अन्य'}
                    </td>
                    <td className="p-3.5 text-xs text-slate-600">
                      <div>{record.address || '-'}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{record.phone}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="text-xs font-bold text-slate-800">{record.serviceType || 'स्वास्थ्य सेवा'}</div>
                      <div className="text-xs text-slate-500 line-clamp-1">{record.treatmentGiven}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      {typeof record.latitude === 'number' && typeof record.longitude === 'number' ? (
                        <button
                          onClick={() => {
                            setMapCenterFilter(record.clinicCenter || centers[0]);
                            setMapDateBsFilter(record.dateBs);
                            setShowSatelliteMap(true);
                          }}
                          className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="स्याटेलाइट म्यापमा हेर्नुहोस्"
                        >
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          <span>नक्साङ्कित</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setPickingForRecord(record);
                            setShowLocationPicker(true);
                          }}
                          className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full text-[11px] font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                          title="GPS लोकेसन सेट गर्नुहोस्"
                        >
                          <AlertCircle size={12} className="text-amber-600" />
                          <span>लोकेसन बाँकी</span>
                        </button>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(record)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                          title="सम्पादन गर्नुहोस्"
                        >
                          <FileText size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("के तपाईं यो गाउँघर क्लिनिक रेकर्ड मेटाउन चाहनुहुन्छ?")) {
                              onDeleteRecord(record.id);
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                          title="मेटाउनुहोस्"
                        >
                          <Trash2 size={16} />
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
  );
};
