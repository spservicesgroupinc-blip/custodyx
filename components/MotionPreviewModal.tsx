import React from 'react';
import { XMarkIcon, ClipboardDocumentIcon, PrinterIcon, CheckIcon } from './icons';
import { StructuredLegalDocument } from '../types';
import PdfPreview from './PdfPreview';

interface MotionPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    document: StructuredLegalDocument | null;
    title: string;
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
        text += `${s.heading}\n\n${s.body}\n\n`;
    });
    if(doc.closing) text += `${doc.closing}\n\n`;
    if(doc.notes) text += `Notes: ${doc.notes}\n`;
    return text;
};

const MotionPreviewModal: React.FC<MotionPreviewModalProps> = ({ isOpen, onClose, document, title }) => {
    const [isCopied, setIsCopied] = React.useState(false);

    if (!isOpen || !document) {
        return null;
    }

    const copyToClipboard = () => {
        const plainText = documentToPlainText(document);
        navigator.clipboard.writeText(plainText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };
    
    const handlePrint = () => {
        window.print();
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-4 border-b border-gray-200 no-print">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100" aria-label="Close modal">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                <main className="flex-1 bg-gray-100 p-6 overflow-y-auto">
                    <PdfPreview document={document} />
                </main>
                <footer className="p-4 border-t border-gray-200 flex justify-end gap-3 no-print">
                     <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        Close
                    </button>
                    <button onClick={handlePrint} className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <PrinterIcon className="w-5 h-5 mr-2" />
                        Print / Save as PDF
                    </button>
                    <button onClick={copyToClipboard} className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-950 rounded-md shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        {isCopied ? <CheckIcon className="w-5 h-5 mr-2" /> : <ClipboardDocumentIcon className="w-5 h-5 mr-2" />}
                        {isCopied ? 'Copied!' : 'Copy Plain Text'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default MotionPreviewModal;