'use client';

import React, { useState, useRef } from 'react';
import { MicrophoneIcon } from '@heroicons/react/24/solid';

function SpeechInterface() {
    const [questions] = useState<string[]>([
        "What does the term 'to the moon' represent in meme coin conversations?",
        "List three key meme coins that played significant roles in the evolution of the meme coin space.",
        "Convince me to let you in"
    ]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
    const [answers, setAnswers] = useState<string[]>([]);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string>('');
    const recognitionRef = useRef(null);

    const requestMicrophonePermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            setError('');
            return true;
        } catch (err) {
            setError('Please allow microphone access to continue.');
            return false;
        }
    };

    const startInteraction = async () => {
        setCurrentQuestionIndex(0);
        setAnswers([]);
        setError('');
        speakText(questions[0]);
    };

    const startAnswering = async () => {
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) return;

        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setError('Your browser does not support speech recognition.');
            return;
        }

        startListening();
    };

    const elevenLabsSpeak = async (text: string) => {
        try {
            console.log(process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY);
            const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/qNkzaJoHLLdpvgh5tISm?output_format=mp3_44100_128', {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || ''
                },
                body: JSON.stringify({
                    text: text,
                    model_id: "eleven_flash_v2_5",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.5
                    }
                })
            });

            if (!response.ok) {
                throw new Error('Failed to convert text to speech');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            await audio.play();
        } catch (error) {
            console.error('Error using ElevenLabs:', error);
            setError('Failed to generate speech. Falling back to browser synthesis.');
            // Fallback to browser speech synthesis
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        }
    };

    const speakText = (text: string) => {
        elevenLabsSpeak(text);
    };

    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            setError('');
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setError(`Error: ${event.error}. Please try again.`);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i]?.isFinal && event.results[i][0]) {
                    const transcript = event.results[i][0].transcript ?? '';
                    setAnswers(prev => {
                        const newAnswers = [...prev];
                        newAnswers[currentQuestionIndex] = transcript;
                        return newAnswers;
                    });
                    stopListening();
                    
                    if (currentQuestionIndex < questions.length - 1) {
                        const nextIndex = currentQuestionIndex + 1;
                        setCurrentQuestionIndex(nextIndex);
                        speakText(questions[nextIndex]);
                    }
                } else if (event.results[i][0]) {
                    interim += event.results[i][0].transcript ?? '';
                }
            }
            setInterimTranscript(interim);
        };

        try {
            recognition.start();
            recognitionRef.current = recognition;
        } catch (err) {
            setError('Failed to start speech recognition. Please try again.');
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
            setIsListening(false);
        }
    };

    return (
        <div className="max-w-lg mx-auto p-6 space-y-6">
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    {error}
                </div>
            )}
            
            {currentQuestionIndex === -1 ? (
                <button
                    onClick={startInteraction}
                    className="w-full py-3 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                    Start Interaction
                </button>
            ) : (
                <>
                    <div className="p-4 bg-white rounded-lg shadow">
                        <h2 className="text-xl font-bold mb-2">Current Question:</h2>
                        <p className="text-lg">{questions[currentQuestionIndex]}</p>
                        {!isListening && (
                            <button
                                onClick={startAnswering}
                                className="mt-4 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <MicrophoneIcon className="w-5 h-5" />
                                Start Answering
                            </button>
                        )}
                        {isListening && (
                            <div className="mt-2 flex items-center text-green-600">
                                <MicrophoneIcon className="w-5 h-5 mr-2" />
                                <span>Listening...</span>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="font-semibold mb-2">Current Input:</p>
                        <p>{interimTranscript || "Waiting for speech..."}</p>
                    </div>

                    <div className="p-4 bg-white rounded-lg shadow">
                        <h3 className="font-bold mb-3">Your Answers:</h3>
                        {questions.map((question, index) => (
                            <div key={index} className="mb-2">
                                <p className="font-medium">{question}</p>
                                <p className="text-gray-600">{answers[index] || "Not answered yet"}</p>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default SpeechInterface;
