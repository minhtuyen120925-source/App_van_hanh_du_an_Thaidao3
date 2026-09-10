import { withSupabase } from 'npm:@supabase/server'

const GEMINI_MODEL = 'gemini-3.6-flash'

async function fetchProjectContext(supabase: any) {
  const [contracts, workItems, payments, adjustments, timeline, handovers, documents] =
    await Promise.all([
      supabase.from('contracts').select('*'),
      supabase.from('work_items').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('contract_adjustments').select('*'),
      supabase.from('timeline').select('*'),
      supabase.from('handovers').select('*'),
      supabase.from('documents').select('*'),
    ])

  return {
    contracts: contracts.data,
    work_items: workItems.data,
    payments: payments.data,
    contract_adjustments: adjustments.data,
    timeline: timeline.data,
    handovers: handovers.data,
    documents: documents.data,
  }
}

export default {
  fetch: withSupabase({ auth: 'publishable' }, async (req, ctx) => {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Chỉ hỗ trợ phương thức POST' }, { status: 405 })
    }

    let body: { question?: string }
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'Body request không hợp lệ (cần JSON)' }, { status: 400 })
    }

    const question = body.question?.trim()
    if (!question) {
      return Response.json({ error: 'Thiếu câu hỏi (question)' }, { status: 400 })
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      return Response.json({ error: 'Server chưa cấu hình GEMINI_API_KEY' }, { status: 500 })
    }

    const context = await fetchProjectContext(ctx.supabase)

    const prompt = `Bạn là trợ lý AI của dự án xây dựng "Thái Đảo 3". Trả lời câu hỏi của người dùng CHỈ dựa trên dữ liệu JSON dưới đây, bằng tiếng Việt, ngắn gọn, rõ ràng, có số liệu cụ thể khi có thể. Nếu dữ liệu không đủ để trả lời chính xác, hãy nói rõ là chưa có đủ thông tin, đừng bịa số liệu.

DỮ LIỆU DỰ ÁN (JSON):
${JSON.stringify(context)}

CÂU HỎI: ${question}`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    )

    if (!geminiRes.ok) {
      const detail = await geminiRes.text()
      return Response.json({ error: 'Lỗi khi gọi Gemini API', detail }, { status: 502 })
    }

    const geminiData = await geminiRes.json()
    const answer =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ??
      'Xin lỗi, mình chưa nhận được câu trả lời từ Gemini.'

    return Response.json({ answer })
  }),
}
