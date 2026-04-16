import React, { useState, useRef, useEffect } from 'react';
import { Save, X, Plus } from 'lucide-react';
import { Input } from './Input'; // Assuming you have a generic Input component

interface AddOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newValue: string) => void;
  title: string;
  label: string;
  placeholder: string;
}

export const AddOptionModal: React.FC<AddOptionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  label,
  placeholder,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue(''); // Clear input on open
      setError(null);
      // Focus on the input when the modal opens
      setTimeout(() => inputRef.current?.focus(), 100); 
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!inputValue.trim()) {
      setError('यो खाली हुन सक्दैन (Cannot be empty)');
      return;
    }
    onSave(inputValue.trim());
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-primary-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-primary-100 p-2 rounded-lg text-primary-600">
              <Plus size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg font-nepali">{title}</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <Input
            ref={inputRef}
            label={label}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (error) setError(null); // Clear error on change
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            required
            error={error}
          />
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
          >
            रद्द गर्नुहोस् (Cancel)
          </button>
          <button 
            type="button" 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Save size={16} /> बचत गर्नुहोस् (Save)
          </button>
        </div>
      </div>
    </div>
  );
};