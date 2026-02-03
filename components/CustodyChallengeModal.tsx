
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, ChatMessage, StructuredLegalDocument, DocumentFolder, StoredDocument } from '../types';
import { getCustodyChallengeResponse, generateImbalanceReport } from '../services/geminiService';
import { ShieldCheckIcon, PaperAirplaneIcon, SparklesIcon, XMarkIcon, DocumentTextIcon } from './icons';
import ReactMarkdown from 'react-markdown';

interface CustodyChallengeModalProps {
    isOpen: boolean;
    onClose: () => void; // Only allowed if they abandon or after report is generated
    onReportGenerated: (report: StoredDocument) => void;
    userProfile: UserProfile | null;
    imbalancePercentage: number;
}

const CustodyChallengeModal: React.FC<CustodyChallengeModalProps> = ({ isOpen, onClose, onReportGenerated, userProfile, imbalancePercentage }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isReportReady, setIsReportReady] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Provocation
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            const initialMsg = `WARNING: The schedule you are attempting to create allocates only **${imbalancePercentage.toFixed(1)}%** of overnights to one parent.
            
Clinical research indicates that parenting time below 35% significantly damages the parent-child attachment bond and can lead to long-term psychological harm.

I am the Child Advocacy Guardian. Before you can proceed with this schedule, you must explain: **Why are you proposing an arrangement that limits the child's access to a parent?**`;
            
            setMessages([{ role: 'model', content: initialMsg }]);
        }
    }, [isOpen, imbalancePercentage]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Check if we should trigger report generation (after ~3 turns or if AI suggests it)
            // For simplicity, we trigger report generation button availability after 2 user responses
            const userResponseCount = messages.filter(m => m.role === 'user').length + 1;
            
            const response = await getCustodyChallengeResponse([...messages, userMsg], userProfile);
            setMessages(prev => [...prev, { role: 'model', content: response }]);

            if (userResponseCount >= 2) {
                setIsReportReady(true);
            }

        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateRiskReport = async () => {
        setIsLoading(true);
        try {
            const report = await generateImbalanceReport(messages, userProfile);
            if (report) {
                // Convert to StoredDocument
                const plainText = JSON.stringify(report, null, 2); // Or format nicely
                const newDoc: StoredDocument = {
                    id: `doc_risk_${Date.now()}`,
                    name: `Risk Assessment - ${new Date().toISOString().split('T')[0]}.txt`,
                    mimeType: 'text/plain', // Using text/plain for simplicity here, ideally structured
                    data: btoa(unescape(encodeURIComponent(JSON.stringify(report, null, 2)))),
                    createdAt: new Date().toISOString(),
                    folder: DocumentFolder.RISK_ASSESSMENTS,
                    structuredData: report
                };
                
                onReportGenerated(newDoc);
                // Allow user to proceed (close modal)
                onClose();
            }
        } catch (e) {
            console.error("Failed to generate report", e);
            alert("Error generating report. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-red-900/90 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border-4 border-red-600">
                <header className="bg-red-600 text-white p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <ShieldCheckIcon className="w-8 h-8 text-white animate-pulse" />
                        <div>
                            <h2 className="text-xl font-bold uppercase tracking-wide">Bond Protection Alert</h2>
                            <p className="text-xs text-red-100 font-medium">Critical Imbalance Detected ({imbalancePercentage.toFixed(1)}%)</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-red-700 rounded-full transition-colors" title="Cancel and go back">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-xl shadow-sm text-sm ${
                                msg.role === 'user' 
                                    ? 'bg-white border border-gray-200 text-gray-800 rounded-br-none' 
                                    : 'bg-red-50 border border-red-100 text-red-900 rounded-bl-none'
                            }`}>
                                {msg.role === 'model' && <strong className="block mb-1 text-red-700 text-xs uppercase font-bold">AI Guardian</strong>}
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-gray-200">
                    {isReportReady ? (
                        <div className="space-y-3">
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                                <strong>Dialogue Complete.</strong> The AI has analyzed your justifications. You must generate the "Risk Assessment Report" to proceed. This report will document the potential harm of this schedule.
                            </div>
                            <button 
                                onClick={handleGenerateRiskReport} 
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md transition-all"
                            >
                                {isLoading ? (
                                    <span>Generating Analysis...</span>
                                ) : (
                                    <>
                                        <DocumentTextIcon className="w-5 h-5" />
                                        Generate Harm Assessment Report & Proceed
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Explain why this schedule is necessary..."
                                className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                                disabled={isLoading}
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={!input.trim() || isLoading}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:bg-gray-300 transition-colors"
                            >
                                <PaperAirplaneIcon className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustodyChallengeModal;
