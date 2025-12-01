package storage

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// S3Store is an ObjectStore implementation backed by AWS S3.
type S3Store struct {
	client *s3.Client
}

// NewS3Store builds an S3-backed ObjectStore.
func NewS3Store(client *s3.Client) *S3Store {
	return &S3Store{client: client}
}

// ListExpired enumerates objects older than the cutoff and returns their keys.
func (s *S3Store) ListExpired(ctx context.Context, bucket, prefix string, cutoff int64) ([]Object, error) {
	var objects []Object
	input := &s3.ListObjectsV2Input{
		Bucket: aws.String(bucket),
		Prefix: aws.String(prefix),
	}

	for {
		out, err := s.client.ListObjectsV2(ctx, input)
		if err != nil {
			return nil, fmt.Errorf("list objects: %w", err)
		}
		for _, obj := range out.Contents {
			if obj.LastModified == nil {
				continue
			}
			if obj.LastModified.Before(time.Unix(cutoff, 0)) {
				size := int64(0)
				if obj.Size != nil {
					size = aws.ToInt64(obj.Size)
				}
				objects = append(objects, Object{
					Key:       aws.ToString(obj.Key),
					Size:      size,
					UpdatedAt: obj.LastModified.Unix(),
				})
			}
		}
		if !aws.ToBool(out.IsTruncated) {
			break
		}
		input.ContinuationToken = out.NextContinuationToken
	}

	return objects, nil
}

// Delete removes a batch of objects using DeleteObjects API.
func (s *S3Store) Delete(ctx context.Context, bucket string, keys []string) error {
	if len(keys) == 0 {
		return nil
	}
	objs := make([]s3types.ObjectIdentifier, 0, len(keys))
	for _, key := range keys {
		key := key
		objs = append(objs, s3types.ObjectIdentifier{Key: aws.String(key)})
	}

	input := &s3.DeleteObjectsInput{
		Bucket: aws.String(bucket),
		Delete: &s3types.Delete{Objects: objs, Quiet: aws.Bool(true)},
	}

	if _, err := s.client.DeleteObjects(ctx, input); err != nil {
		return fmt.Errorf("delete objects: %w", err)
	}
	return nil
}

// PlanLifecycle ensures the bucket has a lifecycle rule that expires objects after
// the requested number of days. The rule is idempotent and keyed by prefix.
func (s *S3Store) PlanLifecycle(ctx context.Context, bucket string, prefix string, days int) error {
	ruleID := fmt.Sprintf("retentiond-%s-%d", prefix, days)
	config := &s3types.BucketLifecycleConfiguration{
		Rules: []s3types.LifecycleRule{
			{
				ID:     aws.String(ruleID),
				Status: s3types.ExpirationStatusEnabled,
				Filter: &s3types.LifecycleRuleFilter{Prefix: aws.String(prefix)},
				Expiration: &s3types.LifecycleExpiration{
					Days: aws.Int32(int32(days)),
				},
			},
		},
	}

	_, err := s.client.PutBucketLifecycleConfiguration(ctx, &s3.PutBucketLifecycleConfigurationInput{
		Bucket:                 aws.String(bucket),
		LifecycleConfiguration: config,
	})
	if err != nil {
		return fmt.Errorf("put lifecycle configuration: %w", err)
	}
	return nil
}
