#!/bin/bash

# Deploy DynamoDB table for FSM Appointment Manager tenant data

set -e

# Configuration
STACK_NAME="fsm-appointment-tenant-table"
TEMPLATE_FILE="aws/cloudformation/tenant-table.yml"
ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}

echo "🚀 Deploying FSM Appointment Manager tenant table..."
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

# Deploy the CloudFormation stack
echo "📦 Deploying CloudFormation stack..."

aws cloudformation deploy \
    --template-file "$TEMPLATE_FILE" \
    --stack-name "$STACK_NAME-$ENVIRONMENT" \
    --region "$REGION" \
    --parameter-overrides Environment="$ENVIRONMENT" \
    --capabilities CAPABILITY_NAMED_IAM \
    --tags \
        Environment="$ENVIRONMENT" \
        Application="FSMAppointmentManager" \
        Purpose="TenantData"

if [ $? -eq 0 ]; then
    echo "✅ DynamoDB table deployed successfully!"
    
    # Get table name
    TABLE_NAME=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME-$ENVIRONMENT" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`TenantTableName`].OutputValue' \
        --output text)
    
    echo "📋 Table Name: $TABLE_NAME"
    
    # Get table ARN
    TABLE_ARN=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME-$ENVIRONMENT" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`TenantTableArn`].OutputValue' \
        --output text)
    
    echo "🔗 Table ARN: $TABLE_ARN"
    
    echo ""
    echo "🎉 Deployment complete!"
    echo "You can now use the table in your application."
    echo ""
    echo "Environment variables to set:"
    echo "  AWS_REGION=$REGION"
    echo "  TENANT_TABLE_NAME=$TABLE_NAME"
    
else
    echo "❌ Deployment failed!"
    exit 1
fi
