import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  MapPin, X, Filter, Search, Users, Stethoscope, CheckCircle2, 
  AlertCircle, ChevronRight, Phone, Navigation, ExternalLink, Calendar, Plus, RefreshCw, Layers, Globe
} from 'lucide-react';
import L from 'leaflet';
import { TBPatient } from '../types/healthTypes';

interface PatientMapViewProps {
  patients: TBPatient[];
  initialServiceType?: 'All' | 'TB' | 'Leprosy';
  onSelectPatientDetails?: (patient: TBPatient) => void;
  onEditPatientLocation?: (patient: TBPatient) => void;
  onClose: () => void;
}

export const PatientMapView: React.FC<PatientMapViewProps> = ({
  patients = [],
  initialServiceType = 'All',
  onSelectPatientDetails,
  onEditPatientLocation,
  onClose
}) => {
  const [serviceTypeFilter, setServiceTypeFilter] = useState<'All' | 'TB' | 'Leprosy'>(initialServiceType);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [regTypeFilter, setRegTypeFilter] = useState<string>('All');
  const [classificationFilter, setClassificationFilter] = useState<string>('All');
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('hybrid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPatientCard, setSelectedPatientCard] = useState<TBPatient | null>(null);
  const [showPatientName, setShowPatientName] = useState<boolean>(true);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelLayerRef = useRef<L.TileLayer | null>(null);

  // Filter patients
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      // Service filter
      if (serviceTypeFilter !== 'All' && p.serviceType !== serviceTypeFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'All') {
        const pStatus = p.status || 'Active';
        if (statusFilter === 'Defaulter') {
          if (!p.isDefaulter && pStatus !== 'Loss to Follow-up') return false;
        } else if (pStatus !== statusFilter) {
          return false;
        }
      }
      // Reg Type Filter
      if (regTypeFilter !== 'All' && p.regType !== regTypeFilter) {
        return false;
      }
      // Classification / Leprosy Type Filter
      if (classificationFilter !== 'All') {
        const cls = p.classification || p.leprosyType;
        if (cls !== classificationFilter) {
          return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = p.name?.toLowerCase().includes(q);
        const idMatch = p.patientId?.toLowerCase().includes(q);
        const addressMatch = p.address?.toLowerCase().includes(q);
        const phoneMatch = p.phone?.includes(q);
        if (!nameMatch && !idMatch && !addressMatch && !phoneMatch) {
          return false;
        }
      }
      return true;
    });
  }, [patients, serviceTypeFilter, statusFilter, regTypeFilter, classificationFilter, searchQuery]);

  // Separate mapped and unmapped patients
  const mappedPatients = useMemo(() => {
    return filteredPatients.filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number' && !isNaN(p.latitude) && !isNaN(p.longitude));
  }, [filteredPatients]);

  const unmappedPatients = useMemo(() => {
    return filteredPatients.filter(p => typeof p.latitude !== 'number' || typeof p.longitude !== 'number' || isNaN(p.latitude) || isNaN(p.longitude));
  }, [filteredPatients]);

  // Stats summary
  const totalTbMapped = useMemo(() => mappedPatients.filter(p => p.serviceType === 'TB').length, [mappedPatients]);
  const totalLeprosyMapped = useMemo(() => mappedPatients.filter(p => p.serviceType === 'Leprosy').length, [mappedPatients]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Default center: Nepal center (Lat: 28.2096, Lng: 83.9856) or first patient location
    let centerLat = 28.2096;
    let centerLng = 83.9856;
    let initialZoom = 7;

    if (mappedPatients.length > 0) {
      centerLat = mappedPatients[0].latitude!;
      centerLng = mappedPatients[0].longitude!;
      initialZoom = mappedPatients.length === 1 ? 14 : 10;
    }

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: initialZoom,
      zoomControl: true
    });

    const layerGroup = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
    };
  }, []);

  // Handle Tile Layers (Standard / Satellite / Hybrid)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    if (labelLayerRef.current) {
      map.removeLayer(labelLayerRef.current);
      labelLayerRef.current = null;
    }

    if (mapType === 'satellite' || mapType === 'hybrid') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Tiles &copy; Esri'
        }
      ).addTo(map);

      if (mapType === 'hybrid') {
        labelLayerRef.current = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 19,
            attribution: 'Labels &copy; Esri'
          }
        ).addTo(map);
      }
    } else {
      tileLayerRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }
      ).addTo(map);
    }
  }, [mapType]);

  // Update map markers when mappedPatients change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerGroupRef.current) return;

    const map = mapInstanceRef.current;
    const layerGroup = markersLayerGroupRef.current;
    layerGroup.clearLayers();

    if (mappedPatients.length === 0) return;

    const bounds = L.latLngBounds([]);

    mappedPatients.forEach(p => {
      const isTb = p.serviceType === 'TB';
      const isDefaulter = p.isDefaulter || p.status === 'Loss to Follow-up';
      const isCompleted = p.status === 'Completed';

      // Pin Color: Red for TB, Purple for Leprosy
      const baseColor = isTb ? '#ef4444' : '#8b5cf6'; // Red for TB, Purple for Leprosy
      const strokeColor = isDefaulter ? '#dc2626' : (isCompleted ? '#10b981' : '#ffffff');
      const badgeIconText = isTb ? 'TB' : 'LP';

      const nameLabelHtml = showPatientName ? `
        <div style="
          background: rgba(15, 23, 42, 0.9); 
          color: white; 
          font-size: 10px; 
          font-weight: 700; 
          padding: 2px 6px; 
          border-radius: 6px; 
          margin-top: 2px; 
          white-space: nowrap; 
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          font-family: 'Mukta', sans-serif;
        ">
          ${p.name || p.patientId}
        </div>
      ` : '';

      const customMarkerIcon = L.divIcon({
        className: 'patient-map-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="
              width: 32px; 
              height: 32px; 
              background: ${baseColor}; 
              border: 3px solid ${strokeColor}; 
              border-radius: 50%; 
              box-shadow: 0 4px 12px rgba(0,0,0,0.35); 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              color: white; 
              font-weight: 800; 
              font-size: 11px;
              font-family: 'Inter', sans-serif;
            ">
              ${badgeIconText}
            </div>
            ${nameLabelHtml}
          </div>
        `,
        iconSize: showPatientName ? [40, 50] : [32, 32],
        iconAnchor: showPatientName ? [20, 25] : [16, 16]
      });

      const marker = L.marker([p.latitude!, p.longitude!], { icon: customMarkerIcon });

      // Click handler
      marker.on('click', () => {
        setSelectedPatientCard(p);
        map.setView([p.latitude!, p.longitude!], 15, { animate: true });
      });

      marker.addTo(layerGroup);
      bounds.extend([p.latitude!, p.longitude!]);
    });

    if (mappedPatients.length > 0 && map) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [mappedPatients, showPatientName]);

  const handleZoomToPatient = (p: TBPatient) => {
    setSelectedPatientCard(p);
    if (mapInstanceRef.current && typeof p.latitude === 'number' && typeof p.longitude === 'number') {
      mapInstanceRef.current.setView([p.latitude, p.longitude], 16, { animate: true });
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/80 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in duration-200">
      
      {/* Top Navigation Bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30">
            <MapPin size={22} />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold font-nepali tracking-wide leading-tight flex items-center gap-2">
              <span>बिरामी नक्सा व्यवस्थापन (Patient Geographic Map View)</span>
            </h2>
            <p className="text-xs text-slate-300 font-nepali">
              क्षयरोग तथा कुष्ठरोगका बिरामीहरूको भौगोलिक उपस्थिति र लोकेसन नक्सा
            </p>
          </div>
        </div>

        {/* Stats Badges */}
        <div className="hidden lg:flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center gap-2 text-slate-200 font-nepali">
            <span>कुल बिरामी:</span>
            <span className="font-bold text-white text-sm">{filteredPatients.length}</span>
          </div>
          <div className="px-3 py-1.5 bg-emerald-900/40 border border-emerald-700/50 rounded-xl flex items-center gap-2 text-emerald-300 font-nepali">
            <span>नक्सामा म्याप भएका:</span>
            <span className="font-bold text-emerald-200 text-sm">{mappedPatients.length}</span>
          </div>
          <div className="px-3 py-1.5 bg-red-900/40 border border-red-700/50 rounded-xl flex items-center gap-2 text-red-300 font-nepali">
            <span>क्षयरोग (TB):</span>
            <span className="font-bold text-red-200 text-sm">{totalTbMapped}</span>
          </div>
          <div className="px-3 py-1.5 bg-purple-900/40 border border-purple-700/50 rounded-xl flex items-center gap-2 text-purple-300 font-nepali">
            <span>कुष्ठरोग (Leprosy):</span>
            <span className="font-bold text-purple-200 text-sm">{totalLeprosyMapped}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          title="बन्द गर्नुहोस्"
        >
          <X size={22} />
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        
        {/* Service Type Segmented Buttons */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => setServiceTypeFilter('All')}
            className={`px-3 py-1.5 rounded-lg font-bold font-nepali transition-all ${
              serviceTypeFilter === 'All' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            सबै सेवा (All)
          </button>
          <button
            type="button"
            onClick={() => setServiceTypeFilter('TB')}
            className={`px-3 py-1.5 rounded-lg font-bold font-nepali transition-all ${
              serviceTypeFilter === 'TB' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            क्षयरोग (TB)
          </button>
          <button
            type="button"
            onClick={() => setServiceTypeFilter('Leprosy')}
            className={`px-3 py-1.5 rounded-lg font-bold font-nepali transition-all ${
              serviceTypeFilter === 'Leprosy' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            कुष्ठरोग (Leprosy)
          </button>
        </div>

        {/* Map Type Selector */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-nepali font-semibold hidden lg:inline flex items-center gap-1">
            <Globe size={13} className="text-emerald-400" />
            <span>नक्सा प्रकार:</span>
          </span>
          <select
            value={mapType}
            onChange={e => setMapType(e.target.value as any)}
            className="bg-slate-800 text-emerald-300 border border-emerald-700/60 px-3 py-1.5 rounded-xl font-nepali text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="hybrid">🛰️ स्याटेलाइट हाइब्रिड (Satellite Hybrid)</option>
            <option value="satellite">🌍 स्याटेलाइट मात्र (Satellite Only)</option>
            <option value="standard">🗺️ साधारण नक्सा (Standard Map)</option>
          </select>
        </div>

        {/* Registration Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-nepali font-semibold hidden lg:inline">दर्ता प्रकार:</span>
          <select
            value={regTypeFilter}
            onChange={e => setRegTypeFilter(e.target.value)}
            className="bg-slate-800 text-slate-100 border border-slate-700 px-3 py-1.5 rounded-xl font-nepali text-xs outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">सबै दर्ता प्रकार (All Reg Types)</option>
            <option value="New">नयाँ (New)</option>
            <option value="Relapse">दोहोरिएको (Relapse)</option>
            <option value="TAF">उपचार असफल (TAF)</option>
            <option value="TALF">उपचार पछि हराएको (TALF)</option>
            <option value="OPT">अन्य पहिले उपचार गरिएको (OPT)</option>
            <option value="UPTH">अज्ञात उपचार इतिहास (UPTH)</option>
            <option value="Transferred In">सरुवा भई आएको (Transferred In)</option>
          </select>
        </div>

        {/* Classification Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-nepali font-semibold hidden lg:inline">वर्गीकरण:</span>
          <select
            value={classificationFilter}
            onChange={e => setClassificationFilter(e.target.value)}
            className="bg-slate-800 text-slate-100 border border-slate-700 px-3 py-1.5 rounded-xl font-nepali text-xs outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">सबै वर्गीकरण (All Classifications)</option>
            {(serviceTypeFilter === 'All' || serviceTypeFilter === 'TB') && (
              <>
                <option value="PBC">PBC (Bacteriologically Confirmed)</option>
                <option value="PCD">PCD (Clinically Diagnosed)</option>
                <option value="EP">EP (Extrapulmonary)</option>
              </>
            )}
            {(serviceTypeFilter === 'All' || serviceTypeFilter === 'Leprosy') && (
              <>
                <option value="PB">PB (Paucibacillary)</option>
                <option value="MB">MB (Multibacillary)</option>
              </>
            )}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-nepali font-semibold hidden lg:inline">स्थिति:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-800 text-slate-100 border border-slate-700 px-3 py-1.5 rounded-xl font-nepali text-xs outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">सबै स्थिति (All Status)</option>
            <option value="Active">उपचाररत (Active)</option>
            <option value="Completed">उपचार पुरा (Completed)</option>
            <option value="Defaulter">डिफल्टर (Loss to Follow-up)</option>
            <option value="Transfer Out">ट्रान्सफर आउट (Transfer Out)</option>
            <option value="Died">मृत्यु (Died)</option>
          </select>
        </div>

        {/* Toggle Show Patient Name Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white px-3 py-1.5 rounded-xl border border-slate-700 font-nepali text-xs transition-colors select-none">
          <input
            type="checkbox"
            checked={showPatientName}
            onChange={e => setShowPatientName(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-600 cursor-pointer"
          />
          <span>बिरामीको नाम देखाउनुहोस्</span>
        </label>

        {/* Search input */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="नाम, बिरामी ID वा ठेगाना खोज्नुहोस्..."
            className="w-full bg-slate-800 text-slate-100 border border-slate-700 pl-8 pr-3 py-1.5 rounded-xl font-nepali text-xs outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: Map + Side List Panel */}
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
        
        {/* Left/Main Map Container */}
        <div className="flex-1 relative h-full bg-slate-950">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Map Legend */}
          <div className="absolute top-3 right-3 z-[20] bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-2xl border border-slate-700 shadow-xl text-xs font-nepali space-y-1.5 max-w-[200px]">
            <div className="font-bold border-b border-slate-700 pb-1 text-slate-300">नक्सा सङ्केत (Legend):</div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 border-2 border-white inline-block"></span>
              <span>क्षयरोग (TB Patient)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500 border-2 border-white inline-block"></span>
              <span>कुष्ठरोग (Leprosy Patient)</span>
            </div>
          </div>

          {/* Selected Patient Floating Info Card */}
          {selectedPatientCard && (
            <div className="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto z-[25] bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 max-w-sm font-nepali animate-in slide-in-from-bottom duration-200">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    selectedPatientCard.serviceType === 'TB' ? 'bg-red-100 text-red-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {selectedPatientCard.serviceType === 'TB' ? 'क्षयरोग (TB)' : 'कुष्ठरोग (Leprosy)'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">{selectedPatientCard.patientId}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatientCard(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>

              <h3 className="font-bold text-base text-slate-900 mt-1">
                {selectedPatientCard.name} <span className="text-xs font-normal text-slate-500">({selectedPatientCard.gender}, {selectedPatientCard.age} वर्ष)</span>
              </h3>

              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <p className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-red-500 shrink-0" />
                  <span>ठेगाना: <b>{selectedPatientCard.address || 'N/A'}</b></span>
                </p>
                {selectedPatientCard.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone size={14} className="text-emerald-600 shrink-0" />
                    <span>सम्पर्क: <a href={`tel:${selectedPatientCard.phone}`} className="font-mono text-blue-600 hover:underline">{selectedPatientCard.phone}</a></span>
                  </p>
                )}
                <p className="flex items-center gap-1.5">
                  <Stethoscope size={14} className="text-indigo-600 shrink-0" />
                  <span>वर्गीकरण: <b>{selectedPatientCard.classification || selectedPatientCard.leprosyType || 'N/A'}</b></span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-400 shrink-0" />
                  <span>उपचार सुरु: <b>{selectedPatientCard.treatmentStartDate || selectedPatientCard.registrationDate}</b></span>
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <a
                  href={`https://www.google.com/maps?q=${selectedPatientCard.latitude},${selectedPatientCard.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                >
                  <ExternalLink size={12} />
                  Google Maps
                </a>

                <div className="flex items-center gap-1">
                  {onEditPatientLocation && (
                    <button
                      type="button"
                      onClick={() => onEditPatientLocation(selectedPatientCard)}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all"
                    >
                      लोकेसन फेर्नुहोस्
                    </button>
                  )}
                  {onSelectPatientDetails && (
                    <button
                      type="button"
                      onClick={() => onSelectPatientDetails(selectedPatientCard)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      विवरण हेर्नुहोस्
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Panel: Patient List & Unmapped Warning */}
        <div className="w-full md:w-80 lg:w-96 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col h-64 md:h-full shrink-0">
          
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-xs text-slate-300 font-nepali">
            <span className="font-bold flex items-center gap-1.5">
              <Users size={15} className="text-indigo-400" />
              बिरामी सूची ({filteredPatients.length})
            </span>
            <span className="text-[11px] text-slate-400">
              म्याप: <b className="text-emerald-400">{mappedPatients.length}</b> | बाकी: <b className="text-amber-400">{unmappedPatients.length}</b>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            
            {/* Warning for unmapped patients */}
            {unmappedPatients.length > 0 && (
              <div className="p-2.5 bg-amber-950/50 border border-amber-800/60 rounded-xl text-amber-200 text-xs font-nepali">
                <div className="font-bold flex items-center gap-1.5 text-amber-300 mb-1">
                  <AlertCircle size={14} />
                  <span>{unmappedPatients.length} बिरामीको स्थान नक्सामा खाली छ</span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-snug">
                  बिरामी दर्ता सम्पादन गरी अक्षांश/देशान्तर भरेपछि नक्सामा देखिनेछ।
                </p>
              </div>
            )}

            {filteredPatients.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-nepali text-xs">
                कुनै बिरामी भेटिएन।
              </div>
            ) : (
              filteredPatients.map(p => {
                const hasCoords = typeof p.latitude === 'number' && typeof p.longitude === 'number';
                const isSelected = selectedPatientCard?.id === p.id;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (hasCoords) handleZoomToPatient(p);
                    }}
                    className={`p-3 rounded-xl border transition-all text-xs font-nepali cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-900/60 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          p.serviceType === 'TB' ? 'bg-red-900/80 text-red-200' : 'bg-purple-900/80 text-purple-200'
                        }`}>
                          {p.serviceType === 'TB' ? 'TB' : 'LP'}
                        </span>
                        <span className="font-bold text-slate-100">{p.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{p.patientId}</span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{p.address || 'ठेगाना नभएको'}</span>
                      {hasCoords ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                          <MapPin size={11} /> नक्सामा
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEditPatientLocation) onEditPatientLocation(p);
                          }}
                          className="text-amber-400 hover:underline font-bold flex items-center gap-0.5"
                        >
                          <Plus size={11} /> स्थान थप्नुहोस्
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}

          </div>
        </div>

      </div>

    </div>
  );
};
