/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from "react";
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
  Clipboard,
  Download,
  History,
  Info,
  Scan
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "motion/react";
import ReactMarkdown from "react-markdown";
import { cn } from "./lib/utils";

// --- Types ---

interface ScanResult {
  aiProbabilityScore: number;
  classification: "Likely AI" | "Hybrid" | "Likely Human";
  keyFlags: string[];
  perplexityAnalysis: string;
  burstinessAnalysis: string;
  scentDetection?: string[]; // AI-isms detected
}

interface HumanizeResult {
  rewrittenText: string;
  metricsApplied: string[];
}

interface ForensicSession {
  id: string;
  timestamp: number;
  inputText: string;
  scanResult?: ScanResult;
  humanizeResult: HumanizeResult;
}

// --- Constants ---

const GEMINI_MODEL = "gemini-3-flash-preview";

// --- Components ---

const RollingNumber = ({ value, duration = 2 }: { value: number; duration?: number }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, value, { duration, ease: "easeOut" });
    return controls.stop;
  }, [value, duration]);

  return <motion.span>{rounded}</motion.span>;
};

const TypewriterText = ({ text, onComplete }: { text: string; onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, Math.random() * 30 + 10); // Variable speed
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, onComplete]);

  return <ReactMarkdown>{displayedText}</ReactMarkdown>;
};

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
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6 text-center text-[var(--ink)]">
          <div className="max-w-md p-8 bg-surface backdrop-blur-xl border border-[var(--border)] rounded-2xl shadow-2xl">
            <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
            <h2 className="font-serif italic text-2xl mb-4">System Malfunction</h2>
            <p className="text-xs font-mono opacity-70 mb-6 leading-relaxed">
              An unexpected error has occurred. This could be due to a configuration mismatch or a runtime exception.
            </p>
            <div className="bg-danger/10 p-4 border border-danger/30 text-[10px] font-mono text-danger text-left mb-6 overflow-auto max-h-32 rounded-lg">
              {this.state.error?.message}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-accent text-[#050505] text-[11px] uppercase tracking-widest font-bold rounded-xl hover:brightness-110 transition-all"
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
      <InvisifyApp />
    </ErrorBoundary>
  );
}

function InvisifyApp() {
  const [inputText, setInputText] = useState("");
  const [scannedText, setScannedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [phase, setPhase] = useState<"idle" | "probe" | "analysis" | "synthesis">("idle");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [humanizeResult, setHumanizeResult] = useState<HumanizeResult | null>(null);
  const [isOrganizeEnabled, setIsOrganizeEnabled] = useState(false);
  const [history, setHistory] = useState<ForensicSession[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const apiKey = process.env.GEMINI_API_KEY;

  // Reset results if input changes after a scan
  useEffect(() => {
    if (!isProcessing && (scanResult || humanizeResult) && inputText !== scannedText) {
      setScanResult(null);
      setHumanizeResult(null);
      setPhase("idle");
    }
  }, [inputText, scannedText, isProcessing]);

  // Safety net: stop processing if input is cleared manually or via keyboard
  useEffect(() => {
    if (isProcessing && !inputText.trim()) {
      handleClear();
    }
  }, [inputText, isProcessing]);

  useEffect(() => {
    // Load history from localStorage
    const savedHistory = localStorage.getItem("invisify_history");
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    // PWA Install Prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      abortControllerRef.current?.abort();
    };
  }, []);

  const saveToHistory = (session: ForensicSession) => {
    const newHistory = [session, ...history].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem("invisify_history", JSON.stringify(newHistory));
  };

  const getAI = () => {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please set it in your environment variables.");
    }
    return new GoogleGenAI({ apiKey });
  };

  const handleScan = async () => {
    if (!inputText.trim()) return;
    
    // Abort any previous process
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const { signal } = controller;

    setIsProcessing(true);
    setPhase("probe");
    setError(null);
    setScanResult(null);
    setHumanizeResult(null);

    try {
      const ai = getAI();
      
      // Phase A: The Probe (Laser Scan)
      const startTime = Date.now();
      
      const scanResponse = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: `You are a Forensic Linguistic Analyst. Perform a deep-scan of the provided text to identify 'Robotic Traces' (AI signatures). 

CRITICAL: Distinguish between 'high-quality human writing' and 'AI-generated uniformity'. 

Analyze:
1. PERPLEXITY (Word Choice Variance): Does the text use statistically predictable word patterns? AI tends to choose the most likely next word, leading to low perplexity.
2. BURSTINESS (Sentence Rhythm): Does the text have a uniform sentence length and structure? AI often produces 'balanced' sentences of similar length. Human writing is 'bursty'—mixing short, punchy sentences with longer, complex ones.
3. SCENT DETECTION (AI-isms): Look for repetitive transitions ('Furthermore', 'Moreover'), overly polite or neutral tone, and a lack of idiomatic or colloquial flow.
4. STRUCTURAL SYMMETRY: AI often creates perfectly symmetrical paragraphs. Humans are more irregular.

Return JSON: { 
  "aiProbabilityScore": number (0-100), 
  "classification": "Likely AI" | "Hybrid" | "Likely Human", 
  "keyFlags": string[], 
  "perplexityAnalysis": string, 
  "burstinessAnalysis": string, 
  "scentDetection": string[] 
}. 

Text to analyze: ${inputText}` }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              aiProbabilityScore: { type: Type.NUMBER },
              classification: { type: Type.STRING },
              keyFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
              perplexityAnalysis: { type: Type.STRING },
              burstinessAnalysis: { type: Type.STRING },
              scentDetection: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["aiProbabilityScore", "classification", "keyFlags", "perplexityAnalysis", "burstinessAnalysis", "scentDetection"]
          }
        }
      });

      if (signal.aborted) return;

      const sResult = JSON.parse(scanResponse.text);

      // Ensure minimum scanning duration (2s)
      const elapsed = Date.now() - startTime;
      if (elapsed < 2000) {
        await new Promise(r => setTimeout(r, 2000 - elapsed));
      }

      if (signal.aborted) return;

      // Transition to Phase B: Forensic Analysis
      setPhase("analysis");
      setScanResult(sResult);
      setScannedText(inputText);

      // Wait a bit for the rolling number animation
      await new Promise(r => setTimeout(r, 2500));

    } catch (err: any) {
      if (signal.aborted) return;
      console.error("Forensic scan failed:", err);
      setError(`Scan failed: ${err.message || "An unexpected error occurred."}`);
      setPhase("idle");
    } finally {
      if (abortControllerRef.current === controller || abortControllerRef.current === null) {
        setIsProcessing(false);
      }
    }
  };

  const handleHumanize = async () => {
    if (!inputText.trim() || !scanResult) return;

    // Abort any previous process
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const { signal } = controller;

    setIsProcessing(true);
    setPhase("synthesis");
    setError(null);
    setHumanizeResult(null);

    try {
      const ai = getAI();
      
      const humanizeResponse = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: `You are a Master Stylist and Forensic Eraser. Your task is to 'Invisify' the provided text—completely erasing the robotic trace while maintaining 100% structural fidelity and meaning.

CRITICAL OBJECTIVE: The output must bypass a deep forensic linguistic scan. 

STRATEGIES FOR ERASURE:
1. MAXIMIZE BURSTINESS: Deliberately vary sentence length and structure. Mix short, punchy sentences with longer, more complex ones. Avoid the 'robotic rhythm' of medium-length, perfectly balanced sentences.
2. INCREASE PERPLEXITY: Use more diverse and less predictable vocabulary. Avoid the most 'statistically likely' word choices that AI models prefer.
3. ELIMINATE AI-ISMS: Remove common AI transition words (e.g., 'Furthermore', 'Moreover', 'In conclusion', 'Additionally', 'It is important to note'). Replace them with more natural, conversational, or varied transitions.
4. HUMAN RHYTHM: Introduce subtle human-like 'jitter'. This includes starting some sentences with 'And' or 'But' where natural, using contractions consistently, and varying the tempo of the prose.
5. NO FLUFF: Do not turn it into a story or add unnecessary narrative flourishes. Keep the original tone and intent.
6. PRESERVE JITTER: If the input text already shows signs of human-like jitter (burstiness, varied sentence lengths), DO NOT smooth it out. Instead, enhance the natural flow while maintaining the 'invisified' state.

${isOrganizeEnabled ? `
INTELLIGENT FORMATTING (ORGANIZE) ENABLED:
- Use Markdown to intelligently format the output for maximum readability.
- Apply semantic headings (h1, h2, h3) to structure the content logically.
- Use **bold** ONLY for semantic headings (h1, h2, h3) and sub-headings.
- DO NOT use bold inside paragraphs, list items, or any other body text.
- Use Roman numerals (I, II, III), numbers (1, 2, 3), or bullet points for lists where appropriate.
- Use _italics_ for subtle emphasis, specialized terminology, or citations.
- The formatting must feel natural and enhance the document's professional flow.
` : ''}
Return JSON: { 
  "rewrittenText": string, 
  "metricsApplied": string[] 
}. 

Text to humanize: ${inputText}` }] }],
        config: {
          temperature: 1.2,
          topP: 0.95,
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

      if (signal.aborted) return;

      const hResult = JSON.parse(humanizeResponse.text);

      setHumanizeResult(hResult);

      // Save to history
      saveToHistory({
        id: Date.now().toString(),
        timestamp: Date.now(),
        inputText,
        scanResult: scanResult,
        humanizeResult: hResult
      });

      // Show install prompt after first success
      if (deferredPrompt && history.length === 0) {
        setShowInstallPrompt(true);
      }

    } catch (err: any) {
      if (signal.aborted) return;
      console.error("Humanization failed:", err);
      setError(`Humanization failed: ${err.message || "An unexpected error occurred."}`);
      setPhase("analysis");
    } finally {
      if (abortControllerRef.current === controller || abortControllerRef.current === null) {
        setIsProcessing(false);
      }
    }
  };

  const handleJustOrganize = async () => {
    if (!inputText.trim()) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const { signal } = controller;

    setIsProcessing(true);
    setPhase("synthesis");
    setError(null);
    setHumanizeResult(null);
    setScanResult(null);

    try {
      const ai = getAI();
      
      const organizeResponse = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: `You are a Master Document Architect. Your task is to intelligently format and organize the provided text for maximum readability and professional flow.
DO NOT rewrite the content to 'humanize' it or change the wording significantly. Focus ONLY on structure and formatting.
- Use Markdown to intelligently format the output.
- Apply semantic headings (h1, h2, h3) to structure the content logically.
- Use **bold** ONLY for semantic headings (h1, h2, h3) and sub-headings.
- DO NOT apply bold inside paragraphs, list items, or any other body text.
- Use Roman numerals (I, II, III), numbers (1, 2, 3), or bullet points for lists where appropriate.
- Use _italics_ for specialized terminology or citations if necessary.
- The formatting must feel natural and enhance the document's professional flow.

Return JSON: { 
  "rewrittenText": string, 
  "metricsApplied": string[] 
}. 

Text to organize: ${inputText}` }] }],
        config: {
          temperature: 1.1,
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

      if (signal.aborted) return;

      const hResult = JSON.parse(organizeResponse.text);
      setHumanizeResult(hResult);

      saveToHistory({
        id: Date.now().toString(),
        timestamp: Date.now(),
        inputText,
        humanizeResult: hResult
      });

    } catch (err: any) {
      if (signal.aborted) return;
      console.error("Organization failed:", err);
      setError(`Organization failed: ${err.message || "An unexpected error occurred."}`);
      setPhase("idle");
    } finally {
      if (abortControllerRef.current === controller || abortControllerRef.current === null) {
        setIsProcessing(false);
      }
    }
  };

  const handleClear = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setInputText("");
    setScannedText("");
    setScanResult(null);
    setHumanizeResult(null);
    setError(null);
    setPhase("idle");
    setIsProcessing(false);
  };

  const handlePaste = async () => {
    handleClear();
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        throw new Error("Clipboard API restricted.");
      }
      const text = await navigator.clipboard.readText();
      setInputText(text);
      setError(null);
    } catch (err) {
      textareaRef.current?.focus();
      setError("Clipboard access restricted. The terminal is focused—paste manually.");
    }
  };

  const copyToClipboard = () => {
    if (humanizeResult) {
      navigator.clipboard.writeText(humanizeResult.rewrittenText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
      setShowInstallPrompt(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] font-sans selection:bg-accent selection:text-[var(--bg)] overflow-x-hidden pb-32">
      {/* Cinematic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: isProcessing ? [1, 1.1, 1] : 1,
            opacity: isProcessing ? [0.05, 0.1, 0.05] : 0.05
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent blur-[120px] rounded-full" 
        />
        <motion.div 
          animate={{ 
            scale: isProcessing ? [1, 1.2, 1] : 1,
            opacity: isProcessing ? [0.05, 0.08, 0.05] : 0.05
          }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
          className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent blur-[120px] rounded-full" 
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        
        {/* Scanning Grid Overlay */}
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[linear-gradient(var(--color-accent)_1px,transparent_1px),linear-gradient(90deg,var(--color-accent)_1px,transparent_1px)] bg-[size:40px_40px] opacity-[0.05]"
          />
        )}
      </div>

      {/* Header */}
      <header className="p-6 flex justify-between items-center sticky top-0 z-50 backdrop-blur-md border-b border-[var(--border)] bg-[var(--glass)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(0,180,216,0.3)] dark:shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            <Fingerprint className="w-6 h-6 text-[#050505]" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight uppercase">Invisify</h1>
            <p className="text-[9px] uppercase tracking-[0.2em] text-accent font-mono">Robotic Trace Erasure</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-widest opacity-40 font-mono">Forensic Link</span>
            <span className="text-[10px] font-mono flex items-center gap-2">
              <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", apiKey ? "bg-accent" : "bg-danger")} />
              {apiKey ? "Secure" : "Offline"}
            </span>
          </div>
          <button 
            onClick={() => setShowHistory(true)}
            className="p-2 hover:bg-surface rounded-full transition-colors"
          >
            <History className="w-5 h-5 opacity-40" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8 relative z-10">
        {/* Input Terminal */}
        <section className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 to-transparent rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
          <div className="relative bg-surface backdrop-blur-xl border border-[var(--border)] rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-surface">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-accent" />
                <span className="text-[10px] uppercase tracking-widest font-mono opacity-60">Forensic Input</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handlePaste} className="p-2 hover:bg-[var(--border)] rounded-lg transition-colors flex items-center gap-2" title="Paste">
                  <Clipboard className="w-4 h-4 opacity-40" />
                  <span className="text-[10px] font-mono opacity-40 hidden sm:inline uppercase">Paste</span>
                </button>
                <button onClick={handleClear} className="p-2 hover:bg-[var(--border)] rounded-lg transition-colors flex items-center gap-2" title="Clear">
                  <Trash2 className="w-4 h-4 opacity-40" />
                  <span className="text-[10px] font-mono opacity-40 hidden sm:inline uppercase">Clear</span>
                </button>
              </div>
            </div>
            
            <div className="relative">
              <textarea
                ref={textareaRef}
                className="w-full h-[300px] sm:h-[400px] bg-transparent p-6 border-none focus:ring-0 resize-none font-mono text-sm leading-relaxed placeholder:opacity-20 text-[var(--ink)]/90"
                placeholder="Initialize forensic scan..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />

              {/* Paste Overlay for Empty State */}
              {!inputText && !isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <button 
                    onClick={handlePaste}
                    className="pointer-events-auto flex flex-col items-center gap-4 opacity-20 hover:opacity-40 transition-opacity"
                  >
                    <div className="w-16 h-16 border border-dashed border-white/40 rounded-full flex items-center justify-center">
                      <Clipboard className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.3em]">Tap to Paste Forensic Data</span>
                  </button>
                </div>
              )}
              
              {/* Scanner Animation Overlay */}
              <AnimatePresence>
                {isProcessing && (
                  <motion.div 
                    key="scanner-container"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-30"
                  >
                    {/* Laser Scan Line */}
                    <motion.div
                      initial={{ top: 0 }}
                      animate={{ top: "100%" }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 right-0 h-[2px] bg-accent shadow-[0_0_15px_var(--color-accent),0_0_30px_var(--color-accent)] z-20"
                    />
                    {/* Processing Overlay */}
                    <div className="absolute inset-0 bg-accent/5 flex items-center justify-center backdrop-blur-[2px]">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                        <motion.span
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="text-[10px] font-mono uppercase tracking-[0.3em] text-accent text-center px-6"
                        >
                          {phase === "probe" && "Probing Linguistic DNA..."}
                          {phase === "analysis" && "Forensic Analysis in Progress..."}
                          {phase === "synthesis" && "Synthesizing Humanized Trace..."}
                        </motion.span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-4 bg-danger/10 border border-danger/30 rounded-xl text-danger text-xs font-mono flex items-center gap-3"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Pipeline */}
        <AnimatePresence>
          {/* Phase B: Forensic Analysis */}
          {scanResult && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-6 bg-surface backdrop-blur-xl border border-[var(--border)] rounded-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-[9px] uppercase tracking-widest opacity-40 font-mono mb-2">Humanity</span>
                  <div className="text-3xl font-mono font-bold text-accent flex items-baseline">
                    <RollingNumber value={100 - scanResult.aiProbabilityScore} />
                    <span className="text-sm ml-1 opacity-50">%</span>
                  </div>
                </div>
                <div className="p-6 bg-surface backdrop-blur-xl border border-[var(--border)] rounded-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-[9px] uppercase tracking-widest opacity-40 font-mono mb-2">AI Index</span>
                  <div className="text-3xl font-mono font-bold text-danger flex items-baseline">
                    <RollingNumber value={scanResult.aiProbabilityScore} />
                    <span className="text-sm ml-1 opacity-50">%</span>
                  </div>
                </div>
                <div className="p-6 bg-surface backdrop-blur-xl border border-[var(--border)] rounded-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-[9px] uppercase tracking-widest opacity-40 font-mono mb-2">Origin</span>
                  <span className={cn(
                    "text-sm font-bold uppercase tracking-tight",
                    scanResult.classification === "Likely AI" ? "text-danger" : 
                    scanResult.classification === "Hybrid" ? "text-warning" : "text-accent"
                  )}>
                    {scanResult.classification}
                  </span>
                </div>
                <div className="p-6 bg-surface backdrop-blur-xl border border-[var(--border)] rounded-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-[9px] uppercase tracking-widest opacity-40 font-mono mb-2">Scents</span>
                  <span className="text-3xl font-mono font-bold">{scanResult.scentDetection?.length || 0}</span>
                </div>
              </div>

              {/* Scent Detection Details */}
              {scanResult.scentDetection && scanResult.scentDetection.length > 0 && (
                <div className="bg-surface backdrop-blur-xl border border-[var(--border)] rounded-2xl p-6">
                  <h3 className="text-[10px] uppercase tracking-widest font-bold font-mono text-accent mb-4 flex items-center gap-2">
                    <Scan className="w-3 h-3" /> AI-isms Detected (Scents)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {scanResult.scentDetection.map((scent, i) => (
                      <span key={i} className="px-3 py-1.5 bg-surface border border-[var(--border)] rounded-full text-[10px] font-mono text-[var(--ink)]/70">
                        {scent}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Proceed to Humanize Action */}
              {!humanizeResult && !isProcessing && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-surface border border-[var(--border)] rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        isOrganizeEnabled ? "bg-accent/20 text-accent" : "bg-white/5 text-white/20"
                      )}>
                        <Terminal className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest">Organize Output</h4>
                        <p className="text-[9px] opacity-40 font-mono">Intelligent formatting & structure</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsOrganizeEnabled(!isOrganizeEnabled)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        isOrganizeEnabled ? "bg-accent" : "bg-white/10"
                      )}
                    >
                      <motion.div 
                        animate={{ x: isOrganizeEnabled ? 26 : 4 }}
                        className="absolute top-1 w-4 h-4 bg-[var(--bg)] rounded-full shadow-sm"
                      />
                    </button>
                  </div>

                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleHumanize}
                    className="w-full py-6 rounded-2xl bg-accent text-[#050505] text-[11px] uppercase tracking-[0.3em] font-bold shadow-2xl shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
                  >
                    <Zap className="w-5 h-5" />
                    Proceed to Humanize
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {/* Phase C: The Synthesis */}
          {humanizeResult && (
            <motion.div
              key="synthesis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-surface backdrop-blur-xl border border-[var(--border)] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-surface">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-accent" />
                    <span className="text-[10px] uppercase tracking-widest font-mono opacity-60">Invisified Output</span>
                  </div>
                  <button onClick={copyToClipboard} className="p-2 hover:bg-[var(--border)] rounded-lg transition-colors">
                    {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4 opacity-40" />}
                  </button>
                </div>
                <div className="p-8">
                  <div className="prose prose-sm max-w-none font-serif leading-relaxed">
                    <TypewriterText text={humanizeResult.rewrittenText} />
                  </div>
                </div>
                <div className="p-4 border-t border-[var(--border)] bg-black/5 flex flex-wrap gap-4">
                  {humanizeResult.metricsApplied.map((metric, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-accent" />
                      <span className="text-[8px] uppercase tracking-widest font-mono opacity-40">{metric}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Thumb-Zone UI (Bottom Actions) */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-50 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="bg-glass backdrop-blur-2xl border border-[var(--border)] rounded-3xl p-3 shadow-2xl flex gap-3">
            {humanizeResult && (
              <button
                onClick={copyToClipboard}
                className="flex-1 py-4 rounded-2xl bg-surface border border-[var(--border)] text-[11px] uppercase tracking-widest font-bold hover:bg-[var(--border)] transition-all flex items-center justify-center active:scale-95"
              >
                {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={handleJustOrganize}
              disabled={isProcessing || !inputText.trim() || !!humanizeResult}
              className={cn(
                "flex-1 py-4 rounded-2xl bg-surface border border-[var(--border)] text-[11px] uppercase tracking-widest font-bold hover:bg-[var(--border)] transition-all flex flex-col items-center justify-center active:scale-95 disabled:opacity-50",
                humanizeResult && "hidden"
              )}
            >
              <Cpu className="w-4 h-4 mb-1" />
              <span className="text-[7px]">Organize</span>
            </button>
            <button
              onClick={scanResult && !humanizeResult ? handleHumanize : handleScan}
              disabled={isProcessing || !inputText.trim()}
              className={cn(
                "flex-[2] py-4 rounded-2xl text-[11px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-3 relative overflow-hidden group",
                isProcessing ? "bg-surface cursor-not-allowed" : "bg-accent text-[#050505] active:scale-95"
              )}
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {scanResult && !humanizeResult ? <Zap className="w-4 h-4" /> : <Scan className="w-4 h-4" />}
                  <span>{scanResult && !humanizeResult ? "Proceed to Humanize" : "Detect AI Trace"}</span>
                </>
              )}
              {!isProcessing && (
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
              )}
            </button>
            <button
              onClick={handleClear}
              className="flex-1 py-4 rounded-2xl bg-surface border border-[var(--border)] text-[11px] uppercase tracking-widest font-bold hover:bg-[var(--border)] transition-all flex items-center justify-center active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* History Drawer */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-[var(--bg)] border-l border-[var(--border)] z-[80] p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-accent" />
                  <h2 className="font-bold text-lg uppercase tracking-tight">Forensic Archive</h2>
                </div>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-surface rounded-full">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] opacity-20 text-center">
                  <Search className="w-12 h-12 mb-4" />
                  <p className="text-xs font-mono uppercase tracking-widest">Archive Empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        setInputText(session.inputText);
                        setScanResult(session.scanResult);
                        setHumanizeResult(session.humanizeResult);
                        setShowHistory(false);
                        setPhase("synthesis");
                      }}
                      className="w-full p-4 bg-surface border border-[var(--border)] rounded-xl text-left hover:bg-[var(--border)] transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-mono opacity-40 uppercase">
                          {new Date(session.timestamp).toLocaleString()}
                        </span>
                        <span className={cn(
                          "text-[8px] font-mono px-1.5 py-0.5 rounded border",
                          session.scanResult?.classification === "Likely AI" ? "border-danger/30 text-danger" : "border-accent/30 text-accent"
                        )}>
                          {session.scanResult ? `${session.scanResult.aiProbabilityScore}% AI` : "Organized"}
                        </span>
                      </div>
                      <p className="text-[11px] line-clamp-2 opacity-70 group-hover:opacity-100 transition-opacity">
                        {session.inputText}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Install Prompt */}
      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-28 left-6 right-6 z-[60] max-w-md mx-auto"
          >
            <div className="bg-accent text-[#050505] p-6 rounded-2xl shadow-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Download className="w-6 h-6" />
                <div>
                  <h4 className="font-bold text-sm uppercase">Install Invisify</h4>
                  <p className="text-[10px] opacity-70">Add to home screen for offline access.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowInstallPrompt(false)} className="px-3 py-2 text-[10px] uppercase font-bold opacity-50">Later</button>
                <button onClick={handleInstall} className="px-4 py-2 bg-[var(--bg)] text-accent rounded-lg text-[10px] uppercase font-bold">Install</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
