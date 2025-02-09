"use client";
import React, { useState, useRef } from "react";
import { useParams } from "next/navigation";
import Spline from "@splinetool/react-spline";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";

// Clients
import InteractionClient from "@/clients/Interactions";

// Images
import Start from "@/assets/bouncer/start.svg";
import Connected from "@/assets/header/connected_icon.svg";
import BouncerIcon from "@/assets/bouncer/identifier_bouncer.svg";
import SpeakerIcon from "@/assets/bouncer/indentifier_speaker.svg";
import DefaultSpeaker from "@/assets/bouncer/microphone_default.svg";
import StartSpeaker from "@/assets/bouncer/microphone_start.svg";
import StopSpeaker from "@/assets/bouncer/microphone_stop.svg";
import Rejection from "@/assets/bouncer/rejection.svg";
import Approval from "@/assets/bouncer/approval.svg";

declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const interactionClient = new InteractionClient();

function SpeechInterface() {
  const params = useParams();
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string>("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [messages, setMessages] = useState<
    Array<{ text: string; sender: "user" | "ai" }>
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isStartLoading, setIsStartLoading] = useState(false);

  const startInteraction = async () => {
    if (isStartLoading) return;
    setIsStartLoading(true);
    try {
      // Send empty string to get first question
      console.log(params.id);
      const response = await interactionClient.interact(
        params.id as string,
        "",
        true,
      );
      if (response?.message) {
        setCurrentQuestion(response.message);
        speakText(response.message);
        // Add the first AI message to chat
        setMessages([{ text: response.message, sender: "ai" }]);
      }
    } catch (err) {
      toast.error("Failed to start interaction");
      setError("Failed to start interaction");
    } finally {
      setIsStartLoading(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    try {
      // Add user's speech to messages
      setMessages((prev) => [...prev, { text: answer, sender: "user" }]);

      const response = await interactionClient.interact(
        params.id as string,
        answer,
      );
      if (response?.message) {
        setCurrentQuestion(response.message);
        speakText(response.message);
        // Add AI's response to messages
        setMessages((prev) => [
          ...prev,
          { text: response.message, sender: "ai" },
        ]);
      }
      if (!response?.shouldContinue) {
        // Handle end of conversation
        if (response?.decision === "passed") {
          setError("accepted");
        } else if (response?.decision === "failed") {
          setError("denied");
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="relative flex flex-col bg-black overflow-hidden h-[100vh] min-h-[600px]">
      {/* Upper side - Spline */}
      <Spline
        scene="https://prod.spline.design/1m5ds9rBkE9XTil2/scene.splinecode"
        className="absolute w-[100vw] h-[100vh] pb-[200px]"
      />
      <div className="absolute w-[100vw] p-4 flex justify-end z-[9999]">
        <Image src={Connected} alt="Connected" />
      </div>
      {/* Bottom side - Chat Interface */}
      <div className="py-4 bg-black overflow-hidden z-[9999] mt-auto h-[40vh]">
        <div className="h-full flex flex-col">
          {!currentQuestion ? (
            <div className="h-full flex items-center justify-center">
              <Image
                src={Start}
                alt="Start"
                onClick={startInteraction}
                className={`py-16 ${
                  isStartLoading
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:cursor-pointer"
                }`}
              />
            </div>
          ) : error === "accepted" || error === "denied" ? (
            <div className="container mx-auto flex flex-col items-center justify-center gap-4 h-full">
              <div className="flex items-center gap-4">
                <Image
                  src={error === "accepted" ? Approval : Rejection}
                  alt="Icon"
                />
                <h3
                  className={`uppercase text-2xl ${
                    error === "accepted" ? "text-[#6CD000]" : "text-[#FF8585]"
                  }`}
                >
                  {error === "accepted" ? "WELL DONE!" : "NOT TODAY!"}
                </h3>
                <Image
                  src={error === "accepted" ? Approval : Rejection}
                  alt="Icon"
                />
              </div>
              <p
                className={`text-center w-[80vw] uppercase ${
                  error === "accepted" ? "text-[#6CD000]" : "text-[#FF8585]"
                } sm:w-[40vw]`}
              >
                {error === "accepted"
                  ? "We are glad to have you in our community - your support is crucial to us."
                  : "You failed the vibe test, which is essential to be part of this community. do your own research and try again."}
              </p>
              <Link href="/">
                <h3>CLOSE</h3>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Chat messages */}
              <div className="flex-1 mb-4 space-y-2 overflow-y-hidden relative">
                {/* Gradient overlay */}
                <div
                  className={`absolute top-0 left-0 right-0 ${
                    messages.length > 2 ? "h-56" : "h-0"
                  } bg-gradient-to-b from-black to-transparent z-10`}
                />
                {messages.map((message, index) => (
                  <div key={index} className={`flex`}>
                    <div
                      className={`max-w-[80%] container mx-auto flex items-center gap-2 ${
                        message.sender === "user"
                          ? " text-white flex-row-reverse"
                          : " text-[#FF8585] justify-start"
                      }`}
                    >
                      {message.sender === "user" ? (
                        <Image src={SpeakerIcon} alt="Speaker" />
                      ) : (
                        <Image src={BouncerIcon} alt="Bouncer" />
                      )}
                      {message.sender === "ai"
                        ? message.text.toUpperCase()
                        : message.text}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Microphone button */}
              <div className="flex justify-center my-4 flex-col items-center">
                <button
                  onClick={isListening ? stopListening : startAnswering}
                  disabled={isPlaying}
                  className={`p-4 rounded-full  text-white transition-colors`}
                >
                  {isListening ? (
                    <Image src={StopSpeaker} alt="Stop" />
                  ) : isPlaying ? (
                    <Image src={DefaultSpeaker} alt="Default" />
                  ) : (
                    <Image src={StartSpeaker} alt="Start" />
                  )}
                </button>
                {!isListening && !isPlaying && messages.length > 0 && (
                  <p className="text-gray-300 text-center text-sm mt-2">
                    Click to start talking
                  </p>
                )}
                {isListening && (
                  <p className="text-green-500 text-center text-sm mt-2">
                    Listening...
                  </p>
                )}
                {isPlaying && (
                  <p className="text-gray-300 text-center text-sm mt-2">
                    Please wait...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SpeechInterface;
