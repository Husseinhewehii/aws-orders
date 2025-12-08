const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const sqs = new SQSClient({});
const { log } = require('./logger');
const QUEUE_URL = process.env.QUEUE_URL;

function parseBody(event) {
    if (!event.body) return {};
    try {
        return JSON.parse(event.body);
    } catch (err) {
        throw new Error('Invalid JSON body');
    }
}

function buildResponse(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    };
}

function getCorrelationId(event, requestId) {
    return (
        event.headers?.['X-Correlation-Id'] ||
        event.headers?.['x-correlation-id'] ||
        requestId
    );
}

exports.handler = async (event, context) => {
    const requestId = context.awsRequestId;
    const correlationId = getCorrelationId(event, requestId);

    log('INFO', 'CreateOrder request received', {
        functionName: context.functionName,
        requestId,
        correlationId,
        rawPath: event.rawPath,
    });

    let body;
    try {
        body = parseBody(event);
    } catch (err) {
        log('ERROR', err.message, {
            functionName: context.functionName,
            requestId,
            correlationId,
        });
        return buildResponse(400, { message: err.message });
    }

    const orderId = body.orderId || `ord_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const payload = {
        ...body,
        orderId,
        correlationId,
        amount: Number(body.amount || 0),
        currency: body.currency || 'EUR',
        createdAt: Date.now(),
    };

    log('INFO', 'Enqueuing order', {
        functionName: context.functionName,
        requestId,
        correlationId,
        orderId,
    });

    const messageCommand = new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify(payload),
        MessageAttributes: {
            OrderId: { DataType: 'String', StringValue: orderId },
            CorrelationId: { DataType: 'String', StringValue: correlationId },
        },
    });

    try {
        await sqs.send(messageCommand);
        log('INFO', 'Order enqueued successfully', {
            functionName: context.functionName,
            requestId,
            correlationId,
            orderId,
        });
        return buildResponse(202, { orderId });
    } catch (err) {
        log('ERROR', 'Failed to enqueue order', {
            functionName: context.functionName,
            requestId,
            correlationId,
            orderId,
            errorType: err.name,
            errorMessage: err.message,
        });
        return buildResponse(500, { message: 'Failed to enqueue order' });
    }
};