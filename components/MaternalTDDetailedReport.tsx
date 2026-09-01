import React from 'react';
import { GarbhawatiPatient } from '../types/healthTypes';
import { OrganizationSettings } from '../types/coreTypes';
import { Download, Printer, ShieldCheck, Heart, Droplets, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';

export interface MaternalTDDetailRow extends GarbhawatiPatient {
  dosesGivenThisPeriod: {
    doseName: 'TD1' | 'TD2' | 'TD Booster';
    dateBs: string;
    dateAd?: string | null;
    vaccinatedElsewhere?: boolean;
  }[];
  statusText: string;
  isFullyProtected: boolean;
}

interface MaternalTDDetailedReportProps {
  filteredMaternal: MaternalTDDetailRow[];
  generalSettings: OrganizationSettings;
  selectedFiscalYear: string;
  selectedMonth: string;
  currentMonthLabel: string;
  filterCenter: string;
  selectedVaccine: string;
  searchQuery: string;
  onDownloadCSV: () => void;
}

export const MaternalTDDetailedReport: React.FC<MaternalTDDetailedReportProps> = ({
  filteredMaternal,
  generalSettings,
  selectedFiscalYear,
  selectedMonth,
  currentMonthLabel,
  filterCenter,
  selectedVaccine,
  searchQuery,
  onDownloadCSV
}) => {
  // Compute summary stats for current filtered list
  const totalWomen = filteredMaternal.length;
  let td1GivenCount = 0;
  let td2GivenCount = 0;
  let tdBoosterGivenCount = 0;
  let fullyProtectedCount = 0;

  filteredMaternal.forEach(m => {
    if (m.isFullyProtected) fullyProtectedCount++;
    m.dosesGivenThisPeriod.forEach(d => {
      if (d.doseName === 'TD1') td1GivenCount++;
      if (d.doseName === 'TD2') td2GivenCount++;
      if (d.doseName === 'TD Booster') tdBoosterGivenCount++;
    });
  });

  return (
    <div id="print-maternal-detailed-content" className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-slate-100 max-w-[297mm] mx-auto print-full space-y-6">
      
      {/* Top action bar (No Print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2 text-sm text-purple-900 font-bold font-nepali">
          <Heart className="text-purple-600" size={20} />
          <span>गर्भवती महिला TD खोप विस्तृत लग विवरण ({totalWomen} जना)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDownloadCSV}
            disabled={filteredMaternal.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold font-nepali transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={15} /> CSV डाउनलोड गर्नुहोस्
          </button>
        </div>
      </div>

      {/* Metric summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
        <div className="p-3 bg-purple-50/80 border border-purple-100 rounded-xl">
          <div className="text-[11px] font-bold text-purple-700 font-nepali">कुल गर्भवती महिला</div>
          <div className="text-xl font-bold font-mono text-purple-900 mt-0.5">{totalWomen}</div>
        </div>
        <div className="p-3 bg-indigo-50/80 border border-indigo-100 rounded-xl">
          <div className="text-[11px] font-bold text-indigo-700 font-nepali">TD1 प्राप्त गर्ने</div>
          <div className="text-xl font-bold font-mono text-indigo-900 mt-0.5">{td1GivenCount}</div>
        </div>
        <div className="p-3 bg-teal-50/80 border border-teal-100 rounded-xl">
          <div className="text-[11px] font-bold text-teal-700 font-nepali">TD2 प्राप्त गर्ने</div>
          <div className="text-xl font-bold font-mono text-teal-900 mt-0.5">{td2GivenCount}</div>
        </div>
        <div className="p-3 bg-amber-50/80 border border-amber-100 rounded-xl">
          <div className="text-[11px] font-bold text-amber-700 font-nepali">TD बुस्टर प्राप्त गर्ने</div>
          <div className="text-xl font-bold font-mono text-amber-900 mt-0.5">{tdBoosterGivenCount}</div>
        </div>
      </div>

      {/* Print Header */}
      <div className="print-header mb-6 pb-4 flex items-center justify-center relative border-b-2 border-slate-900">
        <img 
          src={generalSettings.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png"} 
          alt="Logo" 
          className="print-logo hidden" 
        />
        <div className="print-header-text text-center w-full">
          <h1>{generalSettings.orgNameNepali}</h1>
          {generalSettings.subTitleNepali && <h2>{generalSettings.subTitleNepali}</h2>}
          {generalSettings.subTitleNepali2 && <h3>{generalSettings.subTitleNepali2}</h3>}
          {generalSettings.subTitleNepali3 && <h4>{generalSettings.subTitleNepali3}</h4>}
          <h2 className="mt-3 font-bold text-lg font-black underline font-nepali text-purple-950">
            मासिक खोप कार्यक्रम प्रतिवेदन (गर्भवती महिला TD खोप विस्तृत विवरण)
          </h2>
          <div className="flex flex-wrap justify-between items-center mt-4 text-xs font-bold text-slate-700 font-nepali gap-2">
            <span>आ.व.: <strong>{selectedFiscalYear}</strong></span>
            <span>महिना: <strong>{currentMonthLabel}</strong></span>
            <span>खोप केन्द्र: <strong>{filterCenter || 'सबै'}</strong></span>
            {selectedVaccine !== 'all' && <span>खोप: <strong>{selectedVaccine}</strong></span>}
            <span>जम्मा गर्भवती संख्या: <strong>{filteredMaternal.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Maternal Detailed Log Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full text-xs text-left border-collapse min-w-[950px]">
          <thead className="bg-slate-100 text-slate-800 font-bold">
            <tr className="border-b border-slate-300">
              <th className="border-r border-slate-300 p-2.5 text-center w-10">क्र.सं.</th>
              <th className="border-r border-slate-300 p-2.5 w-20 text-center font-mono">दर्ता नं.</th>
              <th className="border-r border-slate-300 p-2.5 min-w-[140px]">गर्भवतीको नाम</th>
              <th className="border-r border-slate-300 p-2.5 w-14 text-center">उमेर</th>
              <th className="border-r border-slate-300 p-2.5 w-16 text-center">गर्भ (G)</th>
              <th className="border-r border-slate-300 p-2.5 min-w-[150px]">ठेगाना र फोन</th>
              <th className="border-r border-slate-300 p-2.5 w-20 text-center">अघिल्लो TD</th>
              <th className="border-r border-slate-300 p-2.5 min-w-[160px]">यो अवधिमा लगाइएको TD खोप</th>
              <th className="border-r border-slate-300 p-2.5 min-w-[180px]">सम्पूर्ण TD खोप इतिहास</th>
              <th className="border-r border-slate-300 p-2.5 min-w-[110px] text-center">खोप केन्द्र</th>
              <th className="border-b border-slate-300 p-2.5 w-24 text-center">स्थिति</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredMaternal.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-8 text-center text-slate-500 font-nepali font-medium bg-slate-50">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="text-slate-400" size={24} />
                    <span>यस अवधि तथा छनोट गरिएका फिल्टर (महिना/केन्द्र/खोप) अनुसार कुनै गर्भवती महिलाको TD खोप विवरण फेला परेन।</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredMaternal.map((m, idx) => (
                <tr key={m.id} className="hover:bg-purple-50/40 transition-colors">
                  <td className="border-r border-slate-200 p-2 text-center font-mono text-slate-600">{idx + 1}</td>
                  <td className="border-r border-slate-200 p-2 text-center font-mono font-bold text-purple-800">{m.regNo}</td>
                  <td className="border-r border-slate-200 p-2 font-bold text-slate-900 font-nepali">
                    <div>{m.name}</div>
                    {m.remarks && <div className="text-[10px] font-normal text-slate-500 mt-0.5">{m.remarks}</div>}
                  </td>
                  <td className="border-r border-slate-200 p-2 text-center font-mono text-slate-700">{m.age || '-'} वर्ष</td>
                  <td className="border-r border-slate-200 p-2 text-center font-mono text-slate-700">G{m.gravida || 1}</td>
                  <td className="border-r border-slate-200 p-2 text-[11px] leading-relaxed">
                    <div className="font-medium text-slate-800 font-nepali">{m.address || '-'}</div>
                    <div className="font-mono text-slate-500 text-[10px] font-semibold">{m.phone || '-'}</div>
                  </td>
                  <td className="border-r border-slate-200 p-2 text-center font-mono text-slate-600 text-xs">
                    {m.previousTdCount ? `${m.previousTdCount} पटक` : '०'}
                  </td>
                  <td className="border-r border-slate-200 p-2 text-[11px]">
                    <div className="flex flex-col gap-1">
                      {m.dosesGivenThisPeriod.map((dose, dIdx) => (
                        <div key={dIdx} className="inline-flex items-center gap-1">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] whitespace-nowrap border ${
                            dose.doseName === 'TD1' 
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                              : dose.doseName === 'TD2' 
                              ? 'bg-teal-50 text-teal-700 border-teal-200' 
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                            {dose.doseName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-700 font-semibold">{dose.dateBs}</span>
                          {dose.vaccinatedElsewhere && (
                            <span className="text-[9px] text-amber-600 font-medium">(अन्यत्र)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="border-r border-slate-200 p-2 text-[10px] leading-tight">
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="font-semibold text-slate-500">TD1:</span>
                        <span className="font-mono text-slate-800">
                          {m.td1DateBs ? `${m.td1DateBs}${m.td1VaccinatedElsewhere ? ' (अन्यत्र)' : ''}` : '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="font-semibold text-slate-500">TD2:</span>
                        <span className="font-mono text-slate-800">
                          {m.td2DateBs ? `${m.td2DateBs}${m.td2VaccinatedElsewhere ? ' (अन्यत्र)' : ''}` : '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="font-semibold text-slate-500">TD Booster:</span>
                        <span className="font-mono text-slate-800">
                          {m.tdBoosterDateBs ? `${m.tdBoosterDateBs}${m.tdBoosterVaccinatedElsewhere ? ' (अन्यत्र)' : ''}` : '-'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="border-r border-slate-200 p-2 text-center text-xs font-medium text-slate-700 font-nepali">
                    {m.vaccinationCenter || '-'}
                  </td>
                  <td className="p-2 text-center text-[10px] font-bold">
                    <span className={`inline-block px-2 py-0.5 rounded-full border ${
                      m.isFullyProtected 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {m.statusText}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Print Footer */}
      <div className="grid grid-cols-2 gap-10 mt-12 text-center text-xs font-bold font-nepali">
        <div className="border-t border-slate-900 pt-2">तयार गर्ने (Prepared By)</div>
        <div className="border-t border-slate-900 pt-2">स्वीकृत गर्ने (Approved By)</div>
      </div>
    </div>
  );
};
