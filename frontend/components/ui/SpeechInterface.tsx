"use client";
import React, { useState, useRef } from "react";
import { MicrophoneIcon } from "@heroicons/react/24/solid";
import { useParams } from "next/navigation";
import InteractionClient from "@/clients/Interactions";
import Spline from '@splinetool/react-spline';

declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const interactionClient = new InteractionClient();

function SpeechInterface() {
  const params = useParams();
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string>("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [messages, setMessages] = useState<Array<{text: string, sender: 'user' | 'ai'}>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const startInteraction = async () => {
    try {
      // Send empty string to get first question
      console.log(params.id);
      const response = await interactionClient.interact(params.id as string, "", true);
      if (response?.message) {
        setCurrentQuestion(response.message);
        speakText(response.message);
        // Add the first AI message to chat
        setMessages([{ text: response.message, sender: 'ai' }]);
      }
    } catch (err) {
      setError("Failed to start interaction");
    }
  };

  const handleAnswer = async (answer: string) => {
    try {
      // Add user's speech to messages
      setMessages(prev => [...prev, { text: answer, sender: 'user' }]);
      
      const response = await interactionClient.interact(params.id as string, answer);
      if (response?.message) {
        setCurrentQuestion(response.message);
        speakText(response.message);
        // Add AI's response to messages
        setMessages(prev => [...prev, { text: response.message, sender: 'ai' }]);
      }
      if (!response?.shouldContinue) {
        // Handle end of conversation
        if (response?.decision === 'accept') {
          setError("Congratulations! You've been accepted!");
        } else if (response?.decision === 'deny') {
          setError("Sorry, you were not accepted.");
        }
      }
    } catch (err) {
      setError("Failed to process answer");
    }
  };

  const elevenLabsSpeak = async (text: string) => {
    try {
      setIsPlaying(true);
      const response = await fetch(
        "https://api.elevenlabs.io/v1/text-to-speech/qNkzaJoHLLdpvgh5tISm?output_format=mp3_44100_128",
        {
          method: "POST",
          headers: {
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || "",
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_flash_v2_5",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to convert text to speech");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsPlaying(false);
      };
      
      await audio.play();
    } catch (error) {
      console.error("Error using ElevenLabs:", error);
      setError("Failed to generate speech. Falling back to browser synthesis.");
      setIsPlaying(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        setIsPlaying(false);
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  const speakText = (text: string) => {
    elevenLabsSpeak(text);
  };

  const startAnswering = async () => {
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) return;

    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      setError("Your browser does not support speech recognition.");
      return;
    }

    startListening();
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setError("");
      return true;
    } catch (err) {
      setError("Please allow microphone access to continue.");
      return false;
    }
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError("");
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setError(`Error: ${event.error}. Please try again.`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result && result[0] && result.isFinal) {
          const transcript = result[0].transcript ?? "";
          handleAnswer(transcript);
          stopListening();
        } else if (result && result[0]) {
          interim += result[0].transcript ?? "";
        }
      }
      setInterimTranscript(interim);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      setError("Failed to start speech recognition. Please try again.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
    }
  };

  // Keep the scroll effect
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-[calc(100vh-56px)] flex container mx-auto bg-black overflow-hidden">
      {/* Left side - Spline */}
      <div className="w-1/2 h-full overflow-auto">
        <Spline scene="https://prod.spline.design/1m5ds9rBkE9XTil2/scene.splinecode" />
      </div>

      {/* Vertical Divider */}
      <div className="w-[1px] h-full bg-zinc-800"></div>

      {/* Right side - Chat Interface */}
      <div className="w-1/2 h-full p-6 bg-black overflow-hidden">
        <div className="h-full flex flex-col">
          {!currentQuestion ? (
            // Centered Start Button
            <div className="h-full flex items-center justify-center">
              <button
                onClick={startInteraction}
                className="py-3 px-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Start Interaction
              </button>
            </div>
          ) : (
            // Chat Interface
            <>
              {error && (
                <div className="p-4 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                  {error}
                </div>
              )}
              
              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-zinc-800 text-white'
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Microphone button */}
              <div className="flex justify-center">
                <button
                  onClick={isListening ? stopListening : startAnswering}
                  disabled={isPlaying}
                  className={`p-4 rounded-full ${
                    isPlaying 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : isListening 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : 'bg-green-500 hover:bg-green-600'
                  } text-white transition-colors`}
                >
                  <MicrophoneIcon className="w-6 h-6" />
                </button>
              </div>
              {isListening && (
                <div className="text-center mt-2 text-green-600">
                  {interimTranscript || "Listening..."}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SpeechInterface;
