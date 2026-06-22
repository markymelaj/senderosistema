import { createClient } from '@supabase/supabase-js';

const internalRoles = new Set(['super_admin', 'direction', 'clinical_coordination']);
function send(res, status, payload) { res.status(status).json(payload); }

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Método no permitido' });
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!supabaseUrl || !serviceKey) return send(res, 500, { error: 'Faltan variables de servidor' });
  if (!token) return send(res, 401, { error: 'Sesión requerida' });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: authData } = await admin.auth.getUser(token);
  if (!authData?.user) return send(res, 401, { error: 'Sesión inválida' });
  const { data: caller } = await admin.from('user_profiles').select('role_code, active').eq('id', authData.user.id).single();
  if (!caller?.active || !internalRoles.has(caller.role_code)) return send(res, 403, { error: 'No autorizado' });

  const { user_id, active, password } = req.body || {};
  if (!user_id) return send(res, 400, { error: 'Falta user_id' });

  if (typeof active === 'boolean') {
    const { error } = await admin.from('user_profiles').update({ active }).eq('id', user_id);
    if (error) return send(res, 400, { error: error.message });
  }
  if (password) {
    const { error } = await admin.auth.admin.updateUserById(user_id, { password });
    if (error) return send(res, 400, { error: error.message });
  }
  return send(res, 200, { ok: true });
}
