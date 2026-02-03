
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import IncidentTimeline from './components/IncidentTimeline';
import ChatInterface from './components/ChatInterface';
import PatternAnalysis from './components/PatternAnalysis';
import DeepAnalysis from './components/BehavioralInsights';
import LegalAssistant from './components/LegalAssistant';
import UserProfile from './components/UserProfile';
import DocumentLibrary from './components/DocumentLibrary';
import CalendarView from './components/CalendarView';
import EvidencePackageBuilder from './components/EvidencePackageBuilder';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import AgentChat from './components/AgentChat';
import Toast from './components/Toast';
import Messaging from './components/Messaging';
import AuthScreen from './components/AuthScreen';
import ScriptureModal from './components/ScriptureModal';
import UpgradeModal from './components/UpgradeModal';
import { Report, UserProfile as UserProfileType, StoredDocument, View, IncidentTemplate, User, SubscriptionTier } from './types';
import { SparklesIcon } from './components/icons';
import { api } from './services/api';

const App: React.FC = () => {
    // Auth State
    const [user, setUser] = useState<User | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);

    const [view, setView] = useState<View>('dashboard');
    
    // Data State
    const [reports, setReports] = useState<Report[]>([]);
    const [documents, setDocuments] = useState<StoredDocument[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfileType | null>(null);
    const [incidentTemplates, setIncidentTemplates] = useState<IncidentTemplate[]>([]);
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isAgentOpen, setIsAgentOpen] = useState(false);
    const [activeReportContext, setActiveReportContext] = useState<Report | null>(null);
    const [activeInsightContext, setActiveInsightContext] = useState<Report | null>(null);
    const [initialLegalQuery, setInitialLegalQuery] = useState<string | null>(null);
    const [activeAnalysisContext, setActiveAnalysisContext] = useState<string | null>(null);
    const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
    const [isEvidenceBuilderOpen, setIsEvidenceBuilderOpen] = useState(false);
    const [newReportDate, setNewReportDate] = useState<Date | null>(null);
    const [isConfigError, setIsConfigError] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Modal States
    const [showScripture, setShowScripture] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeFeature, setUpgradeFeature] = useState<string>('');

    // PWA State
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [showUpdate, setShowUpdate] = useState(false);
    const serviceWorkerRegistration = useRef<ServiceWorkerRegistration | null>(null);

    // Token & Tier Management
    const handleConsumeTokens = useCallback((cost: number = 1) => {
        if (!userProfile) return false;
        
        const currentTokens = userProfile.tokens !== undefined ? userProfile.tokens : 50; // Default logic
        
        if (currentTokens < cost) {
            setUpgradeFeature('AI Tokens');
            setShowUpgradeModal(true);
            return false;
        }

        const updatedProfile = { ...userProfile, tokens: currentTokens - cost };
        setUserProfile(updatedProfile); // Optimistic update
        // Sync silently
        if (user) api.saveProfile(user.userId, updatedProfile);
        return true;
    }, [userProfile, user]);

    const handleUpgrade = (tier: SubscriptionTier) => {
        if (!userProfile) return;
        // Mock upgrade logic - instantly upgrade for demo
        let newTokens = userProfile.tokens || 50;
        if (tier === 'Plus') newTokens += 100;
        if (tier === 'Pro') newTokens += 500;

        const updatedProfile: UserProfileType = { ...userProfile, tier, tokens: newTokens };
        setUserProfile(updatedProfile);
        if (user) api.saveProfile(user.userId, updatedProfile);
        setShowUpgradeModal(false);
        // Force refresh logic or toast
    };

    // Scripture Timer
    useEffect(() => {
        if (!user) return;
        const scriptureInterval = setInterval(() => {
            setShowScripture(true);
        }, 7 * 60 * 1000); 

        return () => clearInterval(scriptureInterval);
    }, [user]);

    // Data Sync Logic
    const loadUserData = useCallback(async (userId: string) => {
        setIsLoadingData(true);
        try {
            const data = await api.syncData(userId);
            setReports(data.reports || []);
            setIncidentTemplates(data.templates || []);
            
            const profile = data.profile || null;
            if (profile) {
                if (data.linkedUserId && !profile.linkedUserId) {
                    profile.linkedUserId = data.linkedUserId;
                }
                // Initialize default tier and tokens if missing
                if (!profile.tier) profile.tier = 'Free';
                if (profile.tokens === undefined) profile.tokens = 50;
            }
            setUserProfile(profile);
            
            setDocuments(data.documents || []);
        } catch (error) {
            console.error("Failed to sync data:", error);
        } finally {
            setIsLoadingData(false);
        }
    }, []);

    useEffect(() => {
        if (!process.env.API_KEY) {
            console.error("Configuration Error: API_KEY is not defined.");
            setIsConfigError(true);
        }

        const goOnline = () => setIsOffline(false);
        const goOffline = () => setIsOffline(true);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);

        if ('serviceWorker' in navigator) {
            const registerSW = async () => {
                try {
                    const swUrl = new URL('/service-worker.js', window.location.origin).toString();
                    const registration = await navigator.serviceWorker.register(swUrl);
                    serviceWorkerRegistration.current = registration;
                    
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    setShowUpdate(true);
                                }
                            });
                        }
                    });
                } catch (err) {
                    console.error('ServiceWorker registration failed: ', err);
                }
            };
            registerSW();
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    window.location.reload();
                    refreshing = true;
                }
            });
        }

        const storedUser = localStorage.getItem('custodyx_user');
        if (storedUser) {
            const u = JSON.parse(storedUser);
            setUser(u);
            loadUserData(u.userId);
        } else {
            const isPwa = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
            if (isPwa) setAuthMode('login');
        }
        setAuthChecked(true);

        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, [loadUserData]);

    const handleLogin = (u: User) => {
        setUser(u);
        localStorage.setItem('custodyx_user', JSON.stringify(u));
        loadUserData(u.userId);
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('custodyx_user');
        setReports([]);
        setDocuments([]);
        setIncidentTemplates([]);
        setUserProfile(null);
        setAuthMode('login');
    };

    const handleProfileSave = (profile: UserProfileType) => {
        // Ensure we don't overwrite existing tokens/tier if the profile form doesn't handle them
        const mergedProfile = { ...profile, tokens: userProfile?.tokens ?? 50, tier: userProfile?.tier ?? 'Free' };
        setUserProfile(mergedProfile);
        setView('dashboard');
        if (user) api.saveProfile(user.userId, mergedProfile);
    };

    const handleReportGenerated = (newReport: Report) => {
        setReports(prev => [...prev, newReport]);
        setNewReportDate(null);
        if (user) api.saveReports(user.userId, [newReport]);
        setShowScripture(true); 
    };
    
    const handleAddDocument = useCallback((newDocument: StoredDocument) => {
        setDocuments(prev => [...prev, newDocument]);
        if (user) api.saveDocuments(user.userId, [newDocument]);
    }, [user]);

    const handleDeleteDocument = useCallback((documentId: string) => {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    }, []);
    
    const handleAddTemplate = useCallback((newTemplate: IncidentTemplate) => {
        setIncidentTemplates(prev => [...prev, newTemplate]);
        if (user) api.saveTemplates(user.userId, [newTemplate]);
    }, [user]);

    const handleDeleteTemplate = useCallback((templateId: string) => {
        setIncidentTemplates(prev => prev.filter(t => t.id !== templateId));
    }, []);

    const handleViewChange = useCallback((newView: View) => {
        if (newView === 'assistant') {
            // Block Legal Assistant if Free Tier
            if (userProfile?.tier === 'Free') {
                setUpgradeFeature('Biblical Counsel (Legal Assistant)');
                setShowUpgradeModal(true);
                setIsSidebarOpen(false);
                return;
            }
        }

        if (newView !== 'new_report') setNewReportDate(null);
        setView(newView);
        setIsSidebarOpen(false);
    }, [userProfile]);

    const handleDiscussIncident = (reportId: string) => {
        // Discuss incident uses assistant, so check tier
        if (userProfile?.tier === 'Free') {
            setUpgradeFeature('Incident Discussion');
            setShowUpgradeModal(true);
            return;
        }
        
        const reportToDiscuss = reports.find(r => r.id === reportId);
        if (reportToDiscuss) {
            setActiveReportContext(reportToDiscuss);
            setActiveAnalysisContext(null);
            handleViewChange('assistant');
        }
    };

    const handleAnalyzeIncident = (reportId: string) => {
        const reportToAnalyze = reports.find(r => r.id === reportId);
        if (reportToAnalyze) {
            setActiveInsightContext(reportToAnalyze);
            handleViewChange('insights');
        }
    };
    
    const handleGenerateDraftFromInsight = (analysisText: string, motionType: string) => {
        // Legal assistant feature
        if (userProfile?.tier === 'Free') {
            setUpgradeFeature('Motion Drafting');
            setShowUpgradeModal(true);
            return;
        }

        const query = `Based on the provided deep analysis, please draft a "${motionType}".`;
        setActiveAnalysisContext(analysisText);
        setActiveReportContext(null);
        setInitialLegalQuery(query);
        setView('assistant');
        setActiveInsightContext(null);
    };

    const handleBackToTimeline = () => {
        setView('timeline');
        setActiveInsightContext(null);
    };

    const handleToggleReportSelection = (reportId: string) => {
        setSelectedReportIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(reportId)) {
                newSet.delete(reportId);
            } else {
                newSet.add(reportId);
            }
            return newSet;
        });
    };

    const handleCalendarDayClick = (date: Date) => {
        setNewReportDate(date);
        setView('new_report');
    };

    const handleClearSelection = () => {
        setSelectedReportIds(new Set());
    };

    const handleAgentClick = () => {
        setIsAgentOpen(true);
    };

    const handleBuildPackageClick = () => {
        setIsEvidenceBuilderOpen(true);
    };

    const handleUpdate = () => {
        const registration = serviceWorkerRegistration.current;
        if (registration && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            setShowUpdate(false);
        }
    };

    if (isConfigError) {
        return (
            <div className="bg-red-50 min-h-screen flex items-center justify-center p-4 text-center">
                 <div className="bg-white p-8 rounded-lg shadow-lg border border-red-200 max-w-md">
                    <h1 className="text-2xl font-bold text-red-800">Configuration Error</h1>
                    <p className="mt-2 text-red-700">Missing API Key.</p>
                </div>
            </div>
        );
    }

    if (!authChecked) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;

    if (!user) {
        if (authMode) {
            return (
                <>
                    <button onClick={() => setAuthMode(null)} className="fixed top-4 left-4 z-50 p-2 text-gray-500 hover:text-gray-900 bg-white/80 rounded-full md:hidden">
                        {/* Mobile back */}
                    </button>
                    <AuthScreen onLogin={handleLogin} initialMode={authMode} />
                </>
            );
        }
        return <LandingPage onGetStarted={() => setAuthMode('signup')} onLogin={() => setAuthMode('login')} />;
    }
    
    if (!isLoadingData && !userProfile && view !== 'profile') {
        return (
             <div className="bg-gray-100 min-h-screen flex items-center justify-center p-4">
                 <UserProfile 
                    onSave={handleProfileSave} 
                    onCancel={() => {}}
                    currentProfile={null}
                    isInitialSetup={true}
                    userId={user.userId}
                    onRefreshData={() => loadUserData(user.userId)}
                />
            </div>
        );
    }

    const renderView = () => {
        const selectionProps = { selectedReportIds, onToggleReportSelection: handleToggleReportSelection };
        switch (view) {
            case 'dashboard':
                return <Dashboard 
                            userProfile={userProfile}
                            reports={reports}
                            onViewChange={handleViewChange}
                            onAnalyzeIncident={handleAnalyzeIncident}
                        />;
            case 'new_report':
                return <ChatInterface 
                            onReportGenerated={handleReportGenerated} 
                            userProfile={userProfile}
                            initialDate={newReportDate} 
                            templates={incidentTemplates}
                            onAddTemplate={handleAddTemplate}
                            onDeleteTemplate={handleDeleteTemplate}
                            onNavToTimeline={() => handleViewChange('timeline')}
                            isOffline={isOffline}
                            onConsumeTokens={handleConsumeTokens}
                            onAddDocument={handleAddDocument}
                        />;
            case 'patterns':
                return <PatternAnalysis 
                            reports={reports} 
                            documents={documents}
                            userProfile={userProfile} 
                            isOffline={isOffline}
                            onConsumeTokens={handleConsumeTokens}
                        />;
            case 'insights':
                return <DeepAnalysis 
                            reports={reports} 
                            userProfile={userProfile}
                            activeInsightContext={activeInsightContext}
                            onBackToTimeline={handleBackToTimeline}
                            onGenerateDraft={handleGenerateDraftFromInsight}
                            onAddDocument={handleAddDocument}
                            isOffline={isOffline}
                            onConsumeTokens={handleConsumeTokens}
                        />;
            case 'documents':
                return <DocumentLibrary 
                            documents={documents}
                            onAddDocument={handleAddDocument}
                            onDeleteDocument={handleDeleteDocument}
                            user={user}
                        />;
            case 'assistant':
                return <LegalAssistant 
                            reports={reports} 
                            documents={documents}
                            userProfile={userProfile}
                            activeReportContext={activeReportContext}
                            clearActiveReportContext={() => setActiveReportContext(null)}
                            initialQuery={initialLegalQuery}
                            clearInitialQuery={() => setInitialLegalQuery(null)}
                            activeAnalysisContext={activeAnalysisContext}
                            clearActiveAnalysisContext={() => setActiveAnalysisContext(null)}
                            onAddDocument={handleAddDocument}
                            isOffline={isOffline}
                            onConsumeTokens={handleConsumeTokens}
                        />;
            case 'profile':
                return <UserProfile 
                            onSave={handleProfileSave} 
                            onCancel={() => handleViewChange('dashboard')}
                            currentProfile={userProfile}
                            userId={user.userId}
                            onRefreshData={() => loadUserData(user.userId)}
                        />;
            case 'calendar':
                return <CalendarView 
                            reports={reports}
                            onDiscussIncident={handleDiscussIncident}
                            onAnalyzeIncident={handleAnalyzeIncident}
                            onDayClick={handleCalendarDayClick}
                            {...selectionProps}
                            userProfile={userProfile}
                        />;
            case 'messaging':
                return <Messaging 
                            user={user} 
                            userProfile={userProfile}
                            onAddDocument={handleAddDocument} 
                            onReportGenerated={handleReportGenerated}
                            onConsumeTokens={handleConsumeTokens}
                        />;
            case 'timeline':
            default:
                return <IncidentTimeline 
                            reports={reports} 
                            onDiscussIncident={handleDiscussIncident}
                            onAnalyzeIncident={handleAnalyzeIncident}
                            {...selectionProps}
                        />;
        }
    };
    
    const isChatView = view === 'new_report' || view === 'assistant' || view === 'messaging';

    return (
        <div className="h-[100dvh] bg-gray-100 flex flex-col">
            <Header 
                onMenuClick={() => setIsSidebarOpen(prev => !prev)} 
                onProfileClick={() => handleViewChange('profile')}
                onAgentClick={handleAgentClick}
                onLogoutClick={handleLogout}
                tokens={userProfile?.tokens}
            />
            <div className="flex flex-1 pt-16 overflow-hidden relative">
                 {isSidebarOpen && (
                    <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} aria-hidden="true"></div>
                )}
                <Sidebar 
                    activeView={view} 
                    onViewChange={handleViewChange} 
                    reportCount={reports.length}
                    isOpen={isSidebarOpen}
                    onLogout={handleLogout}
                    userTier={userProfile?.tier}
                />
                <main className={`flex-1 ${isChatView ? 'p-0 sm:p-6 lg:p-8 flex flex-col' : 'p-4 sm:p-6 lg:p-8 overflow-y-auto'} pb-24 md:pb-6`}>
                    <div className={`mx-auto max-w-7xl w-full ${isChatView ? 'flex-1 min-h-0' : ''}`}>
                        {isLoadingData ? (
                            <div className="flex justify-center items-center h-full">
                                <SparklesIcon className="w-8 h-8 text-blue-500 animate-spin" />
                            </div>
                        ) : renderView()}
                    </div>
                </main>
            </div>
            
            <BottomNav 
                activeView={view}
                onViewChange={(v) => { handleViewChange(v); setIsSidebarOpen(false); }}
                onMenuClick={() => setIsSidebarOpen(true)}
            />

             {selectedReportIds.size > 0 && (view === 'timeline' || view === 'calendar') && (
                <div className="fixed bottom-24 md:bottom-6 right-6 z-30 flex items-center gap-3 no-print">
                    <button
                        onClick={handleClearSelection}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Clear Selection ({selectedReportIds.size})
                    </button>
                    <button
                        onClick={handleBuildPackageClick}
                        className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-950 rounded-full shadow-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105 transition-transform"
                    >
                        <SparklesIcon className="w-5 h-5" />
                        Build Evidence Package
                    </button>
                </div>
            )}
            
            <ScriptureModal isOpen={showScripture} onClose={() => setShowScripture(false)} />
            
            <UpgradeModal 
                isOpen={showUpgradeModal} 
                onClose={() => setShowUpgradeModal(false)}
                currentTier={userProfile?.tier || 'Free'}
                onUpgrade={handleUpgrade}
                featureName={upgradeFeature}
            />

            <AgentChat
                isOpen={isAgentOpen}
                onClose={() => setIsAgentOpen(false)}
                onNavigate={(newView) => { handleViewChange(newView); setIsAgentOpen(false); }}
                userProfile={userProfile}
                isOffline={isOffline}
                onConsumeTokens={handleConsumeTokens}
            />
            <EvidencePackageBuilder
                isOpen={isEvidenceBuilderOpen}
                onClose={() => setIsEvidenceBuilderOpen(false)}
                selectedReports={reports.filter(r => selectedReportIds.has(r.id))}
                allDocuments={documents}
                userProfile={userProfile}
                onPackageCreated={() => { setIsEvidenceBuilderOpen(false); setSelectedReportIds(new Set()); }}
                onAddDocument={handleAddDocument}
                isOffline={isOffline}
                onConsumeTokens={handleConsumeTokens}
            />
            <Toast show={isOffline} message="You are currently offline. Changes will sync when online." type="warning" />
            <Toast show={showUpdate} message="A new version is available." type="info" onAction={handleUpdate} actionText="Refresh" />
        </div>
    );
};

export default App;
