
import React, { useState, useMemo, useEffect } from 'react';
import { Report, SharedEvent, User, ParentingPlanTemplate, StoredDocument, UserProfile, EventCategory, AuditLogEntry } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, SparklesIcon, XMarkIcon, ClockIcon, UserCircleIcon, CheckCircleIcon } from './icons';
import IncidentCard from './IncidentCard';
import { api } from '../services/api';
import { PARENTING_PLAN_TEMPLATES } from '../constants';
import CustodyChallengeModal from './CustodyChallengeModal';

interface CalendarViewProps {
    reports: Report[];
    onDiscussIncident: (reportId: string) => void;
    onAnalyzeIncident: (reportId: string) => void;
    selectedReportIds: Set<string>;
    onToggleReportSelection: (reportId: string) => void;
    onDayClick: (date: Date) => void;
    userProfile?: UserProfile | null;
}

// --- SUB-COMPONENTS ---

const EventModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: Partial<SharedEvent>) => void;
    initialDate: Date | null;
    childrenList: string[];
    userProfile: UserProfile | null;
    userId: string;
    eventToEdit?: SharedEvent | null;
}> = ({ isOpen, onClose, onSave, initialDate, childrenList, userProfile, userId, eventToEdit }) => {
    const [title, setTitle] = useState('');
    const [time, setTime] = useState('12:00');
    const [category, setCategory] = useState<EventCategory>('parenting');
    const [notes, setNotes] = useState('');
    const [selectedChild, setSelectedChild] = useState<string>('');
    
    // Parenting Specific
    const [assignedParent, setAssignedParent] = useState<'me' | 'coparent'>('me');

    useEffect(() => {
        if (isOpen) {
            if (eventToEdit) {
                setTitle(eventToEdit.title);
                const d = new Date(eventToEdit.start);
                setTime(d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}));
                setCategory(eventToEdit.category);
                setNotes(eventToEdit.notes || '');
                setSelectedChild(eventToEdit.childName || '');
                
                if (eventToEdit.category === 'parenting') {
                    setAssignedParent(eventToEdit.assignedTo === userId ? 'me' : 'coparent');
                }
            } else {
                setTitle('');
                setTime('12:00');
                setCategory('parenting');
                setNotes('');
                setSelectedChild('');
                setAssignedParent('me');
            }
        }
    }, [isOpen, eventToEdit, userId]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!title && category !== 'parenting') {
            alert("Please enter a title.");
            return;
        }

        const dateBase = initialDate ? initialDate : (eventToEdit ? new Date(eventToEdit.start) : new Date());
        const dateStr = dateBase.toISOString().split('T')[0];

        const evt: Partial<SharedEvent> = {
            id: eventToEdit?.id, // Preserve ID if editing
            title: category === 'parenting' ? `${assignedParent === 'me' ? 'My' : 'Co-Parent'} Parenting Time` : title,
            start: `${dateStr}T${time}:00`,
            category,
            notes,
            childName: selectedChild,
            assignedTo: category === 'parenting' 
                ? (assignedParent === 'me' ? userId : userProfile?.linkedUserId || 'unknown') 
                : undefined
        };
        onSave(evt);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{eventToEdit ? 'Edit Event' : 'Add Calendar Event'}</h3>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6 text-gray-500"/></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <div className="flex flex-wrap gap-2">
                            {['parenting', 'school', 'sports', 'medical', 'other'].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setCategory(cat as EventCategory)}
                                    className={`px-3 py-1.5 text-sm rounded-full capitalize border ${category === cat ? 'bg-blue-100 border-blue-500 text-blue-900' : 'bg-white border-gray-300 text-gray-700'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {category === 'parenting' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Parent</label>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setAssignedParent('me')}
                                    className={`flex-1 py-2 rounded-md border text-sm font-medium ${assignedParent === 'me' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                                >
                                    Me ({userProfile?.name || 'You'})
                                </button>
                                <button 
                                    onClick={() => setAssignedParent('coparent')}
                                    className={`flex-1 py-2 rounded-md border text-sm font-medium ${assignedParent === 'coparent' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300'}`}
                                >
                                    Co-Parent
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input 
                                type="text" 
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g., Soccer Practice"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                            <input 
                                type="time" 
                                value={time} 
                                onChange={e => setTime(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Child (Optional)</label>
                            <select 
                                value={selectedChild} 
                                onChange={e => setSelectedChild(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md"
                            >
                                <option value="">-- All --</option>
                                {childrenList.map((c, i) => <option key={i} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea 
                            value={notes} 
                            onChange={e => setNotes(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md h-20"
                            placeholder="Details regarding pickup, location, etc."
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800">Save Event</button>
                </div>
            </div>
        </div>
    );
};

const EventDetailsModal: React.FC<{
    event: SharedEvent | null;
    onClose: () => void;
    onEdit: () => void;
    userProfile: UserProfile | null;
    userId: string;
}> = ({ event, onClose, onEdit, userProfile, userId }) => {
    if (!event) return null;

    const myId = userId; 

    const getCreatorName = (id: string) => {
        if (id === myId) return "You";
        return "Co-Parent"; 
    };

    const getCategoryColor = (cat: EventCategory) => {
        switch(cat) {
            case 'school': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'sports': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medical': return 'bg-red-100 text-red-800 border-red-200';
            case 'parenting': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <span className={`text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-md border ${getCategoryColor(event.category)}`}>
                            {event.category}
                        </span>
                        <h2 className="text-xl font-bold text-gray-900 mt-2">{event.title}</h2>
                        {event.childName && <p className="text-sm text-gray-600">Child: {event.childName}</p>}
                    </div>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6 text-gray-400 hover:text-gray-600"/></button>
                </div>

                <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                    <div className="flex items-center gap-2 text-gray-700">
                        <ClockIcon className="w-5 h-5 text-gray-400" />
                        <span>{new Date(event.start).toLocaleString(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    
                    {event.notes && (
                        <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 border border-gray-200">
                            {event.notes}
                        </div>
                    )}

                    <div className="pt-4 border-t border-gray-200">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Audit Log & History</h4>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3 text-xs">
                                <div className="mt-0.5"><UserCircleIcon className="w-4 h-4 text-blue-500"/></div>
                                <div>
                                    <p className="font-medium text-gray-900">Created by {getCreatorName(event.creatorId)}</p>
                                    <p className="text-gray-500">{new Date(event.start).toLocaleDateString()}</p>
                                </div>
                            </div>
                            {event.auditLog?.slice().reverse().map((log, idx) => (
                                <div key={idx} className="flex items-start gap-3 text-xs">
                                    <div className="mt-0.5"><CheckCircleIcon className="w-4 h-4 text-green-500"/></div>
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {log.action === 'created' ? 'Created' : 'Edited'} by {log.userName || (log.userId === myId ? 'You' : 'Co-Parent')}
                                        </p>
                                        <p className="text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                                        {log.details && <p className="text-gray-400 italic mt-0.5">{log.details}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                    <button 
                        onClick={onEdit}
                        className="px-4 py-2 bg-blue-50 text-blue-700 font-medium rounded-md hover:bg-blue-100 transition-colors"
                    >
                        Edit Event
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const CalendarView: React.FC<CalendarViewProps> = ({ reports, onDiscussIncident, onAnalyzeIncident, selectedReportIds, onToggleReportSelection, onDayClick, userProfile }) => {
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [sharedEvents, setSharedEvents] = useState<SharedEvent[]>([]);
    const [activeTab, setActiveTab] = useState<'incidents' | 'shared'>('shared');
    
    // Modals
    const [showEventModal, setShowEventModal] = useState(false);
    const [viewingEvent, setViewingEvent] = useState<SharedEvent | null>(null);
    const [eventToEdit, setEventToEdit] = useState<SharedEvent | null>(null);
    const [showPlanModal, setShowPlanModal] = useState(false);
    
    // Plan Logic
    const [selectedTemplate, setSelectedTemplate] = useState<ParentingPlanTemplate | null>(null);
    const [planStartDate, setPlanStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [myRoleInPattern, setMyRoleInPattern] = useState<'A' | 'B'>('A'); // Am I Parent A (0) or Parent B (1)?
    
    const [showChallengeModal, setShowChallengeModal] = useState(false);
    const [imbalancePercent, setImbalancePercent] = useState(0);
    const [pendingEvents, setPendingEvents] = useState<SharedEvent[]>([]);

    const userStr = localStorage.getItem('custodyx_user');
    const userId = userStr ? JSON.parse(userStr).userId : '';

    useEffect(() => {
        if (userProfile?.linkedUserId || userProfile) {
             const userStr = localStorage.getItem('custodyx_user');
             if(userStr) {
                 const u = JSON.parse(userStr);
                 api.getSharedEvents(u.userId).then(events => setSharedEvents(events || []));
             }
        }
    }, [userProfile]);

    const reportsByDate = useMemo(() => {
        const map = new Map<string, Report[]>();
        reports.forEach(report => {
            const dateKey = new Date(report.createdAt).toISOString().split('T')[0];
            if (!map.has(dateKey)) map.set(dateKey, []);
            map.get(dateKey)?.push(report);
        });
        return map;
    }, [reports]);

    const eventsByDate = useMemo(() => {
        const map = new Map<string, SharedEvent[]>();
        sharedEvents.forEach(evt => {
            const dateKey = new Date(evt.start).toISOString().split('T')[0];
            if (!map.has(dateKey)) map.set(dateKey, []);
            map.get(dateKey)?.push(evt);
        });
        return map;
    }, [sharedEvents]);

    const changeMonth = (offset: number) => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
        setSelectedDate(null);
    };

    const isSameDay = (d1: Date | null, d2: Date | null) => {
        if (!d1 || !d2) return false;
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    // --- EVENT HANDLING ---

    const handleSaveEvent = async (eventData: Partial<SharedEvent>) => {
        const userStr = localStorage.getItem('custodyx_user');
        if (!userStr) return;
        const u = JSON.parse(userStr);

        let finalEvent: SharedEvent;

        // EDIT MODE
        if (eventData.id) {
            const existingEvent = sharedEvents.find(e => e.id === eventData.id);
            if (!existingEvent) return;

            const auditEntry: AuditLogEntry = {
                action: 'edited',
                userId: u.userId,
                userName: userProfile?.name || 'User',
                timestamp: new Date().toISOString(),
                details: `Updated details: ${eventData.title}`
            };

            finalEvent = {
                ...existingEvent,
                ...eventData,
                auditLog: [...(existingEvent.auditLog || []), auditEntry]
            } as SharedEvent;

            // Optimistic Update
            setSharedEvents(prev => prev.map(e => e.id === finalEvent.id ? finalEvent : e));

        } else {
            // CREATE MODE
            const auditEntry: AuditLogEntry = {
                action: 'created',
                userId: u.userId,
                userName: userProfile?.name || 'User',
                timestamp: new Date().toISOString(),
                details: `Created category: ${eventData.category}`
            };

            finalEvent = {
                id: `evt_${Date.now()}`,
                title: eventData.title || 'Untitled',
                start: eventData.start || new Date().toISOString(),
                category: eventData.category || 'other',
                type: 'other', // legacy
                creatorId: u.userId,
                notes: eventData.notes,
                childName: eventData.childName,
                assignedTo: eventData.assignedTo,
                auditLog: [auditEntry]
            } as SharedEvent;

            setSharedEvents(prev => [...prev, finalEvent]);
        }

        try {
            await api.saveSharedEvent(u.userId, finalEvent);
            setShowEventModal(false);
            setEventToEdit(null);
        } catch(e) {
            alert("Failed to save event");
            // Revert on failure (simple reload or more complex revert logic)
        }
    };

    const handleEditClick = () => {
        setEventToEdit(viewingEvent);
        setViewingEvent(null);
        setShowEventModal(true);
    };

    // --- PLAN LOGIC ---

    const generatePlanEvents = () => {
        if (!selectedTemplate) return;
        const userStr = localStorage.getItem('custodyx_user');
        if (!userStr) return;
        const u = JSON.parse(userStr);

        const startDate = new Date(planStartDate);
        const events: SharedEvent[] = [];
        
        let myOvernights = 0;
        let totalDays = 365;

        for (let i = 0; i < totalDays; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            const cycleIndex = i % selectedTemplate.pattern.length;
            const parentIndex = selectedTemplate.pattern[cycleIndex]; 
            
            const targetIndex = myRoleInPattern === 'A' ? 0 : 1;
            const isMe = parentIndex === targetIndex;

            if (isMe) myOvernights++;

            const assignedUserId = isMe ? u.userId : (userProfile?.linkedUserId || 'coparent_placeholder');
            const title = isMe ? "My Parenting Time" : "Co-Parent Parenting Time";

            const auditEntry: AuditLogEntry = {
                action: 'created',
                userId: u.userId,
                userName: userProfile?.name,
                timestamp: new Date().toISOString(),
                details: 'Generated via Parenting Plan Template'
            };

            const newEvent: SharedEvent = {
                id: `plan_${Date.now()}_${i}`,
                title: title,
                start: currentDate.toISOString(), 
                category: 'parenting',
                type: 'other',
                creatorId: u.userId,
                assignedTo: assignedUserId,
                auditLog: [auditEntry]
            };
            events.push(newEvent);
        }

        const pct = (myOvernights / totalDays) * 100;
        
        setPendingEvents(events);

        if (pct < 35) {
            setImbalancePercent(pct);
            setShowChallengeModal(true);
            setShowPlanModal(false);
        } else {
            savePlanEvents(events, u.userId);
        }
    };

    const savePlanEvents = async (events: SharedEvent[], userId: string) => {
        try {
            await api.saveSharedEventsBatch(userId, events);
            setSharedEvents(prev => [...prev, ...events]);
            setShowPlanModal(false);
            setPendingEvents([]);
        } catch (e) {
            console.error("Failed to save plan", e);
            alert("Failed to save schedule.");
        }
    };

    const handleChallengeResolved = (report: StoredDocument) => {
        const userStr = localStorage.getItem('custodyx_user');
        if (userStr && pendingEvents.length > 0) {
            const u = JSON.parse(userStr);
            savePlanEvents(pendingEvents, u.userId);
            alert("Schedule applied. Risk Assessment saved.");
        }
    };

    // --- RENDER HELPERS ---

    const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const lastDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay();
    const dates = Array.from({ length: daysInMonth }, (_, i) => new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1));
    const placeholders = Array.from({ length: startDayOfWeek });

    const getEventStyle = (evt: SharedEvent, userId: string) => {
        if (evt.category === 'parenting') {
            const isMe = evt.assignedTo === userId;
            // ME = Blue, THEM = Purple
            return isMe ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white';
        }
        // Activities
        switch (evt.category) {
            case 'school': return 'bg-yellow-400 text-yellow-900';
            case 'sports': return 'bg-orange-400 text-white';
            case 'medical': return 'bg-red-500 text-white';
            default: return 'bg-gray-400 text-white';
        }
    };

    return (
        <>
            <EventModal 
                isOpen={showEventModal} 
                onClose={() => { setShowEventModal(false); setEventToEdit(null); }}
                onSave={handleSaveEvent}
                initialDate={selectedDate}
                childrenList={userProfile?.children || []}
                userProfile={userProfile || null}
                userId={userId}
                eventToEdit={eventToEdit}
            />

            <EventDetailsModal 
                event={viewingEvent}
                onClose={() => setViewingEvent(null)}
                onEdit={handleEditClick}
                userProfile={userProfile || null}
                userId={userId}
            />

            <CustodyChallengeModal 
                isOpen={showChallengeModal}
                onClose={() => { setShowChallengeModal(false); setPendingEvents([]); }} 
                onReportGenerated={handleChallengeResolved}
                userProfile={userProfile || null}
                imbalancePercentage={imbalancePercent}
            />

            {showPlanModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={() => setShowPlanModal(false)}>
                    <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Set Parenting Plan</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Schedule Template</label>
                                <select 
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    onChange={(e) => {
                                        const t = PARENTING_PLAN_TEMPLATES.find(p => p.id === e.target.value);
                                        setSelectedTemplate(t || null);
                                    }}
                                >
                                    <option value="">-- Select --</option>
                                    {PARENTING_PLAN_TEMPLATES.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                                {selectedTemplate && <p className="text-xs text-gray-500 mt-1">{selectedTemplate.description}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input type="date" value={planStartDate} onChange={e => setPlanStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">I am...</label>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setMyRoleInPattern('A')}
                                        className={`flex-1 py-2 border rounded ${myRoleInPattern === 'A' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                                    >
                                        Parent A (Starts First)
                                    </button>
                                    <button 
                                        onClick={() => setMyRoleInPattern('B')}
                                        className={`flex-1 py-2 border rounded ${myRoleInPattern === 'B' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                                    >
                                        Parent B (Starts Second)
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setShowPlanModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                            <button onClick={generatePlanEvents} disabled={!selectedTemplate} className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800 disabled:opacity-50">Apply Schedule</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-8">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Calendar</h1>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowPlanModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
                        >
                            <SparklesIcon className="w-4 h-4 text-blue-600"/>
                            Set Parenting Plan
                        </button>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button onClick={() => setActiveTab('shared')} className={`px-3 py-1.5 text-sm font-medium rounded-md ${activeTab === 'shared' ? 'bg-white shadow text-blue-900' : 'text-gray-500'}`}>Shared Schedule</button>
                            <button onClick={() => setActiveTab('incidents')} className={`px-3 py-1.5 text-sm font-medium rounded-md ${activeTab === 'incidents' ? 'bg-white shadow text-blue-900' : 'text-gray-500'}`}>Incidents</button>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-xs items-center px-2">
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-600"></span> Me</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-purple-600"></span> Co-Parent</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-400"></span> School</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-400"></span> Sports</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500"></span> Medical</div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-6">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeftIcon className="w-6 h-6" /></button>
                        <div className="text-xl font-semibold text-gray-900">
                            {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </div>
                        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronRightIcon className="w-6 h-6" /></button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-500 font-medium border-b border-gray-200 pb-2 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1">
                        {placeholders.map((_, index) => <div key={`placeholder-${index}`} className="h-24 sm:h-32" />)}
                        {dates.map((date, index) => {
                            const dateKey = date.toISOString().split('T')[0];
                            const isSelected = isSameDay(date, selectedDate);
                            const isToday = isSameDay(date, new Date());
                            
                            const dayEvents = eventsByDate.get(dateKey) || [];
                            const dayIncidents = reportsByDate.get(dateKey) || [];
                            
                            // Sort: Parenting Time first (background-like), then specific events
                            const sortedEvents = [...dayEvents].sort((a, b) => {
                                if (a.category === 'parenting') return -1;
                                if (b.category === 'parenting') return 1;
                                return 0;
                            });

                            return (
                                <div 
                                    key={index} 
                                    className={`min-h-[80px] sm:min-h-[100px] p-1 border rounded-lg flex flex-col cursor-pointer transition-colors overflow-hidden ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}
                                    onClick={() => {
                                        setSelectedDate(date);
                                        if (activeTab === 'incidents') {
                                            onDayClick(date);
                                        } else {
                                            setShowEventModal(true);
                                            setEventToEdit(null); // Ensure adding new unless specific event clicked
                                        }
                                    }}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-900 text-white' : 'text-gray-700'}`}>{date.getDate()}</span>
                                        {activeTab === 'incidents' && dayIncidents.length > 0 && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                                    </div>
                                    
                                    <div className="flex-1 space-y-1 overflow-hidden">
                                        {activeTab === 'shared' && sortedEvents.slice(0, 3).map((evt) => (
                                            <div 
                                                key={evt.id} 
                                                className={`text-xs truncate px-1.5 py-0.5 rounded-sm font-medium ${getEventStyle(evt, userId)}`}
                                                title={evt.title}
                                                onClick={(e) => { e.stopPropagation(); setViewingEvent(evt); }}
                                            >
                                                {evt.title}
                                            </div>
                                        ))}
                                        {sortedEvents.length > 3 && <div className="text-[10px] text-gray-400 pl-1">+{sortedEvents.length - 3} more</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {selectedDate && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm animate-fade-in-up">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-900">
                                {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                            </h2>
                            {activeTab === 'shared' && (
                                <button 
                                    onClick={() => { setShowEventModal(true); setEventToEdit(null); }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-900 text-white text-sm font-medium rounded-md hover:bg-blue-800"
                                >
                                    <PlusIcon className="w-4 h-4" /> Add Event
                                </button>
                            )}
                        </div>

                        {activeTab === 'incidents' ? (
                            reportsByDate.get(selectedDate.toISOString().split('T')[0])?.map(report => (
                                <div key={report.id} className="mb-4">
                                    <IncidentCard
                                        report={report}
                                        onDiscuss={onDiscussIncident}
                                        onAnalyze={onAnalyzeIncident}
                                        isSelected={selectedReportIds.has(report.id)}
                                        onSelect={onToggleReportSelection}
                                    />
                                </div>
                            )) || <p className="text-gray-500 text-sm italic">No incidents logged.</p>
                        ) : (
                            <div className="space-y-3">
                                {eventsByDate.get(selectedDate.toISOString().split('T')[0])?.map(evt => {
                                    return (
                                        <div 
                                            key={evt.id} 
                                            className={`p-3 rounded-md hover:shadow-md cursor-pointer flex justify-between items-center group transition-all mb-2 ${getEventStyle(evt, userId)}`}
                                            onClick={() => setViewingEvent(evt)}
                                        >
                                            <div className="flex-1">
                                                <p className="font-semibold text-inherit">{evt.title}</p>
                                                <div className="flex gap-2 text-xs opacity-90">
                                                    <span>{new Date(evt.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                    {evt.childName && <span>• {evt.childName}</span>}
                                                </div>
                                            </div>
                                            <div className="text-xs opacity-75">View &rarr;</div>
                                        </div>
                                    );
                                }) || <p className="text-gray-500 text-sm italic">No events scheduled.</p>}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default CalendarView;
