'use client'

import { useEffect, useState } from 'react'

type Job = { id: string; status: string; progress: number; platform?: string; error?: string; transcript?: { text: string; language?: string; duration?: number; segments?: {start:number;end:number;text:string}[] } }

const labels: Record<string,string> = {
  queued: 'Na fila',
  downloading: 'Baixando vídeo',
  extracting: 'Extraindo áudio',
  transcribing: 'Transcrevendo',
  completed: 'Concluído',
  failed: 'Falhou'
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!job || ['completed','failed'].includes(job.status)) return
    const timer = setInterval(async () => {
      const res = await fetch(`/api/jobs/${job.id}?token=${encodeURIComponent(localStorage.getItem(`job:${job.id}`) || '')}`, { cache: 'no-store' })
      if (res.ok) setJob(await res.json())
    }, 1800)
    return () => clearInterval(timer)
  }, [job])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setJob(null); setCopied(false)
    try {
      const res = await fetch('/api/transcribe', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ url }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Não foi possível criar o job.')
      localStorage.setItem(`job:${data.id}`, data.token)
      setJob(data)
    } catch (err) {
      setJob({ id:'', status:'failed', progress:0, error: err instanceof Error ? err.message : 'Erro desconhecido' })
    } finally { setLoading(false) }
  }

  async function copy() {
    if (!job?.transcript?.text) return
    await navigator.clipboard.writeText(job.transcript.text)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  function download(ext: 'txt'|'srt') {
    if (!job?.transcript?.text) return
    let content = job.transcript.text
    if (ext === 'srt') {
      const pad = (n:number) => String(n).padStart(2,'0')
      const stamp = (sec:number) => { const ms=Math.max(0,Math.round(sec*1000)); const h=Math.floor(ms/3600000); const m=Math.floor((ms%3600000)/60000); const s=Math.floor((ms%60000)/1000); const x=ms%1000; return `${pad(h)}:${pad(m)}:${pad(s)},${String(x).padStart(3,'0')}` }
      content = (job.transcript.segments || []).map((seg,i)=>`${i+1}\n${stamp(seg.start)} --> ${stamp(seg.end)}\n${seg.text.trim()}\n`).join('\n')
    }
    const blob = new Blob([content], {type:'text/plain;charset=utf-8'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `transcricao.${ext}`; a.click(); URL.revokeObjectURL(a.href)
  }

  return <main className="shell">
    <div className="hero">
      <div className="badge">VIDEO → TEXTO</div>
      <h1>Transcreva um vídeo a partir do link.</h1>
      <p className="subtitle">Cole uma URL pública. O sistema identifica a fonte, extrai o áudio e gera a transcrição.</p>
      <form onSubmit={submit} className="card form">
        <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://youtube.com/..." type="url" required />
        <button disabled={loading}>{loading ? 'Enviando...' : 'Transcrever vídeo'}</button>
      </form>
      <div className="sources">YouTube · TikTok · Instagram · Facebook · X · outras fontes públicas suportadas</div>
    </div>

    {job && <section className="card result">
      {job.status !== 'completed' && job.status !== 'failed' && <>
        <div className="status-row"><strong>{labels[job.status] || job.status}</strong><span>{job.progress}%</span></div>
        <div className="progress"><div style={{width:`${job.progress}%`}} /></div>
        <p className="muted">Você pode deixar esta página aberta. O processamento acontece no worker.</p>
      </>}
      {job.status === 'failed' && <div className="error"><strong>Não foi possível processar.</strong><p>{job.error}</p></div>}
      {job.status === 'completed' && job.transcript && <>
        <div className="status-row"><strong>Transcrição pronta</strong><span>{job.transcript.language || 'idioma detectado'}</span></div>
        <textarea className="transcript" readOnly value={job.transcript.text} />
        <div className="actions"><button onClick={copy}>{copied ? 'Copiado' : 'Copiar texto'}</button><button onClick={()=>download('txt')}>Baixar TXT</button><button onClick={()=>download('srt')}>Baixar SRT</button></div>
      </>}
    </section>}

    <footer>Use apenas conteúdo que você tenha autorização para acessar e processar. Conteúdo privado, protegido ou bloqueado pela plataforma pode não ser processável.</footer>
  </main>
}
