package storage

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
)

type FileSystemScanner struct{}

func NewFileSystemScanner() *FileSystemScanner {
	return &FileSystemScanner{}
}

func (s *FileSystemScanner) Scan(path string) ([]Artifact, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, fmt.Errorf("stat %s: %w", path, err)
	}
	var artifacts []Artifact
	if info.IsDir() {
		err = filepath.WalkDir(path, func(p string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if d.IsDir() {
				return nil
			}
			if filepath.Ext(d.Name()) != ".json" {
				return nil
			}
			items, err := readArtifactsFile(p)
			if err != nil {
				return err
			}
			artifacts = append(artifacts, items...)
			return nil
		})
		if err != nil {
			return nil, err
		}
		return artifacts, nil
	}
	return readArtifactsFile(path)
}

func readArtifactsFile(path string) ([]Artifact, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}
	var out []Artifact
	if err := json.Unmarshal(raw, &out); err == nil {
		return out, nil
	}
	var single Artifact
	if err := json.Unmarshal(raw, &single); err == nil {
		return []Artifact{single}, nil
	}
	return nil, fmt.Errorf("file %s does not contain valid artifact definitions", path)
}
