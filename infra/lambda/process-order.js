const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { log } = require('./logger');

const ddb = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(ddb);
const TABLE_NAME = process.env.TABLE_NAME;
const AWSXRay = require('aws-xray-sdk-core');

function parseRecordBody(record) {
    if (!record.body) return {};
    try {
        return JSON.parse(record.body);
    } catch (err) {
        throw new Error('Invalid SQS message body');
    }
}

function getOrderId(body, record) {
    return (
        body.orderId ||
        record.messageAttributes?.OrderId?.StringValue ||
        'unknown'
    );
}

function getCorrelationId(body, record, requestId) {
    return (
        body.correlationId ||
        record.messageAttributes?.CorrelationId?.StringValue ||
        requestId
    );
}

function buildDdbItem(orderId, body) {
    return {
        PK: `ORDER#${orderId}`,
        SK: `ORDER#${orderId}`,
        ...body,
    };
}

exports.handler = async (event, context) => {
    const requestId = context.awsRequestId;
    const functionName = context.functionName;
    const records = event.Records || [];

    log('INFO', 'ProcessOrder batch received', {
        functionName,
        requestId,
        recordCount: records.length,
    });

    for (const record of records) {
        let body;
        try {
            body = parseRecordBody(record);
        } catch (err) {
            log('ERROR', err.message, {
                functionName,
                requestId,
                rawBody: record.body,
                errorType: err.name,
                errorMessage: err.message,
            });
            continue;
        }

        const orderId = getOrderId(body, record);
        const correlationId = getCorrelationId(body, record, requestId);

        const segment = AWSXRay.getSegment();
        if (segment) {
            segment.addAnnotation('orderId', orderId);
            segment.addAnnotation('correlationId', correlationId);
        }


        log('INFO', 'Processing single order message', {
            functionName,
            requestId,
            correlationId,
            orderId,
        });

        const item = buildDdbItem(orderId, body);

        try {
            await docClient.send(
                new PutCommand({
                    TableName: TABLE_NAME,
                    Item: item
                })
            );

            log('INFO', 'Order processed and stored', {
                functionName,
                requestId,
                correlationId,
                orderId,
            });
        } catch (err) {
            log('ERROR', 'Failed to process order', {
                functionName,
                requestId,
                correlationId,
                orderId,
                errorType: err.name,
                errorMessage: err.message,
            });
            throw err;
        }
    }
};
