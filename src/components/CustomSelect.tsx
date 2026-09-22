import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface CustomSelectProps {
  value: string | number;
  onChange: (e: any) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export default function CustomSelect({
  value,
  onChange,
  children,
  className = '',
  disabled = false,
  required = false,
  id
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleDismiss(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleDismiss);
    document.addEventListener('touchstart', handleDismiss, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleDismiss);
      document.removeEventListener('touchstart', handleDismiss);
    };
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
      id={id}
      className={`relative select-none focus:outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation'
      }}
    >
      {/* Mobile standard dropdown overlay: triggers native mobile select picker sheet without OS context menu */}
      <select
        value={String(value)}
        onChange={onChange}
        disabled={disabled}
        required={required}
        aria-label="Select option"
        className="sm:hidden absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
        onContextMenu={(e) => e.preventDefault()}
      >
        {options.map((opt, i) => (
          <option key={`${opt.value}-${i}`} value={opt.value}>
            {typeof opt.label === 'string' ? opt.label : String(opt.label || opt.value)}
          </option>
        ))}
      </select>

      {/* Visual Display for both Desktop and Mobile */}
      <div
        className="flex items-center justify-between w-full h-full pointer-events-auto sm:pointer-events-none"
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
        <span className="truncate pr-2">
          {selectedOption ? selectedOption.label : 'Select...'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Desktop/Tablet Custom Popover Dropdown */}
      {isOpen && (
        <div
          className="hidden sm:block absolute z-[100] w-full min-w-[140px] top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto cursor-default text-left font-sans text-slate-800"
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 italic">No options available</div>
          ) : (
            options.map((option, idx) => (
              <div
                key={`${option.value}-${idx}`}
                className={`px-3 py-2 text-xs cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 transition-colors select-none ${
                  String(value) === option.value ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700'
                }`}
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
