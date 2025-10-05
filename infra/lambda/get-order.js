const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const ddb = new DynamoDBClient({});
exports.handler = async (event) => {
    const id = event.pathParameters?.id;
    const res = await ddb.send(new GetItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: { PK:{S:`ORDER#${id}`}, SK:{S:`ORDER#${id}`} }
    }));
    if (!res.Item) return { statusCode: 404, body: 'Not found' };
    const out = {
        orderId: id,
        amount: Number(res.Item.amount.N),
        currency: res.Item.currency.S
    };
    return { statusCode: 200, body: JSON.stringify(out) };
};
