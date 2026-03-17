/**
 * App.jsx — AI Debate Coach
 *
 * Layout:
 *   ┌──────────────────────────────────────────┐
 *   │  Header Bar                              │
 *   │    ┌────────────────────┐ ┌───────────┐  │
 *   │    │   Sphere (center)  │ │  Notes    │  │
 *   │    │                    │ │  Panel    │  │
 *   │    └────────────────────┘ └───────────┘  │
 *   │  Transcript Overlay (fixed bottom)       │
 *   └──────────────────────────────────────────┘
 */

import { useState, useCallback, useRef } from 'react'
import SphereVisualizer from './components/SphereVisualizer'
import DebateNotes from './components/DebateNotes'
import TranscriptOverlay from './components/TranscriptOverlay'
import { useVoice } from './hooks/useVoice'

// ── Setup screen ──────────────────────────────────────────────

const SAMPLE_TOPICS = [
    'AI will create more jobs than it destroys',
    'Social media does more harm than good',
    'Universal Basic Income should be implemented globally',
    'Space exploration is worth the cost',
    'Cryptocurrencies should replace traditional banking',
]

function SetupScreen({ onStart }) {
    const [topic, setTopic] = useState('')
    const [role, setRole] = useState('Pro')
    const [custom, setCustom] = useState(false)

    const handleStart = () => {
        const finalTopic = topic.trim() || SAMPLE_TOPICS[0]
        onStart({ topic: finalTopic, user_role: role })
    }

    return (
        <div className="setup-container" style={{ padding: '24px' }}>
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div
                    style={{
                        fontSize: '2.8rem',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.1,
                    }}
                >
                    AI Debate Coach
                </div>
                <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '8px' }}>
                    Your real-time voice sparring partner, powered by GPT-4o
                </p>
            </div>

            {/* Card */}
            <div
                className="glass"
                style={{ width: '100%', maxWidth: '500px', padding: '32px' }}
            >
                {/* Topic */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={labelStyle}>Debate Topic</label>

                    {!custom ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                            {SAMPLE_TOPICS.map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTopic(t)}
                                    style={{
                                        ...topicBtnStyle,
                                        borderColor: topic === t ? '#38bdf8' : 'rgba(30,45,74,0.8)',
                                        background: topic === t ? 'rgba(56,189,248,0.08)' : 'transparent',
                                        color: topic === t ? '#e2e8f0' : '#64748b',
                                    }}
                                >
                                    {t}
                                </button>
                            ))}
                            <button
                                onClick={() => { setCustom(true); setTopic('') }}
                                style={{ ...topicBtnStyle, borderStyle: 'dashed', color: '#38bdf8', borderColor: 'rgba(56,189,248,0.3)' }}
                            >
                                + Custom topic…
                            </button>
                        </div>
                    ) : (
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Enter your debate topic…"
                            style={inputStyle}
                            autoFocus
                        />
                    )}
                </div>

                {/* Role */}
                <div style={{ marginBottom: '28px' }}>
                    <label style={labelStyle}>Your Stance</label>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                        {['Pro', 'Con'].map((r) => (
                            <button
                                key={r}
                                onClick={() => setRole(r)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: `2px solid ${role === r ? (r === 'Pro' ? '#4ade80' : '#38bdf8') : 'rgba(30,45,74,0.8)'}`,
                                    background: role === r
                                        ? r === 'Pro' ? 'rgba(74,222,128,0.08)' : 'rgba(56,189,248,0.08)'
                                        : 'transparent',
                                    color: role === r ? '#e2e8f0' : '#475569',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontFamily: 'Inter, sans-serif',
                                }}
                            >
                                {r === 'Pro' ? 'Support the motion' : 'Oppose the motion'}
                            </button>
                        ))}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '8px', margin: '8px 0 0' }}>
                        The AI will take the opposite stance and challenge your arguments.
                    </p>
                </div>

                {/* Start button */}
                <button
                    onClick={handleStart}
                    disabled={!topic && SAMPLE_TOPICS.length === 0}
                    style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                        color: '#fff',
                        fontSize: '1rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        letterSpacing: '0.03em',
                        boxShadow: '0 0 24px rgba(14, 165, 233, 0.3)',
                        fontFamily: 'Inter, sans-serif',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={(e) => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 0 36px rgba(14,165,233,0.4)' }}
                    onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 0 24px rgba(14,165,233,0.3)' }}
                >
                    🎙️ Start Debate
                </button>
            </div>
        </div>
    )
}

// ── Main debate view ──────────────────────────────────────────

function DebateView({ topic, userRole, analyserRef, isUserSpeaking, isAiSpeaking, micActive, connected, onMicToggle, onEnd, notes, tips, transcriptLines }) {
    const aiRole = userRole === 'Pro' ? 'Con' : 'Pro'

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

            {/* ── Header ── */}
            <header
                style={{
                    padding: '14px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(30,45,74,0.6)',
                    background: 'rgba(8,12,20,0.8)',
                    backdropFilter: 'blur(12px)',
                    flexShrink: 0,
                    zIndex: 10,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, background: 'linear-gradient(135deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        AI Debate Coach
                    </span>
                    <span style={{ color: '#334155', fontSize: '0.8rem' }}>|</span>
                    <span style={{ color: '#64748b', fontSize: '0.8rem', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {topic}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`role-badge ${userRole.toLowerCase()}`}>{userRole}</span>
                    <span style={{ color: '#334155', fontSize: '0.7rem' }}>vs</span>
                    <span className={`role-badge ${aiRole.toLowerCase()}`}>AI {aiRole}</span>

                    <div
                        style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: connected ? '#4ade80' : '#64748b',
                            boxShadow: connected ? '0 0 8px #4ade80' : 'none',
                            marginLeft: '8px',
                        }}
                    />

                    <button
                        onClick={onEnd}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: '1px solid rgba(30,45,74,0.8)',
                            background: 'transparent',
                            color: '#64748b',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            fontFamily: 'Inter, sans-serif',
                        }}
                    >
                        End
                    </button>
                </div>
            </header>

            {/* ── Main content area ── */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {/* Sphere — center */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '100%', height: '100%' }}>
                        <SphereVisualizer
                            analyserRef={analyserRef}
                            isAiSpeaking={isAiSpeaking}
                            isUserSpeaking={isUserSpeaking}
                        />
                    </div>
                </div>

                {/* Notes panel — top right */}
                <div
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        zIndex: 5,
                    }}
                >
                    <DebateNotes notes={notes} tips={tips} />
                </div>

                {/* Mic button — bottom center above transcript */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '155px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 5,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <button
                        onClick={onMicToggle}
                        className={micActive ? 'mic-active' : ''}
                        style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            border: `2px solid ${micActive ? '#4ade80' : 'rgba(30,45,74,0.8)'}`,
                            background: micActive
                                ? 'rgba(74,222,128,0.12)'
                                : 'rgba(8,12,20,0.85)',
                            color: micActive ? '#4ade80' : '#475569',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        {micActive ? '🎙️' : '🎤'}
                    </button>
                    <span style={{ fontSize: '0.7rem', color: '#475569' }}>
                        {micActive ? 'Tap to mute' : 'Tap to speak'}
                    </span>
                </div>

                {/* State label */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '230px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: isAiSpeaking ? '#38bdf8' : isUserSpeaking ? '#4ade80' : '#334155',
                        transition: 'color 0.4s',
                    }}
                >
                    {isAiSpeaking ? '◉ AI Speaking' : isUserSpeaking ? '◉ Listening…' : '○ Idle'}
                </div>

                {/* Transcript overlay */}
                <TranscriptOverlay lines={transcriptLines} />
            </div>
        </div>
    )
}

// ── Root App ──────────────────────────────────────────────────

let lineId = 0

export default function App() {
    const [phase, setPhase] = useState('setup')   // 'setup' | 'debate'
    const [debateConfig, setDebateConfig] = useState(null)
    const [notes, setNotes] = useState([])
    const [tips, setTips] = useState([])
    const [transcriptLines, setTranscript] = useState([])

    const onMessage = useCallback((msg) => {
        switch (msg.type) {
            case 'ready':
                break
            case 'transcript':
                setTranscript((prev) => {
                    const last = prev[prev.length - 1]
                    if (last && last.speaker === msg.speaker && last.isPartial) {
                        return [...prev.slice(0, -1), { id: last.id, speaker: msg.speaker, text: msg.text, isPartial: false }]
                    } else {
                        return [...prev.slice(-19), { id: ++lineId, speaker: msg.speaker, text: msg.text, isPartial: false }]
                    }
                })
                break
            case 'partial_transcript':
                setTranscript((prev) => {
                    const last = prev[prev.length - 1]
                    if (last && last.speaker === msg.speaker && last.isPartial) {
                        return [...prev.slice(0, -1), { id: last.id, speaker: msg.speaker, text: msg.text, isPartial: true }]
                    } else {
                        return [...prev.slice(-19), { id: ++lineId, speaker: msg.speaker, text: msg.text, isPartial: true }]
                    }
                })
                break
            case 'note':
                setNotes((prev) => [...prev, msg.text])
                break
            case 'tip':
                setTips((prev) => [...prev, msg.text])
                break
            case 'error':
                console.error('[Server error]', msg.text)
                break
            default:
                break
        }
    }, [])

    const { connect, disconnect, startMic, stopMic, connected, micActive, isUserSpeaking, isAiSpeaking, analyserRef } = useVoice({ onMessage })

    const handleStart = useCallback(({ topic, user_role }) => {
        setDebateConfig({ topic, user_role })
        setNotes([])
        setTips([])
        setTranscript([])
        setPhase('debate')
        connect({ topic, user_role })
    }, [connect])

    const handleMicToggle = useCallback(async () => {
        if (micActive) stopMic()
        else await startMic()
    }, [micActive, startMic, stopMic])

    const handleEnd = useCallback(() => {
        disconnect()
        setPhase('setup')
        setDebateConfig(null)
    }, [disconnect])

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
            {phase === 'setup' ? (
                <SetupScreen onStart={handleStart} />
            ) : (
                <DebateView
                    topic={debateConfig.topic}
                    userRole={debateConfig.user_role}
                    analyserRef={analyserRef}
                    isUserSpeaking={isUserSpeaking}
                    isAiSpeaking={isAiSpeaking}
                    micActive={micActive}
                    connected={connected}
                    onMicToggle={handleMicToggle}
                    onEnd={handleEnd}
                    notes={notes}
                    tips={tips}
                    transcriptLines={transcriptLines}
                />
            )}
        </div>
    )
}

// ── Shared styles ─────────────────────────────────────────────

const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#64748b',
}

const topicBtnStyle = {
    width: '100%',
    textAlign: 'left',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(30,45,74,0.8)',
    background: 'transparent',
    color: '#64748b',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'Inter, sans-serif',
}

const inputStyle = {
    width: '100%',
    marginTop: '10px',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(56,189,248,0.35)',
    background: 'rgba(13,20,36,0.8)',
    color: '#e2e8f0',
    fontSize: '0.9rem',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
}
