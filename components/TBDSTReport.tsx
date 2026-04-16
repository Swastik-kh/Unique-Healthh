import React, { useState, useMemo } from 'react';
import { TBPatient } from '../types/healthTypes';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { NepaliDatePicker } from './NepaliDatePicker';
import { Printer, Download } from 'lucide-react';
import PptxGenJS from 'pptxgenjs';

interface TBDSTReportProps {
  patients: TBPatient[];
  currentFiscalYear: string;
}

export const TBDSTReport: React.FC<TBDSTReportProps> = ({ patients, currentFiscalYear }) => {
  const [reportType, setReportType] = useState<'Daily' | 'Monthly' | 'Quarterly' | 'Yearly' | 'FiscalYear'>('Monthly');
  // ... (rest of the state)
  const [selectedDate, setSelectedDate] = useState(() => {
    try { return new NepaliDate().format('YYYY-MM-DD'); } catch (e) { return ''; }
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    try { return new NepaliDate().format('MM'); } catch (e) { return '01'; }
  });
  const [selectedQuarter, setSelectedQuarter] = useState('1');
  const [selectedYear, setSelectedYear] = useState(() => {
    try { return new NepaliDate().format('YYYY'); } catch (e) { return '2080'; }
  });

  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    return patients.filter(p => {
      const parts = p.registrationDate.split(/[-/]/);
      const recordDate = new NepaliDate(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const recordYear = recordDate.format('YYYY');
      const recordMonth = parseInt(recordDate.format('MM'));

      if (reportType === 'FiscalYear') {
        return p.fiscalYear === currentFiscalYear;
      } else if (reportType === 'Yearly') {
        return recordYear === selectedYear;
      } else if (reportType === 'Quarterly') {
        const quarter = Math.ceil(recordMonth / 3);
        return recordYear === selectedYear && quarter.toString() === selectedQuarter;
      } else if (reportType === 'Monthly') {
        return recordMonth.toString().padStart(2, '0') === selectedMonth && recordYear === selectedYear;
      } else { // Daily
        return p.registrationDate === selectedDate;
      }
    });
  }, [patients, reportType, selectedDate, selectedMonth, selectedQuarter, selectedYear, currentFiscalYear]);

  // Helper to count patients based on conditions
  const count = (condition: (p: TBPatient) => boolean) => filteredPatients.filter(condition).length;

  const outcomePatients = useMemo(() => {
    if (reportType !== 'Monthly') return filteredPatients;
    if (!patients) return [];
    
    const prevYear = (parseInt(selectedYear) - 1).toString();
    return patients.filter(p => {
      const parts = p.registrationDate.split(/[-/]/);
      const recordDate = new NepaliDate(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const recordYear = recordDate.format('YYYY');
      const recordMonth = parseInt(recordDate.format('MM'));
      
      return recordMonth.toString().padStart(2, '0') === selectedMonth && recordYear === prevYear;
    });
  }, [patients, reportType, selectedMonth, selectedYear, filteredPatients]);

  const outcomeCount = (condition: (p: TBPatient) => boolean) => outcomePatients.filter(condition).length;

  // Helper for Treatment Outcome
  const getOutcome = (p: TBPatient) => {
    const lastReport = p.reports && p.reports.length > 0 ? p.reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;
    const isPBC = p.classification === 'PBC';
    const isPCDorEP = p.classification === 'PCD' || p.classification === 'EP';

    if (p.isDefaulter || (p.status === 'Loss to Follow-up')) return 'Lost to follow up';
    if (p.status === 'Died') return 'Died';
    
    if (isPBC) {
      if (lastReport && lastReport.result === 'Negative') return 'Cured';
      if (lastReport && lastReport.result === 'Positive' && p.latestReportMonth === 5) return 'Failed';
      if (!lastReport) return 'Completed';
    }
    
    if (isPCDorEP && p.status === 'Completed') return 'Completed';
    
    return 'Not Evaluated';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPPT = () => {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    
    // Title Slide
    const slide = pptx.addSlide();
    slide.background = { color: 'F5F5F5' };
    slide.addText('११. क्षयरोग नियन्त्रण कार्यक्रम (Tuberculosis Control Program)', { x: 0.5, y: 1.5, fontSize: 32, bold: true, color: '333333' });
    slide.addText(`Report Type: ${reportType} | Date: ${new Date().toISOString().slice(0, 10)}`, { x: 0.5, y: 2.5, fontSize: 18, color: '666666' });
    
    // 1. Case Registration Slide
    const slide1 = pptx.addSlide();
    slide1.addText('Case Registration [1]', { x: 0.5, y: 0.2, fontSize: 20, bold: true });
    const data1 = [
      { name: 'New', labels: ['PBC', 'PCD', 'EP'], values: [count(p => p.classification === 'PBC' && p.regType === 'New'), count(p => p.classification === 'PCD' && p.regType === 'New'), count(p => p.classification === 'EP' && p.regType === 'New')] },
      { name: 'Relapse', labels: ['PBC', 'PCD', 'EP'], values: [count(p => p.classification === 'PBC' && p.regType === 'Relapse'), count(p => p.classification === 'PCD' && p.regType === 'Relapse'), count(p => p.classification === 'EP' && p.regType === 'Relapse')] },
      { name: 'TAF', labels: ['PBC', 'PCD', 'EP'], values: [count(p => p.classification === 'PBC' && p.regType === 'TAF'), count(p => p.classification === 'PCD' && p.regType === 'TAF'), count(p => p.classification === 'EP' && p.regType === 'TAF')] },
      { name: 'TALF', labels: ['PBC', 'PCD', 'EP'], values: [count(p => p.classification === 'PBC' && p.regType === 'TALF'), count(p => p.classification === 'PCD' && p.regType === 'TALF'), count(p => p.classification === 'EP' && p.regType === 'TALF')] },
      { name: 'OPT', labels: ['PBC', 'PCD', 'EP'], values: [count(p => p.classification === 'PBC' && p.regType === 'OPT'), count(p => p.classification === 'PCD' && p.regType === 'OPT'), count(p => p.classification === 'EP' && p.regType === 'OPT')] }
    ];
    slide1.addChart(pptx.ChartType.bar, data1, { x: 0.5, y: 0.8, w: '90%', h: '70%' });

    // 2. Treatment Regimen Slide
    const slide2 = pptx.addSlide();
    slide2.addText('Treatment Regimen [5]', { x: 0.5, y: 0.2, fontSize: 20, bold: true });
    const data2 = [
      { name: 'Treatment Type', labels: ['2HRZE+4HR', '2HRZE+7HRE', '6HRZE', '6HRZE+Lfx'], values: [count(p => p.treatmentType === '2HRZE+4HR'), count(p => p.treatmentType === '2HRZE+7HRE'), count(p => p.treatmentType === '6HRZE'), count(p => p.treatmentType === '6HRZE+Lfx')] }
    ];
    slide2.addChart(pptx.ChartType.pie, data2, { 
      x: 0.5, 
      y: 0.8, 
      w: '90%', 
      h: '70%', 
      showLabel: true 
    });

    // 3. Treatment Outcome Slide
    const slide3 = pptx.addSlide();
    slide3.addText('Treatment Outcome [12]', { x: 0.5, y: 0.2, fontSize: 20, bold: true });
    const outcomes = ['Cured', 'Completed', 'Failed', 'Died', 'Lost to follow up', 'Not Evaluated'];
    const data3 = [{ name: 'Patients', labels: outcomes, values: outcomes.map(o => outcomeCount(p => getOutcome(p) === o)) }];
    slide3.addChart(pptx.ChartType.bar, data3, { x: 0.5, y: 0.8, w: '90%', h: '70%' });
    
    pptx.writeFile({ fileName: `TBDST_Report_${new Date().toISOString().slice(0, 10)}.pptx` });
  };

  const getMappedEthnicity = (e: string | undefined) => {
    const val = e || 'Unknown';
    if (val === '1') return 'Dalit';
    // Normalize casing for ordering
    if (val.toLowerCase() === 'dalit') return 'Dalit';
    if (val.toLowerCase() === 'janjati') return 'Janajati';
    if (val.toLowerCase() === 'madheshi') return 'Madhesi';
    if (val.toLowerCase() === 'muslim') return 'Muslim';
    if (val.toLowerCase() === 'brahmin/chhetri') return 'Brahmin/Chhetri';
    if (val.toLowerCase() === 'others') return 'Others';
    return val;
  };

  const uniqueEthnicities = useMemo(() => {
    const ethnicities = new Set(filteredPatients.map(p => getMappedEthnicity(p.ethnicity)));
    const order = ['Dalit', 'Janajati', 'Madhesi', 'Muslim', 'Brahmin/Chhetri', 'Others'];
    
    return Array.from(ethnicities as Set<string>).sort((a: string, b: string) => {
        const indexA = order.indexOf(a);
        const indexB = order.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
  }, [filteredPatients]);

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
      <style type="text/css" media="print">
        {`
          @page { size: landscape; margin: 10mm; }
          body { font-family: 'Kalimati', sans-serif; }
          .overflow-x-auto { overflow: visible !important; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th, td { border: 1px solid #000 !important; padding: 4px; text-align: center; }
          th { background-color: #f3f4f6 !important; font-weight: bold; }
          .print\\:hidden { display: none !important; }
        `}
      </style>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 text-center flex-grow">११. क्षयरोग नियन्त्रण कार्यक्रम (Tuberculosis Control Program)</h2>
        <div className="flex gap-2 print:hidden">
          <button onClick={handlePrint} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600">
            <Printer size={20} />
          </button>
          <button onClick={handleDownloadPPT} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600">
            <Download size={20} />
          </button>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden flex flex-wrap gap-4 items-end mb-6">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">रिपोर्टको प्रकार</label>
          <select 
            value={reportType} 
            onChange={(e) => setReportType(e.target.value as any)}
            className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="Daily">दैनिक (Daily)</option>
            <option value="Monthly">मासिक (Monthly)</option>
            <option value="Quarterly">त्रैमासिक (Quarterly)</option>
            <option value="Yearly">वार्षिक (Yearly)</option>
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
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
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

        {reportType === 'Quarterly' && (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">वर्ष</label>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {[2080, 2081, 2082, 2083].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">त्रैमासिक</label>
              <select 
                value={selectedQuarter} 
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {['1', '2', '3', '4'].map(q => <option key={q} value={q}>{q} त्रैमासिक</option>)}
              </select>
            </div>
          </>
        )}

        {reportType === 'Yearly' && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">वर्ष</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              {[2080, 2081, 2082, 2083].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* Case Registration [1] */}
        <div className="overflow-x-auto">
          <h3 className="font-bold mb-2">Case Registration [1]</h3>
          <table className="w-full text-sm border-collapse border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-2" rowSpan={2}>Type of TB</th>
                <th className="border p-2" colSpan={2}>New</th>
                <th className="border p-2" colSpan={2}>Relapse</th>
                <th className="border p-2" colSpan={2}>TAF</th>
                <th className="border p-2" colSpan={2}>TALF</th>
                <th className="border p-2" colSpan={2}>OPT</th>
                <th className="border p-2" colSpan={2}>UPTH</th>
              </tr>
              <tr>
                {Array(6).fill(0).map((_, i) => <React.Fragment key={i}><th className="border p-1">M</th><th className="border p-1">F</th></React.Fragment>)}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Pulmonary (PBC)', type: 'PBC' },
                { label: 'Pulmonary (PCD)', type: 'PCD' },
                { label: 'Extra Pulmonary (EP)', type: 'EP' }
              ].map(item => (
                <tr key={item.type}>
                  <td className="border border-slate-300 p-2 font-medium">{item.label}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => p.classification === item.type && p.regType === 'New' && p.gender === 'Male')}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => p.classification === item.type && p.regType === 'New' && p.gender === 'Female')}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => p.classification === item.type && p.regType === 'Relapse' && p.gender === 'Male')}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => p.classification === item.type && p.regType === 'Relapse' && p.gender === 'Female')}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => p.classification === item.type && p.regType === 'TAF' && p.gender === 'Male')}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => p.classification === item.type && p.regType === 'TAF' && p.gender === 'Female')}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => p.classification === item.type && p.regType === 'TALF' && p.gender === 'Male')}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => p.classification === item.type && p.regType === 'TALF' && p.gender === 'Female')}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => p.classification === item.type && p.regType === 'OPT' && p.gender === 'Male')}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => p.classification === item.type && p.regType === 'OPT' && p.gender === 'Female')}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => p.classification === item.type && p.regType === 'UPTH' && p.gender === 'Male')}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => p.classification === item.type && p.regType === 'UPTH' && p.gender === 'Female')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Age group [3] */}
        <div className="overflow-x-auto">
          <h3 className="font-bold mb-2">Age group [3]</h3>
          <table className="w-full text-sm border-collapse border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-2" rowSpan={2}>Type of TB</th>
                {[ '0-4 Yrs', '5-14 Yrs', '15-24 Yrs', '25-34 Yrs', '35-44 Yrs', '45-54 Yrs', '55-64 Yrs', '>= 65 Yrs'].map(age => <th key={age} className="border p-2" colSpan={2}>{age}</th>)}
              </tr>
              <tr>
                {Array(8).fill(0).map((_, i) => <React.Fragment key={i}><th className="border p-1">M</th><th className="border p-1">F</th></React.Fragment>)}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'New (All)', reg: 'New' },
                { label: 'Relapse (All)', reg: 'Relapse' },
                { label: 'Others (All)', reg: 'Other' },
              ].map(cat => {
                const getAgeGroupCondition = (min: number, max: number) => (p: TBPatient) => {
                  const age = parseInt(p.age);
                  return age >= min && age <= max;
                };
                const regCondition = (p: TBPatient) => {
                  if (cat.reg === 'New') return p.regType === 'New';
                  if (cat.reg === 'Relapse') return p.regType === 'Relapse';
                  return p.regType !== 'New' && p.regType !== 'Relapse';
                };
                return (
                  <tr key={cat.label}>
                    <td className="border border-slate-300 p-2 font-medium">{cat.label}</td>
                    {[
                      { min: 0, max: 4 }, { min: 5, max: 14 }, { min: 15, max: 24 }, { min: 25, max: 34 },
                      { min: 35, max: 44 }, { min: 45, max: 54 }, { min: 55, max: 64 }, { min: 65, max: 999 }
                    ].map(ageGroup => (
                      <React.Fragment key={ageGroup.min}>
                        <td className="border border-slate-300 p-2 text-center">{count(p => regCondition(p) && getAgeGroupCondition(ageGroup.min, ageGroup.max)(p) && p.gender === 'Male')}</td>
                        <td className="border border-slate-300 p-2 text-center">{count(p => regCondition(p) && getAgeGroupCondition(ageGroup.min, ageGroup.max)(p) && p.gender === 'Female')}</td>
                      </React.Fragment>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Referred [2] */}
        <div className="overflow-x-auto">
          <h3 className="font-bold mb-2">Referred [2]</h3>
          <table className="w-full text-sm border-collapse border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-2">Type of TB</th>
                <th className="border p-2">Self</th>
                <th className="border p-2">Private Sector</th>
                <th className="border p-2">Community</th>
                <th className="border p-2">Contract Investigation</th>
              </tr>
            </thead>
            <tbody>
              {['Pulmonary (PBC)', 'Pulmonary (PCD)', 'Extra Pulmonary (EP)'].map(type => (
                <tr key={type}>
                  <td className="border border-slate-300 p-2 font-medium">{type}</td>
                  <td className="border border-slate-300 p-2 text-center">0</td>
                  <td className="border border-slate-300 p-2 text-center">0</td>
                  <td className="border border-slate-300 p-2 text-center">0</td>
                  <td className="border border-slate-300 p-2 text-center">0</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* DST of TB Patient [6] */}
        <div className="overflow-x-auto">
          <h3 className="font-bold mb-2">DST of TB Patient [6]</h3>
          <table className="w-full text-sm border-collapse border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-2">TB Cases</th>
                <th className="border p-2">Xpert MTB/RIF</th>
                <th className="border p-2">LPA</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 p-2 font-medium">New</td>
                <td className="border border-slate-300 p-2 text-center">0</td>
                <td className="border border-slate-300 p-2 text-center">0</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2 font-medium">Re-treatment</td>
                <td className="border border-slate-300 p-2 text-center">0</td>
                <td className="border border-slate-300 p-2 text-center">0</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Treatment Regimen [5] */}
        <div className="overflow-x-auto">
          <h3 className="font-bold mb-2">Treatment Regimen [5]</h3>
          <table className="w-full text-sm border-collapse border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-2" rowSpan={2}>Treatment Type (Upachar Prakar)</th>
                <th className="border p-2" colSpan={2}>2HRZE+4HR</th>
                <th className="border p-2" colSpan={2}>2HRZE+7HRE</th>
                <th className="border p-2" colSpan={2}>6HRZE</th>
                <th className="border p-2" colSpan={2}>6HRZE+Lfx</th>
              </tr>
              <tr>
                {Array(4).fill(0).map((_, i) => <React.Fragment key={i}><th className="border p-1">M</th><th className="border p-1">F</th></React.Fragment>)}
              </tr>
            </thead>
            <tbody>
              {['New', 'Relapse', 'TAF', 'TALF', 'OPT', 'UPTH'].map(type => (
                <tr key={type}>
                  <td className="border border-slate-300 p-2 font-medium">{type}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => p.regType === type && p.treatmentType === '2HRZE+4HR' && p.gender === 'Male')}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => p.regType === type && p.treatmentType === '2HRZE+4HR' && p.gender === 'Female')}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => p.regType === type && p.treatmentType === '2HRZE+7HRE' && p.gender === 'Male')}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => p.regType === type && p.treatmentType === '2HRZE+7HRE' && p.gender === 'Female')}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => p.regType === type && p.treatmentType === '6HRZE' && p.gender === 'Male')}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => p.regType === type && p.treatmentType === '6HRZE' && p.gender === 'Female')}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => p.regType === type && p.treatmentType === '6HRZE+Lfx' && p.gender === 'Male')}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => p.regType === type && p.treatmentType === '6HRZE+Lfx' && p.gender === 'Female')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TB HIV Status [10] and TB and Tobacco [11] */}
        <div className="flex gap-4">
          <div className="flex-1 overflow-x-auto">
            <h3 className="font-bold mb-2">TB HIV Status [10]</h3>
            <table className="w-full text-sm border-collapse border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border p-2">Sex</th>
                  <th className="border p-2">Positive</th>
                  <th className="border p-2">Negative</th>
                  <th className="border p-2">ART</th>
                  <th className="border p-2">CPT</th>
                </tr>
              </thead>
              <tbody>
                {['Female', 'Male'].map(sex => (
                  <tr key={sex}>
                    <td className="border border-slate-300 p-2 font-medium">{sex}</td>
                    <td className="border border-slate-300 p-2 text-center">0</td>
                    <td className="border border-slate-300 p-2 text-center">0</td>
                    <td className="border border-slate-300 p-2 text-center">0</td>
                    <td className="border border-slate-300 p-2 text-center">0</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex-1 overflow-x-auto">
            <h3 className="font-bold mb-2">TB and Tobacco [11]</h3>
            <table className="w-full text-sm border-collapse border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border p-2">TB Cases Registered</th>
                  <th className="border p-2">Patient Smoking Tobacco Current</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-2 text-center">0</td>
                  <td className="border border-slate-300 p-2 text-center">0</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Treatment Outcome [12] */}
        <div className="overflow-x-auto">
          <h3 className="font-bold mb-2">Treatment Outcome [12]</h3>
          <table className="w-full text-sm border-collapse border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-2" rowSpan={2}>Registration Category</th>
                <th className="border p-2" colSpan={2}>Cured</th>
                <th className="border p-2" colSpan={2}>Completed</th>
                <th className="border p-2" colSpan={2}>Failed</th>
                <th className="border p-2" colSpan={2}>Died</th>
                <th className="border p-2" colSpan={2}>Lost to follow up</th>
                <th className="border p-2" colSpan={2}>Not Evaluated</th>
              </tr>
              <tr>
                {Array(6).fill(0).map((_, i) => <React.Fragment key={i}><th className="border p-1">M</th><th className="border p-1">F</th></React.Fragment>)}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'PBC New', class: 'PBC', reg: 'New' },
                { label: 'PBC Relapse', class: 'PBC', reg: 'Relapse' },
                { label: 'PBC TAF', class: 'PBC', reg: 'TAF' },
                { label: 'PBC TALF', class: 'PBC', reg: 'TALF' },
                { label: 'PBC OPT', class: 'PBC', reg: 'OPT' },
                { label: 'PBC UPTH', class: 'PBC', reg: 'UPTH' },
                { label: 'PCD New', class: 'PCD', reg: 'New' },
                { label: 'PCD Relapse', class: 'PCD', reg: 'Relapse' },
                { label: 'PCD Other', class: 'PCD', reg: 'Other' },
                { label: 'EP New', class: 'EP', reg: 'New' },
                { label: 'EP Relapse', class: 'EP', reg: 'Relapse' },
                { label: 'EP Other', class: 'EP', reg: 'Other' },
              ].map(cat => (
                <tr key={cat.label}>
                  <td className="border border-slate-300 p-2 font-medium">{cat.label}</td>
                  <td className="border border-slate-300 p-2 text-center">{outcomeCount(p => p.classification === cat.class && p.regType === cat.reg && getOutcome(p) === 'Cured' && p.gender === 'Male')}</td>
                  <td className="border border-slate-300 p-2 text-center">{outcomeCount(p => p.classification === cat.class && p.regType === cat.reg && getOutcome(p) === 'Cured' && p.gender === 'Female')}</td>
                  <td className="border border-slate-300 p-2 text-center">{outcomeCount(p => p.classification === cat.class && p.regType === cat.reg && getOutcome(p) === 'Completed' && p.gender === 'Male')}</td>
                  <td className="border border-slate-300 p-2 text-center">{outcomeCount(p => p.classification === cat.class && p.regType === cat.reg && getOutcome(p) === 'Completed' && p.gender === 'Female')}</td>
                  <td className="border border-slate-300 p-2 text-center">{outcomeCount(p => p.classification === cat.class && p.regType === cat.reg && getOutcome(p) === 'Failed' && p.gender === 'Male')}</td>
                  <td className="border border-slate-300 p-2 text-center">{outcomeCount(p => p.classification === cat.class && p.regType === cat.reg && getOutcome(p) === 'Failed' && p.gender === 'Female')}</td>
                  <td className="border border-slate-300 p-2 text-center">{outcomeCount(p => p.classification === cat.class && p.regType === cat.reg && getOutcome(p) === 'Died' && p.gender === 'Male')}</td>
                  <td className="border border-slate-300 p-2 text-center">{outcomeCount(p => p.classification === cat.class && p.regType === cat.reg && getOutcome(p) === 'Died' && p.gender === 'Female')}</td>
                  <td className="border border-slate-300 p-2 text-center">{outcomeCount(p => p.classification === cat.class && p.regType === cat.reg && getOutcome(p) === 'Lost to follow up' && p.gender === 'Male')}</td>
                  <td className="border border-slate-300 p-2 text-center">{outcomeCount(p => p.classification === cat.class && p.regType === cat.reg && getOutcome(p) === 'Lost to follow up' && p.gender === 'Female')}</td>
                  <td className="border border-slate-300 p-2 text-center">{outcomeCount(p => p.classification === cat.class && p.regType === cat.reg && getOutcome(p) === 'Not Evaluated' && p.gender === 'Male')}</td>
                  <td className="border border-slate-300 p-2 text-center">{outcomeCount(p => p.classification === cat.class && p.regType === cat.reg && getOutcome(p) === 'Not Evaluated' && p.gender === 'Female')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tobacco cessation-outcome [14] */}
        <div className="overflow-x-auto">
          <h3 className="font-bold mb-2">Tobacco cessation-outcome [14]</h3>
          <table className="w-full text-sm border-collapse border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-2">Patient Smoking Tobacco current (0 month)</th>
                <th className="border p-2">2 months</th>
                <th className="border p-2">5 months</th>
                <th className="border p-2">End of treatment</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 p-2 text-center">0</td>
                <td className="border border-slate-300 p-2 text-center">0</td>
                <td className="border border-slate-300 p-2 text-center">0</td>
                <td className="border border-slate-300 p-2 text-center">0</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Jatigat Report */}
        <div className="overflow-x-auto">
          <h3 className="font-bold mb-2">Jatigat Report (Caste-based)</h3>
          <table className="w-full text-sm border-collapse border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-2" rowSpan={2}>Caste</th>
                <th className="border p-2" colSpan={2}>Total</th>
              </tr>
              <tr>
                <th className="border p-1">Male</th>
                <th className="border p-1">Female</th>
              </tr>
            </thead>
            <tbody>
              {uniqueEthnicities.map(ethnicity => (
                <tr key={ethnicity}>
                  <td className="border border-slate-300 p-2 font-medium">{ethnicity}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => getMappedEthnicity(p.ethnicity) === ethnicity && p.gender === 'Male')}</td>
                  <td className="border border-slate-300 p-2 text-center">{count(p => getMappedEthnicity(p.ethnicity) === ethnicity && p.gender === 'Female')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
