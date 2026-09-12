import { withSupabase } from 'npm:@supabase/server'

function randomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let pw = ''
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  return pw
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Chỉ hỗ trợ phương thức POST' }, { status: 405 })
    }

    const {
      data: { user },
    } = await ctx.supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }

    const { data: myProfile } = await ctx.supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (myProfile?.role !== 'admin') {
      return Response.json({ error: 'Chỉ admin mới được tạo tài khoản' }, { status: 403 })
    }

    let body: { email?: string; role?: string }
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'Body request không hợp lệ (cần JSON)' }, { status: 400 })
    }

    const email = body.email?.trim().toLowerCase()
    const role = body.role === 'admin' ? 'admin' : 'user'

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Thiếu hoặc sai định dạng email' }, { status: 400 })
    }

    const password = randomPassword()

    const { data: created, error: createError } = await ctx.supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      return Response.json({ error: createError.message }, { status: 400 })
    }

    if (role === 'admin' && created.user) {
      await ctx.supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', created.user.id)
    }

    return Response.json({ email, password, role })
  }),
}
