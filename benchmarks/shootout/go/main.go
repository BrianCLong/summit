package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
)

const RUNS = 5

func fib(n int) int {
	if n <= 1 {
		return n
	}
	return fib(n-1) + fib(n-2)
}

type Item struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Values      []int  `json:"values"`
	Active      bool   `json:"active"`
}

func jsonTest() int {
	data := make([]Item, 0, 1000)
	for i := 0; i < 1000; i++ {
		data = append(data, Item{
			ID:          i,
			Name:        fmt.Sprintf("Item %d", i),
			Description: "Some description text that is relatively long to test string handling in JSON parsing.",
			Values:      []int{i, i * 2, i * 3},
			Active:      i%2 == 0,
		})
	}

	jsonBytes, _ := json.Marshal(data)
	var parsed []Item
	for i := 0; i < 100; i++ {
		json.Unmarshal(jsonBytes, &parsed)
	}
	return len(parsed)
}

func stringConcatTest() int {
	var b strings.Builder
	// Increase iterations significantly since Builder is O(N)
	// TS/Python did 50,000. We'll do the same to be comparable, but it will be very fast.
	for i := 0; i < 50000; i++ {
		b.WriteString(strconv.Itoa(i))
	}
	return b.Len()
}

func benchmark(name string, f func()) {
	var total time.Duration
	for i := 0; i < RUNS; i++ {
		start := time.Now()
		f()
		total += time.Since(start)
	}
	avg := float64(total.Milliseconds()) / float64(RUNS)
	fmt.Printf("Go,%s,%.4f\n", name, avg)
}

func main() {
	// Warmup
	fib(20)
	jsonTest()
	stringConcatTest()

	benchmark("Fibonacci(30)", func() { fib(30) })
	benchmark("JSON Parse", func() { jsonTest() })
	benchmark("String Concat", func() { stringConcatTest() })
}
