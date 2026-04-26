import React, { useState, useCallback, useMemo } from 'react';
import { Save, Plus, Trash2, Printer } from 'lucide-react';
import { MagItem, InventoryItem } from '../types/inventoryTypes';
import { OrganizationSettings } from '../types/coreTypes';
import { Select } from './Select';
import { SearchableSelect } from './SearchableSelect';
import { FISCAL_YEARS } from '../constants';
import { db } from '../firebase';
import { ref, push, set } from 'firebase/database';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface ManualReportProps {
  generalSettings: OrganizationSettings;
  currentFiscalYear: string;
  inventoryItems: InventoryItem[];
  onSave: (data: any) => void;
}

export const ManualReport: React.FC<ManualReportProps> = ({ generalSettings, currentFiscalYear, inventoryItems, onSave }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new NepaliDate().format('YYYY-MM-DD'));
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear);
  const [items, setItems] = useState<MagItem[]>([{ id: 1, name: '', unit: '', quantity: '0', specification: '', remarks: '' }]);

  const itemOptions = useMemo(() => inventoryItems.map(item => ({
      id: item.id,
      label: item.itemName,
      value: item.itemName,
      itemData: item
  })), [inventoryItems]);

  const handleAddItem = () => {
    setItems(prev => [...prev, { id: prev.length + 1, name: '', unit: '', quantity: '0', specification: '', remarks: '' }]);
  };

  const handleItemChange = (index: number, field: keyof MagItem, value: string) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };
  
  const handleItemSelect = (index: number, option: any) => {
      const itemData = option.itemData as InventoryItem;
      setItems(prev => prev.map((item, i) => i === index ? {
          ...item,
          name: option.value,
          unit: itemData.unit,
          specification: itemData.specification || ''
      } : item));
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const saveReport = async () => {
    const reportRef = ref(db, 'manual_reports/' + fiscalYear.replace('/', '_') + '/' + Date.now());
    await set(reportRef, {
        title,
        date,
        fiscalYear,
        items
    });
    onSave({title, date, fiscalYear, items});
    alert('प्रतिवेदन सुरक्षित गरियो!');
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">नयाँ म्यानुअल प्रतिवेदन</h2>
            <button onClick={saveReport} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg"><Save size={16}/> सुरक्षित गर्नुहोस्</button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="प्रतिवेदनको शीर्षक" className="border p-2 rounded" />
            <input type="text" value={date} onChange={(e) => setDate(e.target.value)} placeholder="मिति (YYYY-MM-DD)" className="border p-2 rounded" />
            <Select label="आर्थिक वर्ष" options={FISCAL_YEARS} value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} />
        </div>

        <table className="w-full border-collapse border mb-4">
            <thead>
                <tr className="bg-slate-100">
                    <th className="border p-2">सामानको नाम</th>
                    <th className="border p-2">एकाई</th>
                    <th className="border p-2">परिमाण</th>
                    <th className="border p-2"></th>
                </tr>
            </thead>
            <tbody>
                {items.map((item, index) => (
                    <tr key={index}>
                        <td className="border p-2 min-w-[200px]">
                            <SearchableSelect 
                                options={itemOptions}
                                value={item.name}
                                onChange={(value) => handleItemChange(index, 'name', value)}
                                onSelect={(option) => handleItemSelect(index, option)}
                                placeholder="सामान छान्नुहोस्"
                            />
                        </td>
                        <td className="border p-2"><input value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} className="w-full" /></td>
                        <td className="border p-2"><input value={item.quantity} type="number" onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className="w-full" /></td>
                        <td className="border p-2"><button onClick={() => handleRemoveItem(index)} className="text-red-500"><Trash2 size={16} /></button></td>
                    </tr>
                ))}
            </tbody>
        </table>
        <button onClick={handleAddItem} className="flex items-center gap-2 text-indigo-600 font-bold"><Plus size={16}/> सामान थप्नुहोस्</button>
    </div>
  );
};
