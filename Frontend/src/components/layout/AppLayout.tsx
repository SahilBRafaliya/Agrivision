import { ReactNode } from 'react';
import { TopNav } from './TopNav';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-secondary">
      <TopNav />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
