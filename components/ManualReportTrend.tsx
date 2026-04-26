import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, get, child } from 'firebase/database';
import { FISCAL_YEARS } from '../constants';
import { Select } from './Select';

interface ManualReportTrendProps {
  currentFiscalYear: string;
}

export const ManualReportTrend: React.FC<ManualReportTrendProps> = ({ currentFiscalYear }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFy, setSelectedFy] = useState(currentFiscalYear);

  const fetchTrendData = async () => {
    setLoading(true);
    const currentIndex = FISCAL_YEARS.findIndex(fy => fy.value === selectedFy);
    const yearsToFetch = FISCAL_YEARS.slice(Math.max(0, currentIndex - 2), currentIndex + 1);
    
    let allReports: any[] = [];
    
    for (const fy of yearsToFetch) {
        const fyKey = fy.value.replace('/', '_');
        const snapshot = await get(child(ref(db), `manual_reports/${fyKey}`));
        if (snapshot.exists()) {
            const reports = snapshot.val();
            Object.values(reports).forEach((r: any) => {
                allReports.push({ ...r, fiscalYear: fy.value });
            });
        }
    }
    setData(allReports);
    setLoading(false);
  };

  useEffect(() => {
    fetchTrendData();
  }, [selectedFy]);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h2 className="text-xl font-bold mb-4">३ वर्षको प्रवृत्ति</h2>
        <div className="flex gap-4 items-end mb-4">
            <div className="w-48"><Select label="आर्थिक वर्ष" options={FISCAL_YEARS} value={selectedFy} onChange={(e) => setSelectedFy(e.target.value)} /></div>
            <button onClick={fetchTrendData} className="px-4 py-2 bg-indigo-600 text-white rounded">डाटा लोड गर्नुहोस्</button>
        </div>
        {loading ? <p>लोड हुँदैछ...</p> : (
            <div className="overflow-x-auto">
                <table className="w-full border-collapse border">
                    <thead>
                        <tr className="bg-slate-100">
                            <th className="border p-2">आर्थिक वर्ष</th>
                            <th className="border p-2">शीर्षक</th>
                            <th className="border p-2">मिति</th>
                            <th className="border p-2">सामान संख्या</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((r, i) => (
                            <tr key={i}>
                                <td className="border p-2 text-center">{r.fiscalYear}</td>
                                <td className="border p-2">{r.title}</td>
                                <td className="border p-2 text-center">{r.date}</td>
                                <td className="border p-2 text-center">{r.items.length}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
  );
};
