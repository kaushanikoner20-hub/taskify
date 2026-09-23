variable "project_name" {
  description = "Name of the project. Used as a prefix when building the final bucket name."
  type        = string
  default     = "taskify"
}

variable "environment" {
  description = "Deployment environment name (e.g. local, dev, staging). Used in the final bucket name and as a resource tag."
  type        = string
  default     = "local"
}

variable "bucket_name" {
  description = "Base/short name for the S3 bucket, without the project or environment prefix/suffix. The final bucket name is built as <project_name>-<bucket_name>-<environment>."
  type        = string
  default     = "storage"
}

variable "aws_region" {
  description = "AWS region to configure the provider with. LocalStack does not host real infrastructure in any region, but the AWS provider still requires a syntactically valid region name."
  type        = string
  default     = "us-east-1"
}

variable "localstack_endpoint" {
  description = "URL where LocalStack's S3 service is reachable. Defaults to LocalStack's standard local port when running via docker-compose or `docker run -p 4566:4566`."
  type        = string
  default     = "http://localhost:4566"
}