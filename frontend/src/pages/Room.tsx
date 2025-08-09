// src/pages/Room.tsx
import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { useParams, useNavigate } from "react-router-dom";
import type { Message, MessageStatus, WsInbound, WsOutbound } from "../types";

function formatRelative(iso?: string | null) {
  if (!iso) return "offline";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "last seen just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `last seen ${m} min${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `last seen ${h} hour${h > 1 ? "s" : ""} ago`;
  return `last seen on ${d.toLocaleDateString()}`;
}

function formatWaClock(dt: Date) {
  const s = dt.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return s.toLowerCase();
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function formatDateLabel(d: Date) {
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (isSameDay(d, today)) return "Today";
  if (isSameDay(d, yest)) return "Yesterday";
  return d.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function TickIcon({ status }: { status: MessageStatus }) {
  // one gray check (sent), two gray checks (delivered), two blue checks (seen)
  const color = status === "seen" ? "#0a80ff" : "#777";
  if (status === "sent") {
    return (
      <svg
        aria-label="Sent"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 18"
        className="w-4 h-4"
        fill={color}
      >
        <path d="M7.629 13.314L2.9 8.586l1.414-1.414 3.315 3.314 8.057-8.057L17.1 3.843z" />
      </svg>
    );
  }
  // delivered or seen => double ticks
  return (
    <svg
      aria-label={status === "seen" ? "Seen" : "Delivered"}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 28 18"
      className="w-5 h-5"
      fill={color}
    >
      <path d="M9.5 13.3L4.8 8.6l1.4-1.4 3.3 3.3L17.6 2l1.4 1.4z" />
      <path d="M13.8 13.3l-4.7-4.7 1.4-1.4 3.3 3.3L21.9 2l1.4 1.4z" />
    </svg>
  );
}

export default function Room() {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  const { username = "" } = useParams<{ username: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [typingPeer, setTypingPeer] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const meRef = useRef<string | null>(null);
  const typingTimer = useRef<number | null>(null);
  const lastTypingSent = useRef<number>(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    async function pingPresence() {
      try {
        const r = await api.get<{ online: boolean; last_seen: string | null }>(
          `/chat/presence/${username}/`
        );
        if (!alive) return;
        setIsOnline(r.data.online);
        setLastSeen(r.data.last_seen ?? null);
      } catch {}
    }
    pingPresence();
    const t = window.setInterval(pingPresence, 20000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [username]);

  // Fetch history + open socket (logic unchanged)
  useEffect(() => {
    let mounted = true;

    async function boot() {
      const hist = await api.get<Message[]>(`/chat/history/${username}/`);
      if (!mounted) return;
      setMessages(hist.data);

      const token = localStorage.getItem("access");
      const wsBase =
        (import.meta.env.VITE_WS_BASE as string) ||
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;
      const ws = new WebSocket(`${wsBase}/ws/chat/${username}/?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        // mark all as seen in this room
        sendWS({ type: "receipt.seen_all" });
      };

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data) as WsInbound;
        console.log("[WS IN]", msg);

        if (msg.type === "message.new") {
          setMessages((prev) => [...prev, msg.message]);

          // if I am the receiver, ack delivered + seen (room is open)
          const m = msg.message;
          const myname = meRef.current;
          if (myname && m.receiver.username === myname) {
            sendWS({ type: "receipt.delivered", message_id: m.id });
            sendWS({ type: "receipt.seen_all" });
          }
        } else if (msg.type === "receipt.update") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.message_id
                ? {
                    ...m,
                    status: msg.status,
                    delivered_at: msg.ts ?? m.delivered_at,
                    seen_at:
                      msg.status === "seen" ? msg.ts ?? m.seen_at : m.seen_at,
                  }
                : m
            )
          );
        } else if (msg.type === "receipt.bulk_seen") {
          const map = new Map(msg.items.map((i) => [i.id, i.ts]));
          setMessages((prev) =>
            prev.map((m) =>
              map.has(m.id)
                ? { ...m, status: "seen", seen_at: map.get(m.id) ?? m.seen_at }
                : m
            )
          );
        } else if (msg.type === "typing") {
          setTypingPeer(!!msg.active);
          if (msg.active) {
            window.clearTimeout(typingTimer.current ?? undefined);
            typingTimer.current = window.setTimeout(
              () => setTypingPeer(false),
              5000
            );
          }
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
      };
    }

    // who am I?
    api
      .get("/auth/me/")
      .then((r) => {
        meRef.current = r.data.username;
      })
      .catch(() => {
        meRef.current = null;
      });

    boot();
    return () => {
      mounted = false;
      wsRef.current?.close();
      window.clearTimeout(typingTimer.current ?? undefined);
    };
  }, [username]);

  // auto scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendWS(payload: WsOutbound) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    console.log("[WS OUT]", payload);
    ws.send(JSON.stringify(payload));
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    const txt = text.trim();
    if (!txt) return;
    sendWS({ type: "message.send", text: txt });
    setText("");
  }

  // typing indicator throttling (logic unchanged)
  useEffect(() => {
    if (!text) {
      sendWS({ type: "typing.stop" });
      return;
    }
    const now = Date.now();
    if (now - lastTypingSent.current > 2000) {
      sendWS({ type: "typing.start" });
      lastTypingSent.current = now;
    }
    const t = window.setTimeout(() => sendWS({ type: "typing.stop" }), 2000);
    return () => window.clearTimeout(t);
  }, [text]);

  return (
    <div className="flex flex-col h-full bg-[#efeae2]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#075E54] text-white shadow-md">
        <button
          onClick={() => navigate("/")}
          className="md:hidden p-2 rounded-full bg-[#075E54] hover:bg-[#0b7d6e] focus:outline-none"
          aria-label="Back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#075E54] font-bold">
          {username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-base font-semibold">@{username}</h2>
          <span className="text-xs opacity-80">
            {typingPeer
              ? "typing…"
              : isOnline
              ? "online"
              : formatRelative(lastSeen)}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-chat-pattern bg-repeat">
        {messages.map((m, i) => {
          const curDate = new Date(m.created_at);
          const prev = messages[i - 1];
          const showDateChip =
            i === 0 || !isSameDay(curDate, new Date(prev.created_at));
          const mine = meRef.current && m.sender.username === meRef.current;

          return (
            <div key={m.id ?? `${curDate.getTime()}-${i}`}>
              {showDateChip && (
                <div className="flex justify-center my-3">
                  <span className="px-3 py-1 text-xs bg-[#e2f3ea] text-gray-700 rounded-full shadow-sm">
                    {formatDateLabel(curDate)}
                  </span>
                </div>
              )}

              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`relative max-w-xs px-3 py-2 rounded-lg shadow-sm text-sm ${
                    mine
                      ? "bg-[#DCF8C6] text-gray-900 rounded-br-none"
                      : "bg-white text-gray-900 rounded-bl-none"
                  }`}
                >
                  <p>{m.text}</p>

                  <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1 justify-end">
                    {formatWaClock(curDate)}
                    {mine && <TickIcon status={m.status} />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={send}
        className="flex items-center gap-2 p-3 bg-[#f0f0f0] border-t border-gray-300"
      >
        <button
          type="button"
          className="p-2 rounded-full hover:bg-gray-200"
          title="Emoji"
          aria-label="Emoji"
        >
          😊
        </button>
        <input
          className="flex-1 p-2 text-sm border rounded-full focus:outline-none focus:ring-2 focus:ring-[#075E54]"
          placeholder="Type a message"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          className="bg-[#075E54] hover:bg-[#0b7d6e] text-white px-4 py-2 rounded-full"
        >
          Send
        </button>
      </form>
    </div>
  );
}
