import { useRef, useEffect, useState } from 'react'

export default function DebateNotes({ notes = [], tips = [] }) {
    const scrollRef = useRef(null)
    const [copiedIndex, setCopiedIndex] = useState(null)

    // Auto-scroll to top when a new note arrives
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0
    }, [notes.length, tips.length])

    const reversedNotes = [...notes].reverse()
    const reversedTips = [...tips].reverse()
    const isEmpty = notes.length === 0 && tips.length === 0

    const copyText = (text, idx) => {
        navigator.clipboard?.writeText(text)
        setCopiedIndex(idx)
        setTimeout(() => setCopiedIndex(null), 1500)
    }

    return (
        <div className="glass-panel w-72 sm:w-80 flex flex-col max-h-[480px] overflow-hidden border border-slate-700/70 shadow-2xl shadow-sky-950/40">
            {/* Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-base">🧠</span>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Coach & Strategy Deck
                    </h2>
                </div>
                {(notes.length > 0 || tips.length > 0) && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        {notes.length + tips.length} items
                    </span>
                )}
            </div>

            {/* Scrollable Container */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3">
                {isEmpty ? (
                    <div className="py-10 text-center flex flex-col items-center justify-center gap-2.5">
                        <span className="text-2xl opacity-40">💡</span>
                        <p className="text-xs font-semibold text-slate-400">
                            Strategy deck ready
                        </p>
                        <p className="text-[11px] text-slate-500 max-w-[200px] leading-relaxed">
                            LangGraph sticky notes & AI coaching suggestions will appear here dynamically.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Coaching Tips Section */}
                        {reversedTips.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                                    <span>⚡ Coaching Tips</span>
                                </div>
                                {reversedTips.map((tip, idx) => (
                                    <div
                                        key={`tip-${idx}`}
                                        className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 relative group transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="leading-relaxed font-sans">{tip}</p>
                                            <button
                                                onClick={() => copyText(tip, `tip-${idx}`)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-amber-400/80 hover:text-amber-300 flex-shrink-0"
                                                title="Copy tip"
                                            >
                                                {copiedIndex === `tip-${idx}` ? '✓' : 'Copy'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Argument Notes Section */}
                        {reversedNotes.length > 0 && (
                            <div className="space-y-2 pt-1">
                                <div className="text-[10px] font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1">
                                    <span>📋 Argument Premises</span>
                                </div>
                                {reversedNotes.map((note, idx) => (
                                    <div
                                        key={`note-${idx}`}
                                        className="p-3 rounded-xl bg-slate-900/90 border-l-4 border-l-sky-400 border border-slate-800 text-xs text-slate-200 relative group shadow-sm transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="leading-relaxed font-mono text-[11px] text-slate-300">
                                                {note}
                                            </p>
                                            <button
                                                onClick={() => copyText(note, `note-${idx}`)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-slate-500 hover:text-slate-300 flex-shrink-0"
                                                title="Copy premise"
                                            >
                                                {copiedIndex === `note-${idx}` ? '✓' : 'Copy'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
