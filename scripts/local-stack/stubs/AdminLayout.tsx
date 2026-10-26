import type { ReactNode } from 'react';
// Render-test stand-in: no PIN gate, no shell
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <main>{children}</main>;
}
