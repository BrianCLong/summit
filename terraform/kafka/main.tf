terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_msk_cluster" "main" {
  cluster_name           = var.cluster_name
  kafka_version          = var.kafka_version
  number_of_broker_nodes = var.number_of_broker_nodes

  broker_node_group_info {
    instance_type   = var.instance_type
    client_subnets  = var.subnet_ids
    security_groups = [aws_security_group.msk_sg.id]
    storage_info {
      ebs_storage_info {
        volume_size = var.volume_size
      }
    }
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
    }
  }

  configuration_info {
    arn      = aws_msk_configuration.main.arn
    revision = aws_msk_configuration.main.latest_revision
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_msk_configuration" "main" {
  kafka_versions = [var.kafka_version]
  name           = "${var.cluster_name}-config"

  server_properties = <<PROPERTIES
auto.create.topics.enable = true
delete.topic.enable = true
PROPERTIES
}

resource "aws_security_group" "msk_sg" {
  name        = "${var.cluster_name}-sg"
  description = "Security group for MSK cluster"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 9092
    to_port     = 9092
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_glue_registry" "main" {
  registry_name = "${var.cluster_name}-schema-registry"
  description   = "Schema Registry for Summit Events"
}

resource "aws_glue_schema" "events" {
  schema_name       = "summit-event"
  registry_arn      = aws_glue_registry.main.arn
  data_format       = "JSON"
  compatibility     = "BACKWARD"
  schema_definition = "{\"$id\": \"https://example.com/geographical-location.schema.json\", \"$schema\": \"https://json-schema.org/draft/2020-12/schema\", \"title\": \"SummitEvent\", \"type\": \"object\", \"properties\": {\"id\": {\"type\": \"string\"}, \"type\": {\"type\": \"string\"}, \"data\": {\"type\": \"object\"}}}"
}
