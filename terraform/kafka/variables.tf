variable "cluster_name" {
  description = "Name of the MSK cluster"
  type        = string
  default     = "summit-events"
}

variable "kafka_version" {
  description = "Apache Kafka version"
  type        = string
  default     = "3.4.0"
}

variable "number_of_broker_nodes" {
  description = "Number of broker nodes"
  type        = number
  default     = 3
}

variable "instance_type" {
  description = "Instance type for broker nodes"
  type        = string
  default     = "kafka.m5.large"
}

variable "volume_size" {
  description = "EBS volume size in GB"
  type        = number
  default     = 1000
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "subnet_ids" {
  description = "List of subnet IDs for MSK brokers"
  type        = list(string)
}

variable "vpc_id" {
  description = "VPC ID where MSK cluster will be deployed"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block of the VPC for security group rules"
  type        = string
}
