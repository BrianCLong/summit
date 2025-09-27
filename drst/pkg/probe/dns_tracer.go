package probe

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"strings"
	"time"

	"drst/pkg/agent"
)

type RegionResolver interface {
	LookupRegion(host string, ip net.IP) string
}

type DNSRegionResolver map[string]string

func (r DNSRegionResolver) LookupRegion(host string, ip net.IP) string {
	if region, ok := r[host]; ok {
		return region
	}
	if region, ok := r[ip.String()]; ok {
		return region
	}
	return ""
}

type DNSTracer struct {
	resolver      RegionResolver
	lookupTimeout time.Duration
}

func NewDNSTracer(resolver RegionResolver) *DNSTracer {
	return &DNSTracer{
		resolver:      resolver,
		lookupTimeout: 2 * time.Second,
	}
}

func (t *DNSTracer) Trace(tx agent.Transaction) (TraceResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), t.lookupTimeout)
	defer cancel()

	host, err := extractHost(tx.Endpoint)
	if err != nil {
		return TraceResult{}, err
	}

	resolver := &net.Resolver{}
	ips, err := resolver.LookupIPAddr(ctx, host)
	if err != nil {
		return TraceResult{}, fmt.Errorf("lookup %s: %w", host, err)
	}

	result := TraceResult{
		Endpoint:     tx.Endpoint,
		Jurisdiction: tx.Jurisdiction,
		ObservedHops: []string{host},
	}
	addrs := make([]string, 0, len(ips))
	var region string
	for _, ip := range ips {
		addrs = append(addrs, ip.IP.String())
		if t.resolver != nil && region == "" {
			region = t.resolver.LookupRegion(host, ip.IP)
		}
	}
	result.ObservedIPs = addrs
	result.ObservedRegion = region
	return result, nil
}

func extractHost(endpoint string) (string, error) {
	trimmed := strings.TrimSpace(endpoint)
	if trimmed == "" {
		return "", fmt.Errorf("empty endpoint")
	}
	if !strings.Contains(trimmed, "://") {
		return trimmed, nil
	}
	u, err := url.Parse(trimmed)
	if err != nil {
		return "", fmt.Errorf("parse endpoint %s: %w", endpoint, err)
	}
	if u.Hostname() == "" {
		return "", fmt.Errorf("endpoint %s missing hostname", endpoint)
	}
	return u.Hostname(), nil
}
