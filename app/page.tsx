"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { Send, Bot, User, AlertCircle, Loader2 } from "lucide-react";

// সঠিক URLs - আপনার নিজের domain ব্যবহার করুন
const ASK_API_URL = "/api/ask";
const HEALTH_URL = "/api/health";

type TableData = {
  headers: string[];
  rows: string[][];
};

type Message = {
  id: number;
  text: string;
  sender: "me" | "them";
  time: string;
  isLoading?: boolean;
  isError?: boolean;
  tableData?: TableData;
};

const formatMessage = (text: string): { isTable: boolean; tableData?: TableData; html?: string } => {
  // Check if the message contains a markdown table
  const tableRegex = /\|(.+)\|[\s]*\n\|(?:[-]+\|)+[\s]*\n((?:\|.+\|[\s]*\n?)*)/g;
  const tableMatch = tableRegex.exec(text);
  
  if (tableMatch) {
    // Parse the table
    const headerRow = tableMatch[1].split('|').map(cell => cell.trim()).filter(cell => cell);
    const bodyRows = tableMatch[2].split('\n')
      .filter(row => row.trim().startsWith('|'))
      .map(row => row.split('|').map(cell => cell.trim()).filter(cell => cell));
    
    return {
      isTable: true,
      tableData: {
        headers: headerRow,
        rows: bodyRows
      }
    };
  }
  
  // Regular text formatting
  return {
    isTable: false,
    html: text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  };
};

// Table Component for rendering product data
const ProductTable = ({ headers, rows }: { headers: string[], rows: string[][] }) => {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-700/50 bg-gray-800/30">
      <table className="w-full min-w-[600px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-700/50 bg-gray-800/80">
            {headers.map((header, index) => (
              <th 
                key={index} 
                className={`px-4 py-3 text-left font-semibold text-gray-200 ${
                  index === 1 ? 'w-[60%]' : 'w-[20%]'
                }`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr 
              key={rowIndex} 
              className={`border-b border-gray-700/50 transition-colors hover:bg-gray-700/30 ${
                rowIndex % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-800/40'
              }`}
            >
              {row.map((cell, cellIndex) => (
                <td 
                  key={cellIndex} 
                  className={`px-4 py-3 text-gray-300 ${
                    cellIndex === 1 ? 'font-medium text-gray-100' : 'font-mono'
                  }`}
                >
                  {cellIndex === 1 ? (
                    <div className="flex items-center gap-2">
              
                      {cell}
                    </div>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Summary Cards for better visualization */}
      {rows.length > 0 && (
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-gray-700/50">
          <div className="rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-600/10 p-3 border border-green-500/20">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-xl font-bold text-white">{rows.length}</p>
          </div>
      
      
        </div>
      )}
    </div>
  );
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  const sendMessageToAPI = async (question: string): Promise<string> => {
    try {
      console.log('Sending request to:', ASK_API_URL);
      
      const response = await fetch(ASK_API_URL, {
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputMessage,
      sender: "me",
      time: getCurrentTime(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    const loadingId = Date.now() + 1;
    setMessages(prev => [...prev, {
      id: loadingId,
      text: "",
      sender: "them",
      time: getCurrentTime(),
      isLoading: true,
    }]);

    try {
      const answer = await sendMessageToAPI(inputMessage);
      
      // Check if the answer contains a table and parse it
      const formattedContent = formatMessage(answer);
      
      setMessages(prev => 
        prev.map(msg => {
          if (msg.id === loadingId) {
            if (formattedContent.isTable && formattedContent.tableData) {
              return {
                ...msg,
                text: answer,
                isLoading: false,
                tableData: formattedContent.tableData
              };
            } else {
              return {
                ...msg,
                text: answer,
                isLoading: false
              };
            }
          }
          return msg;
        })
      );
    } catch (error) {
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
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Health check
  useEffect(() => {
    const checkHealth = async () => {
      try {
        console.log('Checking health at:', HEALTH_URL);
        
        const response = await fetch(HEALTH_URL);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Health check response:', data);
          setIsConnected(data.status === "ok");
        } else {
          setIsConnected(false);
        }
      } catch (error) {
        console.error('Health check failed:', error);
        setIsConnected(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const renderMessageContent = (msg: Message) => {
    if (msg.isLoading) {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-green-500" />
          <span className="text-sm text-gray-400">DataBot is thinking...</span>
        </div>
      );
    }

    if (msg.tableData) {
      return <ProductTable headers={msg.tableData.headers} rows={msg.tableData.rows} />;
    }

    const formattedContent = formatMessage(msg.text);
    return (
      <>
        {formattedContent.html && (
          <p 
            className="text-[15px] leading-relaxed whitespace-pre-wrap" 
            dangerouslySetInnerHTML={{ __html: formattedContent.html }} 
          />
        )}
        <span className="mt-1 block text-right text-[10px] opacity-50">
          {msg.time}
        </span>
      </>
    );
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-gray-900 to-gray-950 text-white">
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
        
        {isConnected === false && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 border border-red-500/20">
            <AlertCircle className="h-4 w-4" />
            <span>Server unreachable</span>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`mb-6 flex ${msg.sender === "me" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div className={`flex max-w-[90%] items-end gap-2 ${msg.sender === "me" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  msg.sender === "me" 
                    ? "bg-gradient-to-br from-blue-500 to-blue-600" 
                    : "bg-gradient-to-br from-green-500 to-emerald-600"
                } shadow-lg`}>
                  {msg.sender === "me" ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-white" />
                  )}
                </div>

                <div
                  className={`group relative rounded-2xl ${
                    msg.sender === "me"
                      ? "rounded-br-none bg-gradient-to-br from-blue-500 to-blue-600 text-white px-4 py-3"
                      : msg.isError
                      ? "rounded-bl-none bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20 text-gray-200 px-4 py-3"
                      : msg.isLoading
                      ? "rounded-bl-none bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 px-4 py-3"
                      : msg.tableData
                      ? "rounded-bl-none bg-transparent border-0 p-0"
                      : "rounded-bl-none bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 px-4 py-3"
                  }`}
                >
                  {renderMessageContent(msg)}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="border-t border-gray-800/50 bg-gray-900/50 px-4 py-4 backdrop-blur-xl">
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
        </div>
      </footer>
    </div>
  );
}