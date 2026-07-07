import { createClient } from '@supabase/supabase-js'

// This runs on Vercel's server — the service_role key is never sent to the browser
const adminSupabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // Verify the caller is an authenticated owner
  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authErr } = await adminSupabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token' })

  const { data: profile } = await adminSupabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'owner')
    return res.status(403).json({ error: 'Owners only' })

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
