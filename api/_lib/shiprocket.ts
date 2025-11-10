import './env.js'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD
const SHIPROCKET_BASE_URL = process.env.SHIPROCKET_BASE_URL ?? 'https://apiv2.shiprocket.in'
const SHIPROCKET_PICKUP_LOCATION = process.env.SHIPROCKET_PICKUP_LOCATION
const DEFAULT_WEIGHT = Number(process.env.SHIPROCKET_DEFAULT_WEIGHT ?? '0.5')
const DEFAULT_LENGTH = Number(process.env.SHIPROCKET_DEFAULT_LENGTH ?? '20')
const DEFAULT_BREADTH = Number(process.env.SHIPROCKET_DEFAULT_BREADTH ?? '20')
const DEFAULT_HEIGHT = Number(process.env.SHIPROCKET_DEFAULT_HEIGHT ?? '10')

const SUPABASE_URL = process.env.SUPABASE_URL as string
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase service role configuration missing')
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

type OrderRecord = {
  id: string
  user_id: string
  status: string
  total_cents: number
  currency: string
  payment_method: string | null
  address_snapshot: any
  created_at: string
  shipping_awb: string | null
  shipping_status: string | null
  shipping_provider: string | null
  shipping_tracking_url: string | null
  order_items: {
    product_id: string
    name_snapshot: string
    price_cents_snapshot: number
    quantity: number
  }[]
}

const shiprocketAvailable = Boolean(
  SHIPROCKET_EMAIL &&
  SHIPROCKET_PASSWORD &&
  SHIPROCKET_PICKUP_LOCATION
)

export function isShiprocketConfigured() {
  return shiprocketAvailable
}

async function getShiprocketToken(): Promise<string> {
  if (!shiprocketAvailable) throw new Error('Shiprocket credentials not configured')
  const response = await fetch(`${SHIPROCKET_BASE_URL}/v1/external/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: SHIPROCKET_EMAIL, password: SHIPROCKET_PASSWORD })
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Shiprocket auth failed: ${response.status} ${text}`)
  }
  const data = await response.json()
  if (!data?.token) throw new Error('Shiprocket auth did not return token')
  return data.token as string
}

async function fetchOrder(orderId: string): Promise<OrderRecord> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id,user_id,status,total_cents,currency,payment_method,address_snapshot,created_at,shipping_awb,shipping_status,shipping_provider,shipping_tracking_url,order_items(order_id,product_id,name_snapshot,price_cents_snapshot,quantity)')
    .eq('id', orderId)
    .maybeSingle<OrderRecord>()

  if (error || !data) {
    throw new Error(error?.message ?? 'Order not found')
  }
  return data
}

async function fetchCustomerEmail(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (error) {
      console.warn('Unable to fetch user email for order', userId, error)
      return null
    }
    return data?.user?.email ?? data?.user?.phone ?? null
  } catch (err) {
    console.warn('User email lookup failed', err)
    return null
  }
}

export async function createShiprocketShipment(orderId: string) {
  if (!shiprocketAvailable) {
    throw new Error('Shiprocket not configured')
  }

  const order = await fetchOrder(orderId)
  const isCod = (order.payment_method ?? 'online') === 'cod'
  if (order.status !== 'paid' && !(isCod && order.status === 'pending')) {
    throw new Error('Only paid or COD orders can be manifested with Shiprocket')
  }
  if (order.shipping_awb) {
    return {
      alreadyCreated: true,
      order
    }
  }

  const address = order.address_snapshot || {}
  const email = await fetchCustomerEmail(order.user_id)

  const token = await getShiprocketToken()

  const payload = {
    order_id: order.id,
    order_date: new Date(order.created_at).toISOString().slice(0, 19).replace('T', ' '),
    pickup_location: SHIPROCKET_PICKUP_LOCATION,
    channel_id: '',
    comment: 'Generated via Nidhis store',
    billing_customer_name: address.name ?? 'Customer',
    billing_last_name: '',
    billing_address: (address.line1 ?? '').toString(),
    billing_address_2: (address.line2 ?? '').toString(),
    billing_city: address.city ?? '',
    billing_pincode: address.pincode ?? '',
    billing_state: address.state ?? 'Maharashtra',
    billing_country: 'India',
    billing_email: email ?? 'orders@nidhis.in',
    billing_phone: address.phone ?? '',
    shipping_is_billing: true,
    shipping_customer_name: address.name ?? 'Customer',
    shipping_last_name: '',
    shipping_address: (address.line1 ?? '').toString(),
    shipping_address_2: (address.line2 ?? '').toString(),
    shipping_city: address.city ?? '',
    shipping_pincode: address.pincode ?? '',
    shipping_state: address.state ?? 'Maharashtra',
    shipping_country: 'India',
    shipping_email: email ?? 'orders@nidhis.in',
    shipping_phone: address.phone ?? '',
    payment_method: isCod ? 'COD' : 'Prepaid',
    cod_amount: isCod ? order.total_cents / 100 : 0,
    sub_total: order.total_cents / 100,
    length: DEFAULT_LENGTH,
    breadth: DEFAULT_BREADTH,
    height: DEFAULT_HEIGHT,
    weight: Math.max(DEFAULT_WEIGHT, (order.order_items ?? []).reduce((sum, item) => sum + (DEFAULT_WEIGHT * (item.quantity ?? 1)), 0)),
    order_items: (order.order_items ?? []).map((item) => ({
      name: item.name_snapshot,
      sku: item.product_id,
      units: item.quantity,
      selling_price: item.price_cents_snapshot / 100,
      discount: 0,
      tax: 0,
      hsn: '0813',
      weight: DEFAULT_WEIGHT
    }))
  }

  const response = await fetch(`${SHIPROCKET_BASE_URL}/v1/external/orders/create/adhoc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })

  const text = await response.text()
  let json: any
  try {
    json = JSON.parse(text)
  } catch (err) {
    json = text
  }

  if (!response.ok || !json?.shipment_id) {
    throw new Error(json?.message ?? json?.errors?.join(', ') ?? `Shiprocket error ${response.status}`)
  }

  const update = await supabaseAdmin
    .from('orders')
    .update({
      shipping_provider: json?.courier_name ?? 'Shiprocket',
      shipping_awb: json?.awb_code ?? null,
      shipping_status: 'manifested',
      shipping_tracking_url: json?.tracking_url ?? null,
      shipping_label_url: json?.label_url ?? null,
      shipping_meta: json,
      shipping_synced_at: new Date().toISOString()
    })
    .eq('id', order.id)

  if (update.error) {
    throw new Error(update.error.message)
  }

  return {
    awb: json.awb_code,
    provider: json?.courier_name ?? 'Shiprocket',
    trackingUrl: json?.tracking_url ?? null,
    labelUrl: json?.label_url ?? null,
    response: json
  }
}

export async function syncShiprocketStatus(orderId: string) {
  if (!shiprocketAvailable) throw new Error('Shiprocket not configured')
  const order = await fetchOrder(orderId)
  if (!order.shipping_awb) throw new Error('Order has no AWB yet')
  const token = await getShiprocketToken()
  const response = await fetch(`${SHIPROCKET_BASE_URL}/v1/external/courier/track/awb`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ awb: order.shipping_awb })
  })
  const text = await response.text()
  let json: any
  try {
    json = JSON.parse(text)
  } catch (err) {
    json = text
  }
  if (!response.ok) {
    throw new Error(json?.message ?? `Shiprocket track error ${response.status}`)
  }
  const trackingData = json?.tracking_data ?? {}
  const currentStatus = trackingData?.current_status ?? trackingData?.current_status_code ?? 'in_transit'
  const trackUrl = trackingData?.tracking_url ?? trackingData?.track_url ?? order.shipping_tracking_url

  const update = await supabaseAdmin
    .from('orders')
    .update({
      shipping_status: currentStatus,
      shipping_tracking_url: trackUrl,
      shipping_meta: json,
      shipping_synced_at: new Date().toISOString()
    })
    .eq('id', order.id)

  if (update.error) {
    throw new Error(update.error.message)
  }

  return {
    status: currentStatus,
    trackingUrl: trackUrl,
    raw: json
  }
}
