# Design decisions

| # | Decision | Why | Alternatives considered |
|---|---|---|---|
| 1 | Split API (Next.js on Vercel) and worker (Python in Docker) | Download, audio extraction and transcription take minutes; a Vercel function times out at 30 s. | Chunked serverless (complex, expensive); managed queue with Redis/Bull (more infrastructure). |
| 2 | yt-dlp, FFmpeg and the OpenAI Whisper API | yt-dlp handles the most sources, FFmpeg is the standard for audio, Whisper API gives good quality per dollar. | Local faster-whisper (needs a GPU); AssemblyAI or Deepgram (similar cost, less control). |
| 3 | Videos up to 60 min, audio at 64 kbps mono | The Whisper API accepts 25 MB per upload; 60 min at 64 kbps mono is about 24 MB. | Automatic chunking, planned for v2. |
| 4 | One worker, polling every 3 s, one job at a time | Simplest thing to operate for a first version. | Parallel workers and a priority queue, planned for v2. |
| 5 | No login in v1 | Public MVP to check if anyone wants it. | Accounts and rate limiting later. |
| 6 | Supabase Postgres as queue and state | Free tier, plain SQL, tables `transcription_jobs` and `transcripts`. | A separate queue service. |
