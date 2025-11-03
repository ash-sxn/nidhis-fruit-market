
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Eye, EyeOff } from "lucide-react";

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);

  const navigate = useNavigate();
  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [forgotPwEmail, setForgotPwEmail] = useState("");
  const [forgotPwLoading, setForgotPwLoading] = useState(false);

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line
  }, [navigate]);

  const [handledRedirect, setHandledRedirect] = useState(false);

  useEffect(() => {
    if (!session?.user || handledRedirect) return;

    async function routeAfterLogin() {
      try {
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user!.id)

        const isAdmin = !error && !!roles?.some((r) => r.role === 'admin');

        if (isAdmin) {
          let target = '/admin/mfa'
          try {
            const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
            target = aal?.currentLevel === 'aal2' ? '/admin' : '/admin/mfa'
          } catch (err) {
            console.error('Failed to check MFA level after login', err)
            target = '/admin/mfa'
          }
          navigate(target, { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } finally {
        setHandledRedirect(true);
      }
    }

    routeAfterLogin();
  }, [session, handledRedirect, navigate]);

  // Auth
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (!email || !password || !username) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      setLoading(false);
      return;
    }
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username }, emailRedirectTo: redirectUrl },
    });
    setLoading(false);
    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email to confirm your account." });
      setMode("login");
      setPassword("");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      // Make the error message friendlier
      let msg = error.message;
      if (
        msg.toLowerCase().includes("email not confirmed") ||
        msg.toLowerCase().includes("email not confirmed") ||
        msg.toLowerCase().includes("confirmation")
      ) {
        msg = "You need to confirm your email address first. Please check your inbox (or spam).";
      } else if (
        msg.toLowerCase().includes("invalid login credentials") ||
        msg.toLowerCase().includes("invalid credentials")
      ) {
        msg = "Incorrect email or password.";
      }
      toast({ title: msg, variant: "destructive" });
    }
  };

  // Forgot password submit
  const handleForgotPw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPwEmail) {
      toast({ title: "Please enter your email.", variant: "destructive" });
      return;
    }
    setForgotPwLoading(true);
    const redirectUrl = `${window.location.origin}/auth`;
    const { error } = await supabase.auth.resetPasswordForEmail(forgotPwEmail, {
      redirectTo: redirectUrl,
    });
    setForgotPwLoading(false);
    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password reset email sent. Please check your inbox (and spam)." });
      setShowForgotPw(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-saffron/5 to-white px-2">
      <div className="w-full max-w-md bg-white/95 rounded-2xl shadow-xl p-6 md:p-10 border border-saffron/10 space-y-6">
        <h2 className="text-2xl font-bold text-center font-playfair mb-2">
          {mode === "signup" ? "Create account" : "Welcome back"}
        </h2>
        <div className="flex justify-center mb-2 text-neutral-600 gap-3">
          <button
            className={
              "font-medium px-3 pb-1 rounded transition " +
              (mode === "login" ? "text-saffron border-b-2 border-saffron" : "hover:text-saffron")
            }
            onClick={() => setMode("login")}
            disabled={loading}
          >
            Login
          </button>
          <button
            className={
              "font-medium px-3 pb-1 rounded transition " +
              (mode === "signup" ? "text-saffron border-b-2 border-saffron" : "hover:text-saffron")
            }
            onClick={() => setMode("signup")}
            disabled={loading}
          >
            Sign Up
          </button>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPw && (
          <div className="fixed z-50 inset-0 flex items-center justify-center bg-neutral-900/40">
            <div className="bg-white w-full max-w-xs p-6 rounded-xl shadow-lg relative border">
              <button
                onClick={() => setShowForgotPw(false)}
                className="absolute top-2 right-2 text-neutral-500 hover:text-neutral-800"
                aria-label="Close"
              >✕</button>
              <h3 className="text-lg font-semibold mb-2">Forgot password?</h3>
              <form onSubmit={handleForgotPw} className="space-y-3">
                <input
                  type="email"
                  className="border px-3 py-2 rounded w-full"
                  autoComplete="email"
                  placeholder="Your email"
                  value={forgotPwEmail}
                  onChange={(e) => setForgotPwEmail(e.target.value)}
                  required
                  disabled={forgotPwLoading}
                />
                <Button type="submit" className="w-full" disabled={forgotPwLoading}>
                  {forgotPwLoading ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Login/Signup Form */}
        <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium text-neutral-700" htmlFor="email">Email</label>
            <Input
              id="email"
              autoComplete="email"
              name="email"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-neutral-700" htmlFor="password">Password</label>
            <div className="relative">
              <Input
                id="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-2 top-1.5 text-neutral-500 hover:text-saffron transition"
                onClick={() => setShowPassword(p => !p)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{ background: "none", border: "none", padding: 0 }}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {mode === "login" && (
              <div className="text-right mt-1">
                <button
                  type="button"
                  className="text-xs text-saffron hover:underline font-medium"
                  onClick={() => setShowForgotPw(true)}
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>
          {mode === "signup" && (
            <div>
              <label className="block mb-1 font-medium text-neutral-700" htmlFor="username">Username</label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (mode === "login" ? "Logging in..." : "Signing up...") : (mode === "login" ? "Login" : "Sign Up")}
          </Button>
        </form>
        <div className="text-xs text-neutral-500 text-center">
          By continuing, you agree to our <a href="#" className="underline decoration-saffron">Terms</a> and <a href="#" className="underline decoration-saffron">Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
