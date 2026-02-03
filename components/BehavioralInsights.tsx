
import React, { useState, useEffect, useRef } from 'react';
import { Report, UserProfile, StoredDocument, DocumentFolder } from '../types';
import { getSingleIncidentAnalysis } from '../services/geminiService';
import { LightBulbIcon, ArrowLeftIcon, ScaleIcon } from './icons';
import ReactMarkdown from 'react-markdown';

interface DeepAnalysisProps {
    reports: Report[];
    userProfile: UserProfile | null;
    activeInsightContext: Report | null;
    onBackToTimeline: () => void;
    onGenerateDraft: (analysisText: string, motionType: string) => void;
    onAddDocument: (document: StoredDocument) => void;
    isOffline: boolean;
    onConsumeTokens: (cost: number) => boolean;
}

const DeepAnalysis: React.FC<DeepAnalysisProps> = ({ reports, userProfile, activeInsightContext, onBackToTimeline, onGenerateDraft, onAddDocument, isOffline, onConsumeTokens }) => {
    const [analysisResult, setAnalysisResult] = useState<{ analysis: string; sources: any[] } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recommendedMotion, setRecommendedMotion] = useState<string | null>(null);
    
    // Ref to track which report we have already analyzed (and charged for)
    const analyzedReportIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!activeInsightContext) {
            setAnalysisResult(null);
            setRecommendedMotion(null);
            analyzedReportIdRef.current = null;
            return;
        }

        // Prevent re-analysis and double charging for the same report ID
        if (analyzedReportIdRef.current === activeInsightContext.id) {
            return;
        }

        const fetchInsights = async () => {
            if (isOffline) {
                setError("Deep analysis requires an internet connection.");
                return;
            }

            // Cost: 5 Tokens
            if (!onConsumeTokens(5)) {
                setError("Insufficient tokens to perform Deep Analysis.");
                return;
            }

            // Mark as analyzed to prevent re-run
            analyzedReportIdRef.current = activeInsightContext.id;

            setIsLoading(true);
            setError(null);
            setRecommendedMotion(null);
            setAnalysisResult(null);
            try {
                const result = await getSingleIncidentAnalysis(activeInsightContext, reports, userProfile);
                setAnalysisResult(result);

                // Save the analysis to the document library
                const analysisText = result.analysis;
                const docName = `Forensic Analysis - ${new Date(activeInsightContext.createdAt).toLocaleDateString()}.md`;
                const newDoc: StoredDocument = {
                    id: `doc_analysis_${Date.now()}`,
                    name: docName,
                    mimeType: 'text/markdown',
                    // Correctly encode UTF-8 string to base64
                    data: btoa(unescape(encodeURIComponent(analysisText))),
                    createdAt: new Date().toISOString(),
                    folder: DocumentFolder.FORENSIC_ANALYSES,
                };
                onAddDocument(newDoc);

                // Parse for the recommended motion
                const lines = result.analysis.split('\n');
                const motionLine = lines.find(line => line.includes('Motion to') || line.includes('Motion for'));
                if (motionLine) {
                    const motionMatch = motionLine.match(/(Motion (to|for) [a-zA-Z\s]+)/);
                    if (motionMatch && motionMatch[0]) {
                        setRecommendedMotion(motionMatch[0].trim());
                    }
                }

            } catch (err) {
                setError('An error occurred while generating insights.');
                console.error(err);
                // Reset ref if failed so user can try again (though they might need to re-select)
                analyzedReportIdRef.current = null;
            } finally {
                setIsLoading(false);
            }
        };

        fetchInsights();
    }, [activeInsightContext, reports, userProfile, onAddDocument, isOffline, onConsumeTokens]);
    
    if (!activeInsightContext) {
        return (
            <div className="text-center py-24 bg-white border-2 border-dashed border-gray-300 rounded-lg h-full flex flex-col justify-center">
                <LightBulbIcon className="mx-auto h-16 w-16 text-gray-300" />
                <h3 className="mt-4 text-xl font-semibold text-gray-900">Deep Analysis</h3>
                <p className="mt-2 text-base text-gray-500 max-w-md mx-auto">
                    Select an incident from the "Incident Timeline" and click "Incident Analysis" to generate a deep analysis.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                 <button
                    onClick={onBackToTimeline}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Back to Timeline
                </button>
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                    Forensic Analysis for {new Date(activeInsightContext.createdAt).toLocaleDateString()}
                </h1>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <ScaleIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-sm font-semibold text-amber-900">For Informational Purposes Only</h3>
                    <p className="text-sm text-amber-800 mt-1">
                        This analysis is AI-generated and intended to identify patterns from the data you provide. It is not a psychological or legal evaluation and should not be used as a substitute for advice from a qualified professional.
                    </p>
                </div>
            </div>

            <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
                {isLoading ? (
                    <div className="text-center py-16">
                        <p className="text-gray-600">Generating deep analysis, this may take a moment...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-16 text-red-600 bg-red-50 p-4 rounded-md">
                        <p>{error}</p>
                    </div>
                ) : analysisResult ? (
                    <>
                        <div className="prose prose-slate max-w-none prose-h3:font-semibold prose-h3:text-gray-800 prose-h3:mt-6 prose-h3:mb-2 prose-strong:font-semibold">
                            <ReactMarkdown>{analysisResult.analysis}</ReactMarkdown>
                        </div>
                        
                        {analysisResult.sources && analysisResult.sources.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h4 className="text-base font-semibold text-gray-800 mb-3">Research Sources</h4>
                                <ul className="list-disc list-inside space-y-1.5">
                                    {analysisResult.sources.map((source, index) => (
                                        <li key={index} className="text-sm">
                                            <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-800 hover:underline">
                                                {source.web.title || source.web.uri}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {recommendedMotion && (
                             <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
                                 <button
                                     onClick={() => onGenerateDraft(analysisResult.analysis, recommendedMotion)}
                                     className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-900 rounded-md shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:-translate-y-0.5 disabled:bg-blue-300 disabled:cursor-not-allowed"
                                     disabled={isOffline}
                                     title={isOffline ? "Feature disabled while offline" : ""}
                                 >
                                     <ScaleIcon className="w-5 h-5" />
                                     Generate Draft: {recommendedMotion}
                                 </button>
                             </div>
                        )}
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default DeepAnalysis;
