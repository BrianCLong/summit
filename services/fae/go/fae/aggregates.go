package fae

// CupedAggregate stores aggregated statistics required for CUPED uplift.
type CupedAggregate struct {
	N     int
	SumY  float64
	SumY2 float64
	SumX  float64
	SumX2 float64
	SumXY float64
}

// MeanX returns the average covariate value.
func (c CupedAggregate) MeanX() float64 {
	if c.N == 0 {
		return 0
	}
	return c.SumX / float64(c.N)
}

// MeanY returns the average outcome value.
func (c CupedAggregate) MeanY() float64 {
	if c.N == 0 {
		return 0
	}
	return c.SumY / float64(c.N)
}

// Add merges a single observation into the aggregate.
func (c *CupedAggregate) Add(y, x float64) {
	c.N++
	c.SumY += y
	c.SumY2 += y * y
	c.SumX += x
	c.SumX2 += x * x
	c.SumXY += x * y
}

// Merge combines two aggregates.
func (c *CupedAggregate) Merge(other CupedAggregate) {
	c.N += other.N
	c.SumY += other.SumY
	c.SumY2 += other.SumY2
	c.SumX += other.SumX
	c.SumX2 += other.SumX2
	c.SumXY += other.SumXY
}
