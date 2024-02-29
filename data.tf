# initialize the current caller to get their account number information
data "aws_caller_identity" "current" {}

# data to grab the mux secret from hcp vault secrets
data "hcp_vault_secrets_secret" "mux_access_token_id" {
  app_name    = "movie-app"
  secret_name = var.mux_access_token_id
}

# data to grab the mux webhook signing secret from hcp vault secrets
data "hcp_vault_secrets_secret" "mux_access_token_secret" {
  app_name    = "movie-app"
  secret_name = var.mux_access_token_secret
}

data "hcp_vault_secrets_secret" "mux_webhook_signing_secret" {
  app_name    = "movie-app"
  secret_name = var.mux_webhook_signing_secret
}

# Setup for util lambda layer
data "archive_file" "utils_layer_code_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/dist/layers/util-layer/"
  output_path = "${path.module}/lambda/dist/utils.zip"
}

# Setup for dependencies lambda layer
data "archive_file" "deps_layer_code_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/dist/layers/deps-layer/"
  output_path = "${path.module}/lambda/dist/deps.zip"
}

# template file to use for lambda
data "template_file" "lambda_to_dynamodb_iam_role_template" {
  template = file("./template/lambda_to_dynamodb_iam_role.tpl")
}

# Provides write permissions to CloudWatch Logs.
data "aws_iam_policy" "lambda_basic_execution_role_policy" {
  name = "AWSLambdaBasicExecutionRole"
}

#template file for the policy to allow lambdas to perform CRUD operations on dynamodb tables
data "template_file" "lambda_to_dynamodb_crud_policy_template" {
  template = file("./template/lambda_to_dynamodb_crud_policy.tpl")

  vars = {
    dynamodb_table = var.dynamodb_table
  }
}
