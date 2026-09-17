import { useEffect, useState } from 'react'

function calculatePasswordStrength(pass) {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-700' }
    let score = 0
    if (pass.length >= 8) score += 1
    if (pass.length >= 12) score += 1
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' }
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' }
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-sky-500' }
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' }
}

export default function ChangePasswordModal({ isOpen, onClose, onChangePassword }) {
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showOld, setShowOld] = useState(false)
    const [showNew, setShowNew] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setOldPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setError(null)
            setSuccess(false)
        }
    }, [isOpen])

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const strength = calculatePasswordStrength(newPassword)
    const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)

        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters long.')
            return
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.')
            return
        }

        setBusy(true)
        try {
            await onChangePassword(oldPassword, newPassword)
            setSuccess(true)
            setTimeout(() => {
                onClose()
            }, 1500)
        } catch (err) {
            setError(err.message || 'Failed to update password')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
            <div
                className="w-full max-w-md my-auto human-panel p-6 sm:p-7 border border-white/[0.1] shadow-2xl relative"
                role="dialog"
                aria-modal="true"
                aria-labelledby="change-password-title"
            >
                {/* Header */}
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-xs">
                            🔒
                        </div>
                        <h2 id="change-password-title" className="text-sm font-semibold text-slate-100">
                            Change Password
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-200 text-sm font-medium p-1 rounded-md hover:bg-white/[0.05] transition-colors"
                        aria-label="Close modal"
                    >
                        ✕
                    </button>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                        <span>✅</span>
                        <span>Password successfully changed! Closing...</span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} method="POST" action="#" className="flex flex-col gap-4">
                    {/* Current Password */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label htmlFor="modal-old-password" className="block text-xs font-medium text-slate-300">
                                Current Password
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowOld(!showOld)}
                                className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                {showOld ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        <input
                            id="modal-old-password"
                            name="current-password"
                            type={showOld ? 'text' : 'password'}
                            autoComplete="current-password"
                            required
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/[0.08] text-slate-100 text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all placeholder:text-slate-600 font-sans"
                        />
                    </div>

                    {/* New Password */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label htmlFor="modal-new-password" className="block text-xs font-medium text-slate-300">
                                New Password <span className="text-slate-500 font-normal">(min. 8 chars)</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                {showNew ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        <input
                            id="modal-new-password"
                            name="new-password"
                            type={showNew ? 'text' : 'password'}
                            autoComplete="new-password"
                            required
                            minLength={8}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/[0.08] text-slate-100 text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all placeholder:text-slate-600 font-sans"
                        />

                        {/* Password strength indicator */}
                        {newPassword && (
                            <div className="mt-2 space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-slate-400">Strength:</span>
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
                            </div>
                        )}
                    </div>

                    {/* Confirm New Password */}
                    <div>
                        <label htmlFor="modal-confirm-password" className="block text-xs font-medium text-slate-300 mb-1">
                            Confirm New Password
                        </label>
                        <input
                            id="modal-confirm-password"
                            name="confirm-new-password"
                            type="password"
                            autoComplete="new-password"
                            required
                            minLength={8}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter new password"
                            className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border text-slate-100 text-xs focus:outline-none transition-all placeholder:text-slate-600 font-sans ${
                                confirmPassword && !passwordsMatch
                                    ? 'border-rose-500/50 focus:border-rose-500'
                                    : confirmPassword && passwordsMatch
                                    ? 'border-emerald-500/50 focus:border-emerald-500'
                                    : 'border-white/[0.08] focus:border-sky-500'
                            }`}
                        />
                        {confirmPassword && (
                            <p className={`text-[10px] mt-1 ${passwordsMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-white/[0.06]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={busy || !passwordsMatch}
                            className="px-4 py-2 rounded-xl font-semibold text-xs text-slate-900 bg-white hover:bg-slate-200 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                        >
                            {busy ? (
                                <>
                                    <span className="w-3.5 h-3.5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                                    <span>Updating…</span>
                                </>
                            ) : (
                                <span>Save Changes</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
