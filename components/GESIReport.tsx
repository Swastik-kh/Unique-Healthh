import React, { useState, useMemo } from 'react';
import { Printer } from 'lucide-react';
import { 
  ChildImmunizationRecord, 
  CBIMNCIRecord, 
  ServiceSeekerRecord, 
  PrasutiRecord, 
  TBPatient, 
  OPDRecord, 
  IPDRecord 
} from '../types';
import { useReactToPrint } from 'react-to-print';
import { NepaliDatePicker } from './NepaliDatePicker';
import NepaliDate from 'nepali-date-converter';

interface GESIReportProps {
  currentFiscalYear: string;
  bachhaRecords: ChildImmunizationRecord[];
  cbimnciRecords: CBIMNCIRecord[];
  serviceSeekerRecords: ServiceSeekerRecord[];
  prasutiRecords: PrasutiRecord[];
  tbPatients: TBPatient[];
  opdRecords: OPDRecord[];
  ipdRecords: IPDRecord[];
}

const CASTE_GROUPS = [
  { id: 'Dalit', name: 'दलित' },
  { id: 'Janajati', name: 'जनजाती' },
  { id: 'Madhesi', name: 'मधेसी' },
  { id: 'Brahmin/Chhetri', name: 'ब्राह्मण/क्षेत्री' },
  { id: 'Muslim', name: 'मुस्लिम' },
  { id: 'Other', name: 'अन्य' }
];

const getCasteId = (code: string | undefined) => {
  if (!code) return 'Other';
  const mapping: Record<string, string> = {
    '1': 'Dalit',
    '2': 'Janajati',
    '3': 'Madhesi',
    '4': 'Muslim',
    '5': 'Brahmin/Chhetri',
    '6': 'Other',
    'Dalit': 'Dalit',
    'Janajati': 'Janajati',
    'Madhesi': 'Madhesi',
    'Brahmin/Chhetri': 'Brahmin/Chhetri',
    'Muslim': 'Muslim',
    'Other': 'Other'
  };
  return mapping[code] || 'Other';
};

export const GESIReport: React.FC<GESIReportProps> = ({
  currentFiscalYear,
  bachhaRecords,
  cbimnciRecords,
  serviceSeekerRecords,
  prasutiRecords,
  tbPatients,
  opdRecords,
  ipdRecords
}) => {
  const componentRef = React.useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'GESI_Report',
  });

  const [reportType, setReportType] = useState<'Daily' | 'Monthly' | 'Quarterly' | 'HalfYearly' | 'FiscalYear'>('Monthly');
  const [selectedDate, setSelectedDate] = useState(() => {
    try { return new NepaliDate().format('YYYY-MM-DD'); } catch (e) { return ''; }
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    try { return new NepaliDate().format('MM'); } catch (e) { return '01'; }
  });
  const [selectedQuarter, setSelectedQuarter] = useState('1');
  const [selectedHalfYear, setSelectedHalfYear] = useState('1');

  const filterRecords = (records: any[], dateField: string) => {
    return records.filter(record => {
      const date = record[dateField];
      if (!date) return false;
      
      if (reportType === 'FiscalYear') {
        return record.fiscalYear === currentFiscalYear;
      } else if (reportType === 'Monthly') {
        const recordMonth = date.split('-')[1];
        const recordYear = date.split('-')[0];
        const currentYear = selectedDate.split('-')[0];
        return recordMonth === selectedMonth && recordYear === currentYear;
      } else if (reportType === 'Quarterly') {
        const m = parseInt(date.split('-')[1]);
        const q = m >= 4 && m <= 6 ? '1' : m >= 7 && m <= 9 ? '2' : m >= 10 && m <= 12 ? '3' : '4';
        return q === selectedQuarter && record.fiscalYear === currentFiscalYear;
      } else if (reportType === 'HalfYearly') {
        const m = parseInt(date.split('-')[1]);
        const h = (m >= 4 && m <= 9) ? '1' : '2';
        return h === selectedHalfYear && record.fiscalYear === currentFiscalYear;
      } else {
        return date === selectedDate;
      }
    });
  };

  const filteredBachha = useMemo(() => filterRecords(bachhaRecords, 'date'), [bachhaRecords, reportType, selectedDate, selectedMonth, selectedQuarter, selectedHalfYear, currentFiscalYear]);
  const filteredCbimnci = useMemo(() => filterRecords(cbimnciRecords, 'visitDate'), [cbimnciRecords, reportType, selectedDate, selectedMonth, selectedQuarter, selectedHalfYear, currentFiscalYear]);
  const filteredPrasuti = useMemo(() => filterRecords(prasutiRecords, 'date'), [prasutiRecords, reportType, selectedDate, selectedMonth, selectedQuarter, selectedHalfYear, currentFiscalYear]);
  const filteredTb = useMemo(() => filterRecords(tbPatients, 'date'), [tbPatients, reportType, selectedDate, selectedMonth, selectedQuarter, selectedHalfYear, currentFiscalYear]);
  const filteredOpd = useMemo(() => filterRecords(opdRecords, 'date'), [opdRecords, reportType, selectedDate, selectedMonth, selectedQuarter, selectedHalfYear, currentFiscalYear]);
  const filteredIpd = useMemo(() => filterRecords(ipdRecords, 'date'), [ipdRecords, reportType, selectedDate, selectedMonth, selectedQuarter, selectedHalfYear, currentFiscalYear]);

  const getPatient = (id: string) => serviceSeekerRecords.find(p => p.id === id);

  const reportData = useMemo(() => {
    // Initialize data structure
    const data: Record<string, any> = {};
    CASTE_GROUPS.forEach(caste => {
      data[caste.id] = {
        name: caste.name,
        khop_m: 0, khop_f: 0,
        imnci_u2_m: 0, imnci_u2_f: 0,
        imnci_2_59_m: 0, imnci_2_59_f: 0,
        underweight_m: 0, underweight_f: 0,
        delivery: 0,
        abortion: 0,
        hiv_m: 0, hiv_f: 0, hiv_o: 0,
        leprosy_m: 0, leprosy_f: 0,
        tb_m: 0, tb_f: 0,
        opd_new_m: 0, opd_new_f: 0,
        discharge_m: 0, discharge_f: 0,
        gbv_m: 0, gbv_f: 0
      };
    });

    // 1. Fully Immunized within 23 months
    filteredBachha.forEach(record => {
        const caste = getCasteId(record.jatCode);
        const gender = record.gender === 'Male' ? 'm' : 'f';
        // Simplified check for fully immunized (assuming if they have measles 2 or typhoid, they are fully immunized)
        const isFullyImmunized = record.vaccines.some(v => (v.name.includes('MR-2') || v.name.includes('Typhoid')) && v.status === 'Given');
        if (isFullyImmunized && data[caste]) {
          data[caste][`khop_${gender}`]++;
        }
    });

    // 2. IMNCI Services & 3. Underweight
    filteredCbimnci.forEach(record => {
        const patient = getPatient(record.serviceSeekerId);
        if (patient) {
          const caste = getCasteId(patient.casteCode);
          const gender = patient.gender === 'Male' ? 'm' : 'f';
          
          if (data[caste]) {
            if (record.moduleType === 'Infant') {
              data[caste][`imnci_u2_${gender}`]++;
            } else {
              data[caste][`imnci_2_59_${gender}`]++;
            }

            // Underweight check
            if (record.assessmentData?.weight) {
              if (record.diagnosis?.includes('Underweight') || record.diagnosis?.includes('Malnutrition')) {
                 data[caste][`underweight_${gender}`]++;
              }
            }
          }
        }
    });

    // 4. Institutional Delivery
    filteredPrasuti.forEach(record => {
        // PrasutiRecord doesn't have casteCode directly, we would need to link to GarbhawotiRecord, which also doesn't have it.
        // Defaulting to '6' (Other) for now unless we add it.
        const caste = getCasteId((record as any).casteCode);
        if (data[caste] && (record.deliveryPlace === 'Health Facility' || record.deliveryPlace === 'Hospital')) {
          data[caste].delivery++;
        }
    });

    // 5. Safe Abortion, 6. HIV, 11. GBV (From OPD)
    filteredOpd.forEach(record => {
        const patient = getPatient(record.serviceSeekerId);
        if (patient) {
          const caste = getCasteId(patient.casteCode);
          const gender = patient.gender === 'Male' ? 'm' : patient.gender === 'Female' ? 'f' : 'o';
          const diag = (record.diagnosis || '').toLowerCase();
          
          if (data[caste]) {
            if (diag.includes('abortion')) data[caste].abortion++;
            if (diag.includes('hiv')) {
              if (gender === 'm') data[caste].hiv_m++;
              else if (gender === 'f') data[caste].hiv_f++;
              else data[caste].hiv_o++;
            }
            if (diag.includes('gbv') || diag.includes('violence') || diag.includes('assault')) {
              if (gender === 'm') data[caste].gbv_m++;
              else if (gender === 'f') data[caste].gbv_f++;
            }

            // 9. New OPD > 5 years
            const ageYears = patient.ageYears || 0;
            if (ageYears > 5 && patient.visitType === 'New') {
              if (gender === 'm') data[caste].opd_new_m++;
              else if (gender === 'f') data[caste].opd_new_f++;
            }
          }
        }
    });

    // 7. Leprosy & 8. TB
    filteredTb.forEach(record => {
        const caste = getCasteId(record.ethnicity);
        const gender = record.gender === 'Male' ? 'm' : 'f';
        
        if (data[caste]) {
          if (record.serviceType === 'Leprosy') {
            data[caste][`leprosy_${gender}`]++;
          } else if (record.serviceType === 'TB') {
            data[caste][`tb_${gender}`]++;
          }
        }
    });

    // 10. Discharged Patients
    filteredIpd.forEach(record => {
      if (record.status === 'Discharged') {
        const patient = getPatient(record.serviceSeekerId);
        if (patient) {
          const caste = getCasteId(patient.casteCode);
          const gender = patient.gender === 'Male' ? 'm' : 'f';
          if (data[caste]) {
            data[caste][`discharge_${gender}`]++;
          }
        }
      }
    });

    return data;
  }, [filteredBachha, filteredCbimnci, filteredPrasuti, filteredTb, filteredOpd, filteredIpd, serviceSeekerRecords]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-nepali">Gender Equity and Social Inclusion (GESI) Report</h2>
          <p className="text-sm text-slate-500">लैंगिक समानता तथा सामाजिक समावेशीकरण प्रतिवेदन</p>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 transition-colors"
        >
          <Printer size={18} /> प्रिन्ट गर्नुहोस्
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
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto p-4" ref={componentRef}>
          <style type="text/css" media="print">
            {`
              @page { size: landscape; margin: 10mm; }
              body { font-family: 'Kalimati', sans-serif; }
              table { width: 100%; border-collapse: collapse; font-size: 10px; }
              th, td { border: 1px solid #000; padding: 4px; text-align: center; }
              th { background-color: #f3f4f6; font-weight: bold; }
              .header-title { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 10px; }
            `}
          </style>
          
          <div className="header-title mb-4 text-center font-bold text-lg hidden print:block">
            २०. लिङ्ग र जात/जाती अनुसारको प्रतिवेदन
          </div>

          <table className="w-full border-collapse border border-slate-300 text-xs text-center">
            <thead>
              <tr>
                <th colSpan={22} className="border border-slate-300 p-2 bg-slate-100 font-bold text-sm">
                  २०. लिङ्ग र जात/जाती अनुसारको प्रतिवेदन
                </th>
              </tr>
              <tr>
                <th rowSpan={3} className="border border-slate-300 p-2 w-24">जात/जाती</th>
                <th colSpan={2} rowSpan={2} className="border border-slate-300 p-2">२३ म. भित्र पूर्ण खोप पाएका बच्चा संख्या</th>
                <th colSpan={4} className="border border-slate-300 p-2">नवशिशु तथा बालरोगको एकीकृत व्यवस्थापन सेवा लिएका बच्चा संख्या</th>
                <th colSpan={2} rowSpan={2} className="border border-slate-300 p-2">२ वर्ष मुनिका कम तौल भएका बच्चाहरुको संख्या</th>
                <th rowSpan={3} className="border border-slate-300 p-2">स्वास्थ्य संस्थामा प्रसूति गराएका</th>
                <th rowSpan={3} className="border border-slate-300 p-2">सुरक्षित गर्भपतन सेवा पाएका</th>
                <th colSpan={3} rowSpan={2} className="border border-slate-300 p-2">एच.आई.भी. संक्रमित नयाँ बिरामी</th>
                <th colSpan={2} rowSpan={2} className="border border-slate-300 p-2">नयाँ कुष्ठरोगीहरुको संख्या</th>
                <th colSpan={2} rowSpan={2} className="border border-slate-300 p-2">नयाँ क्षयरोग बिरामीहरुको संख्या</th>
                <th colSpan={2} rowSpan={2} className="border border-slate-300 p-2">ओ.पी.डी. मा आएका नयाँ बिरामी संख्या (५ वर्ष माथि)</th>
                <th colSpan={2} rowSpan={2} className="border border-slate-300 p-2">अस्पतालबाट डिस्चार्ज भएका बिरामी</th>
                <th colSpan={2} rowSpan={2} className="border border-slate-300 p-2">लैगिक हिंसाबाट पिडीतको संख्या</th>
              </tr>
              <tr>
                <th colSpan={2} className="border border-slate-300 p-1">&lt;२ महिना</th>
                <th colSpan={2} className="border border-slate-300 p-1">२-५९ महिना</th>
              </tr>
              <tr>
                <th className="border border-slate-300 p-1">म.</th>
                <th className="border border-slate-300 p-1">पु.</th>
                <th className="border border-slate-300 p-1">म.</th>
                <th className="border border-slate-300 p-1">पु.</th>
                <th className="border border-slate-300 p-1">म.</th>
                <th className="border border-slate-300 p-1">पु.</th>
                <th className="border border-slate-300 p-1">म.</th>
                <th className="border border-slate-300 p-1">पु.</th>
                <th className="border border-slate-300 p-1">म.</th>
                <th className="border border-slate-300 p-1">पु.</th>
                <th className="border border-slate-300 p-1">यो.अ</th>
                <th className="border border-slate-300 p-1">म.</th>
                <th className="border border-slate-300 p-1">पु.</th>
                <th className="border border-slate-300 p-1">म.</th>
                <th className="border border-slate-300 p-1">पु.</th>
                <th className="border border-slate-300 p-1">म.</th>
                <th className="border border-slate-300 p-1">पु.</th>
                <th className="border border-slate-300 p-1">म.</th>
                <th className="border border-slate-300 p-1">पु.</th>
                <th className="border border-slate-300 p-1">म.</th>
                <th className="border border-slate-300 p-1">पु.</th>
              </tr>
              <tr className="bg-slate-50 text-slate-500">
                <th className="border border-slate-300 p-1">1</th>
                <th className="border border-slate-300 p-1">2</th>
                <th className="border border-slate-300 p-1">3</th>
                <th className="border border-slate-300 p-1">4</th>
                <th className="border border-slate-300 p-1">5</th>
                <th className="border border-slate-300 p-1">6</th>
                <th className="border border-slate-300 p-1">7</th>
                <th className="border border-slate-300 p-1">8</th>
                <th className="border border-slate-300 p-1">9</th>
                <th className="border border-slate-300 p-1">10</th>
                <th className="border border-slate-300 p-1">11</th>
                <th className="border border-slate-300 p-1">12</th>
                <th className="border border-slate-300 p-1">13</th>
                <th className="border border-slate-300 p-1">14</th>
                <th className="border border-slate-300 p-1">15</th>
                <th className="border border-slate-300 p-1">16</th>
                <th className="border border-slate-300 p-1">17</th>
                <th className="border border-slate-300 p-1">18</th>
                <th className="border border-slate-300 p-1">19</th>
                <th className="border border-slate-300 p-1">20</th>
                <th className="border border-slate-300 p-1">21</th>
                <th className="border border-slate-300 p-1">22</th>
              </tr>
            </thead>
            <tbody>
              {CASTE_GROUPS.map(caste => {
                const row = reportData[caste.id];
                return (
                  <tr key={caste.id} className="hover:bg-slate-50">
                    <td className="border border-slate-300 p-2 text-left font-medium">{caste.name}</td>
                    <td className="border border-slate-300 p-2">{row.khop_f || ''}</td>
                    <td className="border border-slate-300 p-2">{row.khop_m || ''}</td>
                    <td className="border border-slate-300 p-2">{row.imnci_u2_f || ''}</td>
                    <td className="border border-slate-300 p-2">{row.imnci_u2_m || ''}</td>
                    <td className="border border-slate-300 p-2">{row.imnci_2_59_f || ''}</td>
                    <td className="border border-slate-300 p-2">{row.imnci_2_59_m || ''}</td>
                    <td className="border border-slate-300 p-2">{row.underweight_f || ''}</td>
                    <td className="border border-slate-300 p-2">{row.underweight_m || ''}</td>
                    <td className="border border-slate-300 p-2">{row.delivery || ''}</td>
                    <td className="border border-slate-300 p-2">{row.abortion || ''}</td>
                    <td className="border border-slate-300 p-2">{row.hiv_f || ''}</td>
                    <td className="border border-slate-300 p-2">{row.hiv_m || ''}</td>
                    <td className="border border-slate-300 p-2">{row.hiv_o || ''}</td>
                    <td className="border border-slate-300 p-2">{row.leprosy_f || ''}</td>
                    <td className="border border-slate-300 p-2">{row.leprosy_m || ''}</td>
                    <td className="border border-slate-300 p-2">{row.tb_f || ''}</td>
                    <td className="border border-slate-300 p-2">{row.tb_m || ''}</td>
                    <td className="border border-slate-300 p-2">{row.opd_new_f || ''}</td>
                    <td className="border border-slate-300 p-2">{row.opd_new_m || ''}</td>
                    <td className="border border-slate-300 p-2">{row.discharge_f || ''}</td>
                    <td className="border border-slate-300 p-2">{row.discharge_m || ''}</td>
                    <td className="border border-slate-300 p-2">{row.gbv_f || ''}</td>
                    <td className="border border-slate-300 p-2">{row.gbv_m || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
