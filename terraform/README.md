# Taskify Terraform (LocalStack)

Provisions a single AWS S3 bucket through [LocalStack](https://www.localstack.cloud/) — a
local, AWS-compatible emulator — so infrastructure-as-code concepts can be demonstrated
without a real AWS account or any paid resources.

For the full explanation (why Terraform, why LocalStack, what state is, architecture
diagram, etc.), see the **"Infrastructure Provisioning with Terraform"** section in the
[root README](../README.md#infrastructure-provisioning-with-terraform).

## Files

| File | Purpose |
|---|---|
| `versions.tf` | Pins the Terraform CLI and AWS provider versions |
| `provider.tf` | Configures the AWS provider to talk to LocalStack instead of real AWS |
| `main.tf` | Defines the one resource this project provisions: an S3 bucket |
| `variables.tf` | Input variables (`project_name`, `environment`, `bucket_name`, `aws_region`, `localstack_endpoint`) |
| `outputs.tf` | Non-sensitive outputs after `apply` (`bucket_name`, `bucket_arn`, `environment`) |
| `terraform.tfvars.example` | Copy to `terraform.tfvars` (gitignored) before running |

## Quick start

```bash
# From the repo root, start LocalStack (and the rest of Taskify, if you want it too):
docker compose up -d localstack

cd terraform
cp terraform.tfvars.example terraform.tfvars

terraform init
terraform fmt
terraform validate
terraform plan
terraform apply
```

## Verify the bucket exists

```bash
aws --endpoint-url=http://localhost:4566 s3 ls
```

## Tear down

```bash
terraform destroy
```