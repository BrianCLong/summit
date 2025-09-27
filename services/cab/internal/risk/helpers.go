package risk

func chooseName(provided, fallback string) string {
	if provided != "" {
		return provided
	}
	return fallback
}
