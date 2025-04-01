import React from 'react';

interface DateDisplayProps {
  date?: Date;
  format?: string;
  fallback?: string;
}

function formatDate(date: Date, format: string): string {
  if (format === 'yyyy-MM-dd') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  if (format === 'MMM dd, yyyy') {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return date.toLocaleDateString(undefined, options);
  }
  
  return date.toISOString();
}

const DateDisplay: React.FC<DateDisplayProps> = ({ date, format = 'MMM dd, yyyy', fallback = 'Select date' }) => {
  const dateString = date ? formatDate(date, format) : fallback;
  return <p className="text-sm text-muted-foreground">{dateString}</p>;
};

export default DateDisplay;
