import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_SECRET = process.env.API_SECRET

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // Check env vars are set
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Server configuration error — environment variables not set in Vercel.' })
  }

  // Verify secret key
  const secret = (req.headers.authorization || '').replace('Bearer ', '').trim()
  if (!API_SECRET || secret !== API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // ── CREATE staff ──────────────────────────────────────────
  if (req.method === 'POST') {
    const { name, email, password, role, permissions } = req.body
    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email and password required' })

    const { data: newUser, error: createErr } = await adminSupabase.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (createErr) return res.status(400).json({ error: createErr.message })

    const { error: profileErr } = await adminSupabase.from('profiles').insert({
      id:          newUser.user.id,
      name,
      email,
      role:        role || 'staff',
      permissions: permissions || [],
    })
    if (profileErr) {
      // Roll back auth user if profile insert failed
      await adminSupabase.auth.admin.deleteUser(newUser.user.id)
      return res.status(500).json({ error: profileErr.message })
    }

    return res.status(200).json({ success: true, id: newUser.user.id })
  }

  // ── UPDATE staff (role, permissions, reset password) ──────
  if (req.method === 'PUT') {
    const { id, name, role, permissions, password } = req.body
    if (!id) return res.status(400).json({ error: 'id required' })

    if (password) {
      await adminSupabase.auth.admin.updateUserById(id, { password })
    }
    const { error: profileErr } = await adminSupabase
      .from('profiles').update({ name, role, permissions }).eq('id', id)
    if (profileErr) return res.status(500).json({ error: profileErr.message })

    return res.status(200).json({ success: true })
  }

  // ── DELETE staff ──────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'id required' })

    const { error: deleteErr } = await adminSupabase.auth.admin.deleteUser(id)
    if (deleteErr) return res.status(500).json({ error: deleteErr.message })

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
