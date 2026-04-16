import React, { useState, useEffect } from 'react';
import { Input } from './Input';
import { NepaliDatePicker } from './NepaliDatePicker';
import { Chalani, User } from '../types/coreTypes';
import { Save, X } from 'lucide-react';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface ChalaniFormProps {
  onSave: (chalaniData: Omit<Chalani, 'id' | 'dispatchNumber' | 'fiscalYear'>) => void;
  onCancel: () => void;
  nextDispatchNumber: string;
  currentUser: User;
}

export const ChalaniForm: React.FC<ChalaniFormProps> = ({ onSave, onCancel, nextDispatchNumber, currentUser }) => {
  const getInitialFormData = () => {
    let today = '';
    try {
      today = new NepaliDate().format('YYYY-MM-DD');
    } catch (e) {}
    return {
      date: today,
      recipient: '',
      subject: '',
      sender: currentUser.fullName,
      remarks: '',
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setFormData(getInitialFormData()); // Reset for next entry
  };

  return (
    <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <label className="block text-sm font-bold text-slate-500 mb-1">चलानी नम्बर</label>
        <p className="font-black text-2xl text-primary-600">{nextDispatchNumber}</p>
      </div>
      <NepaliDatePicker
        label="मिति"
        value={formData.date}
        onChange={val => setFormData({ ...formData, date: val })}
        required
        disabled
      />
      <Input
        label="पाउने व्यक्ति/कार्यालय"
        value={formData.recipient}
        onChange={e => setFormData({ ...formData, recipient: e.target.value })}
        required
      />
      <Input
        label="बिषय"
        value={formData.subject}
        onChange={e => setFormData({ ...formData, subject: e.target.value })}
        required
      />
      <Input
        label="पठाउने व्यक्ति/शाखा"
        value={formData.sender}
        onChange={e => setFormData({ ...formData, sender: e.target.value })}
        required
        disabled
      />
      <div className="md:col-span-2">
        <label className="block text-sm font-bold text-slate-700 mb-1">कैफियत</label>
        <textarea
          value={formData.remarks}
          onChange={e => setFormData({ ...formData, remarks: e.target.value })}
          className="w-full p-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
          rows={4}
          placeholder="केहि भएमा उल्लेख गर्नुहोस्..."
        />
      </div>
      <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-6 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg shadow-sm transition-all active:scale-95 font-medium"
        >
          <X size={18} />
          <span>रद्द</span>
        </button>
        <button
          type="submit"
          className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg shadow-sm transition-all active:scale-95 font-medium"
        >
          <Save size={18} />
          <span>सुरक्षित गर्नुहोस्</span>
        </button>
      </div>
    </form>
  );
};
