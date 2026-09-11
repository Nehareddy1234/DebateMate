import React from 'react'

const features = [
    {
        title: 'Voice-to-Voice Debate',
        description: 'Speak naturally into your mic. Your arguments are transcribed in real time, evaluated instantly, and spoken back by an AI opponent with conversational pacing.',
        icon: '🎙️',
        tag: 'Live Dialogue',
    },
    {
        title: 'Uncompromising Opponent',
        description: 'The AI actively probes weak premises, challenges unsupported claims, and never backs down—giving you realistic practice for live debates or interviews.',
        icon: '🛡️',
        tag: 'Realistic Sparring',
    },
    {
        title: 'In-Round Coaching',
        description: 'Whenever you lose momentum or need a counter-point, click "Coach Hint" or say "Give me a hint" to receive structural tips and strong angles.',
        icon: '💡',
        tag: 'Active Guidance',
    },
    {
        title: 'Saved Transcripts & Notes',
        description: 'Every round, timestamped turn, and coaching takeaway is automatically saved so you can review your progression and refine your speaking style.',
        icon: '📑',
        tag: 'Archive',
    },
]

const steps = [
    {
        num: '01',
        title: 'Pick your motion & stance',
        body: 'Select from popular debate motions or write your own. Choose whether you want to defend (Pro) or oppose (Con).',
    },
    {
        num: '02',
        title: 'Argue your points out loud',
        body: 'Unmute your mic and make your opening statement. The AI listens, formats its counter-argument, and responds in voice.',
    },
    {
        num: '03',
        title: 'Review and strengthen your logic',
        body: 'Look through structured notes from each turn, export your full transcript, and track how your delivery improves over time.',
    },
]

export default function LandingPage({ onGetStarted, onLogin }) {
    return (
        <div className="h-screen overflow-y-auto human-bg text-slate-200 flex flex-col justify-between selection:bg-sky-500/20">
            {/* ── Minimalist Top Navigation ── */}
            <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/70 border-b border-white/[0.06]">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-sm">
                            D
                        </div>
                        <span className="text-base font-bold text-slate-100 tracking-tight">
                            DebateMate
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onLogin}
                            className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={onGetStarted}
                            className="px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-200 rounded-lg shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Hero Section ── */}
            <main className="flex-1 max-w-5xl mx-auto px-6 py-14 lg:py-20 flex flex-col items-center text-center">
                {/* Clean Sub-badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-slate-400 mb-8">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Real-time voice sparring with Gemini & Deepgram</span>
                </div>

                {/* Hero Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-100 leading-[1.15] max-w-3xl mb-6">
                    Practice persuasive debate{' '}
                    <span className="font-serif-clean italic text-slate-300 font-normal">
                        out loud.
                    </span>
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed mb-10">
                    A voice-first sparring partner that listens to your arguments, challenges your premises in seconds, and coaches you to speak with clarity and conviction.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center mb-16">
                    <button
                        onClick={onGetStarted}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm text-slate-900 bg-white hover:bg-slate-200 transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                        <span>Start a Debate Round</span>
                        <span>→</span>
                    </button>
                    <button
                        onClick={onLogin}
                        className="w-full sm:w-auto px-5 py-3 rounded-xl font-medium text-sm text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-white/[0.08] transition-all"
                    >
                        View saved debates
                    </button>
                </div>

                {/* ── Realistic Debate Interaction Preview ── */}
                <div className="w-full max-w-3xl rounded-2xl human-panel p-5 sm:p-6 mb-20 text-left border border-white/[0.08] shadow-xl">
                    <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/[0.06] text-xs">
                        <div className="flex items-center gap-2 text-slate-400">
                            <span className="font-semibold text-slate-300">Sample Round:</span>
                            <span className="italic">"Universal Basic Income is essential in an automated economy"</span>
                        </div>
                        <div className="hidden sm:flex items-center gap-2">
                            <span className="badge-clean-emerald text-[10px] font-semibold px-2 py-0.5 rounded">You (Pro)</span>
                            <span className="text-slate-600 font-medium">vs</span>
                            <span className="badge-clean-sky text-[10px] font-semibold px-2 py-0.5 rounded">AI (Con)</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-emerald-500/20">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                                <span className="font-semibold text-emerald-400">You (Speaker)</span>
                                <span className="text-slate-500 font-mono text-[10px]">00:18</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                "Without a reliable income floor, rapid advances in automation will displace millions before retraining programs can take effect."
                            </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-sky-500/20">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                                <span className="font-semibold text-sky-400">AI Opponent</span>
                                <span className="text-slate-500 font-mono text-[10px]">00:32</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                "While disruption is real, blanket cash distributions risk causing localized inflation without building resilient skills. Targeted worker transition funds create durable employment rather than indefinite subsidy."
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Clean Features ── */}
                <div className="w-full mb-20 text-left">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
                            Designed for deliberate speaking practice
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
                            Practical tools to sharpen reasoning, vocal structure, and quick rebuttal skills.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {features.map((f, i) => (
                            <div
                                key={i}
                                className="human-card-interactive p-5 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xl">{f.icon}</span>
                                        <span className="badge-clean-neutral text-[10px] font-medium px-2 py-0.5 rounded">
                                            {f.tag}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-semibold text-slate-100 mb-1.5">
                                        {f.title}
                                    </h3>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        {f.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── 3-Step Process ── */}
                <div className="w-full max-w-3xl mb-12">
                    <h2 className="text-xl font-bold text-slate-100 mb-8 tracking-tight">
                        How it works
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                        {steps.map((s, idx) => (
                            <div key={idx} className="human-panel-subtle p-4 border border-white/[0.06]">
                                <div className="text-xs font-mono text-slate-500 mb-2 font-semibold">{s.num}</div>
                                <h3 className="text-xs font-semibold text-slate-200 mb-1">{s.title}</h3>
                                <p className="text-[11px] text-slate-400 leading-relaxed">{s.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* ── Footer ── */}
            <footer className="border-t border-white/[0.06] bg-slate-950/40 py-6 text-xs text-slate-500">
                <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-300">DebateMate</span>
                        <span>— Voice-first AI debate sparring</span>
                    </div>
                    <div>Microphone required for live voice interaction</div>
                </div>
            </footer>
        </div>
    )
}
