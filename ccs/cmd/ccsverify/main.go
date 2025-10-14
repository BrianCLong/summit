package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"os"

	"github.com/summit/ccs"
)

func main() {
	participantsPath := flag.String("participants", "", "Path to participants JSON file")
	certificatePath := flag.String("certificate", "", "Path to sampling certificate JSON file")
	flag.Parse()

	if *participantsPath == "" || *certificatePath == "" {
		fmt.Fprintln(os.Stderr, "participants and certificate paths are required")
		flag.Usage()
		os.Exit(2)
	}

	participants, err := readParticipants(*participantsPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load participants: %v\n", err)
		os.Exit(1)
	}
	cert, err := readCertificate(*certificatePath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load certificate: %v\n", err)
		os.Exit(1)
	}

	if err := ccs.VerifyCertificate(participants, cert); err != nil {
		fmt.Fprintf(os.Stderr, "verification failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("certificate verified: cohort is reproducible and stratification satisfied")
}

func readParticipants(path string) ([]ccs.Participant, error) {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var participants []ccs.Participant
	if err := json.Unmarshal(data, &participants); err != nil {
		return nil, err
	}
	return participants, nil
}

func readCertificate(path string) (ccs.SamplingCertificate, error) {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return ccs.SamplingCertificate{}, err
	}
	var cert ccs.SamplingCertificate
	if err := json.Unmarshal(data, &cert); err != nil {
		return ccs.SamplingCertificate{}, err
	}
	return cert, nil
}
