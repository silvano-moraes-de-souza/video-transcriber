# Video Transcriber

MVP de transcrição de vídeos públicos a partir de uma URL.

## Arquitetura

- Next.js + Vercel: interface e API curta para criar/consultar jobs.
- Supabase Postgres: fila, estado e transcrições.
- Worker Python: yt-dlp + FFmpeg + OpenAI Whisper.

O worker fica separado porque download, FFmpeg e transcrição são tarefas longas e não devem ser executadas dentro de uma função web curta.

## 1. Supabase

Crie um projeto Supabase ou use um projeto existente. Execute `supabase/migrations/001_initial.sql` no SQL Editor.

A aplicação usa `SUPABASE_SECRET_KEY` somente no servidor. Nunca coloque essa chave no frontend.

## 2. Vercel

Configure:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `JOB_HMAC_SECRET`

Deploy do diretório na Vercel.

## 3. Worker

Entre em `worker/`, copie `.env.example` para `.env` e preencha:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `OPENAI_API_KEY`
- `OPENAI_TRANSCRIPTION_MODEL`

Localmente:

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
pip install yt-dlp
python worker.py
```

Linux/macOS:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install yt-dlp
python worker.py
```

FFmpeg precisa estar instalado no ambiente do worker.

Para produção, use o `worker/Dockerfile` em um serviço que mantenha processo contínuo.

## Limitações da V1

O sistema trabalha com URLs públicas que o yt-dlp consiga acessar. Links privados, conteúdo que exige login, conteúdo protegido e plataformas que bloqueiem o acesso automatizado podem falhar. Não há tentativa de contornar autenticação ou controles de acesso.

A V1 limita a duração e o tamanho do áudio. O próximo passo é adicionar chunking automático para vídeos longos, filas concorrentes, autenticação, cobrança por minuto e exportação SRT/VTT real baseada nos segmentos.
