import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import BrandLogo from './BrandLogo';

export default function AppIntro({ onDone }) {
  const prefersReducedMotion = useReducedMotion();
  const [isCompactScreen, setIsCompactScreen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleChange = (event) => setIsCompactScreen(event.matches);
    setIsCompactScreen(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const compactMode = prefersReducedMotion || isCompactScreen;
  const introDurationMs = compactMode ? 2400 : 4000;
  const logoSize = compactMode ? 76 : 92;
  const wordmarkSize = compactMode ? 58 : 72;
  const textClassName = compactMode
    ? 'text-[2.25rem] sm:text-[3.25rem] tracking-[0.1em]'
    : 'text-[2.8rem] sm:text-[4rem] tracking-[0.12em]';
  const progressDuration = compactMode ? 2.1 : 3.7;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDone();
    }, introDurationMs);

    return () => clearTimeout(timer);
  }, [introDurationMs, onDone]);

  const backgroundMotion = useMemo(
    () =>
      compactMode
        ? { scale: [1, 1.01, 1], opacity: [0.9, 1, 0.9] }
        : { scale: [1, 1.04, 1], x: [0, 20, 0], y: [0, -18, 0] },
    [compactMode]
  );

  const secondaryBackgroundMotion = useMemo(
    () =>
      compactMode
        ? { scale: [1, 1.02, 1], opacity: [0.86, 1, 0.86] }
        : { scale: [1.02, 1, 1.03], x: [0, -24, 0], y: [0, 16, 0] },
    [compactMode]
  );

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: compactMode ? 0.28 : 0.45 }}
      className="fixed inset-0 z-[120] overflow-hidden bg-white text-slate-900"
    >
      <motion.div
        animate={backgroundMotion}
        transition={{ duration: compactMode ? 5.4 : 8.5, repeat: Infinity, ease: 'easeInOut' }}
        className={`absolute -top-32 -left-24 rounded-full bg-blue-100 ${compactMode ? 'h-[20rem] w-[20rem] blur-2xl' : 'h-[28rem] w-[28rem] blur-3xl'}`}
      />
      <motion.div
        animate={secondaryBackgroundMotion}
        transition={{ duration: compactMode ? 5 : 7.6, repeat: Infinity, ease: 'easeInOut' }}
        className={`absolute -bottom-40 -right-28 rounded-full bg-cyan-100 ${compactMode ? 'h-[22rem] w-[22rem] blur-2xl' : 'h-[30rem] w-[30rem] blur-3xl'}`}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(37,99,255,0.12),transparent_34%),radial-gradient(circle_at_82%_78%,rgba(6,182,212,0.12),transparent_36%),linear-gradient(180deg,#ffffff_0%,#f4faff_54%,#edf8ff_100%)]" />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: compactMode ? ['100%', '0%', '-104%'] : ['100%', '0%', '-112%'] }}
        transition={{
          delay: compactMode ? 0.62 : 1.08,
          duration: compactMode ? 0.72 : 1,
          times: [0, 0.34, 1],
          ease: [0.22, 0.9, 0.24, 1]
        }}
        className="absolute inset-x-0 bottom-0 top-0 bg-[linear-gradient(180deg,#1d4ed8_0%,#00b7ff_45%,#72efff_100%)]"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.92, 0] }}
        transition={{ delay: compactMode ? 0.62 : 1.08, duration: compactMode ? 0.72 : 1, times: [0, 0.24, 1], ease: 'easeInOut' }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.28),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0)_48%)]"
      />

      <motion.div
        animate={compactMode ? { opacity: [0.96, 1, 0.98] } : { scale: [1, 1, 1.035, 1], y: [0, 0, -7, 0] }}
        transition={{ duration: compactMode ? 2.4 : 4, times: [0, 0.52, 0.62, 0.76], ease: 'easeInOut' }}
        className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
      >
        <div className="mt-2 flex flex-col items-center">
          <motion.div
            initial={compactMode ? { opacity: 0, scale: 0.88, y: 18 } : { opacity: 0, x: -320, rotate: -620, scaleX: 1.58, scaleY: 0.64, skewX: -12 }}
            animate={
              compactMode
                ? { opacity: 1, scale: [0.88, 1.02, 1], y: [18, -4, 0] }
                : {
                    opacity: 1,
                    x: 0,
                    rotate: 0,
                    skewX: [-12, 8, -4, 0],
                    scaleX: [1.58, 0.78, 1.14, 0.96, 1.03, 1],
                    scaleY: [0.64, 1.22, 0.92, 1.04, 0.98, 1]
                  }
            }
            transition={{ delay: compactMode ? 0.06 : 0.08, duration: compactMode ? 0.52 : 1.45, ease: [0.2, 0.9, 0.22, 1] }}
            className="relative"
          >
            <motion.div
              animate={
                compactMode
                  ? {
                      filter: [
                        'drop-shadow(0 8px 14px rgba(37,99,255,0.12))',
                        'drop-shadow(0 12px 22px rgba(0,183,255,0.16))',
                        'drop-shadow(0 8px 14px rgba(37,99,255,0.12))'
                      ]
                    }
                  : {
                      borderRadius: ['26%', '34%', '24%', '32%', '28%'],
                      filter: [
                        'drop-shadow(0 10px 18px rgba(37,99,255,0.12))',
                        'drop-shadow(0 16px 30px rgba(0,183,255,0.18))',
                        'drop-shadow(0 10px 18px rgba(37,99,255,0.12))'
                      ]
                    }
              }
              transition={{ delay: compactMode ? 0.14 : 0.22, duration: compactMode ? 0.82 : 1.06, ease: 'easeInOut' }}
              className="relative will-change-transform"
            >
              <motion.div
                animate={{ opacity: [1, 1, 0, 1] }}
                transition={{ duration: compactMode ? 2.4 : 4, times: [0, 0.52, 0.62, 0.78], ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                <BrandLogo size={logoSize} withText={false} iconFill="white" />
              </motion.div>
              <motion.div
                animate={{ opacity: [0, 0, 1, 0] }}
                transition={{ duration: compactMode ? 2.4 : 4, times: [0, 0.52, 0.62, 0.78], ease: 'easeInOut' }}
              >
                <BrandLogo size={logoSize} withText={false} squareFill="#ffffff" iconFill="#0f6dff" />
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: compactMode ? 0.34 : 0.95, duration: compactMode ? 0.32 : 0.5, ease: 'easeOut' }}
            className={compactMode ? 'mt-5' : 'mt-6'}
          >
            <div className="relative">
              <motion.div
                animate={{ opacity: [1, 1, 0, 1] }}
                transition={{ duration: compactMode ? 2.4 : 4, times: [0, 0.52, 0.62, 0.78], ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                <BrandLogo
                  size={wordmarkSize}
                  textClassName={textClassName}
                />
              </motion.div>
              <motion.div
                animate={{ opacity: [0, 0, 1, 0], color: ['#ffffff', '#ffffff', '#ffffff', '#ffffff'] }}
                transition={{ duration: compactMode ? 2.4 : 4, times: [0, 0.52, 0.62, 0.78], ease: 'easeInOut' }}
              >
                <BrandLogo
                  size={wordmarkSize}
                  squareFill="#ffffff"
                  iconFill="#0f6dff"
                  useSolidText
                  textClassName={textClassName}
                />
              </motion.div>
            </div>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, color: ['#64748b', '#64748b', '#ffffff', '#64748b'] }}
          transition={{ delay: compactMode ? 0.44 : 1.08, duration: compactMode ? 0.82 : 1.04, times: [0, 0.24, 0.62, 1], ease: 'easeInOut' }}
          className={`max-w-xl font-semibold ${compactMode ? 'mt-4 text-[13px] sm:text-sm' : 'mt-5 text-sm sm:text-base'}`}
        >
          Exchange skills. Build trust. Grow together.
        </motion.p>

        <div className={`w-full max-w-xs ${compactMode ? 'mt-7' : 'mt-10'}`}>
          <motion.div
            animate={{ backgroundColor: ['#e2e8f0', '#e2e8f0', 'rgba(255,255,255,0.36)', '#e2e8f0'] }}
            transition={{ delay: compactMode ? 0.44 : 1.08, duration: compactMode ? 0.82 : 1.04, times: [0, 0.24, 0.62, 1], ease: 'easeInOut' }}
            className="h-1.5 overflow-hidden rounded-full"
          >
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: progressDuration, ease: 'easeInOut' }}
              className="h-full rounded-full bg-gradient-to-r from-blue-300 via-cyan-300 to-cyan-100"
            />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, color: ['#94a3b8', '#94a3b8', '#ffffff', '#94a3b8'] }}
            transition={{ delay: compactMode ? 0.5 : 1.16, duration: compactMode ? 0.76 : 0.98, times: [0, 0.24, 0.62, 1], ease: 'easeInOut' }}
            className="mt-3 text-[11px] uppercase tracking-[0.22em]"
          >
            Loading Wertech
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  );
}
