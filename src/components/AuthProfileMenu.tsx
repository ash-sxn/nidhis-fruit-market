
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const AuthProfileMenu: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ username?: string; avatar_url?: string } | null>(null);
  const [dropdown, setDropdown] = useState(false);
  const navigate = useNavigate();

  // Get current user/session
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile info from "profiles" table; fallback to clean email if username missing
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("username,avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data);
      });
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    navigate("/auth");
  };

  // Clean email fallback: username if set & nonempty, otherwise email part before @
  let displayName = "Profile";
  if (profile?.username && profile.username.trim().length > 0) {
    displayName = profile.username.trim();
  } else if (user?.email) {
    displayName = user.email.split("@")[0];
  }

  if (!user)
    return (
      <Button size="sm" variant="outline" onClick={() => navigate("/auth")}>
        Login
      </Button>
    );

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 text-sm px-2 py-1 rounded-full hover:bg-saffron/10 transition"
        onClick={() => setDropdown((d) => !d)}
        aria-haspopup="true"
        aria-expanded={dropdown}
        aria-label="Account menu"
        id="header-profile-btn"
      >
        <Avatar className="w-8 h-8">
          <AvatarImage src={profile?.avatar_url || ""} alt={displayName} />
          <AvatarFallback>
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium text-saffron">{displayName}</span>
      </button>
      {dropdown && (
        <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-xl z-50 py-2 animate-fade-in">
          <div className="px-4 py-2 text-neutral-700 font-semibold">{displayName}</div>
          <div className="border-t border-neutral-100 my-1" />
          <button className="w-full text-left px-4 py-2 text-sm hover:bg-saffron/10" onClick={handleLogout}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthProfileMenu;
