# Terraform / LocalStack Evidence Screenshots

This directory holds the screenshot evidence for the Terraform + LocalStack assignment.
**No screenshots have been generated automatically** — they require an actual terminal
session running Terraform against a live LocalStack instance, which only you can produce.
The files below do not exist yet; take each screenshot and save it with the exact filename
shown so it matches what's referenced from the root README.

| Expected filename | What to capture |
|---|---|
| `terraform-plan.png` | Terminal output of `terraform plan` inside `terraform/`, showing `Plan: 1 to add, 0 to change, 0 to destroy.` and the `aws_s3_bucket.taskify_storage` resource listed to be created. |
| `terraform-apply.png` | Terminal output of `terraform apply` (after confirming with `yes`), showing `Apply complete! Resources: 1 added...` and the three outputs (`bucket_name`, `bucket_arn`, `environment`). |
| `localstack-s3.png` | Output of `aws --endpoint-url=http://localhost:4566 s3 ls` (or `s3api list-buckets`), showing the bucket actually exists inside LocalStack — this is the proof the resource was really provisioned, not just that Terraform said it would be. |
| `terraform-destroy.png` *(optional)* | Terminal output of `terraform destroy` (after confirming with `yes`), showing `Destroy complete! Resources: 1 destroyed.` |

See the **"Screenshots / Evidence"** section of the [root README](../README.md) for the
full step-by-step commands that produce each of these.