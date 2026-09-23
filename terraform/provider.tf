# The AWS provider is pointed entirely at LocalStack, not real AWS.
#
# - access_key/secret_key are dummy values - LocalStack requires *something*
#   to be set (the AWS SDK refuses to build a request with no credentials
#   at all), but it never validates them against a real AWS account.
# - skip_credentials_validation / skip_metadata_api_check /
#   skip_requesting_account_id all disable calls the provider would
#   normally make to real AWS to validate the caller identity - those
#   calls would hang or fail against LocalStack.
# - s3_use_path_style = true is required for LocalStack's S3
#   implementation: real AWS resolves buckets via virtual-hosted-style
#   DNS (my-bucket.s3.amazonaws.com), which cannot resolve to a local
#   container, so LocalStack instead expects path-style requests
#   (localhost:4566/my-bucket).
provider "aws" {
  region = var.aws_region

  access_key = "test"
  secret_key = "test"

  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  s3_use_path_style = true

  endpoints {
    s3 = var.localstack_endpoint
  }
}