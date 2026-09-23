# Only non-sensitive, purely descriptive information is output here.
# There is nothing secret about an S3 bucket's name or ARN in a local
# LocalStack environment (there are no real credentials or access
# policies at stake), but these outputs are still deliberately limited
# to identity/metadata rather than anything resembling a credential.

output "bucket_name" {
  description = "Name of the S3 bucket that was created."
  value       = aws_s3_bucket.taskify_storage.bucket
}

output "bucket_arn" {
  description = "ARN of the S3 bucket that was created."
  value       = aws_s3_bucket.taskify_storage.arn
}

output "environment" {
  description = "Environment this infrastructure was provisioned for."
  value       = var.environment
}