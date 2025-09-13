# DynamoDB Tenant Storage Setup

This document explains how to set up DynamoDB storage for the FSM Appointment Manager tenant data.

## Overview

The application uses DynamoDB to store tenant information in production, with localStorage as a fallback for development. The table name is `fsm-appointment-tenants`.

## Table Structure

### Primary Key
- **tenantId** (String): Format `accountId_companyId` (e.g., "86810_104348")

### Attributes
- **accountId** (String): FSM Account ID
- **accountName** (String): FSM Account Name
- **companyId** (String): FSM Company ID
- **companyName** (String): FSM Company Name
- **cluster** (String): FSM Cluster (e.g., "eu", "us")
- **contactCompanyName** (String): User-provided company name
- **contactFullName** (String): User-provided contact name
- **contactPhone** (String, optional): User-provided phone number
- **contactEmailAddress** (String): User-provided email address
- **clientId** (String): OAuth Client ID
- **clientSecret** (String): OAuth Client Secret (should be encrypted)
- **validFrom** (String): License start date (ISO 8601)
- **validTo** (String): License end date (ISO 8601)
- **isActive** (Boolean): Whether the tenant is active
- **createdAt** (String): Creation timestamp (ISO 8601)
- **updatedAt** (String): Last update timestamp (ISO 8601)

### Global Secondary Index (GSI1)
- **gsi1pk**: `ACCOUNT#${accountId}` (for querying by account)
- **gsi1sk**: `TENANT#${tenantId}` (for sorting)

## Deployment

### 1. Deploy the DynamoDB Table

```bash
# Deploy to development
./scripts/deploy-tenant-table.sh dev us-east-1

# Deploy to production
./scripts/deploy-tenant-table.sh prod us-east-1
```

### 2. Set Environment Variables

```bash
# For production
export NODE_ENV=production
export USE_DYNAMODB=true
export AWS_REGION=us-east-1
export TENANT_TABLE_NAME=fsm-appointment-tenants
```

### 3. Configure AWS Credentials

The application can use AWS credentials in several ways:

#### Option A: IAM Roles (Recommended for production)
- Use IAM roles attached to your compute resources (EC2, Lambda, etc.)
- No need to manage access keys

#### Option B: Environment Variables
```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
```

#### Option C: AWS CLI Configuration
```bash
aws configure
```

## Development vs Production

### Development (localStorage)
- Uses browser localStorage
- No AWS setup required
- Data persists only in current browser
- Set `USE_DYNAMODB=false` or leave `NODE_ENV=development`

### Production (DynamoDB)
- Uses AWS DynamoDB
- Requires AWS setup and credentials
- Data persists across all users and sessions
- Set `NODE_ENV=production` and `USE_DYNAMODB=true`

## Security Considerations

### 1. Client Secret Encryption
The `clientSecret` field should be encrypted before storing in DynamoDB. Consider using:
- AWS KMS for encryption
- Client-side encryption before sending to DynamoDB

### 2. IAM Permissions
The application needs the following DynamoDB permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:region:account:table/fsm-appointment-tenants",
        "arn:aws:dynamodb:region:account:table/fsm-appointment-tenants/index/*"
      ]
    }
  ]
}
```

### 3. Network Security
- Use VPC endpoints for DynamoDB if running in private subnets
- Enable encryption at rest in DynamoDB

## Monitoring and Maintenance

### CloudWatch Metrics
Monitor these DynamoDB metrics:
- `ConsumedReadCapacityUnits`
- `ConsumedWriteCapacityUnits`
- `ThrottledRequests`
- `UserErrors`

### Backup and Recovery
- Point-in-time recovery is enabled by default
- Consider creating scheduled backups for critical data

### Cost Optimization
- Use on-demand billing mode (already configured)
- Monitor usage and consider reserved capacity for predictable workloads
- Use DynamoDB Accelerator (DAX) for read-heavy workloads

## Troubleshooting

### Common Issues

1. **Access Denied**
   - Check IAM permissions
   - Verify AWS credentials
   - Ensure table exists in correct region

2. **Table Not Found**
   - Run the deployment script
   - Check table name in environment variables
   - Verify AWS region

3. **Throttling**
   - Monitor CloudWatch metrics
   - Consider increasing capacity or using on-demand mode

### Debug Mode
Enable debug logging by setting:
```bash
export DEBUG=fsm-appointment:tenant
```

## Data Migration

### From localStorage to DynamoDB
If you have existing data in localStorage, you can migrate it:

1. Export data from localStorage
2. Use the DynamoDB service to create tenants
3. Clear localStorage after migration

### Example Migration Script
```javascript
// Run in browser console to migrate localStorage data
const migrateData = async () => {
  const keys = Object.keys(localStorage).filter(key => key.startsWith('fsm_tenant_'))
  
  for (const key of keys) {
    const tenantData = JSON.parse(localStorage.getItem(key))
    // Use tenantService.createTenant() to migrate to DynamoDB
    await tenantService.createTenant(tenantData)
  }
}
```
