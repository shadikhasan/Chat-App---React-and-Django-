// src/pages/Chat.tsx
import { useEffect, useState, useRef } from "react"
import { Link, useParams } from "react-router-dom"
import { api } from "../api"
import Room from "./Room"
import type { ThreadItem, MessageStatus } from "../types"
import { stopPresence } from "../presence"

const safeLower = (s?: string | null) => (s ?? "").toLowerCase()
const snippet = (s?: string, n = 42) => (!s ? "" : s.length > n ? s.slice(0, n - 1) + "…" : s)
const timeLabel = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""

function TickIcon({ status }: { status: MessageStatus }) {
  const color = status === "seen" ? "#0a80ff" : "#777"
  if (status === "sent") {
    return (
      <svg aria-label="Sent" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 18" className="w-4 h-4" fill={color}>
        <path d="M7.629 13.314L2.9 8.586l1.414-1.414 3.315 3.314 8.057-8.057L17.1 3.843z" />
      </svg>
    )
  }
  return (
    <svg aria-label={status === "seen" ? "Seen" : "Delivered"} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 18" className="w-5 h-5" fill={color}>
      <path d="M9.5 13.3L4.8 8.6l1.4-1.4 3.3 3.3L17.6 2l1.4 1.4z" />
      <path d="M13.8 13.3l-4.7-4.7 1.4-1.4 3.3 3.3L21.9 2l1.4 1.4z" />
    </svg>
  )
}

type InboxEvent =
  | { type: "thread.update"; user: ThreadItem["user"]; unread_count: number; last_message: ThreadItem["last_message"] }

export default function Chat() {
  const [items, setItems] = useState<ThreadItem[]>([])
  const [me, setMe] = useState<string>("")
  const [search, setSearch] = useState("")
  const { username } = useParams<{ username: string }>()
  const wsRef = useRef<WebSocket | null>(null)

  // initial load
  useEffect(() => {
    api.get<ThreadItem[]>("/chat/users/").then(r => setItems(Array.isArray(r.data) ? r.data : []))
    api.get("/auth/me/").then(r => setMe(r.data?.username ?? ""))
  }, [])

  // inbox websocket for realtime thread updates
  useEffect(() => {
    const token = localStorage.getItem("access")
    if (!token) return
    const wsBase = (import.meta.env.VITE_WS_BASE as string) || `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`
    const ws = new WebSocket(`${wsBase}/ws/inbox/?token=${token}`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data) as InboxEvent
      if (msg.type === "thread.update" && msg.user?.username) {
        setItems(prev => {
          const idx = prev.findIndex(t => t.user.username === msg.user.username)
          const updated: ThreadItem = {
            user: msg.user,
            unread_count: msg.unread_count,
            last_message: msg.last_message ?? null,
          }
          const next = idx >= 0 ? (() => { const copy = [...prev]; copy[idx] = updated; return copy })() : [updated, ...prev]
          // sort by last message time desc
          next.sort((a, b) => {
            const ta = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0
            const tb = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0
            return tb - ta
          })
          return next
        })
      }
    }

    ws.onclose = () => { wsRef.current = null }
    return () => { ws.close() }
  }, [])

  function logout() {
    stopPresence()
    localStorage.clear()
    window.location.href = "/login"
  }

  const filtered = items.filter(t => {
    const u = t?.user
    const q = safeLower(search)
    return (
      safeLower(u?.username).includes(q) ||
      safeLower(u?.first_name).includes(q) ||
      safeLower(u?.last_name).includes(q)
    )
  })

  return (
    <div className="h-screen w-screen bg-[#111] flex items-center justify-center">
      <div className="h-[92vh] w-[95vw] bg-white shadow-xl rounded-lg overflow-hidden flex">

        {/* LEFT: Sidebar */}
        <aside
          className={[
            "border-r border-gray-200 flex flex-col",
            "w-full max-w-[360px]",
            username ? "hidden md:flex" : "flex",
          ].join(" ")}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-[#075E54] text-white px-4 py-3">
            <div className="font-semibold truncate">@{me || "me"}</div>
            <button onClick={logout} className="text-xs bg-white/15 hover:bg-white/25 rounded px-2 py-1">
              Logout
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-2 bg-[#ededed]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-white rounded-md border border-gray-300 outline-none"
              placeholder="Search or start new chat"
            />
          </div>

          {/* Threads with ticks */}
          <ul className="flex-1 overflow-y-auto bg-white">
            {filtered.length > 0 ? (
              filtered.map((t) => {
                const u = t.user
                const active = u.username === username
                const lm = t.last_message
                const preview = lm ? (lm.from_me ? `You: ${snippet(lm.text)}` : snippet(lm.text)) : "No messages yet"
                const time = timeLabel(lm?.created_at)
                const unread = t.unread_count || 0
                const fullName = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim()

                return (
                  <li key={u.id}>
                    <Link
                      to={`/chat/${u.username}`}
                      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${active ? "bg-gray-100" : ""}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#ddd] flex items-center justify-center font-semibold">
                        {u.username.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Top row: Name + time */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{fullName || u.username}</div>
                            <div className="text-xs text-gray-500 truncate">@{u.username}</div>
                          </div>
                          <div className="text-xs text-gray-500 flex-shrink-0">{time}</div>
                        </div>

                        {/* Bottom row: preview + ticks + unread */}
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <div className="text-sm text-gray-700 opacity-90 truncate flex items-center gap-1">
                            {/* show ticks only if last message is mine */}
                            {lm?.from_me && lm?.status && <TickIcon status={lm.status} />}
                            <span className="truncate">{preview}</span>
                          </div>
                          {unread > 0 && (
                            <div className="ml-2 min-w-[20px] h-[20px] px-2 bg-[#25D366] text-white rounded-full text-xs font-bold flex items-center justify-center" aria-label={`${unread} unread`}>
                              {unread}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })
            ) : (
              <li className="px-4 py-3 text-gray-500 text-sm">No users found</li>
            )}
          </ul>
        </aside>

        {/* RIGHT: Chat Area */}
        <main className={["bg-[#efeae2]", "md:flex-1", username ? "flex w-full" : "hidden md:flex"].join(" ")}>
          {username ? (
            <div className="flex-1 min-h-0"><Room /></div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-2xl font-semibold mb-2">WhatsApp-style Chat</div>
                <div>Select a user on the left to start messaging</div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
