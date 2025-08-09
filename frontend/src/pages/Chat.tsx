import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import type { UserPublic } from "../types";
import Room from "./Room";

export default function Chat() {
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [me, setMe] = useState<string>("");
  const [search, setSearch] = useState(""); // 🔍 state for search
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    api.get<UserPublic[]>("/chat/users/").then((r) => setUsers(r.data));
    api.get("/auth/me/").then((r) => setMe(r.data.username));
  }, []);

  function logout() {
    localStorage.clear();
    window.location.href = "/login";
  }

  // Filter users based on search
  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.first_name &&
        u.first_name.toLowerCase().includes(search.toLowerCase())) ||
      (u.last_name && u.last_name.toLowerCase().includes(search.toLowerCase()))
  );

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
            <button
              onClick={logout}
              className="text-xs bg-white/15 hover:bg-white/25 rounded px-2 py-1"
            >
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

          {/* Users list */}
          <ul className="flex-1 overflow-y-auto bg-white">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const active = u.username === username;
                return (
                  <li key={u.id}>
                    <Link
                      to={`/chat/${u.username}`}
                      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${
                        active ? "bg-gray-100" : ""
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#ddd] flex items-center justify-center font-semibold">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          {/* First line: Full name OR username if no full name */}
                          <div className="font-medium text-gray-900 truncate">
                            {u.first_name || u.last_name
                              ? `${u.first_name ?? ""} ${
                                  u.last_name ?? ""
                                }`.trim()
                              : `${u.username}`}
                          </div>

                          {/* Second line: Always username (smaller, muted) */}
                          <div className="text-xs text-gray-500 truncate">
                            @{u.username}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })
            ) : (
              <li className="px-4 py-3 text-gray-500 text-sm">
                No users found
              </li>
            )}
          </ul>
        </aside>

        {/* RIGHT: Chat Area */}
        <main
          className={[
            "bg-[#efeae2]",
            "md:flex-1",
            username ? "flex w-full" : "hidden md:flex",
          ].join(" ")}
        >
          {username ? (
            <div className="flex-1 min-h-0">
              <Room />
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-2xl font-semibold mb-2">
                  WhatsApp-style Chat
                </div>
                <div>Select a user on the left to start messaging</div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
