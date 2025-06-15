
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const AuthProfileMenu: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ username?: string; avatar_url?: string } | null>(null);
  const [dropdown, setDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Get current user/session
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state change:", { event: _event, user: session?.user });
      setUser(session?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      console.log("Initial session:", { user: data.session?.user });
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile info from "profiles" table
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    
    const fetchProfile = async () => {
      try {
        console.log("Fetching profile for user:", user.id);
        const { data, error } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        
        if (error) {
          console.error("Error fetching profile:", error);
        }
        
        console.log("Profile data:", data);
        setProfile(data);
      } catch (error) {
        console.error("Error in fetchProfile:", error);
      }
    };
    
    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    navigate("/auth");
  };

  // Determine display name: username or email prefix, never full email
  let displayName: string = "Profile";
  if (profile?.username && profile.username.trim().length > 0) {
    displayName = profile.username.trim();
    console.log("Using username:", displayName);
  } else if (user?.email) {
    // Extract only the part before @ symbol
    const emailPrefix = user.email.split("@")[0];
    displayName = emailPrefix;
    console.log("Using email prefix:", displayName, "from email:", user.email);
  }

  // Avatar fallback character
  const fallbackChar = displayName && displayName.length > 0
    ? displayName.charAt(0).toUpperCase()
    : "U";

  console.log("Final display values:", { displayName, fallbackChar, userEmail: user?.email });

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
        <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  // If not logged in
  if (!user) {
    return (
      <Button size="sm" variant="outline" onClick={() => navigate("/auth")}>
        Login
      </Button>
    );
  }

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
          <AvatarFallback className="bg-saffron/20 text-saffron font-medium">
            {fallbackChar}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium text-saffron">{displayName}</span>
      </button>
      {dropdown && (
        <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-xl z-50 py-2 animate-fade-in">
          <div className="px-4 py-2 text-neutral-700 font-semibold">{displayName}</div>
          <div className="border-t border-neutral-100 my-1" />
          <button 
            className="w-full text-left px-4 py-2 text-sm hover:bg-saffron/10" 
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthProfileMenu;
