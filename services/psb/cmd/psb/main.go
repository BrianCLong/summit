package main

import (
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/spf13/cobra"

	"github.com/summit/psb/internal/files"
	"github.com/summit/psb/internal/model"
	"github.com/summit/psb/internal/sampler"
	"github.com/summit/psb/internal/server"
	"github.com/summit/psb/internal/verifier"
)

func main() {
	var (
		datasetPath    string
		privateKeyPath string
		addr           string
	)

	rootCmd := &cobra.Command{Use: "psb", Short: "Partner Sampling Broker"}

	serveCmd := &cobra.Command{
		Use:   "serve",
		Short: "Start the sampling broker HTTP server",
		RunE: func(cmd *cobra.Command, args []string) error {
			srv, err := server.New(server.Config{DatasetPath: datasetPath, PrivateKeyPath: privateKeyPath})
			if err != nil {
				return err
			}
			log.Printf("psb server listening on %s", addr)
			return http.ListenAndServe(addr, srv.Router())
		},
	}
	serveCmd.Flags().StringVar(&datasetPath, "dataset", "", "path to dataset JSON file")
	serveCmd.Flags().StringVar(&privateKeyPath, "private-key", "", "path to hex encoded ed25519 private key")
	serveCmd.Flags().StringVar(&addr, "addr", ":8080", "listen address")
	serveCmd.MarkFlagRequired("dataset")
	serveCmd.MarkFlagRequired("private-key")

	sampleCmd := &cobra.Command{
		Use:   "sample",
		Short: "Create a sample once and emit the certificate",
		RunE: func(cmd *cobra.Command, args []string) error {
			requestPath, _ := cmd.Flags().GetString("request")
			outputPath, _ := cmd.Flags().GetString("out")
			if requestPath == "" {
				return fmt.Errorf("request path is required")
			}
			dataset, err := files.LoadDataset(datasetPath)
			if err != nil {
				return err
			}
			priv, err := files.LoadPrivateKey(privateKeyPath)
			if err != nil {
				return err
			}
			samplerSvc, err := sampler.New(dataset, priv)
			if err != nil {
				return err
			}
			reqFile, err := os.Open(requestPath)
			if err != nil {
				return err
			}
			defer reqFile.Close()
			var req model.SamplingRequest
			if err := json.NewDecoder(reqFile).Decode(&req); err != nil {
				return err
			}
			resp, err := samplerSvc.Sample(req)
			if err != nil {
				return err
			}
			return files.WriteJSON(outputPath, resp)
		},
	}
	sampleCmd.Flags().StringVar(&datasetPath, "dataset", "", "path to dataset JSON file")
	sampleCmd.Flags().StringVar(&privateKeyPath, "private-key", "", "path to hex encoded ed25519 private key")
	sampleCmd.Flags().String("request", "", "path to sampling request JSON")
	sampleCmd.Flags().String("out", "", "optional path to write the sampling response as JSON")
	sampleCmd.MarkFlagRequired("dataset")
	sampleCmd.MarkFlagRequired("private-key")

	verifyCmd := &cobra.Command{
		Use:   "verify",
		Short: "Verify a sampling certificate against the dataset",
		RunE: func(cmd *cobra.Command, args []string) error {
			certPath, _ := cmd.Flags().GetString("certificate")
			if certPath == "" {
				return fmt.Errorf("certificate path is required")
			}
			dataset, err := files.LoadDataset(datasetPath)
			if err != nil {
				return err
			}
			certFile, err := os.Open(certPath)
			if err != nil {
				return err
			}
			defer certFile.Close()
			var cert model.SamplingCertificate
			if err := json.NewDecoder(certFile).Decode(&cert); err != nil {
				return err
			}
			result, err := verifier.Verify(cert, dataset)
			if err != nil {
				return err
			}
			return files.WriteJSON("", result)
		},
	}
	verifyCmd.Flags().StringVar(&datasetPath, "dataset", "", "path to dataset JSON file")
	verifyCmd.Flags().String("certificate", "", "path to sampling certificate JSON")
	verifyCmd.MarkFlagRequired("dataset")
	verifyCmd.MarkFlagRequired("certificate")

	keygenCmd := &cobra.Command{
		Use:   "generate-key",
		Short: "Generate a new ed25519 key pair",
		RunE: func(cmd *cobra.Command, args []string) error {
			privateOut, _ := cmd.Flags().GetString("private-out")
			publicOut, _ := cmd.Flags().GetString("public-out")
			if privateOut == "" || publicOut == "" {
				return fmt.Errorf("private-out and public-out must be specified")
			}
			pub, priv, err := ed25519.GenerateKey(nil)
			if err != nil {
				return err
			}
			if err := os.WriteFile(privateOut, []byte(hex.EncodeToString(priv)), 0o600); err != nil {
				return err
			}
			if err := os.WriteFile(publicOut, []byte(hex.EncodeToString(pub)), 0o644); err != nil {
				return err
			}
			fmt.Printf("generated key pair: public key %s\n", hex.EncodeToString(pub))
			return nil
		},
	}
	keygenCmd.Flags().String("private-out", "", "path to write the private key")
	keygenCmd.Flags().String("public-out", "", "path to write the public key")

	rootCmd.AddCommand(serveCmd, sampleCmd, verifyCmd, keygenCmd)

	if err := rootCmd.Execute(); err != nil {
		log.Fatal(err)
	}
}
