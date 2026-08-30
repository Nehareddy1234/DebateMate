/**
 * TranscriptOverlay.jsx
 *
 * Fixed bottom bar — shows the last few lines of live speech in real-time.
 * User lines appear in green; AI lines in blue.
 * Shows timestamps. Scrolls to latest automatically.
 *
 * Props:
 *   lines — array of { speaker: 'user'|'ai', text: string, id: number, isPartial: boolean, timestamp: number }
 */

import { useEffect, useRef } from 'react'

function formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function TranscriptLine({ speaker, text, isPartial, timestamp }) {
    const isUser = speaker === 'user'
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                animation: 'slideUp 0.3s ease-out forwards',
            }}
        >
            <span
                style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    flexShrink: 0,
                    paddingTop: '2px',
                    color: isUser ? '#4ade80' : '#38bdf8',
                    minWidth: '24px',
                }}
            >
                {isUser ? 'You' : 'AI'}
            </span>
            <p
                style={{
                    margin: 0,
                    fontSize: '0.88rem',
                    color: isUser ? '#bbf7d0' : '#bae6fd',
                    lineHeight: 1.5,
                    opacity: isPartial ? 0.6 : 0.95,
                    fontStyle: isPartial ? 'italic' : 'normal',
                    transition: 'opacity 0.2s',
                    flex: 1,
                }}
            >
                {text}
                {isPartial && <span style={{ opacity: 0.5 }}> …</span>}
            </p>
            {timestamp && (
                <span style={{
                    fontSize: '0.62rem',
                    color: '#334155',
                    flexShrink: 0,
                    paddingTop: '3px',
                }}>
                    {formatTime(timestamp)}
                </span>
            )}
        </div>
    )
}

export default function TranscriptOverlay({ lines = [] }) {
    const bottomRef = useRef(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [lines.length])

    // Show only last 6 lines in the overlay
    const visibleLines = lines.slice(-6)

    return (
        <div
            className="transcript-bar"
            style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                maxHeight: '160px',
                overflowY: 'auto',
                background: 'rgba(8, 12, 20, 0.85)',
                backdropFilter: 'blur(16px)',
                borderTop: '1px solid rgba(30, 45, 74, 0.7)',
                padding: '12px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
            }}
        >
            {visibleLines.length === 0 ? (
                <p
                    style={{
                        margin: 0,
                        fontSize: '0.8rem',
                        color: '#334155',
                        fontStyle: 'italic',
                    }}
                >
                    Live transcript will appear here as you speak…
                </p>
            ) : (
                visibleLines.map((line) => (
                    <TranscriptLine
                        key={line.id}
                        speaker={line.speaker}
                        text={line.text}
                        isPartial={line.isPartial}
                        timestamp={line.timestamp}
                    />
                ))
            )}
            <div ref={bottomRef} />
        </div>
    )
}
