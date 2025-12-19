variable "alias" {
  description = "Alias to assign to the KMS key (without the alias/ prefix)."
  type        = string
}

variable "description" {
  description = "Description for the KMS key."
  type        = string
  default     = "IntelGraph signer and policy bundle key"
}

variable "deletion_window_in_days" {
  description = "Waiting period for key deletion."
  type        = number
  default     = 30
}

variable "enable_key_rotation" {
  description = "Whether annual automatic rotation is enabled."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags to apply to resources."
  type        = map(string)
  default     = {}
}
