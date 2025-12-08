const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { log } = require('./logger');

const ddb = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(ddb);
const TABLE_NAME = process.env.TABLE_NAME;

function buildResponse(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    };
}

exports.handler = async (event, context) => {
    const requestId = context.awsRequestId;
    const functionName = context.functionName;
    const orderId = event.pathParameters?.id;

    log('INFO', 'GetOrder request received', {
        functionName,
        requestId,
        orderId,
    });

    if (!orderId) {
        log('WARN', 'Missing orderId in path', {
            functionName,
            requestId,
        });
        return buildResponse(400, { message: 'Missing order id' });
    }

    try {
        const result = await docClient.send(
            new GetCommand({
                TableName: TABLE_NAME,
                Key: {
                    PK: `ORDER#${orderId}`,
                    SK: `ORDER#${orderId}`,
                },
            })
        );

        if (!result.Item) {
            log('INFO', 'Order not found', {
                functionName,
                requestId,
                orderId,
            });
            return buildResponse(404, { message: 'Order not found' });
        }

        log('INFO', 'Order fetched successfully', {functionName, requestId, orderId,});
        return buildResponse(200, result.Item);
    } catch (err) {
        log('ERROR', 'Failed to fetch order', {
            functionName,
            requestId,
            orderId,
            errorType: err.name,
            errorMessage: err.message,
        });
        return buildResponse(500, { message: 'Failed to fetch order' });
    }
};
