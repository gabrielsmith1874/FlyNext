"use client"
import React from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

// Helper function to check same day
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

interface CustomDatePickerProps {
  selectedRange: DateRange | undefined;
  onSelect: (range: DateRange | undefined) => void;
  disabledDays?: Date[];
  guestCount?: number;
  isRoomAvailable?: (date: Date, guestCount: number) => boolean;
  rooms?: { maxGuests: number }[];
}

export function CustomDatePicker({ selectedRange, onSelect, disabledDays = [], guestCount, isRoomAvailable, rooms }: CustomDatePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const availableFn = (day: Date) => {
    // Disable past dates and days specified in disabledDays
    if (day < today) return false;
    if (disabledDays.some(d => isSameDay(d, day))) return false;
    // Use provided callback if available
    if (isRoomAvailable) return isRoomAvailable(day, guestCount || 1);
    // If rooms exist, only enable the day if any room can accommodate the guest count
    if (rooms && rooms.length > 0) {
      return rooms.some(room => room.maxGuests >= (guestCount || 1));
    }
    return true;
  }

  const modifiers = {
    available: availableFn,
    unavailable: (day: Date) => !availableFn(day)
  }

  return (
    <div className="bg-card dark:bg-card p-4 rounded-md mx-auto max-w-md">
      <DayPicker
        mode="range"
        selected={selectedRange}
        onSelect={onSelect}
        // Disable day if it is not available based on guest count and room availability
        disabled={(day) => !availableFn(day)}
        modifiers={modifiers}
        modifiersStyles={{
          available: { color: '#22c55e', background: 'transparent' },
          unavailable: { color: 'grey', background: 'transparent' }
        }}
        style={{
          '--rdp-accent-color': '#22c55e', // Change accent color to green
          '--rdp-selected-bg': '#15803d',  // Change selected background to green
          '--rdp-nav-button-color': '#22c55e', // Change navigation button color to green
          '--rdp-nav-button-hover-color': '#15803d' // Change hover color to darker green
        } as React.CSSProperties}
      />
    </div>
  )
}
