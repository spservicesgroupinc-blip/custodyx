
import React, { useState, useEffect } from 'react';
import { Report, StoredDocument, UserProfile, StructuredLegalDocument, DocumentFolder } from '../types';
import { generateEvidencePackage } from '../services/geminiService';
import { XMarkIcon, SparklesIcon, ClipboardDocumentIcon, CheckIcon, DocumentTextIcon, PrinterIcon, ArrowLeftIcon } from './icons';
import PdfPreview from './PdfPreview';

interface EvidencePackageBuilderProps {
    isOpen: boolean;
    onClose: () => void;
    selectedReports: Report[];
    allDocuments: StoredDocument[];
    userProfile: UserProfile | null;
    onPackageCreated: () => void;
    onAddDocument: (document: StoredDocument) => void;
    isOffline: boolean;
    onConsumeTokens: (cost: number) => boolean;
}

const documentToPlainText = (doc: StructuredLegalDocument | null): string => {
    if (!doc) return "";
    let text = `${doc.title}\n\n`;
    if (doc.subtitle) text += `${doc.subtitle}\n\n`;
    text += `Date: ${doc.metadata.date}\n`;
    if(doc.metadata.clientName) text += `Client: ${doc.metadata.clientName}\n`;
    if(doc.metadata.caseNumber) text += `Case No.: ${doc.metadata.caseNumber}\n\n`;
    if(doc.preamble) text += `${doc.preamble}\n\n`;
    doc.sections.forEach(s => {
        text += `\n\n--- ${s.heading} ---\n\n${s.body}\n\n`;
    });
    if(doc.closing) text += `${doc.closing}\n\n`;
    if(doc.notes) text += `Notes: ${doc.notes}\n`;
    return text;
};

const LoadingState: React.FC = () => {
    const messages = [
        "Analyzing behavioral patterns...",
        "Crafting legal arguments...",
        "Citing Indiana legal framework...",
        "Synthesizing evidence...",
        "Compiling formal declaration..."
    ];
    const [currentMessage, setCurrentMessage] = useState(messages[0]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentMessage(prev => {
                const currentIndex = messages.indexOf(prev);
                const nextIndex = (currentIndex + 1) % messages.length;
                return messages[nextIndex];
            });
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <SparklesIcon className="w-16 h-16 text-blue-500 animate-pulse" />
            <p className="mt-4 text-lg font-semibold text-gray-800 transition-opacity duration-500">{currentMessage}</p>
            <p className="mt-1 text-gray-600">The AI is building your impressive presentation. This may take a moment.</p>
        </div>
    );
};


const EvidencePackageBuilder: React.FC<EvidencePackageBuilderProps> = ({ isOpen, onClose, selectedReports, allDocuments, userProfile, onPackageCreated, onAddDocument, isOffline, onConsumeTokens }) => {
    const [step, setStep] = useState(1);
    const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set());
    const [packageObjective, setPackageObjective] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedPackage, setGeneratedPackage] = useState<StructuredLegalDocument | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Reset state when modal opens
            setStep(1);
            setSelectedDocumentIds(new Set());
            setGeneratedPackage(null);
            setPackageObjective('');
            setIsLoading(false);
            setIsCopied(false);
        }
    }, [isOpen]);
    
    if (!isOpen) return null;

    const handleToggleDocumentSelection = (docId: string) => {
        setSelectedDocumentIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(docId)) {
                newSet.delete(docId);
            } else {
                newSet.add(docId);
            }
            return newSet;
        });
    };

    const handleGeneratePackage = async () => {
        if (!packageObjective.trim()) {
            alert("Please provide a strategic objective.");
            return;
        }

        // Cost: 20 Tokens for Evidence Package
        if (!onConsumeTokens(20)) return;

        setIsLoading(true);
        const selectedDocuments = allDocuments.filter(doc => selectedDocumentIds.has(doc.id));
        try {
            const result = await generateEvidencePackage(selectedReports, selectedDocuments, userProfile, packageObjective);
            if (result) {
                setGeneratedPackage(result);
                // Save package to document library
                const plainText = documentToPlainText(result);
                const newDoc: StoredDocument = {
                    id: `doc_pkg_${Date.now()}`,
                    name: `${result.title}.txt`,
                    mimeType: 'text/plain',
                    data: btoa(unescape(encodeURIComponent(plainText))),
                    createdAt: new Date().toISOString(),
                    folder: DocumentFolder.EVIDENCE_PACKAGES,
                    structuredData: result,
                };
                onAddDocument(newDoc);
            } else {
                console.error("Package generation returned null");
                alert("Sorry, an error occurred while generating the package. Please try again.");
            }
        } catch (error) {
            console.error("Failed to generate package:", error);
            alert("Sorry, an error occurred while generating the package. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (generatedPackage) {
            const plainText = documentToPlainText(generatedPackage);
            navigator.clipboard.writeText(plainText);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-gray-200 no-print">
                     <div className="flex items-center gap-3">
                        {step > 1 && !generatedPackage && (
                            <button onClick={() => setStep(1)} className="p-1.5 rounded-full hover:bg-gray-100">
                                <ArrowLeftIcon className="w-5 h-5 text-gray-600"/>
                            </button>
                        )}
                        <h2 className="text-xl font-semibold text-gray-900">
                            {generatedPackage ? "Generated Presentation" : "Evidence Package Builder"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100" aria-label="Close modal">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                
                <main className="flex-1 p-6 overflow-y-auto bg-gray-100">
                    {isLoading && <LoadingState />}

                    {generatedPackage && !isLoading && (
                        <PdfPreview document={generatedPackage} />
                    )}

                    {!generatedPackage && !isLoading && step === 1 && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full bg-white p-6 rounded-lg border border-gray-200">
                            <div className="flex flex-col">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Step 1: Select Incidents ({selectedReports.length})</h3>
                                <div className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-md overflow-y-auto">
                                    <ul className="divide-y divide-gray-200">
                                        {selectedReports.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map(report => (
                                            <li key={report.id} className="py-2.5">
                                                <p className="text-sm font-medium text-gray-900">{report.category}</p>
                                                <p className="text-xs text-gray-600">{new Date(report.createdAt).toLocaleString()}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Step 2: Select Documents ({selectedDocumentIds.size})</h3>
                                <div className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-md overflow-y-auto">
                                    {allDocuments.length > 0 ? (
                                        <ul className="space-y-2">
                                            {allDocuments.map(doc => (
                                                <li key={doc.id}>
                                                    <label className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                                                        <input type="checkbox"
                                                            checked={selectedDocumentIds.has(doc.id)}
                                                            onChange={() => handleToggleDocumentSelection(doc.id)}
                                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <DocumentTextIcon className="w-5 h-5 text-gray-500" />
                                                        <span className="text-sm font-medium text-gray-800 truncate">{doc.name}</span>
                                                    </label>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500 text-center py-8">No documents in your library.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    
                     {!generatedPackage && !isLoading && step === 2 && (
                         <div className="bg-white p-6 rounded-lg border border-gray-200 h-full flex flex-col">
                            <h3 className="text-lg font-semibold text-gray-800">Step 3: Define Strategic Objective</h3>
                            <p className="text-sm text-gray-600 mt-1 mb-4">
                                Tell the AI the primary goal of this package. This will frame the entire legal argument. Be specific.
                            </p>
                            <textarea
                                value={packageObjective}
                                onChange={(e) => setPackageObjective(e.target.value)}
                                placeholder="Example: To demonstrate a consistent pattern of communication breakdown and support a request for a court-ordered communication app."
                                className="w-full flex-1 p-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                rows={6}
                            />
                             <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900">
                                <strong>This is powerful.</strong> The AI will use this goal to build a persuasive narrative, analyze behavior, and connect the facts to Indiana law. The more precise your objective, the better the result.
                            </div>
                        </div>
                    )}
                </main>

                <footer className="p-4 border-t border-gray-200 flex justify-end gap-3 no-print">
                     {generatedPackage ? (
                        <>
                             <button onClick={onPackageCreated} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                Finish & Clear Selection
                            </button>
                            <button onClick={handlePrint} className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                <PrinterIcon className="w-5 h-5 mr-2" />
                                Print / Save as PDF
                            </button>
                            <button onClick={copyToClipboard} className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-950 rounded-md shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                               {isCopied ? <CheckIcon className="w-5 h-5 mr-2" /> : <ClipboardDocumentIcon className="w-5 h-5 mr-2" />}
                                {isCopied ? 'Copied!' : 'Copy Plain Text'}
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                Cancel
                            </button>
                            {step === 1 && (
                                <button onClick={() => setStep(2)} disabled={selectedReports.length === 0} className="px-4 py-2 text-sm font-semibold text-white bg-blue-950 rounded-md shadow-sm hover:bg-blue-800 disabled:bg-blue-300">
                                    Next: Set Objective
                                </button>
                            )}
                            {step === 2 && (
                                <button
                                    onClick={handleGeneratePackage}
                                    disabled={isLoading || !packageObjective.trim() || isOffline}
                                    className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-950 rounded-md shadow-sm hover:bg-blue-800 disabled:bg-blue-300"
                                    title={isOffline ? "Package generation is disabled while offline." : "Cost: 20 Tokens"}
                                >
                                    <SparklesIcon className="w-5 h-5 mr-2" />
                                    Generate Impressive Presentation
                                </button>
                            )}
                        </>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default EvidencePackageBuilder;
