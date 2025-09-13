/**
 * Lambda function for tenant management API
 * Handles CRUD operations for tenant data in DynamoDB
 */

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.TENANT_TABLE_NAME || 'fsm-appointment-tenants';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    try {
        // Handle CORS preflight
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'CORS preflight' })
            };
        }

        const { httpMethod, path, pathParameters, queryStringParameters, body } = event;
        
        // Parse path to determine operation
        const pathParts = path.split('/').filter(part => part);
        const operation = pathParts[0]; // tenant, validate, etc.
        
        switch (httpMethod) {
            case 'GET':
                if (operation === 'validate') {
                    return await validateTenant(queryStringParameters);
                } else if (operation === 'tenant') {
                    return await getTenant(pathParameters);
                }
                break;
                
            case 'POST':
                if (operation === 'tenant') {
                    return await createTenant(JSON.parse(body || '{}'));
                }
                break;
                
            case 'PUT':
                if (operation === 'tenant') {
                    return await updateTenant(pathParameters, JSON.parse(body || '{}'));
                }
                break;
                
            default:
                return {
                    statusCode: 405,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Method not allowed' })
                };
        }
        
        return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Not found' })
        };
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};

/**
 * Validate tenant existence and license
 */
async function validateTenant(queryParams) {
    const { accountId, companyId } = queryParams || {};
    
    if (!accountId || !companyId) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Missing required parameters: accountId, companyId' 
            })
        };
    }
    
    try {
        const tenantId = `${accountId}_${companyId}`;
        
        const params = {
            TableName: TABLE_NAME,
            Key: { tenantId }
        };
        
        const result = await dynamodb.get(params).promise();
        const tenant = result.Item;
        
        if (!tenant) {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    isValid: false,
                    error: 'NOT_FOUND',
                    message: 'Tenant not found. Setup required.'
                })
            };
        }
        
        if (!tenant.isActive) {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    isValid: false,
                    error: 'INACTIVE',
                    message: 'Tenant is inactive'
                })
            };
        }
        
        const now = new Date();
        const validTo = new Date(tenant.validTo);
        
        if (now > validTo) {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    isValid: false,
                    error: 'EXPIRED',
                    message: 'Tenant license has expired',
                    tenant: sanitizeTenant(tenant)
                })
            };
        }
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                isValid: true,
                tenant: sanitizeTenant(tenant),
                message: 'Tenant is valid'
            })
        };
        
    } catch (error) {
        console.error('Error validating tenant:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                isValid: false,
                error: 'ERROR',
                message: 'Error validating tenant'
            })
        };
    }
}

/**
 * Create new tenant
 */
async function createTenant(tenantData) {
    const {
        accountId,
        companyId,
        accountName,
        companyName,
        cluster,
        contactCompanyName,
        contactFullName,
        contactPhone,
        contactEmailAddress,
        clientId,
        clientSecret
    } = tenantData;
    
    // Validate required fields
    const requiredFields = [
        'accountId', 'companyId', 'accountName', 'companyName', 'cluster',
        'contactCompanyName', 'contactFullName', 'contactEmailAddress',
        'clientId', 'clientSecret'
    ];
    
    const missingFields = requiredFields.filter(field => !tenantData[field]);
    if (missingFields.length > 0) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Missing required fields',
                missingFields
            })
        };
    }
    
    try {
        const now = new Date();
        const validFrom = now.toISOString();
        const validTo = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)).toISOString(); // 14 days
        
        const tenantId = `${accountId}_${companyId}`;
        
        const newTenant = {
            tenantId,
            accountId,
            accountName,
            companyId,
            companyName,
            cluster,
            contactCompanyName,
            contactFullName,
            contactPhone,
            contactEmailAddress,
            clientId,
            clientSecret,
            validFrom,
            validTo,
            createdAt: validFrom,
            updatedAt: validFrom,
            isActive: true,
            // GSI for querying by account
            gsi1pk: `ACCOUNT#${accountId}`,
            gsi1sk: `TENANT#${tenantId}`
        };
        
        const params = {
            TableName: TABLE_NAME,
            Item: newTenant,
            ConditionExpression: 'attribute_not_exists(tenantId)'
        };
        
        await dynamodb.put(params).promise();
        
        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                tenant: sanitizeTenant(newTenant),
                message: 'Tenant created successfully'
            })
        };
        
    } catch (error) {
        if (error.code === 'ConditionalCheckFailedException') {
            return {
                statusCode: 409,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Tenant already exists',
                    message: 'A tenant with this account and company ID already exists'
                })
            };
        }
        
        console.error('Error creating tenant:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Failed to create tenant',
                message: error.message
            })
        };
    }
}

/**
 * Get tenant by ID
 */
async function getTenant(pathParams) {
    const { tenantId } = pathParams || {};
    
    if (!tenantId) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Missing tenantId parameter' 
            })
        };
    }
    
    try {
        const params = {
            TableName: TABLE_NAME,
            Key: { tenantId }
        };
        
        const result = await dynamodb.get(params).promise();
        
        if (!result.Item) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'Tenant not found' 
                })
            };
        }
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                tenant: sanitizeTenant(result.Item)
            })
        };
        
    } catch (error) {
        console.error('Error getting tenant:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Failed to get tenant',
                message: error.message
            })
        };
    }
}

/**
 * Update tenant
 */
async function updateTenant(pathParams, updateData) {
    const { tenantId } = pathParams || {};
    
    if (!tenantId) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Missing tenantId parameter' 
            })
        };
    }
    
    try {
        // Remove sensitive fields that shouldn't be updated via API
        const { clientSecret, ...safeUpdateData } = updateData;
        
        // Add updated timestamp
        safeUpdateData.updatedAt = new Date().toISOString();
        
        // Build update expression
        const updateExpressions = [];
        const expressionAttributeValues = {};
        const expressionAttributeNames = {};
        
        Object.keys(safeUpdateData).forEach((key, index) => {
            const placeholder = `:val${index}`;
            const namePlaceholder = `#attr${index}`;
            
            updateExpressions.push(`${namePlaceholder} = ${placeholder}`);
            expressionAttributeValues[placeholder] = safeUpdateData[key];
            expressionAttributeNames[namePlaceholder] = key;
        });
        
        const params = {
            TableName: TABLE_NAME,
            Key: { tenantId },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames,
            ReturnValues: 'ALL_NEW'
        };
        
        const result = await dynamodb.update(params).promise();
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                tenant: sanitizeTenant(result.Attributes),
                message: 'Tenant updated successfully'
            })
        };
        
    } catch (error) {
        console.error('Error updating tenant:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Failed to update tenant',
                message: error.message
            })
        };
    }
}

/**
 * Remove sensitive data from tenant object
 */
function sanitizeTenant(tenant) {
    if (!tenant) return null;
    
    const { clientSecret, ...sanitized } = tenant;
    return sanitized;
}
