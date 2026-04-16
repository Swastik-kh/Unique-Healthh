

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom'; // Import createPortal
import { ChevronDown, Search, X } from 'lucide-react';
// Corrected import path for Option
import { Option } from '../types/coreTypes';

interface SearchableSelectProps {
  label?: string;
  options: Option[];
  value: string; // The currently selected/typed value (usually Option.value)
  onChange: (value: string) => void; // Called when input text changes OR an option is selected
  onSelect?: (option: Option) => void; // Called when an option is selected from the dropdown
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  icon?: React.ReactNode;
  id?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  options,
  value,
  onChange,
  onSelect,
  placeholder,
  className = '',
  disabled = false,
  required = false,
  icon,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null); // Ref for the dropdown list

  // State to store dropdown position
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.value.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.label.localeCompare(b.label)); // Sort alphabetically
  }, [options, searchTerm]);

  // Sync internal searchTerm with external value prop
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // Recalculate dropdown position when opened or window resized/scrolled
  const updateDropdownPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      // Calculate width: Ensure minimum width for readability especially on mobile
      let width = rect.width;
      const minWidth = 300; // Minimum width to show item details clearly
      
      if (width < minWidth) {
          width = minWidth;
      }
      
      // Constrain width to viewport width minus padding
      if (width > viewportWidth - 20) {
          width = viewportWidth - 20;
      }

      let left = rect.left;
      
      // Adjust left position if dropdown overflows right edge of screen
      if (left + width > viewportWidth) {
          left = Math.max(10, viewportWidth - width - 10);
      }

      setDropdownPosition({
        top: rect.bottom + 5, // 5px buffer (relative to viewport for fixed position)
        left: left,     // (relative to viewport for fixed position)
        width: width,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      window.addEventListener('resize', updateDropdownPosition);
      window.addEventListener('scroll', updateDropdownPosition, true); // Use true for capture phase to catch scroll events from any scrollable parent
    } else {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    }
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [isOpen, updateDropdownPosition]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && dropdownRef.current) {
      const list = dropdownRef.current;
      const item = list.children[highlightedIndex] as HTMLElement;
      if (item) {
        // Ensure the item is visible within the list's scrollable area
        const itemTop = item.offsetTop;
        const itemBottom = itemTop + item.offsetHeight;
        const listTop = list.scrollTop;
        const listBottom = listTop + list.clientHeight;

        if (itemTop < listTop) {
          list.scrollTop = itemTop;
        } else if (itemBottom > listBottom) {
          list.scrollTop = itemBottom - list.clientHeight;
        }
      }
    }
  }, [highlightedIndex, isOpen]);


  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        // Also check if click is inside the portal dropdown
        if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
            return;
        }
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    onChange(newSearchTerm); // Notify parent of text change
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleOptionClick = (option: Option) => {
    setSearchTerm(option.value);
    onChange(option.value); // Notify parent of selected value
    if (onSelect) {
      onSelect(option); // Notify parent with full option object
    }
    setIsOpen(false);
    inputRef.current?.focus(); // Keep focus on input after selection
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && ['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
        setIsOpen(true);
        if (filteredOptions.length > 0) {
            setHighlightedIndex(e.key === 'ArrowDown' ? 0 : filteredOptions.length - 1);
        }
        e.preventDefault(); // Prevent cursor movement in input
        return;
    }

    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev === filteredOptions.length - 1 ? 0 : prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev <= 0 ? filteredOptions.length - 1 : prev - 1));
      } else if (e.key === 'Enter' || e.key === 'ArrowRight') { 
        // Select on Enter or ArrowRight as requested
        if (e.key === 'Enter') e.preventDefault();
        if (e.key === 'ArrowRight') {
             // Only prevent default if we actually select something, 
             // otherwise let cursor move if text box has more content? 
             // Requirement says "Right key ma pani select hos", so we prioritize selection if menu open.
             e.preventDefault(); 
        }

        if (highlightedIndex !== -1 && filteredOptions[highlightedIndex]) {
          handleOptionClick(filteredOptions[highlightedIndex]);
        } else {
            // If nothing highlighted, or Enter pressed on text, treat current input as selected
            const matchedOption = options.find(opt => opt.value.toLowerCase() === searchTerm.toLowerCase());
            if (matchedOption) {
                handleOptionClick(matchedOption);
            } else {
                setIsOpen(false); // Close dropdown if no match or just text entered
            }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
      } else if (e.key === 'Tab') {
          // Allow tab to select if highlighted, but let focus move
          if (highlightedIndex !== -1 && filteredOptions[highlightedIndex]) {
              handleOptionClick(filteredOptions[highlightedIndex]);
          }
          setIsOpen(false);
      }
    }
  };

  const handleFocus = () => {
    if (!disabled) {
        setIsOpen(true);
        // Do not reset highlighted index on simple focus so user can continue where they left off? 
        // Or reset? Resetting is safer to avoid confusion.
        setHighlightedIndex(-1); 
        updateDropdownPosition(); // Update position on focus
    }
  };

  const handleBlur = () => {
    // A small delay to allow click on option before closing
    setTimeout(() => {
      // Check if the focus moved to an element inside the wrapper (e.g., an option)
      // Note: Portal implies dropdownRef is separate from wrapperRef
      if (!wrapperRef.current?.contains(document.activeElement)) {
         // We can't easily check document.activeElement inside portal unless we forward refs differently or check portal containment manually via events
         // But handleOptionClick handles the click logic before this fires usually due to execution order
         setIsOpen(false);
      }
    }, 150);
  };

  const handleClear = useCallback(() => {
    setSearchTerm('');
    onChange('');
    if (onSelect) onSelect({id: '', value: '', label: ''}); // Clear with empty option
    inputRef.current?.focus();
    setIsOpen(true); // Re-open to show all options if desired
  }, [onChange, onSelect]);

  // Prevents blur from closing the dropdown prematurely when clicking on an option
  const handleDropdownMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // Important: prevents input blur
  };

  const inputId = id || `searchable-select-${Math.random().toString(36).substring(7)}`;

  return (
    <div className="flex flex-col gap-1.5 w-full relative" ref={wrapperRef}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 flex items-center gap-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative group"> {/* This div remains as the sizing context for the input */}
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors z-10 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off" // Disable browser autocomplete
          aria-autocomplete="list"
          aria-controls={`${inputId}-list`}
          className={`
            w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition-all
            placeholder:text-slate-400
            focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10
            disabled:cursor-not-allowed disabled:opacity-50
            ${icon ? 'pl-10' : ''}
            ${value ? 'pr-9' : 'pr-3'}
            ${className}
            ${disabled ? 'bg-slate-100' : 'border-slate-300 hover:border-slate-400'}
          `}
        />
        {!disabled && value && (
            <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full"
                title="Clear"
            >
                <X size={16} />
            </button>
        )}
        {(!value && !disabled) && (
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        )}
      </div>

      {isOpen && filteredOptions.length > 0 && inputRef.current && createPortal(
        <ul
          id={`${inputId}-list`}
          role="listbox"
          ref={dropdownRef} // Attach ref to the portal element
          className="bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto text-sm"
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 1000, // Ensure it's above everything else
          }}
          onMouseDown={handleDropdownMouseDown}
        >
          {filteredOptions.map((option, index) => (
            <li
              key={option.id}
              role="option"
              aria-selected={index === highlightedIndex}
              className={`
                px-4 py-2 cursor-pointer hover:bg-primary-50 hover:text-primary-800 border-b border-slate-50 last:border-none
                ${index === highlightedIndex ? 'bg-primary-50 text-primary-800' : 'text-slate-700'}
              `}
              onClick={() => handleOptionClick(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseLeave={() => setHighlightedIndex(-1)}
            >
              {option.label}
            </li>
          ))}
        </ul>,
        document.body // Render the dropdown directly into the body
      )}
    </div>
  );
};