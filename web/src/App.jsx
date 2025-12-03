import React, { useState } from 'react';
import axios from 'axios';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('jwt') || '');
  const [chatId, setChatId] = useState('demo-chat-1');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);

  const send = async () => {
    if (!input) return;
    const myMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, myMsg]);
    setInput('');
    try {
      const resp = await axios.post(`http://localhost:4000/chats/${chatId}/message`, myMsg, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: resp.data.assistant }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error: ' + err.message }]);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl mb-4">Clone Demo</h1>
      <input
        placeholder="JWT token"
        value={token}
        onChange={(e) => {
          setToken(e.target.value);
          localStorage.setItem('jwt', e.target.value);
        }}
        className="border mb-4 p-1 w-80"
      />
      <div className="border rounded p-4 h-96 overflow-auto mb-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'assistant' ? 'text-gray-800 mb-2' : 'text-blue-700 mb-2'}>
            <div className="text-sm opacity-60">{m.role}</div>
            <div className="mt-1 whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
      </div>
      <div className="flex">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border p-2 mr-2"
          placeholder="Ask something..."
        />
        <button onClick={send} className="bg-blue-600 text-white px-4 rounded">
          Send
        </button>
      </div>
    </div>
  );
}
