package mutations

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"sort"
	"strconv"
	"strings"
	"time"
)

type MutationType string

const (
	TypeDrift      MutationType = "type_drift"
	NullBursts     MutationType = "null_bursts"
	SchemaShift    MutationType = "schema_shift"
	DuplicateStorm MutationType = "duplicate_storm"
	TimestampSkew  MutationType = "timestamp_skew"
)

var timeLayouts = []string{
	time.RFC3339,
	"2006-01-02 15:04:05",
	"2006-01-02",
	time.RFC3339Nano,
}

// OrderedMap provides deterministic JSON encoding by sorting keys.
type OrderedMap struct {
	data map[string]interface{}
}

func (om OrderedMap) MarshalJSON() ([]byte, error) {
	keys := make([]string, 0, len(om.data))
	for k := range om.data {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var buf bytes.Buffer
	buf.WriteByte('{')
	for i, k := range keys {
		if i > 0 {
			buf.WriteByte(',')
		}
		keyBytes, err := json.Marshal(k)
		if err != nil {
			return nil, err
		}
		buf.Write(keyBytes)
		buf.WriteByte(':')
		valBytes, err := json.Marshal(om.data[k])
		if err != nil {
			return nil, err
		}
		buf.Write(valBytes)
	}
	buf.WriteByte('}')
	return buf.Bytes(), nil
}

// Mutate accepts a JSON array payload and applies the requested mutation deterministically.
func Mutate(payload []byte, mutation MutationType, seed int64) ([]byte, error) {
	records, err := decodeDataset(payload)
	if err != nil {
		return nil, err
	}

	rnd := rand.New(rand.NewSource(seed))

	switch mutation {
	case TypeDrift:
		applyTypeDrift(records, rnd)
	case NullBursts:
		applyNullBursts(records, rnd)
	case SchemaShift:
		applySchemaShift(records, rnd, seed)
	case DuplicateStorm:
		records = applyDuplicateStorm(records, rnd)
	case TimestampSkew:
		applyTimestampSkew(records, rnd)
	default:
		return nil, fmt.Errorf("unsupported mutation type: %s", mutation)
	}

	ordered := make([]OrderedMap, 0, len(records))
	for _, rec := range records {
		ordered = append(ordered, OrderedMap{data: rec})
	}

	buf := &bytes.Buffer{}
	encoder := json.NewEncoder(buf)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(ordered); err != nil {
		return nil, err
	}

	return bytes.TrimSpace(buf.Bytes()), nil
}

func decodeDataset(payload []byte) ([]map[string]interface{}, error) {
	dec := json.NewDecoder(bytes.NewReader(payload))
	dec.UseNumber()

	token, err := dec.Token()
	if err != nil {
		return nil, fmt.Errorf("decode dataset: %w", err)
	}

	delim, ok := token.(json.Delim)
	if !ok || delim != '[' {
		return nil, errors.New("dataset must be a JSON array")
	}

	var records []map[string]interface{}
	for dec.More() {
		var rec map[string]interface{}
		if err := dec.Decode(&rec); err != nil {
			return nil, fmt.Errorf("decode record: %w", err)
		}
		records = append(records, normalizeRecord(rec))
	}

	if _, err := dec.Token(); err != nil {
		return nil, fmt.Errorf("closing array: %w", err)
	}

	return records, nil
}

func normalizeRecord(in map[string]interface{}) map[string]interface{} {
	out := make(map[string]interface{}, len(in))
	for k, v := range in {
		switch val := v.(type) {
		case json.Number:
			if i, err := val.Int64(); err == nil {
				out[k] = i
			} else if f, err := val.Float64(); err == nil {
				out[k] = f
			} else {
				out[k] = val.String()
			}
		case map[string]interface{}:
			out[k] = normalizeRecord(val)
		default:
			out[k] = val
		}
	}
	return out
}

func applyTypeDrift(records []map[string]interface{}, rnd *rand.Rand) {
	for _, rec := range records {
		numericKeys := make([]string, 0)
		preferredNumeric := make([]string, 0)
		stringKeys := make([]string, 0)
		for key, value := range rec {
			switch value.(type) {
			case int, int64, float64:
				numericKeys = append(numericKeys, key)
				lower := strings.ToLower(key)
				if strings.Contains(lower, "amount") || strings.Contains(lower, "value") || strings.Contains(lower, "total") {
					preferredNumeric = append(preferredNumeric, key)
				}
			case string:
				stringKeys = append(stringKeys, key)
			}
		}

		if len(preferredNumeric) > 0 {
			key := preferredNumeric[rnd.Intn(len(preferredNumeric))]
			rec[key] = fmt.Sprintf("%v", rec[key])
		} else if len(numericKeys) > 0 {
			key := numericKeys[rnd.Intn(len(numericKeys))]
			rec[key] = fmt.Sprintf("%v", rec[key])
		}

		if len(stringKeys) > 0 {
			key := stringKeys[rnd.Intn(len(stringKeys))]
			if str, ok := rec[key].(string); ok {
				if num, err := strconv.ParseFloat(str, 64); err == nil {
					rec[key] = num
				}
			}
		}
	}
}

func applyNullBursts(records []map[string]interface{}, rnd *rand.Rand) {
	for _, rec := range records {
		keys := sortedKeys(rec)
		if len(keys) == 0 {
			continue
		}
		changes := max(1, len(keys)/4)
		for i := 0; i < changes; i++ {
			key := keys[rnd.Intn(len(keys))]
			rec[key] = nil
		}
	}
}

func applySchemaShift(records []map[string]interface{}, rnd *rand.Rand, seed int64) {
	for idx, rec := range records {
		keys := sortedKeys(rec)
		if len(keys) > 0 {
			key := keys[rnd.Intn(len(keys))]
			delete(rec, key)
		}
		rec[fmt.Sprintf("dmcl_shadow_%d_%d", seed%9973, idx)] = fmt.Sprintf("shadow-%d", idx)
	}
}

func applyDuplicateStorm(records []map[string]interface{}, rnd *rand.Rand) []map[string]interface{} {
	if len(records) == 0 {
		return records
	}
	copies := max(1, len(records)/2)
	for i := 0; i < copies; i++ {
		source := records[rnd.Intn(len(records))]
		records = append(records, deepCopy(source))
	}
	return records
}

func applyTimestampSkew(records []map[string]interface{}, rnd *rand.Rand) {
	offsets := []int64{900, 3600, 21600, 86400}
	for _, rec := range records {
		for key, val := range rec {
			if !looksLikeTimestampKey(key) {
				continue
			}
			switch v := val.(type) {
			case string:
				if parsed, layout := parseTime(v); !parsed.IsZero() {
					delta := offsets[rnd.Intn(len(offsets))]
					if rnd.Intn(2) == 0 {
						delta = -delta
					}
					rec[key] = parsed.Add(time.Duration(delta) * time.Second).Format(layout)
				}
			case int:
				delta := offsets[rnd.Intn(len(offsets))]
				if rnd.Intn(2) == 0 {
					delta = -delta
				}
				rec[key] = v + int(delta)
			case int64:
				delta := offsets[rnd.Intn(len(offsets))]
				if rnd.Intn(2) == 0 {
					delta = -delta
				}
				rec[key] = v + delta
			case float64:
				delta := float64(offsets[rnd.Intn(len(offsets))])
				if rnd.Intn(2) == 0 {
					delta = -delta
				}
				rec[key] = v + delta
			}
		}
	}
}

func sortedKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func deepCopy(in map[string]interface{}) map[string]interface{} {
	out := make(map[string]interface{}, len(in))
	for k, v := range in {
		switch val := v.(type) {
		case map[string]interface{}:
			out[k] = deepCopy(val)
		case []interface{}:
			out[k] = deepCopySlice(val)
		default:
			out[k] = val
		}
	}
	return out
}

func deepCopySlice(in []interface{}) []interface{} {
	out := make([]interface{}, len(in))
	for i, v := range in {
		switch val := v.(type) {
		case map[string]interface{}:
			out[i] = deepCopy(val)
		case []interface{}:
			out[i] = deepCopySlice(val)
		default:
			out[i] = val
		}
	}
	return out
}

func parseTime(value string) (time.Time, string) {
	trimmed := strings.TrimSpace(value)
	for _, layout := range timeLayouts {
		if t, err := time.Parse(layout, trimmed); err == nil {
			return t, layout
		}
	}
	return time.Time{}, ""
}

func looksLikeTimestampKey(key string) bool {
	lower := strings.ToLower(key)
	return strings.Contains(lower, "time") || strings.Contains(lower, "date") || strings.Contains(lower, "timestamp")
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
