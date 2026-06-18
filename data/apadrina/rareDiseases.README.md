# Rare disease dataset for Apadrina una enfermedad

Generated on `2026-06-18` by `generate-rare-diseases.py` in this folder.

## Files

- `rareDiseases.base.json` — canonical non-language metadata keyed by stable Orphanet IDs (`orpha:{ORPHAcode}`).
- `rareDiseases.en.json` — English public-facing labels and synonyms keyed by disease id.
- `rareDiseases.es.json` — Spanish public-facing labels and synonyms keyed by disease id.

## Coverage

- Base records: `10432` Orphanet clinical entities from Orphadata product 1.
- English language records: `10432`.
- Spanish language records: `10432`.
- Records with an Orphadata product 9 prevalence value/class selected: `6440`.
- Status counts: `verified=6440`, `partial=3992`, `missing_translation=0`, `review_needed=0`.

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
