# AWS Storage Setup for FSM Appointment System

This directory contains all the necessary files to deploy AWS infrastructure for storing appointment instances.

## 🏗️ Architecture

```
Frontend (React) → API Gateway → Lambda → DynamoDB
```

- **DynamoDB**: Stores appointment instances with automatic TTL (30 days)
- **Lambda**: Handles CRUD operations for appointment data
- **API Gateway**: Provides REST API endpoints
- **Multi-tenant**: Data isolated by tenant ID

## 📋 Prerequisites

1. **AWS CLI** installed and configured
2. **Terraform** installed
3. **Node.js** for Lambda deployment
4. **AWS Account** with appropriate permissions

## 🚀 Quick Deployment

### Option 1: Automated Script (Recommended)

```bash
# Make script executable
chmod +x deploy.sh

# Deploy everything
./deploy.sh
```

### Option 2: Manual Deployment

#### Step 1: Deploy DynamoDB Table

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

#### Step 2: Deploy Lambda Function

```bash
cd ../lambda
npm install
zip -r appointment-api.zip .
aws lambda create-function --function-name fsm-appointment-api --runtime nodejs18.x --role <ROLE_ARN> --handler appointment-api.handler --zip-file fileb://appointment-api.zip
```

#### Step 3: Set up API Gateway

1. Go to AWS API Gateway console
2. Create REST API
3. Create resources: `/appointments`
4. Create methods: GET, POST, PUT
5. Deploy API
6. Get the endpoint URL

## 🔧 Configuration

### Environment Variables

Copy `env.aws.example` to `.env.local` and update:

```bash
# AWS API Configuration
VITE_AWS_API_BASE_URL=https://your-api-gateway-url.amazonaws.com/prod
VITE_AWS_REGION=us-east-1
```

### DynamoDB Table Structure

```
Table: fsm-appointment-instances
├── Primary Key: tenantId (String) + instanceId (String)
├── GSI: TokenIndex on customerAccessToken
├── TTL: ttl (Unix timestamp, auto-deletes after 30 days)
└── Attributes:
    ├── tenantId: "86810-111214"
    ├── instanceId: "inst_1234567890_abc123"
    ├── customerAccessToken: "xyz789..."
    ├── customerUrl: "https://app.com/booking/xyz789..."
    ├── validFrom: "2025-09-13T10:00:00Z"
    ├── validUntil: "2025-10-13T10:00:00Z"
    ├── ttl: 1728835200
    ├── status: "PENDING"
    ├── fsmActivity: { ... }
    ├── customerBooking: null
    └── fsmResponse: null
```

## 📡 API Endpoints

### Get All Instances for Tenant
```
GET /appointments?tenantId={tenantId}
```

### Get Instance by Token
```
GET /appointments/token/{token}?tenantId={tenantId}
```

### Create Appointment Instances
```
POST /appointments?tenantId={tenantId}
Content-Type: application/json

{
  "activities": [
    {
      "id": "activity-id",
      "code": "activity-code",
      "subject": "Activity Subject",
      "status": "OPEN",
      "businessPartner": "partner-id",
      "object": {
        "objectId": "service-call-id",
        "objectType": "SERVICECALL"
      }
    }
  ]
}
```

### Update Customer Booking
```
PUT /appointments/token/{token}?tenantId={tenantId}
Content-Type: application/json

{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "selectedTimeSlot": {
    "id": "slot_1_9",
    "startTime": "2025-09-14T09:00:00Z",
    "endTime": "2025-09-14T11:00:00Z"
  },
  "notes": "Customer notes"
}
```

## 🔄 Switching to AWS Storage

### Update your React app:

```typescript
// In your component
import { awsAppointmentService } from '../services'

// Replace cloudAppointmentService with awsAppointmentService
const result = await awsAppointmentService.createAppointmentInstances(request)
```

### Update service imports:

```typescript
// In src/services/index.ts or your component
import { awsAppointmentService } from './awsAppointmentService'

// Use awsAppointmentService instead of appointmentServiceCloud
```

## 🧪 Testing

### Test Lambda Function

```bash
# Test locally (if you have AWS SAM)
sam local invoke

# Test deployed function
aws lambda invoke --function-name fsm-appointment-api --payload '{"httpMethod":"GET","queryStringParameters":{"tenantId":"86810-111214"}}' response.json
```

### Test DynamoDB

```bash
# List all items
aws dynamodb scan --table-name fsm-appointment-instances

# Query by tenant
aws dynamodb query --table-name fsm-appointment-instances --key-condition-expression "tenantId = :tid" --expression-attribute-values '{":tid":{"S":"86810-111214"}}'
```

## 📊 Monitoring

### CloudWatch Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/fsm-appointment-api --follow
```

### CloudWatch Metrics

- Lambda invocations, errors, duration
- DynamoDB read/write capacity
- API Gateway request count, latency

## 🧹 Cleanup

```bash
# Destroy Terraform resources
cd terraform
terraform destroy

# Delete Lambda function
aws lambda delete-function --function-name fsm-appointment-api
```

## 🔒 Security

- **IAM Roles**: Least privilege access
- **CORS**: Configured for web app
- **TTL**: Automatic data cleanup
- **Multi-tenant**: Data isolation by tenant ID

## 🚨 Troubleshooting

### Common Issues

1. **Lambda timeout**: Increase timeout in function configuration
2. **CORS errors**: Check API Gateway CORS settings
3. **Permission denied**: Verify IAM role permissions
4. **Table not found**: Check DynamoDB table name and region

### Debug Commands

```bash
# Check Lambda configuration
aws lambda get-function-configuration --function-name fsm-appointment-api

# Check DynamoDB table
aws dynamodb describe-table --table-name fsm-appointment-instances

# View recent logs
aws logs describe-log-streams --log-group-name /aws/lambda/fsm-appointment-api
```
