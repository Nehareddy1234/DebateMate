/**
 * useVoice.js (V7 — Complete Live Voice & Debate Orchestration)
 *
 * Coordinates:
 *  - WebSocket connection & handshake ({ topic, user_side, first_speaker, token })
 *  - Gapless Deepgram Aura-2 24 kHz TTS playback with AudioContext priming
 *  - 16 kHz Linear16 PCM mic capture & streaming with automatic sample rate downsampling
 *  - Live transcripts (interim vs finalized) & AI thinking/speaking state management
 *  - Coach Deck notes & tips extraction
 */

import { useRef, useState, useCallback, useEffect } from 'react'

function getWsUrl() {
    if (import.meta.env.VITE_WS_URL) {
        return import.meta.env.VITE_WS_URL
    }
    const apiBase = import.meta.env.VITE_API_URL
    if (apiBase) {
        try {
            const parsed = new URL(apiBase)
            const proto = parsed.protocol === 'https:' ? 'wss:' : 'ws:'
            return `${proto}//${parsed.host}/ws/debate`
        } catch {
            // fallback
        }
    }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}/ws/debate`
}

const MIC_SAMPLE_RATE = 16_000
const PLAY_SAMPLE_RATE = 24_000
const CHUNK_INTERVAL_MS = 250

export function useVoice({ token, onMessage } = {}) {
    const wsRef = useRef(null)

    const micCtxRef = useRef(null)
    const playCtxRef = useRef(null)

    const analyserRef = useRef(null)
    const micStreamRef = useRef(null)
    const processorRef = useRef(null)
    const chunkBufRef = useRef([])
    const intervalRef = useRef(null)

    // Connection resilience & message tracking
    const intentionalCloseRef = useRef(false)
    const lastConfigRef = useRef(null)
    const pendingMessagesRef = useRef([])
    const backoffRef = useRef(1000)

    // Gapless TTS playback scheduling
    const nextStartTimeRef = useRef(0)
    const pendingSourcesRef = useRef(0)
    const streamEndedRef = useRef(false)

    // Voice & Debate States
    const [connected, setConnected] = useState(false)
    const [micActive, setMicActive] = useState(false)
    const [isUserSpeaking, setIsUserSpeaking] = useState(false)
    const [isAiSpeaking, setIsAiSpeaking] = useState(false)
    const [isAiThinking, setIsAiThinking] = useState(false)
    const [notes, setNotes] = useState([])
    const [tips, setTips] = useState([])
    const [transcript, setTranscript] = useState([])

    // ── Audio playback priming ────────────────────────────────────
    const primeAudio = useCallback(async () => {
        try {
            if (!playCtxRef.current) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext
                playCtxRef.current = new AudioCtx({ sampleRate: PLAY_SAMPLE_RATE })
            }
            if (playCtxRef.current.state === 'suspended') {
                await playCtxRef.current.resume()
                console.log('[Audio] Playback AudioContext resumed')
            }
        } catch (err) {
            console.warn('[Audio] Error priming AudioContext:', err)
        }
    }, [])

    // ── Gapless PCM playback ──────────────────────────────────────
    const _queueAudio = useCallback(async (arrayBuffer) => {
        if (!playCtxRef.current) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext
            playCtxRef.current = new AudioCtx({ sampleRate: PLAY_SAMPLE_RATE })
        }
        const ctx = playCtxRef.current
        if (ctx.state === 'suspended') {
            await ctx.resume()
        }

        try {
            const validLength = Math.floor(arrayBuffer.byteLength / 2) * 2
            if (!validLength) return
            const int16 = new Int16Array(arrayBuffer, 0, validLength / 2)
            const float32 = new Float32Array(int16.length)
            for (let i = 0; i < int16.length; i++) {
                float32[i] = int16[i] / 32768
            }

            const audioBuffer = ctx.createBuffer(1, float32.length, PLAY_SAMPLE_RATE)
            audioBuffer.copyToChannel(float32, 0)

            const source = ctx.createBufferSource()
            source.buffer = audioBuffer
            source.connect(ctx.destination)

            const startTime = Math.max(ctx.currentTime + 0.02, nextStartTimeRef.current)
            nextStartTimeRef.current = startTime + audioBuffer.duration

            pendingSourcesRef.current++
            source.onended = () => {
                pendingSourcesRef.current--
                if (pendingSourcesRef.current === 0 && streamEndedRef.current) {
                    setIsAiSpeaking(false)
                }
            }
            source.start(startTime)
        } catch (err) {
            console.error('[Playback] Error decoding TTS audio:', err)
        }
    }, [])

    // ── Mic capture ───────────────────────────────────────────────
    const _stopMicInternal = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
        }
        processorRef.current?.disconnect()
        micStreamRef.current?.getTracks().forEach((t) => t.stop())
        processorRef.current = null
        micStreamRef.current = null
        chunkBufRef.current = []
    }, [])

    const stopMic = useCallback(() => {
        console.log('[Mic] Stopping mic...')
        _stopMicInternal()
        setMicActive(false)
        setIsUserSpeaking(false)
    }, [_stopMicInternal])

    const startMic = useCallback(async () => {
        if (micActive && micStreamRef.current) return
        console.log('[Mic] Requesting microphone access...')

        if (!navigator.mediaDevices?.getUserMedia) {
            console.error('[Mic] getUserMedia not supported in this browser/environment')
            return
        }

        try {
            if (!micCtxRef.current) {
                console.log(`[Mic] Creating mic AudioContext at ${MIC_SAMPLE_RATE}Hz`)
                const AudioCtx = window.AudioContext || window.webkitAudioContext
                micCtxRef.current = new AudioCtx({ sampleRate: MIC_SAMPLE_RATE })
            }
            if (micCtxRef.current.state === 'suspended') {
                await micCtxRef.current.resume()
                console.log('[Mic] Mic AudioContext resumed')
            }

            const ctx = micCtxRef.current

            if (!analyserRef.current) {
                const analyser = ctx.createAnalyser()
                analyser.fftSize = 256
                analyserRef.current = analyser
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: MIC_SAMPLE_RATE,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            })
            micStreamRef.current = stream
            console.log('[Mic] MediaStream acquired:', stream.getTracks()[0]?.label || 'Microphone')

            const source = ctx.createMediaStreamSource(stream)
            source.connect(analyserRef.current)

            const processor = ctx.createScriptProcessor(4096, 1, 1)
            processorRef.current = processor

            processor.onaudioprocess = (e) => {
                let float32 = e.inputBuffer.getChannelData(0)

                // Downsample if browser ignores 16 kHz request
                if (ctx.sampleRate !== MIC_SAMPLE_RATE) {
                    float32 = _downsample(float32, ctx.sampleRate, MIC_SAMPLE_RATE)
                }

                // Float32 -> Int16 PCM
                const int16 = new Int16Array(float32.length)
                for (let i = 0; i < float32.length; i++) {
                    int16[i] = Math.max(-32768, Math.min(32767, Math.round(float32[i] * 32767)))
                }
                chunkBufRef.current.push(int16.buffer)

                // User speaking RMS estimation
                let sum = 0
                for (let i = 0; i < float32.length; i++) sum += float32[i] ** 2
                const rms = Math.sqrt(sum / float32.length)
                setIsUserSpeaking(rms > 0.012)
            }

            // Route processor to silent destination
            const silentSink = ctx.createGain()
            silentSink.gain.value = 0
            source.connect(processor)
            processor.connect(silentSink)
            silentSink.connect(ctx.destination)

            let loggedFirstChunk = false
            intervalRef.current = setInterval(() => {
                if (!chunkBufRef.current.length) return
                if (wsRef.current?.readyState !== WebSocket.OPEN) return

                const merged = _mergeBuffers(chunkBufRef.current)
                chunkBufRef.current = []
                wsRef.current.send(merged)

                if (!loggedFirstChunk) {
                    loggedFirstChunk = true
                    console.log(`[Mic] First PCM chunk sent: ${merged.byteLength} bytes`)
                }
            }, CHUNK_INTERVAL_MS)

            setMicActive(true)
            console.log('[Mic] Mic active and streaming')
        } catch (e) {
            console.error('[Mic] Error accessing microphone:', e)
            const guidance =
                e.name === 'NotAllowedError'
                    ? 'Microphone access denied. Please allow mic access in your browser.'
                    : e.name === 'NotFoundError'
                        ? 'No microphone found. Please connect a microphone.'
                        : `Microphone error: ${e.message || e.name}`
            onMessage?.({ type: 'error', text: guidance })
        }
    }, [micActive, onMessage])

    // ── WebSocket setup ───────────────────────────────────────────
    const connect = useCallback(({ topic, user_side, user_role, first_speaker = 'AI' }) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            console.log('[WS] Already open, skipping connect.')
            return
        }

        intentionalCloseRef.current = false
        lastConfigRef.current = { topic, user_side, user_role, first_speaker }

        const wsUrl = getWsUrl()
        console.log(`[WS] Connecting to ${wsUrl}...`)
        const ws = new WebSocket(wsUrl)
        ws.binaryType = 'arraybuffer'
        wsRef.current = ws

        ws.onopen = () => {
            console.log('[WS] Connected successfully.')
            setConnected(true)

            const activeToken = token || localStorage.getItem('dm_token') || undefined
            const payload = {
                type: 'start_debate',
                topic: topic || 'General Debate',
                user_side: user_side || user_role || 'Pro',
                first_speaker: String(first_speaker).toLowerCase() === 'ai' ? 'AI' : 'User',
                token: activeToken,
            }
            console.log('[WS] Sending debate handshake:', payload)
            ws.send(JSON.stringify(payload))

            while (pendingMessagesRef.current.length) {
                ws.send(JSON.stringify(pendingMessagesRef.current.shift()))
            }
            backoffRef.current = 1000
        }

        ws.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) {
                _queueAudio(event.data)
                return
            }

            try {
                const msg = JSON.parse(event.data)

                switch (msg.type) {
                    case 'ai_thinking_start':
                        setIsAiThinking(true)
                        break

                    case 'ai_thinking_end':
                        setIsAiThinking(false)
                        break

                    case 'audio_start':
                    case 'ai_speaking_start':
                        nextStartTimeRef.current = 0
                        streamEndedRef.current = false
                        pendingSourcesRef.current = 0
                        setIsAiSpeaking(true)
                        break

                    case 'audio_end':
                    case 'ai_speaking_end':
                        streamEndedRef.current = true
                        if (pendingSourcesRef.current === 0) {
                            setIsAiSpeaking(false)
                        }
                        break

                    case 'agent_response': {
                        const rebuttal = msg.rebuttal || msg.text || ''
                        if (rebuttal) {
                            const aiTurn = {
                                id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                                speaker: 'ai',
                                text: rebuttal,
                                isPartial: false,
                                timestamp: Date.now(),
                            }
                            setTranscript((prev) => [...prev.filter((l) => !l.isPartial), aiTurn])
                        }

                        if (Array.isArray(msg.notes) && msg.notes.length) {
                            setNotes(msg.notes)
                        } else if (msg.sticky_note) {
                            setNotes((prev) =>
                                prev.includes(msg.sticky_note) ? prev : [...prev, msg.sticky_note]
                            )
                        }

                        if (msg.coaching_tip || msg.tip) {
                            const tipText = msg.coaching_tip || msg.tip
                            setTips((prev) =>
                                prev.includes(tipText) ? prev : [...prev, tipText]
                            )
                        }
                        break
                    }

                    case 'partial_transcript':
                        if (msg.text) {
                            setTranscript((prev) => {
                                const nonPartials = prev.filter((l) => !l.isPartial)
                                return [
                                    ...nonPartials,
                                    {
                                        id: 'partial-user',
                                        speaker: msg.speaker || 'user',
                                        text: msg.text,
                                        isPartial: true,
                                        timestamp: Date.now(),
                                    },
                                ]
                            })
                        }
                        break

                    case 'transcript':
                        if (msg.text) {
                            setTranscript((prev) => {
                                const nonPartials = prev.filter((l) => !l.isPartial)
                                return [
                                    ...nonPartials,
                                    {
                                        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                                        speaker: msg.speaker || 'user',
                                        text: msg.text,
                                        isPartial: false,
                                        timestamp: Date.now(),
                                    },
                                ]
                            })
                        }
                        break

                    case 'error':
                        console.error('[WS] Server error:', msg.text)
                        break

                    default:
                        break
                }

                onMessage?.(msg)
            } catch (e) {
                console.warn('[WS] Non-JSON text:', event.data)
            }
        }

        ws.onclose = (e) => {
            console.log(`[WS] Closed. Code=${e.code}, Reason=${e.reason}`)
            setConnected(false)
            setMicActive(false)
            setIsAiSpeaking(false)
            setIsAiThinking(false)

            if (intentionalCloseRef.current || e.code === 4001) return
            const delay = backoffRef.current
            backoffRef.current = Math.min(delay * 2, 30000)
            console.log(`[WS] Reconnecting in ${delay}ms...`)
            setTimeout(() => {
                if (!intentionalCloseRef.current) {
                    connect(lastConfigRef.current || {})
                }
            }, delay)
        }

        ws.onerror = (e) => console.error('[WS] Connection error:', e)
    }, [token, onMessage, _queueAudio])

    const disconnect = useCallback(() => {
        console.log('[WS] Disconnecting manually...')
        intentionalCloseRef.current = true
        wsRef.current?.close()
        _stopMicInternal()
    }, [_stopMicInternal])

    const sendMessage = useCallback((json) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(json))
        } else {
            pendingMessagesRef.current.push(json)
            console.warn('[WS] sendMessage queued — WS not open')
        }
    }, [])

    // ── High-Level Debate Controls ────────────────────────────────
    const startDebate = useCallback(async (config) => {
        setNotes([])
        setTips([])
        setTranscript([])
        setIsAiThinking(false)

        // 1. Prime AudioContext during user click gesture
        await primeAudio()

        // 2. Open WebSocket and send setup handshake
        connect(config)

        // 3. Request and start mic access during user click gesture
        try {
            await startMic()
        } catch (e) {
            console.warn('[Voice] Failed to start mic automatically:', e)
        }
    }, [primeAudio, connect, startMic])

    const endDebate = useCallback(() => {
        stopMic()
        disconnect()
    }, [stopMic, disconnect])

    const toggleMic = useCallback(async () => {
        if (micActive) {
            stopMic()
        } else {
            await startMic()
        }
    }, [micActive, startMic, stopMic])

    const requestHelp = useCallback(() => {
        sendMessage({ type: 'help_request' })
    }, [sendMessage])

    // Cleanup on unmount
    useEffect(() => () => {
        disconnect()
        micCtxRef.current?.close()
        playCtxRef.current?.close()
    }, [disconnect])

    return {
        // High-level API expected by App.jsx
        connected,
        micActive,
        isUserSpeaking,
        isAiSpeaking,
        isAiThinking,
        notes,
        tips,
        transcriptLines: transcript,
        fullTranscript: transcript,
        analyserRef,
        startDebate,
        endDebate,
        toggleMic,
        requestHelp,

        // Low-level primitives
        connect,
        disconnect,
        startMic,
        stopMic,
        sendMessage,
        primeAudio,
    }
}

// ── Downsample & Buffer Helpers ───────────────────────────────────
function _downsample(buffer, fromRate, toRate) {
    if (fromRate <= toRate) return buffer
    const ratio = fromRate / toRate
    const newLength = Math.floor(buffer.length / ratio)
    const result = new Float32Array(newLength)
    for (let i = 0; i < newLength; i++) {
        const pos = i * ratio
        const idx = Math.floor(pos)
        const frac = pos - idx
        const next = Math.min(idx + 1, buffer.length - 1)
        result[i] = buffer[idx] * (1 - frac) + buffer[next] * frac
    }
    return result
}

function _mergeBuffers(buffers) {
    const totalLength = buffers.reduce((acc, b) => acc + b.byteLength, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const buf of buffers) {
        result.set(new Uint8Array(buf), offset)
        offset += buf.byteLength
    }
    return result.buffer
}