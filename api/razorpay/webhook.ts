import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const config = { api: { bodyParser: false } }

function buffer(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    // @ts-ignore
    req.on('data', (c: Buffer) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    // @ts-ignore
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET as string
  if (!secret) return res.status(500).end('Missing webhook secret')

  const raw = await buffer(req)
  const signature = req.headers['x-razorpay-signature'] as string
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex')
  if (signature !== expected) return res.status(400).end('Invalid signature')

  const evt = JSON.parse(raw.toString())
  if (evt?.event === 'payment.captured') {
    const receipt = evt?.payload?.payment?.entity?.notes?.receipt || evt?.payload?.payment?.entity?.order_id
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    if (receipt) {
      await supabase.from('orders').update({ status: 'paid', payment_ref: evt?.payload?.payment?.entity?.id }).eq('id', receipt)
    }
  }
  return res.status(200).end('OK')
}

