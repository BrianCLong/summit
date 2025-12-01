package main

import (
	"flag"
	"log"
	"net/http"
	"time"

	"github.com/summit/streaming/sfm/internal/api"
	"github.com/summit/streaming/sfm/internal/core"
	"github.com/summit/streaming/sfm/internal/dsr"
)

func main() {
	var (
		addr      = flag.String("addr", ":8085", "HTTP listen address")
		windowDur = flag.Duration("window", 5*time.Minute, "rolling fairness window")
		topK      = flag.Int("k", 50, "top-k window for equality of opportunity")
		tprGap    = flag.Float64("tpr-gap", 0.1, "alert threshold for TPR gap")
		fprGap    = flag.Float64("fpr-gap", 0.1, "alert threshold for FPR gap")
		demoDiff  = flag.Float64("dp-diff", 0.1, "alert threshold for demographic parity diff")
		eqOppDiff = flag.Float64("eq-opp-diff", 0.1, "alert threshold for equality of opportunity at k diff")
		seed      = flag.String("seed", "sfm-default", "snapshot signing seed")
		dsrPath   = flag.String("dsr", "", "path to deterministic slice registry export")
	)
	flag.Parse()

	var resolver core.SliceResolver
	if *dsrPath != "" {
		r, err := dsr.NewFileBackedResolver(*dsrPath)
		if err != nil {
			log.Fatalf("failed to load slice registry: %v", err)
		}
		resolver = r
		log.Printf("loaded %d slices from %s", len(r.Config().Slices), *dsrPath)
	}

	thresholds := core.Thresholds{
		TPRGap:       *tprGap,
		FPRGap:       *fprGap,
		Demographic:  *demoDiff,
		EqOppAtKDiff: *eqOppDiff,
	}

	aggregator := core.NewAggregator(*windowDur, *topK, thresholds, resolver)
	signer := core.NewSnapshotSigner(*seed)
	server := api.NewServer(aggregator, signer)

	log.Printf("SFM listening on %s (window=%s, k=%d)", *addr, windowDur.String(), *topK)
	if err := http.ListenAndServe(*addr, server.Routes()); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
