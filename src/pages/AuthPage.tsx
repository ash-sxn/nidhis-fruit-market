
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";

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

  // Auth state listener
  useEffect(() => {
    // Listen for changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        navigate("/");
      }
    });
    // Check existing session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        navigate("/");
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line
  }, [navigate]);

  // Redirect if logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

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
    // Signup with metadata (username)
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
      setPassword(""); // Reset pw field for login
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
      toast({ title: error.message, variant: "destructive" });
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

        <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-4">
          <div>
            <FormLabel>Email</FormLabel>
            <Input
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
            <FormLabel>Password</FormLabel>
            <Input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              name="password"
              type="password"
              placeholder="Password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          {mode === "signup" && (
            <div>
              <FormLabel>Username</FormLabel>
              <Input
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
