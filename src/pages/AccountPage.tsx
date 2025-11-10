
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ImageWithFallback from "@/components/ImageWithFallback";
import { useQuery } from "@tanstack/react-query";
import { formatInrFromCents } from "@/lib/utils";

type AccountOrderItem = { name_snapshot: string; quantity: number; price_cents_snapshot: number; variant_label: string | null; variant_grams: number | null }
type AccountOrder = {
  id: string
  status: string
  created_at: string
  total_cents: number
  shipping_cents: number | null
  discount_cents: number | null
  subtotal_cents: number | null
  coupon_snapshot: { code?: string } | null
  shipping_tracking_url: string | null
  payment_method: string | null
  order_items: AccountOrderItem[]
}

const AccountPage: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['account-orders', userId],
    enabled: !!userId,
    queryFn: async (): Promise<AccountOrder[]> => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('orders')
        .select('id,status,total_cents,subtotal_cents,discount_cents,shipping_cents,coupon_snapshot,created_at,shipping_tracking_url,payment_method,order_items(name_snapshot,quantity,price_cents_snapshot,variant_label,variant_grams)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as AccountOrder[]
    }
  })

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
        <section className="p-5 border rounded-md bg-white shadow space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Order History</h2>
            <span className="text-sm text-neutral-500">{orders.length} order{orders.length === 1 ? '' : 's'}</span>
          </div>
          {ordersLoading ? (
            <div className="text-neutral-500 text-sm">Loading your orders…</div>
          ) : orders.length === 0 ? (
            <div className="text-neutral-500 text-sm">No orders yet. Browse the store and place your first order!</div>
          ) : (
            <ul className="space-y-4">
              {orders.map((order) => {
                const placedAt = new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                const subtotal = order.subtotal_cents ?? order.total_cents
                const discount = order.discount_cents ?? 0
                const shipping = order.shipping_cents ?? 0
                return (
                  <li key={order.id} className="border rounded-lg p-4 bg-neutral-50">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-neutral-800">Order {order.id}</div>
                        <div className="text-xs text-neutral-500">Placed {placedAt}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-neutral-500">Status</div>
                        <div className="text-sm font-semibold text-neutral-700">{order.status}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-neutral-600 space-y-1">
                      <div>Subtotal: {formatInrFromCents(subtotal)}</div>
                      {discount > 0 && <div>Discount: -{formatInrFromCents(discount)} {order.coupon_snapshot?.code ? `(${order.coupon_snapshot.code})` : ''}</div>}
                      <div>Shipping: {formatInrFromCents(shipping)}</div>
                      <div>Payment method: {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online'}</div>
                      <div className="font-semibold text-neutral-800">Total paid: {formatInrFromCents(order.total_cents)}</div>
                    </div>
                    <div className="mt-3">
                      <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Items</h3>
                      <ul className="space-y-1 text-sm text-neutral-700">
                        {order.order_items?.map((item, idx) => {
                          const label = item.variant_label ? `${item.name_snapshot} (${item.variant_label})` : item.name_snapshot
                          return (
                            <li key={`${item.name_snapshot}-${idx}`} className="flex justify-between">
                              <span>{label} × {item.quantity}</span>
                              <span>{formatInrFromCents((item.price_cents_snapshot ?? 0) * (item.quantity ?? 0))}</span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                    {order.shipping_tracking_url && (
                      <div className="mt-3 text-sm">
                        Track shipment: <a href={order.shipping_tracking_url} className="text-green underline" target="_blank" rel="noreferrer">{order.shipping_tracking_url}</a>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
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
