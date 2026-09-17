import { useEffect, useState } from 'react'

function calculatePasswordStrength(pass) {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-700', checks: { length: false, mixed: false } }
    const hasLength = pass.length >= 8
    const hasLongLength = pass.length >= 12
    const hasMixedLetters = /[A-Z]/.test(pass) && /[a-z]/.test(pass)
    const hasNumbersOrSpecial = /[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)

    let score = 0
    if (hasLength) score += 1
    if (hasLongLength) score += 1
    if (hasMixedLetters) score += 1
    if (hasNumbersOrSpecial) score += 1

    let label = 'Weak'
    let color = 'bg-rose-500'
    if (score === 2) {
        label = 'Fair'
        color = 'bg-amber-500'
    } else if (score === 3) {
        label = 'Good'
        color = 'bg-sky-500'
    } else if (score === 4) {
        label = 'Strong'
        color = 'bg-emerald-500'
    }

    return {
        score,
        label,
        color,
        checks: {
            length: hasLength,
            mixed: hasMixedLetters || hasNumbersOrSpecial,
        },
    }
}

export default function AuthScreen({ onLogin, onRegister, onResetPassword, initialMode = 'login', onBack }) {
    const [mode, setMode] = useState(initialMode)   // 'login' | 'register' | 'reset'
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(true)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(null)
    const [successMessage, setSuccessMessage] = useState(null)
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        setError(null)
        setSuccessMessage(null)
        setConfirmPassword('')
    }, [mode])

    const strength = calculatePasswordStrength(password)
    const isConfirmMatching = !confirmPassword || password === confirmPassword

    const submit = async (e) => {
        e.preventDefault()
        setError(null)
        setSuccessMessage(null)

        if ((mode === 'register' || mode === 'reset') && password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        if ((mode === 'register' || mode === 'reset') && password.length < 8) {
            setError('Password must be at least 8 characters long.')
            return
        }

        setBusy(true)
        try {
            if (mode === 'login') {
                await onLogin(username.trim(), password)
            } else if (mode === 'register') {
                await onRegister(username.trim(), email.trim(), password)
            } else if (mode === 'reset') {
                await onResetPassword(username.trim(), email.trim(), password)
                setSuccessMessage('Password reset successfully! Logging you in...')
            }
        } catch (err) {
            setError(err.message || 'Authentication request failed')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="min-h-screen w-screen overflow-y-auto human-bg flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-sky-500/20">
            {/* Back navigation */}
            {onBack && (
                <div className="w-full max-w-md mb-4 flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors p-1"
                    >
                        <span>←</span>
                        <span>Back to home</span>
                    </button>
                </div>
            )}

            {/* Header branding */}
            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-white/[0.1] text-sky-400 font-bold text-base mb-3 shadow-lg shadow-sky-500/5 ring-1 ring-white/[0.05]">
                    D
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                    DebateMate
                </h1>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    {mode === 'reset'
                        ? 'Reset your password with your registered email'
                        : mode === 'register'
                        ? 'Join DebateMate to track your rounds and coaching notes'
                        : 'Sign in to access your sparring sessions and transcripts'}
                </p>
            </div>

            {/* Main Auth Card */}
            <div className="w-full max-w-md human-panel p-6 sm:p-8 border border-white/[0.08] shadow-2xl relative">
                {/* Mode Selector Tabs */}
                {mode !== 'reset' ? (
                    <div className="flex p-1 bg-slate-900/90 rounded-xl border border-white/[0.06] mb-6">
                        <button
                            type="button"
                            onClick={() => setMode('login')}
                            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                                mode === 'login'
                                    ? 'bg-white text-slate-900 shadow-md scale-[1.01]'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('register')}
                            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                                mode === 'register'
                                    ? 'bg-white text-slate-900 shadow-md scale-[1.01]'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            Create Account
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-100">Reset Password</span>
                            <span className="text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 font-mono">
                                Account Recovery
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setMode('login')}
                            className="text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors"
                        >
                            Back to Sign In
                        </button>
                    </div>
                )}

                {/* Error Banner */}
                {error && (
                    <div className="p-3.5 mb-5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
                        <span className="text-sm mt-0.5">⚠️</span>
                        <div className="flex-1 leading-relaxed">{error}</div>
                    </div>
                )}

                {/* Success Banner */}
                {successMessage && (
                    <div className="p-3.5 mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2.5 animate-fadeIn">
                        <span className="text-sm mt-0.5">✅</span>
                        <div className="flex-1 leading-relaxed">{successMessage}</div>
                    </div>
                )}

                {/* Form compliant with browser password managers */}
                <form
                    onSubmit={submit}
                    method="POST"
                    action="#"
                    className="flex flex-col gap-4"
                    autoComplete="on"
                >
                    {/* Username Field */}
                    <div>
                        <label
                            htmlFor="auth-username"
                            className="block text-xs font-medium text-slate-300 mb-1.5"
                        >
                            {mode === 'login' ? 'Username or Email' : 'Username'}
                        </label>
                        <input
                            id="auth-username"
                            name="username"
                            type="text"
                            autoComplete="username"
                            required
                            autoFocus
                            minLength={mode === 'login' ? 1 : 3}
                            maxLength={64}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={mode === 'login' ? 'Username or email address' : 'e.g. alex'}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/[0.08] text-slate-100 text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all placeholder:text-slate-600 font-sans"
                        />
                        {mode !== 'login' && (
                            <p className="text-[10px] text-slate-500 mt-1">
                                Letters, numbers, hyphens and dots only (3+ chars).
                            </p>
                        )}
                    </div>

                    {/* Email Field (for registration & reset) */}
                    {(mode === 'register' || mode === 'reset') && (
                        <div>
                            <label
                                htmlFor="auth-email"
                                className="block text-xs font-medium text-slate-300 mb-1.5"
                            >
                                {mode === 'reset' ? 'Registered Account Email' : 'Email Address'}
                            </label>
                            <input
                                id="auth-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="alex@example.com"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/[0.08] text-slate-100 text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all placeholder:text-slate-600 font-sans"
                            />
                            {mode === 'reset' && (
                                <p className="text-[10px] text-slate-500 mt-1">
                                    Must match the email address associated with your username.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Password Field */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label
                                htmlFor="auth-password"
                                className="block text-xs font-medium text-slate-300"
                            >
                                {mode === 'reset'
                                    ? 'New Password'
                                    : 'Password'}
                                {mode !== 'login' && (
                                    <span className="text-slate-500 font-normal ml-1">(min. 8 chars)</span>
                                )}
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
                                tabIndex="-1"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <>
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                        </svg>
                                        <span>Hide</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        <span>Show</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <input
                            id="auth-password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            required
                            minLength={mode === 'login' ? 1 : 8}
                            maxLength={128}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={mode === 'login' ? '••••••••' : 'At least 8 characters'}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/[0.08] text-slate-100 text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all placeholder:text-slate-600 font-sans"
                        />

                        {/* Password strength & requirements checklist */}
                        {mode !== 'login' && password && (
                            <div className="mt-2.5 space-y-1.5 p-2.5 rounded-lg bg-slate-900/60 border border-white/[0.04]">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-400">Security strength:</span>
                                    <span className={`font-semibold ${strength.color.replace('bg-', 'text-')}`}>
                                        {strength.label}
                                    </span>
                                </div>
                                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden flex gap-1">
                                    {[1, 2, 3, 4].map((step) => (
                                        <div
                                            key={step}
                                            className={`h-full flex-1 rounded-full transition-all duration-300 ${
                                                step <= strength.score ? strength.color : 'bg-slate-800'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 pt-1">
                                    <span className={strength.checks.length ? 'text-emerald-400' : 'text-slate-500'}>
                                        {strength.checks.length ? '✓' : '○'} 8+ characters
                                    </span>
                                    <span className={strength.checks.mixed ? 'text-emerald-400' : 'text-slate-500'}>
                                        {strength.checks.mixed ? '✓' : '○'} Letters & numbers
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password Field (Register & Reset) */}
                    {(mode === 'register' || mode === 'reset') && (
                        <div>
                            <label
                                htmlFor="auth-confirm-password"
                                className="block text-xs font-medium text-slate-300 mb-1.5"
                            >
                                Confirm Password
                            </label>
                            <input
                                id="auth-confirm-password"
                                name="confirm_password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                required
                                minLength={8}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter password"
                                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border text-slate-100 text-xs focus:outline-none transition-all placeholder:text-slate-600 font-sans ${
                                    confirmPassword && !isConfirmMatching
                                        ? 'border-rose-500/60 focus:border-rose-500 ring-1 ring-rose-500/20'
                                        : confirmPassword && isConfirmMatching
                                        ? 'border-emerald-500/60 focus:border-emerald-500 ring-1 ring-emerald-500/20'
                                        : 'border-white/[0.08] focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30'
                                }`}
                            />
                            {confirmPassword && (
                                <p className={`text-[10px] mt-1 ${isConfirmMatching ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {isConfirmMatching ? '✓ Passwords match' : '✗ Passwords do not match'}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Remember me & Forgot Password Options */}
                    {mode === 'login' && (
                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded bg-slate-900 border-white/[0.15] text-sky-500 focus:ring-0 focus:ring-offset-0"
                                />
                                <span>Remember me</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setMode('reset')}
                                className="text-xs text-slate-400 hover:text-sky-300 transition-colors"
                            >
                                Forgot password?
                            </button>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={busy || ((mode === 'register' || mode === 'reset') && (!isConfirmMatching || !confirmPassword))}
                        className="w-full mt-2 py-3 rounded-xl font-semibold text-xs text-slate-900 bg-white hover:bg-slate-200 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-white/5"
                    >
                        {busy ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                                <span>Authenticating…</span>
                            </>
                        ) : (
                            <span>
                                {mode === 'login'
                                    ? 'Sign In'
                                    : mode === 'register'
                                    ? 'Create Account'
                                    : 'Reset Password & Sign In'}
                            </span>
                        )}
                    </button>
                </form>

                {/* Footer terms / info */}
                <div className="mt-6 pt-4 border-t border-white/[0.06] text-center">
                    <p className="text-[11px] text-slate-500">
                        {mode === 'login' ? (
                            <>
                                Don’t have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => setMode('register')}
                                    className="text-sky-400 hover:text-sky-300 font-medium"
                                >
                                    Create one here
                                </button>
                            </>
                        ) : mode === 'register' ? (
                            <>
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => setMode('login')}
                                    className="text-sky-400 hover:text-sky-300 font-medium"
                                >
                                    Sign in instead
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className="text-slate-400 hover:text-slate-300"
                            >
                                Cancel and return to Sign In
                            </button>
                        )}
                    </p>
                </div>
            </div>
        </div>
    )
}
