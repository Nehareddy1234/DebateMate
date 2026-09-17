/**
 * App.jsx — AI Debate Coach
 *
 * Thoughtful, human-crafted arena layout with clean typography,
 * topic organizer, and seamless vocal controls.
 */

import { useState, useCallback, useRef, lazy, Suspense } from 'react'
import DebateNotes from './components/DebateNotes'
import TranscriptOverlay from './components/TranscriptOverlay'
import TranscriptPanel from './components/TranscriptPanel'
import AuthScreen from './components/AuthScreen'
import ChangePasswordModal from './components/ChangePasswordModal'
import ErrorBoundary from './components/ErrorBoundary'
import HistoryView from './components/HistoryView'
import LandingPage from './components/LandingPage'
import { useAuth } from './hooks/useAuth'
import { useVoice } from './hooks/useVoice'

const SphereVisualizer = lazy(() => import('./components/SphereVisualizer'))

const TOPIC_CATEGORIES = [
    {
        name: 'Technology & AI',
        topics: [
            'AI will create more net new jobs than it displaces',
            'Autonomous AI systems should not be used in critical military decisions',
            'Open-source AI models pose a net risk to global safety',
        ],
    },
    {
        name: 'Society & Governance',
        topics: [
            'Social media platforms do more harm to public discourse than good',
            'Universal Basic Income is necessary in an automated economy',
            'Standardized testing should be eliminated from university admissions',
        ],
    },
    {
        name: 'Economics & Work',
        topics: [
            'Remote work delivers higher long-term productivity than in-person mandates',
            'Cryptocurrencies should not replace central bank backed currencies',
            'Deep space exploration is worth the multi-billion dollar public investment',
        ],
    },
]

function SetupScreen({ onStart }) {
    const [selectedCategory, setSelectedCategory] = useState(0)
    const [topic, setTopic] = useState(TOPIC_CATEGORIES[0].topics[0])
    const [role, setRole] = useState('Pro')
    const [firstSpeaker, setFirstSpeaker] = useState('ai')
    const [custom, setCustom] = useState(false)
    const [customTopic, setCustomTopic] = useState('')

    const handleStart = () => {
        const finalTopic = custom ? customTopic.trim() || 'Should AI replace human coaches?' : topic
        onStart({
            topic: finalTopic,
            user_side: role,
            first_speaker: firstSpeaker === 'ai' ? 'AI' : 'User',
        })
    }

    return (
        <div className="min-h-full human-bg p-6 sm:p-10 flex flex-col items-center justify-center selection:bg-sky-500/20">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
                    Set up your debate round
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-md mx-auto">
                    Pick a motion, choose your position, and practice against an AI opponent that argues back.
                </p>
            </div>

            {/* Setup Box */}
            <div className="w-full max-w-xl human-panel p-6 sm:p-7 border border-white/[0.08]">
                {/* 1. Motion Selection */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-slate-300">
                            1. Select Motion
                        </label>
                        <button
                            type="button"
                            onClick={() => { setCustom(!custom); if (!custom) setCustomTopic('') }}
                            className="text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors"
                        >
                            {custom ? 'Choose from list' : '+ Custom motion'}
                        </button>
                    </div>

                    {!custom ? (
                        <div className="space-y-2.5">
                            {/* Category pills */}
                            <div className="flex gap-1.5 overflow-x-auto pb-1">
                                {TOPIC_CATEGORIES.map((cat, idx) => (
                                    <button
                                        key={cat.name}
                                        onClick={() => {
                                            setSelectedCategory(idx)
                                            setTopic(cat.topics[0])
                                        }}
                                        className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                                            selectedCategory === idx
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/[0.06]'
                                        }`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            {/* Motion list */}
                            <div className="space-y-1.5">
                                {TOPIC_CATEGORIES[selectedCategory].topics.map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTopic(t)}
                                        className={`w-full text-left p-3 rounded-xl border text-xs leading-relaxed transition-all flex items-center justify-between gap-3 ${
                                            topic === t
                                                ? 'bg-slate-850 border-sky-500/50 text-slate-100 shadow-sm'
                                                : 'bg-slate-900/40 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/[0.12]'
                                        }`}
                                    >
                                        <span>{t}</span>
                                        {topic === t && <span className="text-sky-400 font-bold">✓</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <input
                            type="text"
                            value={customTopic}
                            onChange={(e) => setCustomTopic(e.target.value)}
                            placeholder="Type any debate resolution here…"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/[0.1] text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                            autoFocus
                        />
                    )}
                </div>

                {/* 2. Stance Selector */}
                <div className="mb-6">
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                        2. Your Position
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                        <button
                            onClick={() => setRole('Pro')}
                            className={`p-3 rounded-xl border text-left transition-all ${
                                role === 'Pro'
                                    ? 'bg-slate-850 border-emerald-500/60 text-emerald-300 shadow-sm'
                                    : 'bg-slate-900/40 border-white/[0.06] text-slate-400 hover:border-white/[0.12]'
                            }`}
                        >
                            <div className="font-semibold text-xs text-slate-200 mb-0.5">👍 Support (Pro)</div>
                            <p className="text-[11px] text-slate-400">You argue affirmative; AI counters.</p>
                        </button>

                        <button
                            onClick={() => setRole('Con')}
                            className={`p-3 rounded-xl border text-left transition-all ${
                                role === 'Con'
                                    ? 'bg-slate-850 border-sky-500/60 text-sky-300 shadow-sm'
                                    : 'bg-slate-900/40 border-white/[0.06] text-slate-400 hover:border-white/[0.12]'
                            }`}
                        >
                            <div className="font-semibold text-xs text-slate-200 mb-0.5">👎 Oppose (Con)</div>
                            <p className="text-[11px] text-slate-400">You argue negative; AI defends.</p>
                        </button>
                    </div>
                </div>

                {/* 3. Opening Speaker */}
                <div className="mb-6">
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                        3. Opening Speaker
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                        {[
                            { value: 'ai', title: '🤖 AI Opens', desc: 'AI delivers the opening argument' },
                            { value: 'user', title: '🙋 I Speak First', desc: 'You take the floor first' },
                        ].map((s) => (
                            <button
                                key={s.value}
                                onClick={() => setFirstSpeaker(s.value)}
                                className={`p-3 rounded-xl border text-left transition-all ${
                                    firstSpeaker === s.value
                                        ? 'bg-slate-850 border-indigo-500/60 text-indigo-200 shadow-sm'
                                        : 'bg-slate-900/40 border-white/[0.06] text-slate-400 hover:border-white/[0.12]'
                                }`}
                            >
                                <div className="font-semibold text-xs text-slate-200 mb-0.5">{s.title}</div>
                                <p className="text-[11px] text-slate-400">{s.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Start Button */}
                <button
                    onClick={handleStart}
                    className="w-full py-3 rounded-xl font-semibold text-xs text-slate-900 bg-white hover:bg-slate-200 transition-all active:scale-[0.99] shadow-md flex items-center justify-center gap-2"
                >
                    <span>Start Debate Round</span>
                    <span>→</span>
                </button>
            </div>
        </div>
    )
}

// ── Debate Arena ──────────────────────────────────────────────

function DebateView({
    topic, userRole, analyserRef,
    isUserSpeaking, isAiSpeaking,
    micActive, connected,
    onMicToggle, onEnd,
    notes, tips,
    transcriptLines,
    fullTranscript,
    onHelp,
    onSave,
    isAiThinking,
}) {
    const aiRole = userRole === 'Pro' ? 'Con' : 'Pro'
    const [showNotes, setShowNotes] = useState(true)
    const [showTranscript, setShowTranscript] = useState(true)

    return (
        <div className="h-full w-full flex flex-col arena-human-bg overflow-hidden text-slate-100">
            {/* ── Top Bar ── */}
            <header className="h-14 px-5 sm:px-6 flex items-center justify-between border-b border-white/[0.08] bg-slate-950/70 backdrop-blur-md z-20 flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-xs flex-shrink-0">
                        D
                    </div>
                    <div className="min-w-0">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                            Motion
                        </span>
                        <h2 className="text-xs sm:text-sm font-semibold text-slate-200 truncate max-w-xs sm:max-w-md md:max-w-lg">
                            {topic}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-white/[0.08] text-[11px]">
                        <span className={userRole === 'Pro' ? 'text-emerald-400 font-medium' : 'text-sky-400 font-medium'}>
                            You: {userRole}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className={aiRole === 'Pro' ? 'text-emerald-400 font-medium' : 'text-sky-400 font-medium'}>
                            AI: {aiRole}
                        </span>
                    </div>

                    <button
                        onClick={() => setShowNotes(!showNotes)}
                        className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                            showNotes ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-slate-900/60 border-white/[0.08] text-slate-400'
                        }`}
                        title="Toggle Coach Deck"
                    >
                        💡 Notes
                    </button>

                    <button
                        onClick={() => setShowTranscript(!showTranscript)}
                        className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                            showTranscript ? 'bg-sky-500/10 border-sky-500/30 text-sky-300' : 'bg-slate-900/60 border-white/[0.08] text-slate-400'
                        }`}
                        title="Toggle Transcript Panel"
                    >
                        📜 Transcript
                    </button>

                    <button
                        onClick={onEnd}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
                    >
                        End Round
                    </button>
                </div>
            </header>

            {/* ── Main Arena Content ── */}
            <div className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 relative flex flex-col justify-between overflow-hidden">
                    {/* 3D Visualizer */}
                    <div className="absolute inset-0 z-0">
                        <Suspense fallback={null}>
                            <SphereVisualizer
                                analyserRef={analyserRef}
                                isAiSpeaking={isAiSpeaking}
                                isUserSpeaking={isUserSpeaking}
                            />
                        </Suspense>
                    </div>

                    {/* Floating Notes Deck */}
                    {showNotes && (
                        <div className="absolute top-4 right-4 z-10 hidden md:block">
                            <DebateNotes notes={notes} tips={tips} />
                        </div>
                    )}

                    {/* Stage Status */}
                    <div className="z-10 text-center mt-6 pointer-events-none">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-white/[0.08] text-xs font-medium text-slate-300 shadow-md">
                            {isAiThinking ? (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                    <span>AI formulating rebuttal…</span>
                                </>
                            ) : isAiSpeaking ? (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                                    <span>AI opponent speaking…</span>
                                </>
                            ) : isUserSpeaking ? (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Listening to your argument…</span>
                                </>
                            ) : (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                                    <span>Ready · Unmute mic to speak</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Bottom Floating Control Bar */}
                    <div className="z-10 pb-6 flex flex-col items-center gap-3">
                        <TranscriptOverlay lines={transcriptLines} />

                        <div className="human-panel px-5 py-2.5 rounded-2xl flex items-center gap-5 border border-white/[0.08] shadow-xl">
                            <button
                                onClick={onHelp}
                                className="flex flex-col items-center gap-1 text-slate-400 hover:text-amber-300 transition-colors"
                                title="Ask coach for hint"
                            >
                                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-white/[0.08] flex items-center justify-center text-sm">
                                    💡
                                </div>
                                <span className="text-[10px] font-medium text-slate-400">Hint</span>
                            </button>

                            <button
                                onClick={onMicToggle}
                                className={`w-13 h-13 px-4 py-3 rounded-2xl flex items-center justify-center text-xl transition-all shadow-md ${
                                    micActive
                                        ? 'bg-emerald-600 text-white mic-natural-active shadow-emerald-900/30'
                                        : 'bg-slate-850 text-slate-400 hover:text-white border border-white/[0.08]'
                                }`}
                                title={micActive ? 'Mute microphone' : 'Unmute microphone'}
                            >
                                {micActive ? '🎙️' : '🔇'}
                            </button>

                            <button
                                onClick={onSave}
                                className="flex flex-col items-center gap-1 text-slate-400 hover:text-sky-300 transition-colors"
                                title="Save full transcript"
                            >
                                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-white/[0.08] flex items-center justify-center text-sm">
                                    📥
                                </div>
                                <span className="text-[10px] font-medium text-slate-400">Save</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right-hand side Transcript Panel */}
                {showTranscript && (
                    <TranscriptPanel
                        lines={fullTranscript}
                        topic={topic}
                        onSave={onSave}
                    />
                )}
            </div>
        </div>
    )
}

// ── Root App ──────────────────────────────────────────────────

export default function App() {
    const { token, user, login, register, resetPassword, changePassword, logout, authFetch } = useAuth()
    const [phase, setPhase] = useState('landing')
    const [authMode, setAuthMode] = useState('login')
    const [showChangePassword, setShowChangePassword] = useState(false)
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [debateConfig, setDebateConfig] = useState({
        topic: '',
        user_side: 'Pro',
        first_speaker: 'AI',
    })

    const startedAtRef = useRef(null)

    const {
        connected,
        sessionId,
        micActive,
        isUserSpeaking,
        isAiSpeaking,
        isAiThinking,
        notes,
        tips,
        transcriptLines,
        fullTranscript,
        analyserRef,
        startDebate,
        endDebate,
        toggleMic,
        requestHelp,
    } = useVoice({ token })

    const handleStart = useCallback((config) => {
        setDebateConfig(config)
        startedAtRef.current = new Date().toISOString()
        setPhase('debate')
        startDebate(config)
    }, [startDebate])

    const handleEnd = useCallback(async () => {
        const lines = fullTranscript.filter(l => !l.isPartial)
        if (lines.length > 0 && authFetch) {
            try {
                const sId = sessionId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}`)
                await authFetch('/transcripts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        session_id: sId,
                        topic: debateConfig.topic || 'General Debate',
                        user_side: debateConfig.user_side || 'Pro',
                        started_at: startedAtRef.current || new Date().toISOString(),
                        transcript: lines.map(l => ({
                            speaker: l.speaker,
                            text: l.text,
                            timestamp: l.timestamp ? new Date(l.timestamp).toISOString() : new Date().toISOString(),
                        })),
                    }),
                })
            } catch (err) {
                console.warn('[EndDebate] Auto-save failed:', err)
            }
        }
        endDebate()
        setPhase('history')
    }, [fullTranscript, authFetch, sessionId, debateConfig, endDebate])

    const handleSave = useCallback(() => {
        const lines = fullTranscript.filter(l => !l.isPartial)
        const text = lines
            .map(l => `[${l.speaker.toUpperCase()}] ${l.text}`)
            .join('\n\n')

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `debatemate-${(debateConfig.topic || 'round').slice(0, 30).replace(/[^a-z0-9]/gi, '_')}.txt`
        a.click()
        URL.revokeObjectURL(url)

        if (authFetch && lines.length > 0) {
            const sId = sessionId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}`)
            authFetch('/transcripts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sId,
                    topic: debateConfig.topic || 'General Debate',
                    user_side: debateConfig.user_side || 'Pro',
                    started_at: startedAtRef.current || new Date().toISOString(),
                    transcript: lines.map(l => ({
                        speaker: l.speaker,
                        text: l.text,
                        timestamp: l.timestamp ? new Date(l.timestamp).toISOString() : new Date().toISOString(),
                    })),
                }),
            }).catch(err => console.warn('[Save] Server save failed:', err))
        }
    }, [fullTranscript, debateConfig, authFetch, sessionId])

    const handleLogin = useCallback(async (...args) => {
        await login(...args)
        setPhase('setup')
    }, [login])

    const handleRegister = useCallback(async (...args) => {
        await register(...args)
        setPhase('setup')
    }, [register])

    const handleResetPassword = useCallback(async (...args) => {
        await resetPassword(...args)
        setPhase('setup')
    }, [resetPassword])

    const handleLogout = useCallback(() => {
        logout()
        setShowUserMenu(false)
        setPhase('landing')
    }, [logout])

    if (!token) {
        if (phase === 'auth') {
            return (
                <AuthScreen
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                    onResetPassword={handleResetPassword}
                    initialMode={authMode}
                    onBack={() => setPhase('landing')}
                />
            )
        }
        return (
            <LandingPage
                onGetStarted={() => {
                    setAuthMode('register')
                    setPhase('auth')
                }}
                onLogin={() => {
                    setAuthMode('login')
                    setPhase('auth')
                }}
            />
        )
    }

    const userInitial = (user?.username?.[0] || 'U').toUpperCase()

    return (
        <ErrorBoundary>
            <div className="w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans">
                {phase === 'debate' ? (
                    <DebateView
                        topic={debateConfig.topic}
                        userRole={debateConfig.user_side}
                        analyserRef={analyserRef}
                        isUserSpeaking={isUserSpeaking}
                        isAiSpeaking={isAiSpeaking}
                        micActive={micActive}
                        connected={connected}
                        onMicToggle={toggleMic}
                        onEnd={handleEnd}
                        notes={notes}
                        tips={tips}
                        transcriptLines={transcriptLines}
                        fullTranscript={fullTranscript}
                        onHelp={requestHelp}
                        onSave={handleSave}
                        isAiThinking={isAiThinking}
                    />
                ) : (
                    <div className="h-full flex flex-col overflow-hidden">
                        <nav className="h-14 px-5 sm:px-6 border-b border-white/[0.08] bg-slate-950/80 backdrop-blur-md flex items-center justify-between flex-shrink-0 z-20">
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center font-bold text-sky-400 text-xs">
                                    D
                                </div>
                                <span className="font-bold text-sm text-slate-100 tracking-tight">DebateMate</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setPhase(phase === 'setup' ? 'history' : 'setup')}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-white/[0.08] transition-all flex items-center gap-1.5"
                                >
                                    <span>{phase === 'setup' ? '📚' : '🎙️'}</span>
                                    <span>{phase === 'setup' ? 'Saved Debates' : 'New Round'}</span>
                                </button>

                                {/* User Menu Button */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/[0.08] text-xs transition-all focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                                        aria-expanded={showUserMenu}
                                        aria-label="User profile menu"
                                    >
                                        <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                                            {userInitial}
                                        </div>
                                        <span className="font-medium text-slate-200 hidden sm:inline max-w-[120px] truncate">
                                            {user?.username}
                                        </span>
                                        <span className="text-slate-500 text-[9px]">▼</span>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {showUserMenu && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-30"
                                                onClick={() => setShowUserMenu(false)}
                                            />
                                            <div className="absolute right-0 mt-2 w-56 rounded-2xl human-panel p-2 border border-white/[0.1] shadow-2xl z-40 animate-fadeIn">
                                                <div className="px-3 py-2.5 border-b border-white/[0.06] mb-1">
                                                    <p className="text-xs font-semibold text-slate-100 truncate">
                                                        {user?.username}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                                        {user?.email}
                                                    </p>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        setShowUserMenu(false)
                                                        setShowChangePassword(true)
                                                    }}
                                                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2"
                                                >
                                                    <span>🔒</span>
                                                    <span>Change Password</span>
                                                </button>

                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center gap-2 mt-0.5"
                                                >
                                                    <span>🚪</span>
                                                    <span>Sign Out</span>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </nav>

                        <div className="flex-1 overflow-y-auto">
                            {phase === 'history' ? (
                                <HistoryView authFetch={authFetch} onBack={() => setPhase('setup')} />
                            ) : (
                                <SetupScreen onStart={handleStart} />
                            )}
                        </div>
                    </div>
                )}

                {/* Change Password Modal */}
                <ChangePasswordModal
                    isOpen={showChangePassword}
                    onClose={() => setShowChangePassword(false)}
                    onChangePassword={changePassword}
                />
            </div>
        </ErrorBoundary>
    )
}
