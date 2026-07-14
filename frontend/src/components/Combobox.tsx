import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: (string | Option)[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  allowCustomValue?: boolean;
  error?: string;
  className?: string;
}

export const Combobox: React.FC<ComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  allowCustomValue = false,
  error,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize options to Option[]
  const normalizedOptions: Option[] = options.map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  // Synchronize searchVal with external value when it changes or dropdown opens
  useEffect(() => {
    const matched = normalizedOptions.find(o => o.value === value);
    setSearchVal(matched ? matched.label : value);
  }, [value, options]);

  // Filter options based on searchVal
  const filteredOptions = normalizedOptions.filter(opt =>
    opt.label.toLowerCase().includes(searchVal.toLowerCase())
  );

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        handleBlurValidation();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchVal, value, options]);

  const handleBlurValidation = () => {
    if (allowCustomValue) {
      onChange(searchVal);
    } else {
      // Find case-insensitive match
      const matched = normalizedOptions.find(
        o => o.label.toLowerCase() === searchVal.toLowerCase()
      );
      if (matched) {
        onChange(matched.value);
        setSearchVal(matched.label);
      } else {
        // Revert to current value
        const currentMatched = normalizedOptions.find(o => o.value === value);
        setSearchVal(currentMatched ? currentMatched.label : '');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        e.preventDefault();
        break;
      case 'ArrowUp':
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        e.preventDefault();
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const selected = filteredOptions[highlightedIndex];
          onChange(selected.value);
          setSearchVal(selected.label);
          setIsOpen(false);
        } else if (allowCustomValue) {
          onChange(searchVal);
          setIsOpen(false);
        } else {
          // If no matches, revert
          handleBlurValidation();
          setIsOpen(false);
        }
        e.preventDefault();
        break;
      case 'Escape':
        setIsOpen(false);
        handleBlurValidation();
        inputRef.current?.blur();
        e.preventDefault();
        break;
      case 'Tab':
        setIsOpen(false);
        handleBlurValidation();
        break;
      default:
        break;
    }
  };

  const handleOptionClick = (opt: Option) => {
    onChange(opt.value);
    setSearchVal(opt.label);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          placeholder={placeholder}
          value={searchVal}
          onChange={e => {
            setSearchVal(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full bg-surface-container-lowest border rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
            error ? 'border-error' : 'border-outline hover:border-outline-focus'
          } transition-all text-on-surface`}
        />
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-secondary hover:text-primary transition-colors focus:outline-none"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-surface-container border border-outline-variant rounded-lg shadow-lg z-50 py-1"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => (
              <div
                key={opt.value}
                role="option"
                aria-selected={value === opt.value}
                onClick={() => handleOptionClick(opt)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                  idx === highlightedIndex
                    ? 'bg-primary/10 text-primary font-semibold'
                    : value === opt.value
                    ? 'bg-primary/5 text-primary font-medium'
                    : 'text-on-surface hover:bg-surface-container-high'
                }`}
              >
                {opt.label}
              </div>
            ))
          ) : (
            <div className="px-4 py-2.5 text-xs text-secondary italic">
              {options.length === 0
                ? 'No options available yet'
                : allowCustomValue
                ? 'Press Enter to use custom value'
                : 'No matches found'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
