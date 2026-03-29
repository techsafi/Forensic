
import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, UserCheck, ArrowRight, Key, Monitor, Scan } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 pt-32 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 uppercase italic">
            Invisify <span className="text-orange-500">AI</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-10 font-light">
            Erase the robotic trace. Transform AI-generated text into 
            <span className="text-white font-medium italic"> simple, human expression</span> that bypasses forensic scans.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/tool"
              className="group relative px-8 py-4 bg-white text-black font-bold text-lg rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-2">
                Launch Tool <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <a 
              href="#features"
              className="px-8 py-4 border border-white/20 hover:border-white/40 rounded-full font-medium transition-all"
            >
              Explore Features
            </a>
          </div>
        </motion.div>

        {/* Floating Elements Animation */}
        <div className="mt-20 relative h-64 max-w-4xl mx-auto">
          <motion.div
            animate={{ 
              y: [0, -20, 0],
              rotate: [0, 2, 0]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 left-1/4 p-6 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="h-2 w-32 bg-white/10 rounded mb-2" />
            <div className="h-2 w-24 bg-white/10 rounded" />
          </motion.div>

          <motion.div
            animate={{ 
              y: [0, 20, 0],
              rotate: [0, -2, 0]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute bottom-0 right-1/4 p-6 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl"
          >
            <div className="flex items-center gap-2 text-orange-500 mb-2">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Invisified</span>
            </div>
            <div className="h-2 w-40 bg-white/10 rounded mb-2" />
            <div className="h-2 w-20 bg-white/10 rounded" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-20 bg-zinc-950">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            <FeatureCard 
              icon={<Zap className="w-8 h-8 text-orange-500" />}
              title="Forensic Erasure"
              description="Deep-scan technology that identifies and removes AI signatures like low perplexity and robotic burstiness."
            />
            <FeatureCard 
              icon={<UserCheck className="w-8 h-8 text-blue-500" />}
              title="Human Jitter"
              description="Injects natural linguistic variance, contractions, and conversational flow into every sentence."
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-8 h-8 text-green-500" />}
              title="Simple English"
              description="Prioritizes plain, direct language that feels authentic and easy to understand for any reader."
            />
            <FeatureCard 
              icon={<Key className="w-8 h-8 text-purple-500" />}
              title="Custom API Keys"
              description="Full control over your AI processing. Use your own Google AI Studio keys for enhanced privacy and limits."
            />
            <FeatureCard 
              icon={<Monitor className="w-8 h-8 text-cyan-500" />}
              title="Multi-Tone Synthesis"
              description="Select from Casual, Professional, Academic, or Creative tones to match your specific writing needs."
            />
            <FeatureCard 
              icon={<Scan className="w-8 h-8 text-pink-500" />}
              title="Reading Level Analysis"
              description="Get instant feedback on the readability and complexity of your text during every forensic scan."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-10 border-t border-white/5 text-center text-gray-500 text-sm">
        <p>&copy; 2026 Invisify AI. All rights reserved.</p>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <motion.div 
    whileHover={{ y: -10 }}
    className="p-8 bg-zinc-900/50 border border-white/5 rounded-3xl hover:border-white/20 transition-all"
  >
    <div className="mb-6">{icon}</div>
    <h3 className="text-2xl font-bold mb-4">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{description}</p>
  </motion.div>
);
