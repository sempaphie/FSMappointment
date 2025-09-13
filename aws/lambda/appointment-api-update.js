/**
 * Lambda function for appointment management API - UPDATE NEEDED
 * This file shows the required changes to handle status updates
 * 
 * The existing appointment Lambda function needs to be updated with the following logic:
 */

// In the updateCustomerBooking function, add this logic:

const updateCustomerBooking = async (customerAccessToken, bookingData) => {
    try {
        // Get the existing appointment instance
        const getParams = {
            TableName: process.env.APPOINTMENT_TABLE_NAME,
            Key: {
                customerAccessToken: customerAccessToken
            }
        };
        
        const existingInstance = await dynamodb.get(getParams).promise();
        
        if (!existingInstance.Item) {
            throw new Error('Appointment instance not found');
        }
        
        const instance = existingInstance.Item;
        
        // Determine the new status based on whether a date was requested
        let newCustomerStatus = 'submitted';
        let newInstanceStatus = 'SUBMITTED';
        
        if (bookingData.requestedDateTime) {
            newCustomerStatus = 'requested';
            newInstanceStatus = 'REQUESTED';
        }
        
        // Update the appointment instance
        const updateParams = {
            TableName: process.env.APPOINTMENT_TABLE_NAME,
            Key: {
                customerAccessToken: customerAccessToken
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
            success: true,
            message: 'Customer booking updated successfully',
            status: newCustomerStatus
        };
        
    } catch (error) {
        console.error('Error updating customer booking:', error);
        throw error;
    }
};

// Export the function
module.exports = { updateCustomerBooking };

/**
 * REQUIRED CHANGES TO EXISTING LAMBDA:
 * 
 * 1. In the PUT /appointments/token/{token} endpoint handler:
 *    - Change the instance status from 'PENDING' to 'SUBMITTED' or 'REQUESTED'
 *    - Set the customerBooking.status to 'submitted' or 'requested'
 *    - Update the submittedAt and lastModifiedAt timestamps
 * 
 * 2. Add the logic above to determine status based on requestedDateTime field
 * 
 * 3. Ensure the DynamoDB table has the correct status values:
 *    - Instance status: 'PENDING' -> 'SUBMITTED' or 'REQUESTED'
 *    - Customer booking status: 'draft' -> 'submitted' or 'requested'
 * 
 * 4. The frontend will now:
 *    - Show form for customers only when status is 'PENDING' or 'draft'
 *    - Show summary for customers when status is 'SUBMITTED', 'REQUESTED', etc.
 *    - Always show form details for FSM users regardless of status
 */
