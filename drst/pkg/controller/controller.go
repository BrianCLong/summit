package controller

import (
	"fmt"
	"slices"

	"drst/pkg/agent"
	"drst/pkg/config"
	"drst/pkg/probe"
	"drst/pkg/report"
	"drst/pkg/storage"
)

type Controller struct {
	agent   *agent.Agent
	tracer  probe.EdgeTracer
	scanner storage.Scanner
}

func New(agent *agent.Agent, tracer probe.EdgeTracer, scanner storage.Scanner) *Controller {
	return &Controller{agent: agent, tracer: tracer, scanner: scanner}
}

func (c *Controller) Run(cfg *config.Config) (report.ComplianceMap, error) {
	if cfg == nil {
		return report.ComplianceMap{}, fmt.Errorf("nil config provided")
	}
	compliance := report.ComplianceMap{}
	endpointExpectations := buildExpectationIndex(cfg.Jurisdictions)

	for _, jurisdiction := range cfg.Jurisdictions {
		txs, err := c.agent.Generate(jurisdiction)
		if err != nil {
			return report.ComplianceMap{}, err
		}
		for _, tx := range txs {
			expectation, ok := endpointExpectations[tx.Endpoint]
			if !ok {
				compliance.RoutingViolations = append(compliance.RoutingViolations, report.RoutingViolation{
					TransactionID:  tx.ID,
					Jurisdiction:   tx.Jurisdiction,
					Endpoint:       tx.Endpoint,
					ObservedRegion: "unknown",
					AllowedRegions: nil,
					ObservedHops:   nil,
					ObservedIPs:    nil,
				})
				continue
			}
			trace, err := c.tracer.Trace(tx)
			if err != nil {
				compliance.RoutingViolations = append(compliance.RoutingViolations, report.RoutingViolation{
					TransactionID:  tx.ID,
					Jurisdiction:   tx.Jurisdiction,
					Endpoint:       tx.Endpoint,
					ObservedRegion: err.Error(),
					AllowedRegions: expectation.AllowedRegions,
				})
				continue
			}
			if expectation.RequiredEdgeHops != nil {
				for _, hop := range expectation.RequiredEdgeHops {
					if !slices.Contains(trace.ObservedHops, hop) {
						compliance.RoutingViolations = append(compliance.RoutingViolations, report.RoutingViolation{
							TransactionID:  tx.ID,
							Jurisdiction:   tx.Jurisdiction,
							Endpoint:       tx.Endpoint,
							ObservedRegion: trace.ObservedRegion,
							AllowedRegions: expectation.AllowedRegions,
							ObservedHops:   trace.ObservedHops,
							ObservedIPs:    trace.ObservedIPs,
						})
						break
					}
				}
			}
			if len(expectation.AllowedRegions) > 0 {
				if trace.ObservedRegion == "" {
					compliance.RoutingViolations = append(compliance.RoutingViolations, report.RoutingViolation{
						TransactionID:  tx.ID,
						Jurisdiction:   tx.Jurisdiction,
						Endpoint:       tx.Endpoint,
						ObservedRegion: "unresolved",
						AllowedRegions: expectation.AllowedRegions,
						ObservedHops:   trace.ObservedHops,
						ObservedIPs:    trace.ObservedIPs,
					})
				} else if !slices.Contains(expectation.AllowedRegions, trace.ObservedRegion) {
					compliance.RoutingViolations = append(compliance.RoutingViolations, report.RoutingViolation{
						TransactionID:  tx.ID,
						Jurisdiction:   tx.Jurisdiction,
						Endpoint:       tx.Endpoint,
						ObservedRegion: trace.ObservedRegion,
						AllowedRegions: expectation.AllowedRegions,
						ObservedHops:   trace.ObservedHops,
						ObservedIPs:    trace.ObservedIPs,
					})
				}
			}
		}
	}

	for _, target := range cfg.StorageScans {
		artifacts, err := c.scanner.Scan(target.Path)
		if err != nil {
			return report.ComplianceMap{}, fmt.Errorf("scan storage %s: %w", target.Bucket, err)
		}
		outOfRegion := make([]report.StorageViolation, 0)
		allowedSet := target.AllowedRegions
		artifactIDs := make([]string, 0, len(artifacts))
		for _, artifact := range artifacts {
			artifactIDs = append(artifactIDs, artifact.Identifier)
			if len(allowedSet) > 0 && !slices.Contains(allowedSet, artifact.Region) {
				outOfRegion = append(outOfRegion, report.StorageViolation{
					Bucket:         target.Bucket,
					ArtifactID:     artifact.Identifier,
					ObservedRegion: artifact.Region,
					AllowedRegions: allowedSet,
				})
			}
		}
		if len(outOfRegion) > 0 {
			compliance.StorageViolations = append(compliance.StorageViolations, outOfRegion...)
		} else {
			compliance.NegativeProofs = append(compliance.NegativeProofs, report.BuildNegativeProof(target.Bucket, artifactIDs))
		}
	}

	return compliance, nil
}

type expectationData struct {
	AllowedRegions   []string
	RequiredEdgeHops []string
}

func buildExpectationIndex(jurisdictions []config.Jurisdiction) map[string]expectationData {
	out := make(map[string]expectationData)
	for _, jurisdiction := range jurisdictions {
		for _, route := range jurisdiction.Routes {
			out[route.Endpoint] = expectationData{
				AllowedRegions:   append([]string(nil), route.AllowedRegions...),
				RequiredEdgeHops: append([]string(nil), route.RequiredEdgeHops...),
			}
		}
	}
	return out
}
