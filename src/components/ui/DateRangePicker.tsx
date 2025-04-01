"use client"

import { useState, useEffect } from 'react'

interface DateRange {
  from?: Date | undefined
  to?: Date | undefined
}

interface DateRangePickerProps {
  initialDateRange?: DateRange
  onRangeChange: (range: DateRange) => void
  minDate?: Date
}

// Format date in a simple way without using date-fns
function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return date.toLocaleDateString(undefined, options);
}

// Format date to yyyy-MM-dd for form values
function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DateRangePicker({ 
  initialDateRange, 
  onRangeChange, 
  minDate = new Date() 
}: DateRangePickerProps) {
  const [range, setRange] = useState<DateRange>(initialDateRange || { from: undefined, to: undefined });
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Initialize with passed values if available
  useEffect(() => {
    if (initialDateRange) {
      setRange(initialDateRange);
      if (initialDateRange.from) {
        setStartDate(formatDateToYYYYMMDD(initialDateRange.from));
      }
      if (initialDateRange.to) {
        setEndDate(formatDateToYYYYMMDD(initialDateRange.to));
      }
    }
  }, [initialDateRange]);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);
    
    const from = newStartDate ? new Date(newStartDate) : undefined;
    const updatedRange = { ...range, from };
    
    setRange(updatedRange);
    onRangeChange(updatedRange);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    setEndDate(newEndDate);
    
    const to = newEndDate ? new Date(newEndDate) : undefined;
    const updatedRange = { ...range, to };
    
    setRange(updatedRange);
    onRangeChange(updatedRange);
  };

  // Format minimum date for the input field
  const minDateFormatted = formatDateToYYYYMMDD(minDate);

  return (
    <div className="border rounded-md p-4 bg-background">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Check-in Date
          </label>
          <input
            type="date"
            value={startDate}
            min={minDateFormatted}
            onChange={handleStartDateChange}
            className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Check-out Date
          </label>
          <input
            type="date"
            value={endDate}
            min={startDate || minDateFormatted}
            onChange={handleEndDateChange}
            className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
      </div>
      
      <div className="p-3 text-sm mt-4">
        {range?.from ? (
          range.to ? (
            <p>
              <span className="font-medium">Check-in:</span> {formatDate(range.from)} 
              <br/>
              <span className="font-medium">Check-out:</span> {formatDate(range.to)}
            </p>
          ) : (
            <p><span className="font-medium">Check-in:</span> {formatDate(range.from)}</p>
          )
        ) : (
          <p>Please select a date range for your stay</p>
        )}
      </div>
    </div>
  );
}
