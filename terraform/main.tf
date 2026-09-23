# The S3 bucket name is built from variables rather than hardcoded, so the
# same configuration can be reused for a different project/environment just
# by changing terraform.tfvars - no editing of this file required.
locals {
  bucket_full_name = "${var.project_name}-${var.bucket_name}-${var.environment}"
}

resource "aws_s3_bucket" "taskify_storage" {
  bucket = local.bucket_full_name

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}