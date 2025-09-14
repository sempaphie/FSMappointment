/**
 * Lambda function for tenant management API
 * Handles CRUD operations for tenant data in DynamoDB
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const TENANT_TABLE_NAME = process.env.TENANT_TABLE_NAME || 'fsm-appointment-tenants';
const APPOINTMENT_TABLE_NAME = process.env.APPOINTMENT_TABLE_NAME || 'fsm-appointment-instances';

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
                } else if (operation === 'appointments') {
                    return await handleAppointmentGet(pathParts, queryStringParameters);
                }
                break;
                
            case 'POST':
                if (operation === 'tenant') {
                    return await createTenant(JSON.parse(body || '{}'));
                } else if (operation === 'appointments') {
                    const requestData = JSON.parse(body || '{}');
                    // Add tenantId from query parameters to the request data
                    if (queryStringParameters?.tenantId) {
                        requestData.tenantId = queryStringParameters.tenantId;
                    }
                    return await handleAppointmentPost(requestData);
                }
                break;
                
            case 'PUT':
                if (operation === 'tenant') {
                    return await updateTenant(pathParameters, JSON.parse(body || '{}'));
                } else if (operation === 'appointments') {
                    return await handleAppointmentPut(pathParts, JSON.parse(body || '{}'));
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
            TableName: TENANT_TABLE_NAME,
            Key: { tenantId }
        };
        
        const result = await dynamodb.send(new GetCommand(params));
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
            TableName: TENANT_TABLE_NAME,
            Item: newTenant,
            ConditionExpression: 'attribute_not_exists(tenantId)'
        };
        
        await dynamodb.send(new PutCommand(params));
        
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
            TableName: TENANT_TABLE_NAME,
            Key: { tenantId }
        };
        
        const result = await dynamodb.send(new GetCommand(params));
        
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
            TableName: TENANT_TABLE_NAME,
            Key: { tenantId },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames,
            ReturnValues: 'ALL_NEW'
        };
        
        const result = await dynamodb.send(new UpdateCommand(params));
        
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

// ============================================================================
// APPOINTMENT HANDLERS
// ============================================================================

/**
 * Handle GET requests for appointments
 */
async function handleAppointmentGet(pathParts, queryParams) {
    try {
        console.log('Handling appointment GET request:', { pathParts, queryParams });
        
        // Check if it's a token-based request: /appointments/token/{token}
        if (pathParts.length >= 3 && pathParts[1] === 'token') {
            const token = pathParts[2];
            return await getAppointmentInstanceByToken(token);
        }
        
        // Check if it's a tenant-based request: /appointments?tenantId={id}
        if (queryParams && queryParams.tenantId) {
            return await getAllAppointmentInstancesForTenant(queryParams.tenantId);
        }
        
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Invalid appointment request' })
        };
        
    } catch (error) {
        console.error('Error handling appointment GET:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Failed to get appointment',
                message: error.message
            })
        };
    }
}

/**
 * Handle POST requests for appointments
 */
async function handleAppointmentPost(requestBody) {
    try {
        console.log('Handling appointment POST request:', requestBody);
        
        // Create appointment instances
        return await createAppointmentInstances(requestBody);
        
    } catch (error) {
        console.error('Error handling appointment POST:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Failed to create appointments',
                message: error.message
            })
        };
    }
}

/**
 * Handle PUT requests for appointments
 */
async function handleAppointmentPut(pathParts, requestBody) {
    try {
        console.log('Handling appointment PUT request:', { pathParts, requestBody });
        
        // Check if it's a token-based update: /appointments/token/{token}
        if (pathParts.length >= 3 && pathParts[1] === 'token') {
            const token = pathParts[2];
            return await updateCustomerBooking(token, requestBody);
        }
        
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Invalid appointment update request' })
        };
        
    } catch (error) {
        console.error('Error handling appointment PUT:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Failed to update appointment',
                message: error.message
            })
        };
    }
}

/**
 * Get appointment instance by customer access token
 */
async function getAppointmentInstanceByToken(customerAccessToken) {
    try {
        console.log('Getting appointment instance by token:', customerAccessToken);
        
        // Scan the table to find the item with matching customerAccessToken
        const params = {
            TableName: APPOINTMENT_TABLE_NAME,
            FilterExpression: 'customerAccessToken = :token',
            ExpressionAttributeValues: {
                ':token': customerAccessToken
            }
        };
        
        const result = await dynamodb.send(new ScanCommand(params));
        
        if (!result.Items || result.Items.length === 0) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: 'Appointment instance not found'
                })
            };
        }
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                data: result.Items[0]
            })
        };
        
    } catch (error) {
        console.error('Error getting appointment instance:', error);
        throw error;
    }
}

/**
 * Get all appointment instances for a tenant
 */
async function getAllAppointmentInstancesForTenant(tenantId) {
    try {
        console.log('Getting all appointment instances for tenant:', tenantId);
        
        const params = {
            TableName: APPOINTMENT_TABLE_NAME,
            FilterExpression: 'tenantId = :tenantId',
            ExpressionAttributeValues: {
                ':tenantId': tenantId
            }
        };
        
        const result = await dynamodb.send(new ScanCommand(params));
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                data: result.Items || []
            })
        };
        
    } catch (error) {
        console.error('Error getting appointment instances for tenant:', error);
        throw error;
    }
}

/**
 * Create appointment instances
 */
async function createAppointmentInstances(request) {
    try {
        console.log('Creating appointment instances:', request);
        
        const { activityIds, activities, tenantId } = request;
        
        if (!activityIds || !activities || !tenantId) {
            throw new Error('Missing required fields: activityIds, activities, tenantId');
        }
        
        const instances = [];
        
        for (let i = 0; i < activityIds.length; i++) {
            const activityId = activityIds[i];
            const activity = activities[i];
            
            // Generate unique customer access token and instance ID
            const customerAccessToken = generateCustomerAccessToken();
            const instanceId = `inst_${Date.now()}_${generateCustomerAccessToken()}`;
            
            const instance = {
                tenantId,
                instanceId,
                customerAccessToken,
                fsmActivity: {
                    id: activity.id,
                    code: activity.code,
                    subject: activity.subject,
                    status: activity.status,
                    businessPartner: activity.businessPartner,
                    object: activity.object,
                    equipment: activity.equipment || {}
                },
                status: 'PENDING',
                validFrom: new Date().toISOString(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                customerBooking: {
                    status: 'draft'
                }
            };
            
            // Save to DynamoDB
            const params = {
                TableName: APPOINTMENT_TABLE_NAME,
                Item: instance
            };
            
            await dynamodb.send(new PutCommand(params));
            instances.push(instance);
        }
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                data: { instances }
            })
        };
        
    } catch (error) {
        console.error('Error creating appointment instances:', error);
        throw error;
    }
}

/**
 * Update customer booking
 */
async function updateCustomerBooking(customerAccessToken, bookingData) {
    try {
        console.log('Updating customer booking:', { customerAccessToken, bookingData });
        
        // First, find the existing appointment instance by scanning for customerAccessToken
        const scanParams = {
            TableName: APPOINTMENT_TABLE_NAME,
            FilterExpression: 'customerAccessToken = :token',
            ExpressionAttributeValues: {
                ':token': customerAccessToken
            }
        };
        
        const scanResult = await dynamodb.scan(scanParams).promise();
        
        if (!scanResult.Items || scanResult.Items.length === 0) {
            throw new Error('Appointment instance not found');
        }
        
        const instance = scanResult.Items[0];
        
        // Determine the new status based on whether a date was requested
        let newCustomerStatus = 'submitted';
        let newInstanceStatus = 'SUBMITTED';
        
        if (bookingData.requestedDateTime) {
            newCustomerStatus = 'requested';
            newInstanceStatus = 'REQUESTED';
        }
        
        // Update the appointment instance using the correct primary key
        const updateParams = {
            TableName: APPOINTMENT_TABLE_NAME,
            Key: {
                tenantId: instance.tenantId,
                instanceId: instance.instanceId
            },
            UpdateExpression: 'SET #status = :status, customerBooking = :customerBooking, updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': newInstanceStatus,
                ':customerBooking': {
                    ...instance.customerBooking,
                    ...bookingData,
                    status: newCustomerStatus,
                    submittedAt: new Date().toISOString(),
                    lastModifiedAt: new Date().toISOString()
                },
                ':updatedAt': new Date().toISOString()
            }
        };
        
        await dynamodb.update(updateParams).promise();
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'Customer booking updated successfully',
                status: newCustomerStatus
            })
        };
        
    } catch (error) {
        console.error('Error updating customer booking:', error);
        throw error;
    }
}

/**
 * Generate a unique customer access token
 */
function generateCustomerAccessToken() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 20; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
