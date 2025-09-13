# API Gateway Setup for FSM Appointment System

## Current Status
- ✅ Lambda Function: `fsm-appointment-api` (deployed)
- ✅ DynamoDB Table: `fsm-appointment-instances` (deployed)
- ❌ API Gateway: Needs to be created and configured

## API Gateway Setup Steps

### 1. Create API Gateway
```bash
# Go to AWS API Gateway Console
# Create REST API
# Choose "Build" → "REST API" → "New API"
# API Name: fsm-appointment-api
# Description: FSM Appointment API
# Endpoint Type: Regional
```

### 2. Create Resources and Methods

#### Resource: `/appointments`
- **GET**: Get all appointment instances for tenant
- **POST**: Create appointment instances

#### Resource: `/appointments/token/{token}`
- **GET**: Get appointment instance by token
- **PUT**: Update customer booking

### 3. Configure Lambda Integration

For each method:
1. Select the method (GET, POST, PUT)
2. Choose "Integration type": Lambda Function
3. Use Lambda Proxy integration: ✅
4. Lambda Function: `fsm-appointment-api`
5. Save

### 4. Enable CORS
1. Select `/appointments` resource
2. Actions → Enable CORS
3. Access-Control-Allow-Origin: `*`
4. Access-Control-Allow-Headers: `Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token`
5. Access-Control-Allow-Methods: `GET,POST,PUT,DELETE,OPTIONS`
6. Enable CORS and replace existing CORS headers

### 5. Deploy API
1. Actions → Deploy API
2. Deployment stage: `prod`
3. Deploy

### 6. Get Invoke URL
After deployment, you'll get an invoke URL like:
`https://wo9bcs9cs5.execute-api.eu-north-1.amazonaws.com/prod`

## Update Environment Variables

Once API Gateway is deployed, update your `.env.local` file:

```bash
# Create .env.local file
cp env.aws.example .env.local

# Edit .env.local and update:
VITE_AWS_API_BASE_URL=https://wo9bcs9cs5.execute-api.eu-north-1.amazonaws.com/prod
```

## Test API Endpoints

### Test Lambda Function Directly
```bash
# Test the Lambda function
aws lambda invoke \
  --function-name fsm-appointment-api \
  --payload '{"httpMethod":"GET","queryStringParameters":{"tenantId":"86810-111214"}}' \
  --region eu-north-1 \
  response.json

cat response.json
```

### Test API Gateway
```bash
# Test GET all instances
curl "https://wo9bcs9cs5.execute-api.eu-north-1.amazonaws.com/prod/appointments?tenantId=86810-111214"

# Test POST create instances
curl -X POST "https://wo9bcs9cs5.execute-api.eu-north-1.amazonaws.com/prod/appointments?tenantId=86810-111214" \
  -H "Content-Type: application/json" \
  -d '{"activities":[{"id":"test","code":"TEST","subject":"Test Activity","status":"OPEN","businessPartner":"test"}]}'
```

## Current Lambda Function Details
- **Function Name**: `fsm-appointment-api`
- **Runtime**: Node.js 18.x
- **Handler**: `appointment-api.handler`
- **Environment Variables**:
  - `TABLE_NAME`: `fsm-appointment-instances`
  - `DOMAIN`: `main.d354vm8a3zuelv.amplifyapp.com`

## Next Steps
1. Create API Gateway using AWS Console
2. Configure resources and methods
3. Enable CORS
4. Deploy API
5. Update `.env.local` with correct URL
6. Test the integration
