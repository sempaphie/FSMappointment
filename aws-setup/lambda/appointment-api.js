// AWS Lambda function for FSM Appointment API
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.TABLE_NAME || 'fsm-appointment-instances';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'CORS preflight' })
    };
  }

  try {
    const { httpMethod, pathParameters, body, queryStringParameters } = event;
    const tenantId = queryStringParameters?.tenantId || pathParameters?.tenantId;
    
    if (!tenantId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Tenant ID is required' })
      };
    }

    switch (httpMethod) {
      case 'GET':
        return await handleGet(tenantId, pathParameters);
      case 'POST':
        return await handlePost(tenantId, body);
      case 'PUT':
        return await handlePut(tenantId, pathParameters, body);
      default:
        return {
          statusCode: 405,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Get appointment instances for a tenant
async function handleGet(tenantId, pathParameters) {
  try {
    const { token } = pathParameters || {};
    
    if (token) {
      // Get specific instance by token
      const result = await dynamodb.query({
        TableName: TABLE_NAME,
        IndexName: 'TokenIndex',
        KeyConditionExpression: 'customerAccessToken = :token',
        ExpressionAttributeValues: {
          ':token': token
        }
      }).promise();
      
      if (result.Items.length === 0) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Appointment instance not found' })
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
    } else {
      // Get all instances for tenant
      const result = await dynamodb.query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'tenantId = :tenantId',
        ExpressionAttributeValues: {
          ':tenantId': tenantId
        }
      }).promise();
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: result.Items
        })
      };
    }
  } catch (error) {
    console.error('Get error:', error);
    throw error;
  }
}

// Create appointment instances
async function handlePost(tenantId, body) {
  try {
    const requestData = JSON.parse(body);
    const { activities } = requestData;
    
    if (!activities || !Array.isArray(activities)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Activities array is required' })
      };
    }

    const instances = [];
    const now = new Date();
    const validUntil = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
    const ttl = Math.floor(validUntil.getTime() / 1000); // Unix timestamp

    for (const activity of activities) {
      const instanceId = `inst_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      const customerAccessToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      const instance = {
        tenantId,
        instanceId,
        customerAccessToken,
        customerUrl: `https://${process.env.DOMAIN || 'your-app.com'}/booking/${customerAccessToken}`,
        validFrom: now.toISOString(),
        validUntil: validUntil.toISOString(),
        ttl,
        status: 'PENDING',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        fsmActivity: {
          activityId: activity.id,
          activityCode: activity.code,
          subject: activity.subject,
          status: activity.status,
          businessPartner: activity.businessPartner,
          object: activity.object,
          serviceCallId: activity.object?.objectId,
          serviceCallNumber: activity.serviceCallNumber
        },
        customerBooking: null,
        fsmResponse: null
      };

      await dynamodb.put({
        TableName: TABLE_NAME,
        Item: instance
      }).promise();

      instances.push(instance);
    }

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: {
          instances,
          totalCreated: instances.length
        }
      })
    };
  } catch (error) {
    console.error('Post error:', error);
    throw error;
  }
}

// Update appointment instance (for customer bookings)
async function handlePut(tenantId, pathParameters, body) {
  try {
    const { token } = pathParameters || {};
    
    if (!token) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Token is required' })
      };
    }

    const updateData = JSON.parse(body);
    
    // First, find the instance by token
    const queryResult = await dynamodb.query({
      TableName: TABLE_NAME,
      IndexName: 'TokenIndex',
      KeyConditionExpression: 'customerAccessToken = :token',
      ExpressionAttributeValues: {
        ':token': token
      }
    }).promise();

    if (queryResult.Items.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Appointment instance not found' })
      };
    }

    const instance = queryResult.Items[0];
    const updatedAt = new Date().toISOString();

    // Update the instance
    await dynamodb.update({
      TableName: TABLE_NAME,
      Key: {
        tenantId: instance.tenantId,
        instanceId: instance.instanceId
      },
      UpdateExpression: 'SET customerBooking = :booking, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':booking': updateData,
        ':updatedAt': updatedAt
      }
    }).promise();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: {
          message: 'Appointment booking updated successfully'
        }
      })
    };
  } catch (error) {
    console.error('Put error:', error);
    throw error;
  }
}
