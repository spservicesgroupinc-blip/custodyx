
import React, { useState, useEffect } from 'react';
import { 
    BookOpenIcon, 
    SparklesIcon, 
    DocumentTextIcon, 
    ChartBarIcon, 
    ScaleIcon, 
    CheckIcon, 
    ShieldCheckIcon, 
    CheckCircleIcon,
    MenuIcon,
    XMarkIcon,
    PaperAirplaneIcon,
    UserCircleIcon
} from './icons';

interface LandingPageProps {
    onGetStarted: () => void;
    onLogin: () => void;
}

const DemoScreen = () => {
    const [slide, setSlide] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setSlide((prev) => (prev + 1) % 3); // Cycle through 3 slides
        }, 5500); // Slightly slower to read the scripture
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative bg-gray-900 rounded-xl border border-gray-800 shadow-2xl overflow-hidden aspect-[16/10] md:aspect-[16/9] mx-auto max-w-4xl transform transition-all hover:scale-[1.01] duration-500">
            {/* Top Bar (Mac-style) */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-gray-800 flex items-center px-4 space-x-2 border-b border-gray-700 z-20">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div className="mx-auto text-xs text-gray-400 font-medium font-mono">Kingdom Resolution Mode</div>
            </div>

            {/* Content Container */}
            <div className="absolute inset-0 top-8 bg-gray-50 overflow-hidden font-sans">
                
                {/* Slide 1: Chat / New Report */}
                <div className={`absolute inset-0 transition-opacity duration-700 ease-in-out flex flex-col ${slide === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-gray-900">Biblical Counsel</h3>
                            <p className="text-xs text-blue-600 flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span> 1 Corinthians 6 Active</p>
                        </div>
                        <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-medium">Peace Maker</div>
                    </div>
                    <div className="flex-1 p-6 space-y-4 overflow-hidden bg-gray-50">
                         <div className="flex justify-end animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                            <div className="bg-blue-950 text-white p-3 rounded-2xl rounded-tr-none text-sm max-w-[85%] shadow-sm">
                                My heart is hardened. I want to take him to court for changing the schedule again!
                            </div>
                        </div>
                        <div className="flex justify-start animate-fade-in-up" style={{animationDelay: '0.8s'}}>
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2 flex-shrink-0"><BookOpenIcon className="w-4 h-4 text-gray-500"/></div>
                            <div className="bg-white border border-gray-200 text-gray-800 p-3 rounded-2xl rounded-tl-none text-sm max-w-[85%] shadow-sm">
                                <em>"Does any one of you, when he has a dispute with another, dare to go to law before the unrighteous and not before the saints?" (1 Cor 6:1)</em><br/><br/>
                                Taking this to the secular courts is a defeat. Let us respond with grace. Try this: <br/><br/>
                                <strong>"I am frustrated by the change, but I value peace for our child. Let us find a time to talk in spirit and truth."</strong>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-white border-t">
                         <div className="relative">
                             <div className="w-full h-10 bg-gray-100 border border-gray-300 rounded-full px-4 flex items-center text-gray-400 text-sm">
                                 Seeking God's wisdom...
                             </div>
                             <div className="absolute right-2 top-1 bg-blue-950 p-1.5 rounded-full">
                                 <PaperAirplaneIcon className="w-4 h-4 text-white"/>
                             </div>
                         </div>
                    </div>
                </div>

                {/* Slide 2: Timeline */}
                <div className={`absolute inset-0 transition-opacity duration-700 ease-in-out flex flex-col ${slide === 1 ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                     <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900">Family Restoration Log</h3>
                        <button className="text-blue-600 text-xs font-semibold">View Covenant</button>
                    </div>
                    <div className="p-6 space-y-4 bg-gray-50 h-full">
                        <div className="bg-white p-4 rounded-lg border-l-4 border-l-green-500 border border-gray-200 shadow-sm">
                            <div className="flex justify-between mb-2">
                                <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">RECONCILED</span>
                                <span className="text-xs text-gray-400">Today, 4:45 PM</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">Visitation Dispute</p>
                            <p className="text-xs text-gray-600 mt-1">Resolved through mutual forgiveness and adherence to the plan.</p>
                        </div>
                         <div className="bg-white p-4 rounded-lg border-l-4 border-l-blue-500 border border-gray-200 shadow-sm opacity-80">
                            <div className="flex justify-between mb-2">
                                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">GUIDANCE</span>
                                <span className="text-xs text-gray-400">Yesterday, 9:30 AM</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">Wrath Prevented</p>
                            <p className="text-xs text-gray-600 mt-1">Angry message intercepted. Proverbs 15:1 applied.</p>
                        </div>
                    </div>
                </div>

                {/* Slide 3: Analysis */}
                <div className={`absolute inset-0 transition-opacity duration-700 ease-in-out flex flex-col ${slide === 2 ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <div className="h-full bg-white p-8 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-bounce">
                            <ScaleIcon className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Righteous Judgment</h3>
                        <p className="text-gray-600 mb-8 text-sm max-w-xs mx-auto leading-relaxed">
                            "Why not rather be wronged? Why not rather be cheated?"<br/>
                            <strong className="text-blue-800">1 Corinthians 6:7</strong>
                        </p>
                        
                        <div className="w-full max-w-sm bg-gray-50 border border-gray-200 rounded-xl p-5 text-left shadow-sm">
                             <div className="flex items-center gap-3 mb-4">
                                 <div className="w-8 h-8 bg-white rounded-full border border-gray-200 flex items-center justify-center"><CheckCircleIcon className="w-4 h-4 text-green-500"/></div>
                                 <div>
                                     <div className="text-sm font-bold text-gray-800">Godly Counsel Ready</div>
                                     <div className="text-xs text-gray-500">Avoiding secular litigation</div>
                                 </div>
                             </div>
                             <div className="space-y-2">
                                 <div className="h-2 bg-gray-200 rounded w-full"></div>
                                 <div className="h-2 bg-gray-200 rounded w-5/6"></div>
                             </div>
                        </div>
                        
                        <div className="mt-8 flex gap-3">
                            <button className="px-5 py-2 bg-blue-950 text-white rounded-lg text-xs font-bold shadow-lg transform transition hover:scale-105">
                                Seek Wisdom
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

    const toggleFaq = (index: number) => {
        setOpenFaqIndex(openFaqIndex === index ? null : index);
    };

    const scrollToSection = (id: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
        setMobileMenuOpen(false);
    };

    return (
        <div className="bg-white font-sans text-gray-900">
            {/* Navigation */}
            <nav className="fixed w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-950 p-2 rounded-lg">
                                <BookOpenIcon className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-bold text-gray-900 tracking-tight leading-none">
                                    VerityNow<span className="text-blue-600">.ai</span>
                                </span>
                                <span className="text-[0.65rem] font-medium text-gray-500 uppercase tracking-wider leading-none mt-0.5">
                                    Biblical Conflict Resolution
                                </span>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#trap" onClick={scrollToSection('trap')} className="text-sm font-medium text-gray-600 hover:text-blue-900 transition-colors">The Trap</a>
                            <a href="#scripture" onClick={scrollToSection('scripture')} className="text-sm font-medium text-gray-600 hover:text-blue-900 transition-colors">The Word</a>
                            <a href="#stewardship" onClick={scrollToSection('stewardship')} className="text-sm font-medium text-gray-600 hover:text-blue-900 transition-colors">Stewardship</a>
                            <button 
                                onClick={onLogin}
                                className="text-sm font-semibold text-blue-900 hover:text-blue-700 transition-colors"
                            >
                                Member Login
                            </button>
                            <button 
                                onClick={onGetStarted}
                                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-950 rounded-lg hover:bg-blue-900 transition-all shadow-sm hover:shadow-md"
                            >
                                Seek Counsel
                            </button>
                        </div>
                        <div className="md:hidden">
                            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-gray-600">
                                {mobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                </div>
                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-100 p-4 space-y-4 shadow-lg absolute w-full">
                        <a href="#trap" onClick={scrollToSection('trap')} className="block text-base font-medium text-gray-700">The Trap</a>
                        <a href="#scripture" onClick={scrollToSection('scripture')} className="block text-base font-medium text-gray-700">Scripture</a>
                        <a href="#stewardship" onClick={scrollToSection('stewardship')} className="block text-base font-medium text-gray-700">Stewardship</a>
                        <button 
                            onClick={() => { setMobileMenuOpen(false); onLogin(); }}
                            className="block w-full text-left text-base font-semibold text-blue-900 py-2"
                        >
                            Log In
                        </button>
                        <button 
                            onClick={onGetStarted}
                            className="w-full py-3 text-base font-semibold text-white bg-blue-950 rounded-lg"
                        >
                            Join the Faithful
                        </button>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="text-center max-w-4xl mx-auto z-10 relative">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-900 text-xs font-semibold uppercase tracking-wide mb-6 animate-fade-in-up">
                            <BookOpenIcon className="w-4 h-4" />
                            <span>1 Corinthians 6:1-11 Compliant</span>
                        </div>
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight mb-8">
                            Escape the Snare of<br className="hidden sm:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-800 to-blue-500">Secular Courts.</span>
                        </h1>
                        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                            "Dare any of you, having a matter against another, go to law before the unrighteous, and not before the saints?"
                            <br/><span className="text-sm font-semibold text-gray-500">— 1 Corinthians 6:1</span>
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button 
                                onClick={onGetStarted}
                                className="px-8 py-4 text-lg font-bold text-white bg-blue-950 rounded-xl shadow-xl hover:bg-blue-900 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto"
                            >
                                Start Biblical Resolution
                            </button>
                            <button onClick={scrollToSection('trap')} className="px-8 py-4 text-lg font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 w-full sm:w-auto flex items-center justify-center gap-2">
                                <ShieldCheckIcon className="w-5 h-5 text-gray-500" />
                                Why Avoid Courts?
                            </button>
                        </div>
                    </div>
                    
                    {/* Dynamic Demo Screen */}
                    <div className="mt-20 relative mx-auto max-w-5xl px-4">
                        <div className="absolute inset-0 bg-blue-200 blur-3xl opacity-20 rounded-full transform scale-110 translate-y-10"></div>
                        <DemoScreen />
                    </div>
                </div>
            </section>

            {/* Problem/Solution Section */}
            <section id="trap" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">The Legal System is Inherently Evil.</h2>
                            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                                The secular court system is a machine designed to devour families. It thrives on hatred, monetizes your pain, and hands the authority over your children to judges who do not know the Lord. 
                                <br/><br/>
                                <strong>Do not hand your heritage over to Caesar.</strong> By taking your brother or sister to court, you have already suffered complete defeat. VerityNow provides the righteous path to resolve disputes within the body, stripping the enemy of his power over your home.
                            </p>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="bg-red-100 p-2 rounded-full mt-1"><XMarkIcon className="w-5 h-5 text-red-700" /></div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">Rejects Secular Judgment</h4>
                                        <p className="text-sm text-gray-600">The court system profits from your destruction. Do not feed it.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="bg-blue-100 p-2 rounded-full mt-1"><CheckIcon className="w-5 h-5 text-blue-700" /></div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">Embraces Wisdom</h4>
                                        <p className="text-sm text-gray-600">Our AI guides you toward peace, reminding you of your duty to love and forgive.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-slate-50 p-6 rounded-2xl shadow-sm border border-slate-200 transform translate-y-8">
                                <BookOpenIcon className="w-10 h-10 text-blue-800 mb-4" />
                                <h3 className="font-bold text-gray-900 mb-2">Scriptural Logs</h3>
                                <p className="text-sm text-gray-500">Document facts without malice or wrath.</p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl shadow-sm border border-slate-200">
                                <ScaleIcon className="w-10 h-10 text-amber-700 mb-4" />
                                <h3 className="font-bold text-gray-900 mb-2">Godly Fairness</h3>
                                <p className="text-sm text-gray-500">Weigh actions against biblical principles.</p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl shadow-sm border border-slate-200 transform translate-y-8">
                                <SparklesIcon className="w-10 h-10 text-purple-700 mb-4" />
                                <h3 className="font-bold text-gray-900 mb-2">Grace Filter</h3>
                                <p className="text-sm text-gray-500">AI rewrites anger into productive love.</p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl shadow-sm border border-slate-200">
                                <ShieldCheckIcon className="w-10 h-10 text-green-700 mb-4" />
                                <h3 className="font-bold text-gray-900 mb-2">Protect the Child</h3>
                                <p className="text-sm text-gray-500">Shield your heritage from court conflict.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Deep Dive */}
            <section id="scripture" className="py-24 bg-gray-50 overflow-hidden">
                 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-base text-blue-800 font-semibold tracking-wide uppercase">The Process</h2>
                        <p className="mt-2 text-3xl font-bold text-gray-900">Peaceful Resolution in 2 Steps</p>
                    </div>

                    {/* Step 1 */}
                    <div className="flex flex-col lg:flex-row items-center gap-12 mb-24">
                        <div className="lg:w-1/2 order-2 lg:order-1">
                            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                                {/* Mock Chat UI */}
                                <div className="space-y-4">
                                    <div className="flex justify-end">
                                        <div className="bg-blue-900 text-white p-3 rounded-2xl rounded-tr-none text-sm max-w-xs">
                                            User: "He is impossible! I want to deny him visitation to teach him a lesson!"
                                        </div>
                                    </div>
                                    <div className="flex justify-start">
                                        <div className="bg-gray-100 border border-gray-200 text-gray-800 p-3 rounded-2xl rounded-tl-none text-sm max-w-xs shadow-sm">
                                            AI: "I hear your frustration, but remember Ephesians 4:26: 'Do not let the sun go down on your anger.' Denying visitation may harm the child. Let us instead address the specific behavior calmly."
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="lg:w-1/2 order-1 lg:order-2">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-900 font-bold text-xl mb-6">1</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Cast Your Cares.</h3>
                            <p className="text-lg text-gray-600">
                                Bring your burdens and frustrations to the app, not your ex-spouse. The AI acts as a spiritual filter, helping you process your emotions through the lens of scripture before you speak words you cannot take back.
                            </p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex flex-col lg:flex-row items-center gap-12">
                        <div className="lg:w-1/2">
                             <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-900 font-bold text-xl mb-6">2</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Avoid the Lawsuit.</h3>
                            <p className="text-lg text-gray-600">
                                "Now therefore, it is already an utter failure for you that you go to law against one another." (1 Cor 6:7). The app helps you generate fair, logical proposals for scheduling and finances so you never have to step foot in a courtroom.
                            </p>
                        </div>
                        <div className="lg:w-1/2">
                             <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                                <div className="flex items-center gap-4 mb-4 border-b pb-4">
                                    <BookOpenIcon className="w-10 h-10 text-gray-400"/>
                                    <div>
                                        <p className="font-bold text-gray-800">Proposal for Peace</p>
                                        <p className="text-xs text-green-600 font-semibold flex items-center gap-1"><CheckCircleIcon className="w-3 h-3"/> Biblically Sound</p>
                                    </div>
                                </div>
                                <p className="text-gray-600 text-sm">
                                    "Let us agree to share the upcoming holiday in a way that honors both parents, as we are commanded to honor father and mother. Here is a suggested schedule..."
                                </p>
                            </div>
                        </div>
                    </div>
                 </div>
            </section>

            {/* Pricing */}
            <section id="stewardship" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                     <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900">Good Stewardship</h2>
                        <p className="mt-4 text-lg text-gray-600">Do not waste the resources God has given you on expensive attorneys who thrive on conflict.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {/* Free Tier */}
                        <div className="bg-gray-50 rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow">
                            <h3 className="text-xl font-semibold text-gray-900">Seeker</h3>
                            <p className="text-4xl font-bold text-gray-900 mt-4">$0</p>
                            <p className="text-sm text-gray-500 mb-6">Forever free</p>
                            <button onClick={onGetStarted} className="w-full py-2.5 text-blue-900 bg-white border border-gray-300 font-semibold rounded-lg hover:bg-gray-50 transition-colors">Start Path</button>
                            <ul className="mt-8 space-y-4 text-sm text-gray-600">
                                <li className="flex gap-3"><CheckIcon className="w-5 h-5 text-blue-900 flex-shrink-0"/> Biblical Journaling</li>
                                <li className="flex gap-3"><CheckIcon className="w-5 h-5 text-blue-900 flex-shrink-0"/> Basic Calendar</li>
                                <li className="flex gap-3"><CheckIcon className="w-5 h-5 text-blue-900 flex-shrink-0"/> Private Prayer Logs</li>
                            </ul>
                        </div>

                        {/* Pro Tier (Highlighted) */}
                        <div className="bg-blue-950 rounded-2xl shadow-xl border border-blue-900 p-8 relative transform md:-translate-y-4">
                            <div className="absolute top-0 right-0 bg-yellow-500 text-blue-950 text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">RECOMMENDED</div>
                            <h3 className="text-xl font-semibold text-white">Peacemaker</h3>
                            <p className="text-4xl font-bold text-white mt-4">$19</p>
                            <p className="text-sm text-blue-200 mb-6">per month</p>
                            <button onClick={onGetStarted} className="w-full py-2.5 text-blue-950 bg-white font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-lg">Start Free Trial</button>
                            <ul className="mt-8 space-y-4 text-sm text-blue-100">
                                <li className="flex gap-3"><CheckIcon className="w-5 h-5 text-yellow-400 flex-shrink-0"/> <strong>Scriptural Guidance AI</strong></li>
                                <li className="flex gap-3"><CheckIcon className="w-5 h-5 text-yellow-400 flex-shrink-0"/> <strong>Grace-Based Rewriting</strong></li>
                                <li className="flex gap-3"><CheckIcon className="w-5 h-5 text-yellow-400 flex-shrink-0"/> Conflict Prevention</li>
                                <li className="flex gap-3"><CheckIcon className="w-5 h-5 text-yellow-400 flex-shrink-0"/> Secure Family Vault</li>
                            </ul>
                        </div>

                        {/* Annual Tier */}
                         <div className="bg-gray-50 rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow">
                            <h3 className="text-xl font-semibold text-gray-900">Covenant</h3>
                            <p className="text-4xl font-bold text-gray-900 mt-4">$190</p>
                            <p className="text-sm text-gray-500 mb-6">per year (2 months free)</p>
                            <button onClick={onGetStarted} className="w-full py-2.5 text-blue-900 bg-white border border-gray-300 font-semibold rounded-lg hover:bg-gray-50 transition-colors">Choose Annual</button>
                            <ul className="mt-8 space-y-4 text-sm text-gray-600">
                                <li className="flex gap-3"><CheckIcon className="w-5 h-5 text-blue-900 flex-shrink-0"/> All Peacemaker Features</li>
                                <li className="flex gap-3"><CheckIcon className="w-5 h-5 text-blue-900 flex-shrink-0"/> Priority Support</li>
                                <li className="flex gap-3"><CheckIcon className="w-5 h-5 text-blue-900 flex-shrink-0"/> Best Stewardship</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

             {/* FAQ Section */}
             <section className="py-24 bg-white">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Frequently Asked Questions</h2>
                    <div className="space-y-4">
                        {[
                            { q: "Is this app a replacement for a lawyer?", a: "We believe 1 Corinthians 6 teaches us to avoid lawsuits. This app helps you organize your facts and communicate with grace so that you do not need to rely on the secular court system." },
                            { q: "What if the other parent is not a believer?", a: "You can still use the app to guard your own heart and speech. Romans 12:18 says, 'If it is possible, as much as depends on you, live peaceably with all men.' The AI helps you fulfill your part of that command." },
                            { q: "Is my data secure?", a: "Yes. Your private notes and prayers are stored securely. You only share what you explicitly choose to send to the other parent." },
                            { q: "Does the app quote scripture?", a: "Yes. The AI is trained to reference the Bible to help de-escalate conflicts and remind you of the fruits of the spirit: love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, and self-control." }
                        ].map((faq, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg">
                                <button 
                                    className="w-full flex justify-between items-center p-4 text-left focus:outline-none"
                                    onClick={() => toggleFaq(index)}
                                >
                                    <span className="font-semibold text-gray-900">{faq.q}</span>
                                    <span className={`transform transition-transform ${openFaqIndex === index ? 'rotate-180' : ''}`}>
                                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </span>
                                </button>
                                {openFaqIndex === index && (
                                    <div className="p-4 pt-0 text-gray-600 text-sm leading-relaxed border-t border-gray-100 mt-2">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center gap-3 mb-4">
                                <BookOpenIcon className="h-8 w-8 text-blue-400" />
                                <div className="flex flex-col">
                                    <span className="text-2xl font-bold tracking-tight text-white leading-none">
                                        VerityNow<span className="text-blue-400">.ai</span>
                                    </span>
                                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-1">
                                        Kingdom Resolution Tools
                                    </span>
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm max-w-xs">
                                "Blessed are the peacemakers, for they shall be called sons of God." — Matthew 5:9
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Ministry</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li><a href="#trap" onClick={scrollToSection('trap')} className="hover:text-white">The Trap</a></li>
                                <li><a href="#stewardship" onClick={scrollToSection('stewardship')} className="hover:text-white">Stewardship</a></li>
                                <li><a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white cursor-default">Statement of Faith</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li><a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white cursor-default">Privacy Policy</a></li>
                                <li><a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white cursor-default">Terms of Service</a></li>
                                <li><a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white cursor-default">Disclaimer</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
                        &copy; {new Date().getFullYear()} VerityNow.AI. Guided by Faith, Powered by Technology.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
