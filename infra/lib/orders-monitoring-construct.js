// infra/lib/orders-monitoring-construct.js
const cdk = require('aws-cdk-lib');
const { Construct } = require('constructs');
const cw = require('aws-cdk-lib/aws-cloudwatch');
const sns = require('aws-cdk-lib/aws-sns');
const subs = require('aws-cdk-lib/aws-sns-subscriptions');
const cw_actions = require('aws-cdk-lib/aws-cloudwatch-actions');

class OrdersMonitoringConstruct extends Construct {
    constructor(scope, id, props) {
        super(scope, id, props);

        const { queue, dlq, processFn } = props;

        // Get the stack to preserve logical IDs
        const stack = cdk.Stack.of(this);

        // 2b) Alerts SNS topic
        const alertsTopic = new sns.Topic(stack, 'OrdersAlertsTopic', {
            displayName: 'Orders Alerts',
        });

        alertsTopic.addSubscription(
            new subs.EmailSubscription('husseinhewehii@gmail.com')
        );

        // Alarm: ProcessOrderFn errors
        const processFnErrorsAlarm = new cw.Alarm(stack, 'ProcessOrderFnErrorsAlarm', {
            metric: processFn.metricErrors(),
            evaluationPeriods: 3,
            threshold: 1,
            comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            alarmDescription: 'ProcessOrderFn is failing.',
        });
        processFnErrorsAlarm.addAlarmAction(new cw_actions.SnsAction(alertsTopic));

        // Alarm: ProcessOrderFn throttles (overload)
        const processFnThrottlesAlarm = new cw.Alarm(this, 'ProcessOrderFnThrottlesAlarm', {
            metric: processFn.metricThrottles(),
            evaluationPeriods: 1,
            threshold: 1,
            comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            alarmDescription: 'ProcessOrderFn is being throttled (overloaded).',
        });
        processFnThrottlesAlarm.addAlarmAction(new cw_actions.SnsAction(alertsTopic));


        // 5) Alarms (wired to SNS)
        const queueAgeAlarm = new cw.Alarm(stack, 'OrdersQueueOldestMessageAlarm', {
            metric: queue.metricApproximateAgeOfOldestMessage(),
            evaluationPeriods: 3,
            threshold: 60, // seconds
            datapointsToAlarm: 2,
            comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            alarmDescription: 'SQS queue messages are delayed — worker may be failing or slow.',
        });
        queueAgeAlarm.addAlarmAction(new cw_actions.SnsAction(alertsTopic));

        const dlqMessagesAlarm = new cw.Alarm(this, 'OrdersDlqMessagesAlarm', {
            metric: dlq.metricApproximateNumberOfMessagesVisible(),
            evaluationPeriods: 1,
            threshold: 1,
            comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            alarmDescription: 'Orders DLQ has messages.',
        });
        dlqMessagesAlarm.addAlarmAction(new cw_actions.SnsAction(alertsTopic));
        

        // Dashboard
        const dashboard = new cw.Dashboard(stack, 'OrdersDashboard', {
            dashboardName: 'Orders-Demo',
        });

        dashboard.addWidgets(
            new cw.GraphWidget({
                title: 'SQS Queue Age & Depth',
                left: [
                    queue.metricApproximateAgeOfOldestMessage(),
                    queue.metricApproximateNumberOfMessagesVisible(),
                ],
            }),
            new cw.GraphWidget({
                title: 'ProcessOrderFn Invocations / Errors',
                left: [
                    processFn.metricInvocations(),
                    processFn.metricErrors(),
                ],
            })
        );

        // Expose the topic if needed
        this.alertsTopic = alertsTopic;
    }
}

module.exports = { OrdersMonitoringConstruct };

