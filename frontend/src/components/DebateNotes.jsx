/**
 * DebateNotes.jsx
 *
 * Top-right panel displaying the LangGraph summarizer's sticky notes
 * and any coaching tips received from the AI.
 *
 * Props:
 *   notes  — string[]   e.g. ["Jobs AI destroys differ", "Retraining is costly"]
 *   tips   — string[]   coaching tip texts
 */

import { useRef, useEffect } from 'react'

function NoteCard({ text, index }) {
    return (
        <div
            className="note-card"
            style={{ animationDelay: `${index * 30}ms` }}
        >
            <div className="flex items-start gap-2">
                <span style={{ color: '#fbbf24', fontSize: '0.7rem', marginTop: '2px', flexShrink: 0 }}>
                    ◆
                </span>
                <p
                    style={{
                        margin: 0,
                        fontSize: '0.82rem',
                        fontWeight: 500,
                        color: '#e2e8f0',
                        lineHeight: 1.45,
                        fontFamily: "'JetBrains Mono', monospace",
                    }}
                >
                    {text}
                </p>
            </div>
        </div>
    )
}

function TipCard({ text, index }) {
    return (
        <div
            className="tip-banner"
            style={{ animationDelay: `${index * 30}ms` }}
        >
            <div className="flex items-start gap-2">
                <span style={{ color: '#38bdf8', fontSize: '0.8rem', flexShrink: 0 }}>💡</span>
                <p
                    style={{
                        margin: 0,
                        fontSize: '0.8rem',
                        color: '#93c5fd',
                        lineHeight: 1.45,
                    }}
                >
                    {text}
                </p>
            </div>
        </div>
    )
}

export default function DebateNotes({ notes = [], tips = [] }) {
    const scrollRef = useRef(null)

    // Auto-scroll to top when a new note arrives (newest first)
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0
    }, [notes.length, tips.length])

    const reversedNotes = [...notes].reverse()
    const reversedTips = [...tips].reverse()

    const isEmpty = notes.length === 0 && tips.length === 0

    return (
        <div
            className="glass flex flex-col"
            style={{
                width: '260px',
                maxHeight: '460px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '14px 16px 10px',
                    borderBottom: '1px solid rgba(30, 45, 74, 0.8)',
                    flexShrink: 0,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem' }}>📋</span>
                    <h2
                        style={{
                            margin: 0,
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: '#94a3b8',
                        }}
                    >
                        Debate Notes
                    </h2>
                    {notes.length > 0 && (
                        <span
                            style={{
                                marginLeft: 'auto',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: '#38bdf8',
                                background: 'rgba(56,189,248,0.12)',
                                border: '1px solid rgba(56,189,248,0.25)',
                                borderRadius: '99px',
                                padding: '1px 8px',
                            }}
                        >
                            {notes.length}
                        </span>
                    )}
                </div>
            </div>

            {/* Body */}
            <div
                ref={scrollRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                }}
            >
                {isEmpty && (
                    <p
                        style={{
                            margin: 0,
                            fontSize: '0.78rem',
                            color: '#475569',
                            textAlign: 'center',
                            marginTop: '20px',
                            lineHeight: 1.6,
                        }}
                    >
                        Key argument summaries will
                        <br />
                        appear here as you debate.
                    </p>
                )}

                {/* Tips appear at top */}
                {reversedTips.map((t, i) => (
                    <TipCard key={`tip-${i}`} text={t} index={i} />
                ))}

                {/* Sticky notes */}
                {reversedNotes.map((n, i) => (
                    <NoteCard key={`note-${i}`} text={n} index={i} />
                ))}
            </div>
        </div>
    )
}
