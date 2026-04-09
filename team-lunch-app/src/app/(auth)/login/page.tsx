'use client';

export default function LoginPage() {
  const handleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/google`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f9fafb' }}>
      <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#111827' }}>Welcome to TeamLunch</h1>
        <p style={{ color: '#4b5563', marginBottom: '24px' }}>Sign in to pick a lunch spot with your team.</p>
        <button 
          onClick={handleLogin}
          style={{
            backgroundColor: '#4285F4',
            color: 'white',
            padding: '10px 24px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
