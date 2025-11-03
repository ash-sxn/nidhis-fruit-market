
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ImageWithFallback from "@/components/ImageWithFallback";

const AccountPage: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      setEmail(data.session?.user?.email ?? null);
      if (!uid) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", uid)
        .maybeSingle();
      setUsername(profile?.username || "");
      setAvatarUrl(profile?.avatar_url || "");
    });
  }, []);

  const saveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({ id: userId, username, avatar_url: avatarUrl });
    if (error) console.error("Save profile error:", error);
    setSaving(false);
  };

  const onAvatarFile = async (file: File) => {
    if (!userId || !file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      console.error("Upload error:", error);
    } else {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    }
    setUploading(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-5 font-playfair text-saffron">Account Settings</h1>
      <div className="space-y-6">
        {/* Profile info */}
        <section className="p-5 border rounded-md bg-white shadow space-y-4">
          <h2 className="text-xl font-semibold">Profile Information</h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border">
              <ImageWithFallback src={avatarUrl || "/placeholder.svg"} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <label className="text-sm">
              <span className="block mb-1 text-neutral-600">Upload avatar</span>
              <input type="file" accept="image/*" onChange={(e) => e.target.files && onAvatarFile(e.target.files[0])} disabled={!userId || uploading} />
            </label>
          </div>
          <div className="grid gap-3">
            <label className="text-sm text-neutral-600">Email</label>
            <Input value={email ?? ""} disabled />
          </div>
          <div className="grid gap-3">
            <label className="text-sm text-neutral-600">Username</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username" />
          </div>
          <div className="grid gap-3">
            <label className="text-sm text-neutral-600">Or paste Avatar URL</label>
            <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://.../avatar.jpg" />
          </div>
          <div>
            <Button onClick={saveProfile} disabled={!userId || saving}>{saving ? "Saving..." : "Save changes"}</Button>
          </div>
        </section>
        {/* Addresses */}
        <section className="p-5 border rounded-md bg-white shadow">
          <h2 className="text-xl font-semibold mb-2">Saved Addresses</h2>
          <div>Coming soon: Add, edit, delete your shipping addresses.</div>
        </section>
        {/* MFA */}
        <section className="p-5 border rounded-md bg-white shadow">
          <h2 className="text-xl font-semibold mb-2">Multi-Factor Authentication</h2>
          <div>Coming soon: Enable/disable two-factor authentication for added security.</div>
        </section>
        {/* Account Linking */}
        <section className="p-5 border rounded-md bg-white shadow">
          <h2 className="text-xl font-semibold mb-2">Account Linking</h2>
          <div>Coming soon: Link additional emails, phone numbers, or social accounts.</div>
        </section>
        {/* Account Deletion */}
        <section className="p-5 border rounded-md bg-white shadow">
          <h2 className="text-xl font-semibold mb-2 text-red-500">Danger Zone</h2>
          <div>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none"
              disabled
              title="Coming soon"
            >
              Delete My Account
            </button>
            <p className="mt-1 text-sm text-red-400">
              This action is permanently remove your account and data.
            </p>
            <div className="mt-2 text-neutral-500">Coming soon: Account deletion.</div>
          </div>
        </section>
      </div>
    </div>
  );
};
export default AccountPage;
