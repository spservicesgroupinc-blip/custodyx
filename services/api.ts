
import { Report, StoredDocument, IncidentTemplate, UserProfile, User, Message, SharedEvent } from '../types';

const DEFAULT_API_URL = import.meta.env.VITE_API_URL || 'https://script.google.com/macros/s/AKfycbwHqIMsKsO1FV0nkcRJuuqvsqQadY6fXv7AYiPrZWwtcP4dF49_zd7_gV-vNKo70gf0aw/exec'
let API_URL = localStorage.getItem('custodyx_api_url') || DEFAULT_API_URL;

export const setApiUrl = (url: string) => {
    API_URL = url;
    localStorage.setItem('custodyx_api_url', url);
};

const request = async (action: string, data: any = {}) => {
    const targetUrl = API_URL || DEFAULT_API_URL;
    const separator = targetUrl.includes('?') ? '&' : '?';
    const urlWithAction = `${targetUrl}${separator}action=${encodeURIComponent(action)}`;
    const response = await fetch(urlWithAction, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify({ action, ...data })
    });
    const result = await response.json();
    if (result.status === 'error') throw new Error(result.message);
    return result;
};

export const api = {
    login: async (username: string, password: string): Promise<User> => {
        const res = await request('login', { username, password });
        return { userId: res.userId, username: res.username, linkedUserId: res.linkedUserId, sessionToken: res.sessionToken };
    },
    signup: async (username: string, password: string): Promise<User> => {
        const res = await request('signup', { username, password });
        return { userId: res.userId, username: res.username, sessionToken: res.sessionToken };
    },
    syncData: async (userId: string) => {
        const res = await request('sync', { userId });
        return res.data;
    },
    getDocumentContent: async (userId: string, docId: string): Promise<string> => {
        const res = await request('getDocumentContent', { userId, docId });
        return res.data;
    },
    saveReports: async (userId: string, reports: Report[]) => request('saveItems', { userId, type: 'reports', items: reports }),
    saveDocuments: async (userId: string, documents: StoredDocument[]) => request('saveItems', { userId, type: 'documents', items: documents }),
    saveTemplates: async (userId: string, templates: IncidentTemplate[]) => request('saveItems', { userId, type: 'templates', items: templates }),
    saveProfile: async (userId: string, profile: UserProfile) => request('saveItems', { userId, type: 'profile', items: [profile] }),
    sendMessage: async (userId: string, content: string) => {
        const res = await request('sendMessage', { userId, content });
        return res.message;
    },
    getMessages: async (userId: string, after?: string) => {
        const res = await request('getMessages', { userId, after });
        return res.messages as Message[];
    },
    linkByUsername: async (userId: string, targetUsername: string) => {
        const res = await request('linkByUsername', { userId, targetUsername });
        return res; // Return full response which might be status: 'pending'
    },
    getPendingInvites: async (userId: string) => {
        const res = await request('getPendingInvites', { userId });
        return res.invites as import('../types').PendingInvite[];
    },
    respondToInvite: async (userId: string, inviteId: string, accept: boolean) => {
        const res = await request('respondToInvite', { userId, inviteId, accept });
        return res.linked;
    },
    saveSharedEventsBatch: async (userId: string, events: SharedEvent[]) => request('saveSharedEventsBatch', { userId, events }),
    getSharedEvents: async (userId: string) => {
        const res = await request('getSharedEvents', { userId });
        return res.events as SharedEvent[];
    },
    saveSharedEvent: async (userId: string, event: SharedEvent) => request('saveSharedEventsBatch', { userId, events: [event] })
};
