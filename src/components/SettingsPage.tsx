
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { storageService, AppSettings } from '../services/storageService';
import { Settings, Moon, Sun, Monitor, Zap, Save, ArrowLeft, Shield, Key, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(storageService.getSettings());
  const [isSaved, setIsSaved] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  const handleSave = () => {
    storageService.saveSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const validateApiKey = async () => {
    if (!settings.customApiKey) {
      setValidationStatus('idle');
      return;
    }

    setIsValidating(true);
    setValidationStatus('idle');

    try {
      const genAI = new GoogleGenAI({ apiKey: settings.customApiKey });
      const model = settings.defaultModel || 'gemini-3-flash-preview';
      
      // Simple test call to validate the key
      await genAI.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
      });
      
      setValidationStatus('valid');
    } catch (error) {
      console.error('API Key validation failed:', error);
      setValidationStatus('invalid');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <Link to="/tool" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-10 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Back to Tool
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <div className="flex items-center gap-4">
            <Settings className="w-10 h-10 text-orange-500" />
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">App Settings</h1>
          </div>

          <div className="space-y-8">
            {/* Theme Section */}
            <section className="space-y-4">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Sun className="w-4 h-4" /> Appearance
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <ThemeOption 
                  icon={<Sun className="w-5 h-5" />}
                  label="Light"
                  active={settings.theme === 'light'}
                  onClick={() => setSettings({ ...settings, theme: 'light' })}
                />
                <ThemeOption 
                  icon={<Moon className="w-5 h-5" />}
                  label="Dark"
                  active={settings.theme === 'dark'}
                  onClick={() => setSettings({ ...settings, theme: 'dark' })}
                />
                <ThemeOption 
                  icon={<Monitor className="w-5 h-5" />}
                  label="System"
                  active={settings.theme === 'system'}
                  onClick={() => setSettings({ ...settings, theme: 'system' })}
                />
              </div>
            </section>

            {/* Automation Section */}
            <section className="space-y-4">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4" /> Automation
              </h2>
              <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="font-bold mb-1">Auto-Organize Output</h3>
                  <p className="text-sm text-gray-500">Automatically format humanized text with Markdown.</p>
                </div>
                <button 
                  onClick={() => setSettings({ ...settings, autoOrganize: !settings.autoOrganize })}
                  className={`w-14 h-8 rounded-full p-1 transition-all ${settings.autoOrganize ? 'bg-orange-500' : 'bg-zinc-800'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full transition-all ${settings.autoOrganize ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </section>

            {/* AI Model Section */}
            <section className="space-y-4">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-4 h-4" /> AI Configuration
              </h2>
              <div className="space-y-4">
                <div className="relative">
                  <select 
                    value={settings.defaultModel}
                    onChange={(e) => setSettings({ ...settings, defaultModel: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-4 px-6 focus:outline-none focus:border-orange-500/50 transition-all appearance-none"
                  >
                    <option value="gemini-3-flash-preview">Gemini 3 Flash (Fastest)</option>
                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Most Accurate)</option>
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <ArrowLeft className="w-4 h-4 rotate-[-90deg]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Key className="w-4 h-4" /> Custom API Key (Optional)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="password"
                        value={settings.customApiKey || ''}
                        onChange={(e) => {
                          setSettings({ ...settings, customApiKey: e.target.value });
                          setValidationStatus('idle');
                        }}
                        placeholder="Enter your Google AI Studio API Key"
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl py-4 px-6 focus:outline-none focus:border-orange-500/50 transition-all"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {validationStatus === 'valid' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {validationStatus === 'invalid' && <XCircle className="w-5 h-5 text-red-500" />}
                      </div>
                    </div>
                    <button 
                      onClick={validateApiKey}
                      disabled={isValidating || !settings.customApiKey}
                      className="px-6 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                      {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Validate'}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 italic">
                    Your key is saved locally on this device and never sent to our servers. 
                    Get one at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-orange-500 hover:underline">Google AI Studio</a>.
                  </p>
                </div>
              </div>
            </section>

            <button 
              onClick={handleSave}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isSaved ? 'bg-green-600' : 'bg-white text-black hover:scale-105'}`}
            >
              <Save className="w-5 h-5" /> {isSaved ? 'Settings Saved!' : 'Save All Settings'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const ThemeOption: React.FC<{ icon: React.ReactNode; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${active ? 'bg-white text-black border-white' : 'bg-zinc-900 border-white/5 text-gray-500 hover:border-white/20'}`}
  >
    {icon}
    <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
  </button>
);
