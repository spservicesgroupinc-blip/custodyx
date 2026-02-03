import React from 'react';
import { StructuredLegalDocument } from '../types';

interface PdfPreviewProps {
    document: StructuredLegalDocument;
}

// Helper to convert text with newlines/lists to basic HTML elements
const textToHtml = (text: string): React.ReactNode[] => {
    if (!text) return [];

    const lines = text.split(/\r?\n/).map(l => l.trim());
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    
    const pushList = () => {
        if (listItems.length > 0) {
            elements.push(
                <ul className="pdf-ul" key={`ul-${elements.length}`}>
                    {listItems.map((item, idx) => <li className="pdf-li" key={idx}>{item}</li>)}
                </ul>
            );
            listItems = [];
        }
    };

    lines.forEach((line, index) => {
        if (line === "") return;

        if (/^[-*•]\s+/.test(line)) {
            listItems.push(line.replace(/^[-*•]\s+/, ''));
        } else {
            pushList();
            elements.push(<p className="pdf-body-paragraph" key={`p-${index}`}>{line}</p>);
        }
    });
    
    pushList(); // push any remaining list
    return elements;
};


const PdfPreview: React.FC<PdfPreviewProps> = ({ document }) => {
    const { title, subtitle, metadata, preamble, sections, closing, notes } = document;
    
    // A simple way to ensure date is parsed correctly even if it's just YYYY-MM-DD
    const displayDate = new Date(metadata.date + 'T12:00:00Z').toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    });

    return (
        <div className="pdf-container font-serif text-black text-sm p-4 bg-white shadow-lg border border-gray-300 printable-area max-w-4xl mx-auto">
            <header className="pdf-header">
                <h1 className="pdf-h1">{title}</h1>
                {subtitle && <div style={{ fontSize: '11pt', marginTop: '4pt' }}>{subtitle}</div>}
                <div className="pdf-meta">
                    <strong>Date:</strong> {displayDate}
                    {metadata.clientName && <> | <strong>Client:</strong> {metadata.clientName}</>}
                    {metadata.caseNumber && <> | <strong>Case No.:</strong> {metadata.caseNumber}</>}
                </div>
            </header>

            <main>
                {preamble && <div className="pdf-preamble">{textToHtml(preamble)}</div>}

                {sections.map((section, index) => (
                    <section key={index} className="pdf-section">
                        <h2 className="pdf-h2">{section.heading}</h2>
                        <div>{textToHtml(section.body)}</div>
                    </section>
                ))}

                {closing && (
                    <div className="pdf-signature">
                        <div>{textToHtml(closing)}</div>
                        <div>
                            <div className="pdf-sig-line"></div>
                            <div className="pdf-sig-label">Signature</div>
                        </div>
                        <div style={{ marginTop: '12pt' }}>
                            <div className="pdf-sig-line"></div>
                            <div className="pdf-sig-label">Date</div>
                        </div>
                    </div>
                )}

                {notes && <div className="pdf-notes"><strong>Notes:</strong> {notes}</div>}
            </main>
        </div>
    );
};

export default PdfPreview;
