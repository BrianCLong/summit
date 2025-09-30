#!/usr/bin/env bash
set -euo pipefail

API="${VITE_COMPANYOS_API:-http://localhost:8787}" # adjust
Q="${1:-ada}"
echo ">> search: $Q"
curl -XPOST http://localhost:3000/v1/asr/chunk -H 'content-type: application/json' -d '{"contactId":"contact:demo","callId":"call:1","audioBase64":"...","sampleRate":16000}'
curl -XPOST http://localhost:3000/v1/asr/final -H 'content-type: application/json' -d '{"contactId":"contact:demo","callId":"call:1","language":"en","fullText":"This is a demo transcript."}'
curl -XPOST http://localhost:3000/v1/ingest/email -H 'content-type: application/json' -d '{"contactId":"contact:demo","thread":{"threadId":"email:1","subject":"Demo Email Thread"},"messages":[{"messageId":"msg:1","date":"2025-09-30T10:00:00Z","from":"sender@example.com","to":"recipient@example.com","subject":"Demo Email","text":"This is a demo email body."}]}'
curl -XPOST http://localhost:3000/v1/ingest/notes -H 'content-type: application/json' -d '{"contactId":"contact:demo","eventId":"meeting:1","text":"Demo meeting notes.","author":"Demo User"}'
curl -XPOST http://localhost:3000/v1/ingest/present/slides -H 'content-type: application/json' -d '{"contactId":"contact:demo","deckId":"deck:1","title":"Demo Deck","slideCount":3}'
curl -XPOST http://localhost:3000/v1/ingest/present/pointer -H 'content-type: application/json' -d '{"contactId":"contact:demo","deckId":"deck:1","slide":1,"x":0.5,"y":0.5,"t":123456789}'