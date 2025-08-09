import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { useParams, useNavigate } from "react-router-dom";
import type { Message } from "../types";

function formatWaClock(dt: Date) {
  // "7:05 PM" -> "7:05 pm"
  const s = dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  return s.toLowerCase();
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function formatDateLabel(d: Date) {
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);

  if (isSameDay(d, today)) return "Today";
  if (isSameDay(d, yest)) return "Yesterday";
  return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }); // e.g., "Aug 9, 2025"
}

export default function Room() {
  const { username = "" } = useParams<{ username: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<Message[]>(`/chat/history/${username}/`).then((r) => setMessages(r.data));

    const token = localStorage.getItem("access");
    const wsBase =
      (import.meta.env.VITE_WS_BASE as string) ||
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;
    const ws = new WebSocket(`${wsBase}/ws/chat/${username}/?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const m: Message = JSON.parse(e.data);
      setMessages((prev) => [...prev, m]);
    };

    return () => ws.close();
  }, [username]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const txt = text.trim();
    if (!txt || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ text: txt }));
    setText("");
  }

  return (
    <div className="flex flex-col h-full bg-[#efeae2]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#075E54] text-white shadow-md">
        <button
          onClick={() => navigate("/")}
          className="md:hidden p-2 rounded-full bg-[#075E54] hover:bg-[#0b7d6e] focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#075E54] font-bold">
          {username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-base font-semibold">{username}</h2>
          <span className="text-xs opacity-80">online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-chat-pattern bg-repeat">
        {messages.map((m, i) => {
          const isSender = m.sender?.username !== username;
          const curDate = new Date(m.created_at);
          const prev = messages[i - 1];
          const showDateChip = i === 0 || !isSameDay(curDate, new Date(prev.created_at));

          return (
            <div key={m.id ?? `${curDate.getTime()}-${i}`}>
              {showDateChip && (
                <div className="flex justify-center my-3">
                  <span className="px-3 py-1 text-xs bg-[#e2f3ea] text-gray-700 rounded-full shadow-sm">
                    {formatDateLabel(curDate)}
                  </span>
                </div>
              )}

              <div className={`flex ${isSender ? "justify-end" : "justify-start"}`}>
                <div
                  className={`relative max-w-xs px-3 py-2 rounded-lg shadow-sm text-sm ${
                    isSender
                      ? "bg-[#DCF8C6] text-gray-900 rounded-br-none"
                      : "bg-white text-gray-900 rounded-bl-none"
                  }`}
                >
                  <p>{m.text}</p>
                  <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1 justify-end">
                    {formatWaClock(curDate)}
                    {isSender && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 15"
                        className="w-4 h-4 text-blue-500"
                        fill="currentColor"
                      >
                        <path d="M15.01 3.69L6.21 12.5l-4.71-4.7 1.06-1.06 3.65 3.65 7.74-7.73 1.06 1.06z" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="flex items-center gap-2 p-3 bg-[#f0f0f0] border-t border-gray-300">
        <button type="button" className="p-2 rounded-full hover:bg-gray-200" title="Emoji">
          😊
        </button>
        <input
          className="flex-1 p-2 text-sm border rounded-full focus:outline-none focus:ring-2 focus:ring-[#075E54]"
          placeholder="Type a message"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="bg-[#075E54] hover:bg-[#0b7d6e] text-white px-4 py-2 rounded-full">
          Send
        </button>
      </form>
    </div>
  );
}
