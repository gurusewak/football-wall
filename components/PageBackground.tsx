'use client'

export function PageBackground() {
  return (
    <div
      className="fixed inset-0 -z-10"
      style={{
        background: `
          radial-gradient(circle at 50% 50%, rgba(100, 100, 100, 0.15) 0%, transparent 50%),
          linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)
        `,
        backgroundColor: '#0a0a0a',
      }}
    >
      {/* Soccer ball SVG pattern */}
      <svg
        viewBox="0 0 1000 1000"
        className="absolute inset-0 w-full h-full opacity-10"
        style={{ pointerEvents: 'none' }}
      >
        {/* Gradient background */}
        <defs>
          <radialGradient id="soccerGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#666666" />
          </radialGradient>
        </defs>
        
        {/* Large soccer ball */}
        <circle cx="500" cy="500" r="400" fill="url(#soccerGradient)" stroke="#444" strokeWidth="2" />
        
        {/* Pentagon pattern (soccer ball pentagons) */}
        <g stroke="#333" strokeWidth="3" fill="none">
          {/* Top pentagon */}
          <polygon points="500,200 600,250 580,370 420,370 400,250" />
          {/* Middle pentagons */}
          <polygon points="300,400 350,300 480,320 450,450 320,480" />
          <polygon points="700,400 650,300 520,320 550,450 680,480" />
          {/* Bottom pentagons */}
          <polygon points="400,550 320,520 350,700 550,750 580,550" />
          <polygon points="600,550 680,520 650,700 450,750 420,550" />
        </g>
        
        {/* Hexagon outlines */}
        <g stroke="#444" strokeWidth="2" fill="none" opacity="0.5">
          <circle cx="500" cy="380" r="80" />
          <circle cx="350" cy="500" r="80" />
          <circle cx="650" cy="500" r="80" />
          <circle cx="420" cy="650" r="80" />
          <circle cx="580" cy="650" r="80" />
        </g>
      </svg>
    </div>
  )
}
