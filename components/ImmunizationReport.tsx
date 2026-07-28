
import React, { useState, useMemo } from 'react';
import { Printer, Calendar, Filter, BarChart, Download, Baby, Droplets, Users, UsersRound, MapPinned, Search } from 'lucide-react';
import { Select } from './Select';
import { FISCAL_YEARS } from '../constants';
import { ChildImmunizationRecord, GarbhawatiPatient } from '../types/healthTypes';
import { Option, OrganizationSettings } from '../types/coreTypes';
import { NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE } from './ChildImmunizationRegistration'; // Import the template
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface ImmunizationReportProps {
  currentFiscalYear: string;
  bachhaRecords: ChildImmunizationRecord[];
  maternalRecords: GarbhawatiPatient[];
  generalSettings: OrganizationSettings;
}

const nepaliMonthOptions = [
  { id: 'all', value: 'all', label: 'सबै महिना (All Months)' },
  { id: '01', value: '01', label: 'बैशाख (Baishakh)' },
  { id: '02', value: '02', label: 'जेठ (Jestha)' },
  { id: '03', value: '03', label: 'असार (Ashad)' },
  { id: '04', value: '04', label: 'साउन (Shrawan)' },
  { id: '05', value: '05', label: 'भदौ (Bhadra)' },
  { id: '06', value: '06', label: 'असोज (Ashwin)' },
  { id: '07', value: '07', label: 'कार्तिक (Kartik)' },
  { id: '08', value: '08', label: 'मंसिर (Mangsir)' },
  { id: '09', value: '09', label: 'पुष (Poush)' },
  { id: '10', value: '10', label: 'माघ (Magh)' },
  { id: '11', value: '11', label: 'फागुन (Falgun)' },
  { id: '12', value: '12', label: 'चैत्र (Caitra)' },
];

const jatLabels: Record<string, string> = {
  '01': 'दलित (Dalit)',
  '02': 'जनजाति (Janajati)',
  '03': 'मधेशी (Madhesi)',
  '04': 'मुस्लिम (Muslim)',
  '05': 'ब्राह्मण/क्षेत्री (B/C)',
  '06': 'अन्य (Others)',
};

const getFiscalYearFromBsDate = (dateBs: string): string => {
  if (!dateBs) return '';
  const parts = dateBs.split('-');
  if (parts.length !== 3) return '';
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(month)) return '';
  
  if (month >= 4) {
    const nextYearShort = (year + 1) % 100;
    const nextYearStr = nextYearShort < 10 ? `0${nextYearShort}` : `${nextYearShort}`;
    return `${year}/0${nextYearStr}`; // e.g. "2081/082"
  } else {
    const prevYear = year - 1;
    const yearShort = year % 100;
    const yearStr = yearShort < 10 ? `0${yearShort}` : `${yearShort}`;
    return `${prevYear}/0${yearStr}`; // e.g. "2080/081"
  }
};

const isSameVaccine = (actualName: string, targetName: string) => {
  if (targetName === 'all') return true;
  const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const nActual = norm(actualName);
  const nTarget = norm(targetName);
  if (nActual === nTarget) return true;
  
  // Custom mapping matches
  if (nTarget.includes('bcg') && nActual.includes('bcg')) return true;
  if (nTarget.includes('dpthepbhib1') && (nActual.includes('dpthepbhib1') || nActual.includes('penta1') || nActual.includes('pentavalent1') || nActual.includes('dpt1'))) return true;
  if (nTarget.includes('dpthepbhib2') && (nActual.includes('dpthepbhib2') || nActual.includes('penta2') || nActual.includes('pentavalent2') || nActual.includes('dpt2'))) return true;
  if (nTarget.includes('dpthepbhib3') && (nActual.includes('dpthepbhib3') || nActual.includes('penta3') || nActual.includes('pentavalent3') || nActual.includes('dpt3'))) return true;
  if (nTarget.includes('opv1') && (nActual.includes('opv1') || nActual.includes('polio1'))) return true;
  if (nTarget.includes('opv2') && (nActual.includes('opv2') || nActual.includes('polio2'))) return true;
  if (nTarget.includes('opv3') && (nActual.includes('opv3') || nActual.includes('polio3'))) return true;
  if (nTarget.includes('pcv1') && nActual.includes('pcv1')) return true;
  if (nTarget.includes('pcv2') && nActual.includes('pcv2')) return true;
  if (nTarget.includes('pcv3') && nActual.includes('pcv3')) return true;
  if (nTarget.includes('rota1') && (nActual.includes('rota1') || nActual.includes('rotavirus1'))) return true;
  if (nTarget.includes('rota2') && (nActual.includes('rota2') || nActual.includes('rotavirus2'))) return true;
  if (nTarget.includes('fipv1') && (nActual.includes('fipv1') || (nActual.includes('fipv') && !nActual.includes('2') && !nActual.includes('२')))) return true;
  if (nTarget.includes('fipv2') && nActual.includes('fipv2')) return true;
  if (nTarget.includes('mr1') && (nActual.includes('mr1') || nActual.includes('measles1'))) return true;
  if (nTarget.includes('mr2') && (nActual.includes('mr2') || nActual.includes('measles2'))) return true;
  if (nTarget.includes('je') && nActual.includes('je')) return true;
  if (nTarget.includes('typhoid') && nActual.includes('typhoid')) return true;
  if (nTarget.includes('hpv') && nActual.includes('hpv')) return true;

  return nActual.includes(nTarget) || nTarget.includes(nActual);
};

export const ImmunizationReport: React.FC<ImmunizationReportProps> = ({ 
  currentFiscalYear, 
  bachhaRecords, 
  maternalRecords, 
  generalSettings 
}) => {
  const [activeReportTab, setActiveReportTab] = useState<'summary' | 'detail'>('summary');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear);
  const [filterCenter, setFilterCenter] = useState(''); // New state for filter by vaccination center
  const [selectedVaccine, setSelectedVaccine] = useState('all'); // New state for filter by specific vaccine
  const [searchQuery, setSearchQuery] = useState('');

  const centerOptions: Option[] = useMemo(() => 
    (generalSettings.vaccinationCenters || ['मुख्य अस्पताल']).map(c => ({ id: c, value: c, label: c })),
    [generalSettings.vaccinationCenters]
  );

  const vaccineOptions: Option[] = useMemo(() => {
    const opts: Option[] = [
      { id: 'all', value: 'all', label: '-- सबै खोपहरू (All Vaccines) --' }
    ];
    // Add child vaccines
    NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.forEach(v => {
      opts.push({ id: v.name, value: v.name, label: `${v.name} (Child)` });
    });
    // Add maternal vaccines
    opts.push({ id: 'TD1', value: 'TD1', label: 'TD1 (Maternal)' });
    opts.push({ id: 'TD2', value: 'TD2', label: 'TD2 (Maternal)' });
    opts.push({ id: 'TD Booster', value: 'TD Booster', label: 'TD Booster (Maternal)' });
    return opts;
  }, []);

  const childrenDetailsThisMonth = useMemo(() => {
    return bachhaRecords
      .filter(r => filterCenter ? r.vaccinationCenter === filterCenter : true)
      .map((record) => {
        const vaccinesGiven: string[] = [];
        let hasVaccineThisMonth = false;

        record.vaccines.forEach(v => {
          if (v.status === 'Given' && !v.vaccinatedElsewhere && v.givenDateBs) {
            const m = v.givenDateBs.split('-')[1];
            const vaxFY = getFiscalYearFromBsDate(v.givenDateBs);
            
            if ((selectedMonth === 'all' || m === selectedMonth) && (vaxFY === selectedFiscalYear || record.fiscalYear === selectedFiscalYear)) {
              if (selectedVaccine === 'all' || (!selectedVaccine.startsWith('TD') && isSameVaccine(v.name, selectedVaccine))) {
                hasVaccineThisMonth = true;
                vaccinesGiven.push(v.name);
              }
            }
          }
        });

        if (hasVaccineThisMonth) {
          // Check if they are fully immunized (all required vaccines from template are Given)
          const requiredVaccines = NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.filter(req => !req.name.includes('HPV'));
          const hasAllRequired = requiredVaccines.every(reqVax => {
            return record.vaccines.some(v => {
              if (v.status !== 'Given') return false;
              const nameLower = (v.name || '').toLowerCase();
              const reqLower = reqVax.name.toLowerCase();
              const normalize = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              if (normalize(v.name) === normalize(reqVax.name)) return true;
              
              // Fallbacks
              if (reqLower.includes('bcg') && nameLower.includes('bcg')) return true;
              if (reqLower.includes('dpt-hepb-hib-1') && (
                nameLower.includes('dpt-hepb-hib-1') || 
                nameLower.includes('dpt 1') || 
                nameLower.includes('penta-1') || 
                nameLower.includes('penta 1') || 
                nameLower.includes('pentavalent-1') || 
                nameLower.includes('pentavalent 1')
              )) return true;
              if (reqLower.includes('opv-1') && (nameLower.includes('opv-1') || nameLower.includes('opv 1') || nameLower.includes('polio 1'))) return true;
              if (reqLower.includes('pcv-1') && (nameLower.includes('pcv-1') || nameLower.includes('pcv 1'))) return true;
              if (reqLower.includes('rota-1') && (
                nameLower.includes('rota-1') || 
                nameLower.includes('rota 1') || 
                nameLower.includes('rotavirus-1') || 
                nameLower.includes('rotavirus 1')
              )) return true;
              if (reqLower.includes('dpt-hepb-hib-2') && (
                nameLower.includes('dpt-hepb-hib-2') || 
                nameLower.includes('dpt 2') || 
                nameLower.includes('penta-2') || 
                nameLower.includes('penta 2') || 
                nameLower.includes('pentavalent-2') || 
                nameLower.includes('pentavalent 2')
              )) return true;
              if (reqLower.includes('opv-2') && (nameLower.includes('opv-2') || nameLower.includes('opv 2') || nameLower.includes('polio 2'))) return true;
              if (reqLower.includes('rota-2') && (
                nameLower.includes('rota-2') || 
                nameLower.includes('rota 2') || 
                nameLower.includes('rotavirus-2') || 
                nameLower.includes('rotavirus 2')
              )) return true;
              if (reqLower.includes('pcv-2') && (nameLower.includes('pcv-2') || nameLower.includes('pcv 2'))) return true;
              if (reqLower.includes('fipv-1') && (
                nameLower.includes('fipv-1') || 
                nameLower.includes('fipv 1') || 
                (nameLower.includes('fipv') && !nameLower.includes('2') && !nameLower.includes('२'))
              )) return true;
              if (reqLower.includes('dpt-hepb-hib-3') && (
                nameLower.includes('dpt-hepb-hib-3') || 
                nameLower.includes('dpt 3') || 
                nameLower.includes('penta-3') || 
                nameLower.includes('penta 3') || 
                nameLower.includes('pentavalent-3') || 
                nameLower.includes('pentavalent 3')
              )) return true;
              if (reqLower.includes('opv-3') && (nameLower.includes('opv-3') || nameLower.includes('opv 3') || nameLower.includes('polio 3'))) return true;
              if (reqLower.includes('mr-1') && (nameLower.includes('mr-1') || nameLower.includes('mr 1') || nameLower.includes('measles 1'))) return true;
              if (reqLower.includes('pcv-3') && (nameLower.includes('pcv-3') || nameLower.includes('pcv 3'))) return true;
              if (reqLower.includes('fipv-2') && (nameLower.includes('fipv-2') || nameLower.includes('fipv 2'))) return true;
              if (reqLower.includes('je') && (nameLower.includes('je') || nameLower.includes('जे.ई.') || nameLower.includes('japanese'))) return true;
              if (reqLower.includes('mr-2') && (nameLower.includes('mr-2') || nameLower.includes('mr 2') || nameLower.includes('measles 2'))) return true;
              if (reqLower.includes('typhoid') && (nameLower.includes('typhoid') || nameLower.includes('टाइफाइड') || nameLower.includes('tcv'))) return true;
              return false;
            });
          });

          const hasCompletionVax = record.vaccines.some(v => v.status === 'Given' && !v.vaccinatedElsewhere && (v.name.toLowerCase().includes('mr-2') || v.name.toLowerCase().includes('typhoid')));

          const isFullyImmunized = hasAllRequired || hasCompletionVax;
          const statusText = isFullyImmunized ? 'पूर्ण खोप' : 'आंशिक खोप';

          return {
            ...record,
            vaccinesGiven,
            statusText,
            isFullyImmunized,
          };
        }
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [bachhaRecords, selectedMonth, selectedFiscalYear, filterCenter, selectedVaccine]);

  const filteredChildren = useMemo(() => {
    if (!searchQuery.trim()) return childrenDetailsThisMonth;
    const query = searchQuery.toLowerCase().trim();
    return childrenDetailsThisMonth.filter(c => 
      c.childName.toLowerCase().includes(query) ||
      (c.motherName && c.motherName.toLowerCase().includes(query)) ||
      (c.fatherName && c.fatherName.toLowerCase().includes(query)) ||
      (c.address && c.address.toLowerCase().includes(query)) ||
      (c.phone && c.phone.includes(query)) ||
      c.regNo.toLowerCase().includes(query)
    );
  }, [childrenDetailsThisMonth, searchQuery]);

  const reportStats = useMemo(() => {
    // Initialize child vaccine counts dynamically for all vaccines in the template
    const initialChildVaccineCounts: Record<string, number> = {};
    NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.forEach(vax => {
        // Sanitize name to be a valid object key
        const key = vax.name.replace(/[^a-zA-Z0-9]/g, '');
        initialChildVaccineCounts[key] = 0;
    });

    const stats = {
      child: {
        ...initialChildVaccineCounts, // All vaccines from template
        total: 0
      },
      maternal: {
        td1: 0, td2: 0, tdBooster: 0, total: 0
      },
      uniqueChildrenVax: { male: 0, female: 0, other: 0, total: 0 },
      ethnicFIC_Under24: Object.keys(jatLabels).reduce((acc, code) => {
        acc[code] = { male: 0, female: 0, total: 0 };
        return acc;
      }, {} as Record<string, { male: number, female: number, total: number }>),
      ethnicFIC_Over24: Object.keys(jatLabels).reduce((acc, code) => {
        acc[code] = { male: 0, female: 0, total: 0 };
        return acc;
      }, {} as Record<string, { male: number, female: number, total: number }>)
    };

    bachhaRecords
      .filter(r => filterCenter ? r.vaccinationCenter === filterCenter : true) // Filter by center
      .forEach(record => {
        let isFullyImmunized = false;
        let lastVaccineMonth = '';
        let lastVaccineDateAd = '';
        let lastVaccineGivenDateBs = '';
        let receivedDoseThisMonth = false;

        // Check if child has taken ALL required vaccines (excluding HPV)
        const requiredVaccines = NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.filter(req => !req.name.includes('HPV'));
        const hasAllRequired = requiredVaccines.every(reqVax => {
          return record.vaccines.some(v => {
            if (v.status !== 'Given') return false;
            const nameLower = (v.name || '').toLowerCase();
            const reqLower = reqVax.name.toLowerCase();
            const normalize = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalize(v.name) === normalize(reqVax.name)) return true;
            
            // Fallbacks
            if (reqLower.includes('bcg') && nameLower.includes('bcg')) return true;
            if (reqLower.includes('dpt-hepb-hib-1') && (
              nameLower.includes('dpt-hepb-hib-1') || 
              nameLower.includes('dpt 1') || 
              nameLower.includes('penta-1') || 
              nameLower.includes('penta 1') || 
              nameLower.includes('pentavalent-1') || 
              nameLower.includes('pentavalent 1')
            )) return true;
            if (reqLower.includes('opv-1') && (nameLower.includes('opv-1') || nameLower.includes('opv 1') || nameLower.includes('polio 1'))) return true;
            if (reqLower.includes('pcv-1') && (nameLower.includes('pcv-1') || nameLower.includes('pcv 1'))) return true;
            if (reqLower.includes('rota-1') && (
              nameLower.includes('rota-1') || 
              nameLower.includes('rota 1') || 
              nameLower.includes('rotavirus-1') || 
              nameLower.includes('rotavirus 1')
            )) return true;
            if (reqLower.includes('dpt-hepb-hib-2') && (
              nameLower.includes('dpt-hepb-hib-2') || 
              nameLower.includes('dpt 2') || 
              nameLower.includes('penta-2') || 
              nameLower.includes('penta 2') || 
              nameLower.includes('pentavalent-2') || 
              nameLower.includes('pentavalent 2')
            )) return true;
            if (reqLower.includes('opv-2') && (nameLower.includes('opv-2') || nameLower.includes('opv 2') || nameLower.includes('polio 2'))) return true;
            if (reqLower.includes('rota-2') && (
              nameLower.includes('rota-2') || 
              nameLower.includes('rota 2') || 
              nameLower.includes('rotavirus-2') || 
              nameLower.includes('rotavirus 2')
            )) return true;
            if (reqLower.includes('pcv-2') && (nameLower.includes('pcv-2') || nameLower.includes('pcv 2'))) return true;
            if (reqLower.includes('fipv-1') && (
              nameLower.includes('fipv-1') || 
              nameLower.includes('fipv 1') || 
              (nameLower.includes('fipv') && !nameLower.includes('2') && !nameLower.includes('२'))
            )) return true;
            if (reqLower.includes('dpt-hepb-hib-3') && (
              nameLower.includes('dpt-hepb-hib-3') || 
              nameLower.includes('dpt 3') || 
              nameLower.includes('penta-3') || 
              nameLower.includes('penta 3') || 
              nameLower.includes('pentavalent-3') || 
              nameLower.includes('pentavalent 3')
            )) return true;
            if (reqLower.includes('opv-3') && (nameLower.includes('opv-3') || nameLower.includes('opv 3') || nameLower.includes('polio 3'))) return true;
            if (reqLower.includes('mr-1') && (nameLower.includes('mr-1') || nameLower.includes('mr 1') || nameLower.includes('measles 1'))) return true;
            if (reqLower.includes('pcv-3') && (nameLower.includes('pcv-3') || nameLower.includes('pcv 3'))) return true;
            if (reqLower.includes('fipv-2') && (nameLower.includes('fipv-2') || nameLower.includes('fipv 2'))) return true;
            if (reqLower.includes('je') && (nameLower.includes('je') || nameLower.includes('जे.ई.') || nameLower.includes('japanese'))) return true;
            if (reqLower.includes('mr-2') && (nameLower.includes('mr-2') || nameLower.includes('mr 2') || nameLower.includes('measles 2'))) return true;
            if (reqLower.includes('typhoid') && (nameLower.includes('typhoid') || nameLower.includes('टाइफाइड') || nameLower.includes('tcv'))) return true;
            return false;
          });
        });

        // Fallback or shortcut: if they received MR-2 or Typhoid (given here, not elsewhere)
        const hasCompletionVax = record.vaccines.some(v => v.status === 'Given' && !v.vaccinatedElsewhere && (v.name.toLowerCase().includes('mr-2') || v.name.toLowerCase().includes('typhoid')));

        if (hasAllRequired || hasCompletionVax) {
          isFullyImmunized = true;
          // Find the latest given date of the 15-month completion vaccines (MR-2 or Typhoid) to decide when they were fully immunized
          const fifteenMonthVaccines = record.vaccines.filter(v => 
            (v.name.toLowerCase().includes('mr-2') || v.name.toLowerCase().includes('typhoid')) && 
            v.status === 'Given'
          );
          
          if (fifteenMonthVaccines.length > 0) {
            const sortedFifteen = [...fifteenMonthVaccines].sort((a, b) => {
              const d1 = a.givenDateBs || '';
              const d2 = b.givenDateBs || '';
              return d1.localeCompare(d2);
            });
            const latestVax = sortedFifteen[sortedFifteen.length - 1];
            lastVaccineMonth = (latestVax.givenDateBs || '').split('-')[1] || '';
            lastVaccineGivenDateBs = latestVax.givenDateBs || '';
            lastVaccineDateAd = latestVax.givenDateAd || '';
          } else {
            // Fallback to the latest vaccine of all given vaccines excluding HPV
            const nonHpvVax = record.vaccines.filter(v => v.status === 'Given' && !v.name.includes('HPV'));
            if (nonHpvVax.length > 0) {
              const sortedAll = [...nonHpvVax].sort((a, b) => {
                const d1 = a.givenDateBs || '';
                const d2 = b.givenDateBs || '';
                return d1.localeCompare(d2);
              });
              const latestVax = sortedAll[sortedAll.length - 1];
              lastVaccineMonth = (latestVax.givenDateBs || '').split('-')[1] || '';
              lastVaccineGivenDateBs = latestVax.givenDateBs || '';
              lastVaccineDateAd = latestVax.givenDateAd || '';
            }
          }
        }

        record.vaccines.forEach(v => {
          if (v.status === 'Given' && !v.vaccinatedElsewhere && v.givenDateBs) {
            const m = v.givenDateBs.split('-')[1];
            const vaxFY = getFiscalYearFromBsDate(v.givenDateBs);
            
            // Dual fiscal year match to ensure we do not miss any records registered in this fiscal year but vaccinated at different boundaries
            if ((selectedMonth === 'all' || m === selectedMonth) && (vaxFY === selectedFiscalYear || record.fiscalYear === selectedFiscalYear)) {
              if (selectedVaccine === 'all' || (!selectedVaccine.startsWith('TD') && isSameVaccine(v.name, selectedVaccine))) {
                receivedDoseThisMonth = true;
                const nameLower = (v.name || '').toLowerCase();
                
                // 1. Normalized exact match first
                const normalize = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const normVax = normalize(v.name);
                
                let matchedVax = NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.find(vax => normalize(vax.name) === normVax);
                
                // 2. If not found, fall back to sub-string matching
                if (!matchedVax) {
                  matchedVax = NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.find(vax => {
                    const vaxName = vax.name.toLowerCase();
                    if (vaxName.includes('bcg') && nameLower.includes('bcg')) return true;
                    if (vaxName.includes('dpt-hepb-hib-1') && (
                      nameLower.includes('dpt-hepb-hib-1') || 
                      nameLower.includes('dpt 1') || 
                      nameLower.includes('penta-1') || 
                      nameLower.includes('penta 1') || 
                      nameLower.includes('pentavalent-1') || 
                      nameLower.includes('pentavalent 1')
                    )) return true;
                    if (vaxName.includes('opv-1') && (nameLower.includes('opv-1') || nameLower.includes('opv 1') || nameLower.includes('polio 1'))) return true;
                    if (vaxName.includes('pcv-1') && (nameLower.includes('pcv-1') || nameLower.includes('pcv 1'))) return true;
                    if (vaxName.includes('rota-1') && (
                      nameLower.includes('rota-1') || 
                      nameLower.includes('rota 1') || 
                      nameLower.includes('rotavirus-1') || 
                      nameLower.includes('rotavirus 1')
                    )) return true;
                    
                    if (vaxName.includes('dpt-hepb-hib-2') && (
                      nameLower.includes('dpt-hepb-hib-2') || 
                      nameLower.includes('dpt 2') || 
                      nameLower.includes('penta-2') || 
                      nameLower.includes('penta 2') || 
                      nameLower.includes('pentavalent-2') || 
                      nameLower.includes('pentavalent 2')
                    )) return true;
                    if (vaxName.includes('opv-2') && (nameLower.includes('opv-2') || nameLower.includes('opv 2') || nameLower.includes('polio 2'))) return true;
                    if (vaxName.includes('rota-2') && (
                      nameLower.includes('rota-2') || 
                      nameLower.includes('rota 2') || 
                      nameLower.includes('rotavirus-2') || 
                      nameLower.includes('rotavirus 2')
                    )) return true;
                    if (vaxName.includes('pcv-2') && (nameLower.includes('pcv-2') || nameLower.includes('pcv 2'))) return true;
                    
                    if (vaxName.includes('fipv-1') && (
                      nameLower.includes('fipv-1') || 
                      nameLower.includes('fipv 1') || 
                      (nameLower.includes('fipv') && !nameLower.includes('2') && !nameLower.includes('२'))
                    )) return true;
                    if (vaxName.includes('dpt-hepb-hib-3') && (
                      nameLower.includes('dpt-hepb-hib-3') || 
                      nameLower.includes('dpt 3') || 
                      nameLower.includes('penta-3') || 
                      nameLower.includes('penta 3') || 
                      nameLower.includes('pentavalent-3') || 
                      nameLower.includes('pentavalent 3')
                    )) return true;
                    if (vaxName.includes('opv-3') && (nameLower.includes('opv-3') || nameLower.includes('opv 3') || nameLower.includes('polio 3'))) return true;
                    
                    if (vaxName.includes('mr-1') && (nameLower.includes('mr-1') || nameLower.includes('mr 1') || nameLower.includes('measles 1'))) return true;
                    if (vaxName.includes('pcv-3') && (nameLower.includes('pcv-3') || nameLower.includes('pcv 3'))) return true;
                    if (vaxName.includes('fipv-2') && (nameLower.includes('fipv-2') || nameLower.includes('fipv 2'))) return true;
                    
                    if (vaxName.includes('je') && (nameLower.includes('je') || nameLower.includes('जे.ई.') || nameLower.includes('japanese'))) return true;
                    if (vaxName.includes('mr-2') && (nameLower.includes('mr-2') || nameLower.includes('mr 2') || nameLower.includes('measles 2'))) return true;
                    if (vaxName.includes('typhoid') && (nameLower.includes('typhoid') || nameLower.includes('टाइफाइड') || nameLower.includes('tcv'))) return true;
                    if (vaxName.includes('hpv') && nameLower.includes('hpv')) return true;

                    return nameLower === vaxName || v.name === vax.name;
                  });
                }

                if (matchedVax) {
                  const nameKey = matchedVax.name.replace(/[^a-zA-Z0-9]/g, '');
                  if (stats.child[nameKey] !== undefined) {
                    stats.child[nameKey]++;
                  }
                } else {
                  const nameKey = v.name.replace(/[^a-zA-Z0-9]/g, '');
                  if (stats.child[nameKey] !== undefined) {
                    stats.child[nameKey]++;
                  }
                }
                stats.child.total++;
              }
            }
          }
        });

        if (receivedDoseThisMonth) {
            const gender = record.gender.toLowerCase();
            if (gender === 'male') stats.uniqueChildrenVax.male++;
            else if (gender === 'female') stats.uniqueChildrenVax.female++;
            else stats.uniqueChildrenVax.other++;
            stats.uniqueChildrenVax.total++;
        }

        // Check dual matching for the selected month and fiscal year for FIC tables
        if (isFullyImmunized && (selectedMonth === 'all' || lastVaccineMonth === selectedMonth) && (getFiscalYearFromBsDate(lastVaccineGivenDateBs) === selectedFiscalYear || record.fiscalYear === selectedFiscalYear)) {
            const code = record.jatCode || '06'; 
            const gender = record.gender === 'Female' ? 'female' : 'male';
            
            // Calculate Age
            let ageMonths = 0;
            if (record.dobAd && lastVaccineDateAd) {
                const dob = new Date(record.dobAd);
                const vaxDate = new Date(lastVaccineDateAd);
                ageMonths = (vaxDate.getFullYear() - dob.getFullYear()) * 12 + (vaxDate.getMonth() - dob.getMonth());
                if (vaxDate.getDate() < dob.getDate()) {
                    ageMonths--;
                }
            }

            if (ageMonths <= 23) {
                if (stats.ethnicFIC_Under24[code]) {
                    stats.ethnicFIC_Under24[code][gender]++;
                    stats.ethnicFIC_Under24[code].total++;
                }
            } else {
                if (stats.ethnicFIC_Over24[code]) {
                    stats.ethnicFIC_Over24[code][gender]++;
                    stats.ethnicFIC_Over24[code].total++;
                }
            }
        }
      });

    maternalRecords
      .filter(r => filterCenter ? (r.remarks?.includes(filterCenter) || r.address?.includes(filterCenter)) : true) // Basic filter for maternal records
      .forEach(p => {
        if (p.td1DateBs) {
          const m = p.td1DateBs.split('-')[1];
          if ((selectedMonth === 'all' || m === selectedMonth) && (getFiscalYearFromBsDate(p.td1DateBs) === selectedFiscalYear || p.fiscalYear === selectedFiscalYear) && !p.td1VaccinatedElsewhere) {
            if (selectedVaccine === 'all' || selectedVaccine === 'TD1') {
              stats.maternal.td1++;
            }
          }
        }
        if (p.td2DateBs) {
          const m = p.td2DateBs.split('-')[1];
          if ((selectedMonth === 'all' || m === selectedMonth) && (getFiscalYearFromBsDate(p.td2DateBs) === selectedFiscalYear || p.fiscalYear === selectedFiscalYear) && !p.td2VaccinatedElsewhere) {
            if (selectedVaccine === 'all' || selectedVaccine === 'TD2') {
              stats.maternal.td2++;
            }
          }
        }
        if (p.tdBoosterDateBs) {
          const m = p.tdBoosterDateBs.split('-')[1];
          if ((selectedMonth === 'all' || m === selectedMonth) && (getFiscalYearFromBsDate(p.tdBoosterDateBs) === selectedFiscalYear || p.fiscalYear === selectedFiscalYear) && !p.tdBoosterVaccinatedElsewhere) {
            if (selectedVaccine === 'all' || selectedVaccine === 'TD Booster') {
              stats.maternal.tdBooster++;
            }
          }
        }
      });
    stats.maternal.total = stats.maternal.td1 + stats.maternal.td2 + stats.maternal.tdBooster;

    return stats;
  }, [bachhaRecords, maternalRecords, selectedFiscalYear, selectedMonth, filterCenter, selectedVaccine]);

  const currentMonthLabel = nepaliMonthOptions.find(m => m.value === selectedMonth)?.label || '';

  const handlePrint = (printId: string) => {
    const printContent = document.getElementById(printId);
    if (!printContent) return;

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

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Immunization Report</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page { margin: 10mm; size: A4 portrait; }
          body { 
            font-family: 'Mukta', sans-serif; 
            background: white; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
            padding: 20px;
          }
          /* Ensure table styles are explicitly applied for print */
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 4px 6px; }
          thead th { background-color: #f0f0f0; font-weight: bold; }
          .no-print { display: none; }
          /* print header specific styles */
          .print-header { 
            text-align: center; 
            margin-bottom: 20px; 
            border-bottom: 2px solid #000; 
            padding-bottom: 12px; 
            position: relative;
            min-height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .print-logo {
            position: absolute;
            left: 10px;
            top: 0;
            height: 75px;
            width: 75px;
            object-fit: contain;
            display: block !important;
          }
          .print-header-text {
            text-align: center;
            width: 100%;
            padding-left: 90px;
            padding-right: 90px;
          }
          .print-header h1 { 
            font-size: 20px; 
            margin: 0 0 3px 0;
            font-weight: bold;
          }
          .print-header h2 { 
            font-size: 15px; 
            margin: 0 0 2px 0;
            font-weight: bold;
          }
          .print-header h3 { 
            font-size: 13px; 
            margin: 0 0 2px 0;
            font-weight: normal;
          }
          .print-header h4 { 
            font-size: 12px; 
            margin: 0 0 2px 0;
            font-weight: normal;
          }
          .print-header p {
            font-size: 11px;
            margin: 4px 0 0 0;
            color: #334155;
          }
          /* Utility replacements if tailwind fails to load fast enough */
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .mb-6 { margin-bottom: 24px; }
          .pb-4 { padding-bottom: 16px; }
          .border-b-2 { border-bottom-width: 2px; }
          .border-slate-900 { border-color: #0f172a; }
          .page-break { page-break-before: always; }
          .flex { display: flex; }
          .flex-wrap { flex-wrap: wrap; }
          .gap-1 { gap: 4px; }
          .bg-indigo-50 { background-color: #f5f3ff; }
          .text-indigo-700 { color: #4338ca; }
          .border-indigo-100 { border-color: #e0e7ff; }
          .rounded { border-radius: 4px; }
          .px-1\\.5 { padding-left: 6px; padding-right: 6px; }
          .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
          .text-\\[10px\\] { font-size: 10px; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
           // Wait for resources (fonts/tailwind) to load slightly
           window.onload = function() {
              setTimeout(function() {
                 window.print();
              }, 800);
           };
        </script>
      </body>
      </html>
    `);
    doc.close();

    // Clean up iframe after printing
    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 5000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* Tab Selector */}
      <div className="flex border-b border-slate-200 no-print bg-slate-50 rounded-lg p-1">
        <button
          onClick={() => setActiveReportTab('summary')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-bold font-nepali text-sm transition-all duration-200 ${
            activeReportTab === 'summary'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart size={16} />
          संख्यात्मक विवरण प्रतिवेदन (Summary Report)
        </button>
        <button
          onClick={() => setActiveReportTab('detail')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-bold font-nepali text-sm transition-all duration-200 ${
            activeReportTab === 'detail'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users size={16} />
          बालबालिका विस्तृत विवरण (Detailed Children Log)
        </button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
        <div className="flex flex-wrap gap-4 items-end w-full md:w-auto">
          <div className="w-40"><Select label="आर्थिक वर्ष" options={FISCAL_YEARS} value={selectedFiscalYear} onChange={(e) => setSelectedFiscalYear(e.target.value)} icon={<Calendar size={18} />} /></div>
          <div className="w-48"><Select label="महिना" options={nepaliMonthOptions} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} icon={<Filter size={18} />} /></div>
          <div className="w-48">
            <Select 
                label="खोप केन्द्र" 
                options={[{id: '', value: '', label: '-- सबै केन्द्रहरू --'}, ...centerOptions]} 
                value={filterCenter} 
                onChange={(e) => setFilterCenter(e.target.value)} 
                icon={<MapPinned size={18} />} 
            />
          </div>
          <div className="w-56">
            <Select 
                label="खोप (Vaccine Filter)" 
                options={vaccineOptions} 
                value={selectedVaccine} 
                onChange={(e) => setSelectedVaccine(e.target.value)} 
                icon={<Droplets size={18} />} 
            />
          </div>
          {activeReportTab === 'detail' && (
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs font-bold text-slate-600 mb-1 font-nepali">बालबालिका खोज्नुहोस् (Search Child)</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="दर्ता नं, नाम, ठेगाना, बुवा/आमा, फोन..."
                  className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-nepali"
                />
              </div>
            </div>
          )}
        </div>
        <button 
          onClick={() => handlePrint(activeReportTab === 'summary' ? 'print-summary-content' : 'print-detailed-content')} 
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium shadow-sm transition-colors whitespace-nowrap w-full md:w-auto mt-2 md:mt-0"
        >
          <Printer size={18} /> {activeReportTab === 'summary' ? 'प्रिन्ट (संख्यात्मक)' : 'प्रिन्ट (विस्तृत विवरण)'}
        </button>
      </div>

      {activeReportTab === 'summary' ? (
        /* ======================== SUMMARY REPORT VIEW ======================== */
        <div id="print-summary-content" className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-[210mm] mx-auto print-full">
          {/* Header */}
          <div className="print-header mb-6 pb-4 flex items-center justify-center relative border-b-2 border-slate-900">
              <img src={generalSettings.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png"} alt="Logo" className="print-logo hidden" />
              <div className="print-header-text text-center">
                  <h1>{generalSettings.orgNameNepali}</h1>
                  {generalSettings.subTitleNepali && <h2>{generalSettings.subTitleNepali}</h2>}
                  {generalSettings.subTitleNepali2 && <h3>{generalSettings.subTitleNepali2}</h3>}
                  {generalSettings.subTitleNepali3 && <h4>{generalSettings.subTitleNepali3}</h4>}
                  <h2 className="mt-3 font-bold text-lg font-black underline font-nepali">मासिक खोप कार्यक्रम प्रतिवेदन (संख्यात्मक विवरण)</h2>
                  <div className="flex justify-between mt-4 text-xs font-bold text-slate-600 font-nepali">
                      <span>आ.व.: {selectedFiscalYear}</span>
                      <span>महिना: {currentMonthLabel}</span>
                      <span>केन्द्र: {filterCenter || 'सबै'}</span>
                      {selectedVaccine !== 'all' && <span>खोप: {selectedVaccine}</span>}
                  </div>
              </div>
          </div>

          {/* Section 1: Child Vaccines Table */}
          <div className="mb-8">
              <h4 className="text-base font-bold text-indigo-800 mb-2 font-nepali border-b border-indigo-100 pb-1">१. खोप मात्रा अनुसारको तथ्याङ्क (Child Immunization)</h4>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-700 font-bold">
                          <tr>
                              <th className="border-b border-r border-slate-200 p-3">खोपको नाम (Vaccine)</th>
                              <th className="border-b border-slate-200 p-3 text-center w-32">संख्या (Count)</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                          {NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.map((vax, i) => {
                              const nameKey = vax.name.replace(/[^a-zA-Z0-9]/g, '');
                              const count = reportStats.child[nameKey] !== undefined ? reportStats.child[nameKey] : 0;
                              return (
                                  <tr key={i} className="hover:bg-slate-50">
                                      <td className="border-r border-slate-200 p-2 pl-3">{vax.name}</td>
                                      <td className="p-2 text-center font-mono font-bold text-slate-700">{count}</td>
                                  </tr>
                              );
                          })}
                          <tr className="bg-indigo-50 font-bold text-indigo-900">
                              <td className="border-r border-indigo-200 p-2 pl-3 text-right">कुल बालबालिका (जसले यो महिना कुनै खोप लगाए):</td>
                              <td className="p-2 text-center">{reportStats.uniqueChildrenVax.total}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Section 2: Maternal Table */}
          <div className="mb-8">
              <h4 className="text-base font-bold text-purple-800 mb-2 font-nepali border-b border-purple-100 pb-1">२. गर्भवती महिला TD खोपको तथ्याङ्क (Maternal TD)</h4>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-700 font-bold">
                          <tr>
                              <th className="border-b border-r border-slate-200 p-3">खोपको नाम (Vaccine)</th>
                              <th className="border-b border-slate-200 p-3 text-center w-32">संख्या (Count)</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                          <tr className="hover:bg-slate-50">
                              <td className="border-r border-slate-200 p-2 pl-3">TD1</td>
                              <td className="p-2 text-center font-mono font-bold text-slate-700">{reportStats.maternal.td1}</td>
                          </tr>
                          <tr className="hover:bg-slate-50">
                              <td className="border-r border-slate-200 p-2 pl-3">TD2</td>
                              <td className="p-2 text-center font-mono font-bold text-slate-700">{reportStats.maternal.td2}</td>
                          </tr>
                          <tr className="hover:bg-slate-50">
                              <td className="border-r border-slate-200 p-2 pl-3">TD Booster</td>
                              <td className="p-2 text-center font-mono font-bold text-slate-700">{reportStats.maternal.tdBooster}</td>
                          </tr>
                          <tr className="bg-purple-50 font-bold text-purple-900">
                              <td className="border-r border-purple-200 p-2 pl-3 text-right">कुल खोप लगाउने गर्भवती महिलाहरू:</td>
                              <td className="p-2 text-center">{reportStats.maternal.total}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Section 3: Grand Total Immunization Service Recipients */}
          <div className="mb-8">
              <h4 className="text-base font-bold text-emerald-800 mb-2 font-nepali border-b border-emerald-100 pb-1">३. जम्मा खोप सेवा पाएकाको संख्या (Grand Total Recipients)</h4>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm text-left border-collapse">
                      <tbody className="divide-y divide-slate-200">
                          <tr className="bg-indigo-50 font-bold text-indigo-900">
                              <td className="p-2 pl-3 text-right">कुल बालबालिका (जसले यो महिना कुनै खोप लगाए):</td>
                              <td className="p-2 text-center w-32 font-mono font-bold text-indigo-700">{reportStats.uniqueChildrenVax.total}</td>
                          </tr>
                          <tr className="bg-purple-50 font-bold text-purple-900">
                              <td className="p-2 pl-3 text-right">TD खोप पाउने गर्भवतीको संख्या (Total Maternal TD):</td>
                              <td className="p-2 text-center w-32 font-mono font-bold text-purple-700">{reportStats.maternal.total}</td>
                          </tr>
                          <tr className="bg-emerald-600 font-bold text-white text-sm">
                              <td className="p-2 pl-3 text-right text-base">जम्मा खोप सेवा पाएकाको संख्या (बालबालिका + गर्भवती):</td>
                              <td className="p-2 text-center w-32 font-mono text-lg font-black">{reportStats.uniqueChildrenVax.total + reportStats.maternal.total}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Section 4: Ethnicity Table (Under 24 Months) */}
          <div className="mb-8">
              <h4 className="text-base font-bold text-teal-800 mb-2 font-nepali border-b border-teal-100 pb-1">४. पूर्ण खोप पुरा गरेका बच्चाहरू (२३ महिना सम्म) (Fully Immunized Children ≤ 23 Months)</h4>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-700 font-bold">
                          <tr>
                              <th className="border-b border-r border-slate-200 p-3">जातीय कोड (Ethnicity)</th>
                              <th className="border-b border-r border-slate-200 p-3 text-center w-24">बालक (Male)</th>
                              <th className="border-b border-r border-slate-200 p-3 text-center w-24">बालिका (Female)</th>
                              <th className="border-b border-slate-200 p-3 text-center w-24">जम्मा (Total)</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                          {Object.entries(jatLabels).map(([code, label]) => {
                              const d = reportStats.ethnicFIC_Under24[code] || { male: 0, female: 0, total: 0 };
                              return (
                                  <tr key={code} className="hover:bg-slate-50">
                                      <td className="border-r border-slate-200 p-2 pl-3"><span className="font-mono font-bold text-slate-500 mr-2">{code}</span> {label}</td>
                                      <td className="border-r border-slate-200 p-2 text-center text-slate-700">{d.male}</td>
                                      <td className="border-r border-slate-200 p-2 text-center text-slate-700">{d.female}</td>
                                      <td className="p-2 text-center font-bold text-teal-700">{d.total}</td>
                                  </tr>
                              );
                          })}
                          <tr className="bg-teal-50 font-bold text-teal-900">
                              <td className="border-r border-teal-200 p-2 pl-3 text-right">कुल पूर्ण खोप (FIC ≤ 23 Months):</td>
                              <td className="border-r border-teal-200 p-2 text-center">{Object.values(reportStats.ethnicFIC_Under24).reduce((a, b: any) => a + b.male, 0)}</td>
                              <td className="border-r border-teal-200 p-2 text-center">{Object.values(reportStats.ethnicFIC_Under24).reduce((a, b: any) => a + b.female, 0)}</td>
                              <td className="p-2 text-center">{Object.values(reportStats.ethnicFIC_Under24).reduce((a, b: any) => a + b.total, 0)}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Section 5: Ethnicity Table (Over 24 Months) */}
          <div className="mb-8">
              <h4 className="text-base font-bold text-orange-800 mb-2 font-nepali border-b border-orange-100 pb-1">५. पूर्ण खोप पुरा गरेका बच्चाहरू (२३ महिना माथि) (Fully Immunized Children {'>'} 23 Months)</h4>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-700 font-bold">
                          <tr>
                              <th className="border-b border-r border-slate-200 p-3">जातीय कोड (Ethnicity)</th>
                              <th className="border-b border-r border-slate-200 p-3 text-center w-24">बालक (Male)</th>
                              <th className="border-b border-r border-slate-200 p-3 text-center w-24">बालिका (Female)</th>
                              <th className="border-b border-slate-200 p-3 text-center w-24">जम्मा (Total)</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                          {Object.entries(jatLabels).map(([code, label]) => {
                              const d = reportStats.ethnicFIC_Over24[code] || { male: 0, female: 0, total: 0 };
                              return (
                                  <tr key={code} className="hover:bg-slate-50">
                                      <td className="border-r border-slate-200 p-2 pl-3"><span className="font-mono font-bold text-slate-500 mr-2">{code}</span> {label}</td>
                                      <td className="border-r border-slate-200 p-2 text-center text-slate-700">{d.male}</td>
                                      <td className="border-r border-slate-200 p-2 text-center text-slate-700">{d.female}</td>
                                      <td className="p-2 text-center font-bold text-orange-700">{d.total}</td>
                                  </tr>
                              );
                          })}
                          <tr className="bg-orange-50 font-bold text-orange-900">
                              <td className="border-r border-orange-200 p-2 pl-3 text-right">कुल पूर्ण खोप (FIC {'>'} 23 Months):</td>
                              <td className="border-r border-orange-200 p-2 text-center">{Object.values(reportStats.ethnicFIC_Over24).reduce((a, b: any) => a + b.male, 0)}</td>
                              <td className="border-r border-orange-200 p-2 text-center">{Object.values(reportStats.ethnicFIC_Over24).reduce((a, b: any) => a + b.female, 0)}</td>
                              <td className="p-2 text-center">{Object.values(reportStats.ethnicFIC_Over24).reduce((a, b: any) => a + b.total, 0)}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Footer */}
          <div className="grid grid-cols-2 gap-10 mt-12 text-center text-xs font-bold font-nepali">
              <div className="border-t border-slate-900 pt-2">तयार गर्ने</div>
              <div className="border-t border-slate-900 pt-2">स्वीकृत गर्ने</div>
          </div>
        </div>
      ) : (
        /* ======================== DETAILED LOG VIEW ======================== */
        <div id="print-detailed-content" className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-[297mm] mx-auto print-full">
          {/* Header */}
          <div className="print-header mb-6 pb-4 flex items-center justify-center relative border-b-2 border-slate-900">
              <img src={generalSettings.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png"} alt="Logo" className="print-logo hidden" />
              <div className="print-header-text text-center">
                  <h1>{generalSettings.orgNameNepali}</h1>
                  {generalSettings.subTitleNepali && <h2>{generalSettings.subTitleNepali}</h2>}
                  {generalSettings.subTitleNepali2 && <h3>{generalSettings.subTitleNepali2}</h3>}
                  {generalSettings.subTitleNepali3 && <h4>{generalSettings.subTitleNepali3}</h4>}
                  <h2 className="mt-3 font-bold text-lg font-black underline font-nepali">मासिक खोप कार्यक्रम प्रतिवेदन (बालबालिका विस्तृत विवरण)</h2>
                  <div className="flex justify-between mt-4 text-xs font-bold text-slate-600 font-nepali">
                      <span>आ.व.: {selectedFiscalYear}</span>
                      <span>महिना: {currentMonthLabel}</span>
                      <span>केन्द्र: {filterCenter || 'सबै'}</span>
                      {selectedVaccine !== 'all' && <span>खोप: {selectedVaccine}</span>}
                      <span>जम्मा संख्या: {filteredChildren.length}</span>
                  </div>
              </div>
          </div>

          {/* Section 5: Children's Detailed Immunization Log */}
          <div className="mb-8">
              <h4 className="text-base font-bold text-indigo-900 mb-2 font-nepali border-b border-indigo-200 pb-1 flex justify-between items-center">
                  <span>यो महिना खोप प्राप्त गर्ने बालबालिकाको विस्तृत विवरण (Children's Detailed Immunization Log)</span>
              </h4>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                      <thead className="bg-slate-50 text-slate-700 font-bold">
                          <tr className="bg-slate-100">
                              <th className="border-b border-r border-slate-200 p-2 text-center w-8">क्र.सं.</th>
                              <th className="border-b border-r border-slate-200 p-2 w-16 text-center">दर्ता नं.</th>
                              <th className="border-b border-r border-slate-200 p-2">बच्चाको नाम (Child's Name)</th>
                              <th className="border-b border-r border-slate-200 p-2 w-12 text-center">लिङ्ग</th>
                              <th className="border-b border-r border-slate-200 p-2 w-20 text-center">जन्म मिति</th>
                              <th className="border-b border-r border-slate-200 p-2">बुवा / आमाको नाम (Parents)</th>
                              <th className="border-b border-r border-slate-200 p-2">ठेगाना र फोन (Address & Contact)</th>
                              <th className="border-b border-r border-slate-200 p-2">यो महिना लगाइएको खोप (Vaccines Given)</th>
                              <th className="border-b border-r border-slate-200 p-2 text-center">खोप केन्द्र</th>
                              <th className="border-b border-slate-200 p-2 w-20 text-center">स्थिति (Status)</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                          {filteredChildren.length === 0 ? (
                              <tr>
                                  <td colSpan={10} className="p-4 text-center text-slate-500 font-nepali font-medium bg-slate-50">यस अवधिमा कुनै खोपको विवरण फेला परेन।</td>
                              </tr>
                          ) : (
                              filteredChildren.map((child, idx) => (
                                  <tr key={child.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="border-r border-slate-200 p-2 text-center font-mono">{idx + 1}</td>
                                      <td className="border-r border-slate-200 p-2 text-center font-mono font-bold text-indigo-700">{child.regNo}</td>
                                      <td className="border-r border-slate-200 p-2 font-bold text-slate-800">{child.childName}</td>
                                      <td className="border-r border-slate-200 p-2 text-center font-nepali">{child.gender === 'Male' ? 'पुरुष' : child.gender === 'Female' ? 'महिला' : 'अन्य'}</td>
                                      <td className="border-r border-slate-200 p-2 text-center font-mono text-xs">{child.dobBs}</td>
                                      <td className="border-r border-slate-200 p-2 text-[11px] leading-relaxed">
                                          <div><span className="text-slate-500 font-nepali">बुवा:</span> <span className="font-medium text-slate-700">{child.fatherName || '-'}</span></div>
                                          <div><span className="text-slate-500 font-nepali">आमा:</span> <span className="font-medium text-slate-700">{child.motherName || '-'}</span></div>
                                      </td>
                                      <td className="border-r border-slate-200 p-2 text-[11px] leading-relaxed">
                                          <div className="text-slate-700">{child.address}</div>
                                          <div className="font-mono text-slate-500 font-semibold">{child.phone || '-'}</div>
                                      </td>
                                      <td className="border-r border-slate-200 p-2 text-[11px]">
                                          <div className="flex flex-wrap gap-1">
                                              {child.vaccinesGiven.map((v, vIdx) => (
                                                  <span key={vIdx} className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold border border-indigo-100 text-[10px] whitespace-nowrap">
                                                      {v}
                                                  </span>
                                              ))}
                                          </div>
                                      </td>
                                      <td className="border-r border-slate-200 p-2 text-center text-xs font-medium text-slate-600">{child.vaccinationCenter || '-'}</td>
                                      <td className="p-2 text-center text-[10px] font-bold">
                                          <span className={`inline-block px-2 py-0.5 rounded-full ${
                                              child.isFullyImmunized 
                                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                                          }`}>
                                              {child.statusText}
                                          </span>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Footer */}
          <div className="grid grid-cols-2 gap-10 mt-12 text-center text-xs font-bold font-nepali">
              <div className="border-t border-slate-900 pt-2">तयार गर्ने</div>
              <div className="border-t border-slate-900 pt-2">स्वीकृत गर्ने</div>
          </div>
        </div>
      )}
    </div>
  );
};
