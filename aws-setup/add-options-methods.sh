#!/bin/bash

# Add OPTIONS methods for CORS preflight requests
API_ID="duqc5lj1qa"
REGION="eu-north-1"

echo "🔧 Adding OPTIONS methods for CORS preflight..."

# Get resource IDs
APPOINTMENTS_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path==`/appointments`].id' --output text --region $REGION)
TOKEN_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path==`/appointments/token/{token}`].id' --output text --region $REGION)

echo "Appointments resource ID: $APPOINTMENTS_RESOURCE_ID"
echo "Token resource ID: $TOKEN_RESOURCE_ID"

# Add OPTIONS method for appointments resource
if [ "$APPOINTMENTS_RESOURCE_ID" != "None" ] && [ -n "$APPOINTMENTS_RESOURCE_ID" ]; then
    echo "✅ Adding OPTIONS method for /appointments..."
    
    # Create OPTIONS method
    aws apigateway put-method \
        --rest-api-id $API_ID \
        --resource-id $APPOINTMENTS_RESOURCE_ID \
        --http-method OPTIONS \
        --authorization-type NONE \
        --region $REGION

    # Create mock integration for OPTIONS
    aws apigateway put-integration \
        --rest-api-id $API_ID \
        --resource-id $APPOINTMENTS_RESOURCE_ID \
        --http-method OPTIONS \
        --type MOCK \
        --request-templates '{"application/json":"{\"statusCode\": 200}"}' \
        --region $REGION

    # Add method response for OPTIONS
    aws apigateway put-method-response \
        --rest-api-id $API_ID \
        --resource-id $APPOINTMENTS_RESOURCE_ID \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Headers": false, "method.response.header.Access-Control-Allow-Methods": false, "method.response.header.Access-Control-Allow-Origin": false}' \
        --region $REGION

    # Add integration response for OPTIONS
    aws apigateway put-integration-response \
        --rest-api-id $API_ID \
        --resource-id $APPOINTMENTS_RESOURCE_ID \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Headers": "'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'", "method.response.header.Access-Control-Allow-Methods": "'"'"'GET,POST,OPTIONS'"'"'", "method.response.header.Access-Control-Allow-Origin": "'"'"'*'"'"'"}' \
        --region $REGION
fi

# Add OPTIONS method for token resource
if [ "$TOKEN_RESOURCE_ID" != "None" ] && [ -n "$TOKEN_RESOURCE_ID" ]; then
    echo "✅ Adding OPTIONS method for /appointments/token/{token}..."
    
    # Create OPTIONS method
    aws apigateway put-method \
        --rest-api-id $API_ID \
        --resource-id $TOKEN_RESOURCE_ID \
        --http-method OPTIONS \
        --authorization-type NONE \
        --region $REGION

    # Create mock integration for OPTIONS
    aws apigateway put-integration \
        --rest-api-id $API_ID \
        --resource-id $TOKEN_RESOURCE_ID \
        --http-method OPTIONS \
        --type MOCK \
        --request-templates '{"application/json":"{\"statusCode\": 200}"}' \
        --region $REGION

    # Add method response for OPTIONS
    aws apigateway put-method-response \
        --rest-api-id $API_ID \
        --resource-id $TOKEN_RESOURCE_ID \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Headers": false, "method.response.header.Access-Control-Allow-Methods": false, "method.response.header.Access-Control-Allow-Origin": false}' \
        --region $REGION

    # Add integration response for OPTIONS
    aws apigateway put-integration-response \
        --rest-api-id $API_ID \
        --resource-id $TOKEN_RESOURCE_ID \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Headers": "'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'", "method.response.header.Access-Control-Allow-Methods": "'"'"'GET,PUT,OPTIONS'"'"'", "method.response.header.Access-Control-Allow-Origin": "'"'"'*'"'"'"}' \
        --region $REGION
fi

echo "🚀 Deploying changes to API Gateway..."
aws apigateway create-deployment --rest-api-id $API_ID --stage-name prod --region $REGION

echo "✅ OPTIONS methods added and deployed!"
echo "🌐 CORS preflight requests should now work."
