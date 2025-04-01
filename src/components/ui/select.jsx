import React, { useState, useRef, useEffect } from 'react';

export const Select = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  className = '',
  disabled = false,
  name = '',
  id = '',
  required = false,
  displayKey = 'label',
  valueKey = 'value',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const selectRef = useRef(null);

  // Set initial selected option based on value prop
  useEffect(() => {
    if (value) {
      const option = options.find(opt => 
        opt[valueKey] === value || opt === value
      );
      if (option) {
        setSelectedOption(option);
      }
    } else {
      setSelectedOption(null);
    }
  }, [value, options, valueKey]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (option) => {
    setSelectedOption(option);
    setIsOpen(false);
    
    // Call the onChange handler with the value
    if (onChange) {
      const valueToEmit = typeof option === 'object' ? option[valueKey] : option;
      onChange(valueToEmit);
    }
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  // Determine what to display in the select box
  const displayValue = selectedOption 
    ? (typeof selectedOption === 'object' ? selectedOption[displayKey] : selectedOption) 
    : placeholder;

  return (
    <div 
      className={`relative w-full ${className}`} 
      ref={selectRef}
    >
      <div
        className={`flex items-center justify-between w-full p-2 border rounded-md cursor-pointer bg-background ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={toggleDropdown}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
      >
        <span className={`${!selectedOption ? 'text-muted-foreground' : ''}`}>
          {displayValue}
        </span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
          <ul role="listbox">
            {options.length > 0 ? (
              options.map((option, index) => {
                const optionValue = typeof option === 'object' ? option[valueKey] : option;
                const optionLabel = typeof option === 'object' ? option[displayKey] : option;
                const isSelected = selectedOption === option || 
                  (selectedOption && typeof selectedOption === 'object' && 
                   typeof option === 'object' && 
                   selectedOption[valueKey] === option[valueKey]);
                
                return (
                  <li
                    key={index}
                    role="option"
                    aria-selected={isSelected}
                    className={`px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground ${
                      isSelected ? 'bg-primary text-primary-foreground' : ''
                    }`}
                    onClick={() => handleSelect(option)}
                  >
                    {optionLabel}
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-2 text-muted-foreground">No options available</li>
            )}
          </ul>
        </div>
      )}

      {/* Hidden input for form submission */}
      <input
        type="hidden"
        name={name}
        id={id}
        value={selectedOption ? (typeof selectedOption === 'object' ? selectedOption[valueKey] : selectedOption) : ''}
        required={required}
      />
    </div>
  );
};
