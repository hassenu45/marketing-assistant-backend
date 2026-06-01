import { useState } from 'react'
import { Bot, Mail, Lock, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: implement
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6" dir="ltr">
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center shadow-2xl mb-4">
          <Bot className="text-white w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Camo</h1>
        <p className="text-gray-500 text-sm mt-1">AI Marketing Assistant</p>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        <div className="space-y-1">
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Email or Username</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-10 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-10 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/25"
        >
          <LogIn className="w-4 h-4" />
          Sign In
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-black px-2 text-gray-500">or</span>
          </div>
        </div>

        <button
          type="button"
          className="w-full border border-zinc-800 text-gray-300 font-medium py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-900 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Create Account
        </button>
      </form>

      <p className="text-gray-600 text-xs mt-8">By continuing, you agree to our Terms & Privacy</p>
    </div>
  )
}
