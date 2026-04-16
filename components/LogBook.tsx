import React, { useState, useMemo, useEffect } from 'react';
import { Scroll, Plus, Save, RotateCcw, Printer, Search, Car, Cog } from 'lucide-react';
import { Input } from './Input';
import { NepaliDatePicker } from './NepaliDatePicker';
import { SearchableSelect } from './SearchableSelect';
// Fix: Corrected imports to point to specific type files since index/barrel file is missing or empty
import { User } from '../types/coreTypes';
import { LogBookEntry, InventoryItem } from '../types/inventoryTypes';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface LogBookProps {
  currentUser: User;
  currentFiscalYear: string;
  inventoryItems: InventoryItem[];
  logBookEntries: LogBookEntry[];
  onAddLogEntry: (entry: LogBookEntry) => void;
}

export const LogBook: React.FC<LogBookProps> = ({
  currentUser,
  currentFiscalYear,
  inventoryItems,
  logBookEntries,
  onAddLogEntry
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Get Today's Date in BS
  const getTodayBS = () => {
      try {
          return new NepaliDate().format('YYYY-MM-DD');
      } catch(e) {
          return '';
      }
  };

  const [formData, setFormData] = useState({
      date: getTodayBS(),
      inventoryId: '',
      assetName: '',
      codeNo: '',
      details: '',
      startTime: '',
      endTime: '',
      total: 0,
      fuelConsumed: 0,
      oilConsumed: 0,
      operatorName: currentUser.fullName,
      remarks: ''
  });

  // Filter Assets (Only Non-Expendable items usually have Log Books: Vehicles, Generators)
  const assetOptions = useMemo(() => {
      return inventoryItems
          .filter(item => item.itemType === 'Non-Expendable')
          .map(item => ({
              id: item.id,
              value: item.itemName,
              label: `${item.itemName} (${item.uniqueCode || item.sanketNo || '-'})`,
              itemData: item
          }));
  }, [inventoryItems]);

  // Handle Asset Selection
  const handleAssetSelect = (option: any) => {
      const item = option.itemData as InventoryItem;
      if (item) {
          setFormData(prev => ({
              ...prev,
              inventoryId: item.id,
              assetName: item.itemName,
              codeNo: item.uniqueCode || item.sanketNo || ''
          }));
      }
  };

  // Auto Calculate Total (Difference)
  useEffect(() => {
      const start = parseFloat(formData.startTime) || 0;
      const end = parseFloat(formData.endTime) || 0;
      if (end > start) {
          setFormData(prev => ({ ...prev, total: parseFloat((end - start).toFixed(2)) }));
      }
  }, [formData.startTime, formData.endTime]);

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!formData.inventoryId || !formData.date || !formData.details) {
          alert("कृपया आवश्यक विवरणहरू भर्नुहोस् (Please fill required fields)");
          return;
      }

      if (parseFloat(formData.endTime) < parseFloat(formData.startTime)) {
          alert("अन्तिम रिडिङ सुरुको रिडिङ भन्दा कम हुन सक्दैन। (End reading cannot be less than start reading)");
          return;
      }

      const newEntry: LogBookEntry = {
          id: Date.now().toString(),
          fiscalYear: currentFiscalYear,
          ...formData
      };

      onAddLogEntry(newEntry);
      
      // Reset form but keep date and asset for convenience
      setFormData(prev => ({
          ...prev,
          details: '',
          startTime: prev.endTime, // Auto-set start to previous end
          endTime: '',
          total: 0,
          fuelConsumed: 0,
          oilConsumed: 0,
          remarks: ''
      }));
  };

  // Filter Logs
  const filteredLogs = logBookEntries.filter(log => 
      log.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.codeNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.operatorName.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => b.date.localeCompare(a.date)); // Sort by date desc

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
            <div className="bg-slate-100 p-2 rounded-lg text-slate-700">
                <Scroll size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800 font-nepali">लग बुक (Log Book)</h2>
                <p className="text-sm text-slate-500">सवारी साधन तथा मेसिनरी औजारको प्रयोग अभिलेख</p>
            </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm no-print">
          <form onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                  <NepaliDatePicker 
                      label="मिति (Date)"
                      value={formData.date}
                      onChange={(val) => setFormData({...formData, date: val})}
                      required
                  />
                  <div className="md:col-span-2">
                      <SearchableSelect 
                          label="सवारी साधन / मेसिन (Select Vehicle/Machine) *"
                          options={assetOptions}
                          value={formData.assetName}
                          onChange={(val) => setFormData({...formData, assetName: val})}
                          onSelect={handleAssetSelect}
                          placeholder="Search asset..."
                          icon={<Car size={16} />}
                          required
                      />
                  </div>
                  <div className="md:col-span-3">
                      <Input 
                          label="कामको विवरण / स्थान (Description / Route) *"
                          value={formData.details}
                          onChange={(e) => setFormData({...formData, details: e.target.value})}
                          placeholder="e.g. कार्यालय देखि मन्त्रालय सम्म (Office to Ministry)"
                          required
                      />
                  </div>
                  
                  {/* Readings */}
                  <Input 
                      label="शुरुको रिडिङ/समय (Start Reading) *"
                      type="number"
                      step="any"
                      value={formData.startTime}
                      onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                      placeholder="0.00"
                      required
                  />
                  <Input 
                      label="अन्तिम रिडिङ/समय (End Reading) *"
                      type="number"
                      step="any"
                      value={formData.endTime}
                      onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                      placeholder="0.00"
                      required
                  />
                  <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-slate-700">जम्मा (Total Km/Hrs)</label>
                      <div className="h-[42px] flex items-center px-3 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700">
                          {formData.total}
                      </div>
                  </div>

                  {/* Consumables */}
                  <Input 
                      label="इन्धन खपत (Fuel - Liters)"
                      type="number"
                      step="any"
                      value={formData.fuelConsumed || ''}
                      onChange={(e) => setFormData({...formData, fuelConsumed: parseFloat(e.target.value) || 0})}
                      placeholder="Liters"
                  />
                  <Input 
                      label="मोबिल खपत (Oil - Liters)"
                      type="number"
                      step="any"
                      value={formData.oilConsumed || ''}
                      onChange={(e) => setFormData({...formData, oilConsumed: parseFloat(e.target.value) || 0})}
                      placeholder="Liters"
                  />
                  <Input 
                      label="चलाउनेको नाम (Operator Name)"
                      value={formData.operatorName}
                      onChange={(e) => setFormData({...formData, operatorName: e.target.value})}
                      placeholder="Driver Name"
                  />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button 
                      type="button"
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2"
                      onClick={() => setFormData({
                          date: getTodayBS(),
                          inventoryId: '',
                          assetName: '',
                          codeNo: '',
                          details: '',
                          startTime: '',
                          endTime: '',
                          total: 0,
                          fuelConsumed: 0,
                          oilConsumed: 0,
                          operatorName: currentUser.fullName,
                          remarks: ''
                      })}
                  >
                      <RotateCcw size={18} /> रिसेट (Reset)
                  </button>
                  <button 
                      type="submit"
                      className="px-6 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg shadow-sm flex items-center gap-2 font-medium"
                  >
                      <Save size={18} /> सुरक्षित गर्नुहोस् (Save Log)
                  </button>
              </div>
          </form>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="font-semibold text-slate-700 font-nepali">लग अभिलेख (Log Records)</h3>
              <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                          type="text" 
                          placeholder="Search asset, code or operator..." 
                          className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                      />
                  </div>
                  <button onClick={() => window.print()} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors no-print">
                      <Printer size={20} />
                  </button>
              </div>
          </div>
          
          <div className="overflow-x-auto p-4 md:p-0">
            {/* A4 Print Friendly Table Structure */}
            <div className="print:p-8">
                <div className="hidden print:block text-center mb-6">
                    <h2 className="text-xl font-bold">सवारी साधन / मेसिनरी लग बुक</h2>
                    <p>आर्थिक वर्ष: {currentFiscalYear}</p>
                </div>
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-medium">
                      <tr>
                          <th className="border border-slate-300 px-3 py-2">मिति</th>
                          <th className="border border-slate-300 px-3 py-2">साधन/मेसिन</th>
                          <th className="border border-slate-300 px-3 py-2 w-1/4">विवरण / स्थान</th>
                          <th className="border border-slate-300 px-3 py-2 text-center">शुरु</th>
                          <th className="border border-slate-300 px-3 py-2 text-center">अन्तिम</th>
                          <th className="border border-slate-300 px-3 py-2 text-center font-bold">जम्मा</th>
                          <th className="border border-slate-300 px-3 py-2 text-center">इन्धन (L)</th>
                          <th className="border border-slate-300 px-3 py-2 text-center">मोबिल (L)</th>
                          <th className="border border-slate-300 px-3 py-2">चलाउने</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredLogs.length === 0 ? (
                          <tr><td colSpan={9} className="px-6 py-8 text-center text-slate-400 italic border border-slate-300">कुनै रेकर्ड फेला परेन (No records found)</td></tr>
                      ) : (
                          filteredLogs.map(log => (
                              <tr key={log.id} className="hover:bg-slate-50">
                                  <td className="border border-slate-300 px-3 py-2 font-nepali whitespace-nowrap">{log.date}</td>
                                  <td className="border border-slate-300 px-3 py-2">
                                      <div className="font-medium text-slate-800">{log.assetName}</div>
                                      <div className="text-xs text-slate-500 font-mono">{log.codeNo}</div>
                                  </td>
                                  <td className="border border-slate-300 px-3 py-2">{log.details}</td>
                                  <td className="border border-slate-300 px-3 py-2 text-center text-slate-600">{log.startTime}</td>
                                  <td className="border border-slate-300 px-3 py-2 text-center text-slate-600">{log.endTime}</td>
                                  <td className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-800 bg-slate-50">{log.total}</td>
                                  <td className="border border-slate-300 px-3 py-2 text-center">{log.fuelConsumed || '-'}</td>
                                  <td className="border border-slate-300 px-3 py-2 text-center">{log.oilConsumed || '-'}</td>
                                  <td className="border border-slate-300 px-3 py-2 text-xs">{log.operatorName}</td>
                              </tr>
                          ))
                      )}
                  </tbody>
                </table>
            </div>
          </div>
      </div>
    </div>
  );
};