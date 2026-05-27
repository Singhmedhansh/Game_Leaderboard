import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function AnimatedEffects({ enabled = true, burstKey = 0, muzzleKey = 0 }) {
  const float = { y: [0, -8, 0, 6, 0], rotate: [0, 6, -6, 0] };
  const floatFast = { y: [0, -6, 0], rotate: [0, 18, 0] };

  const transitionSlow = { duration: 6, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' };
  const transitionFast = { duration: 3.2, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' };

  const [particles, setParticles] = useState([]);
  const [muzzleFlash, setMuzzleFlash] = useState(0);

  useEffect(() => {
    if (!enabled || !burstKey) return;
    const count = 8;
    const next = Array.from({ length: count }).map((_, i) => ({
      id: `${burstKey}-${i}`,
      dx: (Math.random() - 0.5) * 120,
      dy: -Math.random() * 80 - 20,
      scale: 0.6 + Math.random() * 0.9,
      delay: Math.random() * 0.06
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
      <motion.div className="ff-effect ff-effect-gun" animate={float} transition={transitionSlow}>
        <svg width="88" height="24" viewBox="0 0 88 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="6" width="58" height="12" rx="3" fill="#FFD49A" fillOpacity="0.08" />
          <rect x="58" y="9" width="20" height="6" rx="2" fill="#FF8E32" />
          <AnimatePresence>
            {muzzleFlash ? (
              <motion.rect
                x={66}
                y={6}
                width={20}
                height={12}
                rx={2}
                fill="#fff6e8"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
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
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 2c4 6 10 8 14 14 4 6-2 14-8 18-6 4-14 4-18-2C8 28 12 12 24 2z" fill="#ff3250" fillOpacity="0.95" />
        </svg>
      </motion.div>

      <motion.div className="ff-effect ff-effect-blood-sm" animate={floatFast} transition={{ ...transitionFast, duration: 2.2 }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2c2.4 3.6 6 4.8 8.4 8 2.4 3.2-1.2 7.2-4.8 9.6-3.6 2.4-8.4 2.4-10.8-1.2C6 16 8.4 8 14 2z" fill="#ff3250" />
        </svg>
      </motion.div>

      <div className="ff-particles" aria-hidden>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="ff-particle"
            initial={{ opacity: 1, x: 0, y: 0, scale: 0.2 }}
            animate={{ opacity: 0, x: p.dx, y: p.dy, scale: p.scale }}
            transition={{ duration: 0.72, delay: p.delay, ease: 'easeOut' }}
          />
        ))}
      </div>
    </div>
  );
}
