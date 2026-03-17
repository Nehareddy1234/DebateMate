/**
 * useVoice.js (Diagnostic Version)
 *
 * Explicit 16kHz PCM capture settings applied. Uses RecordRTC approach but with 
 * native AudioContext ScriptProcessor to guarantee Int16 PCM over WS.
 */

import { useRef, useState, useCallback, useEffect } from 'react'

const WS_URL = 'ws://localhost:8000/ws/debate'
const MIC_SAMPLE_RATE = 16_000
const CHUNK_INTERVAL_MS = 250          // send PCM chunks every 250 ms

export function useVoice({ onMessage }) {
    const wsRef = useRef(null)
    const audioCtxRef = useRef(null)
    const analyserRef = useRef(null)
    const micStreamRef = useRef(null)
    const processorRef = useRef(null)
    const chunkBufRef = useRef([])
    const intervalRef = useRef(null)
    const playQueueRef = useRef([])
    const isPlayingRef = useRef(false)

    const [connected, setConnected] = useState(false)
    const [micActive, setMicActive] = useState(false)
    const [isUserSpeaking, setIsUserSpeaking] = useState(false)
    const [isAiSpeaking, setIsAiSpeaking] = useState(false)

    // ── WebSocket setup ───────────────────────────────────────────

    const connect = useCallback(({ topic, user_role }) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            console.log('[WS] Already open, skipping connect.')
            return
        }

        console.log(`[WS] Connecting to ${WS_URL}...`)
        const ws = new WebSocket(WS_URL)
        ws.binaryType = 'arraybuffer' // Fix 1: Ensure WebSockets receives bytes natively
        wsRef.current = ws

        ws.onopen = () => {
            console.log('[WS] Connected successfully.')
            setConnected(true)
            const payload = { type: 'start_debate', topic, user_role }
            console.log('[WS] Sending init payload:', payload)
            ws.send(JSON.stringify(payload))
        }

        ws.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) {
                console.log(`[WS] Received TTS AUDIO chunk: ${event.data.byteLength} bytes`)
                _queueAudio(event.data)
            } else {
                try {
                    const msg = JSON.parse(event.data)
                    console.log('[WS] Received JSON:', msg)
                    onMessage?.(msg)
                } catch (e) {
                    console.warn('[WS] Non-JSON text:', event.data)
                }
            }
        }

        ws.onclose = (e) => {
            console.log(`[WS] Closed. Code=${e.code}, Reason=${e.reason}`)
            setConnected(false)
            setMicActive(false)
        }
        ws.onerror = (e) => console.error('[WS] Connection error:', e)
    }, [onMessage])

    const disconnect = useCallback(() => {
        console.log('[WS] Disconnecting manually...')
        wsRef.current?.close()
        _stopMic()
    }, [])

    // ── Mic capture ───────────────────────────────────────────────

    const startMic = useCallback(async () => {
        if (micActive) return
        console.log('[Mic] Requesting microphone access...')

        try {
            if (!audioCtxRef.current) {
                console.log(`[Mic] Creating AudioContext at ${MIC_SAMPLE_RATE}Hz`)
                audioCtxRef.current = new AudioContext({ sampleRate: MIC_SAMPLE_RATE })
            }
            if (audioCtxRef.current.state === 'suspended') {
                await audioCtxRef.current.resume()
                console.log('[Mic] AudioContext resumed')
            }

            const ctx = audioCtxRef.current

            if (!analyserRef.current) {
                const analyser = ctx.createAnalyser()
                analyser.fftSize = 256
                analyserRef.current = analyser
            }

            // Fix 1: Force mono, 16kHz explicit constraint
            console.log('[Mic] Calling getUserMedia constraints: channelCount=1, sampleRate=16000')
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: MIC_SAMPLE_RATE,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
            })
            micStreamRef.current = stream
            console.log('[Mic] MediaStream acquired:', stream.getTracks()[0].label)

            const source = ctx.createMediaStreamSource(stream)
            source.connect(analyserRef.current)

            // ScriptProcessorNode to capture raw PCM
            const processor = ctx.createScriptProcessor(4096, 1, 1)
            processorRef.current = processor

            processor.onaudioprocess = (e) => {
                const float32 = e.inputBuffer.getChannelData(0)

                // Convert to Int16 PCM (Expectation for AssemblyAI pcm_s16le)
                const int16 = new Int16Array(float32.length)
                for (let i = 0; i < float32.length; i++) {
                    // clamp
                    int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768))
                }
                chunkBufRef.current.push(int16.buffer)

                // Detect user speaking via RMS
                let sum = 0
                for (let i = 0; i < float32.length; i++) sum += float32[i] ** 2
                const rms = Math.sqrt(sum / float32.length)
                setIsUserSpeaking(rms > 0.012)
            }

            source.connect(processor)
            processor.connect(ctx.destination)

            // Send chunks on interval
            intervalRef.current = setInterval(() => {
                if (!chunkBufRef.current.length) return
                if (wsRef.current?.readyState !== WebSocket.OPEN) return

                const merged = _mergeBuffers(chunkBufRef.current)
                chunkBufRef.current = []
                wsRef.current.send(merged)
            }, CHUNK_INTERVAL_MS)

            console.log('[Mic] Processing started successfully')
            setMicActive(true)

        } catch (e) {
            console.error('[Mic] Error accessing microphone:', e)
        }
    }, [micActive])

    const stopMic = useCallback(() => {
        console.log('[Mic] Stopping mic...')
        _stopMic()
        setMicActive(false)
    }, [])

    function _stopMic() {
        clearInterval(intervalRef.current)
        processorRef.current?.disconnect()
        micStreamRef.current?.getTracks().forEach((t) => t.stop())
        processorRef.current = null
        micStreamRef.current = null
    }

    // ── Audio playback ────────────────────────────────────────────

    async function _queueAudio(arrayBuffer) {
        playQueueRef.current.push(arrayBuffer)
        if (!isPlayingRef.current) _playNext()
    }

    async function _playNext() {
        if (!playQueueRef.current.length) {
            isPlayingRef.current = false
            setIsAiSpeaking(false)
            return
        }
        isPlayingRef.current = true
        setIsAiSpeaking(true)

        const ctx = audioCtxRef.current || new AudioContext({ sampleRate: 22050 })
        if (!audioCtxRef.current) audioCtxRef.current = ctx

        if (ctx.state === 'suspended') {
            await ctx.resume()
        }

        const rawBuffer = playQueueRef.current.shift()

        try {
            // Decode pcm_s16le to Float32
            const validLength = Math.floor(rawBuffer.byteLength / 2) * 2;
            const int16 = new Int16Array(rawBuffer, 0, validLength / 2);
            const float32 = new Float32Array(int16.length)
            for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768

            const audioBuffer = ctx.createBuffer(1, float32.length, 22050)
            audioBuffer.copyToChannel(float32, 0)

            const source = ctx.createBufferSource()
            source.buffer = audioBuffer

            if (analyserRef.current) source.connect(analyserRef.current)
            source.connect(ctx.destination)

            source.onended = () => {
                console.log('[Playback] Sentence finished.')
                _playNext()
            }
            source.start()
        } catch (err) {
            console.error('[Playback] Error decoding TTS audio:', err)
            _playNext()
        }
    }

    // ── Helpers ───────────────────────────────────────────────────

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

    useEffect(() => () => {
        disconnect()
        audioCtxRef.current?.close()
    }, [disconnect])

    return {
        connect,
        disconnect,
        startMic,
        stopMic,
        connected,
        micActive,
        isUserSpeaking,
        isAiSpeaking,
        analyserRef,
    }
}
