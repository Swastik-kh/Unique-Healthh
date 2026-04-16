import React, { useMemo, useState } from 'react';
import { Printer, FileText, Calendar, Filter } from 'lucide-react';
import { ServiceSeekerRecord, OPDRecord } from '../types';
import { useReactToPrint } from 'react-to-print';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { NepaliDatePicker } from './NepaliDatePicker';

interface GESIOPDReportProps {
  currentFiscalYear: string;
  serviceSeekerRecords: ServiceSeekerRecord[];
  opdRecords: OPDRecord[];
}

type ReportType = 'Daily' | 'Monthly' | 'Quarterly' | 'HalfYearly' | 'FiscalYear';

const CASTE_GROUPS = [
  { id: 'Dalit', name: 'दलित' },
  { id: 'Janajati', name: 'जनजाती' },
  { id: 'Madhesi', name: 'मधेसी' },
  { id: 'Muslim', name: 'मुस्लिम' },
  { id: 'Brahmin/Chhetri', name: 'ब्राह्मण/क्षेत्री' },
  { id: 'Other', name: 'अन्य' }
];

const MONTHS_NEPALI = [
  { id: '04', name: 'साउन' }, { id: '05', name: 'भदौ' }, { id: '06', name: 'असोज' },
  { id: '07', name: 'कात्तिक' }, { id: '08', name: 'मंसिर' }, { id: '09', name: 'पुष' },
  { id: '10', name: 'माघ' }, { id: '11', name: 'फागुन' }, { id: '12', name: 'चैत' },
  { id: '01', name: 'बैशाख' }, { id: '02', name: 'जेठ' }, { id: '03', name: 'असार' }
];

const QUARTERS = [
  { id: 'Q1', name: 'प्रथम त्रैमासिक (साउन-असोज)', months: ['04', '05', '06'] },
  { id: 'Q2', name: 'दोस्रो त्रैमासिक (कात्तिक-पुष)', months: ['07', '08', '09'] },
  { id: 'Q3', name: 'तेस्रो त्रैमासिक (माघ-चैत)', months: ['10', '11', '12'] },
  { id: 'Q4', name: 'चौथो त्रैमासिक (बैशाख-असार)', months: ['01', '02', '03'] }
];

const HALF_YEARS = [
  { id: 'H1', name: 'प्रथम अर्धवार्षिक (साउन-पुष)', months: ['04', '05', '06', '07', '08', '09'] },
  { id: 'H2', name: 'दोस्रो अर्धवार्षिक (माघ-असार)', months: ['10', '11', '12', '01', '02', '03'] }
];

const getCasteId = (code: string | undefined) => {
  if (!code) return 'Other';
  const mapping: Record<string, string> = {
    '1': 'Dalit', '2': 'Janajati', '3': 'Madhesi', '4': 'Muslim', '5': 'Brahmin/Chhetri', '6': 'Other',
    'Dalit': 'Dalit', 'Janajati': 'Janajati', 'Madhesi': 'Madhesi', 'Muslim': 'Muslim', 'Brahmin/Chhetri': 'Brahmin/Chhetri', 'Other': 'Other'
  };
  return mapping[code] || 'Other';
};

export const GESIOPDReport: React.FC<GESIOPDReportProps> = ({
  currentFiscalYear,
  serviceSeekerRecords,
  opdRecords
}) => {
  const [reportType, setReportType] = useState<ReportType>('FiscalYear');
  const [selectedDate, setSelectedDate] = useState(new NepaliDate().format('YYYY-MM-DD'));
  const [selectedMonth, setSelectedMonth] = useState(new NepaliDate().format('MM'));
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [selectedHalfYear, setSelectedHalfYear] = useState('H1');

  const componentRef = React.useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'GESI_OPD_Report',
  });

  const filteredRecords = useMemo(() => {
    return (opdRecords || []).filter(record => {
      if (record.fiscalYear !== currentFiscalYear) return false;

      const visitDate = record.visitDate || '';
      const month = visitDate.split('-')[1];

      if (reportType === 'Daily') {
        return visitDate === selectedDate;
      }
      if (reportType === 'Monthly') {
        return month === selectedMonth;
      }
      if (reportType === 'Quarterly') {
        const quarter = QUARTERS.find(q => q.id === selectedQuarter);
        return quarter?.months.includes(month || '');
      }
      if (reportType === 'HalfYearly') {
        const half = HALF_YEARS.find(h => h.id === selectedHalfYear);
        return half?.months.includes(month || '');
      }
      return true; // FiscalYear
    });
  }, [opdRecords, currentFiscalYear, reportType, selectedDate, selectedMonth, selectedQuarter, selectedHalfYear]);

  const reportData = useMemo(() => {
    const data: Record<string, { m: number; f: number }> = {};
    CASTE_GROUPS.forEach(c => data[c.id] = { m: 0, f: 0 });

    filteredRecords.forEach(record => {
      const patient = serviceSeekerRecords.find(p => p.id === record.serviceSeekerId);
      if (patient) {
        const ageYears = patient.ageYears || 0;
        // GESI OPD report for "New patients 5 years and above"
        if (patient.visitType === 'New' && ageYears >= 5) {
          const caste = getCasteId(patient.casteCode);
          const gender = patient.gender === 'Male' ? 'm' : 'f';
          if (data[caste]) {
            data[caste][gender]++;
          }
        }
      }
    });
    return data;
  }, [filteredRecords, serviceSeekerRecords]);

  const getReportPeriodLabel = () => {
    if (reportType === 'Daily') return `मिति: ${selectedDate}`;
    if (reportType === 'Monthly') return `महिना: ${MONTHS_NEPALI.find(m => m.id === selectedMonth)?.name}`;
    if (reportType === 'Quarterly') return QUARTERS.find(q => q.id === selectedQuarter)?.name;
    if (reportType === 'HalfYearly') return HALF_YEARS.find(h => h.id === selectedHalfYear)?.name;
    return `आर्थिक वर्ष: ${currentFiscalYear}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 no-print gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-nepali flex items-center gap-2">
            <FileText className="text-primary-600" />
            GESI ओ.पी.डी. सेवा रिपोर्ट
          </h2>
          <p className="text-sm text-slate-500">ओ. पी. डी. मा आएका नयाँ बिरामी संख्या (५ वर्ष माथि)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 transition-colors"
          >
            <Printer size={18} /> प्रिन्ट गर्नुहोस्
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            {(['Daily', 'Monthly', 'Quarterly', 'HalfYearly', 'FiscalYear'] as ReportType[]).map((type) => (
              <button
                key={type}
                onClick={() => setReportType(type)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  reportType === type 
                    ? 'bg-white text-primary-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {type === 'Daily' ? 'दैनिक' : 
                 type === 'Monthly' ? 'मासिक' : 
                 type === 'Quarterly' ? 'त्रैमासिक' : 
                 type === 'HalfYearly' ? 'अर्धवार्षिक' : 'वार्षिक'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {reportType === 'Daily' && (
              <div className="w-48">
                <NepaliDatePicker
                  value={selectedDate}
                  onChange={(val) => setSelectedDate(val)}
                  hideIcon={true}
                  label=""
                  inputClassName="!py-1 !px-2 !text-sm !h-8"
                />
              </div>
            )}
            {reportType === 'Monthly' && (
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {MONTHS_NEPALI.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            )}
            {reportType === 'Quarterly' && (
              <select 
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {QUARTERS.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
              </select>
            )}
            {reportType === 'HalfYearly' && (
              <select 
                value={selectedHalfYear}
                onChange={(e) => setSelectedHalfYear(e.target.value)}
                className="border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {HALF_YEARS.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto p-8" ref={componentRef}>
          <style type="text/css" media="print">
            {`
              @page { size: portrait; margin: 15mm; }
              body { font-family: 'Kalimati', sans-serif; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #000; padding: 10px; text-align: center; font-size: 14px; }
              th { background-color: #f3f4f6; font-weight: bold; }
              .header-title { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 20px; }
            `}
          </style>
          
          <div className="header-title mb-2 text-center font-bold text-xl">
            ओ. पी. डी. मा आएका नयाँ बिरामी संख्या (५ वर्ष माथि)
          </div>
          <div className="text-center mb-6 text-slate-600 font-medium">
            {getReportPeriodLabel()}
          </div>

          <table className="w-full border-collapse border border-slate-300 text-center">
            <thead>
              <tr className="bg-slate-50">
                <th rowSpan={2} className="border border-slate-300 p-4 w-1/3">जात/जाती</th>
                <th colSpan={3} className="border border-slate-300 p-4">ओ. पी. डी. मा आएका नयाँ बिरामी संख्या (५ वर्ष माथि)</th>
              </tr>
              <tr className="bg-slate-50">
                <th className="border border-slate-300 p-3">महिला (म.)</th>
                <th className="border border-slate-300 p-3">पुरुष (पु.)</th>
                <th className="border border-slate-300 p-3">जम्मा</th>
              </tr>
            </thead>
            <tbody>
              {CASTE_GROUPS.map(caste => {
                const row = reportData[caste.id];
                return (
                  <tr key={caste.id} className="hover:bg-slate-50 transition-colors">
                    <td className="border border-slate-300 p-4 text-left font-medium">{caste.name}</td>
                    <td className="border border-slate-300 p-4">{row.f || '-'}</td>
                    <td className="border border-slate-300 p-4">{row.m || '-'}</td>
                    <td className="border border-slate-300 p-4 font-bold">{row.f + row.m || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100 font-bold">
              <tr>
                <td className="border border-slate-300 p-4 text-left">कुल जम्मा</td>
                <td className="border border-slate-300 p-4">{(Object.values(reportData) as { m: number; f: number }[]).reduce((acc, curr) => acc + curr.f, 0)}</td>
                <td className="border border-slate-300 p-4">{(Object.values(reportData) as { m: number; f: number }[]).reduce((acc, curr) => acc + curr.m, 0)}</td>
                <td className="border border-slate-300 p-4">{(Object.values(reportData) as { m: number; f: number }[]).reduce((acc, curr) => acc + curr.f + curr.m, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
