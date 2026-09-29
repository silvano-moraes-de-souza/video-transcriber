#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Supabase Setup Script: Inicializa banco de dados do Video Transcriber.
Uso: python supabase/setup.py
Requer: SUPABASE_URL, SUPABASE_SECRET_KEY no .env
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY")

if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
    print("[ERRO] Configure SUPABASE_URL e SUPABASE_SECRET_KEY no .env")
    sys.exit(1)

sb = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

MIGRATIONS_DIR = Path(__file__).parent / "migrations"

def run_sql_file(filepath: Path):
    sql = filepath.read_text(encoding="utf-8")
    # Supabase Python client não executa DDL direto via .rpc
    # Usamos PostgREST com service role - mas DDL precisa ser via SQL Editor
    # Este script valida se tabelas existem e mostra o SQL para rodar manual
    print(f"\n=== {filepath.name} ===")
    print(sql)
    return sql

def check_tables():
    """Verifica se tabelas existem."""
    tables = ["transcription_jobs", "transcripts"]
    for table in tables:
        try:
            result = sb.table(table).select("id").limit(1).execute()
            print(f"[OK] Tabela '{table}' existe ({len(result.data)} registros)")
        except Exception as e:
            print(f"[FALTA] Tabela '{table}' NÃO existe: {e}")
            return False
    return True

def main():
    print("=" * 60)
    print("  SUPABASE SETUP: Video Transcriber")
    print("=" * 60)
    print(f"URL: {SUPABASE_URL}")
    
    # Mostra migrações
    migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not migration_files:
        print("[AVISO] Nenhum arquivo de migração encontrado em supabase/migrations/")
        return
    
    print(f"\nEncontradas {len(migration_files)} migração(ões):")
    for f in migration_files:
        run_sql_file(f)
    
    print("\n" + "=" * 60)
    print("  PASSOS MANUAIS NECESSÁRIOS")
    print("=" * 60)
    print("""
1. Acesse o Supabase Dashboard → SQL Editor
2. Cole e execute cada migração acima (em ordem)
3. Depois rode este script novamente para validar

Ou use a CLI do Supabase:
    supabase db push --linked
""")
    
    # Tenta verificar tabelas
    print("\nVerificando tabelas existentes...")
    if check_tables():
        print("\nOK: todas as tabelas existem.")
    else:
        print("\nAVISO: algumas tabelas faltando, execute as migrações no SQL Editor")

if __name__ == "__main__":
    main()