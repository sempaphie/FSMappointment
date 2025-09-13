#!/bin/bash

# API Gateway Setup Script for FSM Appointment System
set -e

echo "🚀 Setting up API Gateway for FSM Appointment System..."

# Variables
API_NAME="fsm-appointment-api"
LAMBDA_FUNCTION_NAME="fsm-appointment-api"
REGION="eu-north-1"

echo "📋 Configuration:"
echo "   API Name: $API_NAME"
echo "   Lambda Function: $LAMBDA_FUNCTION_NAME"
echo "   Region: $REGION"

# Step 1: Create REST API
echo "🏗️  Creating REST API..."
API_ID=$(aws apigateway create-rest-api \
  --name $API_NAME \
  --description "FSM Appointment API" \
  --endpoint-configuration types=REGIONAL \
  --region $REGION \
  --query 'id' \
  --output text)

echo "✅ API created with ID: $API_ID"

# Step 2: Get root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query 'items[0].id' \
  --output text)

echo "✅ Root resource ID: $ROOT_RESOURCE_ID"

# Step 3: Create /appointments resource
echo "🔧 Creating /appointments resource..."
APPOINTMENTS_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_RESOURCE_ID \
  --path-part appointments \
  --region $REGION \
  --query 'id' \
  --output text)

echo "✅ /appointments resource created with ID: $APPOINTMENTS_RESOURCE_ID"

# Step 4: Create /token resource under /appointments
echo "🔧 Creating /token resource..."
TOKEN_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $APPOINTMENTS_RESOURCE_ID \
  --path-part token \
  --region $REGION \
  --query 'id' \
  --output text)

echo "✅ /token resource created with ID: $TOKEN_RESOURCE_ID"

# Step 5: Create {token} resource under /token
echo "🔧 Creating {token} resource..."
TOKEN_PARAM_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $TOKEN_RESOURCE_ID \
  --path-part '{token}' \
  --region $REGION \
  --query 'id' \
  --output text)

echo "✅ {token} resource created with ID: $TOKEN_PARAM_RESOURCE_ID"

# Step 6: Create methods
echo "🔧 Creating HTTP methods..."

# GET /appointments
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $APPOINTMENTS_RESOURCE_ID \
  --http-method GET \
  --authorization-type NONE \
  --region $REGION

# POST /appointments
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $APPOINTMENTS_RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE \
  --region $REGION

# GET /appointments/token/{token}
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $TOKEN_PARAM_RESOURCE_ID \
  --http-method GET \
  --authorization-type NONE \
  --region $REGION

# PUT /appointments/token/{token}
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $TOKEN_PARAM_RESOURCE_ID \
  --http-method PUT \
  --authorization-type NONE \
  --region $REGION

echo "✅ HTTP methods created"

# Step 7: Configure Lambda integrations
echo "🔧 Configuring Lambda integrations..."

LAMBDA_URI="arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$(aws sts get-caller-identity --query Account --output text):function:$LAMBDA_FUNCTION_NAME/invocations"

# GET /appointments
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $APPOINTMENTS_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri $LAMBDA_URI \
  --region $REGION

# POST /appointments
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $APPOINTMENTS_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri $LAMBDA_URI \
  --region $REGION

# GET /appointments/token/{token}
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $TOKEN_PARAM_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri $LAMBDA_URI \
  --region $REGION

# PUT /appointments/token/{token}
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $TOKEN_PARAM_RESOURCE_ID \
  --http-method PUT \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri $LAMBDA_URI \
  --region $REGION

echo "✅ Lambda integrations configured"

# Step 8: Add Lambda permission for API Gateway
echo "🔧 Adding Lambda permission for API Gateway..."

aws lambda add-permission \
  --function-name $LAMBDA_FUNCTION_NAME \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$(aws sts get-caller-identity --query Account --output text):$API_ID/*/*" \
  --region $REGION

echo "✅ Lambda permission added"

# Step 9: Deploy API
echo "🚀 Deploying API..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --region $REGION

echo "✅ API deployed to prod stage"

# Step 10: Get API URL
API_URL="https://$API_ID.execute-api.$REGION.amazonaws.com/prod"
echo ""
echo "🎉 API Gateway setup completed!"
echo ""
echo "📡 API URL: $API_URL"
echo ""
echo "🔗 Endpoints:"
echo "   GET    $API_URL/appointments?tenantId={tenantId}"
echo "   POST   $API_URL/appointments?tenantId={tenantId}"
echo "   GET    $API_URL/appointments/token/{token}?tenantId={tenantId}"
echo "   PUT    $API_URL/appointments/token/{token}?tenantId={tenantId}"
echo ""
echo "📝 Next steps:"
echo "   1. Update .env.local with VITE_AWS_API_BASE_URL=$API_URL"
echo "   2. Test the API endpoints"
echo "   3. Redeploy your React app"
echo ""
echo "🧪 Test commands:"
echo "   curl \"$API_URL/appointments?tenantId=86810-111214\""
echo ""
