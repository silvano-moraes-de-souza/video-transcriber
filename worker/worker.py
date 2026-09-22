import os, time, tempfile, subprocess, json, traceback
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client
from openai import OpenAI

load_dotenv()
SB_URL=os.environ['SUPABASE_URL']; SB_KEY=os.environ['SUPABASE_SECRET_KEY']
sb=create_client(SB_URL,SB_KEY); ai=OpenAI(api_key=os.environ['OPENAI_API_KEY'])
MODEL=os.getenv('OPENAI_TRANSCRIPTION_MODEL','whisper-1'); POLL=float(os.getenv('POLL_SECONDS','3')); MAX=int(os.getenv('MAX_DURATION_SECONDS','3600'))

def update(job_id, **fields):
    sb.table('transcription_jobs').update(fields).eq('id',job_id).execute()

def run(job):
    jid=job['id']; url=job['source_url']
    with tempfile.TemporaryDirectory(prefix='transcriber-') as td:
        p=Path(td); video=p/'video'; audio=p/'audio.mp3'
        update(jid,status='downloading',progress=5,started_at=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()))
        cmd=['yt-dlp','--no-playlist','--max-filesize','500M','--no-warnings','-o',str(video)+'.%(ext)s',url]
        r=subprocess.run(cmd,capture_output=True,text=True,timeout=900)
        if r.returncode!=0: raise RuntimeError('Não foi possível acessar o vídeo. Verifique se o link é público e válido.')
        files=list(p.glob('video.*'))
        if not files: raise RuntimeError('O downloader não encontrou um arquivo de vídeo.')
        source=files[0]
        update(jid,status='extracting',progress=25)
        probe=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(source)],capture_output=True,text=True)
        duration=float(probe.stdout.strip() or 0)
        if duration<=0 or duration>MAX: raise RuntimeError(f'Duração não suportada. Limite atual: {MAX//60} minutos.')
        subprocess.run(['ffmpeg','-y','-i',str(source),'-vn','-ac','1','-ar','16000','-b:a','64k',str(audio)],check=True,capture_output=True)
        update(jid,status='transcribing',progress=35)
        # For MVP, the 64 kbps mono MP3 keeps normal videos under the API upload limit. Longer media can be chunked in a later billing tier.
        if audio.stat().st_size > 24_000_000: raise RuntimeError('Áudio muito grande para a V1. Reduza a duração do vídeo.')
        with open(audio,'rb') as f:
            result=ai.audio.transcriptions.create(model=MODEL,file=f,response_format='verbose_json',timestamp_granularities=['segment'])
        text=getattr(result,'text','') or ''
        segments=getattr(result,'segments',[]) or []
        payload=[]
        for s in segments:
            payload.append({'start':getattr(s,'start',0),'end':getattr(s,'end',0),'text':getattr(s,'text','')})
        sb.table('transcripts').insert({'job_id':jid,'text':text,'language':getattr(result,'language',None),'duration':duration,'segments':payload}).execute()
        update(jid,status='completed',progress=100,completed_at=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()))

def main():
    print('worker online')
    while True:
        try:
            q=sb.table('transcription_jobs').select('*').eq('status','queued').order('created_at').limit(1).execute()
            jobs=q.data or []
            if not jobs: time.sleep(POLL); continue
            job=jobs[0]
            try: run(job)
            except Exception as e:
                traceback.print_exc(); update(job['id'],status='failed',progress=0,error=str(e)[:1000])
        except Exception:
            traceback.print_exc(); time.sleep(POLL)

if __name__=='__main__': main()
