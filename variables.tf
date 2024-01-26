variable "environment" {
  description = "Name of the execution environment"
  type        = string
}

variable "mux_access_token_id" {
  description = "access token id for mux stored in hcp vault secrets"
  type        = string
  sensitive   = true
}

variable "mux_access_token_secret" {
  description = "secret of the access token from mux stored in hcp vault secrets"
  type        = string
  sensitive   = true
}

variable "mux_webhook_signing_secret" {
  description = "signing secret of the mux webhook stored in hcp vault secrets"
  type        = string
  sensitive   = true
}

# variable "mux_secret_key" {
#   description = "Key of the mux secret stored in hcp vault secrets"
#   type        = string
#   sensitive   = true
# }

# variable "mux_webhook_signing_secret" {
#   description = "Key of the mux webhook signing secret stored in hcp vault secrets"
#   type        = string
#   sensitive   = true
# }

variable "region" {
  description = "Region of the app"
  type        = string
}

variable "put_movie_data_lambda_name" {
  description = "Name of the put_movie_data_lambda_function"
  type        = string
}

variable "lambda_handler" {
  description = "Name of the handler function for the lambda"
  type        = string
}

variable "lambda_runtime" {
  description = "Runtime of the lambda functions"
  type        = string
}

# variable "detail_type" {
#   description = "detail-type of eventbridge event"
#   type        = string
# }

variable "mux_lambda_event_source" {
  description = "source of the eventbridge event"
  type        = string
}

variable "movie_data_lambda_deps_layer_name" {
  description = "Name of the lambda dependency layer for movie data crud app"
  type        = string
}

variable "lambda_utils_layer_name" {
  description = "Name of the lambda utils layer for the movie data crud app"
  type        = string
}

variable "deps_layer_storage_key" {
  description = "Key of the S3 Object that will store deps lambda layer"
  type        = string
}

variable "utils_layer_storage_key" {
  description = "Key of the S3 object that will store utils lambda layer"
  type        = string
}

variable "lambda_to_dynamodb_iam_role" {
  description = "Name of the IAM role for the PUT movie_data_crud lambda"
  type        = string
}

variable "event_bus_name" {
  description = "Name of the event bus for sending eventbridge messages to lambda"
  type        = string
}

variable "mux_video_asset_ready" {
  description = "Event type of the mux webhook event video.asset.ready being sent to the PUT movie_data_crud lambda"
  type        = string
}

variable "mux_video_asset_created" {
  description = "Event type of mux webhook event video.asset.created being sent to PUT movie_data_crud lambda"
  type        = string
}

variable "mux_video_upload_cancelled" {
  description = "Event type of mux webhook event video.upload.cancelled being sent to PUT movie_data_crud lambda"
  type        = string
}

variable "put_movie_data_eventbridge_event_rule_name" {
  description = "Name of put_movie_data_eventbridge_event_rule"
  type        = string
}

variable "put_movie_data_dlq_name" {
  description = "Name of the dlq for put_movie_data lambda"
  type        = string
}

variable "dynamodb_table" {
  description = "Name of the dynamodb table for movie data crud app"
  type        = string
}

variable "lambda_to_dynamodb_crud_policy_name" {
  description = "Name of the policy for lambdas to perform crud operations on dynamodb tables"
  type        = string
}

variable "hcp_vault_secrets_app_name" {
  description = "Name of the app from where hcp vault will access its secrets from"
  type        = string
}

variable "apigw_name" {
  description = "Name of the api gateway"
  type        = string
}

variable "api_protocol_type" {
  description = "protocol_type for the api gateway"
  type        = string
}

variable "apigateway_stage_name" {
  description = "Name of the apigateway stage"
  type        = string
}

variable "select_all_movie_data_name" {
  description = "Name of the select_all_movie_data_lambda"
  type        = string
}

variable "get_all_apigateway_route_key" {
  description = "Route key for the GET api gateway"
  type        = string
}

variable "get_all_api_gateway_execution_arn_suffix" {
  description = "Suffix for the get all api gateway execution arn"
  type        = string
}

variable "select_specific_movie_data_name" {
  description = "Name of the select_specific_movie_data_name lambda"
  type        = string
}

variable "get_specific_apigateway_route_key" {
  description = "Route key for the GET specific api gateway"
  type        = string
}

variable "get_specific_api_gateway_execution_arn_suffix" {
  description = "Suffix for the get specific api gateway execution arn"
  type        = string
}

variable "movie_data_crud_s3_bucket" {
  description = "S3 bucket for movie data crud app"
  type        = string
}

variable "movie_data_crud_s3_bucket_name_tag" {
  description = "Name tag of the S3 bucket for movie data crud app"
  type        = string
}

variable "movie_data_crud_s3_bucket_env_tag" {
  description = "Environment tag of the S3 bucket for movie data crud app"
  type        = string
}

variable "dynamodb_hash_key" {
  description = "Hash key of the dynamo db table"
  type        = string
}

variable "dynamodb_range_key" {
  description = "Range key of the dynamo db table"
  type        = string
}
