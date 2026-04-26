import React, { useState, useEffect, useMemo } from 'react';
import { Save, Plus, Trash2, Printer } from 'lucide-react';
import { db } from '../firebase';
import { ref, get, child, set } from 'firebase/database';
import { FISCAL_YEARS } from '../constants';
import { Select } from './Select';
import { SearchableSelect } from './SearchableSelect';

interface ManualReportTrendProps {
  currentFiscalYear: string;
}

export const ManualReportTrend: React.FC<ManualReportTrendProps> = ({ currentFiscalYear }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFy, setSelectedFy] = useState(currentFiscalYear);
  const [editingReports, setEditingReports] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<{reportId: string, itemIndex: number, name: string, unit: string, quantity: string} | null>(null);

  const fetchTrendData = async () => {
    setLoading(true);
    const currentIndex = FISCAL_YEARS.findIndex(fy => fy.value === selectedFy);
    const yearsToFetch = FISCAL_YEARS.slice(Math.max(0, currentIndex - 2), currentIndex + 1);
    
    // Aggregate data by item
    const aggregatedData: { [name: string]: { unit: string; [fy: string]: number } } = {};
    
    for (const fy of yearsToFetch) {
        const fyKey = fy.value.replace('/', '_');
        const snapshot = await get(child(ref(db), `manual_reports/${fyKey}`));
        if (snapshot.exists()) {
            const reports = snapshot.val();
            Object.values(reports).forEach((r: any) => {
                if (r.items) {
                    r.items.forEach((item: any) => {
                        if (!aggregatedData[item.name]) {
                            aggregatedData[item.name] = { unit: item.unit };
                            yearsToFetch.forEach(y => aggregatedData[item.name][y.value] = 0);
                        }
                        aggregatedData[item.name][fy.value] += parseFloat(item.quantity) || 0;
                    });
                }
            });
        }
    }
    
    // Convert to array
    const result = Object.entries(aggregatedData).map(([name, data]) => ({
        name,
        ...data
    }));
    
    setData(result);
    setLoading(false);
  };

  const fetchSelectedFyData = async () => {
      const fyKey = selectedFy.replace('/', '_');
      const snapshot = await get(child(ref(db), `manual_reports/${fyKey}`));
      if (snapshot.exists()) {
          const reports = snapshot.val();
          const reportsArray = Object.keys(reports).map(id => ({ id, ...reports[id] }));
          setEditingReports(reportsArray);
      } else {
          setEditingReports([]);
      }
      setSelectedItem(null);
  }

  useEffect(() => {
    fetchTrendData();
    fetchSelectedFyData();
  }, [selectedFy]);

  const editOptions = useMemo(() => {
    const options: any[] = [];
    editingReports.forEach(report => {
        report.items.forEach((item: any, index: number) => {
            options.push({
                label: `${report.title} - ${item.name}`,
                value: `${report.id}_${index}`,
                reportId: report.id,
                itemIndex: index,
                name: item.name,
                unit: item.unit,
                quantity: item.quantity
            });
        });
    });
    return options;
  }, [editingReports]);


  const yearsToFetch = useMemo(() => {
     const currentIndex = FISCAL_YEARS.findIndex(fy => fy.value === selectedFy);
     return FISCAL_YEARS.slice(Math.max(0, currentIndex - 2), currentIndex + 1);
  }, [selectedFy]);

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex justify-between items-center mb-4 no-print">
            <h2 className="text-xl font-bold">३ वर्षको प्रवृत्ति</h2>
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded"><Printer size={16}/> प्रिन्ट गर्नुहोस्</button>
        </div>
        
        <div className="flex gap-4 items-end mb-4 no-print">
            <div className="w-48"><Select label="आर्थिक वर्ष" options={FISCAL_YEARS} value={selectedFy} onChange={(e) => setSelectedFy(e.target.value)} /></div>
            <button onClick={fetchTrendData} className="px-4 py-2 bg-indigo-600 text-white rounded">डाटा लोड गर्नुहोस्</button>
        </div>
        
        <div id="trend-report-print-area" className="w-full">
            {loading ? <p>लोड हुँदैछ...</p> : (
                <div className="overflow-x-auto mb-8">
                    <table className="w-full border-collapse border">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="border p-2">सामानको नाम</th>
                                <th className="border p-2">एकाई</th>
                                {yearsToFetch.map(fy => <th key={fy.value} className="border p-2">खर्च ({fy.label})</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((r, i) => (
                                <tr key={i}>
                                    <td className="border p-2">{r.name}</td>
                                    <td className="border p-2 text-center">{r.unit}</td>
                                    {yearsToFetch.map(fy => <td key={fy.value} className="border p-2 text-center">{r[fy.value] || 0}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            <div className="border-t pt-4 mt-4 no-print">
                <h3 className="text-lg font-bold mb-2">म्यानुअल प्रतिवेदन सम्पादन</h3>
                <div className="w-full mb-4">
                    <SearchableSelect 
                        options={editOptions} 
                        value={selectedItem ? `${selectedItem.reportId}_${selectedItem.itemIndex}` : ''}
                        onChange={(value) => {
                            const option = editOptions.find(o => o.value === value);
                            if (option) setSelectedItem({ reportId: option.reportId, itemIndex: option.itemIndex, name: option.name, unit: option.unit, quantity: option.quantity });
                        }}
                        placeholder="सामान छान्नुहोस्"
                    />
                </div>
                {selectedItem && (
                    <div className="flex gap-2 items-center">
                        <input value={selectedItem.name} className="border p-2 rounded w-1/3" disabled />
                        <input value={selectedItem.unit} className="border p-2 rounded w-1/3" disabled />
                        <input value={selectedItem.quantity} type="number" onChange={(e) => setSelectedItem({...selectedItem, quantity: e.target.value})} className="border p-2 rounded w-1/3" />
                         <button onClick={async () => {
                             const report = editingReports.find(r => r.id === selectedItem.reportId);
                             if (!report) return;
                             const newItems = [...report.items];
                             newItems[selectedItem.itemIndex].quantity = selectedItem.quantity;
                             
                             const fyKey = report.fiscalYear.replace('/', '_');
                             await set(ref(db, `manual_reports/${fyKey}/${report.id}`), {
                                  title: report.title,
                                  date: report.date,
                                  fiscalYear: report.fiscalYear,
                                  items: newItems
                             });
                             alert('अपडेट गरियो: ' + report.title);
                             fetchSelectedFyData(); // refresh data
                        }} className="px-4 py-2 bg-green-600 text-white rounded">सेभ गर्नुहोस्</button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
