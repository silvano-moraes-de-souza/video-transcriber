import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(req: Request, { params }: { params: Promise<{id:string}> }) {
  try {
    const {id} = await params
    const token = new URL(req.url).searchParams.get('token') || ''
    if (!token) return NextResponse.json({error:'Token ausente.'},{status:401})
    const supabase = getAdminClient()
    const { data: job, error } = await supabase.from('transcription_jobs').select('id,status,progress,platform,error').eq('id',id).eq('access_token',token).single()
    if (error || !job) return NextResponse.json({error:'Job não encontrado.'},{status:404})
    if (job.status === 'completed') {
      const {data: transcript} = await supabase.from('transcripts').select('text,language,duration,segments').eq('job_id',id).single()
      return NextResponse.json({...job,transcript})
    }
    return NextResponse.json(job)
  } catch (e) { return NextResponse.json({error:e instanceof Error?e.message:'Erro.'},{status:500}) }
}
