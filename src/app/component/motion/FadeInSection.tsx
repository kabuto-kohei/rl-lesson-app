'use client';

import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

type FadeInSectionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export default function FadeInSection({ children, className, delay = 0 }: FadeInSectionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.2, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  );
}
