/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Search, 
  Zap, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  Check,
  ChevronRight,
  Terminal,
  Cpu,
  Fingerprint,
  Trash2,
  Clipboard
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { cn } from "./lib/utils";

// --- Types ---

interface ScanResult {
  aiProbabilityScore: number;
  classification: "Likely AI" | "Hybrid" | "Likely Human";
  keyFlags: string[];
  perplexityAnalysis: string;
  burstinessAnalysis: string;
}

interface HumanizeResult {
  rewrittenText: string;
  metricsApplied: string[];
}

// --- Constants ---

const GEMINI_MODEL = "gemini-3-flash-preview";

// --- Components ---

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-6 text-center">
          <div className="max-w-md p-8 bg-white border border-[#141414] shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="font-serif italic text-2xl mb-4">System Malfunction</h2>
            <p className="text-xs font-mono opacity-70 mb-6 leading-relaxed">
              An unexpected error has occurred. This could be due to a configuration mismatch or a runtime exception.
            </p>
            <div className="bg-red-50 p-4 border border-red-200 text-[10px] font-mono text-red-700 text-left mb-6 overflow-auto max-h-32">
              {this.state.error?.message}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-[#141414] text-[#E4E3E0] text-[11px] uppercase tracking-widest font-bold hover:bg-opacity-90 transition-all"
            >
              Restart System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- App Component ---

export default function App() {
  return (
    <ErrorBoundary>
      <LinguistApp />
    </ErrorBoundary>
  );
}

function LinguistApp() {
  const [inputText, setInputText] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [humanizeResult, setHumanizeResult] = useState<HumanizeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const apiKey = process.env.GEMINI_API_KEY;

  const getAI = () => {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please set it in your environment variables.");
    }
    return new GoogleGenAI({ apiKey });
  };

  const handleScan = async () => {
    if (!inputText.trim()) return;
    setIsScanning(true);
    setError(null);
    setScanResult(null);
    setHumanizeResult(null);

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [{ text: `Analyze the following text for AI signatures (Perplexity, Burstiness, AI-specific vocabulary). 
            Return the analysis in JSON format with the following schema:
            {
              "aiProbabilityScore": number (0-100),
              "classification": "Likely AI" | "Hybrid" | "Likely Human",
              "keyFlags": string[],
              "perplexityAnalysis": string,
              "burstinessAnalysis": string
            }
            
            Text to analyze:
            ${inputText}` }]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              aiProbabilityScore: { type: Type.NUMBER },
              classification: { type: Type.STRING, enum: ["Likely AI", "Hybrid", "Likely Human"] },
              keyFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
              perplexityAnalysis: { type: Type.STRING },
              burstinessAnalysis: { type: Type.STRING }
            },
            required: ["aiProbabilityScore", "classification", "keyFlags", "perplexityAnalysis", "burstinessAnalysis"]
          }
        }
      });

      const result = JSON.parse(response.text);
      setScanResult(result);
    } catch (err) {
      console.error("Scan failed:", err);
      setError("Failed to analyze text. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleHumanize = async () => {
    if (!inputText.trim()) return;
    setIsHumanizing(true);
    setError(null);

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [{ text: `You are an Advanced Linguistic Forensic Analyst and Content Stylist. 
            Humanize the following text while maintaining constructive flow and logical depth. Use these "Humanity Metrics" with precision:
            1. RHYTHMIC VARIATION: Use a dynamic mix of sentence lengths. Short sentences or "Bridge Fragments" (e.g., "Here's the thing.", "But wait.") should be used sparingly to emphasize points or pivot ideas, not just as filler.
            2. CONSTRUCTIVE SUBSTANCE: Ensure the "Long" sentences are rich in detail, carry the main argument forward, and maintain high readability.
            3. SEMANTIC SHIFTING: Replace overly formal "AI-speak" with natural, colloquial phrasing. Use "Hedging Language" (e.g., "I'm inclined to think," "It feels like") to show human nuance and uncertainty.
            4. ANECDOTAL INJECTION: Integrate placeholders for personal perspective (e.g., "[In my experience...]") where it adds value to the narrative flow.
            
            Return the result in JSON format:
            {
              "rewrittenText": string,
              "metricsApplied": string[]
            }
            
            Text to humanize:
            ${inputText}` }]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              rewrittenText: { type: Type.STRING },
              metricsApplied: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["rewrittenText", "metricsApplied"]
          }
        }
      });

      const result = JSON.parse(response.text);
      setHumanizeResult(result);
    } catch (err) {
      console.error("Humanization failed:", err);
      setError("Failed to humanize text. Please try again.");
    } finally {
      setIsHumanizing(false);
    }
  };

  const handleClear = () => {
    setInputText("");
    setScanResult(null);
    setHumanizeResult(null);
    setError(null);
  };

  const handlePaste = async () => {
    try {
      // Check if the browser supports clipboard API
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        throw new Error("Clipboard API not supported or blocked by browser security (requires HTTPS).");
      }
      const text = await navigator.clipboard.readText();
      setInputText(text);
      setError(null);
    } catch (err) {
      console.error("Paste failed:", err);
      // Automatically focus the textarea so the user can just hit Ctrl+V
      textareaRef.current?.focus();
      setError("Clipboard access is blocked by browser security in this preview. The terminal is now focused—please use Ctrl+V (Windows) or Cmd+V (Mac) to paste manually.");
    }
  };

  const copyToClipboard = () => {
    if (humanizeResult) {
      navigator.clipboard.writeText(humanizeResult.rewrittenText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header */}
      <header className="border-b border-[#141414] p-6 flex justify-between items-center bg-[#E4E3E0] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Fingerprint className="w-8 h-8" />
          <div>
            <h1 className="font-serif italic text-2xl leading-none">Linguist Forensic</h1>
            <p className="text-[10px] uppercase tracking-widest opacity-50 font-mono">Advanced Content Stylist v1.0</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          {!apiKey && (
            <div className="px-3 py-1 bg-red-100 border border-red-500 text-red-700 text-[10px] font-mono uppercase animate-pulse">
              API Key Missing
            </div>
          )}
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest opacity-50 font-mono">System Status</span>
            <span className="text-xs font-mono flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full animate-pulse", apiKey ? "bg-green-500" : "bg-red-500")} />
              {apiKey ? "Operational" : "Offline"}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input & Controls */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white border border-[#141414] rounded-sm overflow-hidden shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
            <div className="border-b border-[#141414] p-3 flex items-center justify-between bg-[#141414] text-[#E4E3E0]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-widest font-mono">Input Terminal</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePaste}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Paste from clipboard"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={handleClear}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Clear terminal"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] opacity-50 font-mono ml-2">UTF-8</span>
              </div>
            </div>
            <div className="p-4">
              <textarea
                ref={textareaRef}
                className="w-full h-[400px] bg-transparent border-none focus:ring-0 resize-none font-mono text-sm leading-relaxed placeholder:opacity-30"
                placeholder="Paste content for analysis..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>
            <div className="border-t border-[#141414] p-4 flex gap-3 bg-[#f5f5f5]">
              <button
                onClick={handleScan}
                disabled={isScanning || !inputText.trim()}
                className={cn(
                  "flex-1 py-3 px-4 border border-[#141414] text-[11px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2",
                  isScanning ? "bg-gray-200 cursor-not-allowed" : "bg-white hover:bg-[#141414] hover:text-[#E4E3E0] active:translate-y-0.5"
                )}
              >
                {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Scan & Diagnose
              </button>
              <button
                onClick={handleHumanize}
                disabled={isHumanizing || !inputText.trim()}
                className={cn(
                  "flex-1 py-3 px-4 border border-[#141414] text-[11px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2",
                  isHumanizing ? "bg-gray-200 cursor-not-allowed" : "bg-[#141414] text-[#E4E3E0] hover:bg-opacity-90 active:translate-y-0.5"
                )}
              >
                {isHumanizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Humanize
              </button>
            </div>
          </section>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border border-red-500 text-red-700 text-xs font-mono flex items-center gap-3"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-7 space-y-8">
          <AnimatePresence mode="wait">
            {/* Stage 1: Diagnosis */}
            {scanResult && (
              <motion.section
                key="scan-result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4">
                  <div className="h-[1px] flex-1 bg-[#141414] opacity-20" />
                  <h2 className="font-serif italic text-xl">Stage 1: Diagnosis</h2>
                  <div className="h-[1px] flex-1 bg-[#141414] opacity-20" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 bg-white border border-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase tracking-widest opacity-50 font-mono mb-2">AI Probability</span>
                    <span className="text-4xl font-mono font-bold">{scanResult.aiProbabilityScore}%</span>
                  </div>
                  <div className="p-6 bg-white border border-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase tracking-widest opacity-50 font-mono mb-2">Classification</span>
                    <span className={cn(
                      "text-lg font-bold uppercase tracking-tight",
                      scanResult.classification === "Likely AI" ? "text-red-600" : 
                      scanResult.classification === "Hybrid" ? "text-orange-600" : "text-green-600"
                    )}>
                      {scanResult.classification}
                    </span>
                  </div>
                  <div className="p-6 bg-white border border-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase tracking-widest opacity-50 font-mono mb-2">Flags Detected</span>
                    <span className="text-4xl font-mono font-bold">{scanResult.keyFlags.length}</span>
                  </div>
                </div>

                <div className="bg-white border border-[#141414] p-6 space-y-6">
                  <div>
                    <h3 className="text-[11px] uppercase tracking-widest font-bold font-mono mb-3 flex items-center gap-2">
                      <Cpu className="w-3 h-3" /> Key Flags & Patterns
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {scanResult.keyFlags.map((flag, i) => (
                        <span key={i} className="px-2 py-1 bg-[#141414] text-[#E4E3E0] text-[10px] font-mono uppercase">
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-serif italic text-sm mb-2">Perplexity Analysis</h4>
                      <p className="text-xs leading-relaxed opacity-70">{scanResult.perplexityAnalysis}</p>
                    </div>
                    <div>
                      <h4 className="font-serif italic text-sm mb-2">Burstiness Analysis</h4>
                      <p className="text-xs leading-relaxed opacity-70">{scanResult.burstinessAnalysis}</p>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {/* Stage 2: Humanization */}
            {humanizeResult && (
              <motion.section
                key="humanize-result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4">
                  <div className="h-[1px] flex-1 bg-[#141414] opacity-20" />
                  <h2 className="font-serif italic text-xl">Stage 2: Humanization</h2>
                  <div className="h-[1px] flex-1 bg-[#141414] opacity-20" />
                </div>

                <div className="bg-[#151619] text-white rounded-lg overflow-hidden shadow-2xl border border-white/10">
                  <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-green-400" />
                      <span className="text-[10px] uppercase tracking-widest font-mono">Stylized Output</span>
                    </div>
                    <button 
                      onClick={copyToClipboard}
                      className="p-2 hover:bg-white/10 rounded-md transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 opacity-50" />}
                    </button>
                  </div>
                  <div className="p-8">
                    <div className="prose prose-invert prose-sm max-w-none font-serif leading-relaxed text-gray-300">
                      <ReactMarkdown>{humanizeResult.rewrittenText}</ReactMarkdown>
                    </div>
                  </div>
                  <div className="p-4 border-t border-white/10 bg-black/20 flex flex-wrap gap-4">
                    {humanizeResult.metricsApplied.map((metric, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        <span className="text-[9px] uppercase tracking-widest font-mono opacity-60">{metric}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="px-6 py-3 border border-dashed border-[#141414] rounded-full flex items-center gap-3">
                    <User className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Verification Passed: Humanity Detected</span>
                  </div>
                </div>
              </motion.section>
            )}

            {/* Empty State */}
            {!scanResult && !humanizeResult && !isScanning && !isHumanizing && (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-center py-20">
                <Fingerprint className="w-24 h-24 mb-4" />
                <p className="font-serif italic text-xl">Awaiting Data Input</p>
                <p className="text-[10px] uppercase tracking-widest font-mono">System Idle / Ready for Scan</p>
              </div>
            )}

            {/* Loading State */}
            {(isScanning || isHumanizing) && (
              <div className="h-full flex flex-col items-center justify-center py-20">
                <div className="relative">
                  <div className="w-24 h-24 border-2 border-[#141414] border-t-transparent rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Cpu className="w-8 h-8 animate-pulse" />
                  </div>
                </div>
                <p className="mt-8 font-serif italic text-xl">
                  {isScanning ? "Analyzing Signatures..." : "Applying Humanity Metrics..."}
                </p>
                <div className="mt-4 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ repeat: Infinity, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 bg-[#141414] rounded-full"
                    />
                  ))}
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-[#141414] p-8 text-center">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-mono">
            © 2026 Linguistic Forensic Lab / Secure Content Styling
          </p>
          <div className="flex gap-6">
            <span className="text-[10px] uppercase tracking-widest font-bold font-mono">Privacy Protocol: Active</span>
            <span className="text-[10px] uppercase tracking-widest font-bold font-mono">Encryption: AES-256</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
