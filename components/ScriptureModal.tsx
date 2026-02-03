
import React from 'react';
import { BookOpenIcon, XMarkIcon } from './icons';
import { BIBLICAL_QUOTES } from '../constants';

interface ScriptureModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ScriptureModal: React.FC<ScriptureModalProps> = ({ isOpen, onClose }) => {
    // Select a random scripture when the modal opens (or just render randomly each time)
    // Using simple random for now.
    const randomQuote = BIBLICAL_QUOTES[Math.floor(Math.random() * BIBLICAL_QUOTES.length)];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-blue-950/40 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border-2 border-amber-100 relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-amber-400 to-blue-500"></div>
                
                <button 
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>

                <div className="p-8 text-center">
                    <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                        <BookOpenIcon className="w-6 h-6 text-blue-800" />
                    </div>
                    
                    <h3 className="text-blue-900 font-bold uppercase tracking-widest text-xs mb-4">Wisdom from the Word</h3>
                    
                    <p className="text-xl md:text-2xl font-serif text-gray-800 leading-relaxed italic mb-6">
                        "{randomQuote.text}"
                    </p>
                    
                    <div className="inline-block border-t border-gray-200 pt-2">
                        <span className="text-sm font-bold text-amber-700">{randomQuote.verse}</span>
                    </div>
                </div>

                <div className="bg-gray-50 p-4 flex justify-center">
                    <button 
                        onClick={onClose}
                        className="text-sm font-semibold text-gray-600 hover:text-blue-800 transition-colors"
                    >
                        Amen, Let me Continue
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScriptureModal;
