output "cluster_name" {
  description = "EKS cluster name."
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Private EKS API endpoint."
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "api_irsa_role_arn" {
  description = "Annotate the engtrace-api Kubernetes service account with this role ARN."
  value       = aws_iam_role.api.arn
}

output "database_endpoint" {
  description = "RDS PostgreSQL endpoint."
  value       = module.database.db_instance_endpoint
  sensitive   = true
}

output "database_master_secret_arn" {
  description = "Secrets Manager ARN for the RDS-managed master credentials."
  value       = module.database.db_instance_master_user_secret_arn
  sensitive   = true
}

output "redis_primary_endpoint" {
  description = "TLS ElastiCache primary endpoint; the auth token is never output."
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true
}

output "evidence_bucket" {
  description = "Production S3 evidence bucket. MinIO is never used in this environment."
  value       = aws_s3_bucket.evidence.id
}

output "ecr_repository_urls" {
  description = "Container registry URLs for CI image publication."
  value       = { for name, repository in aws_ecr_repository.services : name => repository.repository_url }
}
