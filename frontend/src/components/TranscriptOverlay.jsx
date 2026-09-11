import { useEffect, useRef } from 'react'

export default function TranscriptOverlay({ lines = [] }) {
    const bottomRef = useRef(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [lines.length])

    // Show only the last 3-4 active live speech chunks
    const visibleLines = lines.slice(-3)

    return (
        <div className="w-full max-w-2xl mx-auto px-4 pointer-events-none">
            <div className="glass-panel-subtle p-3.5 sm:p-4 rounded-2xl border border-slate-700/60 shadow-2xl backdrop-blur-xl bg-slate-950/80 pointer-events-auto transition-all">
                {visibleLines.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-1">
                        <span className="w-2 h-2 rounded-full bg-slate-600 animate-pulse" />
                        <span>Listening for speech… Tap the mic to argue your case</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 max-h-28 overflow-y-auto pr-1">
                        {visibleLines.map((line) => {
                            const isUser = line.speaker === 'user'
                            return (
                                <div
                                    key={line.id}
                                    className="flex items-start gap-2.5 text-xs animate-slide-up"
                                >
                                    <span
                                        className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider flex-shrink-0 mt-0.5 ${
                                            isUser
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                        }`}
                                    >
                                        {isUser ? 'You' : 'AI'}
                                    </span>
                                    <p
                                        className={`leading-relaxed flex-1 ${
                                            isUser ? 'text-emerald-100' : 'text-sky-100'
                                        } ${line.isPartial ? 'italic opacity-70' : 'opacity-95'}`}
                                    >
                                        {line.text}
                                        {line.isPartial && <span className="animate-pulse"> …</span>}
                                    </p>
                                </div>
                            )
                        })}
                        <div ref={bottomRef} />
                    </div>
                )}
            </div>
        </div>
    )
}
