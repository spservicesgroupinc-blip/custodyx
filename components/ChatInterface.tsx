
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, Report, GeneratedReportData, UserProfile, IncidentTemplate, IncidentCategory, StoredDocument, DocumentFolder } from '../types';
import { getChatResponse, generateJsonReport, generateReportFromForm } from '../services/geminiService';
import { PaperAirplaneIcon, PaperClipIcon, SparklesIcon, UserCircleIcon, CalendarDaysIcon, CheckCircleIcon, TagIcon, TrashIcon, ClockIcon, ChatBubbleOvalLeftEllipsisIcon, XMarkIcon, PlusIcon } from './icons';
import Calendar from './Calendar';
import { INCIDENT_CATEGORIES } from '../constants';

interface ChatInterfaceProps {
    onReportGenerated: (report: Report) => void;
    userProfile: UserProfile | null;
    initialDate?: Date | null;
    templates: IncidentTemplate[];
    onAddTemplate: (template: IncidentTemplate) => void;
    onDeleteTemplate: (templateId: string) => void;
    onNavToTimeline: () => void;
    isOffline: boolean;
    onConsumeTokens: (cost: number) => boolean;
    onAddDocument: (document: StoredDocument) => void;
}

const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });

// --- SUB-COMPONENTS ---

// 1. Standard Form Component
const IncidentForm: React.FC<{
    userProfile: UserProfile | null;
    initialDate: Date | null;
    uploadedFiles: { name: string; type: string; data: string }[];
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onGenerate: (data: GeneratedReportData, date: Date) => void;
    isOffline: boolean;
    onConsumeTokens: (cost: number) => boolean;
}> = ({ userProfile, initialDate, uploadedFiles, onFileChange, onGenerate, isOffline, onConsumeTokens }) => {
    // Form State
    const [date, setDate] = useState<string>(initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState<string>(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    const [category, setCategory] = useState<string>(IncidentCategory.OTHER);
    const [people, setPeople] = useState<Set<string>>(new Set(['Mother', 'Father']));
    const [otherPerson, setOtherPerson] = useState('');
    const [description, setDescription] = useState('');
    const [impact, setImpact] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const togglePerson = (person: string) => {
        setPeople(prev => {
            const newSet = new Set(prev);
            if (newSet.has(person)) newSet.delete(person);
            else newSet.add(person);
            return newSet;
        });
    };

    const handleManualSave = () => {
        if (!description.trim()) {
            alert("Please describe the event.");
            return;
        }

        const dateTime = new Date(`${date}T${time}`);
        const peopleList = Array.from(people);
        if (otherPerson.trim()) peopleList.push(otherPerson.trim());

        // Construct standardized Markdown content manually
        let content = `### Summary of Events:
${description}

### Behavior of Parties:
**Present:** ${peopleList.join(', ')}
${description}

### Impact or Outcome:
${impact || "No specific impact recorded."}

### Notes or Context:
Logged manually via standard form.`;

        // If evidence is attached, append list to report content
        if (uploadedFiles.length > 0) {
            content += `\n\n### Attached Evidence:\n`;
            uploadedFiles.forEach(f => {
                content += `- ${f.name} (Stored in Document Library)\n`;
            });
        }

        const reportData: GeneratedReportData = {
            content,
            category: category as IncidentCategory,
            tags: [category, 'Manual Entry'],
            legalContext: ''
        };

        onGenerate(reportData, dateTime);
    };

    const handleAiRefine = async () => {
        if (!description.trim()) {
            alert("Please describe the event first.");
            return;
        }
        
        // Check tokens before processing
        if (!onConsumeTokens(1)) return;

        setIsProcessing(true);
        const dateTime = new Date(`${date}T${time}`);
        const peopleList: string[] = Array.from(people);
        if (otherPerson.trim()) peopleList.push(otherPerson.trim());

        const formData = {
            category,
            date: dateTime.toLocaleString(),
            description,
            impact,
            people: peopleList
        };

        try {
            const reportData = await generateReportFromForm(formData, userProfile);
            if (reportData) {
                // If evidence is attached, append list to report content (AI might miss this context)
                if (uploadedFiles.length > 0) {
                    reportData.content += `\n\n### Attached Evidence:\n`;
                    uploadedFiles.forEach(f => {
                        reportData.content += `- ${f.name} (Stored in Document Library)\n`;
                    });
                }
                onGenerate(reportData, dateTime);
            } else {
                alert("AI could not generate the report. Saving manually instead.");
                handleManualSave();
            }
        } catch (e) {
            console.error(e);
            alert("Error connecting to AI. Saving manually.");
            handleManualSave();
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                        <div className="flex gap-2">
                            <input 
                                type="date" 
                                value={date} 
                                onChange={e => setDate(e.target.value)} 
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            <input 
                                type="time" 
                                value={time} 
                                onChange={e => setTime(e.target.value)} 
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select 
                            value={category} 
                            onChange={e => setCategory(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            {INCIDENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Who was involved?</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {['Mother', 'Father', 'Child'].map(p => (
                            <button 
                                key={p} 
                                onClick={() => togglePerson(p)}
                                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${people.has(p) ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    <input 
                        type="text" 
                        placeholder="Other (e.g., Grandparent)" 
                        value={otherPerson}
                        onChange={e => setOtherPerson(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What Happened? (Facts Only)</label>
                <textarea 
                    rows={6} 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe the events objectively. Who did what? What was said?"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Impact or Outcome (Optional)</label>
                <textarea 
                    rows={2} 
                    value={impact}
                    onChange={e => setImpact(e.target.value)}
                    placeholder="E.g., Child was upset, visitation was missed, police were called."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Evidence (Screenshots, Photos)</label>
                <p className="text-xs text-gray-500 mb-2">Files uploaded here are automatically saved to your secure Document Library.</p>
                <input type="file" multiple accept="image/*,application/pdf" onChange={onFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                {uploadedFiles.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">Attached: {uploadedFiles.map(f => f.name).join(', ')}</div>
                )}
            </div>

            <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3 justify-end">
                <button
                    onClick={handleManualSave}
                    disabled={isProcessing}
                    className="px-6 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-md border border-gray-300 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                    Save Log
                </button>
                <button
                    onClick={handleAiRefine}
                    disabled={isProcessing || isOffline}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-900 text-white font-semibold rounded-md shadow hover:bg-blue-800 disabled:bg-blue-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    title={isOffline ? "AI unavailable offline" : "AI will reformat your notes into a formal report (1 Token)"}
                >
                    <SparklesIcon className="w-5 h-5" />
                    {isProcessing ? 'Refining...' : 'Refine & Save with AI'}
                </button>
            </div>
        </div>
    );
};

// 2. Legacy Chat Component (Simplified integration)
const LegacyChatMode: React.FC<{
    userProfile: UserProfile | null;
    isOffline: boolean;
    onReportGenerated: (report: Report) => void;
    uploadedFiles: { name: string; type: string; data: string }[];
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    initialDate: Date | null;
    onConsumeTokens: (cost: number) => boolean;
}> = ({ userProfile, isOffline, onReportGenerated, uploadedFiles, onFileChange, initialDate, onConsumeTokens }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', content: "Hello, I'm here to help you document a co-parenting incident. To start, please describe what happened." }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;
        
        // Chatting costs tokens too? Let's say chat is free but generation costs. 
        // Or small cost. Let's make chat free for now to encourage use, generation costs.
        // Actually, let's charge 1 token per response to be strict as requested.
        if (!onConsumeTokens(1)) return;

        const newMsg: ChatMessage = { role: 'user', content: input, images: uploadedFiles.map(f => ({ mimeType: f.type, data: f.data })) };
        setMessages(p => [...p, newMsg]);
        setInput('');
        setIsLoading(true);
        try {
            const response = await getChatResponse([...messages, newMsg], userProfile);
            setMessages(p => [...p, { role: 'model', content: response }]);
        } catch(e) { console.error(e); } finally { setIsLoading(false); }
    };

    const handleGenerate = async () => {
        if (!onConsumeTokens(5)) return; // Generation costs more

        setIsLoading(true);
        const data = await generateJsonReport(messages, userProfile);
        if (data) {
            // Append file info to content
            if (uploadedFiles.length > 0) {
                data.content += `\n\n### Attached Evidence:\n`;
                uploadedFiles.forEach(f => {
                    data.content += `- ${f.name} (Stored in Document Library)\n`;
                });
            }

            const report: Report = {
                ...data,
                id: `rep_${Date.now()}`,
                createdAt: (initialDate || new Date()).toISOString(),
                images: [], // Images are now in Document Library
                legalContext: data.legalContext || ''
            };
            onReportGenerated(report);
        }
        setIsLoading(false);
    };

    return (
        <div className="flex flex-col h-[600px]">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 border rounded-lg mb-4">
                {messages.map((m, i) => (
                    <div key={i} className={`p-3 rounded-lg text-sm max-w-[80%] ${m.role === 'user' ? 'bg-blue-100 ml-auto' : 'bg-white border'}`}>{m.content}</div>
                ))}
                <div ref={messagesEndRef}></div>
            </div>
            <div className="flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)} className="flex-1 p-2 border rounded-md" placeholder="Type here..." disabled={isOffline} onKeyDown={e => e.key === 'Enter' && handleSend()}/>
                <button onClick={handleSend} disabled={isLoading} className="p-2 bg-blue-600 text-white rounded-md"><PaperAirplaneIcon className="w-5 h-5"/></button>
            </div>
            <div className="mt-4 flex justify-between items-center">
                 <div>
                    <p className="text-xs text-gray-500 mb-1">Attach Evidence (Auto-saved to Library):</p>
                    <input type="file" multiple onChange={onFileChange} className="text-xs"/>
                 </div>
                 <button onClick={handleGenerate} disabled={messages.length < 2} className="px-4 py-2 bg-green-600 text-white text-sm rounded-md font-semibold">Generate Report (5 Tokens)</button>
            </div>
        </div>
    );
};


// --- MAIN COMPONENT ---

const IncidentLogger: React.FC<ChatInterfaceProps> = ({ onReportGenerated, userProfile, initialDate, templates, onAddTemplate, onDeleteTemplate, onNavToTimeline, isOffline, onConsumeTokens, onAddDocument }) => {
    const [mode, setMode] = useState<'form' | 'chat'>('form');
    const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string; data: string }[]>([]);
    const [lastGeneratedReport, setLastGeneratedReport] = useState<Report | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const files = Array.from(event.target.files);
            const processedFiles = await Promise.all(
                files.map(async (file: File) => ({
                    name: file.name,
                    type: file.type,
                    data: await fileToBase64(file),
                }))
            );
            setUploadedFiles(prev => [...prev, ...processedFiles]);
        }
    };

    const handleReportComplete = (data: GeneratedReportData, date: Date) => {
        // 1. Upload files as StoredDocuments first
        if (uploadedFiles.length > 0) {
            uploadedFiles.forEach(file => {
                const newDoc: StoredDocument = {
                    id: `doc_evidence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: file.name,
                    mimeType: file.type,
                    data: file.data, // Base64 data
                    createdAt: new Date().toISOString(),
                    folder: DocumentFolder.USER_UPLOADS
                };
                onAddDocument(newDoc);
            });
        }

        // 2. Create the Report object (without heavy images array)
        const newReport: Report = {
            ...data,
            id: `rep_${Date.now()}`,
            createdAt: date.toISOString(),
            images: [], // Clear images array to keep report JSON light
            legalContext: data.legalContext || ''
        };
        
        onReportGenerated(newReport);
        setLastGeneratedReport(newReport);
        setUploadedFiles([]); // Clear state
    };

    if (lastGeneratedReport) {
        return (
            <div className="flex flex-col h-full bg-white sm:border sm:border-gray-200 sm:rounded-lg sm:shadow-sm items-center justify-center text-center p-6">
                <CheckCircleIcon className="w-20 h-20 text-green-500" />
                <h1 className="text-2xl font-bold text-gray-900 mt-4">Incident Logged</h1>
                <p className="mt-2 text-gray-600 max-w-md">Your report has been saved to the timeline. Any attached evidence has been securely stored in your Document Library.</p>
                <div className="mt-8 flex gap-4">
                    <button onClick={() => { setLastGeneratedReport(null); setUploadedFiles([]); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Log Another</button>
                    <button onClick={onNavToTimeline} className="px-4 py-2 text-sm font-semibold text-white bg-blue-950 rounded-md shadow-sm hover:bg-blue-800">View Timeline</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white sm:border sm:border-gray-200 sm:rounded-lg sm:shadow-sm">
            <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                        {mode === 'form' ? 'Log New Incident' : 'AI Documentation Assistant'}
                    </h1>
                    <p className="text-sm text-gray-600">
                        {mode === 'form' ? 'Fill out the details below to create a record.' : 'Chat with AI to capture details.'}
                    </p>
                </div>
                <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                    <button 
                        onClick={() => setMode('form')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'form' ? 'bg-blue-100 text-blue-800' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Standard Form
                    </button>
                    <button 
                        onClick={() => setMode('chat')}
                        disabled={isOffline}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1 ${mode === 'chat' ? 'bg-blue-100 text-blue-800' : 'text-gray-500 hover:text-gray-900 disabled:opacity-50'}`}
                    >
                        <SparklesIcon className="w-3 h-3"/> AI Interview
                    </button>
                </div>
            </div>

            <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
                {mode === 'form' ? (
                    <IncidentForm 
                        userProfile={userProfile} 
                        initialDate={initialDate || null} 
                        uploadedFiles={uploadedFiles}
                        onFileChange={handleFileChange}
                        onGenerate={handleReportComplete}
                        isOffline={isOffline}
                        onConsumeTokens={onConsumeTokens}
                    />
                ) : (
                    <LegacyChatMode 
                        userProfile={userProfile}
                        isOffline={isOffline}
                        onReportGenerated={(report) => {
                            // Wrapper to route through file handler
                            handleReportComplete(report, new Date(report.createdAt));
                        }}
                        uploadedFiles={uploadedFiles}
                        onFileChange={handleFileChange}
                        initialDate={initialDate || null}
                        onConsumeTokens={onConsumeTokens}
                    />
                )}
            </div>
        </div>
    );
};

export default IncidentLogger;
