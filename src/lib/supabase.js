import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

/* ── Transform helpers: DB snake_case ↔ app camelCase ── */

export const jobToDb = (j) => ({
  id:           j.id,
  job_number:   j.jobNumber,
  client_id:    j.clientId || null,
  title:        j.title,
  description:  j.description || '',
  status:       j.status || 'Booked In',
  priority:     j.priority || 'Standard',
  assigned_to:  Array.isArray(j.assignedTo) ? j.assignedTo : j.assignedTo ? [j.assignedTo] : [],
  labor_hours:  Number(j.laborHours) || 0,
  labor_rate:   Number(j.laborRate) || 95,
  parts_used:   j.partsUsed || [],
  time_entries: j.timeEntries || [],
  created_at:   j.createdAt || new Date().toISOString(),
  completed_at: j.completedAt || null,
})

export const dbToJob = (r) => ({
  id:          r.id,
  jobNumber:   r.job_number,
  clientId:    r.client_id,
  title:       r.title,
  description: r.description,
  status:      r.status,
  priority:    r.priority,
  assignedTo:  r.assigned_to || [],
  laborHours:  r.labor_hours,
  laborRate:   r.labor_rate,
  partsUsed:   r.parts_used || [],
  timeEntries: r.time_entries || [],
  createdAt:   r.created_at,
  completedAt: r.completed_at,
})

export const partToDb = (p) => ({
  id:            p.id,
  name:          p.name,
  sku:           p.sku || '',
  cost:          Number(p.cost) || 0,
  qty:           Number(p.qty) || 0,
  reorder_at:    Number(p.reorderAt) || 0,
  supplier:      p.supplier || '',
  category:      p.category || 'Other',
  units_per_box: Number(p.unitsPerBox) || 1,
  unit_name:     p.unitName || '',
})

export const dbToPart = (r) => ({
  id:          r.id,
  name:        r.name,
  sku:         r.sku,
  cost:        r.cost,
  qty:         r.qty,
  reorderAt:   r.reorder_at,
  supplier:    r.supplier,
  category:    r.category,
  unitsPerBox: r.units_per_box || 1,
  unitName:    r.unit_name || '',
  createdAt:   r.created_at,
})

export const clientToDb = (c) => ({
  id:      c.id,
  name:    c.name,
  phone:   c.phone || '',
  email:   c.email || '',
  address: c.address || '',
  notes:   c.notes || '',
  created_at: c.createdAt || new Date().toISOString(),
})

export const dbToClient = (r) => ({
  id:        r.id,
  name:      r.name,
  phone:     r.phone,
  email:     r.email,
  address:   r.address,
  notes:     r.notes,
  createdAt: r.created_at,
})

/* ── Data loaders ── */

export async function fetchAll() {
  const [jobs, parts, clients] = await Promise.all([
    supabase.from('jobs').select('*').then(r => (r.data || []).map(dbToJob)),
    supabase.from('parts').select('*').then(r => (r.data || []).map(dbToPart)),
    supabase.from('clients').select('*').then(r => (r.data || []).map(dbToClient)),
  ])
  return { jobs, parts, clients }
}

export async function fetchProfiles() {
  const { data } = await supabase.from('profiles').select('id, name, email, role, permissions, created_at')
  return data || []
}

export async function fetchCompany() {
  const { data } = await supabase.from('company_settings').select('*').eq('id', 1).single()
  return data || {}
}

export async function saveCompanyToDB(settings) {
  await supabase.from('company_settings').upsert({ id: 1, ...settings })
}

/* ── Diff-based sync helpers ── */

export function diffAndSyncJobs(prev, next) {
  const prevMap = new Map(prev.map(j => [j.id, JSON.stringify(j)]))
  const nextIds = new Set(next.map(j => j.id))
  const deleted = prev.filter(j => !nextIds.has(j.id)).map(j => j.id)
  const upserted = next.filter(j => prevMap.get(j.id) !== JSON.stringify(j))
  return { deleted, upserted: upserted.map(jobToDb) }
}

export function diffAndSyncParts(prev, next) {
  const prevMap = new Map(prev.map(p => [p.id, JSON.stringify(p)]))
  const nextIds = new Set(next.map(p => p.id))
  const deleted = prev.filter(p => !nextIds.has(p.id)).map(p => p.id)
  const upserted = next.filter(p => prevMap.get(p.id) !== JSON.stringify(p))
  return { deleted, upserted: upserted.map(partToDb) }
}

export function diffAndSyncClients(prev, next) {
  const prevMap = new Map(prev.map(c => [c.id, JSON.stringify(c)]))
  const nextIds = new Set(next.map(c => c.id))
  const deleted = prev.filter(c => !nextIds.has(c.id)).map(c => c.id)
  const upserted = next.filter(c => prevMap.get(c.id) !== JSON.stringify(c))
  return { deleted, upserted: upserted.map(clientToDb) }
}

export async function applySync(table, { deleted, upserted }) {
  if (deleted.length) await supabase.from(table).delete().in('id', deleted)
  if (upserted.length) await supabase.from(table).upsert(upserted)
}
