
import React from 'react';
import { Report, UserProfile, IncidentCategory } from '../types';
import { PlusIcon, CalendarDaysIcon, BookOpenIcon, LightBulbIcon, ChatBubbleOvalLeftEllipsisIcon, ClockIcon } from './icons';

type View = 'dashboard' | 'timeline' | 'new_report' | 'patterns' | 'insights' | 'assistant' | 'profile' | 'documents' | 'calendar';

interface DashboardProps {
    userProfile: UserProfile | null;
    reports: Report[];
    onViewChange: (view: View) => void;
    onAnalyzeIncident: (reportId: string) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; description: string; }> = ({ title, value, icon, description }) => (
    <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="text-gray-400">{icon}</div>
        </div>
        <div className="mt-2">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{description}</p>
        </div>
    </div>
);

const ActionCard: React.FC<{ title: string; description: string; icon: React.ReactNode; onClick: () => void }> = ({ title, description, icon, onClick }) => (
    <button
        onClick={onClick}
        className="flex flex-col justify-between p-6 bg-white border border-gray-200 rounded-lg shadow-sm text-left hover:bg-blue-50 hover:border-blue-300 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 h-full"
    >
        <div>
            <div className="p-3 bg-blue-100 rounded-lg inline-block">
                {icon}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mt-4">{title}</h2>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
        <p className="text-sm font-semibold text-blue-700 mt-4">Continue &rarr;</p>
    </button>
);

const Dashboard: React.FC<DashboardProps> = ({ userProfile, reports, onViewChange, onAnalyzeIncident }) => {

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const incidentsThisMonth = reports.filter(r => new Date(r.createdAt) >= startOfMonth).length;

    const communicationIssues = reports.filter(r => r.category === IncidentCategory.COMMUNICATION_ISSUE).length;

    const last7Days = new Date();
    last7Days.setDate(today.getDate() - 7);
    const recentActivityCount = reports.filter(r => new Date(r.createdAt) >= last7Days).length;

    const sortedReports = [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const recentReports = sortedReports.slice(0, 3);

    const welcomeMessage = userProfile?.name ? `Blessings, ${userProfile.name}.` : 'Welcome to VerityNow.AI.';

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{welcomeMessage}</h1>
                <p className="mt-2 text-base text-gray-600">Your Sanctuary for peace and organization. "Let all things be done decently and in order." (1 Cor 14:40)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Logs" 
                    value={reports.length} 
                    icon={<BookOpenIcon className="w-6 h-6" />}
                    description="Recorded events" 
                />
                <StatCard 
                    title="Trials This Month" 
                    value={incidentsThisMonth} 
                    icon={<CalendarDaysIcon className="w-6 h-6" />}
                    description={`Since ${startOfMonth.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`} 
                />
                <StatCard 
                    title="Communication Strife" 
                    value={communicationIssues} 
                    icon={<ChatBubbleOvalLeftEllipsisIcon className="w-6 h-6" />}
                    description="Conflicts in speech"
                />
                <StatCard 
                    title="Recent Activity" 
                    value={recentActivityCount} 
                    icon={<ClockIcon className="w-6 h-6" />}
                    description="Logs in the last 7 days"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <ActionCard 
                    title="Log a Conflict"
                    description="Speak the truth in love. Document an incident with the AI's guidance."
                    icon={<PlusIcon className="w-7 h-7 text-blue-800"/>}
                    onClick={() => onViewChange('new_report')}
                 />
                 <ActionCard 
                    title="View Restoration Log"
                    description="Review your history and see the path to peace."
                    icon={<CalendarDaysIcon className="w-7 h-7 text-blue-800"/>}
                    onClick={() => onViewChange('timeline')}
                 />
            </div>

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                 <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800">Recent Logs</h2>
                        <p className="text-sm text-gray-600 mt-1">The last 3 records of your co-parenting journey.</p>
                    </div>
                     <button 
                        onClick={() => onViewChange('timeline')} 
                        className="text-sm font-semibold text-blue-800 hover:text-blue-600"
                    >
                        View Full Log &rarr;
                    </button>
                </div>
                {recentReports.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                        {recentReports.map(report => (
                            <li key={report.id} className="p-6">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <p className="text-xs font-medium text-blue-800 bg-blue-100 px-3 py-1 rounded-full inline-block">{report.category}</p>
                                        <p className="text-sm text-gray-500 mt-2">{new Date(report.createdAt).toLocaleString()}</p>
                                        <p className="text-sm text-gray-700 mt-2 max-w-xl">
                                            {report.content.split('### Summary of Events:')[1]?.split('\n')[1]?.trim() || report.content.split('\n')[0]}
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-end gap-2 ml-4 flex-shrink-0 mt-2 sm:mt-0">
                                        <button 
                                            onClick={() => onAnalyzeIncident(report.id)} 
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 rounded-md hover:bg-amber-200 transition-all"
                                        >
                                            <LightBulbIcon className="w-4 h-4"/>
                                            <span>Heart Inspection</span>
                                        </button>
                                        <button 
                                            onClick={() => onViewChange('timeline')} 
                                            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-all"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-16 px-6">
                         <BookOpenIcon className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-4 text-lg font-semibold text-gray-900">Peaceful Beginnings</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            "To everything there is a season..." Your logs will appear here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
