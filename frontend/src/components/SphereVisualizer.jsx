/**
 * SphereVisualizer.jsx
 *
 * Clean, organic audio-reactive visualizer with subtle dot expansion.
 */

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const COLOR_AI = new THREE.Color('#38bdf8')      // Sky Blue
const COLOR_USER = new THREE.Color('#10b981')    // Emerald
const COLOR_IDLE = new THREE.Color('#334155')    // Muted Slate

function AnimatedSphere({ analyserRef, isAiSpeaking, isUserSpeaking }) {
    const pointsRef = useRef()
    const colorsRef = useRef()

    const { positions, count } = useMemo(() => {
        const N = 1800
        const pos = new Float32Array(N * 3)
        const golden = Math.PI * (3 - Math.sqrt(5))

        for (let i = 0; i < N; i++) {
            const y = 1 - (i / (N - 1)) * 2
            const radius = Math.sqrt(1 - y * y)
            const theta = golden * i

            pos[i * 3] = Math.cos(theta) * radius
            pos[i * 3 + 1] = y
            pos[i * 3 + 2] = Math.sin(theta) * radius
        }
        return { positions: pos, count: N }
    }, [])

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

        const targetScale = 1.0 + avgVolume * 1.3
        const currentScale = pointsRef.current.scale.x
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.12)
        pointsRef.current.scale.setScalar(newScale)

        pointsRef.current.rotation.y += delta * (0.12 + avgVolume * 0.4)

        const targetColor = isAiSpeaking
            ? COLOR_AI
            : isUserSpeaking
                ? COLOR_USER
                : COLOR_IDLE

        const colorRef = colorsRef.current
        if (colorRef) {
            const arr = colorRef.array
            for (let i = 0; i < count; i++) {
                arr[i * 3] = THREE.MathUtils.lerp(arr[i * 3], targetColor.r, 0.08)
                arr[i * 3 + 1] = THREE.MathUtils.lerp(arr[i * 3 + 1], targetColor.g, 0.08)
                arr[i * 3 + 2] = THREE.MathUtils.lerp(arr[i * 3 + 2], targetColor.b, 0.08)
            }
            colorRef.needsUpdate = true
        }
    })

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
                <bufferAttribute
                    ref={colorsRef}
                    attach="attributes-color"
                    count={count}
                    array={new Float32Array(count * 3).fill(0.3)}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.032}
                vertexColors
                transparent
                opacity={0.85}
                depthWrite={false}
            />
        </points>
    )
}

export default function SphereVisualizer({ analyserRef, isAiSpeaking, isUserSpeaking }) {
    return (
        <div className="w-full h-full relative cursor-grab active:cursor-grabbing">
            <Canvas
                camera={{ position: [0, 0, 3.2], fov: 46 }}
                gl={{ antialias: true, alpha: true }}
                style={{ background: 'transparent' }}
            >
                <ambientLight intensity={0.6} />
                <AnimatedSphere
                    analyserRef={analyserRef}
                    isAiSpeaking={isAiSpeaking}
                    isUserSpeaking={isUserSpeaking}
                />
                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    rotateSpeed={0.5}
                />
            </Canvas>
        </div>
    )
}
