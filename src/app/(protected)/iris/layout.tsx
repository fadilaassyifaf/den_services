'use client';

/**
 * IRIS LAYOUT
 * Path: src/app/(protected)/iris/layout.tsx
 * 
 * Jika sudah ada layout.tsx, tambahkan ProgressProvider sebagai wrapper saja.
 */

import { ProgressProvider } from '@/shared/context/progress-context';
import type { ReactNode } from 'react';

export default function IrisLayout({ children }: { children: ReactNode }) {
  return (
    <ProgressProvider>
      {children}
    </ProgressProvider>
  );
}