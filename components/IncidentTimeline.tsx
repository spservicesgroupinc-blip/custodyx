import React from 'react';
import { Report } from '../types';
import { BookOpenIcon } from './icons';
import IncidentCard from './IncidentCard';

interface IncidentTimelineProps {
    reports: Report[];
    onDiscussIncident: (reportId: string) => void;
    onAnalyzeIncident: (reportId: string) => void;
    selectedReportIds: Set<string>;
    onToggleReportSelection: (reportId: string) => void;
}

const IncidentTimeline: React.FC<IncidentTimelineProps> = ({ reports, onDiscussIncident, onAnalyzeIncident, selectedReportIds, onToggleReportSelection }) => {
    if (reports.length === 0) {
        return (
            <div className="text-center py-24 bg-white border-2 border-dashed border-gray-300 rounded-lg">
                <BookOpenIcon className="mx-auto h-16 w-16 text-gray-300" />
                <h3 className="mt-4 text-xl font-semibold text-gray-900">No Incidents Logged</h3>
                <p className="mt-2 text-base text-gray-500 max-w-md mx-auto">
                    Click the 'New Report' button in the sidebar to start documenting your first incident.
                </p>
            </div>
        );
    }
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Incident Timeline</h1>
                <p className="mt-2 text-base text-gray-600">A chronological list of all documented incidents. Select incidents to build an evidence package.</p>
            </div>
            {reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(report => (
                <IncidentCard 
                    key={report.id} 
                    report={report} 
                    onDiscuss={onDiscussIncident} 
                    onAnalyze={onAnalyzeIncident}
                    isSelected={selectedReportIds.has(report.id)}
                    onSelect={onToggleReportSelection}
                />
            ))}
        </div>
    );
};

export default IncidentTimeline;
