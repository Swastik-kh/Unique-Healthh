import React from 'react';
import { Calendar } from 'lucide-react';

interface EnglishDatePickerProps {
  value: string; // Format: YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  className?: string; // To allow overriding styles
}

export const EnglishDatePicker: React.FC<EnglishDatePickerProps> = ({
  value,
  onChange,
  label = "मिति (Date)",
  required = false,
  className = ''
}) => {
  const inputId = `english-date-picker-${Math.random().toString(36).substring(7)}`;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 flex items-center gap-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors z-10 pointer-events-none">
          <Calendar size={16} />
        </div>
        <input
          id={inputId}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className={`
            w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition-all
            placeholder:text-slate-400
            focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10
            disabled:cursor-not-allowed disabled:opacity-50
            pl-10 pr-3
            border-slate-300 hover:border-slate-400
            ${className}
          `}
        />
      </div>
    </div>
  );
};