import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Sparkles, Wrench } from 'lucide-react';
import { useState } from 'react';
import { runBackendAutoFix, runBackendChatbot } from '../lib/backendApi';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const starter = [
  { id: 'a1', role: 'assistant' as const, text: 'Ask me to fix a design, explain an issue, or optimize your model.' },
];

export function FloatingChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(starter);

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    const nextUser: ChatMessage = {
      id: `${Date.now()}-u`,
      role: 'user',
      text: message,
    };
    setMessages((curr) => [...curr, nextUser]);
    setInput('');
    setLoading(true);

    try {
      const reply = await runBackendChatbot({
        user_input: message,
        validation_results: {},
        simulation_results: {},
      });

      setMessages((curr) => [
        ...curr,
        {
          id: `${Date.now()}-a`,
          role: 'assistant',
          text: reply.reply,
        },
      ]);
    } catch (error) {
      setMessages((curr) => [
        ...curr,
        {
          id: `${Date.now()}-e`,
          role: 'assistant',
          text: (error as Error).message || 'Chatbot failed to respond.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const triggerAutoFixDemo = async () => {
    setLoading(true);
    try {
      const result = await runBackendAutoFix({
        validation_issues: [
          {
            rule_id: 'wall_thickness',
            explanation: 'Wall too thin in flange section',
            measured_value: 1.1,
            expected_value: 2.0,
            unit: 'mm',
          },
        ],
      });

      const first = result.fixes[0];
      const text = first
        ? `${result.summary} Example fix: ${first.recommended_fix}${first.target_value ? ` Target: ${first.target_value}.` : ''}`
        : result.summary;

      setMessages((curr) => [
        ...curr,
        { id: `${Date.now()}-f`, role: 'assistant', text },
      ]);
    } catch (error) {
      setMessages((curr) => [
        ...curr,
        {
          id: `${Date.now()}-ferr`,
          role: 'assistant',
          text: (error as Error).message || 'Auto-fix request failed.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full border border-cyan-300/60 bg-cyan-500/20 text-cyan-100 shadow-[0_0_30px_rgba(0,240,255,0.45)] backdrop-blur-xl hover:scale-105 transition"
      >
        <Bot className="w-6 h-6 mx-auto" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            className="fixed bottom-24 right-6 w-[360px] max-w-[calc(100vw-2rem)] z-50 rounded-2xl border border-cyan-400/40 bg-slate-950/80 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,240,255,0.25)] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-cyan-400/25 bg-gradient-to-r from-cyan-500/20 via-violet-500/15 to-fuchsia-500/20">
              <p className="text-sm text-cyan-100 font-medium">CADGuard AI Assistant</p>
              <p className="text-xs text-slate-300">Fix this design, explain issue, optimize model</p>
            </div>

            <div className="h-80 overflow-y-auto p-3 space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-cyan-500/20 border border-cyan-400/35 text-cyan-100 ml-8'
                      : 'bg-slate-900/80 border border-slate-700 text-slate-100 mr-8'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {loading && <p className="text-xs text-cyan-200">Thinking...</p>}
            </div>

            <div className="px-3 pb-3 space-y-2">
              <div className="flex gap-2">
                <button onClick={() => sendMessage('Fix this design')} className="text-xs px-2 py-1 rounded border border-cyan-400/35 text-cyan-100 hover:bg-cyan-500/15">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  Fix this design
                </button>
                <button onClick={triggerAutoFixDemo} className="text-xs px-2 py-1 rounded border border-emerald-400/35 text-emerald-100 hover:bg-emerald-500/15">
                  <Wrench className="w-3 h-3 inline mr-1" />
                  Auto-fix
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendMessage(input);
                }}
                className="flex gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your design..."
                  className="flex-1 rounded-lg border border-slate-600 bg-slate-900/80 text-slate-100 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-3 py-2 rounded-lg border border-cyan-400/45 bg-cyan-500/15 text-cyan-100 text-sm disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
