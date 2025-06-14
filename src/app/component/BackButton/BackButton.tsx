// src/components/BackButton/BackButton.tsx
"use client";

import styles from "./BackButton.module.css";

export default function BackButton({ href }: { href: string }) {
  return (
    <div className={styles.backButton}>
      <a href={href} className={styles.backLink}>
        戻る
      </a>
    </div>
  );
}
