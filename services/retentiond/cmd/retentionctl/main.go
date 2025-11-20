package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/spf13/cobra"

	"github.com/summit/services/retentiond/internal/receipts"
)

func main() {
	root := &cobra.Command{Use: "retentionctl"}
	root.AddCommand(newVerifyCmd())
	if err := root.Execute(); err != nil {
		log.Fatal(err)
	}
}

func newVerifyCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "verify <receipt>",
		Short: "Verify a deletion receipt",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			path := args[0]
			file, err := os.Open(path)
			if err != nil {
				return fmt.Errorf("open receipt: %w", err)
			}
			defer file.Close()
			var receipt receipts.Receipt
			if err := json.NewDecoder(file).Decode(&receipt); err != nil {
				return fmt.Errorf("decode receipt: %w", err)
			}
			ok, err := receipts.Verify(receipt)
			if err != nil {
				return err
			}
			if !ok {
				return fmt.Errorf("receipt verification failed")
			}
			fmt.Fprintf(cmd.OutOrStdout(), "receipt %s verified (root=%s)\n", path, receipt.Root)
			return nil
		},
	}
}
