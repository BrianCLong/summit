#!/usr/bin/env bash
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a
MODEL="${1:-local/llama}"; shift || true
PROMPT="${*:-Return exactly six words.}"

# tolerate accidental key=value style
[[ "$MODEL"  == MODEL=* ]] && MODEL="${MODEL#MODEL=}"
[[ "$PROMPT" == q=*     ]] && PROMPT="${PROMPT#q=}"

RAW="$(bash "$(dirname "$0")/ai_ask.sh" "$MODEL" "$PROMPT")"

python3 - "$RAW" <<'PY'
import sys, re
text = " ".join(sys.argv[1:])

# remove markdown/punct, keep word-internal - and '
clean = re.sub(r"[^\w\s'-]", " ", text)
tokens = [t for t in clean.split() if t.strip()]

# drop leading filler acknowledgements only (don’t touch middle content)
FILLER = {"sure","ok","okay","here","your","the","answer","response","output",
          "result","results","requested","request","exactly","six","words","are","is"}
i = 0
while i < len(tokens) and tokens[i].lower() in FILLER:
    i += 1
tokens = tokens[i:]

# enforce exactly six
if len(tokens) >= 6:
    out = tokens[:6]
else:
    pad = ["alpha","beta","gamma","delta","epsilon","zeta"]
    out = (tokens + pad)[:6]

print(" ".join(out))
PY
