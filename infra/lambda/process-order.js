const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const ddb = new DynamoDBClient({});

exports.handler = async (event) => {
    for (const rec of event.Records ?? []) {
        const msg = JSON.parse(rec.body || '{}');
        const pk = `ORDER#${msg.orderId}`;
        try {
            await ddb.send(new PutItemCommand({
                TableName: process.env.TABLE_NAME,
                Item: {
                    PK: { S: pk },
                    SK: { S: pk },
                    amount: { N: String(msg.amount || 0) },
                    currency: { S: msg.currency || 'EUR' },
                    createdAt: { N: String(msg.createdAt || Date.now()) },
                },
                ConditionExpression: 'attribute_not_exists(PK)',
            }));
        } catch (err) {
            if ((err.name || '').includes('ConditionalCheckFailed')) continue;
            throw err;
        }
    }
    return {};
};
