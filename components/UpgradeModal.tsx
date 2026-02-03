import React from 'react';
import { SubscriptionTier } from '../types';
import { XMarkIcon, CheckIcon, SparklesIcon } from './icons';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade: (tier: SubscriptionTier) => void;
    currentTier: SubscriptionTier;
    featureName?: string;
}

const tiers = {
    Free: {
        name: 'Free',
        price: '$0',
        description: 'Core tools for basic incident logging.',
        features: [
            'AI-Guided Incident Logging',
            'Timeline & Calendar Views',
            'Dashboard Overview',
        ],
        buttonText: 'Your Current Plan',
    },
    Plus: {
        name: 'Plus',
        price: '$19',
        description: 'Advanced analysis and document management.',
        features: [
            'All Free features, plus:',
            'Pattern Analysis',
            'Document Library',
            'AI Legal Assistant',
        ],
        buttonText: 'Upgrade to Plus',
    },
    Pro: {
        name: 'Pro',
        price: '$39',
        description: 'The ultimate court-ready toolkit.',
        features: [
            'All Plus features, plus:',
            'Deep Forensic Analysis',
            'Evidence Package Builder',
            'AI Voice Agent',
        ],
        buttonText: 'Upgrade to Pro',
    },
};

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onUpgrade, currentTier, featureName }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
                    <div>
                         <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Upgrade Your Plan</h2>
                         {featureName && <p className="text-sm text-gray-600 mt-1">The "{featureName}" feature requires an upgraded plan.</p>}
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100" aria-label="Close modal">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                <main className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50">
                    {(Object.keys(tiers) as SubscriptionTier[]).map(tierKey => {
                        const tier = tiers[tierKey];
                        const isCurrent = currentTier === tierKey;
                        const isBelowCurrent = (tierKey === 'Free' && currentTier !== 'Free') || (tierKey === 'Plus' && currentTier === 'Pro');

                        return (
                            <div key={tier.name} className={`rounded-lg border p-6 flex flex-col ${isCurrent ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500' : 'bg-white border-gray-200'}`}>
                                <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
                                <p className="mt-1 text-sm text-gray-600">{tier.description}</p>
                                <p className="my-4">
                                    <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                                    <span className="text-base font-medium text-gray-500">/mo</span>
                                </p>
                                <ul className="space-y-2 text-sm text-gray-700 flex-1">
                                    {tier.features.map(feature => (
                                        <li key={feature} className="flex items-start">
                                            <CheckIcon className="w-5 h-5 text-green-500 mr-2 mt-px flex-shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-6">
                                    <button
                                        onClick={() => onUpgrade(tierKey)}
                                        disabled={isCurrent || isBelowCurrent}
                                        className={`w-full flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                                            ${isCurrent ? 'bg-blue-800 text-white' : ''}
                                            ${!isCurrent && !isBelowCurrent ? 'bg-blue-950 text-white hover:bg-blue-800' : ''}
                                            ${isBelowCurrent ? 'bg-gray-200 text-gray-500 cursor-default' : ''}
                                        `}
                                    >
                                        {isCurrent ? (
                                            <>
                                                <SparklesIcon className="w-5 h-5 mr-2" />
                                                {tier.buttonText}
                                            </>
                                        ) : (
                                            tier.buttonText
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </main>
                 <footer className="p-4 bg-white border-t border-gray-200 text-center">
                    <p className="text-xs text-gray-500">This is a simulated billing interface. Upgrades are applied instantly for demonstration purposes.</p>
                </footer>
            </div>
        </div>
    );
};

export default UpgradeModal;