import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { login } from '@/lib/api';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore(s => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(username, password);
      if (result.user.role !== 'admin' && result.user.role !== 'moderator' && result.user.role !== 'superadmin') {
        toast.error('Access denied. Admin credentials required.');
        return;
      }
      setAuth(result.user, result.token);
      sessionStorage.setItem('admin_auth', 'true');
      toast.success(`Welcome to Admin Panel, ${result.user.firstName || result.user.username}!`);
      navigate('/admin');
    } catch (err: any) {
      toast.error(err.message || 'Incorrect admin username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground items-center justify-center p-12 text-background">
        <div className="max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/10 text-xs font-mono tracking-wider">
            <ShieldCheck className="h-4 w-4 text-primary" />
            ADMIN CONSOLE
          </div>
          <h2 className="font-heading text-3xl font-bold text-background leading-tight">
            ShegAddis Management Suite
          </h2>
          <div className="w-12 h-[2px] bg-primary" />
          <p className="text-background/70 text-sm leading-relaxed">
            Real-time analytics, Addis Ababa delivery routing, catalog management, and automated Telegram channel ingestion.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 text-primary">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground mb-1">
              Admin Sign In
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your admin credentials to access the store controls.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="admin-username" className="text-sm font-medium">Admin Username</Label>
              <div className="relative mt-1.5">
                <Input
                  id="admin-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin username"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="admin-pw" className="text-sm font-medium">Password</Label>
              </div>
              <Input
                id="admin-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5"
                autoFocus
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full font-heading font-semibold mt-2"
              size="lg"
              disabled={loading}
            >
              {loading ? 'Authenticating…' : 'Sign In to Dashboard'}
            </Button>
          </form>

          <Link
            to="/"
            className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors mt-6"
          >
            ← Back to Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}

