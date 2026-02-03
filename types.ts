
export enum IncidentCategory {
    COMMUNICATION_ISSUE = 'Communication Issue',
    SCHEDULING_CONFLICT = 'Scheduling Conflict',
    FINANCIAL_DISPUTE = 'Financial Dispute',
    MISSED_VISITATION = 'Missed Visitation',
    PARENTAL_ALIENATION_CONCERN = 'Parental Alienation Concern',
    CHILD_WELLBEING = 'Child Wellbeing',
    LEGAL_DOCUMENTATION = 'Legal Documentation',
    OTHER = 'Other',
}

export enum DocumentFolder {
    DRAFTED_MOTIONS = 'Drafted Motions',
    FORENSIC_ANALYSES = 'Forensic Analyses',
    EVIDENCE_PACKAGES = 'Evidence Packages',
    USER_UPLOADS = 'User Uploads',
    RISK_ASSESSMENTS = 'Risk Assessments',
}

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
    images?: { mimeType: string; data: string }[];
}

export interface GeneratedReportData {
    content: string;
    category: IncidentCategory;
    tags: string[];
    legalContext?: string;
}

export interface Report extends GeneratedReportData {
    id: string;
    createdAt: string; // ISO string
    images: string[]; // base64 data URLs
}

export interface Theme {
    name: string;
    value: number; // count
}

export type SubscriptionTier = 'Free' | 'Plus' | 'Pro';

export interface UserProfile {
    name: string;
    role: 'Mother' | 'Father' | '';
    children: string[];
    causeNumber?: string;
    courtInfo?: string;
    linkedUserId?: string | null; // ID of the co-parent account
    tier?: SubscriptionTier;
    tokens?: number;
}

export interface StructuredLegalDocument {
    title: string;
    subtitle?: string | null;
    metadata: {
        date: string; // "YYYY-MM-DD"
        clientName?: string | null;
        caseNumber?: string | null;
    };
    preamble: string;
    sections: {
        heading: string;
        body: string; // Raw text, can contain newlines for paragraphs
    }[];
    closing: string;
    notes?: string | null;
}

export interface LegalAssistantResponse {
    type: 'chat' | 'document';
    content: string; // Always contains the chat message
    title?: string; // Document title
    documentText?: StructuredLegalDocument; // Full document text as structured data
}

export interface StoredDocument {
    id: string;
    name: string;
    mimeType: string;
    data?: string; // Optional: Loaded on demand from Drive
    createdAt: string; // ISO string
    folder: DocumentFolder;
    structuredData?: StructuredLegalDocument; // The original structured data, if applicable
}

export interface IncidentTemplate {
    id: string;
    title: string;
    content: string; // The full markdown content
    category: IncidentCategory;
    tags: string[];
    legalContext?: string;
}

export interface MessagingAnalysisReport {
    conflictScore: number; // 1-10 scale
    conflictScoreReasoning: string;
    dominantThemes: {
        theme: string;
        description: string;
        frequency: 'Low' | 'Medium' | 'High';
    }[];
    communicationDynamics: {
        initiator: string;
        responsiveness: string;
        tone: string;
    };
    flaggedBehaviors: {
        behavior: string;
        example: string; // anonymized
        impact: string;
    }[];
    actionableRecommendations: string[];
}

export interface User {
    userId: string;
    username: string;
    linkedUserId?: string; // From backend login
    sessionToken?: string;
}

export interface Message {
    id: string;
    senderId: string;
    recipientId?: string;
    content: string;
    timestamp: string;
}

export type EventCategory = 'parenting' | 'school' | 'sports' | 'medical' | 'other';

export interface AuditLogEntry {
    action: 'created' | 'edited' | 'deleted';
    userId: string;
    userName?: string; // Optional, helps display
    timestamp: string;
    details?: string;
}

export interface SharedEvent {
    id: string;
    title: string;
    start: string; // ISO string
    end?: string; // ISO string
    type: 'pickup' | 'dropoff' | 'visit' | 'other'; // Deprecated, use category
    category: EventCategory;
    notes?: string;
    creatorId: string;
    assignedTo?: string; // userId of the parent who has custody this day/event
    childName?: string; // Which child this is for
    auditLog?: AuditLogEntry[];
}

export interface ParentingPlanTemplate {
    id: string;
    name: string;
    description: string;
    cycleLengthDays: number;
    pattern: number[]; // 0 for Parent A, 1 for Parent B
}

export type View = 'dashboard' | 'timeline' | 'new_report' | 'patterns' | 'insights' | 'assistant' | 'profile' | 'documents' | 'calendar' | 'messaging';

export interface PendingInvite {
    id: string;
    requesterId: string;
    requesterName: string;
    createdAt: string;
}
