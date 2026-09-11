import { useEffect, useRef, useState } from 'react'

function formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function TranscriptItem({ line }) {
    const isUser = line.speaker === 'user'

    return (
        <div
            className={`p-3.5 rounded-xl text-xs transition-all animate-slide-up border ${
                isUser
                    ? 'bg-emerald-950/25 border-emerald-500/25 text-emerald-100 ml-4'
                    : 'bg-sky-950/25 border-sky-500/25 text-sky-100 mr-4'
            }`}
        >
            <div className="flex items-center justify-between gap-2 mb-1.5">
                <span
                    className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        isUser ? 'text-emerald-400' : 'text-sky-400'
                    }`}
                >
                    <span>{isUser ? '🙋' : '🤖'}</span>
                    <span>{isUser ? 'You' : 'AI Opponent'}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                    {formatTime(line.timestamp)}
                </span>
            </div>

            <p
                className={`leading-relaxed ${
                    line.isPartial ? 'italic opacity-70 text-slate-300' : 'opacity-95'
                }`}
            >
                {line.text}
                {line.isPartial && <span className="animate-pulse"> …</span>}
            </p>
        </div>
    )
}

export default function TranscriptPanel({ lines = [], topic = '', onSave }) {
    const bottomRef = useRef(null)
    const [filter, setFilter] = useState('all') // 'all' | 'user' | 'ai'
    const [search, setSearch] = useState('')

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [lines.length])

    const filteredLines = lines.filter((l) => {
        if (filter !== 'all' && l.speaker !== filter) return false
        if (search.trim() && !l.text.toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    const finalTurns = lines.filter(l => !l.isPartial).length

    return (
        <aside className="w-80 sm:w-96 h-full flex flex-col glass-panel rounded-none border-y-0 border-r-0 border-l border-slate-800/90 bg-slate-950/85 backdrop-blur-2xl">
            {/* Panel Header */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex-shrink-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-base">📜</span>
                        <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                            Live Transcript
                        </h2>
                        {finalTurns > 0 && (
                            <span className="badge-cyan text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                {finalTurns}
                            </span>
                        )}
                    </div>

                    <button
                        onClick={onSave}
                        title="Export transcript as text file"
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                    >
                        <span>📥</span>
                        <span>Save</span>
                    </button>
                </div>

                {topic && (
                    <p className="text-[11px] text-slate-400 truncate" title={topic}>
                        {topic}
                    </p>
                )}

                {/* Filter & Search Bar */}
                <div className="flex items-center gap-2 mt-3">
                    <div className="flex bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 text-[10px] font-semibold">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-2 py-1 rounded-md transition-colors ${
                                filter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('user')}
                            className={`px-2 py-1 rounded-md transition-colors ${
                                filter === 'user' ? 'bg-emerald-600/60 text-emerald-200' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            You
                        </button>
                        <button
                            onClick={() => setFilter('ai')}
                            className={`px-2 py-1 rounded-md transition-colors ${
                                filter === 'ai' ? 'bg-sky-600/60 text-sky-200' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            AI
                        </button>
                    </div>

                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search text…"
                        className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                    />
                </div>
            </div>

            {/* Conversation Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {lines.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 gap-2">
                        <span className="text-3xl opacity-30">🎙️</span>
                        <p className="text-xs font-medium text-slate-400">No arguments recorded yet</p>
                        <p className="text-[11px] max-w-[200px] leading-relaxed">
                            Start speaking into your mic to see real-time speech transcription.
                        </p>
                    </div>
                ) : filteredLines.length === 0 ? (
                    <p className="text-center text-xs text-slate-500 py-8">
                        No matches found for filter.
                    </p>
                ) : (
                    filteredLines.map((line) => (
                        <TranscriptItem key={line.id} line={line} />
                    ))
                )}
                <div ref={bottomRef} />
            </div>
        </aside>
    )
}
