variable "gcp_project" {
  description = "The GCP project ID."
  type        = string
  default     = "your-gcp-project-id" # <<< REPLACE THIS WITH YOUR GCP PROJECT ID
}

variable "gcp_region" {
  description = "The GCP region to deploy resources in."
  type        = string
  default     = "us-central1" # <<< REPLACE THIS WITH YOUR DESIRED GCP REGION
}

variable "gcp_zone" {
  description = "The GCP zone to deploy resources in."
  type        = string
  default     = "us-central1-a" # <<< REPLACE THIS WITH YOUR DESIRED GCP ZONE
}
