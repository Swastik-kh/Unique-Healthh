import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Check, X, Search, Crosshair } from 'lucide-react';
import L from 'leaflet';

interface PatientLocationPickerModalProps {
  initialLat?: number;
  initialLng?: number;
  patientName?: string;
  onSave: (lat: number, lng: number) => void;
  onClose: () => void;
}

export const PatientLocationPickerModal: React.FC<PatientLocationPickerModalProps> = ({
  initialLat,
  initialLng,
  patientName,
  onSave,
  onClose
}) => {
  // Default center: Nepal (around Pokhara/Kathmandu) if not provided
  const defaultLat = initialLat || 27.7172; // Kathmandu default or center
  const defaultLng = initialLng || 85.3240;

  const [lat, setLat] = useState<number>(defaultLat);
  const [lng, setLng] = useState<number>(defaultLng);
  const [hasSelected, setHasSelected] = useState<boolean>(!!(initialLat && initialLng));
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create custom pin icon
    const customIcon = L.divIcon({
      className: 'custom-pin-icon',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
          <div style="position: absolute; width: 36px; height: 36px; background-color: #ef4444; opacity: 0.25; border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36]
    });

    // Initialize Map
    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: hasSelected ? 15 : 12,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const marker = L.marker([lat, lng], {
      draggable: true,
      icon: customIcon
    }).addTo(map);

    markerRef.current = marker;
    mapInstanceRef.current = map;

    // Handle map click
    map.on('click', (e: L.LeafletMouseEvent) => {
      const newLat = parseFloat(e.latlng.lat.toFixed(6));
      const newLng = parseFloat(e.latlng.lng.toFixed(6));
      setLat(newLat);
      setLng(newLng);
      setHasSelected(true);
      marker.setLatLng([newLat, newLng]);
    });

    // Handle marker drag end
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      const newLat = parseFloat(position.lat.toFixed(6));
      const newLng = parseFloat(position.lng.toFixed(6));
      setLat(newLat);
      setLng(newLng);
      setHasSelected(true);
    });

    // Fix map container size after load
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
    };
  }, []);

  const updateMapMarker = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    setHasSelected(true);
    if (markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([newLat, newLng], 15);
    }
  };

  const handleGetCurrentGPS = () => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('तपाईंको ब्राउजरमा GPS सपोर्ट छैन (Geolocation not supported)');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = parseFloat(position.coords.latitude.toFixed(6));
        const userLng = parseFloat(position.coords.longitude.toFixed(6));
        updateMapMarker(userLat, userLng);
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('GPS लोकेसन अनुमति दिइएन (Location permission denied)');
        } else {
          setLocationError('GPS लोकेसन प्राप्त गर्न सकिएन (Failed to get GPS location)');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleManualCoordinateChange = (newLatStr: string, newLngStr: string) => {
    const parsedLat = parseFloat(newLatStr);
    const parsedLng = parseFloat(newLngStr);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      updateMapMarker(parsedLat, parsedLng);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col h-[90vh] max-h-[680px] overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-500/20 rounded-lg text-red-400 border border-red-500/30">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm md:text-base font-nepali tracking-wide leading-tight">
                बिरामीको घर/स्थान छनोट गर्नुहोस् (Select Patient Location)
              </h3>
              {patientName && (
                <p className="text-xs text-blue-200 font-nepali">
                  बिरामी: <span className="font-bold text-white">{patientName}</span>
                </p>
              )}
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Controls & GPS Button */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGetCurrentGPS}
              disabled={isGettingLocation}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg font-nepali transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-60"
            >
              <Crosshair size={14} className={isGettingLocation ? 'animate-spin' : ''} />
              {isGettingLocation ? 'GPS स्थान खोजिँदैछ...' : 'वर्तमान GPS स्थान लिउनुहोस्'}
            </button>
            <span className="text-slate-400 font-bold hidden sm:inline">|</span>
            <span className="text-slate-600 font-nepali hidden sm:inline">
              नक्सामा जहाँ बिरामीको घर छ, त्यहाँ थिच्नुहोस् वा पिन तान्नुहोस् (Click on map to place pin)
            </span>
          </div>

          {locationError && (
            <span className="text-red-600 font-bold text-[11px] font-nepali bg-red-50 px-2 py-0.5 rounded border border-red-200">
              {locationError}
            </span>
          )}
        </div>

        {/* Map Container */}
        <div className="relative flex-1 bg-slate-100 min-h-[250px]">
          <div ref={mapContainerRef} className="w-full h-full z-10" />
          
          {/* Map Overlay Instruction Badge */}
          <div className="absolute bottom-3 left-3 z-[20] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-slate-200 text-slate-800 text-xs font-semibold font-nepali flex items-center gap-2 pointer-events-none">
            <MapPin size={14} className="text-red-500 shrink-0" />
            <span>अक्षांश (Lat): <b>{lat}</b> | देशान्तर (Lng): <b>{lng}</b></span>
          </div>
        </div>

        {/* Lat Lng Inputs & Bottom Save Bar */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="grid grid-cols-2 gap-2 max-w-xs w-full">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block font-nepali mb-0.5">Latitude (अक्षांश)</label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => handleManualCoordinateChange(e.target.value, String(lng))}
                className="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="27.7172"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block font-nepali mb-0.5">Longitude (देशान्तर)</label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => handleManualCoordinateChange(String(lat), e.target.value)}
                className="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="85.3240"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold text-xs font-nepali transition-all"
            >
              रद्द गर्नुहोस् (Cancel)
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(lat, lng);
                onClose();
              }}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 rounded-xl font-bold text-xs font-nepali transition-all flex items-center gap-1.5 shadow-md"
            >
              <Check size={16} />
              लोकेसन सुरक्षित गर्नुहोस् (Save Location)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
