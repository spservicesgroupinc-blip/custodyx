import React from 'react';
import { XMarkIcon } from './icons';

interface ToastProps {
    show: boolean;
    message: string;
    type: 'info' | 'warning' | 'error';
    actionText?: string;
    onAction?: () => void;
    onClose?: () => void;
}

const Toast: React.FC<ToastProps> = ({ show, message, type, actionText, onAction, onClose }) => {
    if (!show) return null;

    // Changed animate-fade-in-up to animate-fade-in-up-centered to maintain centering behavior
    const baseClasses = "fixed bottom-6 left-1/2 flex items-center justify-between gap-4 w-full max-w-md p-4 rounded-lg shadow-2xl z-50 transition-all duration-300 transform animate-fade-in-up-centered no-print";
    const typeClasses = {
        info: 'bg-blue-900 text-white',
        warning: 'bg-amber-500 text-white',
        error: 'bg-red-600 text-white',
    };

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`}>
            <p className="text-sm font-medium">{message}</p>
            <div className="flex items-center gap-2">
                {actionText && onAction && (
                    <button onClick={onAction} className="px-3 py-1.5 text-xs font-bold uppercase rounded-md bg-white/20 hover:bg-white/30">
                        {actionText}
                    </button>
                )}
                {onClose && (
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/20" aria-label="Close">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default Toast;