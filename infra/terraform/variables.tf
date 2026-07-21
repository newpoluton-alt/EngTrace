variable "aws_region" {
  description = "AWS region for the EngTrace production platform."
  type        = string
  default     = "eu-central-1"
}

variable "name" {
  description = "Short application name used in resource identifiers."
  type        = string
  default     = "engtrace"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}$", var.name))
    error_message = "name must be a lowercase, DNS-safe identifier."
  }
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "production"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production."
  }
}

variable "vpc_cidr" {
  description = "CIDR range for the EngTrace VPC."
  type        = string
  default     = "10.42.0.0/16"
}

variable "kubernetes_version" {
  description = "Amazon EKS Kubernetes minor version."
  type        = string
  default     = "1.35"
}

variable "cluster_endpoint_public_access" {
  description = "Expose the EKS API publicly. Keep false unless restricted CIDRs are supplied."
  type        = bool
  default     = false
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "CIDRs allowed to reach the public EKS API endpoint when enabled."
  type        = list(string)
  default     = []
}

variable "enable_cluster_creator_admin_permissions" {
  description = "Grant the Terraform caller cluster-admin during initial platform setup."
  type        = bool
  default     = false
}

variable "node_instance_types" {
  description = "Allowed instance types for the general EKS managed node group."
  type        = list(string)
  default     = ["m7g.large"]
}

variable "db_engine_version" {
  description = "RDS for PostgreSQL version supporting the pgvector extension."
  type        = string
  default     = "17.10"
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.medium"
}

variable "db_master_username" {
  description = "RDS master username; its password is managed by RDS in Secrets Manager."
  type        = string
  default     = "engtrace_admin"
}

variable "redis_node_type" {
  description = "ElastiCache node type."
  type        = string
  default     = "cache.t4g.small"
}

variable "redis_auth_token" {
  description = "ElastiCache auth token supplied through a secure TF_VAR value; never commit it."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.redis_auth_token) >= 32 && length(var.redis_auth_token) <= 128
    error_message = "redis_auth_token must contain between 32 and 128 characters."
  }
}

variable "evidence_bucket_name" {
  description = "Globally unique S3 evidence bucket name; null derives one from account and region."
  type        = string
  default     = null
  nullable    = true
}

variable "tags" {
  description = "Additional tags applied to all supported AWS resources."
  type        = map(string)
  default     = {}
}
