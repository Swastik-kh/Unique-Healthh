import React, { useState, useMemo } from 'react';
import { ServiceSeekerRecord } from '../types/coreTypes';
import { NepaliDatePicker } from './NepaliDatePicker';
import NepaliDate from 'nepali-date-converter';
import { FileText, Printer } from 'lucide-react';

interface ReportingStatusReportProps {
  serviceSeekerRecords: ServiceSeekerRecord[];
  bachhaImmunizationRecords: any[];
  currentFiscalYear: string;
  generalSettings: any;
}

export const ReportingStatusReport: React.FC<ReportingStatusReportProps> = ({
  serviceSeekerRecords,
  bachhaImmunizationRecords,
  currentFiscalYear,
  generalSettings
}) => {
  const [reportType, setReportType] = useState<'Daily' | 'Monthly' | 'FiscalYear'>('Monthly');
  const [selectedDate, setSelectedDate] = useState(() => {
    try { return new NepaliDate().format('YYYY-MM-DD'); } catch (e) { return ''; }
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    try { return new NepaliDate().format('MM'); } catch (e) { return '01'; }
  });

  const filteredRecords = useMemo(() => {
    return serviceSeekerRecords.filter(record => {
      if (reportType === 'FiscalYear') {
        return record.fiscalYear === currentFiscalYear;
      } else if (reportType === 'Monthly') {
        const recordMonth = record.date.split('-')[1];
        const recordYear = record.date.split('-')[0];
        const currentYear = selectedDate.split('-')[0];
        return recordMonth === selectedMonth && recordYear === currentYear;
      } else {
        return record.date === selectedDate;
      }
    });
  }, [serviceSeekerRecords, reportType, selectedDate, selectedMonth, currentFiscalYear]);

  const filteredImmRecords = useMemo(() => {
    return (bachhaImmunizationRecords || []).filter(record => {
      if (reportType === 'FiscalYear') {
        return record.fiscalYear === currentFiscalYear;
      } else if (reportType === 'Monthly') {
        const recordMonth = record.date.split('-')[1];
        const recordYear = record.date.split('-')[0];
        const currentYear = selectedDate.split('-')[0];
        return recordMonth === selectedMonth && recordYear === currentYear;
      } else {
        return record.date === selectedDate;
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
        const day = parseInt(selectedDate.split('-')[2]);
        if (sessionDays.includes(day)) {
            plannedClinics = centers.length;
        }
    }

    return {
        totalSeekers,
        operatedClinics: operatedClinics.size,
        plannedClinics
    };
  }, [filteredImmRecords, reportType, selectedMonth, generalSettings]);

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
                value={selectedDate.split('-')[0]} 
                onChange={(e) => setSelectedDate(`${e.target.value}-${selectedMonth}-01`)}
                className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {[2080, 2081, 2082, 2083].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">महिना</label>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
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

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="text-center mb-6">
          <h3 className="font-bold text-lg">मासिक प्रगती प्रतिवेदन</h3>
          <p className="text-sm text-slate-500">
            {reportType === 'Daily' ? `मिति: ${selectedDate}` : reportType === 'Monthly' ? `महिना: ${selectedDate.split('-')[0]}-${selectedMonth}` : `आर्थिक वर्ष: ${currentFiscalYear}`}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Table 1: Age and Gender Stats */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-slate-300 text-center">
              <thead className="bg-slate-100">
                <tr>
                  <th rowSpan={2} className="border border-slate-300 p-2">उमेर समूह</th>
                  <th colSpan={2} className="border border-slate-300 p-2">नयाँ सेवाग्राहीको संख्या</th>
                  <th colSpan={2} className="border border-slate-300 p-2">जम्मा (नयाँ/पुरानो) सेवाग्राही संख्या</th>
                  <th colSpan={2} className="border border-slate-300 p-2">प्रेषण भई आएका जम्मा सेवाग्राही</th>
                </tr>
                <tr>
                  <th className="border border-slate-300 p-2">म.</th>
                  <th className="border border-slate-300 p-2">पु.</th>
                  <th className="border border-slate-300 p-2">म.</th>
                  <th className="border border-slate-300 p-2">पु.</th>
                  <th className="border border-slate-300 p-2">म.</th>
                  <th className="border border-slate-300 p-2">पु.</th>
                </tr>
              </thead>
              <tbody>
                {ageGroups.map(group => {
                  const stats = getStatsForAgeGroup(group.min, group.max);
                  return (
                    <tr key={group.label}>
                      <td className="border border-slate-300 p-2 font-medium text-left">{group.label}</td>
                      <td className="border border-slate-300 p-2">{stats.newFemale || ''}</td>
                      <td className="border border-slate-300 p-2">{stats.newMale || ''}</td>
                      <td className="border border-slate-300 p-2">{stats.totalFemale || ''}</td>
                      <td className="border border-slate-300 p-2">{stats.totalMale || ''}</td>
                      <td className="border border-slate-300 p-2">{stats.referredFemale || ''}</td>
                      <td className="border border-slate-300 p-2">{stats.referredMale || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table 2: Outreach / Clinics */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-slate-300 text-center">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 p-2">कार्यक्षेत्र भित्र पर्ने निकाय</th>
                  <th className="border border-slate-300 p-2">संचालन/प्रतिवेदन हुनुपर्ने (संख्या)</th>
                  <th className="border border-slate-300 p-2">संचालन/प्रतिवेदन भएको (संख्या)</th>
                  <th className="border border-slate-300 p-2">सेवा पाएका जम्मा सेवाग्राहीको संख्या</th>
                </tr>
              </thead>
              <tbody>
                {['गाउँघर क्लिनिक', 'खोप क्लिनिक', 'खोप सेसन', 'सरसफाई सेसन (पटक)', 'म. स्वा. स्व. से.'].map(item => {
                  const isImmClinic = item === 'खोप क्लिनिक' || item === 'खोप सेसन';
                  return (
                    <tr key={item}>
                      <td className="border border-slate-300 p-2 font-medium text-left">{item}</td>
                      <td className="border border-slate-300 p-2">
                        {isImmClinic ? (
                          <span className="font-bold">{immClinicStats.plannedClinics || ''}</span>
                        ) : (
                          <input type="number" className="w-full text-center outline-none bg-transparent" />
                        )}
                      </td>
                      <td className="border border-slate-300 p-2">
                        {isImmClinic ? (
                          <span className="font-bold">{immClinicStats.operatedClinics || ''}</span>
                        ) : (
                          <input type="number" className="w-full text-center outline-none bg-transparent" />
                        )}
                      </td>
                      <td className="border border-slate-300 p-2">
                        {isImmClinic ? (
                          <span className="font-bold">{immClinicStats.totalSeekers || ''}</span>
                        ) : (
                          <input type="number" className="w-full text-center outline-none bg-transparent" />
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
            <table className="w-full text-sm border-collapse border border-slate-300 text-center h-full">
              <thead className="bg-slate-100">
                <tr>
                  <th colSpan={2} className="border border-slate-300 p-2">न्यूनतम सेवा मापदण्ड (MSS)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-2 text-left">
                    कार्यन्वयन<br/>
                    १ - पहिलो २ - दोश्रो
                  </td>
                  <td className="border border-slate-300 p-2">
                    <select className="w-full outline-none bg-transparent">
                      <option value="">Select option</option>
                      <option value="1">१ - पहिलो</option>
                      <option value="2">२ - दोश्रो</option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 text-left">स्कोर (%)</td>
                  <td className="border border-slate-300 p-2">
                    <input type="number" className="w-full text-center outline-none bg-transparent" />
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
