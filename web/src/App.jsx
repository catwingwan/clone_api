import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "./config";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const res = await axios.post(`${API_BASE}/chats/demo/message`, userMsg);
      setMessages((prev) => [...prev, { role: "assistant", content: res.data.assistant }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Error: " + err.message }]);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl mb-4">TypingMind Demo</h1>
      <div className="border rounded p-4 h-96 overflow-auto mb-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "assistant" ? "text-gray-800 mb-2" : "text-blue-700 mb-2"}>
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
        <button onClick={sendMessage} className="bg-blue-600 text-white px-4 rounded">
          Send
        </button>
      </div>
    </div>
  );
}
