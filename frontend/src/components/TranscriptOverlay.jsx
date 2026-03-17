/**
 * TranscriptOverlay.jsx
 *
 * Bottom fixed bar showing real-time speech transcripts.
 * User lines appear in green; AI lines appear in blue.
 * Lines auto-fade after 6 seconds.
 *
 * Props:
 *   lines — array of { speaker: 'user'|'ai', text: string, id: number }
 */

import { useEffect, useRef } from 'react'

function TranscriptLine({ speaker, text, isPartial }) {
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
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    flexShrink: 0,
                    paddingTop: '1px',
                    color: isUser ? '#4ade80' : '#38bdf8',
                }}
            >
                {isUser ? 'You' : 'AI'}
            </span>
            <p
                style={{
                    margin: 0,
                    fontSize: '0.9rem',
                    color: isUser ? '#bbf7d0' : '#bae6fd',
                    lineHeight: 1.5,
                    opacity: isPartial ? 0.6 : 0.95,
                    transition: 'opacity 0.2s',
                }}
            >
                {text}
            </p>
        </div>
    )
}

export default function TranscriptOverlay({ lines = [] }) {
    const bottomRef = useRef(null)

    // Keep scroll pinned to latest line
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [lines.length])

    return (
        <div
            className="transcript-bar"
            style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                maxHeight: '140px',
                overflowY: 'auto',
                background: 'rgba(8, 12, 20, 0.82)',
                backdropFilter: 'blur(16px)',
                borderTop: '1px solid rgba(30, 45, 74, 0.7)',
                padding: '14px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
            }}
        >
            {lines.length === 0 && (
                <p
                    style={{
                        margin: 0,
                        fontSize: '0.82rem',
                        color: '#334155',
                        fontStyle: 'italic',
                    }}
                >
                    Transcript will appear here…
                </p>
            )}
            {lines.map((line) => (
                <TranscriptLine key={line.id} speaker={line.speaker} text={line.text} isPartial={line.isPartial} />
            ))}
            <div ref={bottomRef} />
        </div>
    )
}
