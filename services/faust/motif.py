import faust, math, time, collections

app = faust.App('intelgraph', broker='kafka://kafka:9092')
raw = app.topic('raw.*', value_type=dict, pattern=True)
motif_out = app.topic('features.motif.bursts', value_type=dict)

WIN = 300  # 5 min windows
History = collections.defaultdict(lambda: collections.deque(maxlen=36))  # last 3h / 5m bins
Counters = collections.Counter()

def _bin(ts): return int(ts // (WIN*1000))

@app.agent(raw)
async def motif_bursts(stream):
    async for m in stream:
        ts = int(m['ts'])
        b = _bin(ts)
        motifs = [('#'+h.lower()) for h in m.get('hashtags',[])]
        if m.get('url'): motifs.append(m['url'])
        for t in motifs:
            key = (m.get('source','UNK'), t)
            Counters[(key, b)] += 1

        # every 10s, flush current bin stats
        if (ts // 10000) % 1 == 0:
            nowb = _bin(ts)
            for ((src, t), bin_id), cnt in list(Counters.items()):
                if bin_id < nowb - 1:
                    # bin closed: push to history and compute z
                    H = History[(src, t)]
                    H.append(cnt)
                    mu = sum(H)/max(1,len(H))
                    var = sum((x-mu)**2 for x in H)/max(1,len(H))
                    sigma = math.sqrt(var) or 1.0
                    z = (cnt - mu)/sigma
                    if len(H) >= 6 and z >= 3.5:  # change-point-ish
                        await motif_out.send(value={
                            "motif": t, "source": src, "z": float(round(z,2)), "ts": int(time.time()*1000), "window": WIN
                        })
                    del Counters[((src, t), bin_id)]