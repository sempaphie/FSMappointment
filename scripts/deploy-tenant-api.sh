#!/bin/bash

# Deploy API Gateway and Lambda functions for FSM Appointment Manager tenant management

set -e

# Configuration
STACK_NAME="fsm-appointment-tenant-api"
TEMPLATE_FILE="aws/cloudformation/api-gateway-fixed.yml"
LAMBDA_FUNCTION_FILE="aws/lambda/tenant-api.js"
PACKAGE_FILE="aws/lambda/package.json"
ENVIRONMENT=${1:-dev}
REGION=${2:-eu-north-1}

echo "🚀 Deploying FSM Appointment Manager tenant API..."
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "Stack Name: $STACK_NAME"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if template file exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ Template file not found: $TEMPLATE_FILE"
    exit 1
fi

# Create deployment package for Lambda
echo "📦 Creating Lambda deployment package..."
LAMBDA_DIR="aws/lambda"
DEPLOYMENT_PACKAGE="$LAMBDA_DIR/tenant-api.zip"

# Install dependencies and create zip
cd "$LAMBDA_DIR"
if [ -f "package.json" ]; then
    npm install --production
fi
zip -r tenant-api.zip . -x "*.zip" "*.md" "test/*"
cd - > /dev/null

echo "✅ Lambda deployment package created: $DEPLOYMENT_PACKAGE"

# Create S3 bucket if it doesn't exist
BUCKET_NAME="fsm-tenant-api-deployments-$(aws sts get-caller-identity --query Account --output text)-$REGION"
echo "🪣 Creating S3 bucket: $BUCKET_NAME"

aws s3 mb "s3://$BUCKET_NAME" --region "$REGION" 2>/dev/null || echo "Bucket already exists or creation failed"

# Upload Lambda code to S3
echo "📤 Uploading Lambda code to S3..."
aws s3 cp "$DEPLOYMENT_PACKAGE" "s3://$BUCKET_NAME/fsm-appointment-tenant-api/$ENVIRONMENT/tenant-api.zip" --region "$REGION"

# Deploy the CloudFormation stack
echo "📦 Deploying CloudFormation stack..."

aws cloudformation deploy \
    --template-file "$TEMPLATE_FILE" \
    --stack-name "$STACK_NAME-$ENVIRONMENT" \
    --region "$REGION" \
    --parameter-overrides \
        Environment="$ENVIRONMENT" \
        TenantTableName="fsm-appointment-tenants" \
        LambdaDeploymentBucket="$BUCKET_NAME" \
    --capabilities CAPABILITY_NAMED_IAM \
    --tags \
        Environment="$ENVIRONMENT" \
        Application="FSMAppointmentManager" \
        Purpose="TenantAPI"

if [ $? -eq 0 ]; then
    echo "✅ CloudFormation stack deployed successfully!"
    
    # Update Lambda function code
    echo "🔄 Updating Lambda function code..."
    
    FUNCTION_NAME=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME-$ENVIRONMENT" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`TenantApiFunctionArn`].OutputValue' \
        --output text | cut -d: -f7)
    
    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file "fileb://$DEPLOYMENT_PACKAGE" \
        --region "$REGION"
    
    echo "✅ Lambda function code updated!"
    
    # Get API Gateway URL
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME-$ENVIRONMENT" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
        --output text)
    
    echo ""
    echo "🎉 Deployment complete!"
    echo ""
    echo "📋 API Gateway URL: $API_URL"
    echo ""
    echo "🔗 Available endpoints:"
    echo "  GET  $API_URL/validate?accountId={id}&companyId={id}  - Validate tenant"
    echo "  POST $API_URL/tenant                                  - Create tenant"
    echo "  GET  $API_URL/tenant/{tenantId}                       - Get tenant"
    echo "  PUT  $API_URL/tenant/{tenantId}                       - Update tenant"
    echo ""
    echo "🌐 Environment variables for Amplify:"
    echo "  VITE_TENANT_API_URL=$API_URL"
    echo "  VITE_USE_DYNAMODB=true"
    echo "  AWS_REGION=$REGION"
    echo "  TENANT_TABLE_NAME=fsm-appointment-tenants"
    
    # Clean up deployment package
    rm -f "$DEPLOYMENT_PACKAGE"
    
else
    echo "❌ Deployment failed!"
    # Clean up deployment package
    rm -f "$DEPLOYMENT_PACKAGE"
    exit 1
fi
