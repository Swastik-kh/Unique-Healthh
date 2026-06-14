import React, { useState } from 'react';
import { Talim, KarmachariTalimRecord, User } from '../types';
import { Trash2, Plus } from 'lucide-react';
import { NepaliDatePicker } from './NepaliDatePicker';

interface TalimByabasthapanProps {
  talimEntries: Talim[];
  onSaveTalim: (talim: Talim) => void;
  onDeleteTalim: (id: string) => void;
  karmachariTalimRecords: KarmachariTalimRecord[];
  onSaveKarmachariTalimRecord: (record: KarmachariTalimRecord) => void;
  onDeleteKarmachariTalimRecord: (id: string) => void;
  users: User[];
}

export const TalimByabasthapan: React.FC<TalimByabasthapanProps> = ({ 
    talimEntries, onSaveTalim, onDeleteTalim, 
    karmachariTalimRecords, onSaveKarmachariTalimRecord, onDeleteKarmachariTalimRecord,
    users 
}) => {
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');

  const [selectedKarmachariId, setSelectedKarmachariId] = useState('');
  const [selectedTalimId, setSelectedTalimId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [location, setLocation] = useState('');
  
  const [karmachariFilter, setKarmachariFilter] = useState('');
  const [talimFilter, setTalimFilter] = useState('');

  const handleAdd = () => {
    if (name && duration) {
      onSaveTalim({
        id: Date.now().toString(),
        name,
        durationDays: parseInt(duration),
      });
      setName('');
      setDuration('');
    }
  };

  const handleAssignTalim = () => {
    if (selectedKarmachariId && selectedTalimId && fromDate && toDate && location) {
        onSaveKarmachariTalimRecord({
            id: Date.now().toString(),
            userId: selectedKarmachariId,
            talimId: selectedTalimId,
            fromDate,
            toDate,
            location
        });
        setSelectedKarmachariId('');
        setSelectedTalimId('');
        setFromDate('');
        setToDate('');
        setLocation('');
    }
  }

  const [selectedFilterTalimId, setSelectedFilterTalimId] = useState('');

  const getUserName = (id: string) => users.find(u => u.id === id)?.fullName || 'Unknown';
  const getTalimName = (id: string) => talimEntries.find(t => t.id === id)?.name || 'Unknown';

  const filteredUsers = users.filter(u => u.fullName.toLowerCase().includes(karmachariFilter.toLowerCase()));
  const filteredTalims = talimEntries.filter(t => t.name.toLowerCase().includes(talimFilter.toLowerCase()));

  const employeeTrainingStatus = users
      .filter(u => u.fullName.toLowerCase().includes(karmachariFilter.toLowerCase()))
      .map(u => {
          const record = karmachariTalimRecords.find(r => r.userId === u.id && r.talimId === selectedFilterTalimId);
          return {
              user: u,
              hasTaken: !!record,
              fromDate: record?.fromDate || '',
              toDate: record?.toDate || '',
              location: record?.location || ''
          };
      });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">तालिम व्यवस्थापन</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="p-4 border rounded">
            <h3 className="font-bold mb-4">नयाँ तालिम थप्नुहोस्</h3>
            <div className="flex gap-4 mb-2">
                <input placeholder="तालिम नाम" value={name} onChange={(e) => setName(e.target.value)} className="border p-2 rounded flex-1" />
                <input type="number" placeholder="दिन" value={duration} onChange={(e) => setDuration(e.target.value)} className="border p-2 rounded w-20" />
                <button onClick={handleAdd} className="bg-primary-600 text-white px-4 py-2 rounded flex items-center gap-2"> <Plus size={18} /> </button>
            </div>
        </div>
        
        <div className="p-4 border rounded">
            <h3 className="font-bold mb-4">कर्मचारीलाई तालिम असाइन गर्नुहोस्</h3>
            <div className="flex flex-col gap-2 mb-2">
                <input placeholder="कर्मचारी खोज्नुहोस्..." value={karmachariFilter} onChange={(e) => setKarmachariFilter(e.target.value)} className="border p-2 rounded" />
                <select value={selectedKarmachariId} onChange={(e) => setSelectedKarmachariId(e.target.value)} className="border p-2 rounded">
                    <option value="">कर्मचारी छान्नुहोस्</option>
                    {filteredUsers.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
                <input placeholder="तालिम खोज्नुहोस्..." value={talimFilter} onChange={(e) => setTalimFilter(e.target.value)} className="border p-2 rounded" />
                <select value={selectedTalimId} onChange={(e) => setSelectedTalimId(e.target.value)} className="border p-2 rounded">
                    <option value="">तालिम छान्नुहोस्</option>
                    {filteredTalims.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <NepaliDatePicker label="शुरु मिति" value={fromDate} onChange={setFromDate} />
                <NepaliDatePicker label="अन्त्य मिति" value={toDate} onChange={setToDate} />
                <input placeholder="तालिम स्थान" value={location} onChange={(e) => setLocation(e.target.value)} className="border p-2 rounded" />
                <button onClick={handleAssignTalim} className="bg-primary-600 text-white p-2 rounded">रेकर्ड गर्नुहोस्</button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <table className="w-full border border-slate-200">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="p-3">तालिम नाम</th>
                <th className="p-3">दिन संख्या</th>
                <th className="p-3">कार्य</th>
              </tr>
            </thead>
            <tbody>
              {talimEntries.map(talim => (
                <tr key={talim.id} className="border-t border-slate-200">
                  <td className="p-3">{talim.name}</td>
                  <td className="p-3">{talim.durationDays}</td>
                  <td className="p-3">
                    <button onClick={() => onDeleteTalim(talim.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <table className="w-full border border-slate-200">
            <thead>
                <tr className="bg-slate-100 text-left">
                    <th className="p-3">कर्मचारी</th>
                    <th className="p-3">तालिम</th>
                    <th className="p-3">मिति</th>
                    <th className="p-3">कार्य</th>
                </tr>
            </thead>
            <tbody>
                {karmachariTalimRecords.map(r => (
                    <tr key={r.id} className="border-t border-slate-200">
                        <td className="p-3">{getUserName(r.userId)}</td>
                        <td className="p-3">{getTalimName(r.talimId)}</td>
                        <td className="p-3">{r.fromDate} - {r.toDate} ({r.location})</td>
                        <td className="p-3">
                            <button onClick={() => onDeleteKarmachariTalimRecord(r.id)} className="text-red-500"><Trash2 size={16} /></button>
                        </td>
                    </tr>
                ))}
            </tbody>
          </table>
      </div>

      <div className="p-4 border rounded">
          <h3 className="font-bold mb-4">कर्मचारी तालिम विवरण</h3>
          <div className="flex gap-4">
              <select value={selectedFilterTalimId} onChange={(e) => setSelectedFilterTalimId(e.target.value)} className="border p-2 rounded mb-4 w-64">
                  <option value="">तालिम छान्नुहोस्</option>
                  {talimEntries.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input placeholder="कर्मचारी खोज्नुहोस्..." value={karmachariFilter} onChange={(e) => setKarmachariFilter(e.target.value)} className="border p-2 rounded mb-4" />
          </div>
          
          {selectedFilterTalimId ? (
            <table className="w-full border border-slate-200">
                <thead>
                    <tr className="bg-slate-100 text-left">
                        <th className="p-3">कर्मचारी</th>
                        <th className="p-3">स्थिति</th>
                        <th className="p-3">विवरण (मिति)</th>
                    </tr>
                </thead>
                <tbody>
                    {employeeTrainingStatus.map(({ user, hasTaken, fromDate, toDate, location }) => (
                        <tr key={user.id} className="border-t border-slate-200">
                            <td className="p-3">{user.fullName}</td>
                            <td className="p-3">
                                <span className={`px-2 py-1 rounded text-xs ${hasTaken ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {hasTaken ? 'लिएको' : 'नलिएको'}
                                </span>
                            </td>
                            <td className="p-3">
                                {hasTaken ? `${fromDate} - ${toDate} (${location})` : '-'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          ) : (
            <p className="text-slate-500">कृपया विवरण हेर्न तालिम छान्नुहोस्।</p>
          )}
      </div>
    </div>
  );
};
