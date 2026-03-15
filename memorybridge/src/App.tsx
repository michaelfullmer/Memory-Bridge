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
  Settings,
  X,
  Key,
  ChevronDown
} from 'lucide-react';
import { MemoryData, Step } from './types';

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

type AIModel = 'claude' | 'chatgpt' | 'grok' | 'gemini' | 'custom';

interface AIConfig {
  model: AIModel;
  apiKey: string;
  customEndpoint: string;
}

const MODEL_LABELS: Record<AIModel, string> = {
  claude: 'Claude (Anthropic)',
  chatgpt: 'ChatGPT (OpenAI)',
  grok: 'Grok (xAI)',
  gemini: 'Gemini (Google)',
  custom: 'Custom Endpoint'
};

const MODEL_PLACEHOLDERS: Record<AIModel, string> = {
  claude: 'sk-ant-...',
  chatgpt: 'sk-...',
  grok: 'xai-...',
  gemini: 'AIza...',
  custom: 'Paste your API key'
};

const COMPRESSION_PROMPT = (memory: string) =>
  `You are a memory compression expert. Take this user context and rewrite it as the most token-efficient memory block possible for an AI conversation — strip all unnecessary words, preserve all meaningful facts, use pipe-separated notation. Keep it under 150 tokens total.

Input:
${memory}

Return ONLY the compressed block, no explanation.`;

export default function App() {
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<MemoryData>(INITIAL_DATA);
  
  const [copiedReadable, setCopiedReadable] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedAI, setCopiedAI] = useState(false);
  
  const [aiPolished, setAiPolished] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [usedModel, setUsedModel] = useState<AIModel | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    model: 'claude',
    apiKey: '',
    customEndpoint: ''
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('memorybridge_ai_config');
      if (saved) setAiConfig(JSON.parse(saved));
    } catch {}
  }, []);

  const saveConfig = (config: AIConfig) => {
    setAiConfig(config);
    try { localStorage.setItem('memorybridge_ai_config', JSON.stringify(config)); } catch {}
  };

  const updateData = (fields: Partial<MemoryData>) => {
    setData(prev => ({ ...prev, ...fields }));
  };

  const startNewSession = () => {
    setData(INITIAL_DATA);
    setStep(1);
    setAiPolished(null);
    setAiError(null);
    setUsedModel(null);
  };

  const nextStep = () => setStep(prev => (prev < 4 ? (prev + 1) as Step : prev));
  const prevStep = () => setStep(prev => (prev > 1 ? (prev - 1) as Step : prev));

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
    if (aiPolished) content += `\n\nAI-POLISHED FORMAT (${usedModel ? MODEL_LABELS[usedModel] : 'AI'}):\n${aiPolished}`;
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "memory_bridge_context.txt";
    document.body.appendChild(element);
    element.click();
  };

  const runAiPolish = async () => {
    if (!aiConfig.apiKey) {
      setAiError('No API key set. Open Settings to add one.');
      return;
    }
    setIsAiLoading(true);
    setAiError(null);
    const prompt = COMPRESSION_PROMPT(readableMemory);

    try {
      let result = '';

      if (aiConfig.model === 'claude') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': aiConfig.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 300,
            messages: [{ role: 'user', content: prompt }]
          })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Claude API error');
        result = json.content?.[0]?.text || '';

      } else if (aiConfig.model === 'chatgpt') {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiConfig.apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 300,
            messages: [{ role: 'user', content: prompt }]
          })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'OpenAI API error');
        result = json.choices?.[0]?.message?.content || '';

      } else if (aiConfig.model === 'grok') {
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiConfig.apiKey}`
          },
          body: JSON.stringify({
            model: 'grok-3-mini',
            max_tokens: 300,
            messages: [{ role: 'user', content: prompt }]
          })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Grok API error');
        result = json.choices?.[0]?.message?.content || '';

      } else if (aiConfig.model === 'gemini') {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${aiConfig.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Gemini API error');
        result = json.candidates?.[0]?.content?.parts?.[0]?.text || '';

      } else if (aiConfig.model === 'custom') {
        if (!aiConfig.customEndpoint) throw new Error('No custom endpoint set.');
        const res = await fetch(aiConfig.customEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiConfig.apiKey}`
          },
          body: JSON.stringify({
            max_tokens: 300,
            messages: [{ role: 'user', content: prompt }]
          })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'API error');
        result = json.choices?.[0]?.message?.content || json.content?.[0]?.text || '';
      }

      setAiPolished(result || 'No response from model.');
      setUsedModel(aiConfig.model);
    } catch (err: any) {
      setAiError(err.message || 'Something went wrong.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const directnessLabels: Record<number, string> = {
    1: "Give me the full picture",
    2: "Balanced but lean",
    3: "Skip the warmup",
    4: "Just the facts",
    5: "Brutal honesty only"
  };

  const hasApiKey = !!aiConfig.apiKey;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-12">
      {/* Logo */}
      <div className="fixed top-8 left-8 z-20">
        <img 
          src="https://i.imgur.com/dzZyFUC.png" 
          alt="MemoryBridge Logo" 
          className="h-8 w-auto opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={startNewSession}
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(true)}
        className="fixed top-8 right-8 z-20 p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-accent hover:border-accent/50 transition-all"
        title="AI Settings"
      >
        <Settings size={18} />
      </button>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-card p-8 w-full max-w-md space-y-6"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">AI Settings</h2>
                  <p className="text-xs text-zinc-500 mt-1">Your key is saved locally and never sent anywhere except your chosen AI provider.</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-100 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">AI Model</label>
                  <div className="relative">
                    <select
                      value={aiConfig.model}
                      onChange={(e) => saveConfig({ ...aiConfig, model: e.target.value as AIModel })}
                      className="input-field appearance-none pr-10 cursor-pointer"
                    >
                      {(Object.keys(MODEL_LABELS) as AIModel[]).map(m => (
                        <option key={m} value={m}>{MODEL_LABELS[m]}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                  </div>
                </div>

                {aiConfig.model === 'custom' && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Endpoint URL</label>
                    <input
                      type="url"
                      placeholder="https://your-api.com/v1/chat/completions"
                      className="input-field"
                      value={aiConfig.customEndpoint}
                      onChange={(e) => saveConfig({ ...aiConfig, customEndpoint: e.target.value })}
                    />
                    <p className="text-[10px] text-zinc-600">Must be OpenAI-compatible format.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Key size={12} />
                    API Key
                  </label>
                  <input
                    type="password"
                    placeholder={MODEL_PLACEHOLDERS[aiConfig.model]}
                    className="input-field font-mono"
                    value={aiConfig.apiKey}
                    onChange={(e) => saveConfig({ ...aiConfig, apiKey: e.target.value })}
                  />
                  <p className="text-[10px] text-zinc-600">Stored in your browser only. Never logged or shared.</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                {aiConfig.apiKey && (
                  <button
                    onClick={() => saveConfig({ ...aiConfig, apiKey: '' })}
                    className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    Clear key
                  </button>
                )}
                <button
                  onClick={() => setShowSettings(false)}
                  className="btn-primary ml-auto"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Indicator */}
      {step < 4 && (
        <div className="fixed top-12 left-0 w-full px-6 flex justify-center z-10">
          <div className="flex items-center gap-3 max-w-md w-full">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  s <= step ? 'bg-accent' : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <main className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
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
                  <input 
                    type="text" 
                    placeholder="e.g. Alex Rivera" 
                    className="input-field"
                    value={data.name}
                    onChange={(e) => updateData({ name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase ml-1">Age</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 28" 
                    className="input-field"
                    value={data.age}
                    onChange={(e) => updateData({ age: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase ml-1">Location</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Austin, TX" 
                    className="input-field"
                    value={data.location}
                    onChange={(e) => updateData({ location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase ml-1">What you do</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Software Engineer" 
                    className="input-field"
                    value={data.occupation}
                    onChange={(e) => updateData({ occupation: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={nextStep}
                  disabled={!data.name || !data.occupation}
                  className="btn-primary flex items-center gap-2"
                >
                  Continue <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

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
                  <textarea 
                    placeholder="e.g. Socratic, concise, technical, or storytelling..." 
                    className="input-field min-h-[100px] resize-none"
                    value={data.commStyle}
                    onChange={(e) => updateData({ commStyle: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase ml-1">What you hate in conversations</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Fluff, over-explaining basics, being too formal..." 
                    className="input-field"
                    value={data.hates}
                    onChange={(e) => updateData({ hates: e.target.value })}
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-zinc-500 uppercase ml-1">Directness Level</label>
                    <span className="text-accent font-mono text-sm">{data.directness}/5</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="5" 
                    step="1"
                    className="w-full accent-accent h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    value={data.directness}
                    onChange={(e) => updateData({ directness: parseInt(e.target.value) })}
                  />
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
                <button 
                  onClick={nextStep}
                  disabled={!data.commStyle}
                  className="btn-primary flex items-center gap-2"
                >
                  Continue <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

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
                  <textarea 
                    placeholder="What are you building or learning right now?" 
                    className="input-field min-h-[80px] resize-none"
                    value={data.projects}
                    onChange={(e) => updateData({ projects: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase ml-1">Long-term Goals</label>
                  <textarea 
                    placeholder="Where do you want to be in 2 years?" 
                    className="input-field min-h-[80px] resize-none"
                    value={data.goals}
                    onChange={(e) => updateData({ goals: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase ml-1">Things AI should always remember</label>
                  <textarea 
                    placeholder="Specific facts, preferences, or rules..." 
                    className="input-field min-h-[80px] resize-none"
                    value={data.persistentMemories}
                    onChange={(e) => updateData({ persistentMemories: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button onClick={prevStep} className="btn-secondary flex items-center gap-2">
                  <ChevronLeft size={18} /> Back
                </button>
                <button 
                  onClick={nextStep}
                  disabled={!data.projects && !data.goals}
                  className="btn-primary flex items-center gap-2"
                >
                  Generate Memory <Sparkles size={18} />
                </button>
              </div>
            </motion.div>
          )}

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

              {/* Usage Instructions */}
              <div className="glass-card p-6 border-zinc-800/50 bg-zinc-900/30">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-4 uppercase tracking-widest">
                  <BookOpen size={16} className="text-accent" />
                  How to use this
                </h3>
                <ul className="space-y-3">
                  <li className="flex gap-3 text-sm text-zinc-400">
                    <span className="text-accent font-bold">01</span>
                    <span>Paste your chosen format into "Custom Instructions" or the start of any new conversation — works with Claude, ChatGPT, Grok, Gemini, or any AI.</span>
                  </li>
                  <li className="flex gap-3 text-sm text-zinc-400">
                    <span className="text-accent font-bold">02</span>
                    <span>Use <strong>Readable</strong> for clarity, <strong>Token-Efficient</strong> for long complex chats, or <strong>AI-Polished</strong> for maximum compression.</span>
                  </li>
                  <li className="flex gap-3 text-sm text-zinc-400">
                    <span className="text-accent font-bold">03</span>
                    <span>Update your memory file every few months as your projects and goals evolve.</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-8">
                {/* Readable Format */}
                <div className="glass-card p-6 space-y-4 border-zinc-800">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Readable Format</h3>
                    <button 
                      onClick={() => copyToClipboard(readableMemory, setCopiedReadable)} 
                      className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-accent flex items-center gap-2 text-xs font-medium"
                    >
                      {copiedReadable ? <Check size={14} /> : <Copy size={14} />}
                      Copy
                    </button>
                  </div>
                  <pre className="text-sm font-mono text-zinc-300 whitespace-pre-wrap bg-black/40 p-5 rounded-xl border border-zinc-800/50 leading-relaxed shadow-inner">
                    {readableMemory}
                  </pre>
                </div>

                {/* AI Polish */}
                <div className="flex flex-col items-center gap-3">
                  {!aiPolished && (
                    <button 
                      onClick={hasApiKey ? runAiPolish : () => setShowSettings(true)}
                      disabled={isAiLoading}
                      className="btn-ai flex items-center gap-2"
                    >
                      {isAiLoading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Polishing with {MODEL_LABELS[aiConfig.model]}...
                        </>
                      ) : hasApiKey ? (
                        <>
                          <Sparkles size={18} />
                          AI Polish with {MODEL_LABELS[aiConfig.model]}
                        </>
                      ) : (
                        <>
                          <Settings size={18} />
                          Set up AI Polish
                        </>
                      )}
                    </button>
                  )}
                  {!hasApiKey && (
                    <p className="text-[11px] text-zinc-600 text-center">
                      Works with Claude, ChatGPT, Grok, Gemini, or any custom endpoint — your choice.
                    </p>
                  )}
                  {aiError && (
                    <p className="text-xs text-red-400 text-center">{aiError}</p>
                  )}
                </div>

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
                        <Zap size={12} />
                        Token-Efficient Format
                      </h3>
                      <p className="text-[10px] text-zinc-500 italic">Use this when you're working in a long conversation and want to conserve context.</p>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(tokenEfficientMemory, setCopiedToken)} 
                      className="p-2 hover:bg-accent/10 rounded-lg transition-colors text-accent flex items-center gap-2 text-xs font-medium"
                    >
                      {copiedToken ? <Check size={14} /> : <Copy size={14} />}
                      Copy
                    </button>
                  </div>
                  <div className="text-xs font-mono text-zinc-400 bg-black/40 p-5 rounded-xl border border-zinc-800/50 break-all leading-relaxed shadow-inner">
                    {tokenEfficientMemory}
                  </div>
                </div>

                {/* AI-Polished Format */}
                {aiPolished && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6 space-y-4 border-ai/40 bg-ai/[0.02]"
                  >
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-ai flex items-center gap-2">
                          <Sparkles size={12} />
                          AI-Polished Format
                        </h3>
                        <p className="text-[10px] text-zinc-500 italic">
                          Compressed by {usedModel ? MODEL_LABELS[usedModel] : 'AI'} for maximum context efficiency.
                        </p>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(aiPolished, setCopiedAI)} 
                        className="p-2 hover:bg-ai/10 rounded-lg transition-colors text-ai flex items-center gap-2 text-xs font-medium"
                      >
                        {copiedAI ? <Check size={14} /> : <Copy size={14} />}
                        Copy
                      </button>
                    </div>
                    <div className="text-xs font-mono text-zinc-400 bg-black/40 p-5 rounded-xl border border-zinc-800/50 break-all leading-relaxed shadow-inner">
                      {aiPolished}
                    </div>
                    <button
                      onClick={() => { setAiPolished(null); setUsedModel(null); }}
                      className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1"
                    >
                      <RefreshCw size={10} /> Re-polish with different model
                    </button>
                  </motion.div>
                )}

                {/* Human Connection */}
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
                <button 
                  onClick={downloadTxt}
                  className="btn-secondary w-full max-w-xs flex items-center justify-center gap-2"
                >
                  <Download size={18} /> Download .txt File
                </button>
                <button 
                  onClick={startNewSession} 
                  className="flex items-center gap-2 text-zinc-600 hover:text-zinc-400 text-xs transition-colors uppercase tracking-widest font-bold"
                >
                  <RefreshCw size={12} /> Start New Session
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
