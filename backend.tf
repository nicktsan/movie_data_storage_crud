terraform {
  //This backend was already created in a different project: https://github.com/nicktsan/aws_backend
  backend "s3" {
    bucket               = "movies-terraform-backend2"
    key                  = "terraform.tfstate"
    region               = "us-east-1"
    workspace_key_prefix = "movie_data_storage_crud"
    dynamodb_table       = "movies-db-backend"
    encrypt              = true
  }
}
