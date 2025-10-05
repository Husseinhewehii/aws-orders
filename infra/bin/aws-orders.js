#!/usr/bin/env node
const cdk = require('aws-cdk-lib');
const { OrdersBootstrapStack } = require('../lib/aws-orders-stack');
const { OrdersApiStack } = require('../lib/orders-api-stack');

const app = new cdk.App();

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'eu-central-1' };

new OrdersBootstrapStack(app, 'OrdersBootstrapStack', { env });
new OrdersApiStack(app, 'OrdersApiStack', { env });
