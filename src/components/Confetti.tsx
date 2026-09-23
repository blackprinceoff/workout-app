import { useEffect, useMemo, useState } from 'react'

export function Confetti({ count = 90 }: { count?: number }) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.3,
      duration: 2.6 + Math.random() * 1.2,
      dx: (Math.random() - 0.5) * 260,
      rot: 360 + Math.random() * 540,
      color: ['#ecc878', '#ffd98a', '#b48cff', '#58d985', '#7aa2ff'][i % 5],
    })),
  )
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3600)
    return () => clearTimeout(t)
  }, [])

  const styleSheets = useMemo(
    () =>
      pieces.map((p) => ({
        '--dx': `${p.dx}px`,
        '--rot': `${p.rot}deg`,
      }) as React.CSSProperties),
    [pieces],
  )

  if (!visible) return null

  return (
    <div className="confetti-container" role="presentation">
      {pieces.map((p, i) => (
        <div
          key={p.id}
          className="confetti"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
            ...styleSheets[i],
          }}
        />
      ))}
    </div>
  )
}