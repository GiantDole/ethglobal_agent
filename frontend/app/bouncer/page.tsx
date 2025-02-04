'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid';

function SpeechInterface() {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        // Example: Fetch questions from the backend
        // const response = await fetch('/api/questions');
        // const questions = await response.json();
        const questions = ["What is the capital of France?", "What is the capital of Germany?", "What is the capital of Italy?"];
        if (questions.length > 0) {
            setQuestion(questions[0]);
            speakText(questions[0]);
        }
    };

    const speakText = (text) => {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    };

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Your browser does not support speech recognition.');
            return;
        }

        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = true;
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    setAnswer(event.results[i][0].transcript);
                    sendAnswerToBackend(event.results[i][0].transcript);
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            setInterimTranscript(interim);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error detected: ' + event.error);
        };

        recognition.onend = () => {
            if (isListening) {
                recognition.start();
            }
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsListening(true);
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
            setIsListening(false);
        }
    };

    const sendAnswerToBackend = async (text) => {
        await fetch('/api/answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ answer: text }),
        });
    };

    return (
        <div className="max-w-lg mx-auto p-6 text-center font-sans">
            <h1 className="text-2xl mb-4">Question: {question}</h1>
            <button 
                className="px-4 py-2 mb-4 text-white bg-blue-500 rounded-full hover:bg-blue-600 flex items-center justify-center w-12 h-12 mx-auto"
                onClick={toggleListening}
            >
                {isListening ? (
                    <StopIcon className="w-6 h-6 text-white" />
                ) : (
                    <MicrophoneIcon className="w-6 h-6 text-white" />
                )}
            </button>
            <div className="mb-4 p-4 border rounded bg-gray-100">
                <p className="font-bold">Interim Transcript:</p>
                <p className="text-gray-700">{interimTranscript}</p>
            </div>
            <div className="p-4 border rounded bg-gray-200">
                <p className="font-bold">Your Final Answer:</p>
                <p className="text-gray-700">{answer}</p>
            </div>
        </div>
    );
}

export default SpeechInterface;
