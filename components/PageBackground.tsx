'use client'

import { useEffect, useRef } from 'react'

export function PageBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrame: number
    let particles: { x: number; y: number; vy: number; vx: number; opacity: number; size: number; life: number; maxLife: number }[] = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Spawn particles (subtle dust/light specks)
    const spawnParticle = () => {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height * 0.7 + Math.random() * canvas.height * 0.3,
        vy: -(0.3 + Math.random() * 0.5),
        vx: (Math.random() - 0.5) * 0.3,
        opacity: 0,
        size: 0.5 + Math.random() * 1.5,
        life: 0,
        maxLife: 120 + Math.random() * 180,
      })
    }

    let tick = 0
    const animate = () => {
      animFrame = requestAnimationFrame(animate)
      tick++
      if (tick % 8 === 0 && particles.length < 40) spawnParticle()

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles = particles.filter(p => p.life < p.maxLife)
      for (const p of particles) {
        p.life++
        p.x += p.vx
        p.y += p.vy
        const progress = p.life / p.maxLife
        p.opacity = progress < 0.1 ? progress / 0.1 : progress > 0.8 ? (1 - progress) / 0.2 : 0.6

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200, 220, 255, ${p.opacity * 0.35})`
        ctx.fill()
      }
    }
    animate()

    return () => {
      cancelAnimationFrame(animFrame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" style={{ backgroundColor: '#080a0f' }}>
      {/* Goal net SVG pattern layer */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.035]"
        xmlns="http://www.w3.org/2000/svg"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          {/* Repeating net diamond grid */}
          <pattern id="netGrid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M14 0 L28 14 L14 28 L0 14 Z" stroke="rgba(200,220,255,1)" strokeWidth="0.6" fill="none" />
            <line x1="14" y1="0" x2="14" y2="28" stroke="rgba(200,220,255,0.5)" strokeWidth="0.3" />
            <line x1="0" y1="14" x2="28" y2="14" stroke="rgba(200,220,255,0.5)" strokeWidth="0.3" />
          </pattern>
          {/* Outer fade mask */}
          <radialGradient id="netMask" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="60%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="fadeNet">
            <rect width="100%" height="100%" fill="url(#netMask)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#netGrid)" mask="url(#fadeNet)" />
      </svg>

      {/* Large faint soccer ball in background */}
      <svg
        className="absolute opacity-[0.025]"
        style={{ width: '700px', height: '700px', top: '-80px', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="ballGrad" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#888888" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#333333" stopOpacity="0.1" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="95" fill="url(#ballGrad)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        {/* Pentagon patches */}
        <polygon points="100,18 120,32 113,55 87,55 80,32" fill="rgba(0,0,0,0.7)" />
        <polygon points="155,58 170,80 158,103 135,103 122,80" fill="rgba(0,0,0,0.7)" />
        <polygon points="145,148 155,170 134,182 115,170 118,148" fill="rgba(0,0,0,0.7)" />
        <polygon points="55,148 82,148 85,170 65,182 45,170" fill="rgba(0,0,0,0.7)" />
        <polygon points="30,58 78,80 65,103 42,103 30,80" fill="rgba(0,0,0,0.7)" />
        {/* Seam lines */}
        <path d="M100,18 L120,32 M100,18 L80,32 M120,32 L155,58 M80,32 L45,58 M155,58 L170,80 M45,58 L30,80 M170,80 L158,103 M30,80 L42,103 M158,103 L145,148 M42,103 L55,148 M145,148 L134,182 M55,148 L65,182 M134,182 L115,170 M65,182 L85,170 M115,170 L85,170" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />
      </svg>

      {/* Stadium light glow from top — two cones */}
      <div
        className="absolute top-0 left-1/4 w-[600px] h-[500px] -translate-x-1/2"
        style={{
          background: 'conic-gradient(from 250deg at 50% -10%, transparent 30deg, rgba(180,210,255,0.06) 50deg, transparent 70deg)',
          pointerEvents: 'none',
        }}
      />
      <div
        className="absolute top-0 left-3/4 w-[600px] h-[500px] -translate-x-1/2"
        style={{
          background: 'conic-gradient(from 250deg at 50% -10%, transparent 30deg, rgba(180,210,255,0.06) 50deg, transparent 70deg)',
          pointerEvents: 'none',
        }}
      />

      {/* Stadium light pulse dots */}
      <div className="absolute top-0 left-[22%] w-3 h-3 rounded-full" style={{ background: 'rgba(200,230,255,0.5)', boxShadow: '0 0 20px 8px rgba(160,200,255,0.2)', animation: 'stadiumPulse 3s ease-in-out infinite' }} />
      <div className="absolute top-0 left-[78%] w-3 h-3 rounded-full" style={{ background: 'rgba(200,230,255,0.5)', boxShadow: '0 0 20px 8px rgba(160,200,255,0.2)', animation: 'stadiumPulse 3s ease-in-out infinite 1.5s' }} />

      {/* Vignette overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 110% 90% at 50% 50%, transparent 30%, rgba(5,6,10,0.6) 70%, rgba(3,4,8,0.92) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Bottom darkening */}
      <div
        className="absolute bottom-0 left-0 right-0 h-64"
        style={{ background: 'linear-gradient(to top, rgba(5,6,10,0.9), transparent)', pointerEvents: 'none' }}
      />

      {/* Ambient particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />
    </div>
  )
}
