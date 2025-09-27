package cache_test

import (
	"context"
	"testing"
	"time"

	"github.com/summit/jpr"
	"github.com/summit/jpr/cache"
)

type fakeEngine struct{}

func TestEngineCacheHitAndMiss(t *testing.T) {
	c := cache.New()
	loaderCalls := 0
	loader := func(context.Context) (*jpr.Engine, error) {
		loaderCalls++
		return &jpr.Engine{}, nil
	}

	engine, hit, err := c.GetOrLoad(context.Background(), "etag", time.Second, loader)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if hit {
		t.Fatalf("expected miss")
	}
	if engine == nil {
		t.Fatalf("expected engine")
	}

	engine, hit, err = c.GetOrLoad(context.Background(), "etag", time.Second, loader)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !hit {
		t.Fatalf("expected cache hit")
	}
	if loaderCalls != 1 {
		t.Fatalf("loader should run once, got %d", loaderCalls)
	}
}

func TestEngineCacheExpiry(t *testing.T) {
	c := cache.New()
	loaderCalls := 0
	loader := func(context.Context) (*jpr.Engine, error) {
		loaderCalls++
		return &jpr.Engine{}, nil
	}

	if _, _, err := c.GetOrLoad(context.Background(), "etag", time.Millisecond*10, loader); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	time.Sleep(time.Millisecond * 15)
	evicted := c.Sweep(time.Now().UTC())
	if evicted == 0 {
		t.Fatalf("expected eviction")
	}
	if c.Len() != 0 {
		t.Fatalf("cache should be empty")
	}
}
