#!/bin/bash

# Fix CORS for API Gateway
# This script enables CORS for all methods in the API Gateway

API_ID="duqc5lj1qa"
REGION="eu-north-1"

echo "🔧 Fixing CORS for API Gateway: $API_ID"

# Get the resource IDs for our endpoints
echo "📋 Getting resource IDs..."

# Get the root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path==`/`].id' --output text --region $REGION)
echo "Root resource ID: $ROOT_RESOURCE_ID"

# Get appointments resource ID
APPOINTMENTS_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path==`/appointments`].id' --output text --region $REGION)
echo "Appointments resource ID: $APPOINTMENTS_RESOURCE_ID"

# Get token resource ID
TOKEN_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path==`/appointments/token/{token}`].id' --output text --region $REGION)
echo "Token resource ID: $TOKEN_RESOURCE_ID"

if [ "$APPOINTMENTS_RESOURCE_ID" != "None" ] && [ -n "$APPOINTMENTS_RESOURCE_ID" ]; then
    echo "✅ Enabling CORS for /appointments resource..."
    
    # Enable CORS for appointments resource
    aws apigateway put-method-response \
        --rest-api-id $API_ID \
        --resource-id $APPOINTMENTS_RESOURCE_ID \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters method.response.header.Access-Control-Allow-Headers=false,method.response.header.Access-Control-Allow-Methods=false,method.response.header.Access-Control-Allow-Origin=false \
        --region $REGION

    aws apigateway put-integration-response \
        --rest-api-id $API_ID \
        --resource-id $APPOINTMENTS_RESOURCE_ID \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,POST,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
        --region $REGION

    # Enable CORS for GET and POST methods
    aws apigateway put-method-response \
        --rest-api-id $API_ID \
        --resource-id $APPOINTMENTS_RESOURCE_ID \
        --http-method GET \
        --status-code 200 \
        --response-parameters method.response.header.Access-Control-Allow-Origin=false \
        --region $REGION

    aws apigateway put-method-response \
        --rest-api-id $API_ID \
        --resource-id $APPOINTMENTS_RESOURCE_ID \
        --http-method POST \
        --status-code 200 \
        --response-parameters method.response.header.Access-Control-Allow-Origin=false \
        --region $REGION

    aws apigateway put-integration-response \
        --rest-api-id $API_ID \
        --resource-id $APPOINTMENTS_RESOURCE_ID \
        --http-method GET \
        --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
        --region $REGION

    aws apigateway put-integration-response \
        --rest-api-id $API_ID \
        --resource-id $APPOINTMENTS_RESOURCE_ID \
        --http-method POST \
        --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
        --region $REGION
fi

if [ "$TOKEN_RESOURCE_ID" != "None" ] && [ -n "$TOKEN_RESOURCE_ID" ]; then
    echo "✅ Enabling CORS for /appointments/token/{token} resource..."
    
    # Enable CORS for token resource
    aws apigateway put-method-response \
        --rest-api-id $API_ID \
        --resource-id $TOKEN_RESOURCE_ID \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters method.response.header.Access-Control-Allow-Headers=false,method.response.header.Access-Control-Allow-Methods=false,method.response.header.Access-Control-Allow-Origin=false \
        --region $REGION

    aws apigateway put-integration-response \
        --rest-api-id $API_ID \
        --resource-id $TOKEN_RESOURCE_ID \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,PUT,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
        --region $REGION

    # Enable CORS for GET and PUT methods
    aws apigateway put-method-response \
        --rest-api-id $API_ID \
        --resource-id $TOKEN_RESOURCE_ID \
        --http-method GET \
        --status-code 200 \
        --response-parameters method.response.header.Access-Control-Allow-Origin=false \
        --region $REGION

    aws apigateway put-method-response \
        --rest-api-id $API_ID \
        --resource-id $TOKEN_RESOURCE_ID \
        --http-method PUT \
        --status-code 200 \
        --response-parameters method.response.header.Access-Control-Allow-Origin=false \
        --region $REGION

    aws apigateway put-integration-response \
        --rest-api-id $API_ID \
        --resource-id $TOKEN_RESOURCE_ID \
        --http-method GET \
        --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
        --region $REGION

    aws apigateway put-integration-response \
        --rest-api-id $API_ID \
        --resource-id $TOKEN_RESOURCE_ID \
        --http-method PUT \
        --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
        --region $REGION
fi

echo "🚀 Deploying changes to API Gateway..."
aws apigateway create-deployment --rest-api-id $API_ID --stage-name prod --region $REGION

echo "✅ CORS configuration updated and deployed!"
echo "🌐 Your API should now accept requests from any origin."
