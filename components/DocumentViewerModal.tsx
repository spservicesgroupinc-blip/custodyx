
import React, { useState, useEffect } from 'react';
import { StoredDocument, User } from '../types';
import { XMarkIcon, PrinterIcon, ClipboardDocumentIcon, CheckIcon, SparklesIcon } from './icons';
import PdfPreview from './PdfPreview';
import ReactMarkdown from 'react-markdown';
import { api } from '../services/api';

interface DocumentViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    document: StoredDocument | null;
    user: User | null;
}

const documentToPlainText = (doc: StoredDocument | null): string => {
    if (!doc) return "";
    if (doc.structuredData) {
        let text = `${doc.structuredData.title}\n\n`;
        if (doc.structuredData.subtitle) text += `${doc.structuredData.subtitle}\n\n`;
        text += `Date: ${doc.structuredData.metadata.date}\n`;
        if(doc.structuredData.metadata.clientName) text += `Client: ${doc.structuredData.metadata.clientName}\n`;
        if(doc.structuredData.metadata.caseNumber) text += `Case No.: ${doc.structuredData.metadata.caseNumber}\n\n`;
        if(doc.structuredData.preamble) text += `${doc.structuredData.preamble}\n\n`;
        doc.structuredData.sections.forEach(s => {
            text += `${s.heading}\n\n${s.body}\n\n`;
        });
        if(doc.structuredData.closing) text += `${doc.structuredData.closing}\n\n`;
        if(doc.structuredData.notes) text += `Notes: ${doc.structuredData.notes}\n`;
        return text;
    }
    
    // For other text-based docs, decode from base64
    if (doc.mimeType.startsWith('text/') && doc.data) {
        try {
            return decodeURIComponent(escape(atob(doc.data)));
        } catch (e) {
            console.error("Failed to decode base64 data:", e);
            return "Error: Could not display content.";
        }
    }
    
    return "Plain text version is not available for this file type.";
};


const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ isOpen, onClose, document, user }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [fetchedData, setFetchedData] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Reset state when document changes
    useEffect(() => {
        if (isOpen && document) {
            setFetchedData(null);
            setError(null);
            
            // If data is missing (from sync) and we have a user, fetch it
            if (!document.data && user) {
                setIsLoadingContent(true);
                api.getDocumentContent(user.userId, document.id)
                    .then(data => {
                        setFetchedData(data);
                    })
                    .catch(err => {
                        console.error("Failed to fetch document content", err);
                        setError("Failed to load document content. Please try again.");
                    })
                    .finally(() => setIsLoadingContent(false));
            }
        }
    }, [isOpen, document, user]);

    if (!isOpen || !document) {
        return null;
    }

    // Use fetched data if available, otherwise existing data
    const activeData = fetchedData || document.data;

    const copyToClipboard = () => {
        // We create a temporary doc object with the active data for the helper function
        const tempDoc = { ...document, data: activeData };
        const plainText = documentToPlainText(tempDoc);
        if (plainText.includes("not available") || plainText.includes("Error")) return;
        navigator.clipboard.writeText(plainText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handlePrint = () => {
        if (document?.mimeType === 'application/pdf' && activeData) {
            try {
                const byteCharacters = atob(activeData);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const pdfWindow = window.open(url);
                if (pdfWindow) {
                    pdfWindow.focus();
                } else {
                    alert('Please allow pop-ups for this site to view the PDF.');
                }
            } catch (e) {
                console.error('Error opening PDF for printing:', e);
                alert('Could not open the PDF file.');
            }
        } else {
            window.print();
        }
    };

    const renderContent = () => {
        if (isLoadingContent) {
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <SparklesIcon className="w-10 h-10 text-blue-500 animate-spin" />
                    <p className="mt-4 text-gray-600">Loading document from secure storage...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-red-600">
                    <p>{error}</p>
                </div>
            );
        }

        if (document.structuredData) {
            return <PdfPreview document={document.structuredData} />;
        }
        
        if (!activeData) {
             return <div className="p-4">No content available.</div>;
        }

        const dataUri = `data:${document.mimeType};base64,${activeData}`;

        switch (document.mimeType) {
            case 'application/pdf':
                return (
                    <div className="printable-area h-full w-full">
                        <iframe src={dataUri} className="w-full h-full" title={document.name} />
                    </div>
                );
            case 'text/markdown':
                try {
                    const markdownContent = decodeURIComponent(escape(atob(activeData)));
                    return (
                        <div className="printable-area p-8 bg-white max-w-4xl mx-auto prose prose-slate">
                            <ReactMarkdown>{markdownContent}</ReactMarkdown>
                        </div>
                    );
                } catch (e) {
                    return <div className="p-4">Error displaying Markdown content.</div>;
                }
            case 'text/plain':
                try {
                    const textContent = decodeURIComponent(escape(atob(activeData)));
                    return (
                        <div className="printable-area p-8 bg-white max-w-4xl mx-auto">
                            <pre className="whitespace-pre-wrap font-sans text-sm">{textContent}</pre>
                        </div>
                    );
                } catch(e) {
                    return <div className="p-4">Error displaying text content.</div>;
                }
            default:
                 if (document.mimeType.startsWith('image/')) {
                    return (
                        <div className="printable-area p-8 bg-white max-w-4xl mx-auto flex justify-center items-center">
                            <img src={dataUri} alt={document.name} className="max-w-full max-h-full object-contain" />
                        </div>
                    );
                }
                return <div className="p-4">Preview is not available for this file type ({document.mimeType}).</div>;
        }
    };

    const canCopy = (document.mimeType.startsWith('text/') || !!document.structuredData) && !isLoadingContent;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-4 border-b border-gray-200 no-print">
                    <h2 className="text-lg font-semibold text-gray-900 truncate pr-4">{document.name}</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 flex-shrink-0" aria-label="Close modal">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="flex-1 bg-gray-100 overflow-y-auto">
                    {renderContent()}
                </main>

                <footer className="p-4 border-t border-gray-200 flex justify-end gap-3 no-print">
                    <button onClick={handlePrint} disabled={isLoadingContent} className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
                        <PrinterIcon className="w-5 h-5 mr-2" />
                        Print / Save as PDF
                    </button>
                    {canCopy && (
                        <button onClick={copyToClipboard} className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-900 rounded-md shadow-sm hover:bg-blue-800">
                            {isCopied ? <CheckIcon className="w-5 h-5 mr-2" /> : <ClipboardDocumentIcon className="w-5 h-5 mr-2" />}
                            {isCopied ? 'Copied!' : 'Copy Plain Text'}
                        </button>
                    )}
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        Close
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default DocumentViewerModal;
