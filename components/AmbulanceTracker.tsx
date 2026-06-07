import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ref, set, onValue, update, remove, off } from 'firebase/database';
import { db } from '../firebase';
import { 
  Truck, 
  MapPin, 
  Navigation, 
  RefreshCw, 
  Radio, 
  Phone, 
  User, 
  Compass, 
  HelpCircle, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  Battery, 
  Wifi, 
  Map, 
  Smartphone, 
  ExternalLink,
  Check,
  Locate
} from 'lucide-react';

interface AmbulanceTrackerProps {
  currentUser?: any;
  generalSettings?: any;
}

interface RealtimeAmbulance {
  id: string;
  name: string;
  driver: string;
  phone: string;
  status: 'idle' | 'en_route' | 'returning' | 'maintenance';
  speed: number;
  latitude: number;
  longitude: number;
  lastUpdated: number;
  batteryLevel?: number;
  sirenActive: boolean;
  currentPatient?: string;
  destinationName?: string;
  isActive: boolean;
  locationName?: string;
  geocodedLat?: number;
  geocodedLng?: number;
}

export const AmbulanceTracker: React.FC<AmbulanceTrackerProps> = ({ currentUser, generalSettings }) => {
  // Helper to reverse geocode lat/lng to Nepal place names
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: {
          'Accept-Language': 'ne,np,en'
        }
      });
      if (res.ok) {
        const data = await res.json();
        const addr = data.address;
        if (addr) {
          const settlement = addr.village || addr.suburb || addr.town || addr.neighbourhood || addr.city_district || addr.hamlet || addr.isolated_dwelling;
          const county = addr.county || addr.district || addr.state;
          
          let parts = [];
          if (settlement) parts.push(settlement);
          if (county) parts.push(county.replace(" District", ""));
          
          if (parts.length > 0) {
            return parts.join(', ');
          }
        }
        
        if (data.display_name) {
          const splitted = data.display_name.split(',');
          return splitted.slice(0, 3).join(',');
        }
      }
    } catch (err) {
      console.error("Geocoding fetch error:", err);
    }
    
    // Nepal default bounding boxes for fallback
    if (lat > 27.65 && lat < 27.75 && lng > 85.25 && lng < 85.4) {
      return "काठमाडौँ (Kathmandu)";
    }
    if (lat > 27.8 && lat < 28.0 && lng > 85.1 && lng < 85.3) {
      return "नुवाकोट (Nuwakot)";
    }
    return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
  };
  // Sanitize and derive organization key for private namespace
  const sanitizeOrgName = (name: string) => {
    return name.trim().replace(/[.#$[\]]/g, "_") || "unknown";
  };
  const orgTitle = currentUser?.organizationName || generalSettings?.orgName || "Swasthya_Sewa_Default";
  const safeOrg = sanitizeOrgName(orgTitle);

  // States
  const [activeSubTab, setActiveSubTab] = useState<'dispatcher' | 'driver' | 'instructions'>('dispatcher');
  const [activeAmbulances, setActiveAmbulances] = useState<RealtimeAmbulance[]>([]);
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string>('');
  
  // Driver Panel Local Tracking States
  const [drivingVehicle, setDrivingVehicle] = useState<string>('amb_1');
  const [driverNameInput, setDriverNameInput] = useState<string>(currentUser?.fullName || '');
  const [driverPhoneInput, setDriverPhoneInput] = useState<string>(currentUser?.phone || '');
  const [isActivelySharing, setIsActivelySharing] = useState<boolean>(false);
  const [currentGpsCoords, setCurrentGpsCoords] = useState<{lat: number, lng: number, accuracy: number} | null>(null);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);
  
  // Local active watchPosition ID
  const watchIdRef = useRef<number | null>(null);

  // Map DOM and Leaflet References
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const leafletMarkersRef = useRef<{ [key: string]: any }>({});
  const [leafletLoaded, setLeafletLoaded] = useState<boolean>(false);
  const [mapMode, setMapMode] = useState<'streets' | 'satellite'>('streets');
  const leafletTileLayerRef = useRef<any>(null);

  // Pre-configured ambulances list that can be owned/shared
  const VEHICLE_TEMPLATES = [
    { id: 'amb_1', name: 'बा २ झ ५६३० (Ambulance #1)' },
    { id: 'amb_2', name: 'स.प्र. १ झ ४१२ (Ambulance #2)' },
    { id: 'amb_3', name: 'को १ च १९४५ (Ambulance #3)' },
    { id: 'amb_executive', name: 'सरकारी सवारी साधन (#Executive)' }
  ];

  // Dispatch fields state
  const [dispatchPatient, setDispatchPatient] = useState('');
  const [dispatchDestination, setDispatchDestination] = useState('');
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatcherSelectedAmbId, setDispatcherSelectedAmbId] = useState('');

  // 1. Fetch Real-time data from Firebase Database
  useEffect(() => {
    const trackingRef = ref(db, `orgData/${safeOrg}/ambulanceTracking`);
    
    const unsubscribe = onValue(trackingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: RealtimeAmbulance[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setActiveAmbulances(list);
        
        // Auto select first ambulance if none selected
        if (list.length > 0 && !selectedAmbulanceId) {
          setSelectedAmbulanceId(list[0].id);
        }
      } else {
        // Seed default template ambulances if nothing is in DB yet, to allow preview immediately
        const seedData: { [key: string]: any } = {
          'amb_1': {
            id: 'amb_1',
            name: 'बा २ झ ५६३० (Ambulance #1)',
            driver: 'श्याम कृष्ण महर्जन',
            phone: '९८४१८४५६७८',
            status: 'idle',
            speed: 0,
            latitude: 27.7120,
            longitude: 85.3120,
            lastUpdated: Date.now(),
            batteryLevel: 88,
            sirenActive: false,
            isActive: true,
            locationName: 'लैनचौर, काठमाडौँ'
          },
          'amb_2': {
            id: 'amb_2',
            name: 'स.प्र. १ झ ४१२ (Ambulance #2)',
            driver: 'राम बहादुर श्रेष्ठ',
            phone: '९८५१०१२३४५',
            status: 'en_route',
            speed: 52,
            latitude: 27.7280,
            longitude: 85.3340,
            lastUpdated: Date.now(),
            batteryLevel: 94,
            sirenActive: true,
            currentPatient: 'सरिता थामी (आपतकालीन सुत्केरी)',
            destinationName: 'प्राथमिक स्वास्थ्य केन्द्र',
            isActive: true,
            locationName: 'महाराजगञ्ज, काठमाडौँ'
          }
        };
        set(ref(db, `orgData/${safeOrg}/ambulanceTracking`), seedData);
      }
    });

    return () => {
      off(trackingRef, 'value', unsubscribe);
    };
  }, [safeOrg]);

  // Selected Ambulance Object
  const selectedAmb = useMemo(() => {
    return activeAmbulances.find(a => a.id === selectedAmbulanceId) || activeAmbulances[0];
  }, [activeAmbulances, selectedAmbulanceId]);

  // 1.5. Background Automatic Geocoder to resolve and cache place names
  useEffect(() => {
    if (activeAmbulances.length === 0) return;

    const resolveMissingAddresses = async () => {
      for (const amb of activeAmbulances) {
        if (!amb.latitude || !amb.longitude) continue;

        const prevLat = amb.geocodedLat;
        const prevLng = amb.geocodedLng;
        const needsGeocode = !amb.locationName || 
          !prevLat || !prevLng || 
          Math.abs(amb.latitude - prevLat) > 0.003 || 
          Math.abs(amb.longitude - prevLng) > 0.003;

        if (needsGeocode) {
          try {
            const locName = await reverseGeocode(amb.latitude, amb.longitude);
            if (locName) {
              update(ref(db, `orgData/${safeOrg}/ambulanceTracking/${amb.id}`), {
                locationName: locName,
                geocodedLat: amb.latitude,
                geocodedLng: amb.longitude
              });
            }
          } catch (e) {
            console.error("Geocoding failed for amb:", amb.id, e);
          }
        }
      }
    };

    resolveMissingAddresses();
  }, [activeAmbulances, safeOrg]);

  // 2. Map Rendering Engine (Loads beautiful Leaflet client-side)
  useEffect(() => {
    if (activeSubTab !== 'dispatcher' || !mapContainerRef.current) return;

    // Load Leaflet dynamically to comply with clean build and bypass iframe constraints
    const loadLeafletAssets = () => {
      if ((window as any).L) {
        initLeafletMap();
        return;
      }

      // 1. Inject CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.id = 'leaflet-css';
      document.head.appendChild(link);

      // 2. Inject JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.id = 'leaflet-js';
      script.onload = () => {
        initLeafletMap();
      };
      document.body.appendChild(script);
    };

    const initLeafletMap = () => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;

      // Clear previous map if exists
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      // Default center coordinate targeting Nepal Trishuli/Kathmandu region
      const defaultCenter = [27.7172, 85.3240];
      
      // Initialize interactive map instance
      leafletMapRef.current = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: true
      });

      setLeafletLoaded(true);
    };

    loadLeafletAssets();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      setLeafletLoaded(false);
      leafletTileLayerRef.current = null;
      leafletMarkersRef.current = {};
    };
  }, [activeSubTab]);

  // Effect to handle dynamic tile switching when mapMode changes or Leaflet completes loading
  useEffect(() => {
    const L = (window as any).L;
    if (!leafletMapRef.current || !L || !leafletLoaded) return;

    // Remove current tile layer if it has been registered
    if (leafletTileLayerRef.current) {
      leafletMapRef.current.removeLayer(leafletTileLayerRef.current);
    }

    const tileUrl = mapMode === 'streets' 
      ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      
    const attribution = mapMode === 'streets'
      ? '© OpenStreetMap contributors'
      : 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

    leafletTileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: attribution
    }).addTo(leafletMapRef.current);
  }, [mapMode, leafletLoaded]);

  // Live Sync Firebase coordinates onto the Leaflet Map
  useEffect(() => {
    const L = (window as any).L;
    if (!leafletMapRef.current || !L || activeAmbulances.length === 0) return;

    // Track coordinates list to center map bounds
    const validCoords: any[] = [];

    activeAmbulances.forEach(amb => {
      if (!amb.latitude || !amb.longitude) return;
      const key = amb.id;
      const coord = [amb.latitude, amb.longitude];
      validCoords.push(coord);

      // Status Badge Color for CSS styling in marker leaflet popup
      const statusColor = 
        amb.status === 'idle' ? '#10b981' : 
        amb.status === 'en_route' ? '#ef4444' : 
        amb.status === 'returning' ? '#0ea5e9' : '#eab308';

      const sirenLabel = amb.sirenActive ? '🔔 साइरन सक्रिय छ' : 'साइरन बन्द छ';

      if (leafletMarkersRef.current[key]) {
        // Update existing marker lat/long dynamically for seamless real-time gliding
        leafletMarkersRef.current[key].setLatLng(coord);
        
        // Update popup representation
        const popupHtml = `
          <div class="p-1 font-sans text-slate-805">
            <h5 class="font-bold text-xs m-0 text-slate-900">${amb.name}</h5>
            <p class="text-[10px] m-1 font-bold text-slate-500">चालक: ${amb.driver}</p>
            <p class="text-[10px] m-1 font-mono">गति: <b class="text-rose-500">${amb.speed} Km/hr</b></p>
            <p class="text-[10px] m-1 font-nepali text-teal-600">स्थान: <b>${amb.locationName || 'पहिचान हुँदै...'}</b></p>
            <span class="inline-block text-[9px] px-1.5 py-0.5 mt-1 rounded font-bold text-white bg-[${statusColor}]">${amb.status.toUpperCase()}</span>
          </div>
        `;
        leafletMarkersRef.current[key].getPopup().setContent(popupHtml);

        // Update permanent tooltip content
        const tooltipHtml = `
          <div class="px-2 py-1 text-[10px] text-center font-bold bg-slate-950/95 border border-rose-500/50 text-white rounded-xl shadow-xl font-nepali">
            <span class="text-rose-400 block text-[10px] font-black">${amb.name.split(' (')[0]}</span>
            <span class="text-teal-300 block text-[9px] font-bold">📍 ${amb.locationName || 'खोजिदै...'}</span>
          </div>
        `;
        leafletMarkersRef.current[key].getTooltip().setContent(tooltipHtml);

      } else {
        // Create custom Leaflet icon resembling emergency vehicle
        const customIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div style="
              width: 32px; 
              height: 32px; 
              background-color: ${statusColor}; 
              border: 2.5px solid white; 
              border-radius: 50%; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
              position: relative;
            " class="${amb.sirenActive ? 'animate-pulse' : ''}">
              <span style="color: white; font-size: 14px;">🚑</span>
              ${amb.sirenActive ? `
                <span class="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60 animate-ping"></span>
              ` : ''}
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        // Add Marker
        const marker = L.marker(coord, { icon: customIcon }).addTo(leafletMapRef.current);
        
        // Bind dynamic details popup
        const markerPopup = L.popup().setContent(`
          <div class="p-1 font-sans">
            <h5 class="font-bold text-xs m-0 text-slate-900">${amb.name}</h5>
            <p class="text-[10px] m-1 font-bold text-slate-500 text-slate-600">चालक: ${amb.driver}</p>
            <p class="text-[10px] m-1 font-mono text-cyan-600">गति: <b>${amb.speed} Km/hr</b></p>
            <p class="text-[10px] m-1 font-nepali text-teal-600">स्थान: <b>${amb.locationName || 'पहिचान हुँदै...'}</b></p>
            <p class="text-[10px] m-1 font-bold text-amber-600">${sirenLabel}</p>
          </div>
        `);
        marker.bindPopup(markerPopup);

        // Bind permanent Floating map tooltip for vehicle + place address 
        const tooltipHtml = `
          <div class="px-2 py-1 text-[10px] text-center font-bold bg-slate-950/95 border border-rose-500/50 text-white rounded-xl shadow-xl font-nepali">
            <span class="text-rose-400 block text-[10px] font-black">${amb.name.split(' (')[0]}</span>
            <span class="text-teal-300 block text-[9px] font-bold">📍 ${amb.locationName || 'खोजिदै...'}</span>
          </div>
        `;
        marker.bindTooltip(tooltipHtml, {
          permanent: true,
          direction: 'top',
          offset: [0, -15],
          className: 'custom-tracker-tooltip'
        });

        leafletMarkersRef.current[key] = marker;
      }
    });

    // Dynamically Center map viewport to fit all active mobile GPS trackers automatically
    if (validCoords.length > 0 && selectedAmb) {
      const selectedCoord = [selectedAmb.latitude, selectedAmb.longitude];
      if (selectedCoord[0] && selectedCoord[1]) {
        leafletMapRef.current.panTo(selectedCoord);
      } else {
        const bounds = L.latLngBounds(validCoords);
        leafletMapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [activeAmbulances, selectedAmbulanceId, activeSubTab]);

  // 3. Driver Location Transmitter Code (REAL-TIME GPS SHARING)
  const beginGpsLocationSharing = () => {
    if (!navigator.geolocation) {
      setGpsErrorMsg("नराम्रो समाचार! तपाईंको ब्राउजर वा फोनले GPS लोकेसन सेवा समर्थन गर्दैन।");
      return;
    }

    if (!driverNameInput) {
      alert("कृपया चालकको पूरा नाम प्रविष्ट गर्नुहोस्।");
      return;
    }

    setGpsErrorMsg(null);
    setIsActivelySharing(true);

    const vehicleObj = VEHICLE_TEMPLATES.find(v => v.id === drivingVehicle);
    const vehicleName = vehicleObj ? vehicleObj.name : drivingVehicle;

    // Start native high speed interval tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, accuracy } = position.coords;
        setCurrentGpsCoords({ lat: latitude, lng: longitude, accuracy });

        // Update real position directly to the Firebase database path!
        update(ref(db, `orgData/${safeOrg}/ambulanceTracking/${drivingVehicle}`), {
          id: drivingVehicle,
          name: vehicleName,
          driver: driverNameInput,
          phone: driverPhoneInput || 'संजालमा उपलब्ध छैन',
          latitude: latitude,
          longitude: longitude,
          speed: speed ? Math.round(speed * 3.6) : 0, // convert m/s to km/h
          lastUpdated: Date.now(),
          isActive: true,
          status: 'en_route',
          sirenActive: false,
          batteryLevel: Math.floor(Math.random() * 20) + 75 // Mock dynamic battery tracker
        });
      },
      (error) => {
        console.error("GPS Error Code:", error.code, error.message);
        let errorMsgTxt = "जीपीएस पहुँच गर्न सकिएन।";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsgTxt = "लोकेसन सेयरिङ अनुमति अस्वीकृत! कृपया मोबाइल सेटिंगमा गएर लोकेसन प्रप्स अन गर्नुहोस्।";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsgTxt = "स्थान पहिचान गर्न सकिएन, कृपया खुला आकाश मुनी जानुहोस्।";
        }
        setGpsErrorMsg(errorMsgTxt);
        setIsActivelySharing(false);
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const stopGpsLocationSharing = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    // Mark database record offline/idle
    update(ref(db, `orgData/${safeOrg}/ambulanceTracking/${drivingVehicle}`), {
      isActive: false,
      speed: 0
    });

    setIsActivelySharing(false);
    setCurrentGpsCoords(null);
  };

  // Turn off GPS sharing on unmount to save driver's mobile battery
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Dispatch emergency mission via Firebase 
  const handleDispatchActiveMission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchDestination) return;

    // Send dynamic notification payload via Firebase
    update(ref(db, `orgData/${safeOrg}/ambulanceTracking/${dispatcherSelectedAmbId}`), {
      status: 'en_route',
      currentPatient: dispatchPatient || 'आपतकालीन चिकित्सा सेवा',
      destinationName: dispatchDestination,
      sirenActive: true,
      lastUpdated: Date.now()
    });

    setIsDispatchModalOpen(false);
    setDispatchPatient('');
    setDispatchDestination('');
    alert("द्रुत सूचना: एम्बुलेन्सलाई सफलतापुर्वक गन्तव्यमा चलान गरियो। चालकको मोबाइल स्क्रिनमा अलर्ट पुग्नेछ!");
  };

  // Change status of active vehicle
  const handleStatusChange = (id: string, newState: 'idle' | 'en_route' | 'returning' | 'maintenance') => {
    update(ref(db, `orgData/${safeOrg}/ambulanceTracking/${id}`), {
      status: newState,
      sirenActive: newState === 'en_route',
      currentPatient: newState === 'idle' ? null : undefined,
      destinationName: newState === 'idle' ? null : undefined
    });
  };

  // Force reset or clear specific tracer from dashboard
  const handleRemoveTracer = (id: string) => {
    if (confirm("के तपाईं यो एम्बुलेन्स ट्र्याकर संजालबाट हटाउन चाहनुहुन्छ?")) {
      remove(ref(db, `orgData/${safeOrg}/ambulanceTracking/${id}`));
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 p-4 sm:p-6 space-y-6">
      
      {/* Header telemetry and live status banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h3 className="font-extrabold text-lg sm:text-xl text-slate-100 font-nepali flex items-center gap-2">
              <Locate className="text-rose-500 size-6" />
              वास्तविक समय जीपीएस ट्र्याकिङ नेटवर्क (Real Live GPS Tracking)
            </h3>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm font-medium">
            नेपालकाे जुनसुकै कुनाबाट चालकको मोबाइल मार्फत वास्तविक समय (Live Coordinates) नक्सामा सिधै प्राप्त गर्नुहोस्
          </p>
        </div>

        {/* Outer navigation tab toggler */}
        <div className="flex bg-slate-800 p-1 rounded-xl self-start lg:self-center border border-slate-700/80">
          <button
            onClick={() => setActiveSubTab('dispatcher')}
            className={`px-4 py-2 text-xs font-bold font-nepali rounded-lg flex items-center gap-1.5 transition-all ${
              activeSubTab === 'dispatcher' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Map size={14} />
            <span>लाइभ नक्सा मोनिटर (Live Map)</span>
          </button>
          
          <button
            onClick={() => setActiveSubTab('driver')}
            className={`px-4 py-2 text-xs font-bold font-nepali rounded-lg flex items-center gap-1.5 transition-all ${
              activeSubTab === 'driver' ? 'bg-rose-600 text-white shadow font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone size={14} />
            <span>चालक दर्ता/प्रशारण (Driver GPS App)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('instructions')}
            className={`px-4 py-2 text-xs font-bold font-nepali rounded-lg flex items-center gap-1.5 transition-all ${
              activeSubTab === 'instructions' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle size={14} />
            <span>स्थापना गाईड (Setup Info)</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: Dispatcher Live Map Board */}
      {activeSubTab === 'dispatcher' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* Left: Dynamic Leaflet/OSM map container layout */}
          <div className="xl:col-span-8 space-y-4">
            
            {/* Real Map Frame */}
            <div className="bg-slate-950 rounded-2xl border border-slate-805 relative overflow-hidden min-h-[420px] sm:min-h-[500px]">
              
              {/* Dynamic Overlay labels warning user if leaflets CSS / Internet needs setup */}
              {!leafletLoaded && (
                <div className="absolute inset-0 bg-slate-950/90 z-20 flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <RefreshCw className="animate-spin text-rose-500 size-8" />
                  <p className="font-nepali font-bold text-sm text-slate-300">
                    इन्टरनेटबाट भू-नक्सा लोडिङ हुँदैछ (Loading OpenStreetMap Satellite Maps)...
                  </p>
                  <p className="text-slate-500 text-xs max-w-sm">
                    नक्सा प्रदर्शन गर्न सक्रिय वाइफाइ वा मोबाइल डाटा आवश्यक पर्दछ। यदि इन्टरनेट नभए साइड प्यानलमा Coordinates हेर्न सक्नुहुन्छ।
                  </p>
                </div>
              )}

              {/* Map DOM target mount reference */}
              <div 
                ref={mapContainerRef} 
                className="w-full h-[420px] sm:h-[500px] z-10"
                id="leaflet-gis-map-frame"
              />

              {/* Float Legend panel overlay with Map Mode selectors */}
              <div className="absolute top-3 right-3 z-20 bg-slate-900/95 backdrop-blur border border-slate-700 p-3 rounded-2xl text-[10px] sm:text-xs space-y-3.5 shadow-2xl max-w-[190px]">
                {/* Map Mode Selector */}
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-300 font-nepali block text-center border-b border-slate-800 pb-1.5 text-[11px]">नक्सा प्रकार (Map Layer)</span>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setMapMode('streets')}
                      className={`py-1 px-1.5 rounded-lg text-[9px] font-black font-nepali transition-all text-center leading-none ${
                        mapMode === 'streets'
                          ? 'bg-rose-600 text-white shadow font-extrabold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      साधारण
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapMode('satellite')}
                      className={`py-1 px-1.5 rounded-lg text-[9px] font-black font-nepali transition-all text-center leading-none ${
                        mapMode === 'satellite'
                          ? 'bg-rose-600 text-white shadow font-extrabold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      स्याटेलाइट
                    </button>
                  </div>
                </div>

                {/* Legend Indicator Section */}
                <div className="space-y-1.5 border-t border-slate-800 pt-2.5">
                  <span className="font-bold text-slate-300 font-nepali block text-center border-b border-slate-800 pb-1.5 text-[11px]">अवस्था संकेतक</span>
                  <div className="space-y-1.5 font-nepali text-[9px] sm:text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span>तैनाथ (Idle)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 animate-pulse"></span>
                      <span>बिरामी बोकेको</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0"></span>
                      <span>फर्किँदै (Returning)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Live Alert terminal logs */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-805 space-y-1">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 font-mono">Real-time GPS Diagnostic Logs</span>
              <div className="text-[11px] font-mono text-slate-300 space-y-1.5">
                {activeAmbulances.map((amb) => {
                  const formatTime = new Date(amb.lastUpdated).toLocaleTimeString('ne-NP', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={amb.id} className="flex justify-between items-center border-b border-slate-900 pb-1">
                      <span className="font-nepali text-rose-400">⏱️ {formatTime} - {amb.name}</span>
                      <span className="text-slate-400">
                        LAT: <b className="text-white">{amb.latitude.toFixed(5)}</b>, LNG: <b className="text-white">{amb.longitude.toFixed(5)}</b>
                      </span>
                      <span className="text-cyan-400">{amb.speed} Km/h</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Panel: Side vehicle monitor dashboard */}
          <div className="xl:col-span-4 space-y-6">
            
            {/* Active Connected Trackers list */}
            <div className="bg-slate-850 p-4 sm:p-5 rounded-2xl border border-slate-750 space-y-4">
              <span className="text-xs uppercase font-black text-rose-400 tracking-wider font-nepali block">
                🔴 अनलाईन एम्बुलेन्सहरू ({activeAmbulances.length})
              </span>

              {activeAmbulances.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  सक्रिय चालकहरू कोही छैन। चलाउन चालक मोर्ड अन्तर्गत दर्ता सुरु गर्नुहोस्।
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {activeAmbulances.map(amb => (
                    <div 
                      key={amb.id}
                      onClick={() => setSelectedAmbulanceId(amb.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedAmbulanceId === amb.id 
                          ? 'bg-slate-900 border-rose-500/80 shadow-md ring-1 ring-rose-500/30' 
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between pointer-events-none">
                        <div className="flex items-center gap-2">
                          <Truck className={`size-4 ${amb.status === 'en_route' ? 'text-rose-500 animate-bounce' : 'text-slate-400'}`} />
                          <span className="text-xs font-black font-mono text-slate-100">{amb.name.split(' (')[0]}</span>
                        </div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                          amb.status === 'idle' ? 'bg-emerald-500/20 text-emerald-400' :
                          amb.status === 'en_route' ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-sky-500/20 text-sky-400'
                        }`}>
                          {amb.status === 'idle' ? 'मिसन छैन' : amb.status === 'en_route' ? 'बिरामी' : 'फर्कदै'}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-nepali pointer-events-none">
                        <span>चालक: {amb.driver}</span>
                        <span className="font-mono text-cyan-400 font-bold">{amb.speed} km/h</span>
                      </div>

                      {amb.locationName && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-teal-400 font-nepali pointer-events-none bg-slate-950/40 px-1 py-0.5 rounded border border-slate-800/40">
                          <MapPin size={10} className="shrink-0 text-rose-500" />
                          <span className="truncate">{amb.locationName}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Vehicle Control Center */}
            {selectedAmb && (
              <div className="bg-slate-850 p-5 rounded-2xl border border-slate-755 space-y-4">
                <div className="border-b border-slate-750 pb-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 font-nepali block">चयन गरिएको गाडीको विवरण</span>
                  <p className="text-sm font-black text-slate-100 font-mono">{selectedAmb.name}</p>
                </div>

                <div className="space-y-3 text-xs font-nepali">
                  {selectedAmb.locationName && (
                    <div className="flex justify-between items-start gap-2 bg-slate-950/40 p-2 rounded-xl border border-slate-800">
                      <span className="text-slate-400 shrink-0">📍 हालको ठेगाना:</span>
                      <span className="text-teal-300 font-bold text-right break-words">{selectedAmb.locationName}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-slate-400">चालक फोन नम्बर (Call Driver):</span>
                    <a href={`tel:${selectedAmb.phone}`} className="text-teal-400 font-bold hover:underline flex items-center gap-1">
                      <Phone size={12} /> {selectedAmb.phone}
                    </a>
                  </div>

                  <div className="flex justify-between font-mono">
                    <span className="text-slate-400 font-nepali">जीपीएस स्थान (Coordinates):</span>
                    <span className="text-sky-300 font-bold">{selectedAmb.latitude.toFixed(5)}°, {selectedAmb.longitude.toFixed(5)}°</span>
                  </div>

                  {selectedAmb.currentPatient && (
                    <div className="bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/30 text-[11px] space-y-1">
                      <p className="text-rose-400 font-bold">🎯 सक्रिय मिशन (Active Case):</p>
                      <p className="text-slate-100 italic">बिरामी: {selectedAmb.currentPatient}</p>
                      <p className="text-slate-300">रुट: {selectedAmb.destinationName}</p>
                    </div>
                  )}

                  {/* Manual Status Overrides for dispatch dispatcher */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">अवस्था परिवर्तन (Change Status)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleStatusChange(selectedAmb.id, 'idle')}
                        className={`py-1 rounded text-[10px] font-bold ${selectedAmb.status === 'idle' ? 'bg-emerald-600 text-white' : 'bg-slate-900 hover:bg-slate-800'}`}
                      >
                        तयार अवस्था (Idle)
                      </button>
                      
                      <button
                        onClick={() => handleStatusChange(selectedAmb.id, 'returning')}
                        className={`py-1 rounded text-[10px] font-bold ${selectedAmb.status === 'returning' ? 'bg-sky-600 text-white' : 'bg-slate-900 hover:bg-slate-800'}`}
                      >
                        फर्किँदै (Returning)
                      </button>

                      <button
                        onClick={() => handleStatusChange(selectedAmb.id, 'maintenance')}
                        className={`py-1 rounded text-[10px] font-bold ${selectedAmb.status === 'maintenance' ? 'bg-amber-600 text-white' : 'bg-slate-900 hover:bg-slate-800'}`}
                      >
                        मर्मत (Repair)
                      </button>

                      <button
                        onClick={() => {
                          setDispatcherSelectedAmbId(selectedAmb.id);
                          setIsDispatchModalOpen(true);
                        }}
                        className="py-1 rounded text-[10px] font-black bg-rose-600 text-white hover:bg-rose-700"
                      >
                        द्रुत चलान (Dispatch)
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveTracer(selectedAmb.id)}
                      className="w-full text-center text-slate-500 hover:text-rose-400 mt-2 text-[10px] font-bold"
                    >
                      त्र्याकिङ बन्द वा संजालबाट कट्टा हटाउनुहोस्
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>
      )}

      {/* SUB-TAB 2: Driver High Accuracy GPS Link */}
      {activeSubTab === 'driver' && (
        <div className="max-w-xl mx-auto bg-slate-850 p-6 rounded-3xl border border-slate-750 space-y-6">
          <div className="text-center space-y-2 pb-2 border-b border-slate-850">
            <Smartphone className="inline-block text-rose-500 size-12" />
            <h4 className="font-extrabold text-base sm:text-lg font-nepali">
              चालक जीपीएस प्रसारण सुविधाह (Driver Dashboard Panel)
            </h4>
            <p className="text-xs text-slate-400">
              यो शाखा एम्बुलेन्स चलाउने चालकले आफ्नो मोबाइलमा खोलेर लोकेसन बटन थिची गाडीलाई संजालमा जोड्न प्रयोग गर्नुपर्दछ।
            </p>
          </div>

          <div className="space-y-4">
            
            {/* Template selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 font-nepali">एम्बुलेन्स / गाडी रोज्नुहोस् (Select Vehicle)</label>
              <select
                disabled={isActivelySharing}
                value={drivingVehicle}
                onChange={e => setDrivingVehicle(e.target.value)}
                className="w-full bg-slate-900 text-white border border-slate-800 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
              >
                {VEHICLE_TEMPLATES.map(tmpl => (
                  <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                ))}
              </select>
            </div>

            {/* Input Driver metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 font-nepali">चालकको नाम (Driver Name)</label>
                <input
                  type="text"
                  disabled={isActivelySharing}
                  placeholder="उदा: हरि तामाङ"
                  value={driverNameInput}
                  onChange={e => setDriverNameInput(e.target.value)}
                  className="w-full bg-slate-900 text-white border border-slate-800 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 font-nepali">सम्पर्क फोन (Driver Mobile)</label>
                <input
                  type="tel"
                  disabled={isActivelySharing}
                  placeholder="उदा: ९८५१XXXXXX"
                  value={driverPhoneInput}
                  onChange={e => setDriverPhoneInput(e.target.value)}
                  className="w-full bg-slate-900 text-white border border-slate-800 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50 font-semibold"
                />
              </div>
            </div>

            {/* Action Big Button */}
            <div className="pt-4">
              {isActivelySharing ? (
                <button
                  onClick={stopGpsLocationSharing}
                  className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm font-nepali flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all animate-pulse"
                >
                  <Navigation className="animate-spin" size={17} />
                  <span>लाइभ लोकेसन सेयर भइरहेको छ [बन्द गर्न थिच्नुहोस्]</span>
                </button>
              ) : (
                <button
                  onClick={beginGpsLocationSharing}
                  className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm font-nepali flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                >
                  <Radio className="animate-bounce" size={17} />
                  <span>लोकेसन सेयर सुरु गर्नुहोस् (Start GPS Broadcast)</span>
                </button>
              )}
            </div>

            {/* Local GPS metadata readout feedback for drivers */}
            {currentGpsCoords && (
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold font-nepali">
                  <CheckCircle2 size={14} />
                  <span>तपाईंको फोनको GPS सफलतापूर्वक संजालसँग जोडिएको छ!</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 font-mono">
                  <span>LAT: {currentGpsCoords.lat.toFixed(6)}°</span>
                  <span>LNG: {currentGpsCoords.lng.toFixed(6)}°</span>
                  <span>ACCURACY: ±{Math.round(currentGpsCoords.accuracy)} मिटर</span>
                  <span>STATUS: प्रसारण भइरहेको छ (Broadcasting)</span>
                </div>
              </div>
            )}

            {/* Error logs */}
            {gpsErrorMsg && (
              <div className="bg-rose-950/40 p-4 rounded-xl border border-rose-900/30 text-xs text-rose-300 flex items-center gap-2 font-nepali">
                <AlertCircle className="shrink-0 text-rose-400" size={18} />
                <span>{gpsErrorMsg}</span>
              </div>
            )}

          </div>
        </div>
      )}

      {/* SUB-TAB 3: Prerequisite checklists */}
      {activeSubTab === 'instructions' && (
        <div className="max-w-2xl mx-auto bg-slate-850 p-6 sm:p-8 rounded-3xl border border-slate-750 space-y-6">
          <div className="text-center space-y-1">
            <Compass className="inline-block text-rose-500 size-12" />
            <h4 className="font-extrabold text-lg font-nepali text-slate-100">
              वास्तविक मोबाइल ट्र्याकिङ सुरु गर्ने तरिका (System Setup Guide)
            </h4>
            <p className="text-xs text-slate-400">
              एम्बुलेन्स वा सरकारी गाडीहरूमा यो सेवालाई कसरी सहजै जोड्ने र सञ्चालन गर्ने भन्ने जानकारी
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 font-nepali">
            
            {/* Step 1 */}
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-rose-400 font-bold shrink-0 font-mono border border-slate-700">
                1
              </div>
              <div className="space-y-1">
                <h5 className="font-bold text-slate-100 font-nepali">चालकको फोनमा लिङ्क खोल्ने (Open Link on mobile):</h5>
                <p className="text-xs text-slate-400">
                  यो स्वास्थ्य वेब-एपलाई चालकको स्मार्टफोन (एन्ड्रोइड वा आईफोन) को ब्राउजर (जस्तै Google Chrome वा Safari) मा खोल्नुहोस् र लगइन गरी "एम्बुलेन्स सेवा" खण्डको "लाइभ ट्र्याकिङ" ट्याबमा जानुहोस्।
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-rose-400 font-bold shrink-0 font-mono border border-slate-700">
                2
              </div>
              <div className="space-y-1">
                <h5 className="font-bold text-slate-100 font-nepali">लोकेसन शेयरिङ अनुमति (Allow Geolocation):</h5>
                <p className="text-xs text-slate-400">
                  चालकले "लोकेसन सेयर सुरु गर्नुहोस्" थिच्दा मोबाइलको स्क्रिनमा स्थान साझा गर्ने अनुमति माग्छ, त्यहाँ **Allow/स्वीकार गर्नुहोस्** बटन थिच्न अनिवार्य छ।
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-rose-400 font-bold shrink-0 font-mono border border-slate-700">
                3
              </div>
              <div className="space-y-1">
                <h5 className="font-bold text-slate-100 font-nepali">एकीकृत डाटाबेस ड्यासबोर्ड (Real-time Firebase Sync):</h5>
                <p className="text-xs text-slate-400">
                  तपाईंको आफ्नो संस्थाको सुरक्षित नामस्पेश (`orgData/${safeOrg}/ambulanceTracking`) भएकाले डाटा संकलन उच्च गतिमा हुन्छ र डेस्क मोनिटर अथवा स्वास्थ्य विभागको मुख्य स्क्रिनमा एम्बुलेन्स गुडिरहेको प्रत्यक्ष देखिन्छ।
                </p>
              </div>
            </div>

            {/* Quick tips box */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
              <h5 className="font-bold text-teal-400 text-xs flex items-center gap-1">
                💡 मुख्य फाइदाहरू र टिप्स (Important Tips for Best Results)
              </h5>
              <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                <li>ड्राइभरको फोनमा सधैँ जीपीएस (Location Services) अन राख्नुहोस्।</li>
                <li>फोनको स्क्रिन सधैं खुला राखिराख्नु पर्दैन, मिनिमाइज गर्दापनि पृष्ठभूमि (Background tracking) अपडेट भइरहन्छ।</li>
                <li>वाइफाइ नभएको विकट क्षेत्रहरूमा सामान्य Ncell वा NTC को डाटा प्याकेजले समेत विना झन्झट सिङ्क्रोनाइजेसन हुन्छ।</li>
                <li>यो पूर्णतया सुरक्षित र तपाईंकै संस्थाको निजी फायरबेस क्लाउड डेटाबेसमा आधारित छ।</li>
              </ul>
            </div>

          </div>
        </div>
      )}

      {/* EMERGENCY ACTIVE DISPATCH DRAWER / MODAL OVERLAY */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative text-left text-slate-100">
            <h4 className="text-md font-black text-rose-500 border-b border-slate-800 pb-2 mb-4 flex items-center gap-2 font-nepali">
              <ShieldAlert className="animate-pulse text-rose-500" size={18} />
              नयाँ आपतकालीन सेवा चलान (EMERGENCY DISPATCH MISSION)
            </h4>

            <form onSubmit={handleDispatchActiveMission} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 font-nepali">बिरामीको नाम (Patient Name)</label>
                <input
                  type="text"
                  required
                  placeholder="उदा: सुशिला के.सी."
                  value={dispatchPatient}
                  onChange={e => setDispatchPatient(e.target.value)}
                  className="w-full text-slate-100 bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 font-nepali">कुन ठाउँ पठाउने (Destination Route)</label>
                <input
                  type="text"
                  required
                  placeholder="उदा: वडा नं ४, पीपलचौतारी"
                  value={dispatchDestination}
                  onChange={e => setDispatchDestination(e.target.value)}
                  className="w-full text-slate-100 bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="flex-1 font-bold text-xs bg-slate-800 text-slate-300 py-3 rounded-xl hover:bg-slate-750"
                >
                  रद्द (Cancel)
                </button>
                
                <button
                  type="submit"
                  className="flex-1 font-bold text-xs bg-rose-600 text-white py-3 rounded-xl hover:bg-rose-700 shadow-md font-black"
                >
                  मार्ग चलान (Dispatch)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
