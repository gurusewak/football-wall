'use client'

import { useEffect, useRef, useState } from 'react'

export function PageBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imgError, setImgError] = useState(false)

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

    const spawnParticle = () => {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height * 0.6 + Math.random() * canvas.height * 0.4,
        vy: -(0.25 + Math.random() * 0.45),
        vx: (Math.random() - 0.5) * 0.25,
        opacity: 0,
        size: 0.4 + Math.random() * 1.2,
        life: 0,
        maxLife: 140 + Math.random() * 200,
      })
    }

    let tick = 0
    const animate = () => {
      animFrame = requestAnimationFrame(animate)
      tick++
      if (tick % 10 === 0 && particles.length < 35) spawnParticle()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles = particles.filter(p => p.life < p.maxLife)
      for (const p of particles) {
        p.life++
        p.x += p.vx
        p.y += p.vy
        const prog = p.life / p.maxLife
        p.opacity = prog < 0.1 ? prog / 0.1 : prog > 0.8 ? (1 - prog) / 0.2 : 0.55
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(220, 220, 220, ${p.opacity * 0.28})`
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
    <div className="fixed inset-0 -z-10 overflow-hidden" style={{ backgroundColor: '#080808' }}>
      {/* Real photo background — user should place the soccer ball image at /public/soccer-bg.jpg */}
      {!imgError && (
        <img
          src="/soccer-bg.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          style={{ opacity: 0.12, filter: 'grayscale(100%) contrast(1.1)' }}
          onError={() => setImgError(true)}
        />
      )}

      {/* Goal net SVG pattern overlay */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: imgError ? 0.045 : 0.025 }}
      >
        <defs>
          <pattern id="netGrid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M15 0 L30 15 L15 30 L0 15 Z" stroke="rgba(255,255,255,1)" strokeWidth="0.5" fill="none" />
            <line x1="15" y1="0" x2="15" y2="30" stroke="rgba(255,255,255,0.4)" strokeWidth="0.25" />
            <line x1="0" y1="15" x2="30" y2="15" stroke="rgba(255,255,255,0.4)" strokeWidth="0.25" />
          </pattern>
          <radialGradient id="netFade" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="55%" stopColor="white" stopOpacity="0.4" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="netMask">
            <rect width="100%" height="100%" fill="url(#netFade)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#netGrid)" mask="url(#netMask)" />
      </svg>

      {/* Faint soccer ball watermark (shown when no image) */}
      {imgError && (
        <svg
          className="absolute pointer-events-none"
          style={{ width: '600px', height: '600px', top: '-40px', left: '50%', transform: 'translateX(-50%)', opacity: 0.025 }}
          viewBox="0 0 200 200"
        >
          <defs>
            <radialGradient id="ballG" cx="38%" cy="32%" r="58%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#aaaaaa" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#333" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="94" fill="url(#ballG)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <polygon points="100,20 118,34 112,56 88,56 82,34" fill="rgba(0,0,0,0.75)" />
          <polygon points="152,58 166,78 155,100 133,100 122,78" fill="rgba(0,0,0,0.75)" />
          <polygon points="142,146 152,168 132,180 114,168 118,146" fill="rgba(0,0,0,0.75)" />
          <polygon points="58,146 82,146 86,168 68,180 48,168" fill="rgba(0,0,0,0.75)" />
          <polygon points="34,58 78,78 67,100 45,100 34,78" fill="rgba(0,0,0,0.75)" />
        </svg>
      )}

      {/* Stadium light cones from top — neutral white */}
      <div
        className="absolute top-0 left-1/4 w-[700px] h-[600px] -translate-x-1/2 pointer-events-none"
        style={{ background: 'conic-gradient(from 248deg at 50% -10%, transparent 28deg, rgba(255,255,255,0.04) 48deg, transparent 68deg)' }}
      />
      <div
        className="absolute top-0 left-3/4 w-[700px] h-[600px] -translate-x-1/2 pointer-events-none"
        style={{ background: 'conic-gradient(from 248deg at 50% -10%, transparent 28deg, rgba(255,255,255,0.04) 48deg, transparent 68deg)' }}
      />

      {/* Stadium light pulse points */}
      <div
        className="absolute top-1 left-[21%] w-2.5 h-2.5 rounded-full pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.45)', boxShadow: '0 0 18px 7px rgba(255,255,255,0.12)', animation: 'stadiumPulse 3.5s ease-in-out infinite' }}
      />
      <div
        className="absolute top-1 left-[79%] w-2.5 h-2.5 rounded-full pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.45)', boxShadow: '0 0 18px 7px rgba(255,255,255,0.12)', animation: 'stadiumPulse 3.5s ease-in-out infinite 1.75s' }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 115% 95% at 50% 50%, transparent 25%, rgba(4,4,4,0.55) 65%, rgba(2,2,2,0.93) 100%)' }}
      />

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-72 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(4,4,4,0.95), transparent)' }}
      />

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
    </div>
  )
}
