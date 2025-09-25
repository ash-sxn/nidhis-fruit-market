import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { amount, currency = 'INR', receipt } = (req.body || {}) as { amount: number; currency?: string; receipt: string }
  if (!amount || !receipt) return res.status(400).json({ error: 'amount and receipt required' })

  const keyId = process.env.RAZORPAY_KEY_ID as string
  const keySecret = process.env.RAZORPAY_KEY_SECRET as string
  if (!keyId || !keySecret) return res.status(500).json({ error: 'Razorpay env not configured' })

  const basic = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
  const resp = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, currency, receipt })
  })
  const data = await resp.json()
  if (!resp.ok) return res.status(resp.status).json(data)
  return res.status(200).json({ orderId: data.id, keyId })
}

