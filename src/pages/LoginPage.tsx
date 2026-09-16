import { useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { User, Lock, ArrowRight, ShieldCheck, UserCheck, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { login, register } from '@/lib/api';
import { toast } from 'sonner';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const redirectUrl = searchParams.get('redirect') || (location.state as any)?.from || '';
  const isFromCheckout = redirectUrl === '/checkout' || redirectUrl.includes('/checkout');

  const [isRegister, setIsRegister] = useState(searchParams.get('register') === 'true');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername) {
      toast.error('Please enter a username');
      return;
    }

    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    if (isRegister && !fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    setLoading(true);
    try {
      const result = isRegister
        ? await register({
            fullName: fullName.trim(),
            username: cleanUsername,
            password,
          })
        : await login(cleanUsername, password);

      setAuth(result.user, result.token);
      toast.success(`Welcome, ${result.user.firstName || result.user.fullName || result.user.username}!`);
      
      // If there's a redirect specified (such as /checkout), navigate there directly
      if (redirectUrl) {
        navigate(redirectUrl, { replace: true });
      } else if (result.user.role === 'admin' || result.user.role === 'superadmin' || result.user.role === 'moderator') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      toast.error(err.message || (isRegister ? 'Registration failed' : 'Incorrect username or password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="font-heading text-2xl font-bold tracking-tight">
            Sheg<span className="text-primary">Addis</span>
          </Link>
          <h1 className="font-heading text-2xl font-bold mt-4 mb-1">
            {isRegister ? 'Create an Account' : 'Welcome Back'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isRegister
              ? 'Register with your name, unique username, and password'
              : 'Sign in with your username and password'}
          </p>
        </div>

        {/* Informative banner if redirected from checkout */}
        {isFromCheckout && (
          <div className="mb-5 flex items-center gap-3 p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-foreground text-xs leading-relaxed">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 text-primary">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Sign in to complete your order</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                Your cart items are saved. Once logged in, you'll be returned immediately to complete your order.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          {isRegister && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Full Name</Label>
              <div className="relative mt-1.5">
                <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter your full name"
                  className="pl-9 h-11 rounded-lg"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={isRegister}
                  autoFocus={isRegister}
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Username {isRegister && <span className="text-xs font-normal lowercase text-muted-foreground/80">(unique)</span>}
              </Label>
            </div>
            <div className="relative mt-1.5">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isRegister ? 'Choose a username' : 'Enter your username'}
                className="pl-9 h-11 rounded-lg lowercase"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                required
                autoFocus={!isRegister}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="••••••••"
                className="pl-9 h-11 rounded-lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full gradient-primary text-primary-foreground font-heading font-semibold h-11 text-base mt-2"
            disabled={loading}
          >
            {loading ? 'Please wait...' : isRegister ? (isFromCheckout ? 'Register & Complete Order' : 'Create Account') : (isFromCheckout ? 'Sign In & Complete Order' : 'Sign In')}
            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-primary font-medium hover:underline ml-1"
          >
            {isRegister ? 'Sign In' : 'Create Account'}
          </button>
        </p>
      </div>
    </div>
  );
}
