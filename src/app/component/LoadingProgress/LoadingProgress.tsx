'use client';

import styles from './LoadingProgress.module.css';

type LoadingProgressProps = {
  progress: number;
  label: string;
  className?: string;
};

const clamp = (value: number): number => {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};

export default function LoadingProgress({ progress, label, className }: LoadingProgressProps) {
  const safeProgress = clamp(progress);

  return (
    <div className={`${styles.container} ${className ?? ''}`.trim()} role="status" aria-live="polite">
      <div className={styles.headlineRow}>
        <span className={styles.label}>{label}</span>
        <span className={styles.percent}>{safeProgress}%</span>
      </div>
      <div className={styles.track} aria-hidden="true">
        <div className={styles.fill} style={{ width: `${safeProgress}%` }} />
      </div>
    </div>
  );
}
