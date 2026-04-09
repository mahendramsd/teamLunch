'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useSocket } from '@/context/SocketContext';
import { useParams } from 'next/navigation';

interface Restaurant {
  id: number;
  name: string;
  submittedBy?: { name: string };
}

interface Session {
  id: number;
  title: string;
  status: string;
  ownerId: number;
  pickedRestaurant?: { name: string };
}

interface User {
  id: number;
  name: string;
}

interface InviteResult {
  sent: string[];
  failed: string[];
}

function Toast({ message, type, onClose }: { message: string; type: 'error' | 'success' | 'info'; onClose: () => void }) {
  const cfg = {
    error:   { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', icon: '❌' },
    success: { bg: '#f0fdf4', border: '#86efac', text: '#16a34a', icon: '✅' },
    info:    { bg: '#eff6ff', border: '#93c5fd', text: '#2563eb', icon: 'ℹ️' },
  }[type];

  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', top: '80px', right: '1.5rem', zIndex: 2000,
      backgroundColor: cfg.bg, border: `1.5px solid ${cfg.border}`,
      borderRadius: '10px', padding: '0.875rem 1.25rem', maxWidth: '380px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
      animation: 'toastIn 0.25s ease',
    }}>
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{cfg.icon}</span>
      <p style={{ fontSize: '0.875rem', color: cfg.text, fontWeight: 500, margin: 0, flex: 1, lineHeight: 1.5 }}>{message}</p>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: cfg.text, fontSize: '1.2rem', padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
    </div>
  );
}

// Confirm Model
function ConfirmEndModal({ sessionTitle, onConfirm, onCancel, isEnding }: {
  sessionTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isEnding: boolean;
}) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#fff', borderRadius: '14px', padding: '2rem',
          maxWidth: '440px', width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center',
        }}
      >
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fff7ed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem', fontSize: '1.75rem',
        }}>⚠️</div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
          End this session?
        </h2>
        <p style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '0.35rem', lineHeight: 1.6 }}>
          You are about to end <strong>&ldquo;{sessionTitle}&rdquo;</strong>.
        </p>
        <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.75rem', lineHeight: 1.6 }}>
          A restaurant will be <strong>randomly picked</strong> from all submissions. This action <strong>cannot be undone</strong>.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            disabled={isEnding}
            style={{
              padding: '0.7rem 1.5rem', backgroundColor: '#f1f5f9', color: '#475569',
              border: 'none', borderRadius: '8px', fontSize: '0.925rem', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isEnding}
            style={{
              padding: '0.7rem 1.75rem',
              background: isEnding ? '#fca5a5' : 'linear-gradient(135deg, #dc2626, #b91c1c)',
              color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: '0.925rem', fontWeight: 700,
              cursor: isEnding ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', minWidth: '180px',
            }}
          >
            {isEnding ? '⏳ Ending…' : '🎲 End & Pick Restaurant'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InviteModal({
  sessionId,
  onClose,
}: {
  sessionId: number;
  onClose: () => void;
}) {
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [result, setResult] = useState<InviteResult | null>(null);
  const [error, setError] = useState('');

  const addEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (emails.includes(trimmed)) {
      setError('This email is already in the list.');
      return;
    }
    setEmails((prev) => [...prev, trimmed]);
    setEmailInput('');
    setError('');
  };

  const removeEmail = (email: string) => {
    setEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail();
    }
  };

  const sendInvites = async () => {
    if (emails.length === 0) {
      setError('Add at least one email address.');
      return;
    }
    setStatus('sending');
    try {
      const res = await api.post<InviteResult>(`/sessions/${sessionId}/invite`, { emails });
      setResult(res.data);
      setStatus('done');
    } catch {
      setError('Failed to send invites. Please try again.');
      setStatus('idle');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '2rem',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {status === 'done' && result ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#111827' }}>
              Invites Sent!
            </h2>
            {result.sent.length > 0 && (
              <p style={{ color: '#059669', marginBottom: '0.5rem' }}>
                Sent to: {result.sent.join(', ')}
              </p>
            )}
            {result.failed.length > 0 && (
              <p style={{ color: '#dc2626', marginBottom: '0.5rem' }}>
                Failed: {result.failed.join(', ')}
              </p>
            )}
            <button
              onClick={onClose}
              style={{
                marginTop: '1.5rem',
                padding: '0.75rem 2rem',
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
                📧 Invite Members
              </h2>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', color: '#4b5563' }}>
              Enter Gmail addresses. Members will receive an email with a link to join the session.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => { setEmailInput(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                placeholder="colleague@gmail.com"
                style={{
                  flex: 1,
                  padding: '0.65rem 0.875rem',
                  borderRadius: '8px',
                  border: '1.5px solid #d1d5db',
                  fontSize: '0.95rem',
                  outline: 'none',
                }}
              />
              <button
                onClick={addEmail}
                style={{
                  padding: '0.65rem 1rem',
                  backgroundColor: '#f3f4f6',
                  border: '1.5px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#374151',
                  whiteSpace: 'nowrap',
                }}
              >
                + Add
              </button>
            </div>

            {error && (
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#dc2626' }}>{error}</p>
            )}

            {emails.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '1.25rem',
                  border: '1px solid #e5e7eb',
                  minHeight: '48px',
                }}
              >
                {emails.map((email) => (
                  <span
                    key={email}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      backgroundColor: '#dbeafe',
                      color: '#1d4ed8',
                      padding: '0.25rem 0.625rem',
                      borderRadius: '100px',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                    }}
                  >
                    {email}
                    <button
                      onClick={() => removeEmail(email)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', fontSize: '1rem', lineHeight: 1, padding: 0 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <p style={{ margin: '0 0 1.25rem', fontSize: '0.8rem', color: '#9ca3af' }}>
              Tip: Press <kbd style={{ padding: '2px 5px', background: '#f3f4f6', borderRadius: '4px', border: '1px solid #d1d5db' }}>Enter</kbd> or comma to add multiple emails.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '0.75rem 1.25rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={sendInvites}
                disabled={status === 'sending' || emails.length === 0}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: emails.length === 0 ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: emails.length === 0 ? 'not-allowed' : 'pointer',
                  minWidth: '130px',
                }}
              >
                {status === 'sending' ? 'Sending…' : `Send ${emails.length > 0 ? `(${emails.length})` : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Main Page 
export default function SessionRoomPage() {
  const params = useParams();
  const sessionId = Number(params.id);
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  const [restaurantName, setRestaurantName] = useState('');
  const [pickedBanner, setPickedBanner] = useState<Record<string, unknown> | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const { data: session, isLoading: sessionLoading } = useQuery<Session>({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const res = await api.get<Session>(`/sessions/${sessionId}`);
      return res.data;
    },
  });

  const { data: restaurants } = useQuery<Restaurant[]>({
    queryKey: ['restaurants', sessionId],
    queryFn: async () => {
      const res = await api.get<Restaurant[]>(`/sessions/${sessionId}/restaurants`);
      return res.data;
    },
  });

  const { data: currentUser, isLoading: userLoading } = useQuery<User>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<User>('/auth/me');
      return res.data;
    },
  });

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('session:join', { sessionId });

    socket.on('restaurant:added', (newRestaurant: Restaurant) => {
      queryClient.setQueryData(['restaurants', sessionId], (oldData: Restaurant[] | undefined) => {
        if (!oldData) return [newRestaurant];
        return oldData.find((r) => r.id === newRestaurant.id) ? oldData : [...oldData, newRestaurant];
      });
    });

    socket.on('session:ended', (data: { pickedRestaurant: Record<string, unknown> }) => {
      setPickedBanner(data.pickedRestaurant);
      void queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
    });

    return () => {
      socket.off('restaurant:added');
      socket.off('session:ended');
    };
  }, [socket, isConnected, sessionId, queryClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = restaurantName.trim();
    if (!name) return;

    const optimisticId = Date.now();
    const optimisticEntry: Restaurant = {
      id: -optimisticId,
      name,
      submittedBy: currentUser ? { name: currentUser.name } : undefined,
    };

    queryClient.setQueryData(['restaurants', sessionId], (old: Restaurant[] | undefined) =>
      old ? [...old, optimisticEntry] : [optimisticEntry],
    );
    setRestaurantName('');

    try {
      const res = await api.post<Restaurant>(`/sessions/${sessionId}/restaurants`, { name });
      // Replace optimistic entry with the real one from the server
      queryClient.setQueryData(['restaurants', sessionId], (old: Restaurant[] | undefined) => {
        if (!old) return [res.data];
        return old.map((r) => (r.id === -optimisticId ? res.data : r));
      });
    } catch (err) {
      // Rollback: remove the optimistic entry on failure
      queryClient.setQueryData(['restaurants', sessionId], (old: Restaurant[] | undefined) =>
        old ? old.filter((r) => r.id !== -optimisticId) : [],
      );
      setRestaurantName(name); // restore the input
      setToast({ message: 'Failed to submit restaurant. Please try again.', type: 'error' });
      console.error('Failed to submit restaurant', err);
    }
  };

  const handleEndSession = async () => {
    setIsEnding(true);
    try {
      await api.post(`/sessions/${sessionId}/end`);
      setShowConfirmEnd(false);
      setToast({ message: 'Session ended! A restaurant has been picked for your team.', type: 'success' });
    } catch (err: unknown) {
      setShowConfirmEnd(false);
      const apiMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setToast({
        message: apiMsg ?? 'Failed to end session. Make sure at least one restaurant has been submitted.',
        type: 'error',
      });
      console.error('Failed to end session', err);
    } finally {
      setIsEnding(false);
    }
  };

  const isLoading = sessionLoading || userLoading;

  // Compare both ownerId
  const sessionOwnerIdvalue = session?.ownerId ?? (session as unknown as { owner?: { id: number } })?.owner?.id;
  const isOwner = !!currentUser && !!sessionOwnerIdvalue && currentUser.id === sessionOwnerIdvalue;
  const isEnded = session?.status === 'ENDED' || !!pickedBanner;
  const finalPicked = pickedBanner ?? session?.pickedRestaurant;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #e5e7eb', borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>Loading session…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isEnded && finalPicked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f9fafb' }}>
        <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.12)', textAlign: 'center', maxWidth: '500px', width: '100%' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#10b981' }}>Lunch Decided! 🎉</h1>
          <p style={{ color: '#4b5563', marginBottom: '2rem', fontSize: '1.2rem' }}>We are going to:</p>
          <h2 style={{ fontSize: '3rem', fontWeight: '900', color: '#1f2937' }}>{(finalPicked as { name: string }).name}</h2>
        </div>
      </div>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={dismissToast} />}

      {showConfirmEnd && (
        <ConfirmEndModal
          sessionTitle={session?.title ?? 'this session'}
          onConfirm={handleEndSession}
          onCancel={() => setShowConfirmEnd(false)}
          isEnding={isEnding}
        />
      )}

      {showInviteModal && (
        <InviteModal sessionId={sessionId} onClose={() => setShowInviteModal(false)} />
      )}

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{session?.title || 'Session Room'}</h1>


          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>

            {isOwner && !isEnded && (
              <button
                id="invite-members-btn"
                onClick={() => setShowInviteModal(true)}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                📧 Invite Members
              </button>
            )}

            {isOwner && !isEnded && (
              <button
                id="end-session-btn"
                onClick={() => setShowConfirmEnd(true)}
                style={{ padding: '0.75rem 1.5rem', backgroundColor: '#ef4444', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700 }}
              >
                End Session &amp; Pick
              </button>
            )}
          </div>
        </div>

        {/* Submit resturant suggestion */}
        <div style={{ marginBottom: '3rem', padding: '1.5rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Submit a Suggestion</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem' }}>
            <input
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="E.g. Burger King"
              style={{ flex: 1, padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid #d1d5db', fontSize: '1rem' }}
              maxLength={100}
              required
              disabled={isEnded}
            />
            <button
              type="submit"
              disabled={isEnded}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '0.25rem', border: 'none', cursor: 'pointer' }}
            >
              Submit
            </button>
          </form>
        </div>

        {/* Display Restaurants list */}
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Suggestions</h2>
          {restaurants?.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No suggestions yet. Be the first to submit!</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {restaurants?.map((r) => (
                <li key={r.id} style={{ padding: '1rem', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>{r.name}</span>
                  <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Submitted by {r.submittedBy?.name || 'Someone'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
