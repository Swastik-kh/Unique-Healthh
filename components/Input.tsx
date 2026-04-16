
import React, { forwardRef } from 'react';
import { InputProps } from '../types/coreTypes'; // Updated import

export const Input = forwardRef<HTMLInputElement, InputProps>(({ 
  label, 
  error, 
  icon, 
  helperText,
  className = '', 
  id,
  ...props 
}, ref) => {
  const inputId = id || props.name || 'input';

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label 
        htmlFor={inputId} 
        className="text-sm font-medium text-slate-700 flex items-center gap-2"
      >
        {label} {props.required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full rounded-lg border bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all
            placeholder:text-slate-400
            focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10
            disabled:cursor-not-allowed disabled:opacity-50
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-300 hover:border-slate-400'}
            ${className}
          `}
          {...props}
          value={props.value || ''}
        />
      </div>
      {error && (
        <span className="text-xs text-red-500 font-medium animate-pulse">
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
});

Input.displayName = 'Input';