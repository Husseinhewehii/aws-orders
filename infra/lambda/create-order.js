// infra/lambda/create-order.js
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const crypto = require('crypto');
const sqs = new SQSClient({});

exports.handler = async (event) => {
    const body = JSON.parse(event.body || '{}');
    const orderId = crypto.randomUUID();

    const payload = {
        orderId,
        amount: Number(body.amount || 0),
        currency: body.currency || 'EUR',
        createdAt: Date.now(),
    };

    await sqs.send(new SendMessageCommand({
        QueueUrl: process.env.QUEUE_URL,
        MessageBody: JSON.stringify(payload),
        // No MessageGroupId / MessageDeduplicationId on a standard queue
    }));

    return { statusCode: 202, body: JSON.stringify({ orderId }) };
};