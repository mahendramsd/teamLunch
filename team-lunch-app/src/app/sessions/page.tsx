'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Session {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  owner?: { name: string; avatarUrl?: string };
  members?: unknown[];
}

export default function SessionsPage() {
  const router = useRouter();
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const { data: sessions, refetch, isLoading } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await api.get('/sessions');
      return res.data;
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionTitle.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/sessions', { title: newSessionTitle });
      setNewSessionTitle('');
      refetch();
      router.push(`/sessions/${res.data.id}`);
    } catch (err) {
      console.error('Failed to create session', err);
    } finally {
      setCreating(false);
    }
  };

  const joinSession = async (id: number) => {
    try {
      await api.post(`/sessions/${id}/join`);
      router.push(`/sessions/${id}`);
    } catch (err) {
      console.error('Failed to join session', err);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <style>{`
        .session-card {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          transition: box-shadow 0.18s ease, transform 0.18s ease;
          cursor: default;
        }
        .session-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-1px);
        }
        .join-btn {
          padding: 0.5rem 1.1rem;
          background: var(--success);
          color: #fff;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s ease, transform 0.1s ease;
        }
        .join-btn:hover { background: #047857; transform: scale(1.02); }
        .create-input {
          flex: 1;
          padding: 0.65rem 0.875rem;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 0.95rem;
          font-family: inherit;
          color: var(--text-primary);
          background: #fff;
          transition: border-color 0.15s;
        }
        .create-input:focus { border-color: var(--border-focus); outline: none; }
        .create-input::placeholder { color: var(--text-muted); }
        .create-btn {
          padding: 0.65rem 1.5rem;
          background: var(--brand);
          color: #fff;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease;
          white-space: nowrap;
        }
        .create-btn:hover:not(:disabled) { background: var(--brand-hover); }
        .create-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .live-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 2px 8px;
          background: var(--success-light);
          color: var(--success);
          border-radius: 100px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .live-dot {
          width: 6px; height: 6px;
          background: var(--success);
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .skeleton {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: var(--radius-sm);
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* ── Page header ──────────────────────────────── */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>
            Lunch Sessions
          </h1>
          <p style={{ marginTop: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Create a session, invite your team, and pick a restaurant together.
          </p>
        </div>

        {/* ── Create session card ───────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.75rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 20px rgba(37, 99, 235, 0.25)',
        }}>
          <h2 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            Start a New Session
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Give your session a name, then invite teammates to vote.
          </p>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.625rem' }}>
            <input
              className="create-input"
              type="text"
              value={newSessionTitle}
              onChange={(e) => setNewSessionTitle(e.target.value)}
              placeholder="E.g. Friday Team Lunch"
              maxLength={100}
              required
              style={{
                flex: 1,
                padding: '0.7rem 0.9rem',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                color: '#0f172a',
                background: 'rgba(255,255,255,0.95)',
              }}
            />
            <button
              type="submit"
              className="create-btn"
              disabled={creating || !newSessionTitle.trim()}
              style={{
                padding: '0.7rem 1.5rem',
                background: '#fff',
                color: '#2563eb',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: creating ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {creating ? 'Creating…' : '+ Create'}
            </button>
          </form>
        </div>

        {/* ── Sessions list ─────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Open Sessions
          </h2>
          {sessions && sessions.length > 0 && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {sessions.length} active
            </span>
          )}
        </div>

        {isLoading ? (
          /* Skeleton loaders */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: '78px' }} />
            ))}
          </div>
        ) : sessions?.length === 0 ? (
          /* Empty state */
          <div style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            background: '#fff',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border)',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🍽️</div>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>No open sessions yet</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Create one above and get your team deciding!</p>
          </div>
        ) : (
          /* Session cards */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sessions?.map((session) => (
              <div key={session.id} className="session-card">
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {session.title}
                    </h3>
                    <span className="live-badge">
                      <span className="live-dot" />
                      Live
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {session.owner?.name && <span style={{ marginRight: '0.5rem' }}>by <strong style={{ color: 'var(--text-secondary)' }}>{session.owner.name}</strong> ·</span>}
                    {formatDate(session.createdAt)}
                    {session.members && session.members.length > 0 && (
                      <span style={{ marginLeft: '0.5rem' }}>· {session.members.length} joined</span>
                    )}
                  </p>
                </div>
                <button
                  className="join-btn"
                  onClick={() => joinSession(session.id)}
                >
                  Join →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
