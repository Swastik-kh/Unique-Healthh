
import React from 'react';
import { SelectProps, Option, FiscalYear } from '../types/coreTypes'; // Updated import
import { ChevronDown } from 'lucide-react';

export interface SelectExtendedProps extends SelectProps {
  onAddOptionHotkeyTriggered?: () => void;
  addOptionHotkey?: string; // e.g., 'Alt+c'
}

export const Select: React.FC<SelectExtendedProps> = ({ 
  label, 
  options, 
  error, 
  icon, 
  className = '', 
  id,
  onAddOptionHotkeyTriggered,
  addOptionHotkey,
  placeholder,
  helperText,
  ...props 
}) => {
  const selectId = id || props.name || 'select';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    // Check for hotkey if provided
    if (addOptionHotkey && onAddOptionHotkeyTriggered) {
      const keys = addOptionHotkey.toLowerCase().split('+');
      const isAlt = keys.includes('alt');
      const isCtrl = keys.includes('ctrl');
      const isShift = keys.includes('shift');
      const hotkeyChar = keys.find(k => k.length === 1); // Get the character part

      if (
        (isAlt === e.altKey) &&
        (isCtrl === e.ctrlKey) &&
        (isShift === e.shiftKey) &&
        (hotkeyChar === e.key.toLowerCase())
      ) {
        e.preventDefault(); // Prevent default select behavior
        e.stopPropagation(); // Stop event bubbling
        onAddOptionHotkeyTriggered();
        return; // Exit early if hotkey is handled
      }
    }
    // Call original onKeyDown if it exists
    if (props.onKeyDown) {
      props.onKeyDown(e);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label 
        htmlFor={selectId} 
        className="text-sm font-medium text-slate-700 flex items-center gap-2"
      >
        {label} {props.required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors z-10 pointer-events-none">
            {icon}
          </div>
        )}
        <select
          id={selectId}
          className={`
            w-full appearance-none rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition-all
            focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10
            disabled:cursor-not-allowed disabled:opacity-50
            font-nepali text-slate-700
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-300 hover:border-slate-400'}
            ${className}
          `}
          onKeyDown={handleKeyDown} // Add onKeyDown handler
          {...props}
          value={props.value || ''}
        >
          <option value="" disabled>-- {placeholder || 'छान्नुहोस्'} --</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <ChevronDown size={16} />
        </div>
      </div>
      {error && (
        <span className="text-xs text-red-500 font-medium">
          {error}
        </span>
      )}
      {helperText && !error && (
        <span className="text-[10px] text-slate-500 font-medium">
          {helperText}
        </span>
      )}
    </div>
  );
};