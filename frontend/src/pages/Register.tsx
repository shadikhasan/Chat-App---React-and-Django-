import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function Register() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: ''
  })
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setMsg('')
    try {
      await api.post('/auth/register/', form)
      setMsg('✅ Account created. You can log in now.')
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Registration failed')
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* LEFT PANEL (Form) */}
      <div className="flex flex-col justify-center flex-1 max-w-full md:max-w-[50%] bg-gray-50 px-6 lg:px-12">
        <form
          onSubmit={submit}
          className="w-full max-w-md mx-auto bg-white p-8 rounded-lg shadow-md space-y-4"
        >
          <h2 className="text-2xl font-bold text-center text-gray-800">
            Create Account
          </h2>

          {msg && <div className="text-green-600 text-sm">{msg}</div>}
          {err && <div className="text-red-600 text-sm">{err}</div>}

          <input
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
            className="w-full px-4 py-2 border rounded-lg bg-blue-50 outline-none focus:ring-2 focus:ring-[#075E54]"
          />

          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg bg-blue-50 outline-none focus:ring-2 focus:ring-[#075E54]"
          />

          <div className="flex gap-3">
            <input
              placeholder="First Name"
              value={form.first_name}
              onChange={(e) =>
                setForm({ ...form, first_name: e.target.value })
              }
              className="w-1/2 px-4 py-2 border rounded-lg bg-blue-50 outline-none focus:ring-2 focus:ring-[#075E54]"
            />
            <input
              placeholder="Last Name"
              value={form.last_name}
              onChange={(e) =>
                setForm({ ...form, last_name: e.target.value })
              }
              className="w-1/2 px-4 py-2 border rounded-lg bg-blue-50 outline-none focus:ring-2 focus:ring-[#075E54]"
            />
          </div>

          <input
            placeholder="Password (min 8)"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            className="w-full px-4 py-2 border rounded-lg bg-blue-50 outline-none focus:ring-2 focus:ring-[#075E54]"
          />

          <button
            type="submit"
            className="w-full bg-[#075E54] hover:bg-[#064c44] text-white py-2 px-4 rounded-lg font-semibold"
          >
            Register
          </button>

          <p className="text-sm text-gray-600 text-center">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#075E54] hover:underline font-medium"
            >
              Login
            </Link>
          </p>
        </form>
      </div>

      {/* RIGHT PANEL */}
      <div className="hidden md:flex flex-1 max-w-[50%] bg-[#075E54] text-white items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Join Us Today!</h1>
          <p className="max-w-sm mx-auto text-white/90">
            Create your account and start chatting instantly with friends.
          </p>
        </div>
      </div>
    </div>
  )
}
