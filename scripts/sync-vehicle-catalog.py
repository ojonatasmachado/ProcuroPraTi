#!/usr/bin/env python3
"""Importa o retrato FIPE mais recente do FIPEX para o Supabase."""

import argparse
import hashlib
import json
import os
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

try:
    import duckdb
except ImportError:
    sys.exit("Instale a dependência com: python3 -m pip install duckdb")

DATASET_URL = "https://huggingface.co/datasets/alanwgt/fipex-veiculos-brasil/resolve/main/data/prices-latest.parquet"
TYPE_MAP = {"carro": "car", "moto": "motorcycle", "caminhão": "truck"}


def load_env(path: Path):
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def stable_id(prefix: str, *values) -> str:
    raw = "|".join(str(value) for value in values)
    return f"{prefix}_{hashlib.sha1(raw.encode('utf-8')).hexdigest()[:24]}"


def download(url: str, destination: Path):
    print("Baixando catálogo FIPEX (aprox. 121 MB)...")
    urllib.request.urlretrieve(url, destination)


def request(base_url, key, table, method="POST", rows=None, query=""):
    url = f"{base_url.rstrip('/')}/rest/v1/{table}{query}"
    body = json.dumps(rows, ensure_ascii=False).encode("utf-8") if rows is not None else None
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            return response.read()
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase {table}: HTTP {exc.code}: {details}") from exc


def chunks(items, size=500):
    for index in range(0, len(items), size):
        yield items[index:index + size]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", help="Parquet local; se omitido, baixa o arquivo oficial.")
    parser.add_argument("--keep", action="store_true", help="Não apaga o arquivo temporário baixado.")
    args = parser.parse_args()

    load_env(Path(".env"))
    load_env(Path(".env.local"))
    base_url = os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not base_url or not key:
        sys.exit("VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env")

    temporary = not args.file
    parquet = Path(args.file) if args.file else Path(tempfile.gettempdir()) / "fipex-prices-latest.parquet"
    if not parquet.exists():
        download(DATASET_URL, parquet)

    connection = duckdb.connect()
    escaped = str(parquet).replace("'", "''")
    reference_year, reference_month = connection.execute(
        f"SELECT ano_referencia, mes_referencia FROM read_parquet('{escaped}') "
        "ORDER BY ano_referencia DESC, mes_referencia DESC LIMIT 1"
    ).fetchone()
    print(f"Preparando referência FIPE {reference_month:02d}/{reference_year}...")

    rows = connection.execute(
        f"""
        SELECT DISTINCT tipo_veiculo, codigo_fipe, nome_modelo, nome_marca,
               nome_combustivel, sigla_combustivel, ano_modelo, zero_km
        FROM read_parquet('{escaped}')
        WHERE ano_referencia = ? AND mes_referencia = ?
          AND tipo_veiculo IN ('carro', 'moto', 'caminhão')
        ORDER BY tipo_veiculo, nome_marca, nome_modelo, ano_modelo DESC
        """,
        [reference_year, reference_month],
    ).fetchall()

    brands_by_key = {}
    models_by_key = {}
    years_by_id = {}
    for source_type, fipe_code, model_name, brand_name, fuel, fuel_code, year, zero_km in rows:
        vehicle_type = TYPE_MAP[source_type]
        brand_key = (vehicle_type, brand_name)
        brand_id = stable_id("brand", *brand_key)
        brands_by_key[brand_key] = {
            "id": brand_id, "vehicle_type": vehicle_type, "name": brand_name,
            "source": "fipex", "reference_month": reference_month, "reference_year": reference_year,
        }
        model_key = (vehicle_type, fipe_code)
        model_id = stable_id("model", *model_key)
        models_by_key[model_key] = {
            "id": model_id, "brand_id": brand_id, "fipe_code": fipe_code, "name": model_name,
        }
        normalized_fuel_code = fuel_code or ""
        normalized_year = int(year) if year is not None else 0
        is_zero_km = bool(zero_km) or year is None
        year_id = stable_id("year", vehicle_type, fipe_code, normalized_year, normalized_fuel_code)
        years_by_id[year_id] = {
            "id": year_id, "model_id": model_id, "year": normalized_year, "fuel": fuel,
            "fuel_code": normalized_fuel_code, "zero_km": is_zero_km,
        }

    brands = list(brands_by_key.values())
    models = list(models_by_key.values())
    years = list(years_by_id.values())
    print(f"Catálogo: {len(brands)} marcas, {len(models)} modelos e {len(years)} anos/combustíveis.")

    # Apagar marcas remove modelos e anos em cascata; a importação é um retrato mensal.
    request(base_url, key, "vehicle_brands", method="DELETE", query="?id=not.is.null")
    for table, items in (("vehicle_brands", brands), ("vehicle_models", models), ("vehicle_years", years)):
        print(f"Salvando {table}...")
        for batch in chunks(items):
            request(base_url, key, table, rows=batch)

    print("Catálogo FIPE salvo com sucesso no Supabase.")
    if temporary and not args.keep:
        parquet.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
