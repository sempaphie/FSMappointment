#!/bin/bash

# FSM Appointment AWS Deployment Script
set -e

echo "🚀 Starting FSM Appointment AWS deployment..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed. Please install it first."
    exit 1
fi

# Set variables
AWS_REGION=${AWS_REGION:-us-east-1}
TABLE_NAME=${TABLE_NAME:-fsm-appointment-instances}
FUNCTION_NAME=${FUNCTION_NAME:-fsm-appointment-api}

echo "📋 Configuration:"
echo "   AWS Region: $AWS_REGION"
echo "   DynamoDB Table: $TABLE_NAME"
echo "   Lambda Function: $FUNCTION_NAME"

# Step 1: Deploy DynamoDB table with Terraform
echo "🏗️  Deploying DynamoDB table with Terraform..."
cd terraform

# Initialize Terraform
terraform init

# Plan the deployment
terraform plan -var="aws_region=$AWS_REGION" -var="table_name=$TABLE_NAME"

# Apply the deployment
terraform apply -auto-approve -var="aws_region=$AWS_REGION" -var="table_name=$TABLE_NAME"

# Get the outputs
TABLE_ARN=$(terraform output -raw dynamodb_table_arn)
LAMBDA_ROLE_ARN=$(terraform output -raw lambda_role_arn)

echo "✅ DynamoDB table deployed successfully!"
echo "   Table ARN: $TABLE_ARN"

cd ..

# Step 2: Deploy Lambda function
echo "🔧 Deploying Lambda function..."

cd lambda

# Install dependencies
npm install

# Create deployment package
zip -r appointment-api.zip .

# Create or update Lambda function
if aws lambda get-function --function-name $FUNCTION_NAME --region $AWS_REGION &> /dev/null; then
    echo "📝 Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://appointment-api.zip \
        --region $AWS_REGION
else
    echo "🆕 Creating new Lambda function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime nodejs18.x \
        --role $LAMBDA_ROLE_ARN \
        --handler appointment-api.handler \
        --zip-file fileb://appointment-api.zip \
        --region $AWS_REGION \
        --timeout 30 \
        --memory-size 256
fi

# Set environment variables
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment Variables="{TABLE_NAME=$TABLE_NAME,DOMAIN=your-app.com}" \
    --region $AWS_REGION

echo "✅ Lambda function deployed successfully!"

cd ..

# Step 3: Create API Gateway (optional - you can also use AWS CLI or console)
echo "🌐 API Gateway setup instructions:"
echo "   1. Go to AWS API Gateway console"
echo "   2. Create a new REST API"
echo "   3. Create resources and methods as needed"
echo "   4. Deploy the API to get the endpoint URL"
echo "   5. Update VITE_AWS_API_BASE_URL in your .env file"

echo ""
echo "🎉 AWS infrastructure deployment completed!"
echo ""
echo "📝 Next steps:"
echo "   1. Set up API Gateway and get the endpoint URL"
echo "   2. Update your .env file with VITE_AWS_API_BASE_URL"
echo "   3. Update your app to use awsAppointmentService"
echo "   4. Test the integration"
echo ""
echo "🔗 Useful commands:"
echo "   - Check Lambda logs: aws logs tail /aws/lambda/$FUNCTION_NAME --follow"
echo "   - List DynamoDB items: aws dynamodb scan --table-name $TABLE_NAME --region $AWS_REGION"
