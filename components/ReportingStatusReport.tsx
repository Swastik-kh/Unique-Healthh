import React, { useState, useMemo } from 'react';
import { ServiceSeekerRecord, OrganizationSettings } from '../types/coreTypes';
import { NepaliDatePicker } from './NepaliDatePicker';
import NepaliDate from 'nepali-date-converter';
import { FileText, Printer, RefreshCw, Plus } from 'lucide-react';
import axios from 'axios';
import { getDhis2CellMapping } from '../lib/dhis2Utils';
import { DHIS2_DATASETS } from '../constants/dhis2Metadata';

interface ReportingStatusReportProps {
  serviceSeekerRecords: ServiceSeekerRecord[];
  bachhaImmunizationRecords: any[];
  currentFiscalYear: string;
  generalSettings: OrganizationSettings;
}

export const ReportingStatusReport: React.FC<ReportingStatusReportProps> = ({
  serviceSeekerRecords,
  bachhaImmunizationRecords,
  currentFiscalYear,
  generalSettings
}) => {
  const [reportType, setReportType] = useState<'Daily' | 'Monthly' | 'FiscalYear'>('Monthly');
  const [isPushing, setIsPushing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    try { return new NepaliDate().format('YYYY-MM-DD'); } catch (e) { return ''; }
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    try { return new NepaliDate().format('MM'); } catch (e) { return '01'; }
  });

  // Safe and robust date parser for any separator (- or /) and arbitrary padding
  const parseNepaliDateString = (dateStr: string) => {
    if (!dateStr) return null;
    const normalized = dateStr.replace(/\//g, '-');
    const parts = normalized.split('-');
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parts[2] ? parseInt(parts[2], 10) : null;
      return { year, month, day };
    }
    return null;
  };

  const toNepaliDigits = (num: number | string | undefined | null) => {
    if (num === undefined || num === null) return '०';
    const numStr = String(num);
    const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    return numStr.replace(/[0-9]/g, (d) => nepaliDigits[parseInt(d)]);
  };

  const filteredRecords = useMemo(() => {
    const targetMonth = parseInt(selectedMonth, 10);
    const parsedSelected = parseNepaliDateString(selectedDate);
    const targetYear = parsedSelected ? parsedSelected.year : null;

    return serviceSeekerRecords.filter(record => {
      if (!record.date) return false;
      const parsedRecord = parseNepaliDateString(record.date);
      if (!parsedRecord) return false;

      if (reportType === 'FiscalYear') {
        return record.fiscalYear === currentFiscalYear;
      } else if (reportType === 'Monthly') {
        return parsedRecord.month === targetMonth && parsedRecord.year === targetYear;
      } else {
        // Daily
        if (!parsedSelected) return false;
        return parsedRecord.year === parsedSelected.year &&
               parsedRecord.month === parsedSelected.month &&
               parsedRecord.day === parsedSelected.day;
      }
    });
  }, [serviceSeekerRecords, reportType, selectedDate, selectedMonth, currentFiscalYear]);

  const filteredImmRecords = useMemo(() => {
    const targetMonth = parseInt(selectedMonth, 10);
    const parsedSelected = parseNepaliDateString(selectedDate);
    const targetYear = parsedSelected ? parsedSelected.year : null;

    return (bachhaImmunizationRecords || []).filter(record => {
      if (!record.date) return false;
      const parsedRecord = parseNepaliDateString(record.date);
      if (!parsedRecord) return false;

      if (reportType === 'FiscalYear') {
        return record.fiscalYear === currentFiscalYear;
      } else if (reportType === 'Monthly') {
        return parsedRecord.month === targetMonth && parsedRecord.year === targetYear;
      } else {
        // Daily
        if (!parsedSelected) return false;
        return parsedRecord.year === parsedSelected.year &&
               parsedRecord.month === parsedSelected.month &&
               parsedRecord.day === parsedSelected.day;
      }
    });
  }, [bachhaImmunizationRecords, reportType, selectedDate, selectedMonth, currentFiscalYear]);

  // Calculate Immunization Clinic Stats
  const immClinicStats = useMemo(() => {
    // 1. Total service seekers
    const totalSeekers = filteredImmRecords.length;

    // 2. Operated clinics (unique date + center)
    const operatedClinics = new Set();
    filteredImmRecords.forEach(r => {
        if (r.date && r.vaccinationCenter) {
            operatedClinics.add(`${r.date}_${r.vaccinationCenter}`);
        }
    });

    // 3. Planned clinics
    const sessionDays = generalSettings?.vaccinationSessions || [];
    const centers = generalSettings?.vaccinationCenters || [];
    const basePlanned = sessionDays.length * centers.length;

    let plannedClinics = 0;
    if (reportType === 'Monthly') {
        plannedClinics = basePlanned;
    } else if (reportType === 'FiscalYear') {
        plannedClinics = basePlanned * 12;
    } else if (reportType === 'Daily') {
        const parsedSelected = parseNepaliDateString(selectedDate);
        const day = parsedSelected ? parsedSelected.day : null;
        if (day !== null && sessionDays.includes(day)) {
            plannedClinics = centers.length;
        }
    }

    return {
        totalSeekers,
        operatedClinics: operatedClinics.size,
        plannedClinics
    };
  }, [filteredImmRecords, reportType, selectedMonth, generalSettings, selectedDate]);

  const pushToDHIS2 = async () => {
    if (!generalSettings.dhis2BaseUrl || !generalSettings.dhis2Username || !generalSettings.dhis2Password || !generalSettings.dhis2OrgUnitId) {
      alert('DHIS2 कन्फिगरेसन पुरा भएको छैन। कृपया सेटिङमा मिलाउनुहोस्।');
      return;
    }

    setIsPushing(true);
    try {
      const dataValues: any[] = [];
      
      // Map Age Group Stats
      ageGroups.forEach(group => {
        const stats = getStatsForAgeGroup(group.min, group.max);
        const baseElement = group.label === '0-9' ? 'fuHbV1eiKs0' :
                           group.label === '10-14' ? 'qQ8UCWW6YUs' :
                           group.label === '15-19' ? 'SbdW0pjvph3' :
                           group.label === '20-59' ? 'CLYbMAU5lhD' :
                           group.label === '60+' ? 'HEgvfxOppUY' : null;

        if (baseElement) {
          // Source keys for individual mapping: AGE_0-9_FEMALE, AGE_0-9_MALE, etc.
          const femaleMapping = getDhis2CellMapping(`AGE_${group.label}_FEMALE`, generalSettings, { dataElement: baseElement, categoryOptionCombo: "ye1QuAMRG5Z" });
          const maleMapping = getDhis2CellMapping(`AGE_${group.label}_MALE`, generalSettings, { dataElement: baseElement, categoryOptionCombo: "PflKpozpO7b" });

          dataValues.push(
            { dataElement: femaleMapping.dataElement, categoryOptionCombo: femaleMapping.categoryOptionCombo, value: String(stats.totalFemale) },
            { dataElement: maleMapping.dataElement, categoryOptionCombo: maleMapping.categoryOptionCombo, value: String(stats.totalMale) }
          );
        }
      });

      // Map Clinic Stats (Planned vs Conducted)
      const plannedMapping = getDhis2CellMapping('CLINIC_PLANNED', generalSettings, { dataElement: 'sBAeCFmRvOG', categoryOptionCombo: "kdsirVNKdhm" });
      const conductedMapping = getDhis2CellMapping('CLINIC_CONDUCTED', generalSettings, { dataElement: 'w7FmV7f1Rcn', categoryOptionCombo: "kdsirVNKdhm" });

      dataValues.push(
        { dataElement: plannedMapping.dataElement, categoryOptionCombo: plannedMapping.categoryOptionCombo, value: String(immClinicStats.plannedClinics) },
        { dataElement: conductedMapping.dataElement, categoryOptionCombo: conductedMapping.categoryOptionCombo, value: String(immClinicStats.operatedClinics) }
      );

      const period = reportType === 'Daily' 
        ? selectedDate.replace(/-/g, '') 
        : reportType === 'Monthly' 
          ? `${parseNepaliDateString(selectedDate)?.year}${selectedMonth}`
          : currentFiscalYear.replace(/\//g, '');

      const dataSetId = generalSettings.dhis2DatasetMappings?.['Reporting Status'] || generalSettings.dhis2DataSetId || "a2JkM9Uvfa2";
      const dataSetLabel = DHIS2_DATASETS.find(ds => ds.value === dataSetId)?.label || dataSetId;
      const orgName = generalSettings.dhis2OrgUnitName || generalSettings.officeName || 'Not Specified';

      const confirmMessage = `DHIS2 मा डाटा पठाउन चाहनुहुन्छ?\n\n` +
        `संस्था (DHIS2): ${orgName}\n` +
        `डाटासेट: ${dataSetLabel}\n` +
        `अवधि: ${period}\n\n` +
        `के तपाइँ पक्का हुनुहुन्छ?`;

      if (!window.confirm(confirmMessage)) {
        setIsPushing(false);
        return;
      }

      const payload = {
        dataSet: dataSetId,
        completeDate: new Date().toISOString().split('T')[0],
        period: period,
        orgUnit: generalSettings.officeCode || generalSettings.dhis2OrgUnitId,
        dataValues: dataValues
      };

      const auth = btoa(`${generalSettings.dhis2Username}:${generalSettings.dhis2Password}`);
      
      await axios.post(`${generalSettings.dhis2BaseUrl}dataValueSets`, payload, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      alert('DHIS2 मा सफलतापूर्वक डेटा पठाइयो।');
    } catch (error) {
      console.error("DHIS2 push error:", error);
      alert("DHIS2 मा डेटा पठाउन सकिएन: " + (error instanceof Error ? error.message : "अज्ञात त्रुटि"));
    } finally {
      setIsPushing(false);
    }
  };

  // Helper to calculate age in years
  const getAgeInYears = (record: ServiceSeekerRecord) => {
    if (record.ageYears !== undefined) return record.ageYears;
    // Fallback if only string age is available (legacy)
    const ageStr = record.age || '0';
    return parseInt(ageStr) || 0;
  };

  const ageGroups = [
    { label: '०-९ वर्ष', min: 0, max: 9 },
    { label: '१०-१४ वर्ष', min: 10, max: 14 },
    { label: '१५-१९ वर्ष', min: 15, max: 19 },
    { label: '२०-५९ वर्ष', min: 20, max: 59 },
    { label: '६०-६९ वर्ष', min: 60, max: 69 },
    { label: '>= ७० वर्ष', min: 70, max: 999 },
  ];

  const getStatsForAgeGroup = (min: number, max: number) => {
    const groupRecords = filteredRecords.filter(r => {
      const age = getAgeInYears(r);
      return age >= min && age <= max;
    });

    const newFemale = groupRecords.filter(r => r.visitType === 'New' && r.gender === 'Female').length;
    const newMale = groupRecords.filter(r => r.visitType === 'New' && r.gender === 'Male').length;
    
    const totalFemale = groupRecords.filter(r => r.gender === 'Female').length;
    const totalMale = groupRecords.filter(r => r.gender === 'Male').length;

    // We don't have a specific "Referred" field in MulDartaSewa, so keeping it 0 for now
    const referredFemale = 0;
    const referredMale = 0;

    return { newFemale, newMale, totalFemale, totalMale, referredFemale, referredMale };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 font-nepali flex items-center gap-2">
          <FileText className="text-primary-600" />
          मासिक प्रगती प्रतिवेदन (Reporting Status)
        </h2>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-bold text-sm transition-colors print:hidden">
          <Printer size={16} />
          प्रिन्ट गर्नुहोस्
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">रिपोर्टको प्रकार</label>
          <select 
            value={reportType} 
            onChange={(e) => setReportType(e.target.value as any)}
            className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="Daily">दैनिक (Daily)</option>
            <option value="Monthly">मासिक (Monthly)</option>
            <option value="FiscalYear">आर्थिक वर्ष (Fiscal Year)</option>
          </select>
        </div>

        {reportType === 'Daily' && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">मिति</label>
            <NepaliDatePicker value={selectedDate} onChange={setSelectedDate} />
          </div>
        )}

        {reportType === 'Monthly' && (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">वर्ष</label>
              <select 
                value={(() => {
                  const parsed = parseNepaliDateString(selectedDate);
                  return parsed ? String(parsed.year) : '';
                })()} 
                onChange={(e) => {
                  const yearVal = e.target.value;
                  setSelectedDate(`${yearVal}-${selectedMonth}-01`);
                }}
                className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {[2080, 2081, 2082, 2083].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">महिना</label>
              <select 
                value={selectedMonth} 
                onChange={(e) => {
                  const monthVal = e.target.value;
                  setSelectedMonth(monthVal);
                  const parsed = parseNepaliDateString(selectedDate);
                  const yearVal = parsed ? parsed.year : '2083';
                  setSelectedDate(`${yearVal}-${monthVal}-01`);
                }}
                className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((m, i) => (
                  <option key={m} value={m}>{['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत'][i]}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-x-auto font-sans">
        <div className="text-center mb-6 relative">
          <h3 className="font-bold text-lg font-nepali">मासिक प्रगती प्रतिवेदन</h3>
          <p className="text-sm text-slate-500 font-nepali">
            {reportType === 'Daily' 
              ? `मिति: ${toNepaliDigits(selectedDate)}` 
              : reportType === 'Monthly' 
                ? `महिना: ${toNepaliDigits(parseNepaliDateString(selectedDate)?.year || '')}-${toNepaliDigits(selectedMonth)}` 
                : `आर्थिक वर्ष: ${toNepaliDigits(currentFiscalYear)}`}
          </p>
          <div className="absolute top-0 right-0 print:hidden">
            <button 
              onClick={pushToDHIS2}
              disabled={isPushing}
              className="bg-teal-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-teal-700 flex items-center gap-2 disabled:opacity-50 shadow-sm"
            >
              {isPushing ? (
                <>
                  <RefreshCw className="animate-spin" size={14} />
                  पठाउँदै...
                </>
              ) : (
                <>
                  <Plus size={14} />
                  DHIS2 मा पठाउनुहोस्
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Table 1: Age and Gender Stats */}
          <div className="flex-grow overflow-x-auto min-w-[320px]">
            <table className="w-full text-xs border-collapse border border-slate-300 text-center font-sans">
              <thead className="bg-slate-50 font-nepali">
                <tr>
                  <th rowSpan={2} className="border border-slate-300 p-2 font-bold text-slate-700">उमेर समूह</th>
                  <th colSpan={2} className="border border-slate-300 p-2 font-bold text-slate-700">नयाँ सेवाग्राहीको संख्या</th>
                  <th colSpan={2} className="border border-slate-300 p-2 font-bold text-slate-700">जम्मा (नयाँ/पुरानो) सेवाग्राही संख्या</th>
                  <th colSpan={2} className="border border-slate-300 p-2 font-bold text-slate-700">प्रेषण भई आएका जम्मा सेवाग्राही</th>
                </tr>
                <tr>
                  <th className="border border-slate-300 p-2 text-[11px] text-slate-600">म.</th>
                  <th className="border border-slate-300 p-2 text-[11px] text-slate-600">पु.</th>
                  <th className="border border-slate-300 p-2 text-[11px] text-slate-600">म.</th>
                  <th className="border border-slate-300 p-2 text-[11px] text-slate-600">पु.</th>
                  <th className="border border-slate-300 p-2 text-[11px] text-slate-600">म.</th>
                  <th className="border border-slate-300 p-2 text-[11px] text-slate-600">पु.</th>
                </tr>
              </thead>
              <tbody>
                {ageGroups.map(group => {
                  const stats = getStatsForAgeGroup(group.min, group.max);
                  return (
                    <tr key={group.label} className="hover:bg-slate-50/50 transition-colors">
                      <td className="border border-slate-300 p-2.5 font-bold font-nepali text-left text-slate-700">{group.label}</td>
                      <td className="border border-slate-300 p-2.5 font-medium text-slate-800">{toNepaliDigits(stats.newFemale)}</td>
                      <td className="border border-slate-300 p-2.5 font-medium text-slate-800">{toNepaliDigits(stats.newMale)}</td>
                      <td className="border border-slate-300 p-2.5 font-medium text-slate-800">{toNepaliDigits(stats.totalFemale)}</td>
                      <td className="border border-slate-300 p-2.5 font-medium text-slate-800">{toNepaliDigits(stats.totalMale)}</td>
                      <td className="border border-slate-300 p-2.5 font-medium text-slate-800">{toNepaliDigits(stats.referredFemale)}</td>
                      <td className="border border-slate-300 p-2.5 font-medium text-slate-800">{toNepaliDigits(stats.referredMale)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table 2: Outreach / Clinics */}
          <div className="flex-grow overflow-x-auto min-w-[300px]">
            <table className="w-full text-xs border-collapse border border-slate-300 text-center font-sans">
              <thead className="bg-slate-50 font-nepali">
                <tr>
                  <th className="border border-slate-300 p-2 font-bold text-slate-700">कार्यक्षेत्र भित्र पर्ने निकाय</th>
                  <th className="border border-slate-300 p-2 font-bold text-slate-700">संचालन/प्रतिवेदन हुनुपर्ने (संख्या)</th>
                  <th className="border border-slate-300 p-2 font-bold text-slate-700">संचालन/प्रतिवेदन भएको (संख्या)</th>
                  <th className="border border-slate-300 p-2 font-bold text-slate-700">जम्मा सेवाग्राही संख्या</th>
                </tr>
              </thead>
              <tbody>
                {['गाउँघर क्लिनिक', 'खोप क्लिनिक', 'खोप सेसन', 'सरसफाई सेसन (पटक)', 'म. स्वा. स्व. से.'].map(item => {
                  const isImmClinic = item === 'खोप क्लिनिक' || item === 'खोप सेसन';
                  return (
                    <tr key={item} className="hover:bg-slate-50/50 transition-colors">
                      <td className="border border-slate-300 p-2.5 font-bold font-nepali text-left text-slate-700">{item}</td>
                      <td className="border border-slate-300 p-2.5 text-slate-800">
                        {isImmClinic ? (
                          <span className="font-bold">{toNepaliDigits(immClinicStats.plannedClinics)}</span>
                        ) : (
                          <input type="text" placeholder="०" className="w-full text-center outline-none bg-transparent font-medium border-b border-dashed border-slate-305 focus:border-indigo-400" />
                        )}
                      </td>
                      <td className="border border-slate-300 p-2.5 text-slate-800">
                        {isImmClinic ? (
                          <span className="font-bold">{toNepaliDigits(immClinicStats.operatedClinics)}</span>
                        ) : (
                          <input type="text" placeholder="०" className="w-full text-center outline-none bg-transparent font-medium border-b border-dashed border-slate-305 focus:border-indigo-400" />
                        )}
                      </td>
                      <td className="border border-slate-300 p-2.5 text-slate-800">
                        {isImmClinic ? (
                          <span className="font-bold">{toNepaliDigits(immClinicStats.totalSeekers)}</span>
                        ) : (
                          <input type="text" placeholder="०" className="w-full text-center outline-none bg-transparent font-medium border-b border-dashed border-slate-305 focus:border-indigo-400" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table 3: MSS */}
          <div className="w-full lg:w-64 overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-slate-300 text-center h-full font-sans">
              <thead className="bg-slate-50 font-nepali">
                <tr>
                  <th colSpan={2} className="border border-slate-300 p-2 font-bold text-slate-700">MSS मापदण्ड</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-2.5 text-left font-bold font-nepali text-slate-700 leading-normal">
                    कार्यान्वयन स्तर<br/>
                    <span className="text-[10px] font-normal text-slate-500">१ - पहिलो २ - दोस्रो</span>
                  </td>
                  <td className="border border-slate-300 p-2.5 align-middle">
                    <select className="w-full outline-none bg-transparent font-semibold font-nepali text-center text-slate-800 border-b border-dashed border-slate-300">
                      <option value="">छान्नुहोस्</option>
                      <option value="1">१ - पहिलो</option>
                      <option value="2">२ - दोस्रो</option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2.5 text-left font-bold font-nepali text-slate-700 leading-normal">स्कोर (%)</td>
                  <td className="border border-slate-300 p-2.5 align-middle">
                    <input type="text" placeholder="०" className="w-full text-center outline-none bg-transparent font-bold border-b border-dashed border-slate-300 text-indigo-600" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
