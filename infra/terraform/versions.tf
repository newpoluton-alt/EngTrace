terraform {
  required_version = ">= 1.15.0, < 2.0.0"

  # Supply bucket, key, region, DynamoDB lock table, and encryption settings at
  # init time; production state must never be stored in this repository.
  backend "s3" {}

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.55"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(
      {
        Application = "EngTrace"
        Environment = var.environment
        ManagedBy   = "Terraform"
      },
      var.tags,
    )
  }
}
