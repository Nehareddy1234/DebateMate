import { useEffect, useState } from 'react'

export default function HistoryView({ authFetch, onBack }) {
    const [items, setItems] = useState(null)
    const [error, setError] = useState(null)
    const [openId, setOpenId] = useState(null)
    const [detail, setDetail] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        let alive = true
        authFetch('/transcripts')
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
            .then((data) => alive && setItems(data.transcripts))
            .catch((e) => alive && setError(e.message))
        return () => { alive = false }
    }, [authFetch])

    const toggle = async (id) => {
        if (openId === id) {
            setOpenId(null)
            setDetail(null)
            return
        }
        setOpenId(id)
        setDetail(null)
        setDetailLoading(true)
        try {
            const r = await authFetch(`/transcripts/${id}`)
            if (r.ok) setDetail(await r.json())
        } finally {
            setDetailLoading(false)
        }
    }

    const downloadTranscript = (itemDetail) => {
        if (!itemDetail) return
        const lines = (itemDetail.transcript || [])
            .map(l => `[${l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : ''}] ${l.speaker.toUpperCase()}: ${l.text}`)
            .join('\n\n')
        const content = `DebateMate Transcript\nTopic: ${itemDetail.topic}\nSaved: ${new Date(itemDetail.saved_at).toLocaleString()}\n\n${lines}`
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `debatemate-${(itemDetail.topic || 'round').slice(0, 30).replace(/[^a-z0-9]/gi, '_')}.txt`
        a.click()
        URL.revokeObjectURL(url)
    }

    const filteredItems = (items || []).filter(item =>
        item.topic?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="min-h-screen human-bg p-6 sm:p-10 flex flex-col items-center">
            <div className="w-full max-w-3xl">
                {/* Top Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                            Saved Debate Sessions
                        </h1>
                        <p className="text-xs text-slate-400 mt-1">
                            Review your arguments, timestamps, and coach suggestions.
                        </p>
                    </div>

                    <button
                        onClick={onBack}
                        className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-900 bg-white hover:bg-slate-200 transition-all shadow-sm"
                    >
                        + New Debate
                    </button>
                </div>

                {/* Search Bar */}
                {items && items.length > 0 && (
                    <div className="mb-5">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter by motion or topic…"
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-900/90 border border-white/[0.08] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                        />
                    </div>
                )}

                {/* States */}
                {error && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mb-5">
                        Could not load sessions: {error}
                    </div>
                )}

                {items === null && !error && (
                    <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                        <span className="w-4 h-4 border-2 border-slate-400/30 border-t-white rounded-full animate-spin" />
                        <span>Loading past sessions…</span>
                    </div>
                )}

                {items !== null && items.length === 0 && (
                    <div className="human-panel p-10 text-center text-slate-400 text-xs flex flex-col items-center gap-2 border border-white/[0.08]">
                        <p className="font-semibold text-slate-200 text-sm">No saved sessions yet</p>
                        <p className="max-w-xs text-slate-400">
                            Finish a debate round and click "Save" to keep a record here.
                        </p>
                        <button
                            onClick={onBack}
                            className="mt-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-900 bg-white hover:bg-slate-200"
                        >
                            Start a session
                        </button>
                    </div>
                )}

                {/* List */}
                <div className="space-y-2.5">
                    {filteredItems.map((t) => {
                        const isOpen = openId === t.id
                        return (
                            <div
                                key={t.id}
                                className={`human-card-interactive overflow-hidden border transition-all ${
                                    isOpen ? 'border-white/[0.2] bg-slate-850' : 'border-white/[0.08]'
                                }`}
                            >
                                <button
                                    onClick={() => toggle(t.id)}
                                    aria-expanded={isOpen}
                                    className="w-full p-4 text-left flex items-start sm:items-center justify-between gap-4 cursor-pointer"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="badge-clean-neutral text-[10px] font-medium px-2 py-0.5 rounded">
                                                {t.total_turns || 0} turns
                                            </span>
                                            <span className="text-[11px] text-slate-500 font-mono">
                                                {new Date(t.saved_at).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </span>
                                        </div>
                                        <h3 className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                                            {t.topic}
                                        </h3>
                                    </div>

                                    <div className="text-xs text-slate-400">
                                        {isOpen ? '▲' : '▼'}
                                    </div>
                                </button>

                                {isOpen && (
                                    <div className="border-t border-white/[0.06] bg-slate-900/90 p-4 sm:p-5">
                                        {detailLoading && (
                                            <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                                <span className="w-3.5 h-3.5 border-2 border-slate-400/30 border-t-white rounded-full animate-spin" />
                                                <span>Loading dialogue…</span>
                                            </div>
                                        )}

                                        {detail && (
                                            <div>
                                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.06]">
                                                    <span className="text-xs font-semibold text-slate-300">
                                                        Transcript Record
                                                    </span>
                                                    <button
                                                        onClick={() => downloadTranscript(detail)}
                                                        className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-white/[0.08] transition-all flex items-center gap-1"
                                                    >
                                                        <span>📥</span>
                                                        <span>Download .txt</span>
                                                    </button>
                                                </div>

                                                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                                                    {(detail.transcript || []).map((line, idx) => {
                                                        const isUser = line.speaker === 'user'
                                                        return (
                                                            <div
                                                                key={idx}
                                                                className={`p-3 rounded-lg border text-xs leading-relaxed ${
                                                                    isUser
                                                                        ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-100 ml-4'
                                                                        : 'bg-slate-800/50 border-white/[0.06] text-slate-200 mr-4'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between text-[10px] font-semibold mb-1">
                                                                    <span className={isUser ? 'text-emerald-400' : 'text-sky-400'}>
                                                                        {isUser ? 'You' : 'AI'}
                                                                    </span>
                                                                    {line.timestamp && (
                                                                        <span className="text-slate-500 font-mono">
                                                                            {new Date(line.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-slate-300">
                                                                    {line.text}
                                                                </p>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
