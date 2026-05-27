import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function AnimatedEffects({ enabled = true, burstKey = 0, muzzleKey = 0 }) {
  const float = { y: [0, -8, 0, 6, 0], rotate: [0, 6, -6, 0] };
  const floatFast = { y: [0, -6, 0], rotate: [0, 18, 0] };
  const flash = {
    opacity: [0, 0.72, 0],
    scale: [0.85, 1.08, 0.95],
    rotate: [-4, 4, -2]
  };

  const transitionSlow = { duration: 6, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' };
  const transitionFast = { duration: 3.2, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' };

  const [particles, setParticles] = useState([]);
  const [muzzleFlash, setMuzzleFlash] = useState(0);
  const [impactKey, setImpactKey] = useState(0);

  useEffect(() => {
    if (!enabled || !burstKey) return;
    setImpactKey(burstKey);
    const count = 16;
    const next = Array.from({ length: count }).map((_, i) => ({
      id: `${burstKey}-${i}`,
      dx: (Math.random() - 0.5) * 220,
      dy: (Math.random() - 0.5) * 140,
      scale: 0.8 + Math.random() * 1.15,
      delay: Math.random() * 0.08,
      hue: i % 3
    }));

    setParticles(next);
    const t = setTimeout(() => setParticles([]), 900);
    return () => clearTimeout(t);
  }, [burstKey, enabled]);

  useEffect(() => {
    if (!enabled || !muzzleKey) return;
    setMuzzleFlash(muzzleKey);
    const t = setTimeout(() => setMuzzleFlash(0), 220);
    return () => clearTimeout(t);
  }, [muzzleKey, enabled]);

  if (!enabled) return null;

  return (
    <div className="ff-hero-effects" aria-hidden>
      <AnimatePresence>
        {impactKey ? (
          <motion.div
            className="ff-impact-flash"
            initial={{ opacity: 0 }}
            animate={flash}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        ) : null}
      </AnimatePresence>

      <motion.div className="ff-effect ff-effect-gun" animate={float} transition={transitionSlow}>
        <svg width="88" height="24" viewBox="0 0 88 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="6" width="58" height="12" rx="3" fill="#FFD49A" fillOpacity="0.08" />
          <rect x="58" y="9" width="20" height="6" rx="2" fill="#FF8E32" />
          <rect x="64" y="6" width="8" height="12" rx="2" fill="#ffe9d1" fillOpacity="0.25" />
          <AnimatePresence>
            {muzzleFlash ? (
              <motion.rect
                x={60}
                y={4}
                width={28}
                height={16}
                rx={2}
                fill="#fff8eb"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              />
            ) : null}
          </AnimatePresence>
        </svg>
      </motion.div>

      <motion.div className="ff-effect ff-effect-grenade" animate={float} transition={transitionSlow}>
        <svg width="32" height="36" viewBox="0 0 32 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="18" r="10" fill="#7bb241" fillOpacity="0.95" />
          <rect x="10" y="4" width="12" height="6" rx="2" fill="#e6e6e6" opacity="0.9" />
        </svg>
      </motion.div>

      <motion.div className="ff-effect ff-effect-blood" animate={floatFast} transition={transitionFast}>
        <svg width="78" height="78" viewBox="0 0 78 78" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M39 2c5.7 8.2 14.8 11.4 20.8 20.6 6 9.3-2.6 20.7-12 27-9.2 6.2-22.6 6.3-29.2-3.2C12 36.8 17.3 14 39 2z" fill="#ff183d" fillOpacity="0.98" />
          <path d="M38 16c2.2 3.6 5 5.2 6.8 8.4 1.9 3.2-1.2 7.4-4.3 9.2-3.1 1.8-7.2 1.8-9.2-1.1-1.9-2.9-.4-11.5 6.7-16.5z" fill="#ffd0d9" fillOpacity="0.35" />
        </svg>
      </motion.div>

      <motion.div className="ff-effect ff-effect-blood-sm" animate={floatFast} transition={{ ...transitionFast, duration: 2.2 }}>
        <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 2c3.5 5 8.8 6.8 12.1 11.8 3.4 5-1.5 11.1-6.9 14.7-5.4 3.6-12.8 3.6-16.1-1.8C7.2 22.3 9.8 9.4 21 2z" fill="#ff183d" />
        </svg>
      </motion.div>

      <motion.div className="ff-effect ff-effect-slashed" animate={{ opacity: [0.65, 1, 0.7], y: [0, -4, 0], rotate: [-6, 3, -2] }} transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}>
        <svg width="170" height="72" viewBox="0 0 170 72" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 58C44 24 74 18 164 8" stroke="#ff1f3d" strokeWidth="10" strokeLinecap="round" />
          <path d="M18 66C62 40 92 34 156 18" stroke="#ff8e32" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </motion.div>

      <div className="ff-particles" aria-hidden>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="ff-particle"
            initial={{ opacity: 1, x: 0, y: 0, scale: 0.2 }}
            animate={{ opacity: 0, x: p.dx, y: p.dy, scale: p.scale, rotate: p.hue * 42 }}
            transition={{ duration: 0.72, delay: p.delay, ease: 'easeOut' }}
            style={p.hue === 1 ? { background: 'linear-gradient(180deg, #ffdae2, #ff3250)' } : p.hue === 2 ? { background: 'linear-gradient(180deg, #ffd49a, #ff5e2b)' } : undefined}
          />
        ))}
      </div>
    </div>
  );
}
