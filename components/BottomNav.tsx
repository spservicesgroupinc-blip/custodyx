
import React from 'react';
import { HomeIcon, CalendarDaysIcon, PlusIcon, ChatBubbleOvalLeftEllipsisIcon, MenuIcon } from './icons';
import { View } from '../types';

interface BottomNavProps {
    activeView: View;
    onViewChange: (view: View) => void;
    onMenuClick: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeView, onViewChange, onMenuClick }) => {
    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center h-16 px-2 relative">
                {/* Home */}
                <button
                    onClick={() => onViewChange('dashboard')}
                    className={`flex-1 flex flex-col items-center justify-center py-1 touch-manipulation ${activeView === 'dashboard' ? 'text-blue-900' : 'text-gray-400'}`}
                >
                    <HomeIcon className="w-6 h-6" />
                    <span className="text-[10px] font-medium mt-1">Home</span>
                </button>

                {/* Calendar */}
                <button
                    onClick={() => onViewChange('calendar')}
                    className={`flex-1 flex flex-col items-center justify-center py-1 touch-manipulation ${activeView === 'calendar' ? 'text-blue-900' : 'text-gray-400'}`}
                >
                    <CalendarDaysIcon className="w-6 h-6" />
                    <span className="text-[10px] font-medium mt-1">Calendar</span>
                </button>

                {/* New Report (Floating FAB) */}
                <div className="w-16 relative flex justify-center">
                    <button
                        onClick={() => onViewChange('new_report')}
                        className="absolute -top-6 bg-blue-900 text-white w-14 h-14 rounded-full shadow-lg shadow-blue-900/30 flex items-center justify-center transform active:scale-95 transition-transform border-4 border-gray-100 touch-manipulation"
                        aria-label="New Report"
                    >
                        <PlusIcon className="w-8 h-8" />
                    </button>
                </div>

                {/* Messages */}
                <button
                    onClick={() => onViewChange('messaging')}
                    className={`flex-1 flex flex-col items-center justify-center py-1 touch-manipulation ${activeView === 'messaging' ? 'text-blue-900' : 'text-gray-400'}`}
                >
                    <ChatBubbleOvalLeftEllipsisIcon className="w-6 h-6" />
                    <span className="text-[10px] font-medium mt-1">Chat</span>
                </button>

                {/* Menu */}
                <button
                    onClick={onMenuClick}
                    className="flex-1 flex flex-col items-center justify-center py-1 text-gray-400 touch-manipulation"
                >
                    <MenuIcon className="w-6 h-6" />
                    <span className="text-[10px] font-medium mt-1">Menu</span>
                </button>
            </div>
        </div>
    );
};

export default BottomNav;
