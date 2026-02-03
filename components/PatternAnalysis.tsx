
import React, { useState, useEffect } from 'react';
import { Report, Theme, IncidentCategory, UserProfile, StoredDocument, DocumentFolder, MessagingAnalysisReport } from '../types';
import { getThemeAnalysis, generateDeepMessagingAnalysis } from '../services/geminiService';
import { ChartBarIcon, MagnifyingGlassIcon, SparklesIcon, XMarkIcon, DocumentTextIcon, CheckCircleIcon } from './icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { INCIDENT_CATEGORIES } from '../constants';

interface PatternAnalysisProps {
    reports: Report[];
    documents: StoredDocument[];
    userProfile: UserProfile | null;
    isOffline: boolean;
    onConsumeTokens: (cost: number) => boolean;
}

type AnalysisMode = 'reports' | 'messages';

const ReportAnalyzer: React.FC<{ reports: Report[]; isOffline: boolean; }> = ({ reports, isOffline }) => {
    const [selectedCategory, setSelectedCategory] = useState<IncidentCategory | 'all'>('all');
    const [themes, setThemes] = useState<Theme[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const incidentCategories = INCIDENT_CATEGORIES;

    useEffect(() => {
        const analyzeThemes = async () => {
            if (selectedCategory === 'all' || isOffline) {
                setThemes([]);
                return;
            }
            const filteredReports = reports.filter(r => r.category === selectedCategory);
            // Unlocked for testing: Lowered threshold to 1
            if (filteredReports.length < 1) {
                setThemes([]);
                setError("You need at least one report in a category to analyze patterns.");
                return;
            }

            setIsLoading(true);
            setError(null);
            try {
                const result = await getThemeAnalysis(filteredReports, selectedCategory);
                setThemes(result);
            } catch (err) {
                setError("An error occurred while analyzing themes.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        analyzeThemes();
    }, [selectedCategory, reports, isOffline]);
    
    const categoryCounts = incidentCategories.reduce((acc, category) => {
        acc[category] = reports.filter(r => r.category === category).length;
        return acc;
    }, {} as Record<IncidentCategory, number>);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {incidentCategories.map(category => (
                     <div key={category} className={`p-4 rounded-lg border bg-white ${selectedCategory === category ? 'border-blue-300 ring-2 ring-blue-200' : 'border-gray-200'}`}>
                        <h3 className="font-semibold text-gray-800">{category}</h3>
                        <p className="text-3xl font-bold text-blue-950">{categoryCounts[category]}</p>
                        <p className="text-xs text-gray-500">Reports</p>
                    </div>
                ))}
            </div>

            <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Sub-Theme Analysis by Category</h2>
                <div className="mb-4">
                    <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-1">Select a category to analyze:</label>
                    <select
                        id="category-select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value as IncidentCategory | 'all')}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={isOffline}
                        title={isOffline ? "Pattern Analysis is disabled while offline." : ""}
                    >
                        <option value="all">-- Select a Category --</option>
                        {incidentCategories.map(cat => (
                            // Unlocked for testing: Lowered threshold to 1
                            <option key={cat} value={cat} disabled={categoryCounts[cat] < 1}>
                                {cat} ({categoryCounts[cat]} reports)
                            </option>
                        ))}
                    </select>
                </div>
                
                <div className="h-96 w-full mt-6 relative">
                   {isOffline && (
                        <div className="absolute inset-0 bg-gray-50/80 z-10 flex flex-col items-center justify-center text-center text-gray-600 p-4 rounded-md">
                            <ChartBarIcon className="w-12 h-12 text-gray-400 mb-3"/>
                            <p className="font-semibold">Feature Unavailable Offline</p>
                            <p className="text-sm">Connect to the internet to analyze patterns.</p>
                        </div>
                    )}
                   {isLoading ? (
                       <div className="flex items-center justify-center h-full">
                           <p className="text-gray-600">Analyzing patterns...</p>
                       </div>
                   ) : error ? (
                        <div className="flex items-center justify-center h-full text-center text-red-600 bg-red-50 p-4 rounded-md">
                           <p>{error}</p>
                       </div>
                   ) : themes.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={themes} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" name="Report Count" fill="#172554" />
                            </BarChart>
                        </ResponsiveContainer>
                   ) : (
                       <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 bg-gray-50 p-4 rounded-md">
                            <ChartBarIcon className="w-12 h-12 text-gray-400 mb-3"/>
                           <p className="font-semibold">No data to display.</p>
                           <p className="text-sm">Please select a category with at least 1 report to see an analysis.</p>
                       </div>
                   )}
                </div>
            </div>
        </div>
    );
};

const MessageAnalyzer: React.FC<{ documents: StoredDocument[]; userProfile: UserProfile | null; isOffline: boolean; onConsumeTokens: (cost: number) => boolean; }> = ({ documents, userProfile, isOffline, onConsumeTokens }) => {
    const [selectedDocId, setSelectedDocId] = useState<string>("");
    const [analysisResult, setAnalysisResult] = useState<MessagingAnalysisReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Filter documents that are text uploads (potential chat logs)
    const eligibleDocuments = documents.filter(d => d.folder === DocumentFolder.USER_UPLOADS && d.mimeType.startsWith('text/'));

    const handleAnalyze = async () => {
        if (!selectedDocId || isOffline) return;

        // Cost: 5 Tokens
        if (!onConsumeTokens(5)) return;

        const doc = documents.find(d => d.id === selectedDocId);
        if (!doc) return;

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            // Decode base64 content
            const content = decodeURIComponent(escape(atob(doc.data)));
            const result = await generateDeepMessagingAnalysis(content, userProfile);
            setAnalysisResult(result);
        } catch (e) {
            console.error("Failed to analyze messaging:", e);
            alert("Analysis failed. Please ensure the document is a valid text file.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Forensic Chat Analysis</h2>
                <p className="text-gray-600 mb-4 text-sm">Select an imported chat log from your Document Library to analyze patterns, conflict levels, and hidden dynamics.</p>
                
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="w-full sm:w-2/3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Chat Log</label>
                        <select 
                            value={selectedDocId} 
                            onChange={(e) => setSelectedDocId(e.target.value)}
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            disabled={isLoading || isOffline}
                        >
                            <option value="">-- Select a File --</option>
                            {eligibleDocuments.map(doc => (
                                <option key={doc.id} value={doc.id}>{doc.name} ({new Date(doc.createdAt).toLocaleDateString()})</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleAnalyze}
                        disabled={!selectedDocId || isLoading || isOffline}
                        className="w-full sm:w-auto px-6 py-2 text-sm font-semibold text-white bg-blue-900 rounded-md shadow-sm hover:bg-blue-800 disabled:bg-blue-300"
                    >
                        {isLoading ? 'Analyzing...' : 'Run Analysis (5 Tokens)'}
                    </button>
                </div>
            </div>

            {analysisResult && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
                    {/* Conflict Score Card */}
                    <div className="lg:col-span-1 bg-white p-6 border border-gray-200 rounded-lg shadow-sm text-center">
                         <h3 className="text-lg font-semibold text-gray-800">Conflict Meter</h3>
                         <div className="relative mt-6 mb-4 w-32 h-32 mx-auto rounded-full border-8 border-gray-100 flex items-center justify-center">
                             <span className={`text-4xl font-bold ${analysisResult.conflictScore > 6 ? 'text-red-600' : analysisResult.conflictScore > 3 ? 'text-amber-500' : 'text-green-600'}`}>
                                 {analysisResult.conflictScore}
                             </span>
                             <span className="text-xs text-gray-400 absolute -bottom-6">Scale 1-10</span>
                         </div>
                         <p className="text-sm text-gray-600 italic">"{analysisResult.conflictScoreReasoning}"</p>
                    </div>

                    {/* Dynamics Card */}
                    <div className="lg:col-span-2 bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Communication Dynamics</h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 uppercase">Initiator</p>
                                <p className="font-semibold text-gray-900 mt-1">{analysisResult.communicationDynamics.initiator}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 uppercase">Responsiveness</p>
                                <p className="font-semibold text-gray-900 mt-1">{analysisResult.communicationDynamics.responsiveness}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 uppercase">Tone</p>
                                <p className="font-semibold text-gray-900 mt-1">{analysisResult.communicationDynamics.tone}</p>
                            </div>
                        </div>
                        <div className="mt-6">
                            <h4 className="text-sm font-semibold text-gray-800 mb-2">Dominant Themes</h4>
                            <ul className="space-y-2">
                                {analysisResult.dominantThemes.map((theme, i) => (
                                    <li key={i} className="flex justify-between items-center p-2 bg-blue-50 rounded border border-blue-100">
                                        <span className="font-medium text-blue-900">{theme.theme}</span>
                                        <span className="text-xs bg-white px-2 py-1 rounded border border-blue-200 text-gray-600">{theme.frequency} Frequency</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Flagged Behaviors */}
                    <div className="lg:col-span-2 bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
                        <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                            <XMarkIcon className="w-5 h-5"/> Flagged Behaviors
                        </h3>
                        <div className="space-y-4">
                            {analysisResult.flaggedBehaviors.map((item, i) => (
                                <div key={i} className="border-l-4 border-red-500 pl-4 py-1">
                                    <p className="font-bold text-gray-800">{item.behavior}</p>
                                    <p className="text-sm text-gray-600 mt-1">"{item.example}"</p>
                                    <p className="text-xs text-red-600 mt-1 uppercase font-semibold">{item.impact}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Coaching */}
                    <div className="lg:col-span-1 bg-blue-900 p-6 border border-blue-800 rounded-lg shadow-sm text-white">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-yellow-400"/> Coaching Tips
                        </h3>
                        <ul className="space-y-4">
                            {analysisResult.actionableRecommendations.map((tip, i) => (
                                <li key={i} className="flex gap-3 text-sm text-blue-100">
                                    <CheckCircleIcon className="w-5 h-5 flex-shrink-0 text-green-400"/>
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

const PatternAnalysis: React.FC<PatternAnalysisProps> = ({ reports, documents, userProfile, isOffline, onConsumeTokens }) => {
    const [mode, setMode] = useState<AnalysisMode>('reports');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                     <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Pattern Analysis</h1>
                     <p className="mt-2 text-base text-gray-600">Visualize trends in incident reports and analyze communication dynamics.</p>
                </div>
                <div className="bg-gray-100 p-1 rounded-lg flex">
                    <button 
                        onClick={() => setMode('reports')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${mode === 'reports' ? 'bg-white shadow text-blue-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Incident Patterns
                    </button>
                    <button 
                        onClick={() => setMode('messages')}
                         className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${mode === 'messages' ? 'bg-white shadow text-blue-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Messaging Analysis
                    </button>
                </div>
            </div>

            {mode === 'reports' ? (
                <ReportAnalyzer reports={reports} isOffline={isOffline} />
            ) : (
                <MessageAnalyzer documents={documents} userProfile={userProfile} isOffline={isOffline} onConsumeTokens={onConsumeTokens} />
            )}
        </div>
    );
};

export default PatternAnalysis;
