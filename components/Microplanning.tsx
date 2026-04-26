
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { ref, get, set } from 'firebase/database';
import { Save, FileText, Printer } from 'lucide-react';
import { NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE } from './ChildImmunizationRegistration';

interface MicroplanningProps {
  currentFiscalYear: string;
  bachhaRecords: any[];
}

const TARGET_ITEMS = [
  { id: 'target_0_11', label: 'लक्षित संख्या ०-११ महिना' },
  { id: 'target_12_23', label: 'लक्षित संख्या १२-२३ महिना' },
];

const NEPALI_MONTHS = [
  { id: '04', label: 'साउन (Shrawan)' },
  { id: '05', label: 'भदौ (Bhadra)' },
  { id: '06', label: 'असोज (Ashwin)' },
  { id: '07', label: 'कात्तिक (Kartik)' },
  { id: '08', label: 'मंसिर (Mangsir)' },
  { id: '09', label: 'पुष (Poush)' },
  { id: '10', label: 'माघ (Magh)' },
  { id: '11', label: 'फागुन (Falgun)' },
  { id: '12', label: 'चैत्र (Caitra)' },
  { id: '01', label: 'बैशाख (Baishakh)' },
  { id: '02', label: 'जेठ (Jestha)' },
  { id: '03', label: 'असार (Ashad)' },
];

export const Microplanning: React.FC<MicroplanningProps> = ({ currentFiscalYear, bachhaRecords }) => {
  const [activeTab, setActiveTab] = useState<'targets' | 'report' | 'annual' | 'report3' | 'report4'>('targets');
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const snapshot = await get(ref(db, `microplanning/targets/${currentFiscalYear.replace('/', '_')}`));
      if (snapshot.exists()) {
        setTargets(snapshot.val());
      }
      setLoading(false);
    };
    fetchData();
  }, [currentFiscalYear]);

  const handleSave = async () => {
    await set(ref(db, `microplanning/targets/${currentFiscalYear.replace('/', '_')}`), targets);
    alert('लक्ष्य जनसंख्या सुरक्षित गरियो!');
  };

  const reportData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    NEPALI_MONTHS.forEach(m => {
        data[m.id] = {};
        NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.forEach(v => {
            data[m.id][v.name] = 0;
        });
    });

    bachhaRecords
      .filter(r => r.fiscalYear === currentFiscalYear)
      .forEach(record => {
        record.vaccines.forEach((v: any) => {
          if (v.status === 'Given' && v.givenDateBs) {
            const m = v.givenDateBs.split('-')[1];
            if (data[m] && data[m][v.name] !== undefined) {
              data[m][v.name]++;
            }
          }
        });
      });
    return data;
  }, [bachhaRecords, currentFiscalYear]);

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="flex gap-4 mb-6 no-print">
        <button className={`px-4 py-2 rounded ${activeTab === 'targets' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`} onClick={() => setActiveTab('targets')}>लक्ष्य जनसंख्या</button>
        <button className={`px-4 py-2 rounded ${activeTab === 'report' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`} onClick={() => setActiveTab('report')}>मासिक रिपोर्ट (फारम नं. १)</button>
        <button className={`px-4 py-2 rounded ${activeTab === 'annual' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`} onClick={() => setActiveTab('annual')}>वार्षिक प्रगति (फारम नं. २)</button>
        <button className={`px-4 py-2 rounded ${activeTab === 'report3' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`} onClick={() => setActiveTab('report3')}>खोप सामाग्री (फारम नं. ३)</button>
        <button className={`px-4 py-2 rounded ${activeTab === 'report4' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`} onClick={() => setActiveTab('report4')}>ड्रपआउट रिपोर्ट (फारम नं. ४)</button>
      </div>

      {activeTab === 'targets' && (
        <>
          <h2 className="text-2xl font-bold text-slate-800 mb-6 font-nepali">लक्ष्य जनसंख्या (आ.व. {currentFiscalYear})</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            {TARGET_ITEMS.map(item => (
                <div key={item.id} className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-700">{item.label}</label>
                    <input 
                        type="number"
                        value={targets[item.id] || ''}
                        onChange={(e) => setTargets({...targets, [item.id]: e.target.value})}
                        className="border p-2 rounded"
                    />
                </div>
            ))}
          </div>
          
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg"><Save size={16}/> सुरक्षित गर्नुहोस्</button>
        </>
      )}

      {activeTab === 'report' && (
        <div id="print-area" className="printable-area">
           <h2 className="text-2xl font-bold text-slate-800 mb-6 font-nepali">स्वास्थ्य संस्था स्तरीय मासिक खोप प्रगति विवरण (आ.व. {currentFiscalYear})</h2>
           <div className="overflow-x-auto">
            <table className="w-full border-collapse border text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border p-2">महिना</th>
                  {NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.map(v => <th key={v.name} className="border p-2 rotate-90">{v.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {NEPALI_MONTHS.map(m => (
                  <tr key={m.id}>
                    <td className="border p-2 font-bold">{m.label}</td>
                    {NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.map(v => (
                        <td key={v.name} className="border p-2 text-center">{reportData[m.id][v.name] || 0}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
           </div>
           <button onClick={() => window.print()} className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg no-print"><Printer size={16}/> प्रिन्ट गर्नुहोस्</button>
        </div>
      )}

      {activeTab === 'annual' && (
        <div id="annual-report-print-area" className="printable-area">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 font-nepali">स्वास्थ्य संस्था खोपकेन्द्र स्तरीय वार्षिक खोप प्रगति (फारम नं. २)</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border text-xs">
              <thead>
                <tr className="bg-slate-100">
                   <th className="border p-2">खोपको नाम</th>
                   <th className="border p-2">जम्मा डोज</th>
                </tr>
              </thead>
              <tbody>
                 {NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.map(v => {
                     let total = 0;
                     NEPALI_MONTHS.forEach(m => {
                         total += reportData[m.id][v.name] || 0;
                     });
                     return (
                         <tr key={v.name}>
                             <td className="border p-2">{v.name}</td>
                             <td className="border p-2 text-center">{total}</td>
                         </tr>
                     );
                 })}
              </tbody>
            </table>
          </div>
          <button onClick={() => window.print()} className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg no-print"><Printer size={16}/> प्रिन्ट गर्नुहोस्</button>
        </div>
      )}

      {activeTab === 'report3' && (
         <div id="form3-print-area" className="printable-area">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 font-nepali">स्वास्थ्य संस्था स्तरीय मासिक खोप तथा खोप सामाग्री प्राप्त, खर्च र खेर जानेदरको विवरण (फारम नं. ३)</h2>
          <div className="overflow-x-auto">
             <table className="w-full border-collapse border text-xs text-center">
                <thead>
                    <tr className="bg-slate-100">
                        <th className="border p-2" rowSpan={2}>महिना</th>
                        {NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.map(v => (
                          <th className="border p-2" colSpan={2} key={v.name}>{v.name}</th>
                        ))}
                    </tr>
                    <tr className="bg-slate-100">
                        {NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.map(v => (
                          <React.Fragment key={v.name}>
                            <th className="border p-1">प्रा.</th>
                            <th className="border p-1">ख.</th>
                          </React.Fragment>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {NEPALI_MONTHS.map(m => (
                        <tr key={m.id}>
                            <td className="border p-2 font-bold">{m.label}</td>
                             {NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.map(v => (
                              <React.Fragment key={v.name}>
                                <td className="border p-2">-</td>
                                <td className="border p-2">-</td>
                              </React.Fragment>
                            ))}
                        </tr>
                    ))}
                </tbody>
             </table>
          </div>
          <button onClick={() => window.print()} className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg no-print"><Printer size={16}/> प्रिन्ट गर्नुहोस्</button>
        </div>
      )}

      {activeTab === 'report4' && (
         <div id="form4-print-area" className="printable-area">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 font-nepali">स्वास्थ्य संस्थाको वार्षिक खोप कार्यक्रमको प्रगति तथा ड्रप आउट दर तथा समस्याको वर्गीकरण (फारम नं. ४)</h2>
          <div className="overflow-x-auto">
             <table className="w-full border-collapse border text-xs text-center border-spacing-0">
                <thead>
                    <tr className="bg-slate-100">
                        <th className="border p-2" rowSpan={3}>महिना</th>
                        <th className="border p-2" colSpan={10}>प्रगति संख्या</th>
                        <th className="border p-2" colSpan={6}>समस्याको वर्गीकरण</th>
                    </tr>
                    <tr className="bg-slate-100">
                        <th className="border p-2" colSpan={2}>BCG-MR2</th>
                        <th className="border p-2" colSpan={2}>DPT1-DPT3</th>
                        <th className="border p-2" colSpan={2}>PCV1-PCV3</th>
                        <th className="border p-2" colSpan={2}>MR1-MR2</th>
                        <th className="border p-2" colSpan={2}>DPT1-MR2</th>
                        <th className="border p-2" colSpan={2}>पहुँच</th>
                        <th className="border p-2" colSpan={2}>उपभोग</th>
                        <th className="border p-2" colSpan={2}>अन्य</th>
                    </tr>
                    <tr className="bg-slate-100">
                      {[...Array(5)].map((_, i) => (
                        <React.Fragment key={i}>
                          <th className="border p-1">प्र.सं.</th>
                          <th className="border p-1">डो.</th>
                        </React.Fragment>
                      ))}
                      <th className="border p-1">छ</th><th className="border p-1">छैन</th>
                      <th className="border p-1">छ</th><th className="border p-1">छैन</th>
                      <th className="border p-1">१,२,३</th><th className="border p-1">४</th>
                    </tr>
                </thead>
                <tbody>
                    {NEPALI_MONTHS.map(m => (
                        <tr key={m.id}>
                            <td className="border p-2 font-bold">{m.label}</td>
                            {[...Array(16)].map((_, i) => (
                              <td key={i} className="border p-1">-</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
             </table>
          </div>
          <button onClick={() => window.print()} className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg no-print"><Printer size={16}/> प्रिन्ट गर्नुहोस्</button>
        </div>
      )}
    </div>
  );
};
