import '../_lib/env.ts'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticateAdmin } from '../_lib/auth'
import { createShiprocketShipment, isShiprocketConfigured } from '../_lib/shiprocket'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }
  if (!isShiprocketConfigured()) {
    return res.status(503).json({ error: 'Shiprocket not configured' })
  }
  const admin = await authenticateAdmin(req, res)
  if (!admin) return

  const body = typeof req.body === 'object' && req.body ? (req.body as Record<string, unknown>) : {}
  const orderId = typeof body.orderId === 'string' ? body.orderId : undefined
  if (!orderId) {
    return res.status(400).json({ error: 'orderId required' })
  }
  try {
    const result = await createShiprocketShipment(orderId)
    res.status(200).json(result)
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? 'Failed to create shipment' })
  }
}
