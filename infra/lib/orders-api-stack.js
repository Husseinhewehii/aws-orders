// infra/lib/orders-api-stack.js
const cdk = require('aws-cdk-lib');
const { OrdersCoreConstruct } = require('./orders-core-construct');
const { OrdersMonitoringConstruct } = require('./orders-monitoring-construct');

class OrdersApiStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);

        const core = new OrdersCoreConstruct(this, 'OrdersCore');

        const monitoring = new OrdersMonitoringConstruct(this, 'OrdersMonitoring', {
            queue: core.queue,
            dlq: core.dlq,
            processFn: core.processFn,
        });

        new cdk.CfnOutput(this, 'ApiUrl', { value: core.api.apiEndpoint });
        new cdk.CfnOutput(this, 'TableName', { value: core.table.tableName });
        new cdk.CfnOutput(this, 'QueueUrl', { value: core.queue.queueUrl });
        new cdk.CfnOutput(this, 'DlqUrl', { value: core.dlq.queueUrl });
    }
}

module.exports = { OrdersApiStack };
