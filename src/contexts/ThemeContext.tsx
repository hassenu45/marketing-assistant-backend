import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import db from '../db/database'

type AccentColor = 'teal' | 'blue' | 'emerald' | 'rose' | 'amber' | 'sky'

type ThemeContextType = {
  dark: boolean
  toggle: () => void
  accent: AccentColor
  setAccent: (c: AccentColor) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [accent, setAccentState] = useState<AccentColor>('teal')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent)
    db.appSettings.where('key').equals('accentColor').modify({ value: accent }).catch(() => {})
  }, [accent])

  useEffect(() => {
    db.appSettings.where('key').equals('accentColor').first().then(s => {
      if (s) setAccentState(s.value as AccentColor)
    }).catch(() => {})
  }, [])

  const toggle = () => setDark(prev => !prev)

  const setAccent = (c: AccentColor) => {
    setAccentState(c)
    localStorage.setItem('accent', c)
  }

  return (
    <ThemeContext.Provider value={{ dark, toggle, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
