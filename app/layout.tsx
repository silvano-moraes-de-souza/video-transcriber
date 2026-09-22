import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Transcriba | Video to Text',
  description: 'Transcreva vídeos públicos a partir de um link.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>
}
