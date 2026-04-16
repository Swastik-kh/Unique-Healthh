import React, { useState, useMemo } from 'react';
import { CBIMNCIRecord, ServiceSeekerRecord } from '../types/coreTypes';
import { NepaliDatePicker } from './NepaliDatePicker';
import NepaliDate from 'nepali-date-converter';
import { FileText, Printer } from 'lucide-react';

interface CBIMNCIReportProps {
  cbimnciRecords: CBIMNCIRecord[];
  serviceSeekerRecords: ServiceSeekerRecord[];
  currentFiscalYear: string;
}

export const CBIMNCIReport: React.FC<CBIMNCIReportProps> = ({
  cbimnciRecords,
  serviceSeekerRecords,
  currentFiscalYear
}) => {
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
    return cbimnciRecords.filter(record => {
      const [year, month, day] = record.visitDate.split('-').map(Number);
      
      if (reportType === 'FiscalYear') {
        return record.fiscalYear === currentFiscalYear;
      } else if (reportType === 'Monthly') {
        const recordMonth = record.visitDate.split('-')[1];
        const recordYear = record.visitDate.split('-')[0];
        const currentYear = selectedDate.split('-')[0];
        return recordMonth === selectedMonth && recordYear === currentYear;
      } else if (reportType === 'Quarterly') {
        // Q1: 04,05,06 | Q2: 07,08,09 | Q3: 10,11,12 | Q4: 01,02,03
        const m = parseInt(record.visitDate.split('-')[1]);
        const q = m >= 4 && m <= 6 ? '1' : m >= 7 && m <= 9 ? '2' : m >= 10 && m <= 12 ? '3' : '4';
        return q === selectedQuarter && record.fiscalYear === currentFiscalYear;
      } else if (reportType === 'HalfYearly') {
        // H1: 04-09 | H2: 10-03
        const m = parseInt(record.visitDate.split('-')[1]);
        const h = (m >= 4 && m <= 9) ? '1' : '2';
        return h === selectedHalfYear && record.fiscalYear === currentFiscalYear;
      } else {
        return record.visitDate === selectedDate;
      }
    });
  }, [cbimnciRecords, reportType, selectedDate, selectedMonth, selectedQuarter, selectedHalfYear, currentFiscalYear]);

  // Helper to get patient details
  const getPatient = (id: string) => serviceSeekerRecords.find(p => p.id === id);

  // Helper to calculate age in days
  const getAgeInDays = (patient: ServiceSeekerRecord | undefined) => {
    if (!patient) return 0;
    if (patient.ageDays !== undefined && patient.ageDays > 0) return patient.ageDays;
    const years = patient.ageYears || 0;
    const months = patient.ageMonths || 0;
    return (years * 365) + (months * 30);
  };

  // --- Infant Stats (< 2 months) ---
  const infantRecords = filteredRecords.filter(r => r.moduleType === 'Infant');
  
  const infantStats = {
    total_0_28: 0,
    total_29_59: 0,
    severe_0_28: 0,
    severe_29_59: 0,
    pneumonia_0_28: 0,
    pneumonia_29_59: 0,
    local_0_28: 0,
    local_29_59: 0,
    jaundice_0_28: 0,
    jaundice_29_59: 0,
    lowWeight_0_28: 0,
    lowWeight_29_59: 0,
    feeding_0_28: 0,
    feeding_29_59: 0,
    ampicillin_0_28: 0,
    ampicillin_29_59: 0,
    amoxicillin_0_28: 0,
    amoxicillin_29_59: 0,
    gentamicin_first: 0,
    gentamicin_full: 0,
    other_antibiotic: 0,
    refer_0_28: 0,
    refer_29_59: 0,
    followup: 0,
    death_0_28: 0,
    death_29_59: 0
  };

  infantRecords.forEach(record => {
    const patient = getPatient(record.serviceSeekerId);
    const ageDays = getAgeInDays(patient);
    const is0to28 = ageDays <= 28;
    const is29to59 = ageDays > 28 && ageDays < 60;
    
    // Default to 0-28 if age is 0 or unknown but module is Infant
    const isYoung = is0to28 || (!is0to28 && !is29to59); 
    const isOld = is29to59;

    if (isYoung) infantStats.total_0_28++;
    if (isOld) infantStats.total_29_59++;

    const diag = record.diagnosis || '';
    const data = record.assessmentData || {};
    const meds = (record.prescriptions || []).map(p => p.medicineName.toLowerCase());

    if (diag.includes('Possible Serious Bacterial Infection') || diag.includes('Very Severe Disease')) {
      if (isYoung) infantStats.severe_0_28++;
      if (isOld) infantStats.severe_29_59++;
    }

    if (diag.includes('Pneumonia')) {
      if (isYoung) infantStats.pneumonia_0_28++;
      if (isOld) infantStats.pneumonia_29_59++;
    }

    if (diag.includes('Local Bacterial Infection')) {
      if (isYoung) infantStats.local_0_28++;
      if (isOld) infantStats.local_29_59++;
    }

    if (diag.includes('Severe Jaundice')) {
      if (isYoung) infantStats.jaundice_0_28++;
      if (isOld) infantStats.jaundice_29_59++;
    }

    const weight = parseFloat(data.weight || '0');
    if (weight > 0 && weight < 2.5) {
      if (isYoung) infantStats.lowWeight_0_28++;
      if (isOld) infantStats.lowWeight_29_59++;
    }

    if (data.feedingProblems?.length > 0 || data.attachment === 'Not Well' || data.attachment === 'Not at all' || data.suckling === 'Not Effective' || data.suckling === 'Not at all') {
      if (isYoung) infantStats.feeding_0_28++;
      if (isOld) infantStats.feeding_29_59++;
    }

    if (meds.some(m => m.includes('ampicillin') || m.includes('appropriate antibiotic'))) {
      if (isYoung) infantStats.ampicillin_0_28++;
      if (isOld) infantStats.ampicillin_29_59++;
    }
    if (meds.some(m => m.includes('amoxicillin'))) {
      if (isYoung) infantStats.amoxicillin_0_28++;
      if (isOld) infantStats.amoxicillin_29_59++;
    }
    if (meds.some(m => m.includes('gentamicin') || m.includes('appropriate antibiotic'))) {
      infantStats.gentamicin_first++; // Simplified
    }
    if (meds.some(m => !m.includes('ampicillin') && !m.includes('amoxicillin') && !m.includes('gentamicin') && (m.includes('cillin') || m.includes('mycin') || m.includes('xacin')))) {
      infantStats.other_antibiotic++;
    }

    if (record.isRefer) {
      if (isYoung) infantStats.refer_0_28++;
      if (isOld) infantStats.refer_29_59++;
    }

    if (record.isDeath) {
      if (isYoung) infantStats.death_0_28++;
      if (isOld) infantStats.death_29_59++;
    }

    if (record.isFollowup || (record.followupDays && record.followupDays > 0)) {
      infantStats.followup++;
    }
  });

  // --- Child Stats (2 to 59 months) ---
  const childRecords = filteredRecords.filter(r => r.moduleType === 'Child');
  
  const childStats = {
    total_boy: 0,
    total_girl: 0,
    no_pneumonia: 0,
    pneumonia: 0,
    severe_pneumonia: 0,
    no_dehydration: 0,
    some_dehydration: 0,
    severe_dehydration: 0,
    persistent_diarrhea: 0,
    dysentery: 0,
    malaria_falciparum: 0,
    malaria_non_falciparum: 0,
    severe_febrile: 0,
    measles: 0,
    ear_problem: 0,
    fever: 0,
    severe_malnutrition: 0,
    moderate_malnutrition: 0,
    anemia: 0,
    other: 0,
    amox_for_pneumonia: 0,
    ors_zinc: 0,
    iv_fluid: 0,
    deworming: 0,
    vitamin_a: 0,
    refer_resp: 0,
    refer_diarrhea: 0,
    refer_other: 0,
    followup: 0,
    death_resp: 0,
    death_diarrhea: 0,
    death_other: 0,
    death_2_11m: 0,
    death_12_59m: 0
  };

  childRecords.forEach(record => {
    const patient = getPatient(record.serviceSeekerId);
    if (patient?.gender === 'Male') childStats.total_boy++;
    if (patient?.gender === 'Female') childStats.total_girl++;

    const diag = record.diagnosis || '';
    const meds = (record.prescriptions || []).map(p => p.medicineName.toLowerCase());
    const isRefer = record.isRefer || diag.includes('Severe') || (record.advice || '').toLowerCase().includes('refer');
    const isDeath = record.isDeath || false;

    // Respiratory
    if (diag.includes('No Pneumonia: Cough or Cold')) childStats.no_pneumonia++;
    if (diag.includes('Pneumonia') && !diag.includes('No Pneumonia') && !diag.includes('Severe Pneumonia')) childStats.pneumonia++;
    if (diag.includes('Very Severe Disease') || diag.includes('Severe Pneumonia')) childStats.severe_pneumonia++;

    // Diarrhea
    if (diag.includes('No Dehydration')) childStats.no_dehydration++;
    if (diag.includes('Some Dehydration')) childStats.some_dehydration++;
    if (diag.includes('Severe Dehydration')) childStats.severe_dehydration++;
    if (diag.includes('Persistent Diarrhea')) childStats.persistent_diarrhea++;
    if (diag.includes('Dysentery')) childStats.dysentery++;

    // Fever / Malaria
    if (diag.includes('Very Severe Febrile Disease')) childStats.severe_febrile++;
    if (diag.includes('Malaria')) childStats.malaria_non_falciparum++; // Default to non-falciparum
    if (diag.includes('Fever: Malaria Unlikely')) childStats.fever++;
    if (diag.includes('Measles')) childStats.measles++;

    // Ear
    if ((diag.includes('Ear Infection') && !diag.includes('No Ear Infection')) || diag.includes('Mastoiditis')) childStats.ear_problem++;

    // Nutrition
    if (diag.includes('Severe Acute Malnutrition')) childStats.severe_malnutrition++;
    if (diag.includes('Moderate Acute Malnutrition')) childStats.moderate_malnutrition++;
    if (diag.includes('Anemia')) childStats.anemia++;

    // Treatment
    if (diag.includes('Pneumonia') && meds.some(m => m.includes('amoxicillin'))) childStats.amox_for_pneumonia++;
    if (meds.some(m => m.includes('ors') || m.includes('zinc'))) childStats.ors_zinc++;
    if (meds.some(m => m.includes('rl') || m.includes('ns') || m.includes('fluid'))) childStats.iv_fluid++;
    if (meds.some(m => m.includes('albendazole') || m.includes('mebendazole'))) childStats.deworming++;
    if (meds.some(m => m.includes('vitamin a') || m.includes('vit a'))) childStats.vitamin_a++;

    // Refer
    if (isRefer) {
      if (diag.includes('Pneumonia') || diag.includes('Disease')) childStats.refer_resp++;
      else if (diag.includes('Dehydration') || diag.includes('Diarrhea')) childStats.refer_diarrhea++;
      else childStats.refer_other++;
    }

    // Other
    const hasKnownDiag = diag.includes('Pneumonia') || diag.includes('Dehydration') || diag.includes('Diarrhea') || diag.includes('Malaria') || diag.includes('Fever') || diag.includes('Measles') || diag.includes('Ear') || diag.includes('Malnutrition') || diag.includes('Anemia');
    if (!hasKnownDiag && diag) {
      childStats.other++;
    }

    // Death
    if (isDeath) {
      if (diag.includes('Pneumonia') || diag.includes('Disease')) childStats.death_resp++;
      else if (diag.includes('Dehydration') || diag.includes('Diarrhea')) childStats.death_diarrhea++;
      else childStats.death_other++;

      const ageInMonths = (patient?.ageYears || 0) * 12 + (patient?.ageMonths || 0);
      if (ageInMonths <= 11) childStats.death_2_11m++;
      else childStats.death_12_59m++;
    }

    // Follow-up
    if (record.isFollowup || (record.followupDays && record.followupDays > 0)) {
      childStats.followup++;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 font-nepali flex items-center gap-2">
          <FileText className="text-primary-600" />
          CBIMNCI रिपोर्ट
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

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="text-center mb-6">
          <h3 className="font-bold text-lg">२. नवजात शिशु तथा बालरोगको एकीकृत व्यवस्थापन कार्यक्रम (IMNCI)</h3>
          <p className="text-sm text-slate-500">
            {reportType === 'Daily' ? `मिति: ${selectedDate}` : 
             reportType === 'Monthly' ? `महिना: ${selectedDate.split('-')[0]}-${selectedMonth}` : 
             reportType === 'Quarterly' ? `त्रैमासिक: Q${selectedQuarter} (${currentFiscalYear})` :
             reportType === 'HalfYearly' ? `अर्ध-वार्षिक: H${selectedHalfYear} (${currentFiscalYear})` :
             `आर्थिक वर्ष: ${currentFiscalYear}`}
          </p>
        </div>

        {/* Infant Table */}
        <div className="mb-8">
          <h4 className="font-bold text-slate-700 mb-2">२ महिना भन्दा कम उमेरका शिशु</h4>
          <table className="w-full text-xs border-collapse border border-slate-300 text-center">
            <thead className="bg-slate-100">
              <tr>
                <th rowSpan={2} className="border border-slate-300 p-1">उमेर</th>
                <th colSpan={2} className="border border-slate-300 p-1">जम्मा बिरामी</th>
                <th colSpan={6} className="border border-slate-300 p-1">बच्चाको वर्गिकरण (संक्रमणमा)</th>
                <th colSpan={4} className="border border-slate-300 p-1">उपचार</th>
                <th colSpan={2} className="border border-slate-300 p-1">रेफर</th>
                <th rowSpan={2} className="border border-slate-300 p-1">फलोअप</th>
                <th colSpan={2} className="border border-slate-300 p-1">मृत्यु</th>
              </tr>
              <tr>
                <th className="border border-slate-300 p-1">≤ २८ दिन</th>
                <th className="border border-slate-300 p-1">२९-५९ दिन</th>
                <th className="border border-slate-300 p-1">गम्भीर संक्रमण</th>
                <th className="border border-slate-300 p-1">निमोनिया</th>
                <th className="border border-slate-300 p-1">स्थानिय संक्रमण</th>
                <th className="border border-slate-300 p-1">कडा कमल पित्त</th>
                <th className="border border-slate-300 p-1">कम तौल</th>
                <th className="border border-slate-300 p-1">स्तनपान समस्या</th>
                <th className="border border-slate-300 p-1">एम्पिसिलिन</th>
                <th className="border border-slate-300 p-1">एमोक्सिसिलिन</th>
                <th className="border border-slate-300 p-1">जेन्टामाइसिन</th>
                <th className="border border-slate-300 p-1">अन्य एन्टीबायोटिक</th>
                <th className="border border-slate-300 p-1">≤ २८ दिन</th>
                <th className="border border-slate-300 p-1">२९-५९ दिन</th>
                <th className="border border-slate-300 p-1">०-२८ दिन</th>
                <th className="border border-slate-300 p-1">२९-५९ दिन</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 p-2 font-bold bg-slate-50">संख्या</td>
                <td className="border border-slate-300 p-2">{infantStats.total_0_28}</td>
                <td className="border border-slate-300 p-2">{infantStats.total_29_59}</td>
                <td className="border border-slate-300 p-2">{infantStats.severe_0_28 + infantStats.severe_29_59}</td>
                <td className="border border-slate-300 p-2">{infantStats.pneumonia_0_28 + infantStats.pneumonia_29_59}</td>
                <td className="border border-slate-300 p-2">{infantStats.local_0_28 + infantStats.local_29_59}</td>
                <td className="border border-slate-300 p-2">{infantStats.jaundice_0_28 + infantStats.jaundice_29_59}</td>
                <td className="border border-slate-300 p-2">{infantStats.lowWeight_0_28 + infantStats.lowWeight_29_59}</td>
                <td className="border border-slate-300 p-2">{infantStats.feeding_0_28 + infantStats.feeding_29_59}</td>
                <td className="border border-slate-300 p-2">{infantStats.ampicillin_0_28 + infantStats.ampicillin_29_59}</td>
                <td className="border border-slate-300 p-2">{infantStats.amoxicillin_0_28 + infantStats.amoxicillin_29_59}</td>
                <td className="border border-slate-300 p-2">{infantStats.gentamicin_first}</td>
                <td className="border border-slate-300 p-2">{infantStats.other_antibiotic}</td>
                <td className="border border-slate-300 p-2">{infantStats.refer_0_28}</td>
                <td className="border border-slate-300 p-2">{infantStats.refer_29_59}</td>
                <td className="border border-slate-300 p-2">{infantStats.followup}</td>
                <td className="border border-slate-300 p-2">{infantStats.death_0_28}</td>
                <td className="border border-slate-300 p-2">{infantStats.death_29_59}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Child Table */}
        <div>
          <h4 className="font-bold text-slate-700 mb-2">२ देखि ५९ महिना सम्मका बच्चा</h4>
          <table className="w-full text-[10px] border-collapse border border-slate-300 text-center">
            <thead className="bg-slate-100">
              <tr>
                <th colSpan={2} className="border border-slate-300 p-1">जम्मा बिरामी</th>
                <th colSpan={10} className="border border-slate-300 p-1">वर्गिकरण</th>
                <th colSpan={5} className="border border-slate-300 p-1">उपचार</th>
                <th colSpan={3} className="border border-slate-300 p-1">रेफर</th>
                <th rowSpan={2} className="border border-slate-300 p-1">फलोअप</th>
                <th colSpan={2} className="border border-slate-300 p-1">मृत्यु</th>
              </tr>
              <tr>
                <th className="border border-slate-300 p-1">बालक</th>
                <th className="border border-slate-300 p-1">बालिका</th>
                <th className="border border-slate-300 p-1">श्वासप्रश्वास</th>
                <th className="border border-slate-300 p-1">झाडापखाला</th>
                <th className="border border-slate-300 p-1">औलो</th>
                <th className="border border-slate-300 p-1">दादुरा</th>
                <th className="border border-slate-300 p-1">कानको समस्या</th>
                <th className="border border-slate-300 p-1">ज्वरो</th>
                <th className="border border-slate-300 p-1">कडा कुपोषण</th>
                <th className="border border-slate-300 p-1">मध्यम कुपोषण</th>
                <th className="border border-slate-300 p-1">रक्तअल्पता</th>
                <th className="border border-slate-300 p-1">अन्य</th>
                <th className="border border-slate-300 p-1">एमोक्सिसिलिन</th>
                <th className="border border-slate-300 p-1">ORS/Zinc</th>
                <th className="border border-slate-300 p-1">IV Fluid</th>
                <th className="border border-slate-300 p-1">जुकाको औषधि</th>
                <th className="border border-slate-300 p-1">भिटामिन ए</th>
                <th className="border border-slate-300 p-1">श्वासप्रश्वास</th>
                <th className="border border-slate-300 p-1">झाडापखाला</th>
                <th className="border border-slate-300 p-1">अन्य</th>
                <th className="border border-slate-300 p-1">कारण</th>
                <th className="border border-slate-300 p-1">उमेर</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 p-2">{childStats.total_boy}</td>
                <td className="border border-slate-300 p-2">{childStats.total_girl}</td>
                <td className="border border-slate-300 p-1 text-left">
                  <div>रुघाखोकी: {childStats.no_pneumonia}</div>
                  <div>निमोनिया: {childStats.pneumonia}</div>
                  <div>कडा निमोनिया: {childStats.severe_pneumonia}</div>
                </td>
                <td className="border border-slate-300 p-1 text-left">
                  <div>जलबियोजन नभएको: {childStats.no_dehydration}</div>
                  <div>केहि जलबियोजन: {childStats.some_dehydration}</div>
                  <div>कडा जलबियोजन: {childStats.severe_dehydration}</div>
                  <div>दिर्घ झाडापखाला: {childStats.persistent_diarrhea}</div>
                  <div>आउँ/रगत: {childStats.dysentery}</div>
                </td>
                <td className="border border-slate-300 p-1 text-left">
                  <div>फाल्सिपारम: {childStats.malaria_falciparum}</div>
                  <div>अन्य औलो: {childStats.malaria_non_falciparum}</div>
                  <div>कडा जटिल औलो: {childStats.severe_febrile}</div>
                </td>
                <td className="border border-slate-300 p-2">{childStats.measles}</td>
                <td className="border border-slate-300 p-2">{childStats.ear_problem}</td>
                <td className="border border-slate-300 p-2">{childStats.fever}</td>
                <td className="border border-slate-300 p-2">{childStats.severe_malnutrition}</td>
                <td className="border border-slate-300 p-2">{childStats.moderate_malnutrition}</td>
                <td className="border border-slate-300 p-2">{childStats.anemia}</td>
                <td className="border border-slate-300 p-2">{childStats.other}</td>
                <td className="border border-slate-300 p-2">{childStats.amox_for_pneumonia}</td>
                <td className="border border-slate-300 p-2">{childStats.ors_zinc}</td>
                <td className="border border-slate-300 p-2">{childStats.iv_fluid}</td>
                <td className="border border-slate-300 p-2">{childStats.deworming}</td>
                <td className="border border-slate-300 p-2">{childStats.vitamin_a}</td>
                <td className="border border-slate-300 p-2">{childStats.refer_resp}</td>
                <td className="border border-slate-300 p-2">{childStats.refer_diarrhea}</td>
                <td className="border border-slate-300 p-2">{childStats.refer_other}</td>
                <td className="border border-slate-300 p-2">{childStats.followup}</td>
                <td className="border border-slate-300 p-1 text-left">
                  <div>श्वासप्रश्वास: {childStats.death_resp}</div>
                  <div>झाडापखाला: {childStats.death_diarrhea}</div>
                  <div>अन्य: {childStats.death_other}</div>
                </td>
                <td className="border border-slate-300 p-1 text-left">
                  <div>२-११ महिना: {childStats.death_2_11m}</div>
                  <div>१२-५९ महिना: {childStats.death_12_59m}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Detailed Visit List */}
        <div className="mt-12 no-print-break print:hidden">
          <h4 className="font-bold text-slate-700 mb-4 border-b pb-2">३. बिरामीको विस्तृत विवरण (Detailed Patient Visits)</h4>
          <table className="w-full text-[10px] border-collapse border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-300 p-2">मिति</th>
                <th className="border border-slate-300 p-2">बिरामीको नाम (ID)</th>
                <th className="border border-slate-300 p-2">उमेर/लिङ्ग</th>
                <th className="border border-slate-300 p-2">मुख्य समस्या (Complaints)</th>
                <th className="border border-slate-300 p-2">वर्गिकरण (Classification)</th>
                <th className="border border-slate-300 p-2">उपचार (Treatment/Medicine)</th>
                <th className="border border-slate-300 p-2">कैफियत</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords
                  .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
                  .map(record => {
                    const patient = getPatient(record.serviceSeekerId);
                    const meds = (record.prescriptions || []).map(p => `${p.medicineName} (${p.dosage})`).join(', ');
                    return (
                      <tr key={record.id} className="hover:bg-slate-50">
                        <td className="border border-slate-300 p-2 whitespace-nowrap">{record.visitDate}</td>
                        <td className="border border-slate-300 p-2 font-bold">
                          {patient?.name || 'Unknown'} ({record.uniquePatientId})
                        </td>
                        <td className="border border-slate-300 p-2 whitespace-nowrap">
                          {patient?.age || '-'} / {patient?.gender || '-'}
                        </td>
                        <td className="border border-slate-300 p-2">{record.chiefComplaints || '-'}</td>
                        <td className="border border-slate-300 p-2 font-bold text-primary-700">{record.diagnosis || '-'}</td>
                        <td className="border border-slate-300 p-2">
                          <div className="space-y-1">
                            {meds && <p>{meds}</p>}
                            {record.advice && <p className="text-[9px] italic text-slate-500">Advice: {record.advice}</p>}
                          </div>
                        </td>
                        <td className="border border-slate-300 p-2">
                          <div className="flex flex-wrap gap-1">
                            {record.isRefer && <span className="bg-amber-100 text-amber-700 px-1 rounded">Refer</span>}
                            {record.isDeath && <span className="bg-red-100 text-red-700 px-1 rounded">Death</span>}
                            {record.followupDays && record.followupDays > 0 && <span className="bg-blue-100 text-blue-700 px-1 rounded">Followup: {record.followupDays}d</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })
              ) : (
                <tr>
                  <td colSpan={7} className="border border-slate-300 p-8 text-center text-slate-400 italic">कुनै रेकर्ड भेटिएन</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
