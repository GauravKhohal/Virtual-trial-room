import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { answerFashionQuery } from '../ai/fashionAssistant';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export default function FashionAssistantPage() {
  const { selection } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: "Hi! I'm your AI Fashion Assistant. Ask me what to wear for any occasion." },
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg: Message = { role: 'user', text: input };
    const reply = answerFashionQuery(input, selection.gender);
    setMessages((prev) => [...prev, userMsg, { role: 'assistant', text: reply }]);
    setInput('');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">AI Fashion Assistant</h1>
      <p className="text-slate-500 mt-1">e.g. "What should I wear for my cousin's wedding?"</p>

      <div className="mt-6 border border-slate-200 rounded-2xl p-4 h-96 overflow-y-auto flex flex-col gap-3 bg-slate-50">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
              m.role === 'user' ? 'self-end bg-indigo-600 text-white' : 'self-start bg-white border border-slate-200 text-slate-700'
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about an outfit, color, or size..."
          className="flex-1 border border-slate-300 rounded-full px-4 py-2 text-sm"
        />
        <button type="submit" className="px-5 py-2 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700">
          Send
        </button>
      </form>
    </div>
  );
}
