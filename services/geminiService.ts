
import { GoogleGenAI, Part, Content, Chat, Type, FunctionDeclaration, Session, LiveServerMessage, Modality, Blob } from "@google/genai";
import { ChatMessage, GeneratedReportData, Report, Theme, UserProfile, LegalAssistantResponse, StoredDocument, StructuredLegalDocument, View, MessagingAnalysisReport, Message } from '../types';
import { SYSTEM_PROMPT_CHAT, SYSTEM_PROMPT_REPORT_GENERATION, SYSTEM_PROMPT_THEME_ANALYSIS, SYSTEM_PROMPT_VOICE_AGENT, SYSTEM_PROMPT_DEEP_MESSAGING_ANALYSIS, SYSTEM_PROMPT_CUSTODY_CHALLENGE, SYSTEM_PROMPT_IMBALANCE_REPORT, SYSTEM_PROMPT_AUTO_REPLY, SYSTEM_PROMPT_CHAT_INCIDENT } from '../constants';
import { SYSTEM_PROMPT_SINGLE_INCIDENT_ANALYSIS } from '../constants/behavioralPrompts';
import { SYSTEM_PROMPT_LEGAL_ASSISTANT, SYSTEM_PROMPT_LEGAL_ANALYSIS_SUGGESTION, SYSTEM_PROMPT_DOCUMENT_ANALYSIS, SYSTEM_PROMPT_DOCUMENT_REDRAFT, SYSTEM_PROMPT_EVIDENCE_PACKAGE, STRUCTURED_DOCUMENT_JSON_SCHEMA } from '../constants/legalPrompts';
import { INDIANA_LEGAL_CONTEXT } from "../constants/legalContext";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schemas for structured JSON responses
const reportResponseSchema = {
    type: Type.OBJECT,
    properties: {
        content: {
            type: Type.STRING,
            description: "A detailed, neutral summary of the incident in Markdown format, with specific headings."
        },
        category: {
            type: Type.STRING,
            description: "The single most appropriate category for the incident."
        },
        tags: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING
            },
            description: "An array of 3-5 relevant keywords as tags."
        },
        legalContext: {
            type: Type.STRING,
            description: "An optional, neutral sentence connecting the incident to a principle from Indiana law. Omit if not applicable."
        }
    },
    required: ['content', 'category', 'tags']
};

const themeAnalysisSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            name: {
                type: Type.STRING,
                description: "The specific, concrete behavioral theme identified."
            },
            value: {
                type: Type.NUMBER,
                description: "The number of reports that mention this theme."
            }
        },
        required: ['name', 'value']
    }
};

const messagingAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        conflictScore: { type: Type.NUMBER, description: "A score from 1 to 10 indicating conflict level." },
        conflictScoreReasoning: { type: Type.STRING, description: "Brief explanation of the score." },
        dominantThemes: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    theme: { type: Type.STRING },
                    description: { type: Type.STRING },
                    frequency: { type: Type.STRING, enum: ["Low", "Medium", "High"] }
                }
            }
        },
        communicationDynamics: {
            type: Type.OBJECT,
            properties: {
                initiator: { type: Type.STRING },
                responsiveness: { type: Type.STRING },
                tone: { type: Type.STRING }
            }
        },
        flaggedBehaviors: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    behavior: { type: Type.STRING },
                    example: { type: Type.STRING },
                    impact: { type: Type.STRING }
                }
            }
        },
        actionableRecommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
    },
    required: ['conflictScore', 'dominantThemes', 'communicationDynamics', 'flaggedBehaviors', 'actionableRecommendations']
};

const structuredLegalDocumentSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "The main title of the document." },
        subtitle: { type: Type.STRING, description: "An optional subtitle." },
        metadata: {
            type: Type.OBJECT,
            properties: {
                date: { type: Type.STRING, description: "The date in YYYY-MM-DD format." },
                clientName: { type: Type.STRING, description: "The client's name, if applicable." },
                caseNumber: { type: Type.STRING, description: "The case number, if applicable." }
            },
            required: ['date']
        },
        preamble: { type: Type.STRING, description: "The introductory paragraph or preamble." },
        sections: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    heading: { type: Type.STRING, description: "The heading of the section." },
                    body: { type: Type.STRING, description: "The body content of the section, with newlines for paragraphs." }
                },
                required: ['heading', 'body']
            }
        },
        closing: { type: Type.STRING, description: "The closing text before signatures." },
        notes: { type: Type.STRING, description: "Optional notes at the end of the document." }
    },
    required: ['title', 'metadata', 'preamble', 'sections', 'closing']
};

const formatUserProfileContext = (profile: UserProfile | null): string => {
    if (!profile || !profile.name) return '';
    
    let context = `The user's name is ${profile.name}`;
    if (profile.role) {
        context += `, and they identify as the ${profile.role}. The other parent should be referred to as the ${profile.role === 'Mother' ? 'Father' : 'Mother'}.`;
    }
    if (profile.children && profile.children.length > 0) {
        context += ` The child/children involved are: ${profile.children.join(', ')}.`;
    }
    return `\n### User Context\n${context}\n`;
}

const formatMessagesToContent = (messages: ChatMessage[]): Content[] => {
    return messages.map(msg => {
        const parts: Part[] = [{ text: msg.content }];
        if (msg.images) {
            msg.images.forEach(image => {
                parts.push({
                    inlineData: {
                        mimeType: image.mimeType,
                        data: image.data,
                    },
                });
            });
        }
        return {
            role: msg.role,
            parts,
        };
    });
};

export const getChatResponse = async (messages: ChatMessage[], userProfile: UserProfile | null): Promise<string> => {
    const contents = formatMessagesToContent(messages);
    const systemInstruction = SYSTEM_PROMPT_CHAT.replace('{USER_PROFILE_CONTEXT}', formatUserProfileContext(userProfile));

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
        }
    });

    return response.text;
};

// Original chat-based report generation
export const generateJsonReport = async (messages: ChatMessage[], userProfile: UserProfile | null): Promise<GeneratedReportData | null> => {
    const conversationText = messages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');
    
    const userPrompt = `Based on the conversation transcript provided below, please generate the incident report JSON.\n\n--- CONVERSATION START ---\n\n${conversationText}\n\n--- CONVERSATION END ---`;
    
    const systemInstruction = SYSTEM_PROMPT_REPORT_GENERATION.replace('{USER_PROFILE_CONTEXT}', formatUserProfileContext(userProfile));

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: reportResponseSchema,
            }
        });

        const jsonText = response.text.trim();
        if (!jsonText) return null;
        const reportData = JSON.parse(jsonText);
        
        if (reportData.content && reportData.category && reportData.tags) {
            return reportData as GeneratedReportData;
        }
        return null;
    } catch (e) {
        console.error("Failed to generate or parse report JSON:", e);
        return null;
    }
};

// NEW: Form-based report refinement
export const generateReportFromForm = async (
    formData: {
        category: string;
        date: string;
        description: string;
        impact: string;
        people: string[];
    },
    userProfile: UserProfile | null
): Promise<GeneratedReportData | null> => {
    
    const userPrompt = `
    Please refine the following raw incident log into a neutral, professional, court-ready report.
    
    **Raw Data:**
    - Incident Date/Time: ${formData.date}
    - Category: ${formData.category}
    - People Involved: ${formData.people.join(', ')}
    - Description of Events: ${formData.description}
    - Impact/Outcome: ${formData.impact}
    `;

    const systemInstruction = SYSTEM_PROMPT_REPORT_GENERATION.replace('{USER_PROFILE_CONTEXT}', formatUserProfileContext(userProfile));

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: reportResponseSchema,
            }
        });

        const jsonText = response.text.trim();
        if (!jsonText) return null;
        const reportData = JSON.parse(jsonText);
        
        if (reportData.content && reportData.category && reportData.tags) {
            return reportData as GeneratedReportData;
        }
        return null;
    } catch (e) {
        console.error("Failed to generate report from form:", e);
        return null;
    }
};

export const getThemeAnalysis = async (reports: Report[], category: string): Promise<Theme[]> => {
    const reportsContent = reports.map(r => `--- REPORT ---\n${r.content}\n--- END REPORT ---`).join('\n\n');
    const prompt = SYSTEM_PROMPT_THEME_ANALYSIS.replace('{CATEGORY_NAME}', category);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `${prompt}\n\n## Incident Reports Content\n\n${reportsContent}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: themeAnalysisSchema,
            }
        });
        
        const jsonText = response.text.trim();
        const themes = JSON.parse(jsonText);
        if (Array.isArray(themes)) {
            return themes as Theme[];
        }
        return [];
    } catch (e) {
        console.error("Failed to get theme analysis:", e);
        return [];
    }
};

export const getSingleIncidentAnalysis = async (mainReport: Report, allReports: Report[], userProfile: UserProfile | null): Promise<{ analysis: string; sources: any[] }> => {
    const mainReportContent = `--- PRIMARY INCIDENT TO ANALYZE (ID: ${mainReport.id}, Date: ${new Date(mainReport.createdAt).toLocaleDateString()}) ---\n${mainReport.content}\n--- END PRIMARY INCIDENT ---`;
    
    const otherReportsContent = allReports
        .filter(r => r.id !== mainReport.id)
        .map(r => `--- SUPPORTING REPORT (ID: ${r.id}, Date: ${new Date(r.createdAt).toLocaleDateString()}) ---\n${r.content}\n--- END SUPPORTING REPORT ---`)
        .join('\n\n');

    const systemInstruction = SYSTEM_PROMPT_SINGLE_INCIDENT_ANALYSIS;
    const fullPrompt = `${systemInstruction}\n\n${formatUserProfileContext(userProfile)}\n\n## Incident Reports for Analysis:\n\n${mainReportContent}\n\n${otherReportsContent}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
            tools: [{googleSearch: {}}],
        }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { analysis: response.text, sources: sources };
};


export const getLegalAssistantResponse = async (
    reports: Report[], 
    documents: StoredDocument[], 
    query: string, 
    userProfile: UserProfile | null,
    analysisContext: string | null
): Promise<LegalAssistantResponse & { sources?: any[] }> => {
    
    const reportsContent = reports.map(r => `--- REPORT (ID: ${r.id}, Date: ${new Date(r.createdAt).toLocaleDateString()}) ---\n${r.content}\n--- END REPORT ---`).join('\n\n');
    
    const textDocuments = documents.filter(d => d.mimeType.startsWith('text/'));
    const binaryDocuments = documents.filter(d => !d.mimeType.startsWith('text/'));

    const textDocumentsContent = textDocuments.length > 0 ? textDocuments
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map(doc => {
            let contentSummary = '';
            try {
                // Correctly decode UTF-8 string from base64
                const decodedText = decodeURIComponent(escape(atob(doc.data)));
                contentSummary = `Content Preview: ${decodedText.substring(0, 750)}...`;
            } catch (e) {
                contentSummary = 'Content could not be decoded.';
            }
            return `--- DOCUMENT ---\nFolder: ${doc.folder}\nName: ${doc.name}\nDate Created: ${new Date(doc.createdAt).toLocaleString()}\n${contentSummary}\n--- END DOCUMENT ---`;
        }).join('\n\n') : "No text documents available.";

    const binaryDocumentParts: Part[] = binaryDocuments.map(doc => ({
        inlineData: { data: doc.data, mimeType: doc.mimeType }
    }));
        
    const systemInstruction = `${SYSTEM_PROMPT_LEGAL_ASSISTANT}\n${formatUserProfileContext(userProfile)}`;
    
    try {
        let promptText = `${systemInstruction}\n\n## KNOWLEDGE BASE: Incident Reports\n\n${reportsContent}\n\n## KNOWLEDGE BASE: Generated & Text Documents\n\n${textDocumentsContent}`;

        if (analysisContext) {
            promptText += `\n\n## Forensic Incident Analysis (Primary Context):\n\n${analysisContext}`;
        }

        promptText += `\n\n## User's Question:\n\n${query}`;

        const textPart: Part = { text: promptText };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, ...binaryDocumentParts] },
            config: {
                 tools: [{googleSearch: {}}],
            }
        });
    
        const responseText = response.text;
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
            throw new Error("No valid JSON object found in the response from Legal Assistant API.");
        }
        
        const jsonText = responseText.substring(firstBrace, lastBrace + 1);
        const parsedResponse = JSON.parse(jsonText);

        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

        if (parsedResponse.type && parsedResponse.content) {
            return { ...parsedResponse, sources } as LegalAssistantResponse & { sources?: any[] };
        }

        throw new Error("Invalid JSON structure from Legal Assistant API.");

    } catch (error) {
        console.error("Error getting or parsing legal assistant response:", error);
        return {
            type: 'chat',
            content: "I'm sorry, an unexpected error occurred while processing your request. Please try again."
        };
    }
};

export const getInitialLegalAnalysis = async (mainReport: Report, allReports: Report[], userProfile: UserProfile | null): Promise<LegalAssistantResponse & { sources?: any[] }> => {
    const mainReportContent = `--- PRIMARY INCIDENT TO ANALYZE (ID: ${mainReport.id}, Date: ${new Date(mainReport.createdAt).toLocaleDateString()}) ---\n${mainReport.content}\n--- END PRIMARY INCIDENT ---`;
    
    const otherReportsContent = allReports
        .filter(r => r.id !== mainReport.id)
        .map(r => `--- SUPPORTING REPORT (ID: ${r.id}, Date: ${new Date(r.createdAt).toLocaleDateString()}) ---\n${r.content}\n--- END SUPPORTING REPORT ---`)
        .join('\n\n');

    const systemInstruction = `${SYSTEM_PROMPT_LEGAL_ANALYSIS_SUGGESTION}\n${formatUserProfileContext(userProfile)}`;
    const fullPrompt = `${systemInstruction}\n\n## Incident Reports for Analysis:\n\n${mainReportContent}\n\n${otherReportsContent}`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
            config: {
                tools: [{googleSearch: {}}],
            }
        });
    
        const responseText = response.text;
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
            throw new Error("No valid JSON object found in the response from Legal Analysis API.");
        }
        
        const jsonText = responseText.substring(firstBrace, lastBrace + 1);
        const parsedResponse = JSON.parse(jsonText);
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

        if (parsedResponse.type === 'chat' && parsedResponse.content) {
            return { ...parsedResponse, sources } as LegalAssistantResponse & { sources?: any[] };
        }

        throw new Error("Invalid JSON structure from Legal Analysis API.");

    } catch (error) {
        console.error("Error getting or parsing initial legal analysis:", error);
        return {
            type: 'chat',
            content: "I'm sorry, an unexpected error occurred while analyzing the incident. Please try asking your question directly."
        };
    }
};

export const analyzeDocument = async (
    fileData: string, 
    mimeType: string, 
    userProfile: UserProfile | null
): Promise<string> => {
    const systemInstruction = `${SYSTEM_PROMPT_DOCUMENT_ANALYSIS}\n${formatUserProfileContext(userProfile)}`;
    
    const documentPart = {
        inlineData: {
            data: fileData,
            mimeType: mimeType,
        },
    };

    const textPart = {
        text: "Please review and analyze this document according to your instructions."
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [documentPart, textPart] },
            config: {
                systemInstruction: systemInstruction,
            }
        });
        
        return response.text;
    } catch (error) {
        console.error("Error analyzing document:", error);
        return "I'm sorry, an unexpected error occurred while analyzing the document. Please try again.";
    }
};

export const redraftDocument = async (
    fileData: string,
    mimeType: string,
    analysisText: string,
    userProfile: UserProfile | null
): Promise<StructuredLegalDocument | null> => {
    const systemInstruction = `${SYSTEM_PROMPT_DOCUMENT_REDRAFT}\n${formatUserProfileContext(userProfile)}`;

    const documentPart = {
        inlineData: {
            data: fileData,
            mimeType: mimeType,
        },
    };

    const textPart = {
        text: `Here is the analysis of the document you are about to redraft. Please incorporate all these suggestions into the new version:\n\n--- ANALYSIS ---\n${analysisText}\n--- END ANALYSIS ---`
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [documentPart, textPart] },
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: structuredLegalDocumentSchema,
            }
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as StructuredLegalDocument;
    } catch (error) {
        console.error("Error redrafting document:", error);
        return null;
    }
};

export const generateEvidencePackage = async (
    selectedReports: Report[],
    selectedDocuments: StoredDocument[],
    userProfile: UserProfile | null,
    packageObjective: string,
): Promise<StructuredLegalDocument | null> => {

    const reportsString = selectedReports
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map(r => `
--- INCIDENT REPORT ---
ID: ${r.id}
Date of Incident: ${new Date(r.createdAt).toLocaleString()}
Category: ${r.category}
Tags: [${r.tags.join(', ')}]
Legal Context Note: ${r.legalContext || 'None provided.'}
Report Content:
${r.content}
--- END REPORT ---
`).join('\n\n');

    const documentsString = selectedDocuments.map(d => `
--- DOCUMENT ---
Name: ${d.name}
Date Uploaded: ${new Date(d.createdAt).toLocaleString()}
--- END DOCUMENT ---
`).join('\n\n');

    let systemInstruction = SYSTEM_PROMPT_EVIDENCE_PACKAGE.replace('{USER_PROFILE_CONTEXT}', formatUserProfileContext(userProfile));
    systemInstruction = systemInstruction.replace('{CURRENT_DATE}', new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD format
    systemInstruction = systemInstruction.replace('{PACKAGE_OBJECTIVE}', packageObjective);

    const userPrompt = `Please generate the evidence package based on the following data.\n\n## SELECTED INCIDENT REPORTS ##\n\n${reportsString}\n\n## SELECTED DOCUMENTS ##\n\n${documentsString}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: structuredLegalDocumentSchema,
                tools: [{googleSearch: {}}],
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as StructuredLegalDocument;
    } catch (e) {
        console.error("Failed to generate evidence package:", e);
        return null;
    }
};

export const generateDeepMessagingAnalysis = async (
    documentContent: string, 
    userProfile: UserProfile | null
): Promise<MessagingAnalysisReport | null> => {
    
    const systemInstruction = SYSTEM_PROMPT_DEEP_MESSAGING_ANALYSIS.replace('{USER_PROFILE_CONTEXT}', formatUserProfileContext(userProfile));
    
    const userPrompt = `Please analyze the following chat log data:\n\n${documentContent.substring(0, 25000)}`; // Limit context to prevent token overflow, though model can handle more.

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Or pro if complex
            contents: userPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: messagingAnalysisSchema,
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as MessagingAnalysisReport;
    } catch (error) {
        console.error("Error generating messaging analysis:", error);
        return null;
    }
};

// --- CUSTODY CHALLENGE & RISK REPORT ---

export const getCustodyChallengeResponse = async (
    conversationHistory: ChatMessage[],
    userProfile: UserProfile | null
): Promise<string> => {
    const contents = formatMessagesToContent(conversationHistory);
    const systemInstruction = SYSTEM_PROMPT_CUSTODY_CHALLENGE.replace('{USER_PROFILE_CONTEXT}', formatUserProfileContext(userProfile));

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.8, // Slightly higher to be argumentative
            }
        });
        return response.text;
    } catch (e) {
        console.error("Custody challenge error:", e);
        return "I am having trouble processing your response. Please try again.";
    }
};

export const generateImbalanceReport = async (
    conversationHistory: ChatMessage[],
    userProfile: UserProfile | null
): Promise<StructuredLegalDocument | null> => {
    const conversationText = conversationHistory
        .map(m => `${m.role === 'user' ? 'User' : 'AI Advocate'}: ${m.content}`)
        .join('\n\n');

    const systemInstruction = SYSTEM_PROMPT_IMBALANCE_REPORT.replace('{USER_PROFILE_CONTEXT}', formatUserProfileContext(userProfile));
    const userPrompt = `Generate the Risk Assessment report based on this dialogue:\n\n${conversationText}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: structuredLegalDocumentSchema,
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as StructuredLegalDocument;
    } catch (e) {
        console.error("Report generation error:", e);
        return null;
    }
};

// --- AUTO-REPLY AGENT ---

export const generateAutoReply = async (
    incomingMessage: string, 
    userProfile: UserProfile | null
): Promise<string> => {
    const systemInstruction = SYSTEM_PROMPT_AUTO_REPLY.replace('{USER_PROFILE_CONTEXT}', formatUserProfileContext(userProfile));
    
    const userPrompt = `Draft a very nice, calming, and compliant reply to this incoming message:\n\n"${incomingMessage}"`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.3, // Lower temperature for more consistent, compliant responses
            }
        });
        return response.text;
    } catch (e) {
        console.error("Auto-reply generation error:", e);
        return "I received your message. Thank you."; // Fallback safety message
    }
};

// --- CHAT INCIDENT REPORT ---

export const generateChatIncidentReport = async (
    messages: Message[],
    userProfile: UserProfile | null
): Promise<GeneratedReportData | null> => {
    
    // Format transcript
    const transcript = messages.map(m => {
        const sender = (String(m.senderId) === String(userProfile?.linkedUserId)) ? 'Co-Parent' : 'User';
        return `[${new Date(m.timestamp).toLocaleString()}] ${sender}: ${m.content}`;
    }).join('\n');

    const systemInstruction = SYSTEM_PROMPT_CHAT_INCIDENT.replace('{USER_PROFILE_CONTEXT}', formatUserProfileContext(userProfile));
    
    const userPrompt = `Analyze the following chat log and generate an Incident Report:\n\n${transcript}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: reportResponseSchema,
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as GeneratedReportData;
    } catch (e) {
        console.error("Chat incident generation error:", e);
        return null;
    }
};


// --- Agent Service (ai.live) ---

const navigateToViewFunctionDeclaration: FunctionDeclaration = {
    name: 'navigateToView',
    parameters: {
        type: Type.OBJECT,
        description: 'Navigates the user to a specific view within the application.',
        properties: {
            view: {
                type: Type.STRING,
                description: `The view to navigate to. Must be one of: 'dashboard', 'timeline', 'new_report', 'patterns', 'insights', 'assistant', 'profile', 'documents', 'calendar'.`,
            },
        },
        required: ['view'],
    },
};

export const connectToAgent = (
    userProfile: UserProfile | null,
    callbacks: {
        onOpen: () => void;
        onMessage: (message: LiveServerMessage) => Promise<void>;
        onError: (error: ErrorEvent) => void;
        onClose: (event: CloseEvent) => void;
    }
): Promise<Session> => {
    const systemInstruction = SYSTEM_PROMPT_VOICE_AGENT.replace('{USER_PROFILE_CONTEXT}', formatUserProfileContext(userProfile));

    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: callbacks.onOpen,
            onmessage: callbacks.onMessage,
            onerror: callbacks.onError,
            onclose: callbacks.onClose,
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: systemInstruction,
            tools: [{ functionDeclarations: [navigateToViewFunctionDeclaration] }, { googleSearch: {} }],
            outputAudioTranscription: {},
            inputAudioTranscription: {},
        },
    });

    return sessionPromise;
};

// Audio Utilities
export function createPcmBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

export function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}
