import React, { useMemo, useState } from 'react';
import { PariwarSewaRecord, OrganizationSettings } from '../types';
import { Printer, Calendar, Filter } from 'lucide-react';
import { NepaliDatePicker } from './NepaliDatePicker';
import NepaliDate from 'nepali-date-converter';

interface FamilyPlanningReportProps {
  records: PariwarSewaRecord[];
  settings: OrganizationSettings;
  fiscalYear: string;
}

export const FamilyPlanningReport: React.FC<FamilyPlanningReportProps> = ({ records, settings, fiscalYear }) => {
  const [reportType, setReportType] = useState<'Daily' | 'Monthly' | 'Quarterly' | 'HalfYearly' | 'FiscalYear'>('Monthly');
  const [selectedDate, setSelectedDate] = useState(() => {
    try { return new NepaliDate().format('YYYY-MM-DD'); } catch (e) { return ''; }
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    try { return new NepaliDate().format('MM'); } catch (e) { return '01'; }
  });
  const [selectedQuarter, setSelectedQuarter] = useState('1');
  const [selectedHalfYear, setSelectedHalfYear] = useState('1');

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const date = record.dateBs;
      if (!date) return false;
      
      if (reportType === 'FiscalYear') {
        return record.fiscalYear === fiscalYear;
      } else if (reportType === 'Monthly') {
        const recordMonth = date.split('-')[1];
        const recordYear = date.split('-')[0];
        const currentYear = selectedDate.split('-')[0];
        return recordMonth === selectedMonth && recordYear === currentYear;
      } else if (reportType === 'Quarterly') {
        const m = parseInt(date.split('-')[1]);
        const q = m >= 4 && m <= 6 ? '1' : m >= 7 && m <= 9 ? '2' : m >= 10 && m <= 12 ? '3' : '4';
        return q === selectedQuarter && record.fiscalYear === fiscalYear;
      } else if (reportType === 'HalfYearly') {
        const m = parseInt(date.split('-')[1]);
        const h = (m >= 4 && m <= 9) ? '1' : '2';
        return h === selectedHalfYear && record.fiscalYear === fiscalYear;
      } else {
        return date === selectedDate;
      }
    });
  }, [records, reportType, selectedDate, selectedMonth, selectedQuarter, selectedHalfYear, fiscalYear]);

  const parseAge = (ageStr: string): number => {
    const age = parseInt(ageStr);
    return isNaN(age) ? 0 : age;
  };

  const getStats = (method: string) => {
    const methodRecords = filteredRecords.filter(r => r.tempMethod === method);
    
    const newUnder20 = methodRecords.filter(r => r.userType === 'New' && parseAge(r.age) < 20).length;
    const newOver20 = methodRecords.filter(r => r.userType === 'New' && parseAge(r.age) >= 20).length;
    const current = methodRecords.filter(r => r.userType === 'Current').length;
    const discontinued = methodRecords.filter(r => r.userType === 'Discontinued').length;
    const totalQuantity = methodRecords.reduce((sum, r) => sum + (r.quantity || 0), 0);

    return { newUnder20, newOver20, current, discontinued, totalQuantity };
  };

  const tempMethods = [
    { label: 'कण्डम', value: 'Condom', unit: 'गोटा' },
    { label: 'आकस्मिक गर्भनिरोधक चक्की', value: 'Emergency Contraceptive', unit: 'डोज' },
    { label: 'पिल्स', value: 'Pills', unit: 'साइकल' },
    { label: 'डिपो', value: 'Depo', unit: 'भायल' },
    { label: 'साया प्रेस', value: 'Sayana Press', unit: 'डोज' },
    { label: 'आई. यु. सी. डी.', value: 'IUCD', unit: 'सेट' },
    { label: 'इम्प्लान्ट (५ वर्ष अवधिको)', value: 'Implant 5 yrs', unit: 'सेट' },
    { label: 'इम्प्लान्ट (३ वर्ष अवधिको)', value: 'Implant 3 yrs', unit: 'सेट' },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
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

      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0">
        <div className="text-center space-y-1 mb-8">
          <h1 className="text-xl font-bold font-nepali">{settings.orgNameNepali}</h1>
          <h2 className="text-lg font-bold font-nepali">परिवार नियोजन कार्यक्रम प्रतिवेदन</h2>
          <p className="text-sm text-slate-500 font-nepali">आ.व. {fiscalYear} | रिपोर्ट: {reportType}</p>
        </div>

        <div className="space-y-8">
          {/* Table 1: Temporary Methods */}
          <section>
            <h3 className="font-bold text-slate-800 mb-3 font-nepali">८. परिवार नियोजन कार्यक्रम</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-300 text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th rowSpan={2} className="border border-slate-300 p-2 font-nepali">अस्थायी साधन</th>
                    <th colSpan={2} className="border border-slate-300 p-2 font-nepali">नयाँ प्रयोगकर्ता</th>
                    <th rowSpan={2} className="border border-slate-300 p-2 font-nepali">हाल अपनाई रहेका</th>
                    <th rowSpan={2} className="border border-slate-300 p-2 font-nepali">सेवामा नियमित नभएका</th>
                    <th colSpan={2} className="border border-slate-300 p-2 font-nepali">साधन वितरण</th>
                  </tr>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 p-2 font-nepali text-xs">{'<'} २० वर्ष</th>
                    <th className="border border-slate-300 p-2 font-nepali text-xs">{'≥'} २० वर्ष</th>
                    <th className="border border-slate-300 p-2 font-nepali text-xs">इकाई</th>
                    <th className="border border-slate-300 p-2 font-nepali text-xs">परिमाण</th>
                  </tr>
                </thead>
                <tbody>
                  {tempMethods.map((m, idx) => {
                    const stats = getStats(m.value);
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="border border-slate-300 p-2 font-nepali">{m.label}</td>
                        <td className="border border-slate-300 p-2 text-center">{stats.newUnder20 || '-'}</td>
                        <td className="border border-slate-300 p-2 text-center">{stats.newOver20 || '-'}</td>
                        <td className="border border-slate-300 p-2 text-center">{stats.current || '-'}</td>
                        <td className="border border-slate-300 p-2 text-center">{stats.discontinued || '-'}</td>
                        <td className="border border-slate-300 p-2 text-center font-nepali text-xs">{m.unit}</td>
                        <td className="border border-slate-300 p-2 text-center">{stats.totalQuantity || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Table 2: New Users by Institution/Location */}
          <section>
            <h3 className="font-bold text-slate-800 mb-3 font-nepali">नयाँ प्रयोगकर्ता (संस्था र स्थान अनुसार)</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-300 text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th rowSpan={2} className="border border-slate-300 p-2 font-nepali">गन्तव्य/संस्था</th>
                    <th colSpan={2} className="border border-slate-300 p-2 font-nepali">स्वास्थ्य संस्था</th>
                    <th colSpan={2} className="border border-slate-300 p-2 font-nepali">शिविर</th>
                    <th colSpan={2} className="border border-slate-300 p-2 font-nepali">हाल अपनाईरहेका</th>
                  </tr>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 p-2 font-nepali text-xs">महिला</th>
                    <th className="border border-slate-300 p-2 font-nepali text-xs">पुरुष</th>
                    <th className="border border-slate-300 p-2 font-nepali text-xs">महिला</th>
                    <th className="border border-slate-300 p-2 font-nepali text-xs">पुरुष</th>
                    <th className="border border-slate-300 p-2 font-nepali text-xs">महिला</th>
                    <th className="border border-slate-300 p-2 font-nepali text-xs">पुरुष</th>
                  </tr>
                </thead>
                <tbody>
                  {['Government', 'Non-Government'].map((inst, idx) => {
                    const instRecords = filteredRecords.filter(r => r.institutionType === inst);
                    const hf_female = instRecords.filter(r => r.location === 'Health Facility' && r.userType === 'New' && r.permMethod?.includes('Female')).length;
                    const hf_male = instRecords.filter(r => r.location === 'Health Facility' && r.userType === 'New' && r.permMethod?.includes('Male')).length;
                    const camp_female = instRecords.filter(r => r.location === 'Camp' && r.userType === 'New' && r.permMethod?.includes('Female')).length;
                    const camp_male = instRecords.filter(r => r.location === 'Camp' && r.userType === 'New' && r.permMethod?.includes('Male')).length;
                    const current_female = instRecords.filter(r => r.userType === 'Current' && r.permMethod?.includes('Female')).length;
                    const current_male = instRecords.filter(r => r.userType === 'Current' && r.permMethod?.includes('Male')).length;

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="border border-slate-300 p-2 font-nepali">{inst === 'Government' ? 'सरकारी' : 'गैर सरकारी'}</td>
                        <td className="border border-slate-300 p-2 text-center">{hf_female || '-'}</td>
                        <td className="border border-slate-300 p-2 text-center">{hf_male || '-'}</td>
                        <td className="border border-slate-300 p-2 text-center">{camp_female || '-'}</td>
                        <td className="border border-slate-300 p-2 text-center">{camp_male || '-'}</td>
                        <td className="border border-slate-300 p-2 text-center">{current_female || '-'}</td>
                        <td className="border border-slate-300 p-2 text-center">{current_male || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Table 3: Postpartum FP */}
          <section>
            <h3 className="font-bold text-slate-800 mb-3 font-nepali">सुत्केरी पश्चात परिवार नियोजन सेवा</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-300 text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 p-2 font-nepali">विवरण</th>
                    <th className="border border-slate-300 p-2 font-nepali">आई. यु. सी. डी.</th>
                    <th className="border border-slate-300 p-2 font-nepali">इम्प्लान्ट</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2 font-nepali">सुत्केरी भएको ४८ घण्टा भित्र</td>
                    <td className="border border-slate-300 p-2 text-center">
                      {filteredRecords.filter(r => r.postPartumFP === 'Within 48 hrs' && r.tempMethod === 'IUCD').length || '-'}
                    </td>
                    <td className="border border-slate-300 p-2 text-center">
                      {filteredRecords.filter(r => r.postPartumFP === 'Within 48 hrs' && r.tempMethod?.includes('Implant')).length || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-nepali">४८ घण्टा देखि एक वर्ष भित्र</td>
                    <td className="border border-slate-300 p-2 text-center">
                      {filteredRecords.filter(r => r.postPartumFP === '48 hrs to 1 yr' && r.tempMethod === 'IUCD').length || '-'}
                    </td>
                    <td className="border border-slate-300 p-2 text-center">
                      {filteredRecords.filter(r => r.postPartumFP === '48 hrs to 1 yr' && r.tempMethod?.includes('Implant')).length || '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="mt-12 flex justify-between items-end">
          <div className="text-center space-y-1">
            <div className="w-32 border-b border-slate-400 mx-auto"></div>
            <p className="text-xs font-nepali">तयार गर्ने</p>
          </div>
          <div className="text-center space-y-1">
            <div className="w-32 border-b border-slate-400 mx-auto"></div>
            <p className="text-xs font-nepali">रुजु गर्ने</p>
          </div>
          <div className="text-center space-y-1">
            <div className="w-32 border-b border-slate-400 mx-auto"></div>
            <p className="text-xs font-nepali">स्वीकृत गर्ने</p>
          </div>
        </div>
      </div>
    </div>
  );
};
