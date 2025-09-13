# AWS DynamoDB Table for Appointment Instances
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "table_name" {
  description = "DynamoDB table name for appointment instances"
  type        = string
  default     = "fsm-appointment-instances"
}

# DynamoDB Table
resource "aws_dynamodb_table" "appointment_instances" {
  name           = var.table_name
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "tenantId"
  range_key      = "instanceId"

  attribute {
    name = "tenantId"
    type = "S"
  }

  attribute {
    name = "instanceId"
    type = "S"
  }

  attribute {
    name = "customerAccessToken"
    type = "S"
  }

  # Global Secondary Index for token-based lookups
  global_secondary_index {
    name            = "TokenIndex"
    hash_key        = "customerAccessToken"
    projection_type = "ALL"
  }

  # TTL for automatic cleanup
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name        = "FSM Appointment Instances"
    Environment = "production"
    Project     = "FSM Appointment System"
  }
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "fsm-appointment-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for DynamoDB access
resource "aws_iam_policy" "dynamodb_policy" {
  name        = "fsm-appointment-dynamodb-policy"
  description = "Policy for FSM appointment Lambda to access DynamoDB"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.appointment_instances.arn,
          "${aws_dynamodb_table.appointment_instances.arn}/index/*"
        ]
      }
    ]
  })
}

# Attach policies to role
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_dynamodb" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.dynamodb_policy.arn
}

# Outputs
output "dynamodb_table_name" {
  value = aws_dynamodb_table.appointment_instances.name
}

output "dynamodb_table_arn" {
  value = aws_dynamodb_table.appointment_instances.arn
}

output "lambda_role_arn" {
  value = aws_iam_role.lambda_role.arn
}
