
import React, { useState, useRef, useEffect } from 'react';
import { Report, UserProfile, StoredDocument, StructuredLegalDocument, DocumentFolder } from '../types';
import { getLegalAssistantResponse, getInitialLegalAnalysis, analyzeDocument, redraftDocument } from '../services/geminiService';
import { PaperAirplaneIcon, SparklesIcon, UserCircleIcon, DocumentTextIcon, LightBulbIcon, XMarkIcon, ScaleIcon } from './icons';
import MotionPreviewModal from './MotionPreviewModal';
import ReactMarkdown from 'react-markdown';

interface LegalMessage {
    role: 'user' | 'model';
    content: string;
    document?: {
        title: string;
        data: StructuredLegalDocument;
    };
    sources?: any[];
}

interface AnalyzedDocInfo {
    fileData: string;
    mimeType: string;
    analysisMessageId: number;
}

interface LegalAssistantProps {
    reports: Report[];
    documents: StoredDocument[];
    userProfile: UserProfile | null;
    activeReportContext: Report | null;
    clearActiveReportContext: () => void;
    initialQuery: string | null;
    clearInitialQuery: () => void;
    activeAnalysisContext: string | null;
    clearActiveAnalysisContext: () => void;
    onAddDocument: (document: StoredDocument) => void;
    isOffline: boolean;
    onConsumeTokens: (cost: number) => boolean;
}

const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });

const documentToPlainText = (doc: StructuredLegalDocument | null): string => {
    if (!doc) return "";
    let text = `${doc.title}\n\n`;
    if (doc.subtitle) text += `${doc.subtitle}\n\n`;
    text += `Date: ${doc.metadata.date}\n`;
    if(doc.metadata.clientName) text += `Client: ${doc.metadata.clientName}\n`;
    if(doc.metadata.caseNumber) text += `Case No.: ${doc.metadata.caseNumber}\n\n`;
    if(doc.preamble) text += `${doc.preamble}\n\n`;
    doc.sections.forEach(s => {
        text += `${s.heading}\n\n${s.body}\n\n`;
    });
    if(doc.closing) text += `${doc.closing}\n\n`;
    if(doc.notes) text += `Notes: ${doc.notes}\n`;
    return text;
};

const LegalAssistant: React.FC<LegalAssistantProps> = ({ reports, documents, userProfile, activeReportContext, clearActiveReportContext, initialQuery, clearInitialQuery, activeAnalysisContext, clearActiveAnalysisContext, onAddDocument, isOffline, onConsumeTokens }) => {
    const [messages, setMessages] = useState<LegalMessage[]>(() => {
        const initialContent = reports.length > 0
            ? "Hello, you can ask me questions about your logged incidents or uploaded documents. For example: 'When did communication issues occur?' or 'Draft a motion about the missed visitation.'"
            : "Hello, you can ask me general questions about Indiana family law or ask me to draft a legal document. I can also analyze a legal document if you upload one.";
        return [{ role: 'model', content: initialContent }];
    });
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; document: StructuredLegalDocument } | null>(null);
    const [analyzedDocInfo, setAnalyzedDocInfo] = useState<AnalyzedDocInfo | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isLoading || isOffline) return; 

        const sendInitialQuery = async (query: string) => {
            // Cost: 1 Token for initial query processing (treated as chat message)
            if (!onConsumeTokens(1)) return;

            const userMessage: LegalMessage = { role: 'user', content: query };
            setMessages(prev => [...prev, userMessage]);
            setIsLoading(true);

            try {
                const response = await getLegalAssistantResponse(reports, documents, query, userProfile, activeAnalysisContext);
                const modelMessage: LegalMessage = { role: 'model', content: response.content, sources: response.sources };
                if (response.type === 'document' && response.title && response.documentText) {
                    modelMessage.document = { title: response.title, data: response.documentText };
                    // Save document
                    const plainText = documentToPlainText(response.documentText);
                    const newDoc: StoredDocument = {
                        id: `doc_draft_${Date.now()}`,
                        name: `${response.title}.txt`,
                        mimeType: 'text/plain',
                        data: btoa(unescape(encodeURIComponent(plainText))),
                        createdAt: new Date().toISOString(),
                        folder: DocumentFolder.DRAFTED_MOTIONS,
                        structuredData: response.documentText,
                    };
                    onAddDocument(newDoc);
                }
                setMessages(prev => [...prev, modelMessage]);
            } catch (error) {
                console.error("Failed to run initial query", error);
                setMessages(prev => [...prev, { role: 'model', content: "Sorry, an error occurred." }]);
            } finally {
                setIsLoading(false);
                clearInitialQuery();
                clearActiveAnalysisContext();
            }
        };

        if (activeReportContext) {
            const runAnalysis = async () => {
                // Cost: 5 Tokens for initial analysis of incident
                if (!onConsumeTokens(5)) return;

                setIsLoading(true);
                try {
                    const response = await getInitialLegalAnalysis(activeReportContext, reports, userProfile);
                    const analysisMessage: LegalMessage = {
                        role: 'model',
                        content: response.content,
                        sources: response.sources,
                    };
                    setMessages(prev => [...prev, analysisMessage]);
                } catch (error) {
                    console.error("Failed to run initial analysis", error);
                    setMessages(prev => [...prev, {
                        role: 'model',
                        content: "Sorry, an error occurred during analysis. How can I help with this incident?"
                    }]);
                } finally {
                    setIsLoading(false);
                    clearActiveReportContext();
                }
            };
    
            runAnalysis();
        } else if (initialQuery) {
            sendInitialQuery(initialQuery);
        }

    }, [activeReportContext, reports, documents, userProfile, clearActiveReportContext, initialQuery, clearInitialQuery, activeAnalysisContext, onAddDocument, clearActiveAnalysisContext, isLoading, isOffline, onConsumeTokens]);


    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        // Cost: 1 Token for chat
        if (!onConsumeTokens(1)) return;

        setAnalyzedDocInfo(null);
        const userMessage: LegalMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            const response = await getLegalAssistantResponse(reports, documents, currentInput, userProfile, activeAnalysisContext);
            
            const modelMessage: LegalMessage = {
                role: 'model',
                content: response.content,
                sources: response.sources
            };

            if (response.type === 'document' && response.title && response.documentText) {
                modelMessage.document = {
                    title: response.title,
                    data: response.documentText
                };
                 // Save document
                const plainText = documentToPlainText(response.documentText);
                const newDoc: StoredDocument = {
                    id: `doc_draft_${Date.now()}`,
                    name: `${response.title}.txt`,
                    mimeType: 'text/plain',
                    data: btoa(unescape(encodeURIComponent(plainText))),
                    createdAt: new Date().toISOString(),
                    folder: DocumentFolder.DRAFTED_MOTIONS,
                    structuredData: response.documentText,
                };
                onAddDocument(newDoc);
            }
            
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', content: "Sorry, an error occurred." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert("Invalid file type. Please upload a PDF document.");
            return;
        }

        // Cost: 5 Tokens for Document Analysis
        if (!onConsumeTokens(5)) {
            // Reset file input if tokens failed
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setIsLoading(true);
        setAnalyzedDocInfo(null);

        try {
            const base64Data = await fileToBase64(file);
            const userMessage: LegalMessage = { role: 'user', content: `Please analyze the document: ${file.name}` };
            setMessages(prev => [...prev, userMessage]);

            const analysis = await analyzeDocument(base64Data, file.type, userProfile);
            const modelMessage: LegalMessage = { role: 'model', content: analysis };
            
            setMessages(prev => {
                const newMessages = [...prev, modelMessage];
                const analysisMessageId = newMessages.length - 1;
                setAnalyzedDocInfo({
                    fileData: base64Data,
                    mimeType: file.type,
                    analysisMessageId: analysisMessageId,
                });
                return newMessages;
            });

        } catch (err) {
            console.error("Error during document analysis:", err);
            const errorMessage: LegalMessage = { role: 'model', content: "Sorry, an error occurred while processing your document." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleRedraftRequest = async () => {
        if (!analyzedDocInfo || isLoading) return;

        // Cost: 5 Tokens for Redrafting
        if (!onConsumeTokens(5)) return;

        setIsLoading(true);
        const { fileData, mimeType, analysisMessageId } = analyzedDocInfo;
        const analysisText = messages[analysisMessageId].content;
        setAnalyzedDocInfo(null); // Button should disappear once clicked

        try {
            const redraftedDocument = await redraftDocument(fileData, mimeType, analysisText, userProfile);
            if(redraftedDocument){
                const modelMessage: LegalMessage = {
                    role: 'model',
                    content: "I have redrafted the document with the suggested improvements. You can preview the new version.",
                    document: {
                        title: "DRAFT: Redrafted Document",
                        data: redraftedDocument,
                    }
                };
                setMessages(prev => [...prev, modelMessage]);

                 // Save document
                const plainText = documentToPlainText(redraftedDocument);
                const newDoc: StoredDocument = {
                    id: `doc_redraft_${Date.now()}`,
                    name: `${redraftedDocument.title}.txt`,
                    mimeType: 'text/plain',
                    data: btoa(unescape(encodeURIComponent(plainText))),
                    createdAt: new Date().toISOString(),
                    folder: DocumentFolder.DRAFTED_MOTIONS,
                    structuredData: redraftedDocument,
                };
                onAddDocument(newDoc);

            } else {
                 throw new Error("Redrafted document was null");
            }
        } catch (err) {
            console.error("Error during document redraft:", err);
            const errorMessage: LegalMessage = { role: 'model', content: "Sorry, an error occurred while redrafting your document." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <MotionPreviewModal
                isOpen={!!modalContent}
                onClose={() => setModalContent(null)}
                title={modalContent?.title || ''}
                document={modalContent?.document || null}
            />
            <div className="space-y-6 flex flex-col h-full">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Legal Assistant</h1>
                    <p className="mt-2 text-base text-gray-600 max-w-3xl">Ask questions or request to draft legal documents based on your reports. This AI assistant will not provide legal advice.</p>
                </div>
                
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <ScaleIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-semibold text-amber-900">Disclaimer</h3>
                        <p className="text-sm text-amber-800 mt-1">
                            The AI Legal Assistant is a tool for organizing information, not a substitute for a lawyer. It cannot provide legal advice. Always consult with a qualified attorney for legal matters.
                        </p>
                    </div>
                </div>

                 {activeAnalysisContext && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <LightBulbIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-semibold text-amber-900">Working with Deep Analysis Context</h3>
                                <p className="text-sm text-amber-800 mt-1">
                                    The AI is using the generated deep analysis to inform its responses. This context will be used for all subsequent messages in this session.
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={clearActiveAnalysisContext} 
                            className="p-1.5 text-amber-500 hover:text-amber-800 rounded-full hover:bg-amber-100 flex-shrink-0"
                            aria-label="Clear deep analysis context"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h2 className="text-lg font-semibold text-gray-800">Document Analysis</h2>
                    <p className="text-sm text-gray-600 mt-1">Upload a legal document (PDF) for the AI to review for errors and potential improvements.</p>
                    <div className="mt-3">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept="application/pdf"
                            disabled={isLoading || isOffline}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading || isOffline}
                            className="flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-950 rounded-md shadow-sm hover:bg-blue-800 disabled:bg-blue-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                            title={isOffline ? "Document analysis is disabled while offline." : ""}
                        >
                            <DocumentTextIcon className="w-5 h-5 mr-2" />
                            {isLoading ? 'Processing...' : 'Upload & Analyze PDF (5 Tokens)'}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col flex-1 min-h-0 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="space-y-6">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                    {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-5 h-5 text-gray-500"/></div>}
                                    <div className={`max-w-xl px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-950 text-white rounded-br-lg' : 'bg-gray-100 text-gray-900 rounded-bl-lg'}`}>
                                        <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-2 prose-li:my-0.5">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <h5 className="text-xs font-semibold text-gray-600 mb-1.5">Sources</h5>
                                                <ul className="space-y-1">
                                                    {msg.sources.map((source, idx) => (
                                                        <li key={idx} className="text-xs truncate">
                                                            <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                                                                {source.web.title || source.web.uri}
                                                            </a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {msg.document && (
                                            <div className="mt-3">
                                                <button
                                                    onClick={() => setModalContent({ title: msg.document!.title, document: msg.document!.data })}
                                                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm font-semibold text-blue-900 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                >
                                                    <DocumentTextIcon className="w-5 h-5 flex-shrink-0" />
                                                    <span>Preview Document</span>
                                                </button>
                                            </div>
                                        )}
                                        {analyzedDocInfo?.analysisMessageId === index && (
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <button
                                                    onClick={handleRedraftRequest}
                                                    disabled={isLoading || isOffline}
                                                    className="flex items-center justify-center gap-2 w-full text-left px-3 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300 disabled:cursor-not-allowed"
                                                    title={isOffline ? "Redrafting is disabled while offline." : "Cost: 5 Tokens"}
                                                >
                                                    <SparklesIcon className="w-5 h-5 flex-shrink-0" />
                                                    <span>Redraft with Improvements</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0"><UserCircleIcon className="w-6 h-6 text-gray-500"/></div>}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-5 h-5 text-gray-500"/></div>
                                    <div className="max-w-lg px-4 py-3 rounded-2xl bg-gray-100 text-gray-800 rounded-bl-lg">
                                        <div className="flex items-center space-x-1">
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-0"></span>
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></span>
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-4 bg-white border-t border-gray-200 rounded-b-lg">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder={isOffline ? "You are offline. AI assistant is unavailable." : "Ask a question (1 Token) or request a document..."}
                                className="w-full pl-4 pr-12 py-3 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 disabled:bg-gray-100"
                                disabled={isOffline}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <button onClick={handleSendMessage} disabled={isLoading || !input.trim() || isOffline} className="p-2 text-white bg-blue-950 rounded-full hover:bg-blue-800 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors" aria-label="Send message">
                                    <PaperAirplaneIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LegalAssistant;
