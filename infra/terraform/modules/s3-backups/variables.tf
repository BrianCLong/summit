variable "region" {
  type = string
}

variable "bucket_name" {
  type = string
}

variable "expiration_days" {
  type    = number
  default = 30
}

variable "tenant_partitioning_enabled" {
  type        = bool
  default     = true
  description = "Require tenant tagging on all backup uploads"
}

variable "tenant_tag_key" {
  type        = string
  default     = "tenant"
  description = "Object tag key used to partition backups by tenant"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Additional tags to apply to the backup bucket"
}
