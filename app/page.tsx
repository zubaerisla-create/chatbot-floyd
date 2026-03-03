// app/components/ChatInterface.tsx
"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import Image from "next/image";
import { Send, Bot, User, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

// Dummy profile picture (replace with real URL or local asset)
const PROFILE_PIC = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80";
const API_URL = "http://10.10.13.15:5000/ask";

type Message = {
  id: number;
  text: string;
  sender: "me" | "them";
  time: string;
  isLoading?: boolean;
  isError?: boolean;
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I'm DataBot, your business assistant. Ask me anything about your sales, products, inventory, partners, or other business data — in English or French.",
      sender: "them",
      time: getCurrentTime(),
    },
  ]);
  
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Helper function to get current time
  function getCurrentTime(): string {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  }

  // Function to send message to API
  const sendMessageToAPI = async (question: string): Promise<string> => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();
      return data.answer || "I couldn't process that request. Please try asking in a different way.";
    } catch (error) {
      console.error('Error calling API:', error);
      throw error;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputMessage,
      sender: "me",
      time: getCurrentTime(),
    };

    // Add user message
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    // Add loading message
    const loadingId = Date.now() + 1;
    setMessages(prev => [...prev, {
      id: loadingId,
      text: "",
      sender: "them",
      time: getCurrentTime(),
      isLoading: true,
    }]);

    try {
      // Get response from API
      const answer = await sendMessageToAPI(inputMessage);

      // Replace loading message with actual response
      setMessages(prev => 
        prev.map(msg => 
          msg.id === loadingId 
            ? { ...msg, text: answer, isLoading: false }
            : msg
        )
      );
    } catch (error) {
      // Replace loading message with error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === loadingId 
            ? { 
                ...msg, 
                text: "Sorry, I'm having trouble connecting to the server. Please check your connection and try again.", 
                isLoading: false,
                isError: true 
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      // Focus input after response
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Check API health on component mount
  useEffect(() => {
    const checkAPIHealth = async () => {
      try {
        const response = await fetch('http://10.10.13.15:5000/health');
        setIsConnected(response.ok);
      } catch (error) {
        console.error('API is not accessible:', error);
        setIsConnected(false);
      }
    };

    checkAPIHealth();
    // Check health every 30 seconds
    const interval = setInterval(checkAPIHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-gray-900 to-gray-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-800/50 bg-gray-900/50 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">DataBot</h1>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isConnected === true ? 'bg-green-500 animate-pulse' : isConnected === false ? 'bg-red-500' : 'bg-yellow-500'}`} />
              <p className="text-xs text-gray-400">
                {isConnected === true ? 'Connected' : isConnected === false ? 'Disconnected' : 'Connecting...'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Connection status badge */}
        {isConnected === false && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 border border-red-500/20">
            <AlertCircle className="h-4 w-4" />
            <span>Server unreachable</span>
          </div>
        )}
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {messages.map((msg, index) => (
            <div
              key={msg.id}
              className={`mb-6 flex ${msg.sender === "me" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`flex max-w-[80%] items-end gap-2 ${msg.sender === "me" ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  msg.sender === "me" 
                    ? "bg-gradient-to-br from-blue-500 to-blue-600" 
                    : "bg-gradient-to-br from-green-500 to-emerald-600"
                } shadow-lg ${
                  msg.sender === "me" ? "shadow-blue-500/20" : "shadow-green-500/20"
                }`}>
                  {msg.sender === "me" ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-white" />
                  )}
                </div>

                {/* Message bubble */}
                <div
                  className={`group relative rounded-2xl px-4 py-3 ${
                    msg.sender === "me"
                      ? "rounded-br-none bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                      : msg.isError
                      ? "rounded-bl-none bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20 text-gray-200"
                      : msg.isLoading
                      ? "rounded-bl-none bg-gray-800/50 backdrop-blur-sm border border-gray-700/50"
                      : "rounded-bl-none bg-gray-800/50 backdrop-blur-sm border border-gray-700/50"
                  } transition-all hover:shadow-lg ${
                    msg.sender === "me" 
                      ? "hover:shadow-blue-500/20" 
                      : msg.isError
                      ? "hover:shadow-red-500/10"
                      : "hover:shadow-green-500/10"
                  }`}
                >
                  {msg.isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                      <span className="text-sm text-gray-400">DataBot is thinking...</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      <span className="mt-1 block text-right text-[10px] opacity-50">
                        {msg.time}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input area */}
      <footer className="border-t border-gray-800/50 bg-gray-900/50 px-4 py-4 backdrop-blur-xl md:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <form onSubmit={handleSubmit} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me about sales, products, inventory..."
              className="w-full rounded-2xl border border-gray-700/50 bg-gray-800/50 py-4 pl-5 pr-14 text-white placeholder:text-gray-500 focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className={`absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl transition-all ${
                isLoading || !inputMessage.trim()
                  ? 'bg-gray-700 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25 hover:shadow-green-500/40'
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Send className="h-5 w-5 text-white" />
              )}
            </button>
          </form>
          
          {/* Suggestions */}
          {messages.length === 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setInputMessage("Show me this month's sales")}
                className="rounded-full border border-gray-700/50 bg-gray-800/30 px-3 py-1.5 text-xs text-gray-400 hover:border-green-500/50 hover:bg-gray-800/50 hover:text-green-400 transition-all"
              >
                📊 This month's sales
              </button>
              <button
                onClick={() => setInputMessage("What products are low in stock?")}
                className="rounded-full border border-gray-700/50 bg-gray-800/30 px-3 py-1.5 text-xs text-gray-400 hover:border-green-500/50 hover:bg-gray-800/50 hover:text-green-400 transition-all"
              >
                📦 Low stock products
              </button>
              <button
                onClick={() => setInputMessage("Top performing partners")}
                className="rounded-full border border-gray-700/50 bg-gray-800/30 px-3 py-1.5 text-xs text-gray-400 hover:border-green-500/50 hover:bg-gray-800/50 hover:text-green-400 transition-all"
              >
                🤝 Top partners
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}