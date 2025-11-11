import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ImageWithFallback from "@/components/ImageWithFallback";
import { useQuery } from "@tanstack/react-query";
import { formatInrFromCents } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

const DEFAULT_AVATARS = [
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cashew",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Almond",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Pistachio",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Walnut",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Hazelnut",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Apricot"
];

const emptyAddress = {
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  is_default: false
};

const ORDER_PAGE_SIZE = 10;

type AddressRecord = Database['public']['Tables']['addresses']['Row'];
type ProfileLink = Database['public']['Tables']['profile_links']['Row'];

type AccountOrderItem = {
  name_snapshot: string;
  quantity: number;
  price_cents_snapshot: number;
  variant_label: string | null;
  variant_grams: number | null;
};

type AccountOrder = {
  id: string;
  order_number?: string;
  status: string;
  created_at: string;
  total_cents: number;
  shipping_cents: number | null;
  discount_cents: number | null;
  subtotal_cents: number | null;
  coupon_snapshot: { code?: string } | null;
  shipping_tracking_url: string | null;
  payment_method: string | null;
  order_items: AccountOrderItem[];
};

const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [addressForm, setAddressForm] = useState({ ...emptyAddress });
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressSaving, setAddressSaving] = useState(false);

  const [linkForm, setLinkForm] = useState({ label: "", url: "" });
  const [linkSaving, setLinkSaving] = useState(false);

  const [orderPage, setOrderPage] = useState(1);

  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [pendingMfaFactorId, setPendingMfaFactorId] = useState<string | null>(null);
  const [mfaOtp, setMfaOtp] = useState("");
  const [mfaQrUri, setMfaQrUri] = useState<string | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);

  const [deletingAccount, setDeletingAccount] = useState(false);

  const { data: orders = [], isLoading: ordersLoading } = useQuery<AccountOrder[]>({
    queryKey: ['account-orders', userId],
    enabled: !!userId,
    queryFn: async (): Promise<AccountOrder[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id,order_number,status,total_cents,subtotal_cents,discount_cents,shipping_cents,coupon_snapshot,created_at,shipping_tracking_url,payment_method,order_items(name_snapshot,quantity,price_cents_snapshot,variant_label,variant_grams)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AccountOrder[];
    }
  });

  const { data: addresses = [], isLoading: addressesLoading, refetch: refetchAddresses } = useQuery<AddressRecord[]>({
    queryKey: ['account-addresses', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [] as Database['public']['Tables']['addresses']['Row'][];
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
  });

  const { data: links = [], isLoading: linksLoading, refetch: refetchLinks } = useQuery<ProfileLink[]>({
    queryKey: ['profile-links', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [] as Database['public']['Tables']['profile_links']['Row'][];
      const { data, error } = await supabase
        .from('profile_links')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      setEmail(data.session?.user?.email ?? data.session?.user?.phone ?? null);
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

  useEffect(() => {
    if (!userId) return;
    supabase.auth.mfa.listFactors().then((result) => {
      const totp = result.data?.totp?.find((factor) => factor.status === 'verified');
      setMfaFactorId(totp?.id ?? null);
    }).catch((err) => console.error('Failed to load MFA factors', err));
  }, [userId]);

  const saveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({ id: userId, username, avatar_url: avatarUrl });
    setSaving(false);
    if (error) {
      toast({ title: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated' });
    }
  };

  const onAvatarFile = async (file: File) => {
    if (!userId || !file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const tempUrl = URL.createObjectURL(file);
    setAvatarUrl(tempUrl);
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: error.message, variant: 'destructive' });
    } else {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    }
    URL.revokeObjectURL(tempUrl);
    setUploading(false);
  };

  const resetAddressForm = () => {
    setAddressForm({ ...emptyAddress });
    setEditingAddressId(null);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!addressForm.name || !addressForm.phone || !addressForm.line1 || !addressForm.city || !addressForm.state || !addressForm.pincode) {
      toast({ title: 'Fill all required address fields', variant: 'destructive' });
      return;
    }
    setAddressSaving(true);
    try {
      if (addressForm.is_default) {
        await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId);
      }
      const payload = {
        name: addressForm.name,
        phone: addressForm.phone,
        line1: addressForm.line1,
        line2: addressForm.line2 || null,
        city: addressForm.city,
        state: addressForm.state,
        pincode: addressForm.pincode,
        is_default: addressForm.is_default,
        user_id: userId
      };
      if (editingAddressId) {
        const { error } = await supabase.from('addresses').update(payload).eq('id', editingAddressId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('addresses').insert(payload);
        if (error) throw error;
      }
      toast({ title: 'Address saved' });
      resetAddressForm();
      refetchAddresses();
    } catch (err: any) {
      toast({ title: 'Failed to save address', description: err?.message ?? 'Try again later', variant: 'destructive' });
    } finally {
      setAddressSaving(false);
    }
  };

  const handleEditAddress = (record: AddressRecord) => {
    setEditingAddressId(record.id);
    setAddressForm({
      name: record.name,
      phone: record.phone,
      line1: record.line1,
      line2: record.line2 ?? '',
      city: record.city,
      state: record.state,
      pincode: record.pincode,
      is_default: record.is_default
    });
  };

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('Remove this address?')) return;
    await supabase.from('addresses').delete().eq('id', id);
    if (editingAddressId === id) resetAddressForm();
    refetchAddresses();
  };

  const handleSetDefaultAddress = async (id: string) => {
    if (!userId) return;
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId);
    await supabase.from('addresses').update({ is_default: true }).eq('id', id);
    refetchAddresses();
  };

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!linkForm.label || !linkForm.url) {
      toast({ title: 'Label and URL required', variant: 'destructive' });
      return;
    }
    setLinkSaving(true);
    const { error } = await supabase.from('profile_links').insert({
      user_id: userId,
      label: linkForm.label,
      url: linkForm.url
    });
    setLinkSaving(false);
    if (error) {
      toast({ title: error.message, variant: 'destructive' });
      return;
    }
    setLinkForm({ label: '', url: '' });
    refetchLinks();
  };

  const handleDeleteLink = async (id: string) => {
    await supabase.from('profile_links').delete().eq('id', id);
    refetchLinks();
  };

  const handleStartMfa = async () => {
    setMfaLoading(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    setMfaLoading(false);
    if (error) {
      toast({ title: error.message, variant: 'destructive' });
      return;
    }
    setPendingMfaFactorId(data.id);
    setMfaQrUri(data.totp?.uri ?? null);
    setMfaOtp('');
  };

  const handleVerifyMfa = async () => {
    const factorId = pendingMfaFactorId || mfaFactorId;
    if (!factorId) {
      toast({ title: 'Start MFA enrollment first', variant: 'destructive' });
      return;
    }
    if (!mfaOtp.trim()) {
      toast({ title: 'Enter the OTP from your authenticator', variant: 'destructive' });
      return;
    }
    setMfaLoading(true);
    const { error } = await supabase.auth.mfa.verify({ factorId, code: mfaOtp.trim() });
    setMfaLoading(false);
    if (error) {
      toast({ title: error.message, variant: 'destructive' });
      return;
    }
    setMfaFactorId(factorId);
    setPendingMfaFactorId(null);
    setMfaQrUri(null);
    setMfaOtp('');
    toast({ title: 'Authenticator enabled' });
  };

  const handleDisableMfa = async () => {
    if (!mfaFactorId) return;
    setMfaLoading(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId });
    setMfaLoading(false);
    if (error) {
      toast({ title: error.message, variant: 'destructive' });
      return;
    }
    setMfaFactorId(null);
    toast({ title: 'Two-factor disabled' });
  };

  const handleDownloadInvoice = async (orderId: string) => {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) {
      toast({ title: 'Please log in to download invoices', variant: 'destructive' });
      return;
    }
    const resp = await fetch(`/api/orders/invoice?orderId=${orderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!resp.ok) {
      toast({ title: 'Unable to download invoice', variant: 'destructive' });
      return;
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice-${orderId}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account and all related data? This cannot be undone.')) return;
    setDeletingAccount(true);
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const resp = await fetch('/api/account/delete', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token ?? ''}`,
      }
    });
    setDeletingAccount(false);
    if (!resp.ok) {
      const payload = await resp.json().catch(() => ({}));
      toast({ title: 'Failed to delete account', description: payload?.error ?? 'Try again later', variant: 'destructive' });
      return;
    }
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  useEffect(() => {
    if (orders.length === 0) {
      setOrderPage(1);
    } else {
      const maxPage = Math.max(1, Math.ceil(orders.length / ORDER_PAGE_SIZE));
      if (orderPage > maxPage) setOrderPage(maxPage);
    }
  }, [orders, orderPage]);

  const pagedOrders = useMemo(() => {
    const start = (orderPage - 1) * ORDER_PAGE_SIZE;
    return orders.slice(start, start + ORDER_PAGE_SIZE);
  }, [orders, orderPage]);

  const totalOrderPages = Math.max(1, Math.ceil(orders.length / ORDER_PAGE_SIZE));

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-3xl font-bold mb-5 font-playfair text-saffron">Account Settings</h1>
      <section className="p-5 border rounded-md bg-white shadow space-y-4">
        <h2 className="text-xl font-semibold">Profile Information</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-full overflow-hidden border bg-neutral-100">
            <ImageWithFallback src={avatarUrl || DEFAULT_AVATARS[0]} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <label className="text-sm">
            <span className="block mb-1 text-neutral-600">Upload avatar</span>
            <input type="file" accept="image/*" onChange={(e) => e.target.files && onAvatarFile(e.target.files[0])} disabled={!userId || uploading} />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_AVATARS.map((url) => (
            <button
              type="button"
              key={url}
              onClick={() => setAvatarUrl(url)}
              className={`w-12 h-12 rounded-full border ${avatarUrl === url ? 'border-saffron' : 'border-transparent'}`}
            >
              <img src={url} alt="avatar option" className="w-full h-full rounded-full" />
            </button>
          ))}
        </div>
        <div className="grid gap-3">
          <label className="text-sm text-neutral-600">Email / Phone</label>
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
          <Button onClick={saveProfile} disabled={!userId || saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
        </div>
      </section>

      <section className="p-5 border rounded-md bg-white shadow space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Saved Addresses</h2>
          {editingAddressId && (
            <button className="text-sm text-saffron" onClick={resetAddressForm}>Cancel edit</button>
          )}
        </div>
        <form onSubmit={handleSaveAddress} className="grid md:grid-cols-2 gap-3">
          <Input placeholder="Full name" value={addressForm.name} onChange={(e) => setAddressForm((s) => ({ ...s, name: e.target.value }))} />
          <Input placeholder="Phone" value={addressForm.phone} onChange={(e) => setAddressForm((s) => ({ ...s, phone: e.target.value }))} />
          <Input placeholder="Address line 1" className="md:col-span-2" value={addressForm.line1} onChange={(e) => setAddressForm((s) => ({ ...s, line1: e.target.value }))} />
          <Input placeholder="Address line 2" className="md:col-span-2" value={addressForm.line2} onChange={(e) => setAddressForm((s) => ({ ...s, line2: e.target.value }))} />
          <Input placeholder="City" value={addressForm.city} onChange={(e) => setAddressForm((s) => ({ ...s, city: e.target.value }))} />
          <Input placeholder="State" value={addressForm.state} onChange={(e) => setAddressForm((s) => ({ ...s, state: e.target.value }))} />
          <Input placeholder="Pincode" value={addressForm.pincode} onChange={(e) => setAddressForm((s) => ({ ...s, pincode: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={addressForm.is_default} onChange={(e) => setAddressForm((s) => ({ ...s, is_default: e.target.checked }))} />
            Set as default
          </label>
          <Button type="submit" disabled={addressSaving}>{addressSaving ? 'Saving...' : editingAddressId ? 'Update address' : 'Add address'}</Button>
        </form>
        <div className="space-y-3">
          {addressesLoading ? (
            <div className="text-sm text-neutral-500">Loading addresses…</div>
          ) : addresses.length === 0 ? (
            <div className="text-sm text-neutral-500">No saved addresses yet.</div>
          ) : (
            addresses.map((address) => (
              <div key={address.id} className="border rounded-md p-3 text-sm flex flex-col gap-1 bg-neutral-50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{address.name}</span>
                  {address.is_default && <span className="text-xs text-emerald-600">Default</span>}
                </div>
                <div>{address.line1}</div>
                {address.line2 && <div>{address.line2}</div>}
                <div>{address.city}, {address.state} - {address.pincode}</div>
                <div>📞 {address.phone}</div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Button type="button" variant="outline" size="sm" onClick={() => handleEditAddress(address)}>Edit</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleDeleteAddress(address.id)}>
                    <Trash2 className="w-4 h-4 mr-1" />Remove
                  </Button>
                  {!address.is_default && (
                    <Button type="button" variant="outline" size="sm" onClick={() => handleSetDefaultAddress(address.id)}>
                      Make default
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="p-5 border rounded-md bg-white shadow space-y-4">
        <h2 className="text-xl font-semibold">Account Security (MFA)</h2>
        {mfaFactorId ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Authenticator app is enabled for this account.</p>
            </div>
            <Button variant="outline" onClick={handleDisableMfa} disabled={mfaLoading}>
              {mfaLoading ? 'Please wait…' : 'Disable MFA'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-neutral-600">Add an extra layer of security with an authenticator app.</p>
            {!mfaQrUri ? (
              <Button onClick={handleStartMfa} disabled={mfaLoading}>{mfaLoading ? 'Preparing…' : 'Enable authenticator app'}</Button>
            ) : (
              <div className="space-y-2">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(mfaQrUri)}&size=180x180`} alt="MFA QR" className="border rounded" />
                <Input placeholder="Enter 6-digit code" value={mfaOtp} onChange={(e) => setMfaOtp(e.target.value)} maxLength={6} />
                <Button onClick={handleVerifyMfa} disabled={mfaLoading}>{mfaLoading ? 'Verifying…' : 'Verify code'}</Button>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="p-5 border rounded-md bg-white shadow space-y-4">
        <h2 className="text-xl font-semibold">Linked Contacts</h2>
        <form onSubmit={handleSaveLink} className="grid md:grid-cols-2 gap-3">
          <Input placeholder="Label (e.g. Instagram, Alt email)" value={linkForm.label} onChange={(e) => setLinkForm((s) => ({ ...s, label: e.target.value }))} />
          <Input placeholder="URL or handle" value={linkForm.url} onChange={(e) => setLinkForm((s) => ({ ...s, url: e.target.value }))} />
          <Button type="submit" disabled={linkSaving}>{linkSaving ? 'Saving…' : 'Add link'}</Button>
        </form>
        <div className="space-y-2">
          {linksLoading ? (
            <div className="text-sm text-neutral-500">Loading…</div>
          ) : links.length === 0 ? (
            <div className="text-sm text-neutral-500">No linked contacts yet.</div>
          ) : (
            links.map((link) => (
              <div key={link.id} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                <div>
                  <div className="font-semibold">{link.label}</div>
                  <a href={link.url} target="_blank" rel="noreferrer" className="text-saffron underline break-all">{link.url}</a>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteLink(link.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
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
          <>
            <ul className="space-y-4">
              {pagedOrders.map((order) => {
                const placedAt = new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                const subtotal = order.subtotal_cents ?? order.total_cents
                const discount = order.discount_cents ?? 0
                const shipping = order.shipping_cents ?? 0
                return (
                  <li key={order.id} className="border rounded-lg p-4 bg-neutral-50">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-neutral-800">Order {order.order_number ?? order.id}</div>
                        <div className="text-xs text-neutral-500">Placed {placedAt}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-neutral-500">Status</div>
                        <div className="text-sm font-semibold text-neutral-700 capitalize">{order.status}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-neutral-600 space-y-1">
                      <div>Subtotal: {formatInrFromCents(subtotal)}</div>
                      {discount > 0 && <div>Discount: -{formatInrFromCents(discount)} {order.coupon_snapshot?.code ? `(${order.coupon_snapshot.code})` : ''}</div>}
                      <div>Shipping: {formatInrFromCents(shipping)}</div>
                      <div>Payment: {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online (Razorpay)'}</div>
                      <div className="font-semibold text-neutral-800">Total due: {formatInrFromCents(order.total_cents)}</div>
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
                    <div className="flex flex-wrap gap-2 mt-3 text-sm">
                      <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/order/${order.id}/confirmation`)}>
                        View details
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleDownloadInvoice(order.id)}>
                        Download invoice
                      </Button>
                      {order.shipping_tracking_url && (
                        <Button type="button" variant="outline" size="sm" asChild>
                          <a href={order.shipping_tracking_url} target="_blank" rel="noreferrer">Track shipment</a>
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
            {totalOrderPages > 1 && (
              <div className="flex items-center justify-between text-sm mt-4">
                <span>Page {orderPage} of {totalOrderPages}</span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={orderPage === 1} onClick={() => setOrderPage((p) => Math.max(1, p - 1))}>Previous</Button>
                  <Button type="button" variant="outline" size="sm" disabled={orderPage === totalOrderPages} onClick={() => setOrderPage((p) => Math.min(totalOrderPages, p + 1))}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <section className="p-5 border rounded-md bg-white shadow space-y-3">
        <h2 className="text-xl font-semibold text-red-500">Danger Zone</h2>
        <p className="text-sm text-neutral-600">Delete your account and remove all personal data from NidhiS. Orders already fulfilled may remain in our accounting records, but your profile and saved information will be removed.</p>
        <Button variant="destructive" onClick={handleDeleteAccount} disabled={deletingAccount}>
          {deletingAccount ? 'Deleting…' : 'Delete my account'}
        </Button>
      </section>
    </div>
  );
};

export default AccountPage;
