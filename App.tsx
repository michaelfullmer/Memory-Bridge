/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  MessageSquare, 
  Target, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Copy, 
  Download, 
  Check,
  Info,
  BookOpen,
  Zap,
  Loader2,
  RefreshCw,
  Archive,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Brain,
  FileText,
  Clock,
  Settings,
  Eye,
  EyeOff,
  KeyRound
} from 'lucide-react';
import { MemoryData, MemoryLog, Step, HubTab } from './types';

// Claude API helper — calls Anthropic directly from the browser
async function callClaude(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || `API error ${response.status}`);
  }
  const data = await response.json();
  return data.content?.[0]?.text || '';
}

const INITIAL_DATA: MemoryData = {
  name: '',
  age: '',
  location: '',
  occupation: '',
  commStyle: '',
  hates: '',
  directness: 3,
  projects: '',
  goals: '',
  persistentMemories: ''
};

const STORAGE_PROFILE = 'memorybridge_profile';
const STORAGE_LOGS = 'memorybridge_logs';
const STORAGE_CONSOLIDATED = 'memorybridge_consolidated';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export default function App() {
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<MemoryData>(() => loadFromStorage(STORAGE_PROFILE, INITIAL_DATA));
  
  const [copiedReadable, setCopiedReadable] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedAI, setCopiedAI] = useState(false);
  const [copiedConsolidated, setCopiedConsolidated] = useState(false);
  
  const [aiPolished, setAiPolished] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Memory Hub state
  const [hubTab, setHubTab] = useState<HubTab>('logs');
  const [logs, setLogs] = useState<MemoryLog[]>(() => loadFromStorage(STORAGE_LOGS, []));
  const [consolidated, setConsolidated] = useState<string>(() => loadFromStorage(STORAGE_CONSOLIDATED, ''));
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [consolidateError, setConsolidateError] = useState<string | null>(null);

  // New log form
  const [newLogTitle, setNewLogTitle] = useState('');
  const [newLogContent, setNewLogContent] = useState('');
  const [addingLog, setAddingLog] = useState(false);

  // Profile edit in hub
  const [editingProfile, setEditingProfile] = useState(false);
  const [editData, setEditData] = useState<MemoryData>(data);

  const [apiKey, setApiKey] = useState<string>(() => {
    try { return localStorage.getItem('memorybridge_api_key') || process.env.ANTHROPIC_API_KEY || ''; } catch { return process.env.ANTHROPIC_API_KEY || ''; }
  });
  const [settingsKeyInput, setSettingsKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [keyTestMsg, setKeyTestMsg] = useState('');

  const handleSaveKey = () => {
    const trimmed = settingsKeyInput.trim();
    if (!trimmed) return;
    try { localStorage.setItem('memorybridge_api_key', trimmed); } catch {}
    setApiKey(trimmed);
    setSettingsKeyInput('');
    setKeyTestStatus('idle');
  };

  const handleRemoveKey = () => {
    try { localStorage.removeItem('memorybridge_api_key'); } catch {}
    setApiKey('');
    setKeyTestStatus('idle');
  };

  const handleTestKey = async () => {
    const keyToTest = settingsKeyInput.trim() || apiKey;
    if (!keyToTest) return;
    setKeyTestStatus('testing');
    setKeyTestMsg('');
    try {
      await callClaude('Say "OK" and nothing else.', keyToTest);
      setKeyTestStatus('ok');
      setKeyTestMsg('Connection successful');
    } catch (err) {
      setKeyTestStatus('fail');
      setKeyTestMsg(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  // Auto-save logs to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_LOGS, logs);
  }, [logs]);

  useEffect(() => {
    saveToStorage(STORAGE_CONSOLIDATED, consolidated);
  }, [consolidated]);

  const updateData = (fields: Partial<MemoryData>) => {
    setData(prev => ({ ...prev, ...fields }));
  };

  const startNewSession = () => {
    setData(INITIAL_DATA);
    setStep(1);
    setAiPolished(null);
  };

  const nextStep = () => setStep(prev => (typeof prev === 'number' && prev < 4 ? (prev + 1) as Step : prev));
  const prevStep = () => setStep(prev => (typeof prev === 'number' && prev > 1 ? (prev - 1) as Step : prev));

  const readableMemory = useMemo(() => {
    return `[USER CONTEXT]
Name: ${data.name || 'N/A'}
Age: ${data.age || 'N/A'}
Location: ${data.location || 'N/A'}
Occupation: ${data.occupation || 'N/A'}

[COMMUNICATION STYLE]
Style: ${data.commStyle || 'N/A'}
Dislikes: ${data.hates || 'N/A'}
Directness Preference: ${data.directness}/5 (1=Nuanced, 5=Extremely Direct)

[PRIORITIES & PROJECTS]
Current Projects: ${data.projects || 'N/A'}
Long-term Goals: ${data.goals || 'N/A'}
Persistent Knowledge: ${data.persistentMemories || 'N/A'}`;
  }, [data]);

  const truncate = (str: string, limit: number = 120) => {
    if (str.length <= limit) return str;
    return str.slice(0, limit) + "...";
  };

  const tokenEfficientMemory = useMemo(() => {
    const styleSummary = data.commStyle.split(' ').slice(0, 3).join(' ');
    return `USR: ${data.name}|${data.age}|${data.location}|${data.occupation}
STYLE: ${styleSummary}|DIR:${data.directness}|HATE:${data.hates}
PROJ: ${truncate(data.projects)}
GOAL: ${truncate(data.goals)}
MEM: ${truncate(data.persistentMemories)}`;
  }, [data]);

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const downloadTxt = () => {
    const element = document.createElement("a");
    let content = `MEMORY BRIDGE EXPORT\n\nREADABLE FORMAT:\n${readableMemory}\n\nTOKEN-EFFICIENT FORMAT:\n${tokenEfficientMemory}`;
    if (aiPolished) {
      content += `\n\nAI-POLISHED FORMAT:\n${aiPolished}`;
    }
    if (consolidated) {
      content += `\n\nCONSOLIDATED MEMORY FILE:\n${consolidated}`;
    }
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "memory_bridge_context.txt";
    document.body.appendChild(element);
    element.click();
  };

  const runAiPolish = async () => {
    if (!apiKey) return;
    setIsAiLoading(true);
    try {
      const result = await callClaude(
        `You are a memory compression expert. Take this user context and rewrite it as the most token-efficient memory block possible for an AI conversation — strip all unnecessary words, preserve all meaningful facts, use the notation format provided. Keep it under 150 tokens total.

Input:
${readableMemory}

Return ONLY the compressed block, no explanation.`,
        apiKey
      );
      setAiPolished(result || "AI failed to generate polish.");
    } catch (error) {
      console.error("AI Polish Error:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveProfile = () => {
    setData(editData);
    saveToStorage(STORAGE_PROFILE, editData);
    setEditingProfile(false);
  };

  const handleAddLog = () => {
    if (!newLogContent.trim()) return;
    const newLog: MemoryLog = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      title: newLogTitle.trim() || `Session — ${new Date().toLocaleDateString()}`,
      content: newLogContent.trim()
    };
    setLogs(prev => [newLog, ...prev]);
    setNewLogTitle('');
    setNewLogContent('');
    setAddingLog(false);
  };

  const handleDeleteLog = (id: string) => {
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  const handleConsolidate = async () => {
    if (!apiKey) return;
    setIsConsolidating(true);
    setConsolidateError(null);
    try {
      const logsText = logs.length > 0
        ? logs.map(l => `[${new Date(l.date).toLocaleDateString()} — ${l.title}]\n${l.content}`).join('\n\n---\n\n')
        : 'No session logs yet.';

      const result = await callClaude(
        `You are an expert at building AI memory files. Your job is to read a user's core profile and their session logs, then produce a single consolidated memory file that:

1. Preserves the core identity and communication preferences from the profile
2. Extracts and promotes the most important facts, wins, decisions, and context from the session logs
3. Drops anything redundant, outdated, or low-value
4. Is formatted clearly with sections so an AI can quickly internalize it at the start of a conversation
5. Stays tight — every word earns its place

CORE PROFILE:
${readableMemory}

SESSION LOGS:
${logsText}

Return ONLY the consolidated memory file. No explanation, no preamble. Use clear section headers. Start with [MEMORY FILE — START] and end with [MEMORY FILE — END].`,
        apiKey
      );
      setConsolidated(result || "Consolidation failed — please try again.");
    } catch (err) {
      setConsolidateError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsConsolidating(false);
    }
  };

  const goToHub = () => {
    saveToStorage(STORAGE_PROFILE, data);
    setStep('hub');
    setHubTab('logs');
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const directnessLabels: Record<number, string> = {
    1: "Give me the full picture",
    2: "Balanced but lean",
    3: "Skip the warmup",
    4: "Just the facts",
    5: "Brutal honesty only"
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-12">
      {/* Logo */}
      <div className="fixed top-8 left-8 z-20">
        <img 
          src="https://i.imgur.com/dzZyFUC.png" 
          alt="MemoryBridge Logo" 
          className="h-8 w-auto opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={() => setStep(1)}
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Hub button — always visible when profile exists */}
      {data.name && step !== 'hub' && (
        <button
          onClick={goToHub}
          className="fixed top-8 right-8 z-20 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent border border-accent/30 bg-accent/5 hover:bg-accent/10 px-4 py-2 rounded-full transition-all"
        >
          <Archive size={13} />
          Memory Hub
        </button>
      )}

      {/* Back to onboarding from hub */}
      {step === 'hub' && (
        <button
          onClick={() => setStep(4)}
          className="fixed top-8 right-8 z-20 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 px-4 py-2 rounded-full transition-all"
        >
          <ChevronLeft size={13} />
          Back
        </button>
      )}

      {/* Progress Indicator */}
      {typeof step === 'number' && step < 4 && (
        <div className="fixed top-12 left-0 w-full px-6 flex justify-center z-10">
          <div className="flex items-center gap-3 max-w-md w-full">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  s <= (step as number) ? 'bg-accent' : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <main className="w-full max-w-2xl">
        <AnimatePresence mode="wait">

          {/* ═══════════════════════════════════════
              STEP 1 — Identity
          ═══════════════════════════════════════ */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-accent text-sm font-semibold uppercase tracking-wider">
                  <User size={16} />
                  Identity
                </div>
                <h1 className="text-4xl font-bold tracking-tight">Who are you?</h1>
                <p className="text-zinc-400">Let's start with the basics of your human experience.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase ml-1">Full Name</label>
                  <input type="text" placeholder="e.g. Alex Rivera" className="input-field"
                    value={data.name} onChange={(e) => updateData({ name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase ml-1">Age</label>
                  <input type="text" placeholder="e.g. 28" className="input-field"
                    value={data.age} onChange={(e) => updateData({ age: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase ml-1">Location</label>
                  <input type="text" placeholder="e.g. Austin, TX" className="input-field"
                    value={data.location} onChange={(e) => updateData({ location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase ml-1">What you do</label>
                  <input type="text" placeholder="e.g. Software Engineer" className="input-field"
                    value={data.occupation} onChange={(e) => updateData({ occupation: e.target.value })} />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button onClick={nextStep} disabled={!data.name || !data.occupation}
                  className="btn-primary flex items-center gap-2">
                  Continue <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════
              STEP 2 — Cognition
          ═══════════════════════════════════════ */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-accent text-sm font-semibold uppercase tracking-wider">
                  <MessageSquare size={16} />
                  Cognition
                </div>
                <h1 className="text-4xl font-bold tracking-tight">How do you think?</h1>
                <p className="text-zinc-400">Define the interface between your mind and the AI.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase ml-1">Communication Style</label>
                  <textarea placeholder="e.g. Socratic, concise, technical, or storytelling..." 
                    className="input-field min-h-[100px] resize-none"
                    value={data.commStyle} onChange={(e) => updateData({ commStyle: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase ml-1">What you hate in conversations</label>
                  <input type="text" placeholder="e.g. Fluff, over-explaining basics, being too formal..." 
                    className="input-field"
                    value={data.hates} onChange={(e) => updateData({ hates: e.target.value })} />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-zinc-500 uppercase ml-1">Directness Level</label>
                    <span className="text-accent font-mono text-sm">{data.directness}/5</span>
                  </div>
                  <input type="range" min="1" max="5" step="1"
                    className="w-full accent-accent h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    value={data.directness} onChange={(e) => updateData({ directness: parseInt(e.target.value) })} />
                  <div className="flex justify-between text-[10px] text-zinc-600 uppercase tracking-widest px-1">
                    <span>Nuanced</span>
                    <span>Blunt</span>
                  </div>
                  <p className="text-center text-xs text-accent/80 font-medium italic">
                    "{directnessLabels[data.directness]}"
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button onClick={prevStep} className="btn-secondary flex items-center gap-2">
                  <ChevronLeft size={18} /> Back
                </button>
                <button onClick={nextStep} disabled={!data.commStyle}
                  className="btn-primary flex items-center gap-2">
                  Continue <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════
              STEP 3 — Priorities
          ═══════════════════════════════════════ */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-accent text-sm font-semibold uppercase tracking-wider">
                  <Target size={16} />
                  Priorities
                </div>
                <h1 className="text-4xl font-bold tracking-tight">What matters to you?</h1>
                <p className="text-zinc-500 italic text-sm">"What would you want someone to know about you before a long conversation?"</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase ml-1">Current Projects</label>
                  <textarea placeholder="What are you building or learning right now?" 
                    className="input-field min-h-[80px] resize-none"
                    value={data.projects} onChange={(e) => updateData({ projects: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase ml-1">Long-term Goals</label>
                  <textarea placeholder="Where do you want to be in 2 years?" 
                    className="input-field min-h-[80px] resize-none"
                    value={data.goals} onChange={(e) => updateData({ goals: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase ml-1">Things AI should always remember</label>
                  <textarea placeholder="Specific facts, preferences, or rules..." 
                    className="input-field min-h-[80px] resize-none"
                    value={data.persistentMemories} onChange={(e) => updateData({ persistentMemories: e.target.value })} />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button onClick={prevStep} className="btn-secondary flex items-center gap-2">
                  <ChevronLeft size={18} /> Back
                </button>
                <button onClick={nextStep} disabled={!data.projects && !data.goals}
                  className="btn-primary flex items-center gap-2">
                  Generate Memory <Sparkles size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════
              STEP 4 — Output
          ═══════════════════════════════════════ */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-10 pb-20"
            >
              <div className="text-center space-y-3">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 text-accent mb-2 ${isAiLoading ? 'animate-shimmer' : ''}`}>
                  <Sparkles size={32} />
                </div>
                <h1 className="text-4xl font-bold tracking-tight">Memory Bridge Ready</h1>
                <p className="text-zinc-400 max-w-md mx-auto">Your context is now structured and ready for deployment.</p>
              </div>

              {/* Open Memory Hub CTA */}
              <div className="glass-card p-5 border-accent/30 bg-accent/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-lg text-accent">
                    <Archive size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-zinc-100 text-sm">Memory Hub</div>
                    <div className="text-xs text-zinc-500">Add session logs and consolidate your memory over time</div>
                  </div>
                </div>
                <button onClick={goToHub} className="btn-primary flex items-center gap-2 whitespace-nowrap text-sm px-4 py-2">
                  Open Hub <ChevronRight size={16} />
                </button>
              </div>

              {/* Usage Instructions */}
              <div className="glass-card p-6 border-zinc-800/50 bg-zinc-900/30">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-4 uppercase tracking-widest">
                  <BookOpen size={16} className="text-accent" />
                  How to use this
                </h3>
                <ul className="space-y-3">
                  <li className="flex gap-3 text-sm text-zinc-400">
                    <span className="text-accent font-bold">01</span>
                    <span>Paste your chosen format into "Custom Instructions" or the start of any new conversation.</span>
                  </li>
                  <li className="flex gap-3 text-sm text-zinc-400">
                    <span className="text-accent font-bold">02</span>
                    <span>Use the <strong>Readable</strong> version for clarity, or <strong>Token-Efficient</strong> for long, complex chats.</span>
                  </li>
                  <li className="flex gap-3 text-sm text-zinc-400">
                    <span className="text-accent font-bold">03</span>
                    <span>Use <strong>Memory Hub</strong> to log sessions over time, then consolidate into an always-current memory file.</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-8">
                {/* Readable Format */}
                <div className="glass-card p-6 space-y-4 border-zinc-800">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Readable Format</h3>
                    <button onClick={() => copyToClipboard(readableMemory, setCopiedReadable)} 
                      className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-accent flex items-center gap-2 text-xs font-medium">
                      {copiedReadable ? <Check size={14} /> : <Copy size={14} />} Copy
                    </button>
                  </div>
                  <pre className="text-sm font-mono text-zinc-300 whitespace-pre-wrap bg-black/40 p-5 rounded-xl border border-zinc-800/50 leading-relaxed shadow-inner">
                    {readableMemory}
                  </pre>
                </div>

                {/* AI Polish Button */}
                {apiKey && !aiPolished && (
                  <div className="flex justify-center">
                    <button onClick={runAiPolish} disabled={isAiLoading} className="btn-ai flex items-center gap-2">
                      {isAiLoading ? (
                        <><Loader2 size={18} className="animate-spin" />Polishing with AI...</>
                      ) : (
                        <><Sparkles size={18} />AI Polish</>
                      )}
                    </button>
                  </div>
                )}

                {/* Divider */}
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-zinc-800"></div>
                  <span className="flex-shrink mx-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">Choose your format</span>
                  <div className="flex-grow border-t border-zinc-800"></div>
                </div>

                {/* Token-Efficient Format */}
                <div className="glass-card p-6 space-y-4 border-accent/30 bg-accent/[0.02]">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                        <Zap size={12} /> Token-Efficient Format
                      </h3>
                      <p className="text-[10px] text-zinc-500 italic">Use this when you're working in a long conversation and want to conserve context.</p>
                    </div>
                    <button onClick={() => copyToClipboard(tokenEfficientMemory, setCopiedToken)} 
                      className="p-2 hover:bg-accent/10 rounded-lg transition-colors text-accent flex items-center gap-2 text-xs font-medium">
                      {copiedToken ? <Check size={14} /> : <Copy size={14} />} Copy
                    </button>
                  </div>
                  <div className="text-xs font-mono text-zinc-400 bg-black/40 p-5 rounded-xl border border-zinc-800/50 break-all leading-relaxed shadow-inner">
                    {tokenEfficientMemory}
                  </div>
                </div>

                {/* AI-Polished Format */}
                {aiPolished && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6 space-y-4 border-ai/40 bg-ai/[0.02]">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-ai flex items-center gap-2">
                          <Sparkles size={12} /> AI-Polished Format
                        </h3>
                        <p className="text-[10px] text-zinc-500 italic">Compressed by Claude for maximum context efficiency.</p>
                      </div>
                      <button onClick={() => copyToClipboard(aiPolished, setCopiedAI)} 
                        className="p-2 hover:bg-ai/10 rounded-lg transition-colors text-ai flex items-center gap-2 text-xs font-medium">
                        {copiedAI ? <Check size={14} /> : <Copy size={14} />} Copy
                      </button>
                    </div>
                    <div className="text-xs font-mono text-zinc-400 bg-black/40 p-5 rounded-xl border border-zinc-800/50 break-all leading-relaxed shadow-inner">
                      {aiPolished}
                    </div>
                  </motion.div>
                )}

                {/* The Human Connection */}
                <div className="glass-card p-6 bg-accent/5 border-accent/20 flex gap-5 items-start">
                  <div className="mt-1 text-accent p-2 bg-accent/10 rounded-lg">
                    <Info size={20} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-zinc-100">The Human Connection</h4>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Without this, AI is just a mirror of the internet—generic and distant. With it, the AI understands your specific world. It's the difference between using a hammer and building a partnership with someone who knows your hands. As your memory grows, the conversation stops feeling like a prompt and starts feeling like a shared history. It evolves as you do.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-6 pt-4">
                <button onClick={downloadTxt} className="btn-secondary w-full max-w-xs flex items-center justify-center gap-2">
                  <Download size={18} /> Download .txt File
                </button>
                <button onClick={startNewSession} 
                  className="flex items-center gap-2 text-zinc-600 hover:text-zinc-400 text-xs transition-colors uppercase tracking-widest font-bold">
                  <RefreshCw size={12} /> Start New Session
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════
              MEMORY HUB
          ═══════════════════════════════════════ */}
          {step === 'hub' && (
            <motion.div
              key="hub"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 pb-20"
            >
              {/* Hub Header */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-accent text-sm font-semibold uppercase tracking-wider">
                  <Archive size={16} /> Memory Hub
                </div>
                <h1 className="text-4xl font-bold tracking-tight">Living Memory</h1>
                <p className="text-zinc-400 text-sm">Your profile + session logs + AI consolidation. All in one place.</p>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                {([
                  { key: 'logs', icon: <FileText size={14} />, label: 'Session Logs', count: logs.length },
                  { key: 'profile', icon: <User size={14} />, label: 'Core Profile', count: null },
                  { key: 'consolidate', icon: <Brain size={14} />, label: 'Consolidate', count: null },
                  { key: 'settings', icon: <Settings size={14} />, label: 'Settings', count: null },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setHubTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                      hubTab === tab.key 
                        ? 'bg-accent text-black' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                    {tab.count !== null && tab.count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${hubTab === tab.key ? 'bg-black/20' : 'bg-zinc-800'}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">

                {/* ── SESSION LOGS TAB ── */}
                {hubTab === 'logs' && (
                  <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    
                    {/* Add Log Button / Form */}
                    {!addingLog ? (
                      <button onClick={() => setAddingLog(true)}
                        className="w-full glass-card p-4 border-dashed border-zinc-700 hover:border-accent/50 hover:bg-accent/5 transition-all flex items-center justify-center gap-2 text-zinc-500 hover:text-accent text-sm font-medium">
                        <Plus size={16} /> Add Session Log
                      </button>
                    ) : (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-5 space-y-3 border-accent/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-widest text-accent">New Session Log</span>
                          <button onClick={() => setAddingLog(false)} className="text-zinc-600 hover:text-zinc-300">
                            <X size={16} />
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Title (optional — e.g. 'Day 9', 'FitForge build')"
                          className="input-field text-sm"
                          value={newLogTitle}
                          onChange={e => setNewLogTitle(e.target.value)}
                        />
                        <textarea
                          placeholder="Paste your session transcript, notes, wins, decisions — anything worth keeping. Claude will curate what matters when you consolidate."
                          className="input-field min-h-[160px] resize-none text-sm"
                          value={newLogContent}
                          onChange={e => setNewLogContent(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setAddingLog(false)} className="btn-secondary text-sm px-4 py-2">Cancel</button>
                          <button onClick={handleAddLog} disabled={!newLogContent.trim()}
                            className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
                            <Save size={14} /> Save Log
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Log List */}
                    {logs.length === 0 && !addingLog && (
                      <div className="text-center py-12 text-zinc-600 text-sm">
                        <Archive size={32} className="mx-auto mb-3 opacity-30" />
                        No session logs yet. Add your first one above.
                      </div>
                    )}

                    {logs.map(log => (
                      <motion.div key={log.id} layout
                        className="glass-card p-5 space-y-3 hover:border-zinc-700 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-bold text-zinc-100 text-sm">{log.title}</div>
                            <div className="flex items-center gap-1 text-[11px] text-zinc-600 mt-0.5">
                              <Clock size={11} /> {formatDate(log.date)}
                            </div>
                          </div>
                          <button onClick={() => handleDeleteLog(log.id)}
                            className="text-zinc-700 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5">
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="text-xs text-zinc-500 font-mono bg-black/30 rounded-lg p-3 max-h-32 overflow-y-auto leading-relaxed border border-zinc-800/50">
                          {log.content.length > 400 ? log.content.slice(0, 400) + '...' : log.content}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* ── CORE PROFILE TAB ── */}
                {hubTab === 'profile' && (
                  <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    {!editingProfile ? (
                      <>
                        <div className="flex justify-end">
                          <button onClick={() => { setEditData(data); setEditingProfile(true); }}
                            className="flex items-center gap-2 text-xs font-bold text-accent border border-accent/30 bg-accent/5 hover:bg-accent/10 px-3 py-2 rounded-lg transition-all">
                            <Edit3 size={13} /> Edit Profile
                          </button>
                        </div>
                        <div className="glass-card p-5 space-y-5">
                          {[
                            { label: 'Identity', items: [
                              { k: 'Name', v: data.name }, { k: 'Age', v: data.age },
                              { k: 'Location', v: data.location }, { k: 'Occupation', v: data.occupation }
                            ]},
                            { label: 'Communication', items: [
                              { k: 'Style', v: data.commStyle }, { k: 'Dislikes', v: data.hates },
                              { k: 'Directness', v: `${data.directness}/5` }
                            ]},
                            { label: 'Priorities', items: [
                              { k: 'Projects', v: data.projects }, { k: 'Goals', v: data.goals },
                              { k: 'Persistent Memory', v: data.persistentMemories }
                            ]},
                          ].map(section => (
                            <div key={section.label}>
                              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-3">{section.label}</div>
                              <div className="space-y-2">
                                {section.items.map(item => (
                                  <div key={item.k} className="flex gap-3">
                                    <span className="text-xs text-zinc-500 w-28 flex-shrink-0 pt-0.5">{item.k}</span>
                                    <span className="text-xs text-zinc-300 leading-relaxed">{item.v || '—'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-widest text-accent">Editing Profile</span>
                          <button onClick={() => setEditingProfile(false)} className="text-zinc-600 hover:text-zinc-300">
                            <X size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { label: 'Full Name', key: 'name' as const },
                            { label: 'Age', key: 'age' as const },
                            { label: 'Location', key: 'location' as const },
                            { label: 'Occupation', key: 'occupation' as const },
                          ].map(f => (
                            <div key={f.key} className="space-y-1">
                              <label className="text-[10px] font-medium text-zinc-500 uppercase ml-1">{f.label}</label>
                              <input type="text" className="input-field text-sm" value={editData[f.key] as string}
                                onChange={e => setEditData(prev => ({ ...prev, [f.key]: e.target.value }))} />
                            </div>
                          ))}
                        </div>
                        {[
                          { label: 'Communication Style', key: 'commStyle' as const },
                          { label: 'What you hate', key: 'hates' as const },
                          { label: 'Current Projects', key: 'projects' as const },
                          { label: 'Long-term Goals', key: 'goals' as const },
                          { label: 'Things AI should always remember', key: 'persistentMemories' as const },
                        ].map(f => (
                          <div key={f.key} className="space-y-1">
                            <label className="text-[10px] font-medium text-zinc-500 uppercase ml-1">{f.label}</label>
                            <textarea className="input-field text-sm min-h-[70px] resize-none" value={editData[f.key] as string}
                              onChange={e => setEditData(prev => ({ ...prev, [f.key]: e.target.value }))} />
                          </div>
                        ))}
                        <div className="flex justify-end gap-2 pt-2">
                          <button onClick={() => setEditingProfile(false)} className="btn-secondary text-sm px-4 py-2">Cancel</button>
                          <button onClick={handleSaveProfile} className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
                            <Save size={14} /> Save Profile
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* ── CONSOLIDATE TAB ── */}
                {hubTab === 'consolidate' && (
                  <motion.div key="consolidate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                    
                    <div className="glass-card p-5 border-zinc-800/50 bg-zinc-900/30 flex gap-4 items-start">
                      <div className="mt-1 text-accent p-2 bg-accent/10 rounded-lg flex-shrink-0">
                        <Brain size={18} />
                      </div>
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-zinc-100">How consolidation works</div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          AI reads your core profile + all {logs.length} session log{logs.length !== 1 ? 's' : ''} and outputs a single tight memory file — keeping the wins, decisions, and context worth carrying forward. Drop it into any new conversation and hit the ground running.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <button onClick={handleConsolidate} disabled={isConsolidating || !apiKey}
                        className="btn-ai flex items-center gap-2 px-8">
                        {isConsolidating ? (
                          <><Loader2 size={18} className="animate-spin" />Consolidating...</>
                        ) : (
                          <><Brain size={18} />{consolidated ? 'Re-Consolidate' : 'Consolidate Memory'}</>
                        )}
                      </button>
                    </div>

                    {consolidateError && (
                      <div className="glass-card p-4 border-red-500/30 bg-red-500/5 text-red-400 text-sm">
                        {consolidateError}
                      </div>
                    )}

                    {consolidated && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-6 space-y-4 border-accent/30 bg-accent/[0.02]">
                        <div className="flex justify-between items-center">
                          <div className="space-y-1">
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                              <Sparkles size={12} /> Consolidated Memory File
                            </h3>
                            <p className="text-[10px] text-zinc-500 italic">Copy this and paste it at the start of any new conversation.</p>
                          </div>
                          <button onClick={() => copyToClipboard(consolidated, setCopiedConsolidated)}
                            className="p-2 hover:bg-accent/10 rounded-lg transition-colors text-accent flex items-center gap-2 text-xs font-medium">
                            {copiedConsolidated ? <Check size={14} /> : <Copy size={14} />} Copy
                          </button>
                        </div>
                        <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap bg-black/40 p-5 rounded-xl border border-zinc-800/50 leading-relaxed shadow-inner max-h-[500px] overflow-y-auto">
                          {consolidated}
                        </pre>
                      </motion.div>
                    )}

                    {!apiKey && (
                      <div className="glass-card p-4 border-yellow-500/30 bg-yellow-500/5 text-yellow-400 text-sm text-center cursor-pointer hover:bg-yellow-500/10 transition-colors"
                        onClick={() => setHubTab('settings')}>
                        API key required — click here to add it in Settings
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── SETTINGS TAB ── */}
                {hubTab === 'settings' && (
                  <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">

                    <div className="glass-card p-5 border-zinc-800/50 bg-zinc-900/30 flex gap-4 items-start">
                      <div className="mt-1 text-accent p-2 bg-accent/10 rounded-lg flex-shrink-0">
                        <KeyRound size={18} />
                      </div>
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-zinc-100">Anthropic API Key</div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Required for AI Polish and Consolidate features. Your key is stored locally on this device only — it never leaves your machine.
                        </p>
                      </div>
                    </div>

                    {/* Current key status */}
                    {apiKey ? (
                      <div className="glass-card p-4 border-green-500/20 bg-green-500/5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></div>
                          <div>
                            <div className="text-xs font-bold text-green-400">API Key Saved</div>
                            <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                              {showKey ? apiKey : '••••••••••••••••' + apiKey.slice(-6)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setShowKey(p => !p)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                          <button onClick={handleRemoveKey} className="text-zinc-600 hover:text-red-400 transition-colors text-xs font-medium">
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="glass-card p-4 border-yellow-500/20 bg-yellow-500/5 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0"></div>
                        <div className="text-xs text-yellow-400">No API key set — AI features are disabled.</div>
                      </div>
                    )}

                    {/* Input + actions */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-medium text-zinc-500 uppercase ml-1">
                        {apiKey ? 'Replace Key' : 'Enter API Key'}
                      </label>
                      <div className="relative">
                        <input
                          type={showKey ? 'text' : 'password'}
                          placeholder="sk-ant-..."
                          className="input-field pr-10 text-sm font-mono"
                          value={settingsKeyInput}
                          onChange={e => { setSettingsKeyInput(e.target.value); setKeyTestStatus('idle'); }}
                        />
                        <button onClick={() => setShowKey(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300">
                          {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleTestKey}
                          disabled={keyTestStatus === 'testing' || (!settingsKeyInput.trim() && !apiKey)}
                          className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
                          {keyTestStatus === 'testing' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                          Test Connection
                        </button>
                        <button
                          onClick={handleSaveKey}
                          disabled={!settingsKeyInput.trim()}
                          className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
                          <Save size={14} /> Save Key
                        </button>
                      </div>

                      {keyTestStatus === 'ok' && (
                        <div className="flex items-center gap-2 text-green-400 text-xs font-medium">
                          <Check size={13} /> {keyTestMsg}
                        </div>
                      )}
                      {keyTestStatus === 'fail' && (
                        <div className="text-red-400 text-xs">{keyTestMsg}</div>
                      )}
                    </div>

                    {/* How to get a key */}
                    <div className="glass-card p-4 border-zinc-800/50 space-y-2">
                      <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">How to get an API key</div>
                      <ol className="space-y-1.5 text-xs text-zinc-500">
                        <li className="flex gap-2"><span className="text-accent font-bold">1.</span> Go to console.anthropic.com</li>
                        <li className="flex gap-2"><span className="text-accent font-bold">2.</span> Sign in or create an account</li>
                        <li className="flex gap-2"><span className="text-accent font-bold">3.</span> Click API Keys → Create Key</li>
                        <li className="flex gap-2"><span className="text-accent font-bold">4.</span> Copy and paste it above</li>
                      </ol>
                    </div>

                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
