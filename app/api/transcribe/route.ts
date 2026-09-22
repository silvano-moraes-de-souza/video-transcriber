import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { getAdminClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 10

function platformOf(url: string) {
  const h = new URL(url).hostname.toLowerCase()
  if (h.includes('youtube.com') || h === 'youtu.be') return 'youtube'
  if (h.includes('tiktok.com')) return 'tiktok'
  if (h.includes('instagram.com')) return 'instagram'
  if (h.includes('facebook.com') || h === 'fb.watch') return 'facebook'
  if (h.includes('twitter.com') || h.includes('x.com')) return 'x'
  return 'generic'
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const raw = String(body?.url || '').trim()
    const parsed = new URL(raw)
    if (!['http:','https:'].includes(parsed.protocol)) throw new Error('A URL precisa usar HTTP ou HTTPS.')
    if (raw.length > 2000) throw new Error('URL muito longa.')

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const ipHash = createHash('sha256').update(`${ip}:${process.env.JOB_HMAC_SECRET || 'local'}`).digest('hex')
    const supabase = getAdminClient()

    const { data: recent } = await supabase.from('transcription_jobs').select('id').eq('request_hash', ipHash).gte('created_at', new Date(Date.now()-60*60*1000).toISOString()).limit(3)
    if ((recent?.length || 0) >= 3) return NextResponse.json({error:'Limite temporário atingido. Tente novamente mais tarde.'},{status:429})

    const token = randomBytes(24).toString('hex')
    const { data, error } = await supabase.from('transcription_jobs').insert({source_url:raw,platform:platformOf(raw),status:'queued',progress:0,access_token:token,request_hash:ipHash}).select('id,status,progress,platform').single()
    if (error) throw error
    return NextResponse.json({...data, token})
  } catch (e) {
    return NextResponse.json({error:e instanceof Error ? e.message : 'Erro ao criar job.'},{status:400})
  }
}
