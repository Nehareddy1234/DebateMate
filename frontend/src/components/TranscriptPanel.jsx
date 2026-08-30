/**
 * TranscriptPanel.jsx
 *
 * Right-side persistent debate transcript panel.
 * Splits conversation into User (left col) vs AI (right col).
 * Shows timestamps and a download button.
 *
 * Props:
 *   lines        — full array of { id, speaker, text, timestamp, isPartial }
 *   topic        — string debate topic
 *   onSave       — () => void  triggered by Save button
 */

import { useEffect, useRef } from 'react'

function formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function TranscriptRow({ line }) {
    const isUser = line.speaker === 'user'
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                padding: '6px 0',
                borderBottom: '1px solid rgba(30, 45, 74, 0.4)',
                animation: 'slideUp 0.25s ease-out forwards',
            }}
        >
            {/* User side */}
            <div style={{ paddingRight: '8px', borderRight: '1px solid rgba(30,45,74,0.5)' }}>
                {isUser && (
                    <div>
                        <span style={{
                            fontSize: '0.65rem',
                            color: '#4ade80',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                        }}>
                            You · {formatTime(line.timestamp)}
                        </span>
                        <p style={{
                            margin: '4px 0 0',
                            fontSize: '0.83rem',
                            color: line.isPartial ? '#6ee7a0' : '#bbf7d0',
                            lineHeight: 1.5,
                            opacity: line.isPartial ? 0.65 : 1,
                            fontStyle: line.isPartial ? 'italic' : 'normal',
                            transition: 'opacity 0.2s',
                        }}>
                            {line.text}
                        </p>
                    </div>
                )}
            </div>

            {/* AI side */}
            <div style={{ paddingLeft: '8px' }}>
                {!isUser && (
                    <div>
                        <span style={{
                            fontSize: '0.65rem',
                            color: '#38bdf8',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                        }}>
                            AI · {formatTime(line.timestamp)}
                        </span>
                        <p style={{
                            margin: '4px 0 0',
                            fontSize: '0.83rem',
                            color: '#bae6fd',
                            lineHeight: 1.5,
                            transition: 'opacity 0.2s',
                        }}>
                            {line.text}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function TranscriptPanel({ lines = [], topic = '', onSave }) {
    const bottomRef = useRef(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [lines.length])

    const isEmpty = lines.length === 0

    return (
        <div
            className="glass"
            style={{
                display: 'flex',
                flexDirection: 'column',
                width: '360px',
                height: '100%',
                overflow: 'hidden',
                borderRadius: '0',
                border: 'none',
                borderLeft: '1px solid rgba(30, 45, 74, 0.7)',
                background: 'rgba(8, 12, 22, 0.90)',
                backdropFilter: 'blur(16px)',
            }}
        >
            {/* Header */}
            <div style={{
                padding: '14px 16px 12px',
                borderBottom: '1px solid rgba(30, 45, 74, 0.7)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        <span style={{ fontSize: '0.85rem' }}>📜</span>
                        <h2 style={{
                            margin: 0,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: '#94a3b8',
                        }}>
                            Debate Transcript
                        </h2>
                        {lines.length > 0 && (
                            <span style={{
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                color: '#38bdf8',
                                background: 'rgba(56,189,248,0.12)',
                                border: '1px solid rgba(56,189,248,0.25)',
                                borderRadius: '99px',
                                padding: '1px 7px',
                            }}>
                                {lines.filter(l => !l.isPartial).length}
                            </span>
                        )}
                    </div>
                    {topic && (
                        <p style={{
                            margin: '4px 0 0',
                            fontSize: '0.7rem',
                            color: '#475569',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '240px',
                        }}>
                            {topic}
                        </p>
                    )}
                </div>

                <button
                    onClick={onSave}
                    title="Download transcript as .txt"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(56,189,248,0.3)',
                        background: 'rgba(56,189,248,0.08)',
                        color: '#38bdf8',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                        transition: 'all 0.15s',
                        letterSpacing: '0.04em',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(56,189,248,0.16)'
                        e.currentTarget.style.borderColor = 'rgba(56,189,248,0.5)'
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(56,189,248,0.08)'
                        e.currentTarget.style.borderColor = 'rgba(56,189,248,0.3)'
                    }}
                >
                    📥 Save
                </button>
            </div>

            {/* Column headers */}
            {!isEmpty && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    padding: '8px 16px 6px',
                    borderBottom: '1px solid rgba(30, 45, 74, 0.5)',
                    flexShrink: 0,
                }}>
                    <span style={{
                        fontSize: '0.65rem',
                        color: '#4ade80',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        paddingRight: '8px',
                        borderRight: '1px solid rgba(30,45,74,0.5)',
                    }}>
                        Your Arguments
                    </span>
                    <span style={{
                        fontSize: '0.65rem',
                        color: '#38bdf8',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        paddingLeft: '8px',
                    }}>
                        AI Arguments
                    </span>
                </div>
            )}

            {/* Body */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '4px 16px 12px',
            }}>
                {isEmpty ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        gap: '12px',
                        textAlign: 'center',
                    }}>
                        <span style={{ fontSize: '2rem', opacity: 0.3 }}>💬</span>
                        <p style={{
                            margin: 0,
                            fontSize: '0.8rem',
                            color: '#334155',
                            lineHeight: 1.6,
                        }}>
                            The full debate will<br />appear here as you speak.
                        </p>
                    </div>
                ) : (
                    lines.map((line) => (
                        <TranscriptRow key={line.id} line={line} />
                    ))
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    )
}
