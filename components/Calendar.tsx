import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

interface CalendarProps {
    selectedDate: Date | null;
    onDateSelect: (date: Date) => void;
}

const Calendar: React.FC<CalendarProps> = ({ selectedDate, onDateSelect }) => {
    const [viewDate, setViewDate] = useState(selectedDate || new Date());

    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const lastDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay();

    const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const placeholders = Array.from({ length: startDayOfWeek });

    const changeMonth = (offset: number) => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
    };
    
    const isSameDay = (d1: Date | null, d2: Date | null) => {
        if (!d1 || !d2) return false;
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    }

    const today = new Date();

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-72" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800" aria-label="Previous month">
                    <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <div className="font-semibold text-sm text-gray-900">
                    {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </div>
                <button onClick={() => changeMonth(1)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800" aria-label="Next month">
                    <ChevronRightIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
                {daysOfWeek.map(day => <div key={day} className="font-semibold">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-sm">
                {placeholders.map((_, index) => <div key={`placeholder-${index}`} />)}
                {dates.map(date => {
                    const currentDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), date);
                    const isSelected = isSameDay(currentDate, selectedDate);
                    const isToday = isSameDay(currentDate, today);

                    let classes = "flex items-center justify-center h-8 w-8 rounded-full cursor-pointer transition-colors ";
                    if (isSelected) {
                        classes += "bg-blue-900 text-white font-semibold";
                    } else if (isToday) {
                        classes += "bg-gray-100 text-gray-800 font-semibold";
                    } else {
                        classes += "hover:bg-gray-100 text-gray-700";
                    }

                    return (
                        <div key={date} className={classes} onClick={() => onDateSelect(currentDate)}>
                            {date}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Calendar;