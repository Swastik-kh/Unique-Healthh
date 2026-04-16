import React, { useState, useMemo } from 'react';
import { Printer, Calendar, Filter } from 'lucide-react';
import { Select } from './Select';
import { FISCAL_YEARS } from '../constants';
import { GarbhawotiRecord, PrasutiRecord, OrganizationSettings } from '../types';
import { NepaliDatePicker } from './NepaliDatePicker';
import NepaliDate from 'nepali-date-converter';

interface MCHReportProps {
  currentFiscalYear: string;
  garbhawotiRecords: GarbhawotiRecord[];
  prasutiRecords: PrasutiRecord[];
  generalSettings: OrganizationSettings;
}

const nepaliMonthOptions = [
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

export const MCHReport: React.FC<MCHReportProps> = ({ 
  currentFiscalYear, 
  garbhawotiRecords, 
  prasutiRecords, 
  generalSettings 
}) => {
  const [reportType, setReportType] = useState<'Daily' | 'Monthly' | 'Quarterly' | 'HalfYearly' | 'FiscalYear'>('Monthly');
  const [selectedDate, setSelectedDate] = useState(() => {
    try { return new NepaliDate().format('YYYY-MM-DD'); } catch (e) { return ''; }
  });
  const [selectedMonth, setSelectedMonth] = useState('01');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear);
  const [selectedQuarter, setSelectedQuarter] = useState('1');
  const [selectedHalfYear, setSelectedHalfYear] = useState('1');

  const filterRecords = (records: any[], dateField: string) => {
    return records.filter(record => {
      const date = record[dateField];
      if (!date) return false;
      
      if (reportType === 'FiscalYear') {
        return record.fiscalYear === selectedFiscalYear;
      } else if (reportType === 'Monthly') {
        const recordMonth = date.split('-')[1];
        const recordYear = date.split('-')[0];
        const currentYear = selectedDate.split('-')[0];
        return recordMonth === selectedMonth && recordYear === currentYear;
      } else if (reportType === 'Quarterly') {
        const m = parseInt(date.split('-')[1]);
        const q = m >= 4 && m <= 6 ? '1' : m >= 7 && m <= 9 ? '2' : m >= 10 && m <= 12 ? '3' : '4';
        return q === selectedQuarter && record.fiscalYear === selectedFiscalYear;
      } else if (reportType === 'HalfYearly') {
        const m = parseInt(date.split('-')[1]);
        const h = (m >= 4 && m <= 9) ? '1' : '2';
        return h === selectedHalfYear && record.fiscalYear === selectedFiscalYear;
      } else {
        return date === selectedDate;
      }
    });
  };

  const reportStats = useMemo(() => {
    const stats = {
      anc: {
        first: { under20: 0, over20: 0 },
        within12Weeks: { under20: 0, over20: 0 },
        fourTimes: { under20: 0, over20: 0 },
        eightTimes: { under20: 0, over20: 0 },
        rousg: { under20: 0, over20: 0 },
      },
      delivery: {
        sba: { under20: 0, over20: 0 },
        shp: { under20: 0, over20: 0 },
        other: { under20: 0, over20: 0 },
        home: { under20: 0, over20: 0 },
      },
      deliveryType: {
        spontaneous: 0,
        vacuum: 0,
        cs: 0,
      },
      presentation: {
        cephalic: 0,
        shoulder: 0,
        breech: 0,
      }
    };

    const filteredANC = filterRecords(garbhawotiRecords, 'ancDate');
    const filteredPrasuti = filterRecords(prasutiRecords, 'deliveryDate');

    // Process ANC Stats
    filteredANC.forEach(visit => {
        const isUnder20 = visit.age < 20;
        // Simplified logic for this example
        stats.anc.first.under20 += isUnder20 ? 1 : 0;
        stats.anc.first.over20 += isUnder20 ? 0 : 1;
    });

    // Process Delivery Stats
    filteredPrasuti.forEach(r => {
      const ancRecord = garbhawotiRecords.find(g => g.id === r.garbhawotiId);
      const age = ancRecord ? ancRecord.age : 30;
      const isUnder20 = age < 20;

      const place = r.deliveryPlace.toLowerCase();
      const by = r.deliveredBy.toLowerCase();

      if (place.includes('home')) {
          if (isUnder20) stats.delivery.home.under20++;
          else stats.delivery.home.over20++;
      } else if (by.includes('sba') || by.includes('anm')) {
          if (isUnder20) stats.delivery.sba.under20++;
          else stats.delivery.sba.over20++;
      } else if (place.includes('shp') || place.includes('health post')) {
          if (isUnder20) stats.delivery.shp.under20++;
          else stats.delivery.shp.over20++;
      } else {
          if (isUnder20) stats.delivery.other.under20++;
          else stats.delivery.other.over20++;
      }

      const outcome = r.deliveryOutcome.toLowerCase();
      if (outcome.includes('c/s') || outcome.includes('cesarean')) {
          stats.deliveryType.cs++;
      } else if (outcome.includes('vacuum') || outcome.includes('forceps')) {
          stats.deliveryType.vacuum++;
      } else {
          stats.deliveryType.spontaneous++;
      }
    });

    return stats;
  }, [garbhawotiRecords, prasutiRecords, reportType, selectedDate, selectedMonth, selectedFiscalYear, selectedQuarter, selectedHalfYear]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
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
            <option value="Quarterly">त्रैमासिक (Quarterly)</option>
            <option value="HalfYearly">अर्ध-वार्षिक (Half Yearly)</option>
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
                value={selectedFiscalYear} 
                onChange={(e) => setSelectedFiscalYear(e.target.value)}
                className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {FISCAL_YEARS.map(y => <option key={y.id} value={y.value}>{y.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">महिना</label>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {nepaliMonthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </>
        )}

        {reportType === 'Quarterly' && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">त्रैमासिक (Quarter)</label>
            <select 
              value={selectedQuarter} 
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="1">प्रथम त्रैमासिक (Q1)</option>
              <option value="2">द्वितीय त्रैमासिक (Q2)</option>
              <option value="3">तृतीय त्रैमासिक (Q3)</option>
              <option value="4">चौथो त्रैमासिक (Q4)</option>
            </select>
          </div>
        )}

        {reportType === 'HalfYearly' && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">अर्ध-वार्षिक (Half Year)</label>
            <select 
              value={selectedHalfYear} 
              onChange={(e) => setSelectedHalfYear(e.target.value)}
              className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="1">प्रथम अर्ध-वार्षिक (H1)</option>
              <option value="2">द्वितीय अर्ध-वार्षिक (H2)</option>
            </select>
          </div>
        )}
        
        <button onClick={handlePrint} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-all shadow-sm ml-auto">
          <Printer size={18} /> प्रिन्ट गर्नुहोस्
        </button>
      </div>

      <div id="mch-report-print-content" className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 max-w-[210mm] mx-auto">
        <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-slate-900">{generalSettings.orgNameNepali}</h1>
            <h2 className="text-lg font-bold mt-1">७. मातृ तथा नवजात शिशु स्वास्थ्य कार्यक्रम</h2>
            <div className="flex justify-between mt-4 text-xs font-bold text-slate-600">
                <span>आ.व.: {selectedFiscalYear}</span>
                <span>रिपोर्ट: {reportType}</span>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 7.1 Garbhawati Janch */}
            <div>
                <table className="w-full border-collapse border border-slate-300 text-xs">
                    <thead>
                        <tr className="bg-slate-50">
                            <th rowSpan={2} className="border border-slate-300 p-2 text-left">गर्भवती जाँच (पटक)</th>
                            <th colSpan={2} className="border border-slate-300 p-2">महिलाको संख्या</th>
                        </tr>
                        <tr className="bg-slate-50">
                            <th className="border border-slate-300 p-2">{'<'} २० वर्ष</th>
                            <th className="border border-slate-300 p-2">≥ २० वर्ष</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td className="border border-slate-300 p-2 text-left">पहिलो (जुनसुकै समयको)</td><td className="border border-slate-300 p-2">{reportStats.anc.first.under20}</td><td className="border border-slate-300 p-2">{reportStats.anc.first.over20}</td></tr>
                        <tr><td className="border border-slate-300 p-2 text-left">१२ हप्ता सम्म</td><td className="border border-slate-300 p-2">{reportStats.anc.within12Weeks.under20}</td><td className="border border-slate-300 p-2">{reportStats.anc.within12Weeks.over20}</td></tr>
                        <tr><td className="border border-slate-300 p-2 text-left">४ पटक (१६, २०-२४, ३२ र ३६ हप्ता)</td><td className="border border-slate-300 p-2">{reportStats.anc.fourTimes.under20}</td><td className="border border-slate-300 p-2">{reportStats.anc.fourTimes.over20}</td></tr>
                        <tr><td className="border border-slate-300 p-2 text-left">८ पटक (प्रोटोकल अनुसार)</td><td className="border border-slate-300 p-2">{reportStats.anc.eightTimes.under20}</td><td className="border border-slate-300 p-2">{reportStats.anc.eightTimes.over20}</td></tr>
                        <tr><td className="border border-slate-300 p-2 text-left">पहिलो पटक ROUSG गरेका</td><td className="border border-slate-300 p-2">{reportStats.anc.rousg.under20}</td><td className="border border-slate-300 p-2">{reportStats.anc.rousg.over20}</td></tr>
                    </tbody>
                </table>

                <table className="w-full mt-4 border-collapse border border-slate-300 text-xs">
                    <thead>
                        <tr className="bg-slate-50">
                            <th rowSpan={2} className="border border-slate-300 p-2 text-left">प्रसूति सेवा</th>
                            <th colSpan={2} className="border border-slate-300 p-2">महिलाको संख्या</th>
                        </tr>
                        <tr className="bg-slate-50">
                            <th className="border border-slate-300 p-2">{'<'} २० वर्ष</th>
                            <th className="border border-slate-300 p-2">≥ २० वर्ष</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td className="border border-slate-300 p-2 text-left">दक्ष प्रसुतिकर्मीबाट (SBA trained ANM)</td><td className="border border-slate-300 p-2">{reportStats.delivery.sba.under20}</td><td className="border border-slate-300 p-2">{reportStats.delivery.sba.over20}</td></tr>
                        <tr><td className="border border-slate-300 p-2 text-left">दक्ष स्वास्थ्यकर्मीबाट (SHP)</td><td className="border border-slate-300 p-2">{reportStats.delivery.shp.under20}</td><td className="border border-slate-300 p-2">{reportStats.delivery.shp.over20}</td></tr>
                        <tr><td className="border border-slate-300 p-2 text-left">अन्य स्वास्थ्यकर्मीबाट</td><td className="border border-slate-300 p-2">{reportStats.delivery.other.under20}</td><td className="border border-slate-300 p-2">{reportStats.delivery.other.over20}</td></tr>
                        <tr><td className="border border-slate-300 p-2 text-left">घरमा प्रसूति संख्या</td><td className="border border-slate-300 p-2">{reportStats.delivery.home.under20}</td><td className="border border-slate-300 p-2">{reportStats.delivery.home.over20}</td></tr>
                    </tbody>
                </table>
            </div>

            {/* 7.3 Delivery Type & Presentation */}
            <div>
                <table className="w-full border-collapse border border-slate-300 text-xs">
                    <thead>
                        <tr className="bg-slate-50">
                            <th rowSpan={2} className="border border-slate-300 p-2 text-left">प्रसूतिको किसिम</th>
                            <th colSpan={3} className="border border-slate-300 p-2">Foetal Presentation</th>
                        </tr>
                        <tr className="bg-slate-50">
                            <th className="border border-slate-300 p-2">Cephalic</th>
                            <th className="border border-slate-300 p-2">Shoulder</th>
                            <th className="border border-slate-300 p-2">Breech</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-slate-300 p-2 text-left">सामान्य (Spontaneous)</td>
                            <td className="border border-slate-300 p-2">{reportStats.deliveryType.spontaneous}</td>
                            <td className="border border-slate-300 p-2">0</td>
                            <td className="border border-slate-300 p-2">0</td>
                        </tr>
                        <tr>
                            <td className="border border-slate-300 p-2 text-left">भ्याकुम/फोरसेप</td>
                            <td className="border border-slate-300 p-2">{reportStats.deliveryType.vacuum}</td>
                            <td className="border border-slate-300 p-2">0</td>
                            <td className="border border-slate-300 p-2">0</td>
                        </tr>
                        <tr>
                            <td className="border border-slate-300 p-2 text-left">शल्यक्रिया (C/S)</td>
                            <td className="border border-slate-300 p-2">{reportStats.deliveryType.cs}</td>
                            <td className="border border-slate-300 p-2">0</td>
                            <td className="border border-slate-300 p-2">0</td>
                        </tr>
                    </tbody>
                </table>

                <div className="mt-4 p-4 border border-dashed border-slate-300 rounded text-center text-xs text-slate-500">
                    अन्य तथ्याङ्कहरू (Complications, Deaths, Abortion) उपलब्ध रेकर्डहरू अनुसार थपिनेछन्।
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-10 mt-12 text-center text-xs font-bold font-nepali">
            <div className="border-t border-slate-900 pt-2">तयार गर्ने</div>
            <div className="border-t border-slate-900 pt-2">स्वीकृत गर्ने</div>
        </div>
      </div>
    </div>
  );
};
