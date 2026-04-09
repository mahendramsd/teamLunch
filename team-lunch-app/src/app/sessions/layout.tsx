'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { SocketProvider } from '@/context/SocketContext';

interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
}

function Navbar() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user } = useQuery<User>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<User>('/auth/me');
      return res.data;
    },
    staleTime: 5 * 60 * 1000, 
  });

  const handleLogout = async () => {
    try {
      await api.delete('/auth/logout');
    } catch {
    } finally {
      queryClient.clear();
      router.push('/');
    }
  };

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        height: '60px',
        background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 2px 12px rgba(37,99,235,0.3)',
      }}
    >
      {/* Brand */}
      <span
        style={{
          fontWeight: 800,
          fontSize: '1.05rem',
          color: '#ffffff',
          letterSpacing: '-0.3px',
          cursor: 'pointer',
        }}
        onClick={() => router.push('/sessions')}
      >
        🍽️ TeamLunch
      </span>

      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              width={32}
              height={32}
              style={{ borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)' }}
            />
          ) : (
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span style={{ color: '#e2e8f0', fontSize: '0.875rem', fontWeight: 500 }}>
            {user.name}
          </span>

          <button
            id="logout-btn"
            onClick={handleLogout}
            style={{
              padding: '0.4rem 0.875rem',
              backgroundColor: 'transparent',
              color: '#e2e8f0',
              border: '1.5px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#dc2626';
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#dc2626';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)';
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}

export default function SessionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </SocketProvider>
  );
}
