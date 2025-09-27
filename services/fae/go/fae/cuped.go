package fae

import "math"

// CupedResult captures the adjusted uplift computation.
type CupedResult struct {
	Uplift                float64
	TreatmentAdjustedMean float64
	ControlAdjustedMean   float64
	Theta                 float64
	Variance              float64
}

func thetaAndMeanX(control CupedAggregate) (theta float64, meanX float64) {
	if control.N == 0 {
		return 0, 0
	}
	meanX = control.SumX / float64(control.N)
	meanY := control.SumY / float64(control.N)
	covXY := control.SumXY/float64(control.N) - meanX*meanY
	varX := control.SumX2/float64(control.N) - meanX*meanX
	if math.Abs(varX) < 1e-12 {
		return 0, meanX
	}
	theta = covXY / varX
	return theta, meanX
}

func adjustedMoments(agg CupedAggregate, theta, baselineMeanX float64) (meanZ, varZ float64) {
	if agg.N == 0 {
		return 0, 0
	}
	sumZ := agg.SumY - theta*(agg.SumX-float64(agg.N)*baselineMeanX)
	sumZ2 := agg.SumY2 - 2*theta*(agg.SumXY-baselineMeanX*agg.SumY) + theta*theta*(agg.SumX2-2*baselineMeanX*agg.SumX+float64(agg.N)*baselineMeanX*baselineMeanX)
	meanZ = sumZ / float64(agg.N)
	varZ = sumZ2/float64(agg.N) - meanZ*meanZ
	if varZ < 0 {
		varZ = 0
	}
	return meanZ, varZ
}

// ComputeCupedUplift returns the CUPED uplift for the two aggregates.
func ComputeCupedUplift(control, treatment CupedAggregate) CupedResult {
	theta, meanX := thetaAndMeanX(control)
	controlMean, controlVar := adjustedMoments(control, theta, meanX)
	treatmentMean, treatmentVar := adjustedMoments(treatment, theta, meanX)
	variance := 0.0
	if control.N > 0 {
		variance += controlVar / float64(control.N)
	}
	if treatment.N > 0 {
		variance += treatmentVar / float64(treatment.N)
	}
	return CupedResult{
		Uplift:                treatmentMean - controlMean,
		TreatmentAdjustedMean: treatmentMean,
		ControlAdjustedMean:   controlMean,
		Theta:                 theta,
		Variance:              variance,
	}
}
