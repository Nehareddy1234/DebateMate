import { useState } from 'react'

export default function AuthScreen({ onLogin, onRegister, initialMode = 'login', onBack }) {
    const [mode, setMode] = useState(initialMode)   // 'login' | 'register'
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(null)
    const [showPassword, setShowPassword] = useState(false)

    const submit = async (e) => {
        e.preventDefault()
        setBusy(true)
        setError(null)
        try {
            if (mode === 'login') await onLogin(username.trim(), password)
            else await onRegister(username.trim(), email.trim(), password)
        } catch (err) {
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="h-screen w-screen overflow-y-auto human-bg flex flex-col justify-center items-center p-6 selection:bg-sky-500/20">
            {/* Back link */}
            {onBack && (
                <div className="w-full max-w-sm mb-4">
                    <button
                        onClick={onBack}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        <span>←</span>
                        <span>Back</span>
                    </button>
                </div>
            )}

            {/* Header branding */}
            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border border-white/[0.08] text-slate-200 font-bold text-sm mb-2 shadow-sm">
                    D
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-100">
                    DebateMate
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                    Sign in to track your debate sessions
                </p>
            </div>

            {/* Clean Auth Card */}
            <div className="w-full max-w-sm human-panel p-6 sm:p-7 border border-white/[0.08]">
                {/* Switcher */}
                <div className="flex p-1 bg-slate-900/80 rounded-xl border border-white/[0.06] mb-5">
                    <button
                        type="button"
                        onClick={() => { setMode('login'); setError(null) }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            mode === 'login'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => { setMode('register'); setError(null) }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            mode === 'register'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        Create Account
                    </button>
                </div>

                {/* Error message */}
                {error && (
                    <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={submit} className="flex flex-col gap-3.5">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                            Username
                        </label>
                        <input
                            type="text"
                            required
                            autoFocus
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="e.g. alex"
                            className="w-full px-3 py-2 rounded-lg bg-slate-900/90 border border-white/[0.08] text-slate-100 text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all placeholder:text-slate-600 font-sans"
                        />
                    </div>

                    {mode === 'register' && (
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="alex@example.com"
                                className="w-full px-3 py-2 rounded-lg bg-slate-900/90 border border-white/[0.08] text-slate-100 text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all placeholder:text-slate-600 font-sans"
                            />
                        </div>
                    )}

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-medium text-slate-400">
                                Password
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-[10px] text-slate-400 hover:text-slate-300"
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 rounded-lg bg-slate-900/90 border border-white/[0.08] text-slate-100 text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all placeholder:text-slate-600 font-sans"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={busy}
                        className="w-full mt-2 py-2.5 rounded-lg font-semibold text-xs text-slate-900 bg-white hover:bg-slate-200 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {busy ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                                <span>Authenticating…</span>
                            </>
                        ) : (
                            <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
