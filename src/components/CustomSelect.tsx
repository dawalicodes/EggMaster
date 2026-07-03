import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface CustomSelectProps {
  value: string | number;
  onChange: (e: any) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function CustomSelect({ value, onChange, children, className = '', disabled = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options: { value: string; label: React.ReactNode }[] = [];
  React.Children.toArray(children).forEach((child) => {
    if (React.isValidElement(child) && child.type === 'option') {
      options.push({
        value: child.props.value !== undefined ? String(child.props.value) : String(child.props.children),
        label: child.props.children
      });
    }
  });

  const selectedOption = options.find(o => o.value === String(value));

  return (
    <div 
      className={`relative cursor-pointer select-none focus:outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`} 
      ref={containerRef}
      onClick={() => {
        if (!disabled) setIsOpen(!isOpen);
      }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!disabled) setIsOpen(!isOpen);
        }
      }}
    >
      <div className="flex items-center justify-between w-full h-full pointer-events-none">
        <span className="truncate pr-2">
          {selectedOption ? selectedOption.label : 'Select...'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div 
          className="absolute z-[100] w-full min-w-[120px] top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto cursor-default text-left font-sans text-slate-800"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the dropdown container itself (except on options)
        >
          {options.length === 0 ? (
             <div className="px-3 py-2 text-xs text-slate-400 italic">No options available</div>
          ) : (
            options.map((option, idx) => (
              <div
                key={`${option.value}-${idx}`}
                className={`px-3 py-2 text-xs cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 transition-colors select-none ${String(value) === option.value ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({ target: { value: option.value } });
                  setIsOpen(false);
                }}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
