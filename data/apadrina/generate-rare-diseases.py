#!/usr/bin/env python3
"""Generate source-backed rare disease datasets for the Apadrina page.

Run from this directory (server/data/apadrina):

    python generate-rare-diseases.py
    python generate-rare-diseases.py --refresh

Uses Orphadata product 1 for EN/ES names and synonyms, product 9 for prevalence.
Does not fabricate patient counts, diagnostic delays, or disease descriptions.
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import io
import json
import re
import tarfile
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

BASE_URL = "https://www.orphadata.com/data"
PRODUCT1_URL = f"{BASE_URL}/json/{{lang}}_product1.json.tar.gz"
PRODUCT9_PREV_URL = f"{BASE_URL}/xml/en_product9_prev.xml"
ORPHADATA_API = "https://api.orphadata.com"

DATA_DIR = Path(__file__).resolve().parent
CACHE_DIR = DATA_DIR / ".cache" / "orphadata"
LANGS = ("en", "es")

SOURCE_PRODUCT1 = "Orphadata product 1: Rare diseases aligned with terminologies and databases"
SOURCE_PRODUCT9 = "Orphadata product 9 prevalence: Epidemiology of rare diseases"
NO_PREVALENCE_SOURCE = "No prevalence record for this ORPHAcode in Orphadata product 9 prevalence file"


def download(url: str, cache_path: Path, refresh: bool = False) -> bytes:
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    if cache_path.exists() and not refresh:
        return cache_path.read_bytes()
    req = urllib.request.Request(url, headers={"User-Agent": "f29-rare-disease-dataset/1.0"})
    with urllib.request.urlopen(req, timeout=120) as response:
        body = response.read()
    cache_path.write_bytes(body)
    return body


def download_product1(lang: str, refresh: bool = False) -> dict[str, Any]:
    url = PRODUCT1_URL.format(lang=lang)
    archive = download(url, CACHE_DIR / f"{lang}_product1.json.tar.gz", refresh=refresh)
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tar:
        member = next((m for m in tar.getmembers() if m.name.endswith(".json")), None)
        if member is None:
            raise RuntimeError(f"No JSON member found in {url}")
        extracted = tar.extractfile(member)
        if extracted is None:
            raise RuntimeError(f"Could not extract {member.name} from {url}")
        return json.loads(extracted.read().decode("utf-8"))


def download_prevalence_xml(refresh: bool = False) -> ET.Element:
    body = download(PRODUCT9_PREV_URL, CACHE_DIR / "en_product9_prev.xml", refresh=refresh)
    return ET.fromstring(body)


def singleton(value: Any) -> Any:
    if isinstance(value, list):
        return value[0] if value else None
    return value


def label_from_name_list(value: Any) -> str:
    item = singleton(value)
    if isinstance(item, dict):
        return str(item.get("label") or "").strip()
    return ""


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    value = re.sub(r"<\s*br\s*/?\s*>", " ", value, flags=re.I)
    value = re.sub(r"<[^>]+>", "", value)
    value = html.unescape(value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def get_disorders(product1: dict[str, Any]) -> list[dict[str, Any]]:
    root = singleton(product1.get("JDBOR")) or {}
    disorder_list = singleton(root.get("DisorderList")) or {}
    disorders = disorder_list.get("Disorder") or []
    if not isinstance(disorders, list):
        raise RuntimeError("Unexpected Orphadata product 1 shape: DisorderList.Disorder is not a list")
    return disorders


def extract_synonyms(disorder: dict[str, Any]) -> list[str]:
    out: list[str] = []
    for syn_list in disorder.get("SynonymList") or []:
        for syn in syn_list.get("Synonym") or []:
            label = clean_text(syn.get("label"))
            if label and label not in out:
                out.append(label)
    return out


def extract_language_entry(disorder: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": label_from_name_list(disorder.get("Name")),
        "synonyms": extract_synonyms(disorder),
    }


def is_obsolete_name(name: str) -> bool:
    normalized = name.strip().upper()
    return normalized.startswith("OBSOLETE:") or normalized.startswith("OBSOLETO:")


def compute_status(en_entry: dict[str, Any], es_entry: dict[str, Any], prevalence_value: str | None) -> str:
    if en_entry.get("name") and not es_entry.get("name"):
        return "missing_translation"
    if prevalence_value is None:
        return "partial"
    return "verified"


def xml_text(parent: ET.Element, path: str) -> str:
    element = parent.find(path)
    return clean_text(element.text if element is not None else "")


def prevalence_sort_key(prev: dict[str, str]) -> tuple[int, int, int, str]:
    validation = prev.get("validationStatus", "")
    geo = prev.get("geographic", "")
    ptype = prev.get("type", "")
    validation_rank = 0 if validation == "Validated" else 1
    geo_rank = 0 if geo == "Worldwide" else 1 if geo in {"Europe", "European Union"} else 2
    if ptype == "Point prevalence":
        type_rank = 0
    elif ptype == "Prevalence at birth":
        type_rank = 1
    elif "prevalence" in ptype.lower():
        type_rank = 2
    elif "incidence" in ptype.lower():
        type_rank = 3
    else:
        type_rank = 4
    return (validation_rank, geo_rank, type_rank, prev.get("source", ""))


def extract_prevalence(root: ET.Element) -> dict[str, dict[str, str | None]]:
    by_code: dict[str, dict[str, str | None]] = {}
    for disorder in root.findall("./DisorderList/Disorder"):
        code = xml_text(disorder, "OrphaCode")
        if not code:
            continue
        rows: list[dict[str, str]] = []
        for prev in disorder.findall("./PrevalenceList/Prevalence"):
            rows.append({
                "type": xml_text(prev, "PrevalenceType/Name"),
                "qualification": xml_text(prev, "PrevalenceQualification/Name"),
                "class": xml_text(prev, "PrevalenceClass/Name"),
                "geographic": xml_text(prev, "PrevalenceGeographic/Name"),
                "validationStatus": xml_text(prev, "PrevalenceValidationStatus/Name"),
                "source": xml_text(prev, "Source"),
                "valMoy": xml_text(prev, "ValMoy"),
            })
        if not rows:
            continue
        selected = sorted(rows, key=prevalence_sort_key)[0]
        val = selected["valMoy"]
        klass = selected["class"]
        pieces = []
        if selected["type"]:
            pieces.append(selected["type"])
        if selected["geographic"]:
            pieces.append(selected["geographic"])
        prefix = " — ".join(pieces)
        if val and val not in {"0", "0.0"}:
            value = f"{prefix}: {val} per 100,000" if prefix else f"{val} per 100,000"
            if klass:
                value += f" (class: {klass})"
        elif klass:
            value = f"{prefix}: {klass}" if prefix else klass
        else:
            value = prefix or None
        by_code[code] = {
            "value": value,
            "source": selected["source"] or SOURCE_PRODUCT9,
        }
    return by_code


def empty_prevalence() -> dict[str, str | None]:
    return {"value": None, "source": NO_PREVALENCE_SOURCE}


def build(refresh: bool = False) -> tuple[list[dict[str, Any]], dict[str, Any], dict[str, Any], dict[str, Any]]:
    today = dt.date.today().isoformat()
    products = {lang: download_product1(lang, refresh=refresh) for lang in LANGS}
    disorders_by_lang = {lang: get_disorders(product) for lang, product in products.items()}
    en_disorders = disorders_by_lang["en"]
    localized = {
        lang: {str(d.get("OrphaCode") or ""): extract_language_entry(d) for d in disorders}
        for lang, disorders in disorders_by_lang.items()
    }
    prevalence_by_code = extract_prevalence(download_prevalence_xml(refresh=refresh))

    base: list[dict[str, Any]] = []
    for disorder in en_disorders:
        code = str(disorder.get("OrphaCode") or "").strip()
        if not code:
            continue
        disease_id = f"orpha:{code}"
        en_entry = localized["en"].get(code, {"name": "", "synonyms": []})
        es_entry = localized["es"].get(code, {"name": "", "synonyms": []})
        if is_obsolete_name(en_entry.get("name", "")) or is_obsolete_name(es_entry.get("name", "")):
            continue
        prevalence = prevalence_by_code.get(code) or empty_prevalence()
        status = compute_status(en_entry, es_entry, prevalence["value"])

        base.append({
            "id": disease_id,
            "orphaCode": code,
            "prevalence": prevalence,
            "status": status,
        })

    base.sort(key=lambda item: int(item["orphaCode"]))
    lang_files: dict[str, Any] = {}
    for lang in LANGS:
        lang_obj: dict[str, Any] = {}
        for item in base:
            code = item["orphaCode"]
            entry = localized[lang].get(code) or {"name": "", "synonyms": []}
            lang_obj[item["id"]] = entry
        lang_files[lang] = dict(sorted(lang_obj.items(), key=lambda kv: int(kv[0].split(":", 1)[1])))

    meta = {
        "lastChecked": today,
        "counts": {
            "base": len(base),
            "en": len(lang_files["en"]),
            "es": len(lang_files["es"]),
            "withPrevalence": sum(1 for item in base if item["prevalence"]["value"] is not None),
            "status": {status: sum(1 for item in base if item["status"] == status) for status in ["verified", "partial", "missing_translation", "review_needed"]},
        },
        "sources": {
            "product1": PRODUCT1_URL,
            "product9Prevalence": PRODUCT9_PREV_URL,
            "api": ORPHADATA_API,
        },
    }
    return base, lang_files["en"], lang_files["es"], meta


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_readme(path: Path, meta: dict[str, Any]) -> None:
    counts = meta["counts"]
    status = counts["status"]
    readme = f"""# Rare disease dataset for Apadrina una enfermedad

Generated on `{meta['lastChecked']}` by `generate-rare-diseases.py` in this folder.

## Files

- `rareDiseases.base.json` — canonical non-language metadata keyed by stable Orphanet IDs (`orpha:{{ORPHAcode}}`).
- `rareDiseases.en.json` — English public-facing labels and synonyms keyed by disease id.
- `rareDiseases.es.json` — Spanish public-facing labels and synonyms keyed by disease id.

## Coverage

- Base records: `{counts['base']}` Orphanet clinical entities from Orphadata product 1.
- English language records: `{counts['en']}`.
- Spanish language records: `{counts['es']}`.
- Records with an Orphadata product 9 prevalence value/class selected: `{counts['withPrevalence']}`.
- Status counts: `verified={status['verified']}`, `partial={status['partial']}`, `missing_translation={status['missing_translation']}`, `review_needed={status['review_needed']}`.

## Update process

Run from `f29/server/data/apadrina`:

```bash
python generate-rare-diseases.py
python generate-rare-diseases.py --refresh
```

Orphadata cache lives in `.cache/orphadata/` next to this script.

## Field notes

- `orphaCode`: used in the UI and IA detail lookups (`GET /api/apadrina/diseases/:code/detail`).
- Language files store only `name` and `synonyms` (search). Detail text is generated on demand via Azure OpenAI.
- Orphanet entries whose preferred name starts with `OBSOLETE:` / `OBSOLETO:` are excluded (deprecated).
"""
    path.write_text(readme, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate F29 rare disease JSON datasets from Orphadata.")
    parser.add_argument("--refresh", action="store_true", help="Re-download Orphadata source files instead of using .cache/orphadata")
    parser.add_argument("--out-dir", default=str(DATA_DIR), help="Output directory (defaults to this script's folder)")
    args = parser.parse_args()

    base, en, es, meta = build(refresh=args.refresh)
    out_dir = Path(args.out_dir)
    write_json(out_dir / "rareDiseases.base.json", base)
    write_json(out_dir / "rareDiseases.en.json", en)
    write_json(out_dir / "rareDiseases.es.json", es)
    write_readme(out_dir / "rareDiseases.README.md", meta)
    print(json.dumps(meta, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
