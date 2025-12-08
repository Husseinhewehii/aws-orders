const cdk = require('aws-cdk-lib');
const { Construct } = require('constructs');
const dynamodb = require('aws-cdk-lib/aws-dynamodb');
const apigwv2 = require('aws-cdk-lib/aws-apigatewayv2');
const integrations = require('aws-cdk-lib/aws-apigatewayv2-integrations');
const lambdaNode = require('aws-cdk-lib/aws-lambda-nodejs');
const lambda = require('aws-cdk-lib/aws-lambda');
const sqs = require('aws-cdk-lib/aws-sqs');
const sources = require('aws-cdk-lib/aws-lambda-event-sources');


class OrdersCoreConstruct extends Construct {
    constructor(scope, id, props = {}) {
        super(scope, id, props);

        // Get the stack to preserve logical IDs
        const stack = cdk.Stack.of(this);

        // 1) Data: DynamoDB single-table (dev-friendly teardown)
        const table = new dynamodb.Table(stack, 'OrdersTable', {
            partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // 2) Queues: main + DLQ
        const dlq = new sqs.Queue(stack, 'OrdersDlq', {
            retentionPeriod: cdk.Duration.days(14),
            visibilityTimeout: cdk.Duration.seconds(30),
        });

        const queue = new sqs.Queue(stack, 'OrdersQueue', {
            visibilityTimeout: cdk.Duration.seconds(30),
            deadLetterQueue: { queue: dlq, maxReceiveCount: 5 },
        });

        // 3) Lambdas
        // 3a) API writer: enqueue → returns 202
        const createFn = new lambdaNode.NodejsFunction(stack, 'CreateOrderFn', {
            entry: 'lambda/create-order.js',
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                QUEUE_URL: queue.queueUrl,
            },
            bundling: { minify: true },
            tracing: lambda.Tracing.ACTIVE
        });
        queue.grantSendMessages(createFn);

        // 3b) SQS processor: consume → write to DDB (idempotent)
        const processFn = new lambdaNode.NodejsFunction(stack, 'ProcessOrderFn', {
            entry: 'lambda/process-order.js',
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                TABLE_NAME: table.tableName,
            },
            bundling: { minify: true },
            tracing: lambda.Tracing.ACTIVE
        });
        processFn.addEventSource(new sources.SqsEventSource(queue, {
            batchSize: 10,
            maxConcurrency: 2,
        }));

        table.grantReadWriteData(processFn);
        queue.grantConsumeMessages(processFn);

        // 3c) Reader: GET /orders/{id} → read from DDB
        const getFn = new lambdaNode.NodejsFunction(stack, 'GetOrderFn', {
            entry: 'lambda/get-order.js',
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                TABLE_NAME: table.tableName,
            },
            bundling: { minify: true },
            tracing: lambda.Tracing.ACTIVE
        });
        table.grantReadData(getFn);

        // 4) HTTP API + routes with CORS
        const api = new apigwv2.HttpApi(stack, 'OrdersHttpApi', {
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

        // Expose as properties
        this.table = table;
        this.queue = queue;
        this.dlq = dlq;
        this.createFn = createFn;
        this.processFn = processFn;
        this.getFn = getFn;
        this.api = api;
    }
}

module.exports = { OrdersCoreConstruct };

