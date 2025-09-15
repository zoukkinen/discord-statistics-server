import { Component, createSignal, onMount } from 'solid-js';

interface AdminAuthProps {
  onAuthenticated: () => void;
}

const AdminAuth: Component<AdminAuthProps> = (props) => {
  const [password, setPassword] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal('');

  // Check if already authenticated on mount
  onMount(async () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        const response = await fetch('/api/admin/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();
        if (result.valid) {
          props.onAuthenticated();
        } else {
          localStorage.removeItem('adminToken');
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        localStorage.removeItem('adminToken');
      }
    }
  });

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    console.log('Form submitted, password:', password());
    setIsLoading(true);
    setError('');

    try {
      console.log('Making API request to /api/admin/auth');
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: password() }),
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);
      
      if (result.success) {
        console.log('Authentication successful, storing token');
        localStorage.setItem('adminToken', result.token);
        props.onAuthenticated();
      } else {
        console.log('Authentication failed:', result.message);
        setError(result.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError('Failed to authenticate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div class="admin-auth-container">
      <div class="admin-auth-card">
        <h1>🔐 Admin Access</h1>
        <p>Enter the admin password to access the panel</p>
        
        <form onSubmit={handleSubmit}>
          <div class="form-group">
            <label for="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              placeholder="Enter admin password"
              disabled={isLoading()}
              required
            />
          </div>
          
          {error() && (
            <div class="error-message">
              ❌ {error()}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={isLoading() || !password().trim()}
            class="auth-button"
          >
            {isLoading() ? '🔄 Authenticating...' : '🚀 Access Admin Panel'}
          </button>
        </form>
        
        <div class="auth-help">
          <p>💡 The admin password is configured in your environment variables</p>
          <p>Default password: <code>admin123</code></p>
        </div>
      </div>
    </div>
  );
};

export default AdminAuth;
