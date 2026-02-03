
import React, { useState, useEffect } from 'react';
import { UserProfile as UserProfileType, PendingInvite } from '../types';
import { XMarkIcon, CheckCircleIcon, UserCircleIcon, ClockIcon } from './icons';
import { api } from '../services/api';

interface UserProfileProps {
    onSave: (profile: UserProfileType) => void;
    onCancel: () => void;
    currentProfile: UserProfileType | null;
    isInitialSetup?: boolean;
    userId?: string;
    onRefreshData?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onSave, onCancel, currentProfile, isInitialSetup, userId, onRefreshData }) => {
    const [name, setName] = useState('');
    const [role, setRole] = useState<'Mother' | 'Father' | ''>('');
    const [children, setChildren] = useState<string[]>(['']);
    const [causeNumber, setCauseNumber] = useState('');
    const [courtInfo, setCourtInfo] = useState('');

    const [isLinked, setIsLinked] = useState(false);
    const [targetUsername, setTargetUsername] = useState('');
    const [linkLoading, setLinkLoading] = useState(false);
    const [linkStatus, setLinkStatus] = useState<'idle' | 'success' | 'pending' | 'error'>('idle');
    const [linkMessage, setLinkMessage] = useState('');

    // Pending Invites State
    const [invites, setInvites] = useState<PendingInvite[]>([]);
    const [loadingInvites, setLoadingInvites] = useState(false);

    useEffect(() => {
        if (currentProfile) {
            setName(currentProfile.name || '');
            setRole(currentProfile.role || '');
            setChildren(currentProfile.children.length > 0 ? currentProfile.children : ['']);
            setCauseNumber(currentProfile.causeNumber || '');
            setCourtInfo(currentProfile.courtInfo || '');
            if (currentProfile.linkedUserId) {
                setIsLinked(true);
            } else {
                // Only fetch invites if not linked
                fetchInvites();
            }
        }
    }, [currentProfile, userId]);

    const fetchInvites = async () => {
        if (!userId) return;
        setLoadingInvites(true);
        try {
            const data = await api.getPendingInvites(userId);
            setInvites(data || []);
        } catch (e) {
            console.error("Failed to load invites", e);
        } finally {
            setLoadingInvites(false);
        }
    };

    const handleChildChange = (index: number, value: string) => {
        const newChildren = [...children];
        newChildren[index] = value;
        setChildren(newChildren);
    };

    const addChildInput = () => setChildren([...children, '']);
    const removeChildInput = (index: number) => {
        if (children.length > 1) setChildren(children.filter((_, i) => i !== index));
        else setChildren(['']);
    };

    const handleSave = () => {
        if (!name.trim() || !role) {
            alert("Name and Role are required.");
            return;
        }
        onSave({
            name,
            role,
            children: children.filter(c => c.trim() !== ''),
            causeNumber,
            courtInfo,
            linkedUserId: currentProfile?.linkedUserId
        });
    };

    const connectAccount = async () => {
        if (!userId || !targetUsername.trim()) return;
        setLinkLoading(true);
        setLinkStatus('idle');

        try {
            const result: any = await api.linkByUsername(userId, targetUsername.trim());
            if (result === 'pending' || (result && result.status === 'pending')) {
                setLinkStatus('pending');
                setLinkMessage("Invite sent! Connection will complete when they sign up.");
            } else {
                setIsLinked(true);
                setLinkStatus('success');
                setLinkMessage("Successfully connected to co-parent!");
                if (onRefreshData) onRefreshData();
            }
        } catch (e: any) {
            setLinkStatus('error');
            setLinkMessage(e.message || "Connection failed.");
        } finally {
            setLinkLoading(false);
        }
    };

    const handleInviteResponse = async (inviteId: string, accept: boolean) => {
        if (!userId) return;
        try {
            const linked = await api.respondToInvite(userId, inviteId, accept);
            if (linked) {
                setIsLinked(true);
                setInvites([]); // Clear invites
                if (onRefreshData) onRefreshData();
            } else {
                // Just removed from list
                setInvites(invites.filter(i => i.id !== inviteId));
            }
        } catch (e) {
            alert("Failed to process invite.");
        }
    };

    return (
        <div className="bg-white p-6 sm:p-8 border border-gray-200 rounded-lg shadow-sm max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                {isInitialSetup ? 'Complete Your Profile' : 'User Profile'}
            </h1>
            <p className="mt-2 text-base text-gray-700">Manage your case information and co-parent connection.</p>

            <div className="mt-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Your Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500" placeholder="e.g., Jane Doe" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Your Role</label>
                        <select value={role} onChange={(e) => setRole(e.target.value as any)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500">
                            <option value="">-- Select Role --</option>
                            <option value="Mother">Mother</option>
                            <option value="Father">Father</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Cause / Case Number</label>
                        <input type="text" value={causeNumber} onChange={(e) => setCauseNumber(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Court / County</label>
                        <input type="text" value={courtInfo} onChange={(e) => setCourtInfo(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Children's Names</label>
                    <div className="space-y-3 mt-1">
                        {children.map((child, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input type="text" value={child} onChange={(e) => handleChildChange(index, e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-md" />
                                <button onClick={() => removeChildInput(index)} className="p-2 text-gray-400 hover:text-red-600"><XMarkIcon className="w-5 h-5" /></button>
                            </div>
                        ))}
                    </div>
                    <button onClick={addChildInput} className="mt-3 px-3 py-1.5 text-sm font-medium text-blue-800 bg-blue-100 rounded-md">+ Add Child</button>
                </div>

                {!isInitialSetup && userId && (
                    <div className="pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Co-Parent Connection</h3>
                        {isLinked ? (
                            <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center gap-3">
                                <CheckCircleIcon className="w-6 h-6 text-green-600" />
                                <p className="text-green-800 font-medium">Workspace is Unified. Sharing messages and calendar.</p>
                            </div>
                        ) : (
                            <div className="bg-gray-50 p-6 rounded-md border border-gray-200">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="bg-blue-100 p-2 rounded-full"><UserCircleIcon className="w-6 h-6 text-blue-600" /></div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">Invite Co-Parent</h4>
                                        <p className="text-sm text-gray-600 mt-1">Enter their username to link your accounts into a single shared workspace.</p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input type="text" placeholder="Co-parent username" value={targetUsername} onChange={e => setTargetUsername(e.target.value)} className="flex-1 px-4 py-2 border border-gray-300 rounded-md" />
                                    <button onClick={connectAccount} disabled={linkLoading || !targetUsername.trim()} className="px-6 py-2 bg-blue-900 text-white font-medium rounded-md hover:bg-blue-800 disabled:opacity-50">
                                        {linkLoading ? 'Linking...' : 'Connect Workspace'}
                                    </button>
                                </div>
                                {linkStatus !== 'idle' && (
                                    <div className={`mt-3 p-3 rounded-md border flex items-start gap-3 text-sm ${linkStatus === 'success' ? 'bg-green-50 border-green-200 text-green-800' : linkStatus === 'pending' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                        <p>{linkMessage}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Pending Invites Section */}
                        {!isLinked && invites.length > 0 && (
                            <div className="mt-6">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Pending Invites</h4>
                                <div className="space-y-3">
                                    {invites.map(invite => (
                                        <div key={invite.id} className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-amber-100 p-2 rounded-full"><ClockIcon className="w-5 h-5 text-amber-600" /></div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">Request from <span className="font-bold">{invite.requesterName}</span></p>
                                                    <p className="text-xs text-gray-500">{new Date(invite.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleInviteResponse(invite.id, false)} className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 rounded hover:bg-red-200">Decline</button>
                                                <button onClick={() => handleInviteResponse(invite.id, true)} className="px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-100 rounded hover:bg-green-200">Accept</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-8 pt-5 border-t border-gray-200 flex justify-end gap-3">
                {!isInitialSetup && <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-md">Cancel</button>}
                <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white bg-blue-950 rounded-md">Save Profile</button>
            </div>
        </div>
    );
};

export default UserProfile;
