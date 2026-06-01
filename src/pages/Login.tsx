import { useState } from 'react'
import { Mail, Lock, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react'

const CamoLogo = ({ size = 88 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="camoGrad" x1="15" y1="10" x2="85" y2="90" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF1B6B" />
        <stop offset="50%" stopColor="#A855F7" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
    </defs>
    <path
      d="M 78 28 A 32 32 0 1 0 78 72"
      stroke="url(#camoGrad)"
      strokeWidth="18"
      strokeLinecap="round"
    />
    <circle cx="68" cy="50" r="7.5" fill="url(#camoGrad)" />
  </svg>
)

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-between p-6 py-10" dir="ltr">
      {/* Top spacer */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <CamoLogo size={96} />
          <h1 className="text-3xl font-bold text-white tracking-tight mt-6">Camo</h1>
          <p className="text-gray-500 text-sm mt-1">Capture the moment</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="w-full space-y-4 mt-8">
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">Email or Username</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-10 pr-10 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-colors"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/30 mt-6"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-black px-3 text-gray-500">or</span>
            </div>
          </div>

          <button
            type="button"
            className="w-full border border-zinc-800 text-gray-300 font-medium py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-900 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Create Account
          </button>
        </form>
      </div>

      {/* Bottom footer */}
      <div className="w-full max-w-sm mt-8">
        <p className="text-gray-600 text-xs text-center">By continuing, you agree to our Terms & Privacy</p>
        {/* Page dots */}
        <div className="flex justify-center gap-1.5 mt-4">
          <div className="w-6 h-1 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500" />
          <div className="w-1.5 h-1 rounded-full bg-zinc-700" />
          <div className="w-1.5 h-1 rounded-full bg-zinc-700" />
        </div>
      </div>
    </div>
  )
}
