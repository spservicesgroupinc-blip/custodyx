
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { connectToAgent, createPcmBlob, decode, decodeAudioData } from '../services/geminiService';
import { UserProfile, View } from '../types';
import { XMarkIcon, SparklesIcon } from './icons';
import { LiveServerMessage, Session } from '@google/genai';

interface AgentChatProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (view: View) => void;
    userProfile: UserProfile | null;
    isOffline: boolean;
    onConsumeTokens: (cost: number) => boolean;
}

type AgentStatus = "Idle" | "Connecting" | "Listening" | "Processing" | "Speaking" | "Error" | "Offline";

const AgentChat: React.FC<AgentChatProps> = ({ isOpen, onClose, onNavigate, userProfile, isOffline, onConsumeTokens }) => {
    const [status, setStatus] = useState<AgentStatus>("Idle");
    const [transcript, setTranscript] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [currentUserInput, setCurrentUserInput] = useState('');
    const [currentModelOutput, setCurrentModelOutput] = useState('');

    const sessionPromiseRef = useRef<Promise<Session> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);
    const transcriptContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOffline) {
            setStatus("Offline");
        } else if (status === "Offline") {
            setStatus("Idle");
        }
    }, [isOffline, status]);


    const handleClose = useCallback(() => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }
        setStatus(isOffline ? "Offline" : "Idle");
        onClose();
    }, [onClose, isOffline]);

    useEffect(() => {
        if (transcriptContainerRef.current) {
            transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
        }
    }, [transcript, currentUserInput, currentModelOutput]);

    const startListening = async () => {
        if (status !== 'Idle' && status !== 'Error') return;

        // Cost: 10 Tokens for Voice Session
        if (!onConsumeTokens(10)) return;

        setStatus("Connecting");
        setTranscript([]);
        setCurrentUserInput('');
        setCurrentModelOutput('');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            inputAudioContextRef.current = new window.AudioContext({ sampleRate: 16000 });
            outputAudioContextRef.current = new window.AudioContext({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;

            sessionPromiseRef.current = connectToAgent(userProfile, {
                onOpen: () => {
                    setStatus("Listening");
                    const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createPcmBlob(inputData);
                        if (sessionPromiseRef.current) {
                             sessionPromiseRef.current.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        }
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current!.destination);
                },
                onMessage: async (message: LiveServerMessage) => {
                    if (message.toolCall) {
                        for (const fc of message.toolCall.functionCalls) {
                            if (fc.name === 'navigateToView' && fc.args.view) {
                                onNavigate(fc.args.view as View);
                                sessionPromiseRef.current?.then(session => {
                                     session.sendToolResponse({
                                        functionResponses: { id: fc.id, name: fc.name, response: { result: `Successfully navigated to ${fc.args.view}.` } }
                                    });
                                });
                            }
                        }
                    }

                    if (message.serverContent?.inputTranscription) {
                        setCurrentUserInput(prev => prev + message.serverContent.inputTranscription.text);
                    }
                    if (message.serverContent?.outputTranscription) {
                        setStatus("Speaking");
                        setCurrentModelOutput(prev => prev + message.serverContent.outputTranscription.text);
                    }
                     if (message.serverContent?.turnComplete) {
                        const finalUserInput = currentUserInput + (message.serverContent?.inputTranscription?.text || '');
                        const finalModelOutput = currentModelOutput + (message.serverContent?.outputTranscription?.text || '');
                        
                        setTranscript(prev => [...prev, { role: 'user', text: finalUserInput }, { role: 'model', text: finalModelOutput }]);
                        setCurrentUserInput('');
                        setCurrentModelOutput('');
                        setStatus("Listening");
                    }
                    
                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64Audio) {
                        const outputContext = outputAudioContextRef.current!;
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputContext.currentTime);
                        const audioBuffer = await decodeAudioData(decode(base64Audio), outputContext, 24000, 1);
                        const source = outputContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputContext.destination);
                        source.addEventListener('ended', () => {
                            audioSourcesRef.current.delete(source);
                        });
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        audioSourcesRef.current.add(source);
                    }
                },
                onError: (e: ErrorEvent) => {
                    console.error("Agent connection error:", e);
                    setStatus("Error");
                },
                onClose: (e: CloseEvent) => {
                   handleClose();
                },
            });

        } catch (err) {
            console.error("Failed to start agent:", err);
            setStatus("Error");
        }
    };
    
    useEffect(() => {
        return () => { 
            if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then(s => s.close());
            }
        };
    }, []);

    const getStatusText = () => {
        switch (status) {
            case "Idle": return "Tap to speak (10 Tokens)";
            case "Connecting": return "Connecting...";
            case "Listening": return "Listening...";
            case "Processing": return "Thinking...";
            case "Speaking": return "Speaking...";
            case "Error": return "Connection error. Please try again.";
            case "Offline": return "AI Agent is unavailable offline.";
        }
    };
    
    if (!isOpen) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
            onClick={handleClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="w-full max-w-2xl h-full max-h-[70vh] bg-gray-800/90 backdrop-blur-lg rounded-xl shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                 <header className="flex-shrink-0 flex justify-between items-center p-3 border-b border-white/10">
                     <div className="flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-white" />
                        <span className="text-white font-semibold">AI Agent</span>
                    </div>
                    <button onClick={handleClose} className="p-1 text-gray-300 hover:text-white rounded-full hover:bg-white/10" aria-label="Close Agent">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </header>
                
                <div ref={transcriptContainerRef} className="flex-1 overflow-y-auto p-4 text-white text-sm font-medium space-y-3 flex flex-col justify-end">
                     {transcript.map((t, i) => (
                        <div key={i} className={`p-2 rounded-lg max-w-[85%] ${t.role === 'user' ? 'bg-blue-800/50 self-end text-right' : 'bg-white/10 self-start'}`}>
                            {t.text}
                        </div>
                    ))}
                    {currentUserInput && <div className="p-2 rounded-lg max-w-[85%] bg-blue-800/50 self-end text-right text-white/70">{currentUserInput}</div>}
                    {currentModelOutput && <div className="p-2 rounded-lg max-w-[85%] bg-white/10 self-start text-white/70">{currentModelOutput}</div>}
                     {transcript.length === 0 && !currentUserInput && !currentModelOutput && status !== 'Connecting' && (
                        <div className="text-center text-gray-300 self-center">
                            <p>I can help you navigate the app or answer questions. Just ask!</p>
                            <p className="text-xs mt-2 text-gray-400">Example: "Show me the calendar" or "What are the co-parenting laws in Indiana?"</p>
                        </div>
                    )}
                </div>

                <div className="flex-shrink-0 flex flex-col items-center justify-center p-4 border-t border-white/10">
                     <p className="text-white/70 text-xs h-4 mb-2">{getStatusText()}</p>
                    <button 
                        onClick={startListening} 
                        disabled={status !== 'Idle' && status !== 'Error'}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400
                            ${status === 'Listening' || status === 'Speaking' ? 'bg-blue-600 animate-pulse' : 'bg-blue-500'}
                            ${status !== 'Idle' && status !== 'Error' ? 'cursor-default bg-gray-500' : 'hover:bg-blue-400'}
                        `}
                    >
                       <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                           <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" />
                       </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgentChat;
