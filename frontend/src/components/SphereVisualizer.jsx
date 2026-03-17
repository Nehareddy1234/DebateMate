/**
 * SphereVisualizer.jsx
 *
 * A React Three Fiber dotted-sphere that reacts to audio frequency data.
 *
 * Props:
 *   analyserRef     — Web Audio AnalyserNode ref (from useVoice)
 *   isAiSpeaking    — boolean: AI is currently playing TTS
 *   isUserSpeaking  — boolean: mic RMS above threshold
 */

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// ── Palette ──────────────────────────────────────────────────

const COLOR_AI_GLOW = new THREE.Color('#38bdf8')  // sky blue
const COLOR_USER_GLOW = new THREE.Color('#4ade80')  // neon green
const COLOR_IDLE = new THREE.Color('#1e3a5f')  // deep blue-grey

// ── Inner animated sphere ─────────────────────────────────────

function AnimatedSphere({ analyserRef, isAiSpeaking, isUserSpeaking }) {
    const pointsRef = useRef()
    const colorsRef = useRef()

    // Build a sphere of evenly-distributed points using spherical fibonacci
    const { positions, count } = useMemo(() => {
        const N = 1800
        const positions = new Float32Array(N * 3)
        const golden = Math.PI * (3 - Math.sqrt(5))

        for (let i = 0; i < N; i++) {
            const y = 1 - (i / (N - 1)) * 2
            const radius = Math.sqrt(1 - y * y)
            const theta = golden * i

            positions[i * 3] = Math.cos(theta) * radius
            positions[i * 3 + 1] = y
            positions[i * 3 + 2] = Math.sin(theta) * radius
        }
        return { positions, count: N }
    }, [])

    // Colour buffer — updated per frame
    const colorArray = useMemo(() => new Float32Array(count * 3), [count])

    // Frequency data buffer
    const freqDataRef = useRef(null)

    useFrame((_, delta) => {
        if (!pointsRef.current) return

        const analyser = analyserRef?.current
        if (!freqDataRef.current && analyser) {
            freqDataRef.current = new Uint8Array(analyser.frequencyBinCount)
        }

        let avgVolume = 0
        if (analyser && freqDataRef.current) {
            analyser.getByteFrequencyData(freqDataRef.current)
            const d = freqDataRef.current
            avgVolume = d.reduce((s, v) => s + v, 0) / d.length / 255
        }

        // Scale radius based on volume (1.0 → 1.45)
        const targetScale = 1.0 + avgVolume * 1.4
        const currentScale = pointsRef.current.scale.x
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.12)
        pointsRef.current.scale.setScalar(newScale)

        // Slow idle rotation
        pointsRef.current.rotation.y += delta * 0.12

        // Colour every dot
        const targetColor = isAiSpeaking
            ? COLOR_AI_GLOW
            : isUserSpeaking
                ? COLOR_USER_GLOW
                : COLOR_IDLE

        const colorRef = colorsRef.current
        if (!colorRef) return

        const arr = colorRef.array
        for (let i = 0; i < count; i++) {
            // Slight brightness variation per dot based on frequency bucket
            const bucket = freqDataRef.current
                ? freqDataRef.current[i % freqDataRef.current.length] / 255
                : 0
            const brightness = 0.6 + bucket * 0.8

            arr[i * 3] = THREE.MathUtils.lerp(arr[i * 3], targetColor.r * brightness, 0.08)
            arr[i * 3 + 1] = THREE.MathUtils.lerp(arr[i * 3 + 1], targetColor.g * brightness, 0.08)
            arr[i * 3 + 2] = THREE.MathUtils.lerp(arr[i * 3 + 2], targetColor.b * brightness, 0.08)
        }
        colorRef.needsUpdate = true
    })

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    array={positions}
                    count={count}
                    itemSize={3}
                />
                <bufferAttribute
                    ref={colorsRef}
                    attach="attributes-color"
                    array={colorArray}
                    count={count}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.028}
                vertexColors
                transparent
                opacity={0.92}
                sizeAttenuation
                depthWrite={false}
            />
        </points>
    )
}

// ── Public component ──────────────────────────────────────────

export default function SphereVisualizer({ analyserRef, isAiSpeaking, isUserSpeaking }) {
    return (
        <div className="w-full h-full relative">
            {/* Ambient colour ring behind the canvas */}
            <div
                className="sphere-ring absolute inset-0 m-auto rounded-full pointer-events-none"
                style={{
                    width: '55%',
                    height: '55%',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: isAiSpeaking
                        ? '0 0 90px 40px rgba(56, 189, 248, 0.18)'
                        : isUserSpeaking
                            ? '0 0 90px 40px rgba(74, 222, 128, 0.18)'
                            : '0 0 40px 10px rgba(30, 58, 95, 0.15)',
                    transition: 'box-shadow 0.5s ease',
                }}
            />

            <Canvas
                camera={{ position: [0, 0, 2.8], fov: 55 }}
                gl={{ antialias: true, alpha: true }}
                style={{ background: 'transparent' }}
            >
                <ambientLight intensity={0.2} />
                <AnimatedSphere
                    analyserRef={analyserRef}
                    isAiSpeaking={isAiSpeaking}
                    isUserSpeaking={isUserSpeaking}
                />
                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    autoRotate={false}
                    rotateSpeed={0.4}
                />
            </Canvas>
        </div>
    )
}
