import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, safeEncodeKey, safeDecodeKey } from '../firebase';
import { ref, get, set } from 'firebase/database';
import { Save, Printer, ClipboardList, Settings, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE } from './ChildImmunizationRegistration';
import { toNepaliNumber } from './nepaliUtils';

interface MicroplanningProps {
  currentFiscalYear: string;
  bachhaRecords: any[];
  maternalRecords?: any[];
  generalSettings?: any;
  allUsers?: any[];
  currentUser?: any;
  activeOrgName?: string;
  onSetActiveOrgName?: (orgName: string) => void;
}

const TARGET_ITEMS = [
  { id: 'target_0_11', label: 'लक्षित संख्या ०-११ महिना (लक्ष्य १ वर्षमुनि)' },
  { id: 'target_penta_avg', label: 'पेन्टा १ को ३ वर्षको सरदर प्रगति (Penta 1 Avg)' },
  { id: 'target_12_23', label: 'लक्षित संख्या १२-२३ महिना' },
  { id: 'target_pregnant', label: 'अपेक्षित गर्भवती संख्या' },
  { id: 'target_session_count', label: 'वार्षिक खोप सेसन संख्या' },
  { id: 'local_level', label: 'स्थानीय तह (Local Level)', type: 'text' },
  { id: 'ward_no', label: 'वडा नं (Ward No)', type: 'text' },
];

const NEPALI_MONTHS = [
  { id: '04', label: 'श्रावण', labelEn: 'Shrawan' },
  { id: '05', label: 'भाद्र', labelEn: 'Bhadra' },
  { id: '06', label: 'असोज', labelEn: 'Ashwin' },
  { id: '07', label: 'कार्तिक', labelEn: 'Kartik' },
  { id: '08', label: 'मंसिर', labelEn: 'Mangsir' },
  { id: '09', label: 'पुष', labelEn: 'Poush' },
  { id: '10', label: 'माघ', labelEn: 'Magh' },
  { id: '11', label: 'फागुन', labelEn: 'Falgun' },
  { id: '12', label: 'चैत्र', labelEn: 'Chaitra' },
  { id: '01', label: 'बैशाख', labelEn: 'Baishakh' },
  { id: '02', label: 'जेठ', labelEn: 'Jestha' },
  { id: '03', label: 'असार', labelEn: 'Ashad' },
];

const FORM3_VACCINES = [
  { id: 'bcg', label: 'BCG' },
  { id: 'rota', label: 'Rota' },
  { id: 'bopv', label: 'bOPV' },
  { id: 'fipv', label: 'fIPV' },
  { id: 'pcv', label: 'PCV' },
  { id: 'penta', label: 'Penta' },
  { id: 'mr', label: 'MR' },
  { id: 'typhoid', label: 'Typhoid' },
  { id: 'je', label: 'JE' },
  { id: 'td', label: 'Td' },
];

const FORM3_MATERIALS = [
  { id: 's005', label: '0.05ml Ad' },
  { id: 's05', label: '0.5ml Ad' },
  { id: 's01', label: '0.1ml Ad' },
  { id: 's2', label: '2ml diluent syringe' },
  { id: 's5', label: '5ml diluent syringe' },
  { id: 'fid', label: 'FID card' },
];

const THREE_YEAR_ROWS = [
  { id: 'bcg', vaccine: 'बि.सि.जि.', dose: 'एक मात्रा', defaultKey: 'bcg', remark: 'स्वास्थ्य संस्थाको ३ वर्षको बि.सि.जि. खोपको सरदर प्रगतिबाट ०.०५ एम.एल.को सिरिन्ज मासिक र वार्षिक अनुमान गर्ने तर बि.सि.जि खोप प्रति सेसन कम्तिमा १ भायल र आवश्यकता अनुसार थप भायल समेत राखि योजना बनाउने ।' },
  { id: 'rota_1', vaccine: 'रोटा', dose: 'पहिली मात्रा', defaultKey: 'rota1', remark: 'यो खोपको पेन्टा १ को सरदर प्रगतिको आधारमा वा दिएको लक्षित संख्या मिल्ने भएमा सोही अनुसार खोप आपूर्ति योजना बनाउने ।' },
  { id: 'rota_2', vaccine: '', dose: 'दोश्रो मात्रा', defaultKey: 'rota2', remark: '' },
  { id: 'polio_1', vaccine: 'पोलियो', dose: 'पहिली मात्रा', defaultKey: 'opv1', remark: 'यो खोप बहुमात्रा खोप नीतिको भएकाले यो खोप पनि पेन्टा १ को ३ वर्षको सरदर प्रगति वा लक्ष्य मध्येमा लक्ष्य वाट खोप आवश्यकता निर्धारण गरि माग आपूर्ति योजना बनाउने । यो सरदर संख्या र दिएको लक्षित संख्यामा धेरै फरक (१० प्रतिशत भन्दा धेरै) भएमा यो सरदर संख्यालाई आधार मान्नु उपयुक्त हुन्छ ।' },
  { id: 'polio_2', vaccine: '', dose: 'दोश्रो मात्रा', defaultKey: 'opv2', remark: '' },
  { id: 'polio_3', vaccine: '', dose: 'तेस्रो मात्रा', defaultKey: 'opv3', remark: '' },
  { id: 'fipv_1', vaccine: 'एफ.आइ.पि.भि.', dose: 'पहिली मात्रा', defaultKey: 'fipv1', remark: 'यो खोप हाल प्रति सेसन १ भायलको दरले र खोप सेसनमा २ मात्रा लगाउने बच्चा ५ जना भन्दा धेरै भएमा थप भायल माग गरेर आपूर्ति योजना बनाउने ।' },
  { id: 'fipv_2', vaccine: '', dose: 'दोश्रो मात्रा', defaultKey: 'fipv2', remark: '' },
  { id: 'pcv_1', vaccine: 'पि. सि. भि.', dose: 'पहिली मात्रा', defaultKey: 'pcv1', remark: 'यो खोप बहुमात्रा खोप नीतिको भएकाले यो खोप पनि पेन्टा १ को ३ वर्षको सरदर प्रगति वा लक्ष्य मध्येमा लक्ष्य वाट खोप आवश्यकता निर्धारण गरि माग आपूर्ति योजना बनाउने । यो सरदर संख्या र दिएको लक्षित संख्यामा धेरै फरक (१० प्रतिशत भन्दा धेरै) भएमा यो सरदर संख्यालाई आधार मान्नु उपयुक्त हुन्छ ।' },
  { id: 'pcv_2', vaccine: '', dose: 'दोश्रो मात्रा', defaultKey: 'pcv2', remark: '' },
  { id: 'pcv_3', vaccine: '', dose: 'तेस्रो मात्रा', defaultKey: 'pcv3', remark: '' },
  { id: 'dpt_1', vaccine: 'डिपिटी हेप वी हिब', dose: 'पहिली मात्रा', defaultKey: 'dpt1', remark: 'यो खोप पनि बहुमात्रा खोप नीतिको भएकाले खोपको ३ वर्षको ३ वटै मात्राको सरदर प्रगतिबाट मासिक खोप डोज कार्यको आधारमा खोप आवश्यकता निर्धारण गरि माग आपूर्ति योजना बनाउने । यो सरदर संख्या र दिएको लक्षित संख्यामा धेरै फरक (१० प्रतिशत भन्दा धेरै) भएमा यो सरदर संख्यालाई आधार मान्नु उपयुक्त हुन्छ ।' },
  { id: 'dpt_2', vaccine: '', dose: 'दोश्रो मात्रा', defaultKey: 'dpt2', remark: '' },
  { id: 'dpt_3', vaccine: '', dose: 'तेस्रो मात्रा', defaultKey: 'dpt3', remark: '' },
  { id: 'mr_1', vaccine: 'दादुरा रुवेला', dose: 'पहिली मात्रा', defaultKey: 'mr1', remark: 'दादुरा र जे.ई खोप वितरण योजना गर्दा कम्तिमा १ केन्द्रको लागि १ भायल र लक्षित जन संख्याको आधारमा स्वास्थ्य संस्था/ स्वास्थ्यकर्मीसँग समन्वय गरि खोप केन्द्र स्तरको वास्तविक आवश्यकताको आधारमा थप भायलको व्यवस्था गर्ने ।' },
  { id: 'mr_2', vaccine: '', dose: 'दोश्रो मात्रा', defaultKey: 'mr2', remark: '' },
  { id: 'je', vaccine: 'जे. ई.', dose: 'एक मात्रा', defaultKey: 'je', remark: 'दादुरा र जे.ई खोप वितरण योजना गर्दा कम्तिमा १ केन्द्रको लागि १ भायल र लक्षित जन संख्याको आधारमा स्वास्थ्य संस्था/ स्वास्थ्यकर्मीसँग समन्वय गरि खोप केन्द्र स्तरको वास्तविक आवश्यकताको आधारमा थप भायलको व्यवस्था गर्ने ।' },
  { id: 'typhoid', vaccine: 'टाइफाइड', dose: 'एक मात्रा', defaultKey: 'typhoid', remark: 'यो खोप पेन्टा १ को ३ वर्षको सरदर प्रगतिको आधारमा खेर जाने दर १५ प्रतिशत थप गरी माग अनुमान गर्ने' },
  { id: 'hpv', vaccine: 'एच.पि.भि.', dose: 'एक मात्रा', defaultKey: 'hpv', remark: 'यो खोप प्रत्येक वर्ष विद्यालय बाट कक्षा ५ को छात्राहरुको संख्यागत विवरण लिएर मात्र सो संख्याको आधारमा खेर जाने दर ५ प्रतिशत थप गरी अनुमान गर्ने' },
  { id: 'td_1', vaccine: 'टी. डी.', dose: 'पहिली मात्रा', defaultKey: 'td1', remark: 'यो खोप बहुमात्रा खोप नीतिको अन्तर्गत भएकोले Td खोपको ३ वर्षको ३ वटै मात्राको सरदर प्रगति जोडेर सो लाई ३ ले भाग गरि लक्षित संख्या मानि सरदर ३ मात्रा लगाउने आधारमा मासिक आवश्यकता निर्धारण गर्ने' },
  { id: 'td_2', vaccine: '', dose: 'दोश्रो मात्रा', defaultKey: 'td2', remark: '' },
  { id: 'td_3', vaccine: 'तेस्रो मात्रा वा सो भन्दा बढी', defaultKey: 'td_booster', remark: '' }
];

export const Microplanning: React.FC<MicroplanningProps> = ({ 
  currentFiscalYear, 
  bachhaRecords = [], 
  maternalRecords = [], 
  generalSettings,
  allUsers = [],
  currentUser,
  activeOrgName,
  onSetActiveOrgName
}) => {
  const [activeTab, setActiveTab] = useState<'targets' | 'report' | 'annual' | 'report3' | 'report4' | 'report5' | 'report6'>('report');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(currentFiscalYear);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // Compile list of available organizations (sansthas)
  const sansthaList = useMemo(() => {
    if (!isSuperAdmin) {
      const own = currentUser?.organizationName || generalSettings?.orgNameNepali || 'स्वास्थ्य संस्था';
      return [own];
    }
    const list = (allUsers || [])
      .map(u => u.organizationName)
      .filter(Boolean);
    if (currentUser?.organizationName) list.push(currentUser.organizationName);
    if (generalSettings?.orgNameNepali) list.push(generalSettings.orgNameNepali);
    if (generalSettings?.orgNameEnglish) list.push(generalSettings.orgNameEnglish);
    const unique = Array.from(new Set(list)).sort();
    if (unique.length === 0) {
      unique.push('स्वास्थ्य संस्था');
    }
    return unique;
  }, [allUsers, currentUser, generalSettings, isSuperAdmin]);

  const [selectedSanstha, setSelectedSanstha] = useState<string>(() => {
    if (!isSuperAdmin) {
      return currentUser?.organizationName || generalSettings?.orgNameNepali || 'स्वास्थ्य संस्था';
    }
    return activeOrgName || currentUser?.organizationName || generalSettings?.orgNameNepali || sansthaList[0] || 'स्वास्थ्य संस्था';
  });

  useEffect(() => {
    if (!isSuperAdmin) {
      setSelectedSanstha(currentUser?.organizationName || generalSettings?.orgNameNepali || 'स्वास्थ्य संस्था');
    } else if (activeOrgName && activeOrgName !== 'All') {
      setSelectedSanstha(activeOrgName);
    }
  }, [activeOrgName, isSuperAdmin, currentUser, generalSettings]);

  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [localBachhaRecords, setLocalBachhaRecords] = useState<any[]>([]);
  const [localMaternalRecords, setLocalMaternalRecords] = useState<any[]>([]);

  const [targets, setTargets] = useState<Record<string, string>>({});
  const [centerTargets, setCenterTargets] = useState<Record<string, { target_0_11?: string; target_12_23?: string; target_pregnant?: string }>>({});
  const [form3Data, setForm3Data] = useState<Record<string, Record<string, string>>>({});
  const [form4Data, setForm4Data] = useState<Record<string, Record<string, string>>>({});
  const [form5Data, setForm5Data] = useState<Record<string, { y1?: string; y2?: string; y3?: string; remark?: string }>>({});
  const [form6Data, setForm6Data] = useState<Record<string, Record<string, string>>>({});
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const safeSansthaKey = safeEncodeKey(selectedSanstha);
        const pathPrefix = `microplanning/${safeSansthaKey}`;

        // 1. Fetch children records of the selected sanstha
        const childrenSnap = await get(ref(db, `orgData/${safeSansthaKey}/bachhaImmunizationRecords`));
        if (childrenSnap.exists()) {
          const data = childrenSnap.val();
          const list = Object.keys(data).map(k => ({ ...data[k], id: k }));
          setLocalBachhaRecords(list);
        } else {
          // Fallback to prop if selected matches the user's primary org, else empty
          if (currentUser?.organizationName === selectedSanstha || generalSettings?.orgNameNepali === selectedSanstha) {
            setLocalBachhaRecords(bachhaRecords);
          } else {
            setLocalBachhaRecords([]);
          }
        }

        // 2. Fetch pregnancy/maternal records of the selected sanstha
        const maternalSnap = await get(ref(db, `orgData/${safeSansthaKey}/garbhawatiPatients`));
        if (maternalSnap.exists()) {
          const data = maternalSnap.val();
          const list = Object.keys(data).map(k => ({ ...data[k], id: k }));
          setLocalMaternalRecords(list);
        } else {
          // Fallback to prop if selected matches the user's primary org, else empty
          if (currentUser?.organizationName === selectedSanstha || generalSettings?.orgNameNepali === selectedSanstha) {
            setLocalMaternalRecords(maternalRecords);
          } else {
            setLocalMaternalRecords([]);
          }
        }

        // 3. Targets loading (with fallback to legacy global path if not found)
        let snapshot = await get(ref(db, `${pathPrefix}/targets/${selectedFiscalYear.replace('/', '_')}`));
        if (!snapshot.exists()) {
          snapshot = await get(ref(db, `microplanning/targets/${selectedFiscalYear.replace('/', '_')}`));
        }
        if (snapshot.exists()) {
          setTargets(snapshot.val());
        } else {
          // Defaults if no target configured
          setTargets({
            target_0_11: '111',
            target_12_23: '102',
            target_pregnant: '121',
            target_penta_avg: '111',
            target_session_count: '11',
            local_level: generalSettings?.localLevel || 'चौदण्डीगढी न.पा.',
            ward_no: '०७',
          });
        }

        // 4. Center targets loading
        let centerSnapshot = await get(ref(db, `${pathPrefix}/center_targets/${selectedFiscalYear.replace('/', '_')}`));
        if (!centerSnapshot.exists()) {
          centerSnapshot = await get(ref(db, `microplanning/center_targets/${selectedFiscalYear.replace('/', '_')}`));
        }
        if (centerSnapshot.exists()) {
          setCenterTargets(centerSnapshot.val());
        } else {
          setCenterTargets({});
        }

        // 5. Form 3 loading
        let form3Snapshot = await get(ref(db, `${pathPrefix}/form3/${selectedFiscalYear.replace('/', '_')}`));
        if (!form3Snapshot.exists()) {
          form3Snapshot = await get(ref(db, `microplanning/form3/${selectedFiscalYear.replace('/', '_')}`));
        }
        if (form3Snapshot.exists()) {
          setForm3Data(form3Snapshot.val());
        } else {
          setForm3Data({});
        }

        // 6. Form 4 loading
        let form4Snapshot = await get(ref(db, `${pathPrefix}/form4/${selectedFiscalYear.replace('/', '_')}`));
        if (!form4Snapshot.exists()) {
          form4Snapshot = await get(ref(db, `microplanning/form4/${selectedFiscalYear.replace('/', '_')}`));
        }
        if (form4Snapshot.exists()) {
          setForm4Data(form4Snapshot.val());
        } else {
          setForm4Data({});
        }

        // 7. Form 5 loading
        let form5Snapshot = await get(ref(db, `${pathPrefix}/form5/${selectedFiscalYear.replace('/', '_')}`));
        if (!form5Snapshot.exists()) {
          form5Snapshot = await get(ref(db, `microplanning/form5/${selectedFiscalYear.replace('/', '_')}`));
        }
        if (form5Snapshot.exists()) {
          setForm5Data(form5Snapshot.val());
        } else {
          setForm5Data({});
        }

        // 8. Form 6 loading
        let form6Snapshot = await get(ref(db, `${pathPrefix}/form6/${selectedFiscalYear.replace('/', '_')}`));
        if (!form6Snapshot.exists()) {
          form6Snapshot = await get(ref(db, `microplanning/form6/${selectedFiscalYear.replace('/', '_')}`));
        }
        if (form6Snapshot.exists()) {
          setForm6Data(form6Snapshot.val());
        } else {
          setForm6Data({});
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, [selectedFiscalYear, generalSettings, selectedSanstha, bachhaRecords, maternalRecords, currentUser]);

  const handleSave = async () => {
    try {
      const safeSansthaKey = safeEncodeKey(selectedSanstha);
      const pathPrefix = `microplanning/${safeSansthaKey}`;
      await set(ref(db, `${pathPrefix}/targets/${selectedFiscalYear.replace('/', '_')}`), targets);
      await set(ref(db, `${pathPrefix}/center_targets/${selectedFiscalYear.replace('/', '_')}`), centerTargets);
      alert('लक्ष्य विवरण सुरक्षित गरियो!');
      setIsSetupModalOpen(false);
    } catch (err) {
      alert('बचत गर्न असफल भयो: ' + err);
    }
  };

  const handleSaveForm3 = async () => {
    setLoading(true);
    try {
      const safeSansthaKey = safeEncodeKey(selectedSanstha);
      const pathPrefix = `microplanning/${safeSansthaKey}`;
      await set(ref(db, `${pathPrefix}/form3/${selectedFiscalYear.replace('/', '_')}`), form3Data);
      alert('फारम नं. ३ को डाटा सफलतापूर्वक सुरक्षित गरियो!');
      setIsEditMode(false);
    } catch (err) {
      alert('बचत गर्न असफल भयो: ' + err);
    }
    setLoading(false);
  };

  const handleSaveForm4 = async () => {
    setLoading(true);
    try {
      const safeSansthaKey = safeEncodeKey(selectedSanstha);
      const pathPrefix = `microplanning/${safeSansthaKey}`;
      await set(ref(db, `${pathPrefix}/form4/${selectedFiscalYear.replace('/', '_')}`), form4Data);
      alert('फारम नं. ४ को डाटा सफलतापूर्वक सुरक्षित गरियो!');
      setIsEditMode(false);
    } catch (err) {
      alert('बचत गर्न असफल भयो: ' + err);
    }
    setLoading(false);
  };

  const handleSaveForm5 = async () => {
    setLoading(true);
    try {
      const safeSansthaKey = safeEncodeKey(selectedSanstha);
      const pathPrefix = `microplanning/${safeSansthaKey}`;
      await set(ref(db, `${pathPrefix}/form5/${selectedFiscalYear.replace('/', '_')}`), form5Data);
      alert('फारम नं. ५ को डाटा सफलतापूर्वक सुरक्षित गरियो!');
      setIsEditMode(false);
    } catch (err) {
      alert('बचत गर्न असफल भयो: ' + err);
    }
    setLoading(false);
  };

  const handleSaveForm6 = async () => {
    setLoading(true);
    try {
      const safeSansthaKey = safeEncodeKey(selectedSanstha);
      const pathPrefix = `microplanning/${safeSansthaKey}`;
      await set(ref(db, `${pathPrefix}/form6/${selectedFiscalYear.replace('/', '_')}`), form6Data);
      alert('फारम नं. ६ को डाटा सफलतापूर्वक सुरक्षित गरियो!');
      setIsEditMode(false);
    } catch (err) {
      alert('बचत गर्न असफल भयो: ' + err);
    }
    setLoading(false);
  };

  // Compute the Raw Data HF level (Monthly Form 1)
  const reportData = useMemo(() => {
    // Initialize monthly structure
    const data: Record<string, Record<string, number>> = {};
    NEPALI_MONTHS.forEach(m => {
      data[m.id] = {
        // Targets (computed)
        target_0_11: 0,
        target_penta_avg: 0,
        target_12_23: 0,
        target_pregnant: 0,
        
        // Vaccines
        bcg: 0,
        rota1: 0,
        rota2: 0,
        opv1: 0,
        opv2: 0,
        opv3: 0,
        fipv1: 0,
        fipv2: 0,
        pcv1: 0,
        pcv2: 0,
        pcv3: 0,
        dpt1: 0,
        dpt2: 0,
        dpt3: 0,
        mr1: 0,
        mr2: 0,
        typhoid: 0,
        je: 0,
        
        // Class 6 HPV (boys, out of school, in school)
        class6_boys: 0,
        class6_out_girls: 0,
        class6_in_girls: 0,
        
        // Maternal TD
        td1: 0,
        td2: 0,
        td_booster: 0,
      };
    });

    // Populate targets (distributed monthly)
    const t0_11 = parseFloat(targets.target_0_11 || '0');
    const tp_avg = parseFloat(targets.target_penta_avg || '0');
    const t12_23 = parseFloat(targets.target_12_23 || '0');
    const t_preg = parseFloat(targets.target_pregnant || '0');

    NEPALI_MONTHS.forEach(m => {
      data[m.id].target_0_11 = parseFloat((t0_11 / 12).toFixed(1));
      data[m.id].target_penta_avg = parseFloat((tp_avg / 12).toFixed(1));
      data[m.id].target_12_23 = parseFloat((t12_23 / 12).toFixed(1));
      data[m.id].target_pregnant = parseFloat((t_preg / 12).toFixed(1));
    });

    // Process Child Immunizations
    localBachhaRecords
      .filter(r => r.fiscalYear === selectedFiscalYear)
      .forEach(record => {
        const gender = (record.gender || '').toLowerCase();
        record.vaccines?.forEach((v: any) => {
          if (v.status === 'Given' && !v.vaccinatedElsewhere && v.givenDateBs) {
            const m = v.givenDateBs.split('-')[1];
            if (data[m]) {
              const nameLower = (v.name || v.vaccineName || '').toLowerCase();
              if (nameLower.includes('bcg')) {
                data[m].bcg++;
              } else if (nameLower.includes('rota-1') || nameLower.includes('rota 1')) {
                data[m].rota1++;
              } else if (nameLower.includes('rota-2') || nameLower.includes('rota 2')) {
                data[m].rota2++;
              } else if (nameLower.includes('opv-1') || nameLower.includes('opv 1')) {
                data[m].opv1++;
              } else if (nameLower.includes('opv-2') || nameLower.includes('opv 2')) {
                data[m].opv2++;
              } else if (nameLower.includes('opv-3') || nameLower.includes('opv 3')) {
                data[m].opv3++;
              } else if (nameLower.includes('fipv-1') || nameLower.includes('fipv 1')) {
                data[m].fipv1++;
              } else if (nameLower.includes('fipv-2') || nameLower.includes('fipv 2')) {
                data[m].fipv2++;
              } else if (nameLower.includes('fipv') || nameLower.includes('fipv (१४ हप्ता)')) {
                data[m].fipv1++;
              } else if (nameLower.includes('pcv-1') || nameLower.includes('pcv 1')) {
                data[m].pcv1++;
              } else if (nameLower.includes('pcv-2') || nameLower.includes('pcv 2')) {
                data[m].pcv2++;
              } else if (nameLower.includes('pcv-3') || nameLower.includes('pcv 3')) {
                data[m].pcv3++;
              } else if (nameLower.includes('dpt-hepb-hib-1') || nameLower.includes('dpt 1') || nameLower.includes('dpt-hepb-hib-1 (६ हप्ता)')) {
                data[m].dpt1++;
              } else if (nameLower.includes('dpt-hepb-hib-2') || nameLower.includes('dpt 2') || nameLower.includes('dpt-hepb-hib-2 (१० हप्ता)')) {
                data[m].dpt2++;
              } else if (nameLower.includes('dpt-hepb-hib-3') || nameLower.includes('dpt 3') || nameLower.includes('dpt-hepb-hib-3 (१४ हप्ता)')) {
                data[m].dpt3++;
              } else if (nameLower.includes('mr-1') || nameLower.includes('mr 1')) {
                data[m].mr1++;
              } else if (nameLower.includes('mr-2') || nameLower.includes('mr 2')) {
                data[m].mr2++;
              } else if (nameLower.includes('typhoid') || nameLower.includes('टाइफाइड')) {
                data[m].typhoid++;
              } else if (nameLower.includes('je') || nameLower.includes('जे.ई.')) {
                data[m].je++;
              } else if (nameLower.includes('hpv')) {
                if (gender === 'male') {
                  data[m].class6_boys++;
                } else {
                  data[m].class6_in_girls++;
                }
              }
            }
          }
        });
      });

    // Process Maternal TD
    localMaternalRecords
      .filter(r => r.fiscalYear === selectedFiscalYear)
      .forEach(record => {
        if (record.td1DateBs && !record.td1VaccinatedElsewhere) {
          const m = record.td1DateBs.split('-')[1];
          if (data[m]) data[m].td1++;
        }
        if (record.td2DateBs && !record.td2VaccinatedElsewhere) {
          const m = record.td2DateBs.split('-')[1];
          if (data[m]) data[m].td2++;
        }
        if (record.tdBoosterDateBs && !record.tdBoosterVaccinatedElsewhere) {
          const m = record.tdBoosterDateBs.split('-')[1];
          if (data[m]) data[m].td_booster++;
        }
      });

    return data;
  }, [localBachhaRecords, localMaternalRecords, selectedFiscalYear, targets]);

  // Compute Grand Totals
  const grandTotals = useMemo(() => {
    const totals = {
      target_0_11: parseFloat(targets.target_0_11 || '0'),
      target_penta_avg: parseFloat(targets.target_penta_avg || '0'),
      target_12_23: parseFloat(targets.target_12_23 || '0'),
      target_pregnant: parseFloat(targets.target_pregnant || '0'),
      
      bcg: 0, rota1: 0, rota2: 0, opv1: 0, opv2: 0, opv3: 0,
      fipv1: 0, fipv2: 0, pcv1: 0, pcv2: 0, pcv3: 0,
      dpt1: 0, dpt2: 0, dpt3: 0, mr1: 0, mr2: 0, typhoid: 0, je: 0,
      class6_boys: 0, class6_out_girls: 0, class6_in_girls: 0,
      td1: 0, td2: 0, td_booster: 0,
      
      dropout_dpt_count: 0,
      dropout_pcv_count: 0,
      dropout_mr_count: 0,
      dropout_dpt1_mr2_count: 0,
    };

    NEPALI_MONTHS.forEach(m => {
      const row = reportData[m.id];
      if (row) {
        totals.bcg += row.bcg;
        totals.rota1 += row.rota1;
        totals.rota2 += row.rota2;
        totals.opv1 += row.opv1;
        totals.opv2 += row.opv2;
        totals.opv3 += row.opv3;
        totals.fipv1 += row.fipv1;
        totals.fipv2 += row.fipv2;
        totals.pcv1 += row.pcv1;
        totals.pcv2 += row.pcv2;
        totals.pcv3 += row.pcv3;
        totals.dpt1 += row.dpt1;
        totals.dpt2 += row.dpt2;
        totals.dpt3 += row.dpt3;
        totals.mr1 += row.mr1;
        totals.mr2 += row.mr2;
        totals.typhoid += row.typhoid;
        totals.je += row.je;
        totals.class6_boys += row.class6_boys;
        totals.class6_out_girls += row.class6_out_girls;
        totals.class6_in_girls += row.class6_in_girls;
        totals.td1 += row.td1;
        totals.td2 += row.td2;
        totals.td_booster += row.td_booster;
      }
    });

    // Compute annual dropout counts
    totals.dropout_dpt_count = totals.dpt1 - totals.dpt3;
    totals.dropout_pcv_count = totals.pcv1 - totals.pcv3;
    totals.dropout_mr_count = totals.mr1 - totals.mr2;
    totals.dropout_dpt1_mr2_count = totals.dpt1 - totals.mr2;

    return totals;
  }, [reportData, targets]);

  // Combined Vaccination Centers List
  const centersList = useMemo(() => {
    const settingsCenters = generalSettings?.vaccinationCenters || ['मुख्य अस्पताल'];
    const recordCenters = new Set<string>();
    localBachhaRecords.forEach(r => {
      if (r.vaccinationCenter) {
        recordCenters.add(r.vaccinationCenter);
      }
    });
    return Array.from(new Set([...settingsCenters, ...Array.from(recordCenters)]));
  }, [generalSettings, localBachhaRecords]);

  // Compute Center-level Data (Raw Data session Level)
  const sessionReportData = useMemo(() => {
    const data: Record<string, any> = {};
    centersList.forEach(center => {
      const encoded = safeEncodeKey(center);
      data[center] = {
        // Targets (configured per center or 0)
        target_0_11: parseFloat(centerTargets[encoded]?.target_0_11 || '0'),
        target_12_23: parseFloat(centerTargets[encoded]?.target_12_23 || '0'),
        target_pregnant: parseFloat(centerTargets[encoded]?.target_pregnant || '0'),

        // Given doses
        bcg: 0, rota1: 0, rota2: 0, opv1: 0, opv2: 0, opv3: 0,
        fipv1: 0, fipv2: 0, pcv1: 0, pcv2: 0, pcv3: 0,
        dpt1: 0, dpt2: 0, dpt3: 0, mr1: 0, mr2: 0, typhoid: 0, je: 0,
        class6_boys: 0, class6_out_girls: 0, class6_in_girls: 0,
        td1: 0, td2: 0, td_booster: 0,
      };
    });

    // Process Child Immunizations
    localBachhaRecords
      .filter(r => r.fiscalYear === selectedFiscalYear)
      .forEach(record => {
        const cName = record.vaccinationCenter || centersList[0] || 'मुख्य अस्पताल';
        if (!data[cName]) {
          data[cName] = {
            target_0_11: 0, target_12_23: 0, target_pregnant: 0,
            bcg: 0, rota1: 0, rota2: 0, opv1: 0, opv2: 0, opv3: 0,
            fipv1: 0, fipv2: 0, pcv1: 0, pcv2: 0, pcv3: 0,
            dpt1: 0, dpt2: 0, dpt3: 0, mr1: 0, mr2: 0, typhoid: 0, je: 0,
            class6_boys: 0, class6_out_girls: 0, class6_in_girls: 0,
            td1: 0, td2: 0, td_booster: 0,
          };
        }

        const gender = (record.gender || '').toLowerCase();
        record.vaccines?.forEach((v: any) => {
          if (v.status === 'Given' && !v.vaccinatedElsewhere && v.givenDateBs) {
            const nameLower = (v.name || v.vaccineName || '').toLowerCase();
            if (nameLower.includes('bcg')) {
              data[cName].bcg++;
            } else if (nameLower.includes('rota-1') || nameLower.includes('rota 1')) {
              data[cName].rota1++;
            } else if (nameLower.includes('rota-2') || nameLower.includes('rota 2')) {
              data[cName].rota2++;
            } else if (nameLower.includes('opv-1') || nameLower.includes('opv 1')) {
              data[cName].opv1++;
            } else if (nameLower.includes('opv-2') || nameLower.includes('opv 2')) {
              data[cName].opv2++;
            } else if (nameLower.includes('opv-3') || nameLower.includes('opv 3')) {
              data[cName].opv3++;
            } else if (nameLower.includes('fipv-1') || nameLower.includes('fipv 1')) {
              data[cName].fipv1++;
            } else if (nameLower.includes('fipv-2') || nameLower.includes('fipv 2')) {
              data[cName].fipv2++;
            } else if (nameLower.includes('fipv') || nameLower.includes('fipv (१४ हप्ता)')) {
              data[cName].fipv1++;
            } else if (nameLower.includes('pcv-1') || nameLower.includes('pcv 1')) {
              data[cName].pcv1++;
            } else if (nameLower.includes('pcv-2') || nameLower.includes('pcv 2')) {
              data[cName].pcv2++;
            } else if (nameLower.includes('pcv-3') || nameLower.includes('pcv 3')) {
              data[cName].pcv3++;
            } else if (nameLower.includes('dpt-hepb-hib-1') || nameLower.includes('dpt 1') || nameLower.includes('dpt-hepb-hib-1 (६ हप्ता)')) {
              data[cName].dpt1++;
            } else if (nameLower.includes('dpt-hepb-hib-2') || nameLower.includes('dpt 2') || nameLower.includes('dpt-hepb-hib-2 (१० हप्ता)')) {
              data[cName].dpt2++;
            } else if (nameLower.includes('dpt-hepb-hib-3') || nameLower.includes('dpt 3') || nameLower.includes('dpt-hepb-hib-3 (१४ हप्ता)')) {
              data[cName].dpt3++;
            } else if (nameLower.includes('mr-1') || nameLower.includes('mr 1')) {
              data[cName].mr1++;
            } else if (nameLower.includes('mr-2') || nameLower.includes('mr 2')) {
              data[cName].mr2++;
            } else if (nameLower.includes('typhoid') || nameLower.includes('टाइफाइड')) {
              data[cName].typhoid++;
            } else if (nameLower.includes('je') || nameLower.includes('जे.ई.')) {
              data[cName].je++;
            } else if (nameLower.includes('hpv')) {
              if (gender === 'male') {
                data[cName].class6_boys++;
              } else {
                data[cName].class6_in_girls++;
              }
            }
          }
        });
      });

    // Process Maternal TD
    localMaternalRecords
      .filter(r => r.fiscalYear === selectedFiscalYear)
      .forEach(record => {
        const cName = record.vaccinationCenter || centersList[0] || 'मुख्य अस्पताल';
        if (!data[cName]) {
          data[cName] = {
            target_0_11: 0, target_12_23: 0, target_pregnant: 0,
            bcg: 0, rota1: 0, rota2: 0, opv1: 0, opv2: 0, opv3: 0,
            fipv1: 0, fipv2: 0, pcv1: 0, pcv2: 0, pcv3: 0,
            dpt1: 0, dpt2: 0, dpt3: 0, mr1: 0, mr2: 0, typhoid: 0, je: 0,
            class6_boys: 0, class6_out_girls: 0, class6_in_girls: 0,
            td1: 0, td2: 0, td_booster: 0,
          };
        }

        if (record.td1DateBs && !record.td1VaccinatedElsewhere) data[cName].td1++;
        if (record.td2DateBs && !record.td2VaccinatedElsewhere) data[cName].td2++;
        if (record.tdBoosterDateBs && !record.tdBoosterVaccinatedElsewhere) data[cName].td_booster++;
      });

    return data;
  }, [localBachhaRecords, localMaternalRecords, selectedFiscalYear, centersList, centerTargets]);

  // Compute Center-level Grand Totals
  const sessionGrandTotals = useMemo(() => {
    const totals = {
      target_0_11: 0,
      target_12_23: 0,
      target_pregnant: 0,
      
      bcg: 0, rota1: 0, rota2: 0, opv1: 0, opv2: 0, opv3: 0,
      fipv1: 0, fipv2: 0, pcv1: 0, pcv2: 0, pcv3: 0,
      dpt1: 0, dpt2: 0, dpt3: 0, mr1: 0, mr2: 0, typhoid: 0, je: 0,
      class6_boys: 0, class6_out_girls: 0, class6_in_girls: 0,
      td1: 0, td2: 0, td_booster: 0,
      
      dropout_dpt_count: 0,
      dropout_pcv_count: 0,
      dropout_mr_count: 0,
      dropout_dpt1_mr2_count: 0,
    };

    centersList.forEach(center => {
      const row = sessionReportData[center];
      if (row) {
        totals.target_0_11 += row.target_0_11 || 0;
        totals.target_12_23 += row.target_12_23 || 0;
        totals.target_pregnant += row.target_pregnant || 0;

        totals.bcg += row.bcg || 0;
        totals.rota1 += row.rota1 || 0;
        totals.rota2 += row.rota2 || 0;
        totals.opv1 += row.opv1 || 0;
        totals.opv2 += row.opv2 || 0;
        totals.opv3 += row.opv3 || 0;
        totals.fipv1 += row.fipv1 || 0;
        totals.fipv2 += row.fipv2 || 0;
        totals.pcv1 += row.pcv1 || 0;
        totals.pcv2 += row.pcv2 || 0;
        totals.pcv3 += row.pcv3 || 0;
        totals.dpt1 += row.dpt1 || 0;
        totals.dpt2 += row.dpt2 || 0;
        totals.dpt3 += row.dpt3 || 0;
        totals.mr1 += row.mr1 || 0;
        totals.mr2 += row.mr2 || 0;
        totals.typhoid += row.typhoid || 0;
        totals.je += row.je || 0;
        totals.class6_boys += row.class6_boys || 0;
        totals.class6_out_girls += row.class6_out_girls || 0;
        totals.class6_in_girls += row.class6_in_girls || 0;
        totals.td1 += row.td1 || 0;
        totals.td2 += row.td2 || 0;
        totals.td_booster += row.td_booster || 0;
      }
    });

    totals.dropout_dpt_count = totals.dpt1 - totals.dpt3;
    totals.dropout_pcv_count = totals.pcv1 - totals.pcv3;
    totals.dropout_mr_count = totals.mr1 - totals.mr2;
    totals.dropout_dpt1_mr2_count = totals.dpt1 - totals.mr2;

    return totals;
  }, [sessionReportData, centersList]);

  const handlePrint = () => {
    const printContent = document.getElementById('print-area-form-1');
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
        <title>Raw Data HF level - ${selectedSanstha} (फारम नं. १)</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { margin: 4mm; size: A4 landscape; }
          body { 
            font-family: 'Mukta', sans-serif; 
            background: white; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
            padding: 5px;
          }
          table { width: 100%; border-collapse: collapse; font-size: 8px; }
          th, td { border: 1px solid #000; padding: 2px 3px; line-height: 1.1; }
          thead th { background-color: #f8fafc; font-weight: bold; }
          .no-print { display: none; }
          .writing-mode-vertical {
            writing-mode: vertical-rl;
            transform: rotate(180deg);
            white-space: nowrap;
            font-size: 8px;
            padding: 3px 1px;
            margin: 0 auto;
            max-height: 100px;
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
           window.onload = function() {
              setTimeout(function() {
                 window.print();
              }, 500);
           };
        </script>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 5000);
  };

  const handlePrintSession = () => {
    const printContent = document.getElementById('print-area-form-2');
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
        <title>Raw Data session Level - ${selectedSanstha} (फारम नं. २)</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { margin: 4mm; size: A4 landscape; }
          body { 
            font-family: 'Mukta', sans-serif; 
            background: white; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
            padding: 5px;
          }
          table { width: 100%; border-collapse: collapse; font-size: 8px; }
          th, td { border: 1px solid #000; padding: 2px 3px; line-height: 1.1; }
          thead th { background-color: #f8fafc; font-weight: bold; }
          .no-print { display: none; }
          .writing-mode-vertical {
            writing-mode: vertical-rl;
            transform: rotate(180deg);
            white-space: nowrap;
            font-size: 8px;
            padding: 3px 1px;
            margin: 0 auto;
            max-height: 100px;
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
           window.onload = function() {
              setTimeout(function() {
                 window.print();
              }, 500);
           };
        </script>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 5000);
  };

  // Compute calculated "Used" values based on monthly child and maternal immunizations
  const autoUsed = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    NEPALI_MONTHS.forEach(m => {
      const row = reportData[m.id] || {};
      const bcg = row.bcg || 0;
      const rota = (row.rota1 || 0) + (row.rota2 || 0);
      const bopv = (row.opv1 || 0) + (row.opv2 || 0) + (row.opv3 || 0);
      const fipv = (row.fipv1 || 0) + (row.fipv2 || 0);
      const pcv = (row.pcv1 || 0) + (row.pcv2 || 0) + (row.pcv3 || 0);
      const penta = (row.dpt1 || 0) + (row.dpt2 || 0) + (row.dpt3 || 0);
      const mr = (row.mr1 || 0) + (row.mr2 || 0);
      const typhoid = row.typhoid || 0;
      const je = row.je || 0;
      const td = (row.td1 || 0) + (row.td2 || 0) + (row.td_booster || 0);

      data[m.id] = {
        bcg_used: bcg,
        rota_used: rota,
        bopv_used: bopv,
        fipv_used: fipv,
        pcv_used: pcv,
        penta_used: penta,
        mr_used: mr,
        typhoid_used: typhoid,
        je_used: je,
        td_used: td,

        s005_used: bcg,
        s05_used: pcv + penta + mr + typhoid + je + td,
        s01_used: fipv,
        s2_used: Math.ceil(bcg / 10),
        s5_used: Math.ceil(mr / 10) + Math.ceil(je / 5),
        fid_used: bcg,
        mirror_used: 0,
      };
    });
    return data;
  }, [reportData]);

  // Handle autofilling from actual registers
  const handleAutofillForm3 = () => {
    const updated = { ...form3Data };
    NEPALI_MONTHS.forEach(m => {
      if (!updated[m.id]) updated[m.id] = {};
      const autoVal = autoUsed[m.id] || {};
      Object.keys(autoVal).forEach(key => {
        updated[m.id][key] = autoVal[key].toString();
      });
    });
    setForm3Data(updated);
  };

  // Compute Grand Totals for Form 3
  const form3GrandTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    
    // Initialize
    FORM3_VACCINES.forEach(v => {
      totals[`${v.id}_received`] = 0;
      totals[`${v.id}_used`] = 0;
    });
    FORM3_MATERIALS.forEach(m => {
      totals[`${m.id}_received`] = 0;
      totals[`${m.id}_used`] = 0;
    });
    totals['mirror_received'] = 0;
    totals['mirror_used'] = 0;
    totals['mirror_remaining'] = 0;

    NEPALI_MONTHS.forEach(m => {
      FORM3_VACCINES.forEach(v => {
        const recVal = parseFloat(form3Data[m.id]?.[`${v.id}_received`] || '0');
        const usdVal = parseFloat(form3Data[m.id]?.[`${v.id}_used`] || autoUsed[m.id]?.[`${v.id}_used`]?.toString() || '0');
        
        totals[`${v.id}_received`] += recVal;
        totals[`${v.id}_used`] += usdVal;
      });

      FORM3_MATERIALS.forEach(mat => {
        const recVal = parseFloat(form3Data[m.id]?.[`${mat.id}_received`] || '0');
        const usdVal = parseFloat(form3Data[m.id]?.[`${mat.id}_used`] || autoUsed[m.id]?.[`${mat.id}_used`]?.toString() || '0');
        
        totals[`${mat.id}_received`] += recVal;
        totals[`${mat.id}_used`] += usdVal;
      });

      const mirRec = parseFloat(form3Data[m.id]?.[`mirror_received`] || '0');
      const mirUsd = parseFloat(form3Data[m.id]?.[`mirror_used`] || '0');
      const mirRem = parseFloat(form3Data[m.id]?.[`mirror_remaining`] || (mirRec - mirUsd).toString());

      totals['mirror_received'] += mirRec;
      totals['mirror_used'] += mirUsd;
      totals['mirror_remaining'] += mirRem;
    });

    return totals;
  }, [form3Data, autoUsed]);

  // Format Helper to retrieve values
  const getForm3Value = (monthId: string, field: string, isEdit: boolean) => {
    const val = form3Data[monthId]?.[field];
    if (val !== undefined && val !== '') {
      return val;
    }
    if (!isEdit && field.endsWith('_used')) {
      const autoVal = autoUsed[monthId]?.[field];
      return autoVal !== undefined ? autoVal.toString() : '0';
    }
    return '';
  };

  const handleForm3Change = (monthId: string, field: string, val: string) => {
    setForm3Data(prev => ({
      ...prev,
      [monthId]: {
        ...(prev[monthId] || {}),
        [field]: val
      }
    }));
  };

  // Compute auto values and final values for Form 4
  const form4CalculatedData = useMemo(() => {
    const data: Record<string, any> = {};
    const t0_11 = parseFloat(targets.target_0_11 || '0');
    const monthly_target_0_11 = t0_11 / 12;

    NEPALI_MONTHS.forEach(m => {
      const row = reportData[m.id] || {};
      const bcg = row.bcg || 0;
      const mr2 = row.mr2 || 0;
      const dpt1 = row.dpt1 || 0;
      const dpt3 = row.dpt3 || 0;
      const pcv1 = row.pcv1 || 0;
      const pcv3 = row.pcv3 || 0;
      const mr1 = row.mr1 || 0;

      // Auto calculated rates (%)
      const bcg_mr2_rate = bcg > 0 ? parseFloat(((bcg - mr2) / bcg * 100).toFixed(2)) : 0;
      const dpt1_dpt3_rate = dpt1 > 0 ? parseFloat(((dpt1 - dpt3) / dpt1 * 100).toFixed(2)) : 0;
      const pcv1_pcv3_rate = pcv1 > 0 ? parseFloat(((pcv1 - pcv3) / pcv1 * 100).toFixed(2)) : 0;
      const mr1_mr2_rate = mr1 > 0 ? parseFloat(((mr1 - mr2) / mr1 * 100).toFixed(2)) : 0;
      const dpt1_mr2_rate = dpt1 > 0 ? parseFloat(((dpt1 - mr2) / dpt1 * 100).toFixed(2)) : 0;

      // Access coverage (%) based on DPT1
      const dpt1_coverage = monthly_target_0_11 > 0 ? (dpt1 / monthly_target_0_11) * 100 : 0;
      
      // Auto Access: Coverage >= 90%
      const auto_access = dpt1_coverage >= 90 ? 'छ' : 'छैन';
      
      // Auto Utilization: Dropout < 10% (and DPT1 > 0)
      const auto_utilization = (dpt1_dpt3_rate < 10 && dpt1 > 0) ? 'छ' : 'छैन';

      // Access & Utilization overridden?
      const access = form4Data[m.id]?.access || auto_access;
      const utilization = form4Data[m.id]?.utilization || auto_utilization;

      // Auto Group (Category)
      let auto_category = '४';
      if (access === 'छ' && utilization === 'छ') auto_category = '१';
      else if (access === 'छ' && utilization === 'छैन') auto_category = '२';
      else if (access === 'छैन' && utilization === 'छ') auto_category = '३';
      else if (access === 'छैन' && utilization === 'छैन') auto_category = '४';

      const category = form4Data[m.id]?.category || auto_category;

      // Auto Priority
      let auto_priority = '१';
      if (category === '१') auto_priority = '४';
      else if (category === '२') auto_priority = '२';
      else if (category === '३') auto_priority = '३';
      else if (category === '४') auto_priority = '१';

      const priority = form4Data[m.id]?.priority || auto_priority;

      data[m.id] = {
        bcg,
        mr2,
        bcg_mr2_rate,

        dpt1,
        dpt3,
        dpt1_dpt3_rate,

        pcv1,
        pcv3,
        pcv1_pcv3_rate,

        mr1,
        mr1_mr2_rate,

        dpt1_mr2_rate,

        access,
        utilization,
        category,
        priority
      };
    });

    return data;
  }, [reportData, targets.target_0_11, form4Data]);

  const form4GrandTotals = useMemo(() => {
    let total_bcg = 0;
    let total_mr2 = 0;
    let total_dpt1 = 0;
    let total_dpt3 = 0;
    let total_pcv1 = 0;
    let total_pcv3 = 0;
    let total_mr1 = 0;

    NEPALI_MONTHS.forEach(m => {
      const calc = form4CalculatedData[m.id] || {};
      total_bcg += calc.bcg || 0;
      total_mr2 += calc.mr2 || 0;
      total_dpt1 += calc.dpt1 || 0;
      total_dpt3 += calc.dpt3 || 0;
      total_pcv1 += calc.pcv1 || 0;
      total_pcv3 += calc.pcv3 || 0;
      total_mr1 += calc.mr1 || 0;
    });

    const dropout_bcg_mr2_count = total_bcg - total_mr2;
    const dropout_dpt1_dpt3_count = total_dpt1 - total_dpt3;
    const dropout_pcv1_pcv3_count = total_pcv1 - total_pcv3;
    const dropout_mr1_mr2_count = total_mr1 - total_mr2;
    const dropout_dpt1_mr2_count = total_dpt1 - total_mr2;

    const bcg_mr2_rate = total_bcg > 0 ? (dropout_bcg_mr2_count / total_bcg) * 100 : 0;
    const dpt1_dpt3_rate = total_dpt1 > 0 ? (dropout_dpt1_dpt3_count / total_dpt1) * 100 : 0;
    const pcv1_pcv3_rate = total_pcv1 > 0 ? (dropout_pcv1_pcv3_count / total_pcv1) * 100 : 0;
    const mr1_mr2_rate = total_mr1 > 0 ? (dropout_mr1_mr2_count / total_mr1) * 100 : 0;
    const dpt1_mr2_rate = total_dpt1 > 0 ? (dropout_dpt1_mr2_count / total_dpt1) * 100 : 0;

    const t0_11 = parseFloat(targets.target_0_11 || '0');
    const total_dpt1_coverage = t0_11 > 0 ? (total_dpt1 / t0_11) * 100 : 0;

    const auto_access = total_dpt1_coverage >= 90 ? 'छ' : 'छैन';
    const auto_utilization = (dpt1_dpt3_rate < 10 && total_dpt1 > 0) ? 'छ' : 'छैन';

    const access = form4Data['total']?.access || auto_access;
    const utilization = form4Data['total']?.utilization || auto_utilization;

    let auto_category = '४';
    if (access === 'छ' && utilization === 'छ') auto_category = '१';
    else if (access === 'छ' && utilization === 'छैन') auto_category = '२';
    else if (access === 'छैन' && utilization === 'छ') auto_category = '३';
    else if (access === 'छैन' && utilization === 'छैन') auto_category = '४';

    const category = form4Data['total']?.category || auto_category;

    let auto_priority = '१';
    if (category === '१') auto_priority = '४';
    else if (category === '२') auto_priority = '२';
    else if (category === '३') auto_priority = '३';
    else if (category === '४') auto_priority = '१';

    const priority = form4Data['total']?.priority || auto_priority;

    return {
      total_bcg,
      total_mr2,
      dropout_bcg_mr2_count,
      bcg_mr2_rate,

      total_dpt1,
      total_dpt3,
      dropout_dpt1_dpt3_count,
      dpt1_dpt3_rate,

      total_pcv1,
      total_pcv3,
      dropout_pcv1_pcv3_count,
      pcv1_pcv3_rate,

      total_mr1,
      dropout_mr1_mr2_count,
      mr1_mr2_rate,

      dropout_dpt1_mr2_count,
      dpt1_mr2_rate,

      access,
      utilization,
      category,
      priority
    };
  }, [form4CalculatedData, targets.target_0_11, form4Data]);

  const getForm4Value = (monthId: string, field: string, isEdit: boolean) => {
    const val = form4Data[monthId]?.[field];
    if (val !== undefined && val !== '') {
      return val;
    }
    // Fallback to computed auto values
    const autoVal = form4CalculatedData[monthId]?.[field];
    return autoVal !== undefined ? autoVal.toString() : '';
  };

  const handleForm4Change = (monthId: string, field: string, val: string) => {
    setForm4Data(prev => ({
      ...prev,
      [monthId]: {
        ...(prev[monthId] || {}),
        [field]: val
      }
    }));
  };

  // Form 5 dynamic 3 fiscal years resolver
  const threeYears = useMemo(() => {
    const clean = selectedFiscalYear.replace('_', '/');
    const parts = clean.split('/');
    if (parts.length >= 2) {
      const y3Start = parseInt(parts[0].replace(/[^0-9]/g, ''), 10);
      if (!isNaN(y3Start)) {
        const y2Start = y3Start - 1;
        const y1Start = y3Start - 2;
        
        const formatYearPair = (start: number) => {
          const end = (start + 1) % 100;
          const endStr = end < 10 ? `0${end}` : `${end}`;
          return `${start}/${endStr}`;
        };

        return {
          y1: formatYearPair(y1Start),
          y2: formatYearPair(y2Start),
          y3: formatYearPair(y3Start)
        };
      }
    }
    return {
      y1: '2080/81',
      y2: '2081/82',
      y3: '2082/83'
    };
  }, [selectedFiscalYear]);

  // Form 5 3-year calculated/dynamic values
  const form5CalculatedData = useMemo(() => {
    const data: Record<string, { y1: number; y2: number; y3: number; total: number; avg: number }> = {};
    
    // Get year 3 default values from grandTotals
    const getActiveYearDefault = (rowId: string) => {
      switch (rowId) {
        case 'bcg': return grandTotals.bcg || 0;
        case 'rota_1': return grandTotals.rota1 || 0;
        case 'rota_2': return grandTotals.rota2 || 0;
        case 'polio_1': return grandTotals.opv1 || 0;
        case 'polio_2': return grandTotals.opv2 || 0;
        case 'polio_3': return grandTotals.opv3 || 0;
        case 'fipv_1': return grandTotals.fipv1 || 0;
        case 'fipv_2': return grandTotals.fipv2 || 0;
        case 'pcv_1': return grandTotals.pcv1 || 0;
        case 'pcv_2': return grandTotals.pcv2 || 0;
        case 'pcv_3': return grandTotals.pcv3 || 0;
        case 'dpt_1': return grandTotals.dpt1 || 0;
        case 'dpt_2': return grandTotals.dpt2 || 0;
        case 'dpt_3': return grandTotals.dpt3 || 0;
        case 'mr_1': return grandTotals.mr1 || 0;
        case 'mr_2': return grandTotals.mr2 || 0;
        case 'je': return grandTotals.je || 0;
        case 'typhoid': return grandTotals.typhoid || 0;
        case 'hpv': return (grandTotals.class6_boys || 0) + (grandTotals.class6_in_girls || 0) + (grandTotals.class6_out_girls || 0);
        case 'td_1': return grandTotals.td1 || 0;
        case 'td_2': return grandTotals.td2 || 0;
        case 'td_3': return grandTotals.td_booster || 0;
        default: return 0;
      }
    };

    THREE_YEAR_ROWS.forEach(row => {
      const saved = form5Data[row.id] || {};
      const y3Default = getActiveYearDefault(row.id);

      const y1 = parseFloat(saved.y1 || '0');
      const y2 = parseFloat(saved.y2 || '0');
      // Use manually saved y3 if present, otherwise default to active/computed live totals
      const y3 = saved.y3 !== undefined && saved.y3 !== '' ? parseFloat(saved.y3) : y3Default;

      const total = y1 + y2 + y3;
      const avg = Math.round(total / 36);

      data[row.id] = {
        y1,
        y2,
        y3,
        total,
        avg
      };
    });

    return data;
  }, [grandTotals, form5Data]);

  const handleForm5Change = (rowId: string, field: 'y1' | 'y2' | 'y3' | 'remark', val: string) => {
    setForm5Data(prev => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] || {}),
        [field]: val
      }
    }));
  };

  const form6CalculatedData = useMemo(() => {
    const getCalculatedRow = (rowType: 'monthly' | 'quarterly' | 'annual') => {
      const target_0_11 = parseFloat(targets.target_0_11 || '0');
      const target_penta_avg = parseFloat(targets.target_penta_avg || '0');
      const target_12_23 = parseFloat(targets.target_12_23 || '0');
      const target_pregnant = parseFloat(targets.target_pregnant || '0');
      const target_session_count = parseFloat(targets.target_session_count || '0');

      const t_0_11 = rowType === 'monthly' ? Math.round(target_0_11 / 12) : rowType === 'quarterly' ? Math.round(target_0_11 / 4) : Math.round(target_0_11);
      const t_penta_avg = rowType === 'monthly' ? Math.round(target_penta_avg / 12) : rowType === 'quarterly' ? Math.round(target_penta_avg / 4) : Math.round(target_penta_avg);
      const t_12_23 = rowType === 'monthly' ? Math.round(target_12_23 / 12) : rowType === 'quarterly' ? Math.round(target_12_23 / 4) : Math.round(target_12_23);
      const t_pregnant = rowType === 'monthly' ? Math.round(target_pregnant / 12) : rowType === 'quarterly' ? Math.round(target_pregnant / 4) : Math.round(target_pregnant);
      const t_session_count = rowType === 'monthly' ? Math.round(target_session_count / 12) : rowType === 'quarterly' ? Math.round(target_session_count / 4) : Math.round(target_session_count);

      const bcg = Math.max(Math.ceil((t_0_11 * 1.5) / 20), t_session_count || 1);
      const rota = Math.ceil(t_0_11 * 2 * 1.05);
      const opv = Math.ceil((t_0_11 * 3 * 1.15) / 10);
      const fipv5 = Math.max(Math.ceil((t_0_11 * 2 * 1.15) / 5), t_session_count || 1);
      const fipv10 = Math.ceil((t_0_11 * 2 * 1.15) / 10);
      const penta = Math.ceil((t_0_11 * 3 * 1.15) / 10);
      const mr = Math.ceil(((t_0_11 + t_12_23) * 1.15) / 5);
      const typhoid = Math.ceil((t_12_23 * 1 * 1.15) / 5);
      const je = Math.ceil((t_12_23 * 1 * 1.15) / 5);
      const hpv = rowType === 'annual' ? Math.ceil((((parseFloat(targets.class6_in_girls || '0') + parseFloat(targets.class6_out_girls || '0')) || 0) * 1.05)) : 0;
      const td = Math.ceil((t_pregnant * 2 * 1.15) / 10);

      const diluent_bcg = bcg;
      const diluent_mr = mr;
      const diluent_je = je;

      const syringe_005 = Math.ceil(t_0_11 * 1 * 1.10);
      const syringe_01 = Math.ceil(t_0_11 * 2 * 1.10);
      const syringe_05 = Math.ceil(((t_0_11 * 6) + (t_12_23 * 4) + (t_pregnant * 2)) * 1.10);

      const reconstitution_bcg = bcg;
      const reconstitution_mr = mr;
      const reconstitution_je = je;

      const total_syringes = syringe_005 + syringe_01 + syringe_05 + reconstitution_bcg + reconstitution_mr + reconstitution_je;
      const safety_box = Math.max(1, Math.ceil(total_syringes / 100));
      const waste_bag = Math.max(1, t_session_count);

      return {
        t_0_11,
        t_penta_avg,
        t_12_23,
        t_pregnant,
        t_session_count,
        bcg,
        rota,
        opv,
        fipv5,
        fipv10,
        penta,
        mr,
        typhoid,
        je,
        hpv,
        td,
        diluent_bcg,
        diluent_mr,
        diluent_je,
        syringe_005,
        syringe_01,
        syringe_05,
        reconstitution_bcg,
        reconstitution_mr,
        reconstitution_je,
        safety_box,
        waste_bag
      };
    };

    const monthly_calc = getCalculatedRow('monthly');
    const quarterly_calc = getCalculatedRow('quarterly');
    const annual_calc = getCalculatedRow('annual');

    const getMergedValue = (rowType: 'monthly' | 'quarterly' | 'annual', field: string, defaultVal: number) => {
      const saved = form6Data[rowType]?.[field];
      return saved !== undefined && saved !== '' ? parseFloat(saved) : defaultVal;
    };

    const mergeRow = (rowType: 'monthly' | 'quarterly' | 'annual', calc: any) => {
      const merged: any = {};
      Object.keys(calc).forEach(key => {
        merged[key] = getMergedValue(rowType, key, calc[key]);
      });
      return merged;
    };

    return {
      monthly: mergeRow('monthly', monthly_calc),
      quarterly: mergeRow('quarterly', quarterly_calc),
      annual: mergeRow('annual', annual_calc),
    };
  }, [targets, form6Data]);

  const handleForm6Change = (rowType: string, field: string, val: string) => {
    setForm6Data(prev => ({
      ...prev,
      [rowType]: {
        ...(prev[rowType] || {}),
        [field]: val
      }
    }));
  };

  const handlePrintForm3 = () => {
    const printContent = document.getElementById('print-area-form-3');
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
        <title>Vaccine Receive & Expenditure - ${selectedSanstha} (फारम नं. ३)</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { margin: 3mm; size: A4 landscape; }
          body { 
            font-family: 'Mukta', sans-serif; 
            background: white; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
            padding: 5px;
          }
          table { width: 100%; border-collapse: collapse; font-size: 7px; }
          th, td { border: 1px solid #000; padding: 1px 2px; line-height: 1; text-align: center; }
          thead th { background-color: #f8fafc; font-weight: bold; }
          .no-print { display: none; }
        </style>
      </head>
      <body>
        \${printContent.innerHTML}
        <script>
           window.onload = function() {
              setTimeout(function() {
                 window.print();
              }, 500);
           };
        </script>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 5000);
  };

  const handlePrintForm4 = () => {
    const printContent = document.getElementById('print-area-form-4');
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
        <title>खोप कार्यक्रमको प्रगति तथा ड्रप आउट दर विवरण - ${selectedSanstha} (फारम नं. ४)</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { margin: 3mm; size: A4 landscape; }
          body { 
            font-family: 'Mukta', sans-serif; 
            background: white; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
            padding: 5px;
          }
          table { width: 100%; border-collapse: collapse; font-size: 7px; }
          th, td { border: 1px solid #000; padding: 2px 4px; line-height: 1.1; text-align: center; }
          thead th { background-color: #f8fafc; font-weight: bold; }
          .no-print { display: none; }
        </style>
      </head>
      <body>
        \${printContent.innerHTML}
        <script>
           window.onload = function() {
              setTimeout(function() {
                 window.print();
              }, 500);
           };
        </script>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 5000);
  };

  const handlePrintForm5 = () => {
    const printContent = document.getElementById('print-area-form-5');
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
        <title>स्वास्थ्य संस्था स्तरीय ३ वर्षको खोपको प्रगति र सरदर प्रगति - ${selectedSanstha} (फारम नं. ५)</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { margin: 3mm; size: A4 landscape; }
          body { 
            font-family: 'Mukta', sans-serif; 
            background: white; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
            padding: 5px;
          }
          table { width: 100%; border-collapse: collapse; font-size: 8px; }
          th, td { border: 1px solid #000; padding: 3px 5px; line-height: 1.2; }
          thead th { background-color: #f8fafc; font-weight: bold; text-align: center; }
          .no-print { display: none; }
        </style>
      </head>
      <body>
        \${printContent.innerHTML}
        <script>
           window.onload = function() {
              setTimeout(function() {
                 window.print();
              }, 500);
           };
        </script>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 5000);
  };

  const handlePrintForm6 = () => {
    const printContent = document.getElementById('print-area-form-6');
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
        <title>खोप तथा खोप सामाग्रीको मासिक/वार्षिक अनुमानित योजना - ${selectedSanstha} (फारम नं. ६)</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { margin: 3mm; size: A3 landscape; }
          body { 
            font-family: 'Mukta', sans-serif; 
            background: white; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
            padding: 5px;
          }
          table { width: 100%; border-collapse: collapse; font-size: 7px; }
          th, td { border: 1px solid #000; padding: 2px 3px; line-height: 1.1; text-align: center; }
          thead th { background-color: #f8fafc; font-weight: bold; text-align: center; }
          .no-print { display: none; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
           window.onload = function() {
              setTimeout(function() {
                 window.print();
              }, 500);
           };
        </script>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 5000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-4 no-print">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto overflow-hidden">
          {/* Health Facility Selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">स्वास्थ्य संस्था:</span>
            <select
              value={selectedSanstha}
              onChange={(e) => {
                setSelectedSanstha(e.target.value);
              }}
              className="border border-slate-200 px-3 py-1.5 rounded-lg text-xs bg-slate-50 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer min-w-[180px] max-w-[240px]"
            >
              {sansthaList.map(org => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
          </div>

          {/* Fiscal Year Selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">आर्थिक वर्ष:</span>
            <select
              value={selectedFiscalYear}
              onChange={(e) => {
                setSelectedFiscalYear(e.target.value);
              }}
              className="border border-slate-200 px-3 py-1.5 rounded-lg text-xs bg-slate-50 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer min-w-[100px]"
            >
              {Array.from(new Set(bachhaRecords.map(r => r.fiscalYear).concat([currentFiscalYear, '2079/80', '2080/81', '2081/82', '2082/83', '2083/84']))).sort().reverse().map(fy => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          </div>
          
          {/* Scrollable menu bar */}
          <div ref={scrollContainerRef} className="flex overflow-x-auto gap-2 pb-1 max-w-full flex-nowrap scrollbar-thin scrollbar-thumb-slate-200" style={{ WebkitOverflowScrolling: 'touch' }}>
            <button className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${activeTab === 'report' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`} onClick={() => setActiveTab('report')}>
              <ClipboardList size={14} /> Raw Data HF level (फार्म नं. १)
            </button>
            <button className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${activeTab === 'annual' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`} onClick={() => setActiveTab('annual')}>
              Raw Data session Level
            </button>
            <button className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${activeTab === 'report3' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`} onClick={() => setActiveTab('report3')}>
              Vaccine rcv & expnd. (फार्म नं. ३)
            </button>
            <button className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${activeTab === 'report4' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`} onClick={() => setActiveTab('report4')}>
              Drop Out (फार्म नं. ४)
            </button>
            <button className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${activeTab === 'report5' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`} onClick={() => setActiveTab('report5')}>
              3 yrs HF (फार्म नं. ५)
            </button>
            <button className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${activeTab === 'report6' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`} onClick={() => setActiveTab('report6')}>
              Monthly vac Logistic require. (फार्म नं. ६)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
          {(activeTab === 'report' || activeTab === 'annual' || activeTab === 'report3' || activeTab === 'report4' || activeTab === 'report5' || activeTab === 'report6') && (
            <button 
              onClick={
                activeTab === 'report' 
                  ? handlePrint 
                  : activeTab === 'annual' 
                  ? handlePrintSession 
                  : activeTab === 'report3'
                  ? handlePrintForm3
                  : activeTab === 'report4'
                  ? handlePrintForm4
                  : activeTab === 'report5'
                  ? handlePrintForm5
                  : handlePrintForm6
              } 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold shadow hover:bg-slate-900 transition-all cursor-pointer"
            >
              <Printer size={14} /> प्रिन्ट गर्नुहोस्
            </button>
          )}

          {/* Settings Icon for Target Setup in right top corner */}
          <button
            onClick={() => setIsSetupModalOpen(true)}
            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 rounded-lg transition-all border border-slate-200 flex items-center gap-1 cursor-pointer"
            title="लक्ष्य जनसंख्या सेटअप"
          >
            <Settings size={18} />
            <span className="text-xs font-bold sm:inline hidden">लक्ष्य सेटअप</span>
          </button>
        </div>
      </div>

      {/* Target Setup Modal Overlay */}
      {isSetupModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsSetupModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Settings size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">लक्ष्य जनसंख्या सेटअप - {selectedSanstha} (आ.व. {selectedFiscalYear})</h2>
                <p className="text-xs text-slate-500">मासिक रिपोर्ट फार्म १ को गणक गणनाका लागि लक्ष्य जनसंख्या र वडा विवरण प्रविष्ट गर्नुहोस्।</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              {TARGET_ITEMS.map(item => (
                <div key={item.id} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">{item.label}</label>
                  <input 
                    type={item.type === 'text' ? 'text' : 'number'}
                    value={targets[item.id] || ''}
                    onChange={(e) => setTargets({...targets, [item.id]: e.target.value})}
                    className="border border-slate-200 px-3.5 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder={`${item.label} प्रविष्ट गर्नुहोस्`}
                  />
                </div>
              ))}
            </div>

            {/* Center-specific targets section */}
            <div className="mt-8 border-t border-slate-200 pt-6">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <ClipboardList size={16} className="text-indigo-600"/> खोप केन्द्र स्तरीय लक्ष्य जनसंख्या प्रविष्टि
              </h3>
              <p className="text-xs text-slate-500 mb-4">खोप केन्द्र अनुसारको १ वर्षमुनि, १२-२३ महिना र अपेक्षित गर्भवती लक्ष्य जनसंख्या यहाँ मिलाउनुहोस्।</p>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="sticky top-0 bg-slate-50 z-10 border-b">
                    <tr className="font-bold text-slate-700">
                      <th className="p-2 border-r">खोप केन्द्रको नाम</th>
                      <th className="p-2 border-r w-28">१ वर्षमुनि लक्ष्य</th>
                      <th className="p-2 border-r w-28">१२-२३ महिना लक्ष्य</th>
                      <th className="p-2 w-28">अपेक्षित गर्भवती लक्ष्य</th>
                    </tr>
                  </thead>
                  <tbody>
                    {centersList.map(center => {
                      const encoded = safeEncodeKey(center);
                      const t = centerTargets[encoded] || {};
                      return (
                        <tr key={center} className="border-b hover:bg-slate-50/50">
                          <td className="p-2 font-medium border-r">{center}</td>
                          <td className="p-1 border-r">
                            <input 
                              type="number"
                              value={t.target_0_11 || ''}
                              onChange={(e) => setCenterTargets({
                                ...centerTargets,
                                [encoded]: { ...t, target_0_11: e.target.value }
                              })}
                              className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                              placeholder="०"
                            />
                          </td>
                          <td className="p-1 border-r">
                            <input 
                              type="number"
                              value={t.target_12_23 || ''}
                              onChange={(e) => setCenterTargets({
                                ...centerTargets,
                                [encoded]: { ...t, target_12_23: e.target.value }
                              })}
                              className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                              placeholder="०"
                            />
                          </td>
                          <td className="p-1">
                            <input 
                              type="number"
                              value={t.target_pregnant || ''}
                              onChange={(e) => setCenterTargets({
                                ...centerTargets,
                                [encoded]: { ...t, target_pregnant: e.target.value }
                              })}
                              className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                              placeholder="०"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsSetupModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-sm transition-all text-center">
                रद्द गर्नुहोस्
              </button>
              <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition-all">
                <Save size={16}/> सुरक्षित गर्नुहोस्
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'report' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <div id="print-area-form-1" className="min-w-[1050px] p-2 bg-white">
            {/* Form Header */}
            <div className="flex justify-between items-start border-b border-slate-900 pb-2 mb-3">
              <div className="w-1/4 text-[10px] font-bold text-slate-700">
                <p>स्वास्थ्य संस्थाको नाम : <span className="underline text-slate-900 font-bold">{selectedSanstha}</span></p>
                <p className="mt-1">स्थानीय तह : <span className="underline text-slate-900">{targets.local_level || 'चौदण्डीगढी न.पा.'}</span></p>
              </div>
              <div className="w-2/4 text-center">
                <h1 className="text-sm md:text-base font-bold text-slate-900 leading-tight">
                  स्वास्थ्य संस्था स्तरीय मासिक खोप प्रगति विवरण र वार्षिक प्रगति तथा ड्रपआउट अवस्थाको विश्लेषण (Raw Data HF level)
                </h1>
                <p className="text-xs font-bold text-slate-700 mt-1">आर्थिक वर्ष : <span className="underline">{selectedFiscalYear}</span></p>
              </div>
              <div className="w-1/4 text-right text-[10px] font-bold text-slate-700">
                <p>फार्म नं. १</p>
                <p className="mt-1">लक्षित संख्या ०-११ महिना : <span className="underline text-slate-900">{toNepaliNumber(targets.target_0_11 || '१११')}</span> जना</p>
                <p className="mt-0.5">वार्षिक खोप सेसन संख्या : <span className="underline text-slate-900">{toNepaliNumber(targets.target_session_count || '११')}</span></p>
                <p className="mt-0.5">वडा नं : <span className="underline text-slate-900">{toNepaliNumber(targets.ward_no || '०७')}</span></p>
              </div>
            </div>

            {/* Form Table */}
            <table className="w-full border-collapse border border-slate-900 text-center text-[10px] leading-tight print:text-[8px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={3}>सि.न.</th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800 min-w-[70px]" rowSpan={3}>महिना</th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" colSpan={4}>लक्षित जनसंख्या</th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" colSpan={24}>दिएको खोपको मात्रा संख्या</th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" colSpan={4}>ड्रपआउट संख्या</th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={3}>सरदर खोप सेसन विवरण</th>
                </tr>
                <tr className="bg-slate-50">
                  {/* Targets */}
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">जम्मा १ वर्षमुनि</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">पेन्टा १ को ३ वर्ष सरदर</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">१२ देखि २३ महिना</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">अपेक्षित गर्भवती</div></th>

                  {/* Vaccine Doses */}
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">विसीजी</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">रोटा १</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">रोटा २</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">ओ.पि.भि. १</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">ओ.पि.भि. २</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">ओ.पि.भि. ३</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">एफ. आई.पि.भि १</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">एफ. आई.पि.भि २</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">पि.सि.भि. १</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">पि.सि.भि. २</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">पि.सि.भि. ३</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">डिपिटी हेप बी हिब १</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">डिपिटी हेप बी हिब २</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">डिपिटी हेप बी हिब ३</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">दादुरा रुवेला १</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">दादुरा रुवेला २</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">टाइफाइड</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">जे.ई.</div></th>
                  
                  {/* Class 6 */}
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" colSpan={3}>कक्षा ६ का</th>
                  
                  {/* TD */}
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">टी.डी १</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">टी.डी २</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">टी.डी ३ / बूस्टर</div></th>

                  {/* Dropout */}
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">डिपिटी १ र ३</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">पि.सि.भि १ र ३</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">दादुरा रुवेला १ र २</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">डिपिटी १ र दादुरा २</div></th>
                </tr>
                <tr className="bg-slate-50">
                  <th className="border border-slate-900 p-1 font-bold text-slate-800">छात्र</th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800">वि.बा.</th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800">वि.भि.</th>
                </tr>
              </thead>
              <tbody>
                {NEPALI_MONTHS.map((m, idx) => {
                  const row = reportData[m.id];
                  
                  // Compute monthly dropout numbers
                  const dropout_dpt = row.dpt1 - row.dpt3;
                  const dropout_pcv = row.pcv1 - row.pcv3;
                  const dropout_mr = row.mr1 - row.mr2;
                  const dropout_dpt1_mr2 = row.dpt1 - row.mr2;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="border border-slate-900 p-1 text-center font-bold">{toNepaliNumber(idx + 1)}</td>
                      <td className="border border-slate-900 p-1 text-center font-bold">{m.label}</td>
                      
                      {/* Targets */}
                      <td className="border border-slate-900 p-1 text-center bg-slate-50/40">{toNepaliNumber(row.target_0_11)}</td>
                      <td className="border border-slate-900 p-1 text-center bg-slate-50/40">{toNepaliNumber(row.target_penta_avg)}</td>
                      <td className="border border-slate-900 p-1 text-center bg-slate-50/40">{toNepaliNumber(row.target_12_23)}</td>
                      <td className="border border-slate-900 p-1 text-center bg-slate-50/40">{toNepaliNumber(row.target_pregnant)}</td>

                      {/* Given doses */}
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.bcg)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.rota1)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.rota2)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.opv1)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.opv2)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.opv3)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.fipv1)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.fipv2)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.pcv1)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.pcv2)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.pcv3)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.dpt1)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.dpt2)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.dpt3)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.mr1)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.mr2)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.typhoid)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.je)}</td>
                      
                      {/* Class 6 */}
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.class6_boys)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.class6_out_girls)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.class6_in_girls)}</td>

                      {/* Maternal TD */}
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.td1)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.td2)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.td_booster)}</td>

                      {/* Dropout calculations */}
                      <td className="border border-slate-900 p-1 text-center bg-slate-50/30">{toNepaliNumber(dropout_dpt)}</td>
                      <td className="border border-slate-900 p-1 text-center bg-slate-50/30">{toNepaliNumber(dropout_pcv)}</td>
                      <td className="border border-slate-900 p-1 text-center bg-slate-50/30">{toNepaliNumber(dropout_mr)}</td>
                      <td className="border border-slate-900 p-1 text-center bg-slate-50/30">{toNepaliNumber(dropout_dpt1_mr2)}</td>

                      {/* Session count placeholder / local data */}
                      <td className="border border-slate-900 p-1 text-center font-mono text-[9px]">-</td>
                    </tr>
                  );
                })}

                {/* Grand Total Row */}
                <tr className="bg-slate-100 font-bold">
                  <td className="border border-slate-900 p-1 text-center" colSpan={2}>जम्मा संख्या</td>
                  
                  {/* Targets Total */}
                  <td className="border border-slate-900 p-1 text-center bg-slate-200/50">{toNepaliNumber(grandTotals.target_0_11)}</td>
                  <td className="border border-slate-900 p-1 text-center bg-slate-200/50">{toNepaliNumber(grandTotals.target_penta_avg)}</td>
                  <td className="border border-slate-900 p-1 text-center bg-slate-200/50">{toNepaliNumber(grandTotals.target_12_23)}</td>
                  <td className="border border-slate-900 p-1 text-center bg-slate-200/50">{toNepaliNumber(grandTotals.target_pregnant)}</td>

                  {/* Given doses total */}
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.bcg)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.rota1)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.rota2)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.opv1)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.opv2)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.opv3)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.fipv1)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.fipv2)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.pcv1)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.pcv2)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.pcv3)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.dpt1)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.dpt2)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.dpt3)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.mr1)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.mr2)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.typhoid)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.je)}</td>
                  
                  {/* Class 6 */}
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.class6_boys)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.class6_out_girls)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.class6_in_girls)}</td>
                  
                  {/* Maternal TD */}
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.td1)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.td2)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(grandTotals.td_booster)}</td>

                  {/* Dropout Totals */}
                  <td className="border border-slate-900 p-1 text-center bg-slate-200/50">{toNepaliNumber(grandTotals.dropout_dpt_count)}</td>
                  <td className="border border-slate-900 p-1 text-center bg-slate-200/50">{toNepaliNumber(grandTotals.dropout_pcv_count)}</td>
                  <td className="border border-slate-900 p-1 text-center bg-slate-200/50">{toNepaliNumber(grandTotals.dropout_mr_count)}</td>
                  <td className="border border-slate-900 p-1 text-center bg-slate-200/50">{toNepaliNumber(grandTotals.dropout_dpt1_mr2_count)}</td>

                  <td className="border border-slate-900 p-1 text-center">-</td>
                </tr>

                {/* Achievement % based on Target */}
                <tr className="bg-slate-50 font-bold text-[9px]">
                  <td className="border border-slate-900 p-1 text-center" colSpan={2}>दिएको लक्षित संख्याको आधारमा प्रगति %</td>
                  
                  {/* Empty targets cell */}
                  <td className="border border-slate-900 p-1 bg-slate-100" colSpan={4}></td>

                  {/* Calculations */}
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((grandTotals.bcg / grandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((grandTotals.rota1 / grandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((grandTotals.rota2 / grandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((grandTotals.opv1 / grandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((grandTotals.opv2 / grandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((grandTotals.opv3 / grandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((grandTotals.fipv1 / grandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((grandTotals.fipv2 / grandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((grandTotals.pcv1 / grandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((grandTotals.pcv2 / grandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((grandTotals.pcv3 / grandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((grandTotals.dpt1 / grandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((grandTotals.dpt2 / grandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((grandTotals.dpt3 / grandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((grandTotals.mr1 / grandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((grandTotals.mr2 / grandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_12_23 > 0 ? toNepaliNumber(Math.round((grandTotals.typhoid / grandTotals.target_12_23) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_12_23 > 0 ? toNepaliNumber(Math.round((grandTotals.je / grandTotals.target_12_23) * 100)) : '०'}</td>
                  
                  {/* Class 6 */}
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_12_23 > 0 ? toNepaliNumber(Math.round((grandTotals.class6_boys / grandTotals.target_12_23) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_12_23 > 0 ? toNepaliNumber(Math.round((grandTotals.class6_out_girls / grandTotals.target_12_23) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_12_23 > 0 ? toNepaliNumber(Math.round((grandTotals.class6_in_girls / grandTotals.target_12_23) * 100)) : '०'}</td>
                  
                  {/* Maternal TD progress based on pregnant target */}
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_pregnant > 0 ? toNepaliNumber(Math.round((grandTotals.td1 / grandTotals.target_pregnant) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_pregnant > 0 ? toNepaliNumber(Math.round((grandTotals.td2 / grandTotals.target_pregnant) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_pregnant > 0 ? toNepaliNumber(Math.round((grandTotals.td_booster / grandTotals.target_pregnant) * 100)) : '०'}</td>

                  {/* Empty dropout & session cells */}
                  <td className="border border-slate-900 p-1 bg-slate-100" colSpan={5}></td>
                </tr>

                {/* Progress based on Average progress of Penta 1 for 3 years */}
                <tr className="bg-slate-50 font-bold text-[9px]">
                  <td className="border border-slate-900 p-1 text-center" colSpan={2}>पेन्टा १ को ३ वर्षको सरदर प्रगतिको आधारमा प्रगति %</td>
                  
                  {/* Empty targets cell */}
                  <td className="border border-slate-900 p-1 bg-slate-100" colSpan={4}></td>

                  {/* BCG to MR2 etc. progress based on Penta 1 average */}
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_penta_avg > 0 ? toNepaliNumber(Math.round((grandTotals.bcg / grandTotals.target_penta_avg) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_penta_avg > 0 ? toNepaliNumber(Math.round((grandTotals.rota1 / grandTotals.target_penta_avg) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_penta_avg > 0 ? toNepaliNumber(Math.round((grandTotals.rota2 / grandTotals.target_penta_avg) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_penta_avg > 0 ? toNepaliNumber(Math.round((grandTotals.opv1 / grandTotals.target_penta_avg) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_penta_avg > 0 ? toNepaliNumber(Math.round((grandTotals.opv2 / grandTotals.target_penta_avg) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_penta_avg > 0 ? toNepaliNumber(Math.round((grandTotals.opv3 / grandTotals.target_penta_avg) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_penta_avg > 0 ? toNepaliNumber(Math.round((grandTotals.fipv1 / grandTotals.target_penta_avg) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_penta_avg > 0 ? toNepaliNumber(Math.round((grandTotals.fipv2 / grandTotals.target_penta_avg) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_penta_avg > 0 ? toNepaliNumber(Math.round((grandTotals.pcv1 / grandTotals.target_penta_avg) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_penta_avg > 0 ? toNepaliNumber(Math.round((grandTotals.pcv2 / grandTotals.target_penta_avg) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_penta_avg > 0 ? toNepaliNumber(Math.round((grandTotals.pcv3 / grandTotals.target_penta_avg) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_penta_avg > 0 ? toNepaliNumber(Math.round((grandTotals.dpt1 / grandTotals.target_penta_avg) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_penta_avg > 0 ? toNepaliNumber(Math.round((grandTotals.dpt2 / grandTotals.target_penta_avg) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_penta_avg > 0 ? toNepaliNumber(Math.round((grandTotals.dpt3 / grandTotals.target_penta_avg) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_penta_avg > 0 ? toNepaliNumber(Math.round((grandTotals.mr1 / grandTotals.target_penta_avg) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{grandTotals.target_penta_avg > 0 ? toNepaliNumber(Math.round((grandTotals.mr2 / grandTotals.target_penta_avg) * 100)) : '०'}</td>
                  
                  {/* Empty cells for Typhoid, JE, Class6, TD, Dropout & Session */}
                  <td className="border border-slate-900 p-1 bg-slate-100" colSpan={13}></td>
                </tr>
              </tbody>
            </table>

            {/* Form Footer Note */}
            <div className="mt-4 text-[8px] leading-relaxed text-slate-700 text-left border-t border-slate-300 pt-2 font-medium">
              <p>
                <span className="font-bold text-slate-900">नोट : </span>
                (१) यो फारम मासिक खोप सम्पन्न भए पश्चात मासिक प्रतिवेदन तयार गरी खोप ट्यालीसीट वा खोप केन्द्रको कुलप्रगति एच. एम. आई. एस. १.०२ वा १.०३ बाट प्रगति चढाई अध्यावधिक गर्ने । 
                (२) प्रत्येक महिना प्रगति यो फारममा अध्यावधिक गरे पछी अघिल्लो महिना लगाएको खोपको मात्रा र यो महिना लगाएको मात्राको तुलना गरी ड्रपआउट संख्या पत्ता लगाई खोप पूरा गराउन प्रयास गर्नु पर्दछ । जस्तै अघिल्लो महिना पेन्टा १ लगाएको मध्ये यो महिना पेन्टा ३ लगाएको संख्या र अघिल्लो महिना पेन्टा १ लगाएको मध्ये यो महिना पेन्टा ३ लगाएको संख्याको तुलना गरि छुट बच्चा संख्याको पहिचान गरी आगामी महिना खोप पूरा गराउन योजना बनाउनु पर्दछ । अन्य खोपको पनि यसै गरी पहिलो मात्रा र अन्य मात्राको तुलना गर्नु पर्दछ । 
                (३) वर्षको अन्तमा प्रत्येक खोपको मात्रा अनुसार जम्मा प्रगति संख्या लाई लक्ष्य सँग तुलना गरि प्रगति प्रतिशत निकाल्ने साथै ड्रप आउट संख्या र दर समेत निकालेर खोप कार्यक्रमको अवस्थाको मूल्यांङ्कन गर्नु पर्दछ । Td खोपको प्रगति विश्लेषण गर्न Td दोस्रो मात्रा र Td३+ समेत जोडेर कुल प्रगति प्रतिशत निकाल्ने । प्रगति निकाल्ने सुत्र / प्रक्रिया : जस्तै BCG खोपको कभरेज = BCG Achievement / Target * १०० हुन्छ । यसै गरि अन्य खोपको मात्रा को प्रगति निकाल्ने । 
                (४) प्रगति जम्मा संख्या बाट रोकिएको खोपहरुको ड्रपआउट संख्या र दर समेत निकाल्ने । ड्रपआउट दर निकाल्ने सुत्र / प्रक्रिया = (तुलना गरिने अघिल्लो खोप - पछिल्लो खोप) / तुलना गरिने अघिल्लो खोप * १००
              </p>
            </div>

            {/* Signature Area */}
            <div className="grid grid-cols-2 gap-12 mt-8 text-center text-[10px] font-bold text-slate-800">
              <div className="border-t border-slate-500 pt-1.5">तयार गर्ने (खोप संयोजक / एच. ए.)</div>
              <div className="border-t border-slate-500 pt-1.5">स्वीकृत गर्ने (कार्यालय प्रमुख)</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'annual' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <div id="print-area-form-2" className="min-w-[1050px] p-2 bg-white">
            {/* Form Header */}
            <div className="flex justify-between items-start border-b border-slate-900 pb-2 mb-3">
              <div className="w-1/4 text-[10px] font-bold text-slate-700">
                <p>स्वास्थ्य संस्थाको नाम : <span className="underline text-slate-900 font-bold">{selectedSanstha}</span></p>
                <p className="mt-1">स्थानीय तह : <span className="underline text-slate-900">{targets.local_level || 'चौदण्डीगढी न.पा.'}</span></p>
              </div>
              <div className="w-2/4 text-center">
                <h1 className="text-sm md:text-base font-bold text-slate-900 leading-tight">
                  स्वास्थ्य संस्था खोपकेन्द्र स्तरीय प्रगति विवरण (Raw Data session Level)
                </h1>
                <p className="text-xs font-bold text-slate-700 mt-1">आर्थिक वर्ष : <span className="underline">{selectedFiscalYear}</span></p>
              </div>
              <div className="w-1/4 text-right text-[10px] font-bold text-slate-700">
                <p>फार्म नं. २</p>
                <p className="mt-1">लक्षित संख्या ०-११ महिना : <span className="underline text-slate-900">{toNepaliNumber(targets.target_0_11 || '१११')}</span> जना</p>
                <p className="mt-0.5">वार्षिक खोप सेसन संख्या : <span className="underline text-slate-900">{toNepaliNumber(targets.target_session_count || '११')}</span></p>
                <p className="mt-0.5">वडा नं : <span className="underline text-slate-900">{toNepaliNumber(targets.ward_no || '०७')}</span></p>
              </div>
            </div>

            {/* Form Table */}
            <table className="w-full border-collapse border border-slate-900 text-center text-[10px] leading-tight print:text-[8px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={3}>सि.न.</th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800 min-w-[120px]" rowSpan={3}>खोप केन्द्रको नाम र वडा नं</th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" colSpan={3}>लक्षित जनसंख्या</th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" colSpan={24}>दिएको खोपको मात्रा संख्या</th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" colSpan={4}>ड्रपआउट संख्या</th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={3}>सरदर खोप सेसन विवरण</th>
                </tr>
                <tr className="bg-slate-50">
                  {/* Targets */}
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">जम्मा १ वर्षमुनि</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">१२ देखि २३ महिना</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">अपेक्षित गर्भवती</div></th>

                  {/* Vaccine Doses */}
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">विसीजी</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">रोटा १</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">रोटा २</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">ओ.पि.भि. १</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">ओ.पि.भि. २</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">ओ.पि.भि. ३</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">एफ. आई.पि.भि १</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">एफ. आई.पि.भि २</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">पि.सि.भि. १</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">पि.सि.भि. २</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">पि.सि.भि. ३</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">डिपिटी हेप बी हिब १</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">डिपिटी हेप बी हिब २</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">डिपिटी हेप बी हिब ३</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">दादुरा रुवेला १</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">दादुरा रुवेला २</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">टाइफाइड</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">जे.ई.</div></th>
                  
                  {/* Class 6 */}
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" colSpan={3}>कक्षा ६ का</th>
                  
                  {/* TD */}
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">टी.डी १</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">टी.डी २</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">टी.डी ३ / बूस्टर</div></th>

                  {/* Dropout */}
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">डिपिटी १ र ३</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">पि.सि.भि १ र ३</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">दादुरा रुवेला १ र २</div></th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}><div className="writing-mode-vertical">डिपिटी १ र दादुरा २</div></th>
                </tr>
                <tr className="bg-slate-50">
                  <th className="border border-slate-900 p-1 font-bold text-slate-800">छात्र</th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800">वि.बा.</th>
                  <th className="border border-slate-900 p-1 font-bold text-slate-800">वि.भि.</th>
                </tr>
              </thead>
              <tbody>
                {centersList.map((center, idx) => {
                  const row = sessionReportData[center] || {};
                  
                  // Compute center dropout numbers
                  const dropout_dpt = (row.dpt1 || 0) - (row.dpt3 || 0);
                  const dropout_pcv = (row.pcv1 || 0) - (row.pcv3 || 0);
                  const dropout_mr = (row.mr1 || 0) - (row.mr2 || 0);
                  const dropout_dpt1_mr2 = (row.dpt1 || 0) - (row.mr2 || 0);

                  return (
                    <tr key={center} className="hover:bg-slate-50/50">
                      <td className="border border-slate-900 p-1 text-center font-bold">{toNepaliNumber(idx + 1)}</td>
                      <td className="border border-slate-900 p-1 text-left font-semibold">{center}</td>
                      
                      {/* Targets */}
                      <td className="border border-slate-900 p-1 text-center bg-slate-50/40">{toNepaliNumber(row.target_0_11 || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center bg-slate-50/40">{toNepaliNumber(row.target_12_23 || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center bg-slate-50/40">{toNepaliNumber(row.target_pregnant || 0)}</td>

                      {/* Given doses */}
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.bcg || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.rota1 || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.rota2 || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.opv1 || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.opv2 || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.opv3 || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.fipv1 || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.fipv2 || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.pcv1 || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.pcv2 || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.pcv3 || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.dpt1 || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.dpt2 || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.dpt3 || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.mr1 || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.mr2 || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.typhoid || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.je || 0)}</td>
                      
                      {/* Class 6 */}
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.class6_boys || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.class6_out_girls || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.class6_in_girls || 0)}</td>

                      {/* Maternal TD */}
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.td1 || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.td2 || 0)}</td>
                      <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(row.td_booster || 0)}</td>

                      {/* Dropout calculations */}
                      <td className="border border-slate-900 p-1 text-center bg-slate-50/30">{toNepaliNumber(dropout_dpt)}</td>
                      <td className="border border-slate-900 p-1 text-center bg-slate-50/30">{toNepaliNumber(dropout_pcv)}</td>
                      <td className="border border-slate-900 p-1 text-center bg-slate-50/30">{toNepaliNumber(dropout_mr)}</td>
                      <td className="border border-slate-900 p-1 text-center bg-slate-50/30">{toNepaliNumber(dropout_dpt1_mr2)}</td>

                      {/* Session count placeholder / local data */}
                      <td className="border border-slate-900 p-1 text-center font-mono text-[9px]">-</td>
                    </tr>
                  );
                })}

                {/* Grand Total Row */}
                <tr className="bg-slate-100 font-bold">
                  <td className="border border-slate-900 p-1 text-center" colSpan={2}>जम्मा संख्या</td>
                  
                  {/* Targets Total */}
                  <td className="border border-slate-900 p-1 text-center bg-slate-200/50">{toNepaliNumber(sessionGrandTotals.target_0_11)}</td>
                  <td className="border border-slate-900 p-1 text-center bg-slate-200/50">{toNepaliNumber(sessionGrandTotals.target_12_23)}</td>
                  <td className="border border-slate-900 p-1 text-center bg-slate-200/50">{toNepaliNumber(sessionGrandTotals.target_pregnant)}</td>

                  {/* Given doses total */}
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.bcg)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.rota1)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.rota2)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.opv1)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.opv2)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.opv3)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.fipv1)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.fipv2)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.pcv1)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.pcv2)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.pcv3)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.dpt1)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.dpt2)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.dpt3)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.mr1)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.mr2)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.typhoid)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.je)}</td>
                  
                  {/* Class 6 */}
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.class6_boys)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.class6_out_girls)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.class6_in_girls)}</td>
                  
                  {/* Maternal TD */}
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.td1)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.td2)}</td>
                  <td className="border border-slate-900 p-1 text-center">{toNepaliNumber(sessionGrandTotals.td_booster)}</td>

                  {/* Dropout Totals */}
                  <td className="border border-slate-900 p-1 text-center bg-slate-200/50">{toNepaliNumber(sessionGrandTotals.dropout_dpt_count)}</td>
                  <td className="border border-slate-900 p-1 text-center bg-slate-200/50">{toNepaliNumber(sessionGrandTotals.dropout_pcv_count)}</td>
                  <td className="border border-slate-900 p-1 text-center bg-slate-200/50">{toNepaliNumber(sessionGrandTotals.dropout_mr_count)}</td>
                  <td className="border border-slate-900 p-1 text-center bg-slate-200/50">{toNepaliNumber(sessionGrandTotals.dropout_dpt1_mr2_count)}</td>

                  <td className="border border-slate-900 p-1 text-center">-</td>
                </tr>

                {/* Achievement % based on Target */}
                <tr className="bg-slate-50 font-bold text-[9px]">
                  <td className="border border-slate-900 p-1 text-center" colSpan={2}>दिएको लक्षित संख्याको आधारमा प्रगति %</td>
                  
                  {/* Empty targets cell */}
                  <td className="border border-slate-900 p-1 bg-slate-100" colSpan={3}></td>

                  {/* Calculations */}
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.bcg / sessionGrandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.rota1 / sessionGrandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.rota2 / sessionGrandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.opv1 / sessionGrandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.opv2 / sessionGrandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.opv3 / sessionGrandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.fipv1 / sessionGrandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.fipv2 / sessionGrandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.pcv1 / sessionGrandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.pcv2 / sessionGrandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.pcv3 / sessionGrandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.dpt1 / sessionGrandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.dpt2 / sessionGrandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.dpt3 / sessionGrandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.mr1 / sessionGrandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_0_11 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.mr2 / sessionGrandTotals.target_0_11) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_12_23 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.typhoid / sessionGrandTotals.target_12_23) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_12_23 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.je / sessionGrandTotals.target_12_23) * 100)) : '०'}</td>
                  
                  {/* Class 6 */}
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_12_23 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.class6_boys / sessionGrandTotals.target_12_23) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_12_23 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.class6_out_girls / sessionGrandTotals.target_12_23) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_12_23 > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.class6_in_girls / sessionGrandTotals.target_12_23) * 100)) : '०'}</td>
                  
                  {/* Maternal TD progress based on pregnant target */}
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_pregnant > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.td1 / sessionGrandTotals.target_pregnant) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_pregnant > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.td2 / sessionGrandTotals.target_pregnant) * 100)) : '०'}</td>
                  <td className="border border-slate-900 p-1 text-center">{sessionGrandTotals.target_pregnant > 0 ? toNepaliNumber(Math.round((sessionGrandTotals.td_booster / sessionGrandTotals.target_pregnant) * 100)) : '०'}</td>

                  {/* Empty dropout & session cells */}
                  <td className="border border-slate-900 p-1 bg-slate-100" colSpan={5}></td>
                </tr>
              </tbody>
            </table>

            {/* Form Footer Note */}
            <div className="mt-4 text-[8px] leading-relaxed text-slate-700 text-left border-t border-slate-300 pt-2 font-medium">
              <p>
                <span className="font-bold text-slate-900">नोट : </span>
                (१) यो फारम स्वास्थ्य संस्थाको खोपकेन्द्र स्तरीय प्रगति विवरण विश्लेषण गरी प्रतिवेदन तयार गर्न प्रयोग गरिन्छ। 
                (२) प्रत्येक खोप केन्द्रको लक्ष्य संख्यासँग प्रगति तुलना गरी सुधारका क्षेत्रहरू पहिल्याउनु पर्दछ। 
              </p>
            </div>

            {/* Signature Area */}
            <div className="grid grid-cols-2 gap-12 mt-8 text-center text-[10px] font-bold text-slate-800">
              <div className="border-t border-slate-500 pt-1.5">तयार गर्ने (खोप संयोजक / एच. ए.)</div>
              <div className="border-t border-slate-500 pt-1.5">स्वीकृत गर्ने (कार्यालय प्रमुख)</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'report3' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-4 no-print">
            <div>
              <h2 className="text-base font-bold text-slate-800">मासिक खोप तथा खोप सामाग्री प्राप्त, खर्च र खेर जानेदर विवरण (Vaccine rcv & expnd.)</h2>
              <p className="text-xs text-slate-500">फारम नं. ३ - प्राप्त, खर्च र खेर जाने दर प्रविष्टि र विश्लेषण</p>
            </div>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <>
                  <button onClick={handleAutofillForm3} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold transition-all">
                    बच्चा/आमा रेकर्डबाट खर्च विवरण भर्नुहोस् (Autofill)
                  </button>
                  <button onClick={handleSaveForm3} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow transition-all">
                    <Save size={14} /> सुरक्षित गर्नुहोस्
                  </button>
                  <button onClick={() => setIsEditMode(false)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-all">
                    रद्द गर्नुहोस्
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsEditMode(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-all">
                    डाटा थप/सच्याउनुहोस् (Edit)
                  </button>
                  <button onClick={handlePrintForm3} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow transition-all">
                    <Printer size={14} /> प्रिन्ट गर्नुहोस्
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <div id="print-area-form-3" className="min-w-[1200px] p-2 bg-white">
              {/* Report Header */}
              <div className="flex justify-between items-start border-b border-slate-900 pb-2 mb-3">
                <div className="w-1/4 text-[10px] font-bold text-slate-700">
                  <p>स्वास्थ्य संस्थाको नाम : <span className="underline text-slate-900 font-bold">{selectedSanstha}</span></p>
                  <p className="mt-1">स्थानीय तह : <span className="underline text-slate-900">{targets.local_level || 'चौदण्डीगढी न.पा.'}</span></p>
                </div>
                <div className="w-2/4 text-center">
                  <h1 className="text-sm md:text-base font-bold text-slate-900 leading-tight">
                    मासिक खोप तथा खोप सामाग्री प्राप्त, खर्च र खेर जानेदर विवरण (Vaccine rcv & expnd.)
                  </h1>
                  <p className="text-xs font-bold text-slate-700 mt-1">आर्थिक वर्ष : <span className="underline">{selectedFiscalYear}</span></p>
                </div>
                <div className="w-1/4 text-right text-[10px] font-bold text-slate-700">
                  <p>फार्म नं. ३</p>
                  <p className="mt-1">वडा नं : <span className="underline text-slate-900">{toNepaliNumber(targets.ward_no || '०७')}</span></p>
                </div>
              </div>

              {/* Table */}
              <table className="w-full border-collapse border border-slate-900 text-center text-[9px] leading-tight print:text-[7px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={3}>महिना</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800" colSpan={20}>खोपहरु प्राप्त र खर्च विवरण डोजमा</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800" colSpan={12}>खोप सामाग्रीहरु प्राप्त तथा खर्च विवरण गोटा</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800" colSpan={3}>सरसफाई प्रवद्र्धनमा प्राप्त ऐना</th>
                  </tr>
                  <tr className="bg-slate-50">
                    {/* Vaccines */}
                    {FORM3_VACCINES.map(v => (
                      <th key={v.id} className="border border-slate-900 p-1 font-bold text-slate-800" colSpan={2}>{v.label}</th>
                    ))}
                    {/* Materials */}
                    {FORM3_MATERIALS.map(m => (
                      <th key={m.id} className="border border-slate-900 p-1 font-bold text-slate-800" colSpan={2}>{m.label}</th>
                    ))}
                    {/* Mirror */}
                    <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}>प्राप्त</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}>खर्च</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}>बाँकी</th>
                  </tr>
                  <tr className="bg-slate-50">
                    {/* Vaccine sub-columns */}
                    {FORM3_VACCINES.map(v => (
                      <React.Fragment key={`${v.id}-sub`}>
                        <th className="border border-slate-900 p-1 text-[8px] font-bold text-slate-700">प्रा.</th>
                        <th className="border border-slate-900 p-1 text-[8px] font-bold text-slate-700">ख.</th>
                      </React.Fragment>
                    ))}
                    {/* Materials sub-columns */}
                    {FORM3_MATERIALS.map(m => (
                      <React.Fragment key={`${m.id}-sub`}>
                        <th className="border border-slate-900 p-1 text-[8px] font-bold text-slate-700">प्रा.</th>
                        <th className="border border-slate-900 p-1 text-[8px] font-bold text-slate-700">ख.</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {NEPALI_MONTHS.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="border border-slate-900 p-1 font-bold text-slate-800 bg-slate-50/30">{m.label}</td>
                      
                      {/* Vaccines Inputs/Display */}
                      {FORM3_VACCINES.map(v => {
                        const recField = `${v.id}_received`;
                        const usdField = `${v.id}_used`;
                        const recValue = getForm3Value(m.id, recField, isEditMode);
                        const usdValue = getForm3Value(m.id, usdField, isEditMode);

                        return (
                          <React.Fragment key={`${m.id}-${v.id}`}>
                            <td className="border border-slate-900 p-0.5 text-center">
                              {isEditMode ? (
                                <input 
                                  type="number" 
                                  min="0"
                                  value={recValue}
                                  onChange={e => handleForm3Change(m.id, recField, e.target.value)}
                                  className="w-10 px-0.5 py-0.5 text-center text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  placeholder="०"
                                />
                              ) : (
                                toNepaliNumber(recValue || '०')
                              )}
                            </td>
                            <td className="border border-slate-900 p-0.5 text-center">
                              {isEditMode ? (
                                <input 
                                  type="number" 
                                  min="0"
                                  value={usdValue}
                                  onChange={e => handleForm3Change(m.id, usdField, e.target.value)}
                                  className="w-10 px-0.5 py-0.5 text-center text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  placeholder="०"
                                />
                              ) : (
                                toNepaliNumber(usdValue || '०')
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}

                      {/* Materials Inputs/Display */}
                      {FORM3_MATERIALS.map(mat => {
                        const recField = `${mat.id}_received`;
                        const usdField = `${mat.id}_used`;
                        const recValue = getForm3Value(m.id, recField, isEditMode);
                        const usdValue = getForm3Value(m.id, usdField, isEditMode);

                        return (
                          <React.Fragment key={`${m.id}-${mat.id}`}>
                            <td className="border border-slate-900 p-0.5 text-center">
                              {isEditMode ? (
                                <input 
                                  type="number" 
                                  min="0"
                                  value={recValue}
                                  onChange={e => handleForm3Change(m.id, recField, e.target.value)}
                                  className="w-10 px-0.5 py-0.5 text-center text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  placeholder="०"
                                />
                              ) : (
                                toNepaliNumber(recValue || '०')
                              )}
                            </td>
                            <td className="border border-slate-900 p-0.5 text-center">
                              {isEditMode ? (
                                <input 
                                  type="number" 
                                  min="0"
                                  value={usdValue}
                                  onChange={e => handleForm3Change(m.id, usdField, e.target.value)}
                                  className="w-10 px-0.5 py-0.5 text-center text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  placeholder="०"
                                />
                              ) : (
                                toNepaliNumber(usdValue || '०')
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}

                      {/* Mirror Inputs/Display */}
                      <td className="border border-slate-900 p-0.5 text-center">
                        {isEditMode ? (
                          <input 
                            type="number" 
                            min="0"
                            value={getForm3Value(m.id, 'mirror_received', true)}
                            onChange={e => handleForm3Change(m.id, 'mirror_received', e.target.value)}
                            className="w-10 px-0.5 py-0.5 text-center text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="०"
                          />
                        ) : (
                          toNepaliNumber(getForm3Value(m.id, 'mirror_received', false) || '०')
                        )}
                      </td>
                      <td className="border border-slate-900 p-0.5 text-center">
                        {isEditMode ? (
                          <input 
                            type="number" 
                            min="0"
                            value={getForm3Value(m.id, 'mirror_used', true)}
                            onChange={e => handleForm3Change(m.id, 'mirror_used', e.target.value)}
                            className="w-10 px-0.5 py-0.5 text-center text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="०"
                          />
                        ) : (
                          toNepaliNumber(getForm3Value(m.id, 'mirror_used', false) || '०')
                        )}
                      </td>
                      <td className="border border-slate-900 p-0.5 text-center bg-slate-50/20 font-semibold">
                        {isEditMode ? (
                          <input 
                            type="number" 
                            min="0"
                            value={getForm3Value(m.id, 'mirror_remaining', true)}
                            onChange={e => handleForm3Change(m.id, 'mirror_remaining', e.target.value)}
                            className="w-10 px-0.5 py-0.5 text-center text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="०"
                          />
                        ) : (
                          toNepaliNumber(getForm3Value(m.id, 'mirror_remaining', false) || (parseFloat(getForm3Value(m.id, 'mirror_received', false) || '0') - parseFloat(getForm3Value(m.id, 'mirror_used', false) || '0')).toString())
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Grand Total Row */}
                  <tr className="bg-slate-100 font-bold">
                    <td className="border border-slate-900 p-1">जम्मा</td>
                    {FORM3_VACCINES.map(v => (
                      <React.Fragment key={`${v.id}-tot`}>
                        <td className="border border-slate-900 p-1">{toNepaliNumber(form3GrandTotals[`${v.id}_received`])}</td>
                        <td className="border border-slate-900 p-1">{toNepaliNumber(form3GrandTotals[`${v.id}_used`])}</td>
                      </React.Fragment>
                    ))}
                    {FORM3_MATERIALS.map(m => (
                      <React.Fragment key={`${m.id}-tot`}>
                        <td className="border border-slate-900 p-1">{toNepaliNumber(form3GrandTotals[`${m.id}_received`])}</td>
                        <td className="border border-slate-900 p-1">{toNepaliNumber(form3GrandTotals[`${m.id}_used`])}</td>
                      </React.Fragment>
                    ))}
                    <td className="border border-slate-900 p-1">{toNepaliNumber(form3GrandTotals['mirror_received'])}</td>
                    <td className="border border-slate-900 p-1">{toNepaliNumber(form3GrandTotals['mirror_used'])}</td>
                    <td className="border border-slate-900 p-1">{toNepaliNumber(form3GrandTotals['mirror_remaining'])}</td>
                  </tr>

                  {/* Wastage Rate Row */}
                  <tr className="bg-slate-200/50 font-bold text-[8px] print:text-[7px]">
                    <td className="border border-slate-900 p-1">खेर गएको दर (%)</td>
                    {FORM3_VACCINES.map(v => {
                      const rec = form3GrandTotals[`${v.id}_received`];
                      const usd = form3GrandTotals[`${v.id}_used`];
                      const rate = rec > 0 ? Math.max(0, ((rec - usd) / rec) * 100) : 0;
                      return (
                        <td key={`${v.id}-wastage`} className="border border-slate-900 p-1 bg-amber-50/20" colSpan={2}>
                          {toNepaliNumber(rate > 0 ? rate.toFixed(2) : '०.००')}%
                        </td>
                      );
                    })}
                    {FORM3_MATERIALS.map(m => {
                      // wastage rate only for AD syringes and FID card
                      const rec = form3GrandTotals[`${m.id}_received`];
                      const usd = form3GrandTotals[`${m.id}_used`];
                      const rate = rec > 0 ? Math.max(0, ((rec - usd) / rec) * 100) : 0;
                      const isEligible = ['s005', 's05', 's01', 'fid'].includes(m.id);
                      return (
                        <td key={`${m.id}-wastage`} className="border border-slate-900 p-1 bg-amber-50/20" colSpan={2}>
                          {isEligible ? `${toNepaliNumber(rate > 0 ? rate.toFixed(2) : '०.००')}%` : '-'}
                        </td>
                      );
                    })}
                    {/* Mirror wastage or empty cells */}
                    <td className="border border-slate-900 p-1 bg-slate-100" colSpan={3}>-</td>
                  </tr>
                </tbody>
              </table>

              {/* Form Footer Note */}
              <div className="mt-4 text-[8px] leading-relaxed text-slate-700 text-left border-t border-slate-300 pt-2 font-medium">
                <p>
                  <span className="font-bold text-slate-900">नोट : </span>
                  (१) खोप खेर जाने दर % = ((प्राप्त डोज - प्रयोग भएको डोज) / प्राप्त डोज) * १०० हुन्छ । 
                  (२) खोप सामाग्री खेर जाने दर % = ((प्राप्त गोटा - प्रयोग भएको गोटा) / प्राप्त गोटा) * १०० हुन्छ ।
                </p>
              </div>

              {/* Signature Area */}
              <div className="grid grid-cols-2 gap-12 mt-8 text-center text-[10px] font-bold text-slate-800">
                <div className="border-t border-slate-500 pt-1.5">तयार गर्ने (खोप संयोजक / एच. ए.)</div>
                <div className="border-t border-slate-500 pt-1.5">स्वीकृत गर्ने (कार्यालय प्रमुख)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'report4' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-4 no-print">
            <div>
              <h2 className="text-base font-bold text-slate-800 font-nepali">ड्रपआउट तथा समस्या विश्लेषण विवरण (Drop Out)</h2>
              <p className="text-xs text-slate-500">फारम नं. ४ - प्रगति तथा ड्रप आउट दर तथा समस्याको वर्गीकरण विश्लेषण</p>
            </div>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <>
                  <button onClick={handleSaveForm4} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow transition-all">
                    <Save size={14} /> सुरक्षित गर्नुहोस्
                  </button>
                  <button onClick={() => setIsEditMode(false)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-all">
                    रद्द गर्नुहोस्
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsEditMode(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-all">
                    डाटा थप/सच्याउनुहोस् (Edit)
                  </button>
                  <button onClick={handlePrintForm4} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow transition-all">
                    <Printer size={14} /> प्रिन्ट गर्नुहोस्
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <div id="print-area-form-4" className="min-w-[1200px] p-2 bg-white">
              {/* Form 4 Header */}
              <div className="flex justify-between items-start pb-2 mb-3">
                <div className="w-1/3 text-[10px] font-bold text-slate-700 space-y-1">
                  <p>स्वास्थ्य संस्था : <span className="underline text-slate-900 font-bold">{selectedSanstha}</span></p>
                </div>
                <div className="w-1/3 text-center space-y-1">
                  <p className="text-[11px] font-bold text-slate-700">वडा.नं. <span className="underline text-slate-900">{toNepaliNumber(targets.ward_no || '०९')}</span></p>
                </div>
                <div className="w-1/3 text-right text-[10px] font-bold text-slate-700 space-y-1">
                  <p>फारम नं. ४</p>
                  <p className="mt-1">आ.व. <span className="underline text-slate-900 font-bold">{toNepaliNumber(selectedFiscalYear)}</span></p>
                </div>
              </div>

              {/* Title Section */}
              <div className="text-center mb-4">
                <h2 className="text-xs font-bold text-slate-900">
                  स्वास्थ्य संस्थाको वार्षिक खोप कार्यक्रमको प्रगति तथा ड्रप आउट दर तथा समस्याको वर्गीकरण
                </h2>
              </div>

              {/* Form Table */}
              <table className="w-full border-collapse border border-slate-900 text-center text-[10px] leading-tight print:text-[8px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 min-w-[50px]" rowSpan={3}>महिना</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800" colSpan={15}>स्वास्थ्य संस्थाको वार्षिक खोप कार्यक्रमको प्रगति तथा ड्रप आउट दर तथा समस्याको वर्गीकरण</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 min-w-[120px]" colSpan={2} rowSpan={2}>समस्याको पहिचान</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 min-w-[60px]" rowSpan={2}>समस्या को वर्गीकरण</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 min-w-[70px]" rowSpan={2}>समस्या समाधान को प्राथमिकता</th>
                  </tr>
                  <tr className="bg-slate-50">
                    {/* Group Headers */}
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 bg-slate-50" colSpan={2}>प्रगति संख्या</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}>वि.सि.जि VS दादुरा रुवेला २ ड्रपआउट</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 bg-slate-50" colSpan={2}>प्रगति संख्या</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}>डिपिटी हेप वी हिब १ VS ३ ड्रपआउट संख्या</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 bg-slate-50" colSpan={2}>प्रगति संख्या</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}>पि. सि. भि १ VS ३ ड्रपआउट संख्या</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 bg-slate-50" colSpan={2}>प्रगति संख्या</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}>दादुरा रुवेला १ VS दादुरा रुवेला २ ड्रपआउट</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 bg-slate-50" colSpan={2}>प्रगति संख्या</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800" rowSpan={2}>डिपिटी हेप वी हिब १ VS दादुरा रुवेला २ ड्रपआउट</th>
                  </tr>
                  <tr className="bg-slate-50">
                    {/* Sub-column Headers */}
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700">वि.सि.जि</th>
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700">दादुरा रुवेला २</th>

                    <th className="border border-slate-900 p-1 font-semibold text-slate-700">डिपिटी हेप वी हिब १</th>
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700">डिपिटी हेप वी हिब ३</th>

                    <th className="border border-slate-900 p-1 font-semibold text-slate-700">पि. सि. भि १</th>
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700">पि. सि. भि ३</th>

                    <th className="border border-slate-900 p-1 font-semibold text-slate-700">दादुरा रुवेला १</th>
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700">दादुरा रुवेला २</th>

                    <th className="border border-slate-900 p-1 font-semibold text-slate-700">डिपिटी हेप वी हिब १</th>
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700">दादुरा रुवेला २</th>

                    <th className="border border-slate-900 p-1 font-semibold text-slate-700">पहुँच छ</th>
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700">उपयोगिता छ</th>
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700">१, २, ३ र ४</th>
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700">४, ३, २, १</th>
                  </tr>
                </thead>
                <tbody>
                  {NEPALI_MONTHS.map(m => {
                    const calc = form4CalculatedData[m.id] || {};

                    const accessVal = getForm4Value(m.id, 'access', isEditMode);
                    const utilizationVal = getForm4Value(m.id, 'utilization', isEditMode);
                    const categoryVal = getForm4Value(m.id, 'category', isEditMode);
                    const priorityVal = getForm4Value(m.id, 'priority', isEditMode);

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        {/* Month */}
                        <td className="border border-slate-900 p-1 font-bold text-slate-800 bg-slate-50/30 text-left pl-2">{m.label}</td>

                        {/* Group 1 */}
                        <td className="border border-slate-900 p-1">{toNepaliNumber(calc.bcg)}</td>
                        <td className="border border-slate-900 p-1">{toNepaliNumber(calc.mr2)}</td>
                        <td className="border border-slate-900 p-1 font-semibold text-indigo-700 bg-indigo-50/10">
                          {toNepaliNumber(calc.bcg_mr2_rate)}
                        </td>

                        {/* Group 2 */}
                        <td className="border border-slate-900 p-1">{toNepaliNumber(calc.dpt1)}</td>
                        <td className="border border-slate-900 p-1">{toNepaliNumber(calc.dpt3)}</td>
                        <td className="border border-slate-900 p-1 font-semibold text-indigo-700 bg-indigo-50/10">
                          {toNepaliNumber(calc.dpt1_dpt3_rate)}
                        </td>

                        {/* Group 3 */}
                        <td className="border border-slate-900 p-1">{toNepaliNumber(calc.pcv1)}</td>
                        <td className="border border-slate-900 p-1">{toNepaliNumber(calc.pcv3)}</td>
                        <td className="border border-slate-900 p-1 font-semibold text-indigo-700 bg-indigo-50/10">
                          {toNepaliNumber(calc.pcv1_pcv3_rate)}
                        </td>

                        {/* Group 4 */}
                        <td className="border border-slate-900 p-1">{toNepaliNumber(calc.mr1)}</td>
                        <td className="border border-slate-900 p-1">{toNepaliNumber(calc.mr2)}</td>
                        <td className="border border-slate-900 p-1 font-semibold text-indigo-700 bg-indigo-50/10">
                          {toNepaliNumber(calc.mr1_mr2_rate)}
                        </td>

                        {/* Group 5 */}
                        <td className="border border-slate-900 p-1">{toNepaliNumber(calc.dpt1)}</td>
                        <td className="border border-slate-900 p-1">{toNepaliNumber(calc.mr2)}</td>
                        <td className="border border-slate-900 p-1 font-semibold text-indigo-700 bg-indigo-50/10">
                          {toNepaliNumber(calc.dpt1_mr2_rate)}
                        </td>

                        {/* Identification, Category, Priority Overrides / Outputs */}
                        <td className="border border-slate-900 p-1 bg-amber-50/20 font-semibold text-amber-800">
                          {isEditMode ? (
                            <select
                              value={accessVal}
                              onChange={e => handleForm4Change(m.id, 'access', e.target.value)}
                              className="text-[10px] border border-slate-300 rounded px-1 py-0.5"
                            >
                              <option value="छ">छ</option>
                              <option value="छैन">छैन</option>
                            </select>
                          ) : (
                            accessVal
                          )}
                        </td>
                        <td className="border border-slate-900 p-1 bg-amber-50/20 font-semibold text-amber-800">
                          {isEditMode ? (
                            <select
                              value={utilizationVal}
                              onChange={e => handleForm4Change(m.id, 'utilization', e.target.value)}
                              className="text-[10px] border border-slate-300 rounded px-1 py-0.5"
                            >
                              <option value="छ">छ</option>
                              <option value="छैन">छैन</option>
                            </select>
                          ) : (
                            utilizationVal
                          )}
                        </td>
                        <td className="border border-slate-900 p-1 bg-emerald-50/20 font-bold text-emerald-800 text-center">
                          {isEditMode ? (
                            <select
                              value={categoryVal}
                              onChange={e => handleForm4Change(m.id, 'category', e.target.value)}
                              className="text-[10px] border border-slate-300 rounded px-1 py-0.5 font-bold"
                            >
                              <option value="१">१</option>
                              <option value="२">२</option>
                              <option value="३">३</option>
                              <option value="४">४</option>
                            </select>
                          ) : (
                            toNepaliNumber(categoryVal)
                          )}
                        </td>
                        <td className="border border-slate-900 p-1 bg-indigo-50/20 font-bold text-indigo-800 text-center">
                          {isEditMode ? (
                            <select
                              value={priorityVal}
                              onChange={e => handleForm4Change(m.id, 'priority', e.target.value)}
                              className="text-[10px] border border-slate-300 rounded px-1 py-0.5 font-bold"
                            >
                              <option value="१">१</option>
                              <option value="२">२</option>
                              <option value="३">३</option>
                              <option value="४">४</option>
                            </select>
                          ) : (
                            toNepaliNumber(priorityVal)
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Grand Total Row ("जम्मा संख्या") */}
                  <tr className="bg-slate-100 font-bold border-t border-slate-900">
                    <td className="border border-slate-900 p-1 text-left pl-2">जम्मा संख्या</td>

                    {/* Group 1 */}
                    <td className="border border-slate-900 p-1">{toNepaliNumber(form4GrandTotals.total_bcg)}</td>
                    <td className="border border-slate-900 p-1">{toNepaliNumber(form4GrandTotals.total_mr2)}</td>
                    <td className="border border-slate-900 p-1 text-indigo-800 bg-indigo-100/50">
                      {toNepaliNumber(form4GrandTotals.dropout_bcg_mr2_count)}
                    </td>

                    {/* Group 2 */}
                    <td className="border border-slate-900 p-1">{toNepaliNumber(form4GrandTotals.total_dpt1)}</td>
                    <td className="border border-slate-900 p-1">{toNepaliNumber(form4GrandTotals.total_dpt3)}</td>
                    <td className="border border-slate-900 p-1 text-indigo-800 bg-indigo-100/50">
                      {toNepaliNumber(form4GrandTotals.dropout_dpt1_dpt3_count)}
                    </td>

                    {/* Group 3 */}
                    <td className="border border-slate-900 p-1">{toNepaliNumber(form4GrandTotals.total_pcv1)}</td>
                    <td className="border border-slate-900 p-1">{toNepaliNumber(form4GrandTotals.total_pcv3)}</td>
                    <td className="border border-slate-900 p-1 text-indigo-800 bg-indigo-100/50">
                      {toNepaliNumber(form4GrandTotals.dropout_pcv1_pcv3_count)}
                    </td>

                    {/* Group 4 */}
                    <td className="border border-slate-900 p-1">{toNepaliNumber(form4GrandTotals.total_mr1)}</td>
                    <td className="border border-slate-900 p-1">{toNepaliNumber(form4GrandTotals.total_mr2)}</td>
                    <td className="border border-slate-900 p-1 text-indigo-800 bg-indigo-100/50">
                      {toNepaliNumber(form4GrandTotals.dropout_mr1_mr2_count)}
                    </td>

                    {/* Group 5 */}
                    <td className="border border-slate-900 p-1">{toNepaliNumber(form4GrandTotals.total_dpt1)}</td>
                    <td className="border border-slate-900 p-1">{toNepaliNumber(form4GrandTotals.total_mr2)}</td>
                    <td className="border border-slate-900 p-1 text-indigo-800 bg-indigo-100/50">
                      {toNepaliNumber(form4GrandTotals.dropout_dpt1_mr2_count)}
                    </td>

                    {/* Overall Totals */}
                    <td className="border border-slate-900 p-1 bg-amber-100/50 text-amber-900">
                      {isEditMode ? (
                        <select
                          value={getForm4Value('total', 'access', true)}
                          onChange={e => handleForm4Change('total', 'access', e.target.value)}
                          className="text-[10px] border border-slate-300 rounded px-1 py-0.5"
                        >
                          <option value="छ">छ</option>
                          <option value="छैन">छैन</option>
                        </select>
                      ) : (
                        getForm4Value('total', 'access', false)
                      )}
                    </td>
                    <td className="border border-slate-900 p-1 bg-amber-100/50 text-amber-900">
                      {isEditMode ? (
                        <select
                          value={getForm4Value('total', 'utilization', true)}
                          onChange={e => handleForm4Change('total', 'utilization', e.target.value)}
                          className="text-[10px] border border-slate-300 rounded px-1 py-0.5"
                        >
                          <option value="छ">छ</option>
                          <option value="छैन">छैन</option>
                        </select>
                      ) : (
                        getForm4Value('total', 'utilization', false)
                      )}
                    </td>
                    <td className="border border-slate-900 p-1 bg-emerald-100/50 text-emerald-900">
                      {isEditMode ? (
                        <select
                          value={getForm4Value('total', 'category', true)}
                          onChange={e => handleForm4Change('total', 'category', e.target.value)}
                          className="text-[10px] border border-slate-300 rounded px-1 py-0.5 font-bold"
                        >
                          <option value="१">१</option>
                          <option value="२">२</option>
                          <option value="३">३</option>
                          <option value="४">४</option>
                        </select>
                      ) : (
                        toNepaliNumber(getForm4Value('total', 'category', false))
                      )}
                    </td>
                    <td className="border border-slate-900 p-1 bg-indigo-100/50 text-indigo-900">
                      {isEditMode ? (
                        <select
                          value={getForm4Value('total', 'priority', true)}
                          onChange={e => handleForm4Change('total', 'priority', e.target.value)}
                          className="text-[10px] border border-slate-300 rounded px-1 py-0.5 font-bold"
                        >
                          <option value="१">१</option>
                          <option value="२">२</option>
                          <option value="३">३</option>
                          <option value="४">४</option>
                        </select>
                      ) : (
                        toNepaliNumber(getForm4Value('total', 'priority', false))
                      )}
                    </td>
                  </tr>

                  {/* Dropout Rate Row ("ड्रप आउट दर") */}
                  <tr className="bg-slate-200/50 font-bold border-t border-slate-900">
                    <td className="border border-slate-900 p-1 text-left pl-2">ड्रप आउट दर</td>

                    {/* Group 1 */}
                    <td className="border border-slate-900 p-1 bg-slate-100/50" colSpan={2}></td>
                    <td className="border border-slate-900 p-1 text-indigo-900 bg-amber-50">
                      {toNepaliNumber(form4GrandTotals.bcg_mr2_rate.toFixed(1))}%
                    </td>

                    {/* Group 2 */}
                    <td className="border border-slate-900 p-1 bg-slate-100/50" colSpan={2}></td>
                    <td className="border border-slate-900 p-1 text-indigo-900 bg-amber-50">
                      {toNepaliNumber(form4GrandTotals.dpt1_dpt3_rate.toFixed(1))}%
                    </td>

                    {/* Group 3 */}
                    <td className="border border-slate-900 p-1 bg-slate-100/50" colSpan={2}></td>
                    <td className="border border-slate-900 p-1 text-indigo-900 bg-amber-50">
                      {toNepaliNumber(form4GrandTotals.pcv1_pcv3_rate.toFixed(1))}%
                    </td>

                    {/* Group 4 */}
                    <td className="border border-slate-900 p-1 bg-slate-100/50" colSpan={2}></td>
                    <td className="border border-slate-900 p-1 text-indigo-900 bg-amber-50">
                      {toNepaliNumber(form4GrandTotals.mr1_mr2_rate.toFixed(1))}%
                    </td>

                    {/* Group 5 */}
                    <td className="border border-slate-900 p-1 bg-slate-100/50" colSpan={2}></td>
                    <td className="border border-slate-900 p-1 text-indigo-900 bg-amber-50">
                      {toNepaliNumber(form4GrandTotals.dpt1_mr2_rate.toFixed(1))}%
                    </td>

                    {/* Problem indicators - empty */}
                    <td className="border border-slate-900 p-1 bg-slate-100/50" colSpan={4}></td>
                  </tr>
                </tbody>
              </table>

              {/* Signature Area */}
              <div className="grid grid-cols-2 gap-12 mt-8 text-center text-[10px] font-bold text-slate-800">
                <div className="border-t border-slate-500 pt-1.5">तयार गर्ने (खोप संयोजक / एच. ए.)</div>
                <div className="border-t border-slate-500 pt-1.5">स्वीकृत गर्ने (कार्यालय प्रमुख)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'report5' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-2 no-print">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isEditMode 
                    ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow'
                }`}
              >
                {isEditMode ? 'भ्यू मोडमा जानुहोस्' : 'डाटा प्रविष्टि / सम्पादन'}
              </button>
              {isEditMode && (
                <button
                  onClick={handleSaveForm5}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-all animate-in fade-in zoom-in-95"
                >
                  <Save size={16} /> सुरक्षित गर्नुहोस्
                </button>
              )}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              * वर्ष ३ को प्रविष्टि खाली छोडेमा चालु वर्षको प्रगति विवरण (फारम नं. १) को वार्षिक विवरणबाट स्वतः लाइव गणना हुनेछ।
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <div id="print-area-form-5" className="min-w-[1050px] p-2 bg-white">
              {/* Form Header */}
              <div className="flex justify-between items-start border-b border-slate-900 pb-2 mb-3">
                <div className="w-1/4 text-[10px] font-bold text-slate-700">
                  <p>स्वास्थ्य संस्थाको नाम : <span className="underline text-slate-900 font-bold">{selectedSanstha}</span></p>
                  <p className="mt-1">स्थानीय तह : <span className="underline text-slate-900">{targets.local_level || 'चौदण्डीगढी न.पा.'}</span></p>
                </div>
                <div className="w-2/4 text-center">
                  <h1 className="text-sm md:text-base font-bold text-slate-900 leading-tight">
                    स्वास्थ्य संस्था स्तरीय विगत ३ वर्षको खोपको प्रगति र सरदर प्रगति विवरण (Raw Data 3 years HF level)
                  </h1>
                  <p className="text-xs font-bold text-slate-700 mt-1">आर्थिक वर्ष : <span className="underline">{selectedFiscalYear}</span></p>
                </div>
                <div className="w-1/4 text-right text-[10px] font-bold text-slate-700">
                  <p className="font-extrabold text-[11px]">फारम नं. ५</p>
                  <p className="mt-1">वडा नं : <span className="underline text-slate-900">{toNepaliNumber(targets.ward_no || '०७')}</span></p>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-[10px] text-left border-collapse border border-slate-900">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-900 p-1.5 font-bold text-slate-800 text-center w-12" rowSpan={2}>क्र.सं.</th>
                    <th className="border border-slate-900 p-1.5 font-bold text-slate-800 text-center w-40" rowSpan={2}>खोपको नाम</th>
                    <th className="border border-slate-900 p-1.5 font-bold text-slate-800 text-center w-36" rowSpan={2}>मात्रा</th>
                    <th className="border border-slate-900 p-1.5 font-bold text-slate-800 text-center bg-slate-100/50" colSpan={3}>विगत ३ वर्षको खोप प्रगति संख्या</th>
                    <th className="border border-slate-900 p-1.5 font-bold text-slate-800 text-center w-28 bg-slate-100/50" rowSpan={2}>३ वर्षको जम्मा प्रगति संख्या</th>
                    <th className="border border-slate-900 p-1.5 font-bold text-slate-800 text-center w-28 bg-slate-100/50" rowSpan={2}>सरदर मासिक प्रगति (संख्या)</th>
                    <th className="border border-slate-900 p-1.5 font-bold text-slate-800 text-left pl-3" rowSpan={2}>कैफियत (मार्गदर्शन / निर्देशनहरू)</th>
                  </tr>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-900 p-1.5 font-bold text-slate-700 text-center w-28">वर्ष १ ({toNepaliNumber(threeYears.y1)})</th>
                    <th className="border border-slate-900 p-1.5 font-bold text-slate-700 text-center w-28">वर्ष २ ({toNepaliNumber(threeYears.y2)})</th>
                    <th className="border border-slate-900 p-1.5 font-bold text-slate-700 text-center w-28 bg-indigo-50/50">वर्ष ३ ({toNepaliNumber(threeYears.y3)} - चालु)</th>
                  </tr>
                </thead>
                <tbody>
                  {THREE_YEAR_ROWS.map((row, idx) => {
                    const calc = form5CalculatedData[row.id] || { y1: 0, y2: 0, y3: 0, total: 0, avg: 0 };
                    
                    const rowSpanMap: Record<number, number> = {
                      0: 1,  // BCG
                      1: 2,  // Rota
                      3: 3,  // Polio
                      6: 2,  // fIPV
                      8: 3,  // PCV
                      11: 3, // DPT
                      14: 2, // MR
                      16: 1, // JE
                      17: 1, // Typhoid
                      18: 1, // HPV
                      19: 3, // Td
                    };

                    const hasRowSpan = rowSpanMap[idx] !== undefined;
                    const spanLen = rowSpanMap[idx] || 0;

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/50">
                        {/* Serial No */}
                        <td className="border border-slate-900 p-1 text-center font-semibold text-slate-700">
                          {toNepaliNumber(idx + 1)}
                        </td>

                        {/* Vaccine Name with Row Span */}
                        {hasRowSpan && (
                          <td className="border border-slate-900 p-1.5 font-bold text-slate-900 bg-slate-50/30 text-center" rowSpan={spanLen}>
                            {row.vaccine}
                          </td>
                        )}

                        {/* Dose Name */}
                        <td className="border border-slate-900 p-1.5 text-slate-800 text-center">
                          {row.dose || '-'}
                        </td>

                        {/* Year 1 Progress */}
                        <td className="border border-slate-900 p-1 text-center">
                          {isEditMode ? (
                            <input
                              type="number"
                              value={form5Data[row.id]?.y1 || ''}
                              onChange={(e) => handleForm5Change(row.id, 'y1', e.target.value)}
                              className="w-full text-center border border-slate-300 rounded p-1 text-[10px]"
                              placeholder="०"
                            />
                          ) : (
                            toNepaliNumber(calc.y1)
                          )}
                        </td>

                        {/* Year 2 Progress */}
                        <td className="border border-slate-900 p-1 text-center">
                          {isEditMode ? (
                            <input
                              type="number"
                              value={form5Data[row.id]?.y2 || ''}
                              onChange={(e) => handleForm5Change(row.id, 'y2', e.target.value)}
                              className="w-full text-center border border-slate-300 rounded p-1 text-[10px]"
                              placeholder="०"
                            />
                          ) : (
                            toNepaliNumber(calc.y2)
                          )}
                        </td>

                        {/* Year 3 (Current Year) Progress */}
                        <td className="border border-slate-900 p-1 text-center bg-indigo-50/20 font-semibold text-indigo-900">
                          {isEditMode ? (
                            <input
                              type="number"
                              value={form5Data[row.id]?.y3 || ''}
                              onChange={(e) => handleForm5Change(row.id, 'y3', e.target.value)}
                              className="w-full text-center border border-indigo-300 rounded p-1 text-[10px] font-semibold"
                              placeholder={calc.y3.toString()}
                            />
                          ) : (
                            toNepaliNumber(calc.y3)
                          )}
                        </td>

                        {/* 3 Years Total */}
                        <td className="border border-slate-900 p-1 text-center font-bold bg-slate-50 text-slate-900">
                          {toNepaliNumber(calc.total)}
                        </td>

                        {/* Monthly Average Progress */}
                        <td className="border border-slate-900 p-1 text-center font-bold bg-indigo-50/40 text-indigo-800">
                          {toNepaliNumber(calc.avg)}
                        </td>

                        {/* Guidance / Remark with Row Span */}
                        {hasRowSpan && (
                          <td className="border border-slate-900 p-2 text-[9px] text-slate-600 bg-slate-50/10 leading-relaxed max-w-sm text-left align-top" rowSpan={spanLen}>
                            {row.remark}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Signature Area */}
              <div className="grid grid-cols-2 gap-12 mt-12 text-center text-[10px] font-bold text-slate-800">
                <div className="border-t border-slate-500 pt-1.5">तयार गर्ने (खोप संयोजक / एच. ए.)</div>
                <div className="border-t border-slate-500 pt-1.5">स्वीकृत गर्ने (कार्यालय प्रमुख)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'report6' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-2 no-print">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isEditMode 
                    ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow'
                }`}
              >
                {isEditMode ? 'भ्यू मोडमा जानुहोस्' : 'डाटा प्रविष्टि / सम्पादन'}
              </button>
              {isEditMode && (
                <button
                  onClick={handleSaveForm6}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-all animate-in fade-in zoom-in-95"
                >
                  <Save size={16} /> सुरक्षित गर्नुहोस्
                </button>
              )}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              * कुनै कोठा खाली छोडेमा स्थापित सुत्र अनुसार स्वचालित रूपमा गणना हुनेछ।
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <div id="print-area-form-6" className="min-w-[1550px] p-2 bg-white">
              {/* Form Header */}
              <div className="flex justify-between items-start border-b border-slate-900 pb-2 mb-3">
                <div className="w-1/4 text-[10px] font-bold text-slate-700">
                  <p>स्वास्थ्य संस्थाको नाम : <span className="underline text-slate-900 font-bold">{selectedSanstha}</span></p>
                  <p className="mt-1">स्थानीय तह : <span className="underline text-slate-900">{targets.local_level || 'चौदण्डीगढी न.पा.'}</span></p>
                </div>
                <div className="w-2/4 text-center">
                  <h1 className="text-sm md:text-base font-bold text-slate-900 leading-tight">
                    नियमित खोप सेवाका लागि वडा/स्वास्थ्य संस्था तहको खोप तथा खोप सामाग्रीको मासिक/वार्षिक अनुमानित योजना फारम
                  </h1>
                  <p className="text-xs font-bold text-slate-700 mt-1">आर्थिक वर्ष : <span className="underline">{selectedFiscalYear}</span></p>
                </div>
                <div className="w-1/4 text-right text-[10px] font-bold text-slate-700">
                  <p className="font-extrabold text-[11px]">फारम नं. ६</p>
                  <p className="mt-1">वडा नं : <span className="underline text-slate-900">{toNepaliNumber(targets.ward_no || '०७')}</span></p>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-[9px] text-left border-collapse border border-slate-900">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 text-center w-10" rowSpan={3}>सि. नं.</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 text-center w-16" rowSpan={3}>आवश्यक परिमाण</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 text-center" colSpan={5}>मासिक लक्षित जनसंख्या</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 text-center" colSpan={11}>खोपका मात्रा (भायलमा)</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 text-center" colSpan={3}>घोलक</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 text-center" colSpan={3}>ए.डि. सिरिन्ज</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 text-center" colSpan={3}>घोलक सिरिन्ज</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 text-center w-14" rowSpan={3}>सेफ्टी बक्स ५ लि.</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 text-center w-14" rowSpan={3}>वेस्ट ब्याग</th>
                  </tr>
                  <tr className="bg-slate-50">
                    {/* Target Population Subheaders */}
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700 text-center w-14" rowSpan={2}>१ वर्ष मुनिका</th>
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700 text-center w-18 text-indigo-700 bg-indigo-50/20" rowSpan={2}>पेन्टा १ को ३ वर्षको सरदर प्रगति</th>
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700 text-center w-14" rowSpan={2}>१२ देखि २३ महिना सम्मका</th>
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700 text-center w-14" rowSpan={2}>अनुमानित गर्भवती महिला</th>
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700 text-center w-12" rowSpan={2}>खोप सेसन संख्या</th>
                    {/* Vaccine Doses Vials Subheaders */}
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 text-center w-12">बि.सि.जि.</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 text-center w-12">रोटा</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 text-center w-12">पोलियो</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 text-center w-12" colSpan={2}>एफ.आइ.पि.भि.</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 text-center w-14 text-[8px]">डिपिटी हेप वी हिब</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 text-center w-12 text-[8px]">दादुरा रुवेला</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 text-center w-12">टाइफाइड</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 text-center w-12">जे. ई.</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 text-center w-12 bg-slate-100/30">एच.पि.भि.</th>
                    <th className="border border-slate-900 p-1 font-bold text-slate-800 text-center w-12">टी.डी.</th>
                    {/* Diluent Subheaders */}
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700 text-center w-10" rowSpan={2}>बि.सि.जि.</th>
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700 text-center w-10 text-[8px]" rowSpan={2}>दादुरा रुवेला</th>
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700 text-center w-10" rowSpan={2}>जे. ई.</th>
                    {/* AD Syringe Subheaders */}
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700 text-center w-12" rowSpan={2}>०.०५ एम.एल.</th>
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700 text-center w-12" rowSpan={2}>०.१ एम.एल.</th>
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700 text-center w-12 font-bold text-indigo-700 bg-indigo-50/10" rowSpan={2}>०.५ एम.एल.</th>
                    {/* Reconstitution Syringe Subheaders */}
                    <th className="border border-slate-900 p-1 font-semibold text-slate-700 text-center w-12" colSpan={3}>५ एम.एल.</th>
                  </tr>
                  <tr className="bg-slate-50">
                    {/* Specific Dose Vials */}
                    <th className="border border-slate-900 p-1 text-[8px] font-medium text-slate-600 text-center">२० डोज भायल</th>
                    <th className="border border-slate-900 p-1 text-[8px] font-medium text-slate-600 text-center">१ डोज भायल</th>
                    <th className="border border-slate-900 p-1 text-[8px] font-medium text-slate-600 text-center">१० डोज भायल</th>
                    <th className="border border-slate-900 p-1 text-[8px] font-medium text-slate-600 text-center">५ डोज भायल</th>
                    <th className="border border-slate-900 p-1 text-[8px] font-medium text-slate-600 text-center">१० डोज भायल</th>
                    <th className="border border-slate-900 p-1 text-[8px] font-medium text-slate-600 text-center">१० डोज भायल</th>
                    <th className="border border-slate-900 p-1 text-[8px] font-medium text-slate-600 text-center">५ डोज भायल</th>
                    <th className="border border-slate-900 p-1 text-[8px] font-medium text-slate-600 text-center">५ डोज भायल</th>
                    <th className="border border-slate-900 p-1 text-[8px] font-medium text-slate-600 text-center">५ डोज भायल</th>
                    <th className="border border-slate-900 p-1 text-[8px] font-medium text-slate-600 text-center bg-slate-100/30">१ मात्रा भायल</th>
                    <th className="border border-slate-900 p-1 text-[8px] font-medium text-slate-600 text-center">१० डोज भायल</th>
                    {/* Specific Diluent Reconstitution syringe */}
                    <th className="border border-slate-900 p-1 text-[8px] font-medium text-slate-600 text-center">बि.सि.जि. को लागि</th>
                    <th className="border border-slate-900 p-1 text-[8px] font-medium text-slate-600 text-center">दादुरा रुवेलाको लागि</th>
                    <th className="border border-slate-900 p-1 text-[8px] font-medium text-slate-600 text-center">जे. ई. को लागि</th>
                  </tr>
                </thead>
                <tbody>
                  {(['monthly', 'quarterly', 'annual'] as const).map((rowType, idx) => {
                    const calc = form6CalculatedData[rowType];
                    const rowLabel = rowType === 'monthly' ? 'मासिक' : rowType === 'quarterly' ? 'त्रैमासिक' : 'वार्षिक';
                    
                    const renderCell = (field: string, defaultVal: number, isDisabled: boolean = false) => {
                      if (isDisabled) {
                        return (
                          <td className="border border-slate-900 p-1 text-center bg-slate-100 text-slate-400 font-bold select-none">
                            -
                          </td>
                        );
                      }

                      const customValue = form6Data[rowType]?.[field];
                      const valToDisplay = customValue !== undefined && customValue !== '' ? customValue : defaultVal.toString();

                      return (
                        <td className={`border border-slate-900 p-1 text-center ${rowType === 'annual' ? 'font-semibold' : ''}`}>
                          {isEditMode ? (
                            <input
                              type="number"
                              value={form6Data[rowType]?.[field] ?? ''}
                              onChange={(e) => handleForm6Change(rowType, field, e.target.value)}
                              className="w-full text-center border border-slate-300 rounded p-0.5 text-[9px]"
                              placeholder={defaultVal.toString()}
                            />
                          ) : (
                            toNepaliNumber(parseFloat(valToDisplay) || 0)
                          )}
                        </td>
                      );
                    };

                    return (
                      <tr key={rowType} className={`hover:bg-slate-50/50 ${rowType === 'annual' ? 'bg-indigo-50/10 font-bold' : ''}`}>
                        <td className="border border-slate-900 p-1 text-center font-bold text-slate-700">
                          {toNepaliNumber(idx + 1)}
                        </td>
                        <td className="border border-slate-900 p-1 text-center font-bold text-slate-900 bg-slate-50">
                          {rowLabel}
                        </td>
                        {renderCell('t_0_11', calc.t_0_11)}
                        {renderCell('t_penta_avg', calc.t_penta_avg)}
                        {renderCell('t_12_23', calc.t_12_23)}
                        {renderCell('t_pregnant', calc.t_pregnant)}
                        {renderCell('t_session_count', calc.t_session_count)}
                        
                        {/* Vaccine Vials */}
                        {renderCell('bcg', calc.bcg)}
                        {renderCell('rota', calc.rota)}
                        {renderCell('opv', calc.opv)}
                        {renderCell('fipv5', calc.fipv5)}
                        {renderCell('fipv10', calc.fipv10)}
                        {renderCell('penta', calc.penta)}
                        {renderCell('mr', calc.mr)}
                        {renderCell('typhoid', calc.typhoid)}
                        {renderCell('je', calc.je)}
                        {renderCell('hpv', calc.hpv, rowType !== 'annual')}
                        {renderCell('td', calc.td)}

                        {/* Diluents */}
                        {renderCell('diluent_bcg', calc.diluent_bcg)}
                        {renderCell('diluent_mr', calc.diluent_mr)}
                        {renderCell('diluent_je', calc.diluent_je)}

                        {/* AD Syringes */}
                        {renderCell('syringe_005', calc.syringe_005)}
                        {renderCell('syringe_01', calc.syringe_01)}
                        {renderCell('syringe_05', calc.syringe_05)}

                        {/* Reconstitution Syringes */}
                        {renderCell('reconstitution_bcg', calc.reconstitution_bcg)}
                        {renderCell('reconstitution_mr', calc.reconstitution_mr)}
                        {renderCell('reconstitution_je', calc.reconstitution_je)}

                        {/* Safety Box & Waste Bag */}
                        {renderCell('safety_box', calc.safety_box)}
                        {renderCell('waste_bag', calc.waste_bag)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Guidelines & Calculation Rules Footnotes */}
              <div className="mt-6 border border-slate-300 rounded-xl p-4 bg-slate-50/50 text-[9px] leading-relaxed text-slate-700">
                <h3 className="font-bold text-slate-900 mb-2 border-b pb-1 text-[10px]">पूर्वानुमान सूत्र र नियम मार्गदर्शनहरू (Calculation Guidelines & Formula Instructions):</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  <p><strong>• बि.सि.जि. खोपको लागि:</strong> खोप प्रति सेसन कम्तिमा १ भायल र आवश्यकता अनुसार थप भायल समेत राखी योजना बनाइनेछ।</p>
                  <p><strong>• रोटा खोपको लागि:</strong> लक्षित संख्या र प्रति प्रतिरोधात्मक मात्राको २ डोजका लागि ५% खेर जाने दर थप गरी गणना गरिन्छ।</p>
                  <p><strong>• पोलियो (OPV) को लागि:</strong> लक्षित संख्या x ३ डोज x १५% खेर जाने दर (Wastage Factor १.१५) को आधारमा १० डोज भायल पूर्वानुमान गरिन्छ।</p>
                  <p><strong>• एफ.आइ.पि.भि. को लागि:</strong> २ डोज र १५% खेर जाने दरको आधारमा ५ र १० डोज भायलको माग योजना बनाइनेछ।</p>
                  <p><strong>• डिपिटी हेप वी हिब (Pentavalent) को लागि:</strong> ३ डोज र १५% खेर जाने दर (Wastage Factor १.१५) को आधारमा १० डोज भायल माग योजना।</p>
                  <p><strong>• दादुरा रुवेला (MR) को लागि:</strong> २ डोज (एम.आर. १ र २) लक्षित जनसंख्या र १५% खेर जाने दरको आधारमा ५ डोज भायलको माग अनुमान गरिन्छ।</p>
                  <p><strong>• जे. ई. र टाइफाइडको लागि:</strong> १२ देखि २३ महिना लक्षित जनसंख्या र १ मात्राको आधारमा १५% खेर जाने दर थप गरी ५ डोज भायल माग अनुमान।</p>
                  <p><strong>• एच.पि.भि. को लागि:</strong> कक्षा ५ का छात्राहरूको विवरणको आधारमा ५% खेर जाने दर थप गरी वार्षिक रूपमा मात्र अनुमान गरिन्छ।</p>
                  <p><strong>• टी.डी. को लागि:</strong> गर्भवती महिलाको लक्षित संख्या र २ मात्राको आधारमा १५% खेर जाने दर थप गरी १० डोज भायलको माग अनुमान गरिन्छ।</p>
                  <p><strong>• सिरिन्ज र सामाग्रीको लागि:</strong> ए.डि. सिरिन्जहरू (०.०५ एम.एल., ०.१ एम.एल. र ०.५ एम.एल.) सम्बन्धित खोप मात्रा संख्यामा १०% अतिरिक्त मात्रा थप गरी र सेफ्टी बक्स जम्मा सिरिन्ज संख्याको आधारमा १०० ले भाग गरी निकालिन्छ।</p>
                </div>
              </div>

              {/* Signature Area */}
              <div className="grid grid-cols-2 gap-12 mt-10 text-center text-[10px] font-bold text-slate-800">
                <div className="border-t border-slate-500 pt-1.5">तयार गर्ने (खोप संयोजक / एच. ए.)</div>
                <div className="border-t border-slate-500 pt-1.5">स्वीकृत गर्ने (कार्यालय प्रमुख)</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
