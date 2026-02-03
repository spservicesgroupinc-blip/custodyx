import React from 'react';
import { Report } from '../types';
import { ScaleIcon, LightBulbIcon } from './icons';

interface IncidentCardProps {
    report: Report;
    onDiscuss: (id: string) => void;
    onAnalyze: (id: string) => void;
    isSelected: boolean;
    onSelect: (id: string) => void;
}

const IncidentCard: React.FC<IncidentCardProps> = ({ report, onDiscuss, onAnalyze, isSelected, onSelect }) => {
    return (
        <div className={`relative bg-white border rounded-lg p-6 transition-all duration-200 shadow-sm ${isSelected ? 'border-blue-500 shadow-md ring-2 ring-blue-500/50' : 'border-gray-200 hover:shadow-md hover:border-gray-300'}`}>
            <div className="absolute top-4 right-4 no-print">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelect(report.id)}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    aria-label={`Select incident from ${new Date(report.createdAt).toLocaleString()}`}
                />
            </div>
            <div className="flex justify-between items-start mb-4 pr-8">
                <div>
                    <p className="text-xs font-medium text-blue-800 bg-blue-100 px-3 py-1 rounded-full inline-block">{report.category}</p>
                </div>
                 <p className="text-sm text-gray-500 mt-0.5">{new Date(report.createdAt).toLocaleString()}</p>
            </div>
             <div className="prose prose-sm prose-slate max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                 {report.content.split('\n').map((line, index) => {
                     if (line.startsWith('### ')) {
                         return <h3 key={index} className="font-semibold text-gray-800 mt-5 mb-1.5 text-base">{line.substring(4)}</h3>
                     }
                     return <p key={index} className="my-1.5">{line}</p>
                 })}
             </div>
            {report.legalContext && (
                <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-start">
                        <ScaleIcon className="w-5 h-5 text-amber-700 flex-shrink-0 mr-3 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-semibold text-amber-900">Legal Context Note</h4>
                            <p className="text-sm text-amber-800 mt-1">{report.legalContext}</p>
                        </div>
                    </div>
                </div>
            )}
            {report.tags.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                    {report.tags.map((tag, index) => (
                        <span key={index} className="text-xs font-medium text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}
             <div className="mt-6 pt-5 border-t border-gray-200 flex justify-end gap-3 no-print">
                 <button
                    onClick={() => onAnalyze(report.id)}
                    title={"Generate Deep Analysis"}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-amber-900 bg-amber-100 rounded-md hover:bg-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-500 transition-all"
                >
                    <LightBulbIcon className="w-4 h-4" />
                    Incident Analysis
                </button>
                <button
                    onClick={() => onDiscuss(report.id)}
                    title={"Discuss with AI"}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-blue-900 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 transition-all"
                >
                    <ScaleIcon className="w-4 h-4" />
                    Discuss with AI
                </button>
            </div>
        </div>
    )
}

export default IncidentCard;
