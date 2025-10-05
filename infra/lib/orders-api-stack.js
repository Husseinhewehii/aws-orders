// infra/lib/orders-api-stack.js
const cdk = require('aws-cdk-lib');
const dynamodb = require('aws-cdk-lib/aws-dynamodb');
const apigwv2 = require('aws-cdk-lib/aws-apigatewayv2');
const integrations = require('aws-cdk-lib/aws-apigatewayv2-integrations');
const lambdaNode = require('aws-cdk-lib/aws-lambda-nodejs');
const lambda = require('aws-cdk-lib/aws-lambda'); // for Runtime enum
const sqs = require('aws-cdk-lib/aws-sqs');
const sources = require('aws-cdk-lib/aws-lambda-event-sources');
const cw = require('aws-cdk-lib/aws-cloudwatch');

class OrdersApiStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);

        // 1) Data: DynamoDB single-table (dev-friendly teardown)
        const table = new dynamodb.Table(this, 'OrdersTable', {
            partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // 2) Queues: main + DLQ
        const dlq = new sqs.Queue(this, 'OrdersDlq', {
            retentionPeriod: cdk.Duration.days(14),
            visibilityTimeout: cdk.Duration.seconds(30),
        });

        const queue = new sqs.Queue(this, 'OrdersQueue', {
            visibilityTimeout: cdk.Duration.seconds(30),
            deadLetterQueue: { queue: dlq, maxReceiveCount: 5 },
        });

        // 3) Lambdas
        // 3a) API writer: enqueue → returns 202
        const createFn = new lambdaNode.NodejsFunction(this, 'CreateOrderFn', {
            entry: 'lambda/create-order.js',
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                QUEUE_URL: queue.queueUrl,        // <-- used in create-order.js (process.env.QUEUE_URL)
            },
            bundling: { minify: true },
        });
        queue.grantSendMessages(createFn);

        // 3b) SQS processor: consume → write to DDB (idempotent)
        const processFn = new lambdaNode.NodejsFunction(this, 'ProcessOrderFn', {
            entry: 'lambda/process-order.js',
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                TABLE_NAME: table.tableName,      // <-- used in process-order.js (process.env.TABLE_NAME)
            },
            bundling: { minify: true },
        });
        processFn.addEventSource(new sources.SqsEventSource(queue, { batchSize: 10 }));
        table.grantReadWriteData(processFn);
        queue.grantConsumeMessages(processFn);

        // 3c) Reader: GET /orders/{id} → read from DDB
        const getFn = new lambdaNode.NodejsFunction(this, 'GetOrderFn', {
            entry: 'lambda/get-order.js',
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                TABLE_NAME: table.tableName,      // <-- used in get-order.js
            },
            bundling: { minify: true },
        });
        table.grantReadData(getFn);

        // 4) HTTP API + routes with CORS
        const api = new apigwv2.HttpApi(this, 'OrdersHttpApi', {
            corsPreflight: { allowOrigins: ['*'], allowMethods: [apigwv2.CorsHttpMethod.ANY] },
        });

        api.addRoutes({
            path: '/orders',
            methods: [apigwv2.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('CreateOrderInt', createFn),
        });

        api.addRoutes({
            path: '/orders/{id}',
            methods: [apigwv2.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetOrderInt', getFn),
        });

        // 5) Basic alarms (no notifications wired yet)
        new cw.Alarm(this, 'OrdersQueueAgeAlarm', {
            metric: queue.metricApproximateAgeOfOldestMessage(),
            evaluationPeriods: 3,
            threshold: 60, // seconds
            datapointsToAlarm: 2,
            comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        });

        new cw.Alarm(this, 'OrdersDlqMessagesAlarm', {
            metric: dlq.metricApproximateNumberOfMessagesVisible(),
            evaluationPeriods: 1,
            threshold: 1,
            comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        });

        // 6) Outputs
        new cdk.CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });
        new cdk.CfnOutput(this, 'TableName', { value: table.tableName });
        new cdk.CfnOutput(this, 'QueueUrl', { value: queue.queueUrl });
        new cdk.CfnOutput(this, 'DlqUrl', { value: dlq.queueUrl });
    }
}

module.exports = { OrdersApiStack };
