id: zhipu-glm-4.5-suite
vendor: Zhipu AI (Z.ai)
family: GLM / ChatGLM
last_verified: 2025-09-25
models:

- name: GLM-4.5
  class: flagship LLM (reasoning/coding/agents)
  context: 128k
  modes: thinking (deep), fast (low-latency)
  best_for: complex multi-step reasoning, artifact-level coding, agent workflows
  pricing_ref: BigModel pricing page (live) # check portal before use
  notes: MoE; July 28, 2025 launch; agent-first positioning
  sources:
  - Reuters launch brief
  - Z.ai press release + blog
  - BigModel console/pricing
  - OpenRouter provider page
- name: GLM-4.5-Air
  class: latency/cost-optimized LLM
  role: default agent brain when cost/latency matter
  sources:
  - HF model card (Air)
  - BigModel console
- name: GLM-4.5V
  class: VLM (image+text)
  context: ~66k multimodal (provider-dependent)
  providers: SiliconFlow
  sources:
  - SiliconFlow model page and blog
  - HF model card (4.5V)
- name: GLM-4 (family legacy)
  variants: GLM-4, GLM-4-Air, GLM-4-9B
  purpose: stable API docs, comparisons
  sources: - BigModel docs
  open_weights:
- name: GLM-4-9B-Chat (and 1M ctx variant)
  license: vendor license on HF
  capability: competitive 9B class; long-context option
  runtimes: chatglm.cpp; (community) other runtimes
  sources: - HF 9B Chat - HF 9B Chat 1M - chatglm.cpp repo (GLM-4(V) support)
  access_and_pricing:
  primary_portal: BigModel (official rates & quotas)
  mirrors: CometAPI / OpenRouter / SiliconFlow (for VLM + alt pricing)
  migration_note: Sept 2025 “Claude→GLM” switch offer (URL swap + bonus tokens)
  sources: - BigModel pricing - CometAPI pricing explainer - Reuters migration story (+ AOL syndication)
  capability_highlights:
- dual-mode execution (deep-think vs fast)
- long context + artifact-level code gen (HTML/SVG/Python)
- VLM on 4.5V for image understanding grounded to 4.5 text stack
- local/open path with 9B class
  sources: - Z.ai blog - SiliconFlow blog - HF pages
  defaults:
  choose: - Max-IQ: GLM-4.5; fall back to 4.5-Air for latency/cost - Multimodal: GLM-4.5V - On-prem/local: GLM-4-9B-Chat (HF) via chatglm.cpp
  risk_notes:
- Always verify official pricing on BigModel before quoting
- Provider features (context, tool-use) vary; pin per-environment
- China/US policy shifts can affect provider access; keep a fallback route

Drop-in usage (copy/paste)

Official (BigModel) – simple chat

curl https://open.bigmodel.cn/api/paas/v4/chat/completions \
 -H "Authorization: Bearer $ZHIPU_API_KEY" -H "Content-Type: application/json" \
 -d '{
"model": "GLM-4.5",
"messages":[{"role":"user","content":"Summarize key differences between GLM-4.5 and 4.5-Air."}],
"temperature":0.2
}'

SiliconFlow (4.5V vision) – OpenAI-compatible

curl https://api.siliconflow.com/v1/chat/completions \
 -H "Authorization: Bearer $SILICONFLOW_KEY" -H "Content-Type: application/json" \
 -d '{
"model":"zai-org/GLM-4.5V",
"messages":[
{"role":"system","content":"You are a careful vision analyst."},
{"role":"user","content":[
{"type":"text","text":"Extract the table from this page image and return CSV."},
{"type":"image_url","image_url":{"url":"https://.../page.png"}}
]}
],
"enable_thinking": true, "thinking_budget": 4096
}'

Local (open weights) – chatglm.cpp (GLM-4(V) & ChatGLM)\*

# build per repo; then:

./chatglm-cli -m ./glm-4-9b-chat-q4_0.gguf -p "Write a unit test for parseInvoice() in Python."

Eval sanity prompts (fast smoke tests)

Reasoning: “You have 3 boxes (red, blue, green)… chain-of-thought hidden, return final answer + 3-sentence verification.”

Coding: “Write a self-contained JS function + tests to normalize ISO date ranges; no external deps.”

Vision (4.5V): “Given this receipt photo, extract merchant, total, date; return JSON with fields + confidence.”

Why we’re confident enough to ship this MC card

GLM-4.5 launch & positioning (agents; July 28, 2025) are confirmed by Reuters and Z.ai’s own release/blog.
Reuters
+2
PR Newswire
+2

Air variant and parameter/active-parameter details are in the HF “GLM-4.5-Air” card.
Hugging Face

4.5V availability, context/pricing, and API are documented by SiliconFlow (model page + blog + social).
SiliconFlow
+2
SiliconFlow
+2

BigModel pricing is live (use that as source of truth); CometAPI/OpenRouter useful for benchmarking.
BigModel
+2
CometAPI
+2

Open-weights path (GLM-4-9B-Chat and 1M) and local runtime support (chatglm.cpp for GLM-4(V)/ChatGLM) are current.
Hugging Face
+2
Hugging Face
+2

Recent ecosystem moves: free AutoGLM Rumination agent (GLM-Z1-Air / GLM-4-Air-0414) and Claude-to-GLM migration offer (Sept 2025) are verified via Reuters.
Reuters
+1

If you want, I can also generate per-environment MC sub-cards (SaaS vs air-gapped) with pinned provider, context, and cost guards—but this base card is ready to commit.
