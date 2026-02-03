
import React, { useRef, useState } from 'react';
import { StoredDocument, DocumentFolder, User } from '../types';
import { DocumentTextIcon, TrashIcon, PlusIcon, ChevronRightIcon } from './icons';
import DocumentViewerModal from './DocumentViewerModal';

interface DocumentLibraryProps {
    documents: StoredDocument[];
    onAddDocument: (document: StoredDocument) => void;
    onDeleteDocument: (documentId: string) => void;
    user: User | null;
}

const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });

const FolderSection: React.FC<{
    title: string;
    docs: StoredDocument[];
    onDelete: (id: string) => void;
    onView: (doc: StoredDocument) => void;
}> = ({ title, docs, onDelete, onView }) => {
    const [isOpen, setIsOpen] = useState(true);

    if (docs.length === 0) return null;

    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 focus:outline-none"
            >
                <h2 className="text-lg font-semibold text-gray-800">{title} ({docs.length})</h2>
                <ChevronRightIcon className={`w-6 h-6 text-gray-500 transform transition-transform ${isOpen ? 'rotate-90' : 'rotate-0'}`} />
            </button>
            {isOpen && (
                <ul role="list" className="divide-y divide-gray-200">
                    {docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((doc) => (
                        <li key={doc.id} className="group">
                            <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                                <button
                                    onClick={() => onView(doc)}
                                    className="flex items-center gap-4 min-w-0 text-left w-full"
                                    aria-label={`View ${doc.name}`}
                                >
                                    <DocumentTextIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700">{doc.name}</p>
                                        <p className="text-sm text-gray-500">
                                            Added on {new Date(doc.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => onDelete(doc.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 ml-4 flex-shrink-0"
                                    aria-label={`Delete ${doc.name}`}
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const DocumentLibrary: React.FC<DocumentLibraryProps> = ({ documents, onAddDocument, onDeleteDocument, user }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [viewingDocument, setViewingDocument] = useState<StoredDocument | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        setIsLoading(true);
        try {
            await Promise.all(Array.from(files).map(async (file: File) => {
                const base64Data = await fileToBase64(file);
                const newDocument: StoredDocument = {
                    id: `doc_${Date.now()}_${Math.random()}`,
                    name: file.name,
                    mimeType: file.type,
                    data: base64Data,
                    createdAt: new Date().toISOString(),
                    folder: DocumentFolder.USER_UPLOADS, // Uploads go to the specific folder
                };
                onAddDocument(newDocument);
            }));
        } catch (error) {
            console.error("Error processing file upload:", error);
        } finally {
            setIsLoading(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    const documentsByFolder = documents.reduce((acc, doc) => {
        if (!acc[doc.folder]) {
            acc[doc.folder] = [];
        }
        acc[doc.folder].push(doc);
        return acc;
    }, {} as Record<DocumentFolder, StoredDocument[]>);

    const folderOrder: DocumentFolder[] = [
        DocumentFolder.DRAFTED_MOTIONS,
        DocumentFolder.FORENSIC_ANALYSES,
        DocumentFolder.EVIDENCE_PACKAGES,
        DocumentFolder.USER_UPLOADS,
    ];

    return (
        <>
            <DocumentViewerModal
                isOpen={!!viewingDocument}
                onClose={() => setViewingDocument(null)}
                document={viewingDocument}
                user={user}
            />
            <div className="space-y-8">
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Document Library</h1>
                        <p className="mt-2 text-base text-gray-600 max-w-2xl">Manage your uploaded files and AI-generated documents. All items here are included in the AI's knowledge base.</p>
                    </div>
                    <button
                        onClick={triggerFileUpload}
                        disabled={isLoading}
                        className="flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-900 rounded-md shadow-sm hover:bg-blue-800 disabled:bg-blue-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        {isLoading ? 'Uploading...' : 'Upload Document(s)'}
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        multiple 
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    />
                </div>

                <div className="space-y-6">
                    {documents.length === 0 && !isLoading ? (
                        <div className="text-center py-24 bg-white border-2 border-dashed border-gray-300 rounded-lg">
                            <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-300" />
                            <h3 className="mt-4 text-xl font-semibold text-gray-900">Your Library is Empty</h3>
                            <p className="mt-2 text-base text-gray-500 max-w-md mx-auto">
                                Upload court orders, or generate analyses and drafts to start building your library.
                            </p>
                        </div>
                    ) : (
                        folderOrder.map(folderName => (
                            <FolderSection 
                                key={folderName}
                                title={folderName}
                                docs={documentsByFolder[folderName] || []}
                                onDelete={onDeleteDocument}
                                onView={setViewingDocument}
                            />
                        ))
                    )}
                </div>
            </div>
        </>
    );
};

export default DocumentLibrary;
