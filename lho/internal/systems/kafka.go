package systems

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"

	"github.com/summit/lho/internal/model"
)

type KafkaMessage struct {
	Offset    int
	Payload   string
	Frozen    bool
	Deleted   bool
	Timestamp int64
}

type KafkaTopic struct {
	Name            string
	Messages        map[int]*KafkaMessage
	RetentionPaused bool
}

type KafkaFixture struct {
	mu     sync.RWMutex
	Topics map[string]*KafkaTopic
}

func NewKafkaFixture(topics map[string]*KafkaTopic) *KafkaFixture {
	return &KafkaFixture{Topics: topics}
}

func (k *KafkaFixture) Name() string { return "kafka" }

func (k *KafkaFixture) ApplyHold(ctx context.Context, scope model.Scope, freeze, snapshot bool, tags map[string]string, preventTTL bool) (Report, error) {
	select {
	case <-ctx.Done():
		return Report{}, ctx.Err()
	default:
	}

	ids := scope.Systems[k.Name()]
	if len(ids) == 0 {
		return Report{}, nil
	}

	report := Report{}

	k.mu.Lock()
	defer k.mu.Unlock()

	for _, composite := range ids {
		topicName, offset, err := splitTopicOffset(composite)
		if err != nil {
			return Report{}, err
		}
		topic, ok := k.Topics[topicName]
		if !ok {
			return Report{}, fmt.Errorf("topic %s not found", topicName)
		}

		msg, ok := topic.Messages[offset]
		if !ok {
			return Report{}, fmt.Errorf("message %s missing", composite)
		}

		if freeze {
			msg.Frozen = true
			report.FrozenResources = append(report.FrozenResources, composite)
		}
		if preventTTL {
			topic.RetentionPaused = true
		}
	}

	report.FingerprintValues = k.fingerprint(ids)

	return report, nil
}

func (k *KafkaFixture) Verify(ctx context.Context, scope model.Scope) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	k.mu.RLock()
	defer k.mu.RUnlock()

	ids := scope.Systems[k.Name()]
	for _, composite := range ids {
		topicName, offset, err := splitTopicOffset(composite)
		if err != nil {
			return err
		}
		topic, ok := k.Topics[topicName]
		if !ok {
			return fmt.Errorf("topic %s missing", topicName)
		}
		msg, ok := topic.Messages[offset]
		if !ok {
			return fmt.Errorf("message %d missing", offset)
		}
		if msg.Deleted {
			return fmt.Errorf("message %d deleted during hold", offset)
		}
		if !msg.Frozen {
			return fmt.Errorf("message %d not frozen", offset)
		}
		if !topic.RetentionPaused {
			return fmt.Errorf("topic %s retention resumed", topicName)
		}
	}

	return nil
}

func (k *KafkaFixture) DeleteMessage(topicName string, offset int) error {
	k.mu.Lock()
	defer k.mu.Unlock()

	topic, ok := k.Topics[topicName]
	if !ok {
		return fmt.Errorf("topic %s not found", topicName)
	}

	msg, ok := topic.Messages[offset]
	if !ok {
		return fmt.Errorf("message %d not found", offset)
	}

	if msg.Frozen {
		return fmt.Errorf("message %d is frozen under hold", offset)
	}

	msg.Deleted = true
	return nil
}

func (k *KafkaFixture) fingerprint(ids []string) []string {
	parts := make([]string, 0, len(ids))
	for _, composite := range ids {
		topicName, offset, err := splitTopicOffset(composite)
		if err != nil {
			parts = append(parts, fmt.Sprintf("%s:badid", composite))
			continue
		}
		topic, ok := k.Topics[topicName]
		if !ok {
			parts = append(parts, fmt.Sprintf("%s:topic-missing", composite))
			continue
		}
		msg, ok := topic.Messages[offset]
		if !ok {
			parts = append(parts, fmt.Sprintf("%s:message-missing", composite))
			continue
		}
		parts = append(parts, fmt.Sprintf("%s:%t:%t:%t", composite, msg.Frozen, msg.Deleted, topic.RetentionPaused))
	}
	sort.Strings(parts)
	return parts
}

func splitTopicOffset(input string) (string, int, error) {
	parts := strings.SplitN(input, ":", 2)
	if len(parts) != 2 {
		return "", 0, fmt.Errorf("invalid kafka composite id %s", input)
	}
	offset, err := strconv.Atoi(parts[1])
	if err != nil {
		return "", 0, fmt.Errorf("invalid kafka offset in %s", input)
	}
	return parts[0], offset, nil
}
