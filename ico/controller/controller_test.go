package controller

import (
    "strings"
    "testing"
)

func TestLoadPlanAndBuildArtifacts(t *testing.T) {
    doc, err := LoadPlan("planfixtures/plan.json")
    if err != nil {
        t.Fatalf("LoadPlan: %v", err)
    }

    if len(doc.Plans) != 2 {
        t.Fatalf("expected 2 plans, got %d", len(doc.Plans))
    }

    hpas := doc.BuildHPAConfigs("production")
    if len(hpas) != 2 {
        t.Fatalf("expected 2 HPAs, got %d", len(hpas))
    }
    if hpas[0].Metadata.Namespace != "production" {
        t.Fatalf("expected overridden namespace, got %s", hpas[0].Metadata.Namespace)
    }

    recipes := doc.Recipes()
    if len(recipes) != 2 {
        t.Fatalf("expected 2 recipes, got %d", len(recipes))
    }
    if recipes[0].Strategy != "int8" {
        t.Fatalf("expected deterministic ordering on recipes")
    }

    baseline, planned, pct := doc.Savings()
    if baseline <= planned {
        t.Fatalf("expected baseline > planned, got %f vs %f", baseline, planned)
    }
    if pct < 0.5 {
        t.Fatalf("expected savings pct >= 0.5, got %f", pct)
    }
}

func TestDecodePlanRejectsInvalid(t *testing.T) {
    invalidJSON := "{\"summary\":{},\"plans\":[]}"
    if _, err := DecodePlan(strings.NewReader(invalidJSON)); err == nil {
        t.Fatal("expected error for empty plans")
    }
}

func TestLoadPlanPropagatesIOErrors(t *testing.T) {
    if _, err := LoadPlan("planfixtures/missing.json"); err == nil {
        t.Fatal("expected error for missing file")
    }
}

