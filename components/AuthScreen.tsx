
import React, { useState } from 'react';
import { api, setApiUrl } from '../services/api';
import { User } from '../types';
import { BookOpenIcon, LockClosedIcon, CheckCircleIcon } from './icons';

interface AuthScreenProps {
    onLogin: (user: User) => void;
    initialMode?: 'login' | 'signup';
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, initialMode = 'login' }) => {
    const [mode, setMode] = useState<'setup' | 'login' | 'signup'>(initialMode);
    
    const [apiUrlInput, setApiUrlInput] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSetup = () => {
        if (!apiUrlInput.includes('script.google.com')) {
            setError('Please enter a valid Google Apps Script Web App URL.');
            return;
        }
        setApiUrl(apiUrlInput);
        setMode('signup');
        setError('');
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            let user;
            if (mode === 'login') {
                user = await api.login(username, password);
            } else {
                user = await api.signup(username, password);
            }
            onLogin(user);
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    if (mode === 'setup') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                    <div className="text-center mb-8">
                        <div className="bg-blue-950 p-3 rounded-xl inline-block mb-4">
                            <BookOpenIcon className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Connect Backend</h1>
                        <p className="text-gray-600 mt-2">Connect to your private Google Apps Script database.</p>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                            <p className="font-semibold mb-2">Setup Instructions:</p>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>Create a new Google Apps Script project.</li>
                                <li>Paste the updated backend code provided.</li>
                                <li><strong>Important:</strong> Run the <code>setup</code> function once in the editor. This creates the "VerityNow_AI_Master" folder in your Drive.</li>
                                <li>Deploy as Web App (Execute as: Me, Access: Anyone).</li>
                                <li>Paste the deployment URL below.</li>
                            </ol>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Web App URL</label>
                            <input
                                type="url"
                                value={apiUrlInput}
                                onChange={(e) => setApiUrlInput(e.target.value)}
                                placeholder="https://script.google.com/..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {error && <p className="text-red-600 text-sm">{error}</p>}

                        <button
                            onClick={handleSetup}
                            className="w-full py-3 bg-blue-950 text-white rounded-lg font-semibold hover:bg-blue-900 transition-colors"
                        >
                            Connect & Continue
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                    <div className="bg-blue-950 p-3 rounded-xl inline-block mb-4">
                        <LockClosedIcon className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p className="text-gray-600 mt-2">Secure access to your VerityNow.AI data.</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {error && <p className="text-red-600 text-sm">{error}</p>}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-blue-950 text-white rounded-lg font-semibold hover:bg-blue-900 transition-colors disabled:opacity-70"
                    >
                        {isLoading ? (mode === 'signup' ? 'Creating Vault...' : 'Processing...') : (mode === 'login' ? 'Log In' : 'Sign Up')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setMode(mode === 'login' ? 'signup' : 'login');
                            setError('');
                        }}
                        className="text-sm text-blue-700 hover:underline"
                    >
                        {mode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                    </button>
                </div>
                
                 <div className="mt-4 text-center">
                    <button
                        onClick={() => {
                            setMode('setup');
                            setError('');
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600"
                    >
                        Reconfigure Backend
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;
