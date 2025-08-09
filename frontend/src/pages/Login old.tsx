import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Me } from "../types";

type TokenPair = { access: string; refresh: string; user?: any };

type FieldErrors = {
  username?: string;
  password?: string;
};

export default function Login() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const [apiError, setApiError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) return;
    api
      .get<Me>("/auth/me/")
      .then(() => (window.location.href = "/"))
      .catch(() => {});
  }, []);

  // naive client-side validation (fast feedback)
  const clientErrors = useMemo(() => {
    const errs: FieldErrors = {};
    if (!username.trim()) errs.username = "Username is required.";
    if (!password) errs.password = "Password is required.";
    return errs;
  }, [username, password]);

  function resetErrors() {
    setApiError("");
    setFieldErrors({});
  }

  function prettifyMessage(msg: string) {
    const map: Record<string, string> = {
      "No active account found with the given credentials.": "Invalid username or password.",
      "This field may not be blank.": "This field is required.",
    };
    return map[msg] || msg;
  }

  function parseApiErrors(error: any) {
    const data = error?.response?.data;

    if (!data) {
      setApiError("⚠️ Network error — please check your connection.");
      return;
    }

    const fe: FieldErrors = {};
    let globalMessage = "";

    // DRF: detail
    if (typeof data.detail === "string") {
      globalMessage = prettifyMessage(data.detail);
    }

    // DRF: field-level errors
    ["username", "password"].forEach((field) => {
      if (data[field]) {
        fe[field] = Array.isArray(data[field])
          ? data[field].map(prettifyMessage).join(" ")
          : prettifyMessage(data[field]);
      }
    });

    // DRF: non_field_errors
    if (data.non_field_errors) {
      const msg = Array.isArray(data.non_field_errors)
        ? data.non_field_errors.map(prettifyMessage).join(" ")
        : prettifyMessage(data.non_field_errors);
      if (!globalMessage) globalMessage = msg;
    }

    setFieldErrors(fe);
    if (globalMessage) setApiError(globalMessage);
    else if (!Object.keys(fe).length) {
      setApiError("❌ Login failed — please check your credentials.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    resetErrors();

    // client-side guard
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post<TokenPair>("/auth/login/", { username, password });
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);
      if (data.user) localStorage.setItem("me", JSON.stringify(data.user));
      window.location.href = "/";
    } catch (err: any) {
      parseApiErrors(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel */}
      <div className="flex flex-col justify-center w-full md:w-1/2 px-6 lg:px-12 bg-gray-50">
        <div className="max-w-md w-full mx-auto bg-white shadow-lg rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">Welcome back</h1>
          <p className="text-center text-gray-500 mb-6">Sign in to continue your conversation</p>

          {/* Global Error */}
          {apiError && (
            <div
              className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-700 text-sm animate-fadeIn"
              role="alert"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 4.93l14.14 14.14" />
              </svg>
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                autoComplete="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setU(e.target.value)}
                className={[
                  "mt-1 w-full px-4 py-2 text-sm rounded-md border bg-gray-50 outline-none",
                  fieldErrors.username
                    ? "border-red-300 focus:ring-2 focus:ring-red-400"
                    : "border-gray-300 focus:ring-2 focus:ring-[#075E54]",
                ].join(" ")}
                aria-invalid={!!fieldErrors.username}
                aria-describedby={fieldErrors.username ? "username-error" : undefined}
              />
              {fieldErrors.username && (
                <p id="username-error" className="mt-1 text-xs text-red-600 animate-fadeIn">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setP(e.target.value)}
                  onKeyUp={(e) => setCapsOn(e.getModifierState && e.getModifierState("CapsLock"))}
                  className={[
                    "w-full px-4 py-2 text-sm rounded-md border bg-gray-50 outline-none pr-10",
                    fieldErrors.password
                      ? "border-red-300 focus:ring-2 focus:ring-red-400"
                      : "border-gray-300 focus:ring-2 focus:ring-[#075E54]",
                  ].join(" ")}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={
                    fieldErrors.password || capsOn ? "password-help" : undefined
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute inset-y-0 right-2 my-auto text-xs px-2 py-1 rounded hover:bg-gray-100"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
              {(fieldErrors.password || capsOn) && (
                <div id="password-help" className="mt-1 space-y-1 animate-fadeIn">
                  {fieldErrors.password && (
                    <p className="text-xs text-red-600">{fieldErrors.password}</p>
                  )}
                  {capsOn && (
                    <p className="text-xs text-amber-600">Caps Lock is ON.</p>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className={[
                "w-full py-2 text-sm font-medium text-white rounded-md transition flex items-center justify-center",
                submitting ? "bg-[#0b7d6e]/70 cursor-not-allowed" : "bg-[#075E54] hover:bg-[#0b7d6e]",
              ].join(" ")}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                  Signing in…
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <a href="/forgot-password" className="text-[#075E54] hover:underline">
              Forgot password?
            </a>
            <a href="/register" className="text-[#075E54] hover:underline">
              Create account
            </a>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="hidden md:flex w-1/2 bg-[#075E54] text-white items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h2 className="text-4xl font-bold mb-4">Chat. Call. Connect.</h2>
          <p className="text-white/90">
            Fast, secure messaging with real-time voice and video.
          </p>
        </div>
      </div>
    </div>
  );
}
