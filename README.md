# AWS Orders Training Project

## 🎯 Project Overview

This project is designed for **training purposes** to solidify theoretical AWS knowledge through practical, hands-on implementation. It demonstrates a complete serverless order processing system built with AWS CDK, showcasing modern cloud architecture patterns and best practices.

## 🏗️ Architecture

The project implements a **decoupled, event-driven architecture** that demonstrates:

### Core Components

1. **Amazon API Gateway (HTTP API)** - Public HTTP API for order management
2. **AWS Lambda** - Serverless compute for business logic
3. **Amazon SQS** - Message queuing with dead letter queue (DLQ)
4. **Amazon DynamoDB** - NoSQL database for order persistence
5. **Amazon CloudWatch** - Monitoring (alarms, dashboards) and logs
6. **Amazon SNS** - Alert notifications via email
7. **AWS X-Ray** - Tracing enabled for Lambda functions
8. **AWS IAM** - Security and permissions (Lambda roles and policies)
9. **Amazon S3** - CDK asset storage and bootstrap bucket
10. **AWS CDK** - Infrastructure as Code framework

### Data Flow

```
POST /orders → Create Lambda → SQS Queue → Process Lambda → DynamoDB
GET /orders/{id} → Get Lambda → DynamoDB
```

### Architecture Diagram

```
                              ┌───────────────┐
│    Client     │
│ (browser/app) │
└───────┬───────┘
        │  HTTPS (REST-like calls)
        ▼
┌──────────────────────────┐
│ API Gateway (HTTP API)   │
│  Routes:                 │
│   POST /orders           │
│   GET  /orders/{id}      │
└───────────┬──────────────┘
            │ Lambda proxy integration
            │
     ┌──────▼──────────┐                 ┌─────────────────────┐
     │ Lambda: Create  │  SendMessage    │     SQS Queue        │
     │ (POST /orders)  ├────────────────▶│    OrdersQueue       │
     └──────┬──────────┘                 └─────────┬───────────┘
            │ 202 Accepted                          │ Event source mapping
            │                                      ▼
            │                            ┌─────────────────────┐
            │                            │ Lambda: Process     │
            │                            │ (SQS worker)        │
            │                            └─────────┬───────────┘
            │                                      │ Put/Update (idempotent)
            ▼                                      ▼
     ┌──────────────────┐                 ┌─────────────────────┐
     │ Lambda: Get       │  GetItem       │ DynamoDB OrdersTable │
     │ (GET /orders/{id})├────────────────▶│  PK/SK ORDER#...     │
     └─────────┬─────────┘                └─────────────────────┘
               │
               ▼
          Response 200/404

Failures / retries:
┌─────────────────────┐        after maxReceiveCount        ┌──────────────────┐
│     SQS Queue        │────────────────────────────────────▶│     SQS DLQ      │
│    OrdersQueue       │                                     │    OrdersDlq     │
└─────────────────────┘                                     └──────────────────┘




Observability:
CloudWatch Logs + Metrics + Alarms + Dashboard + X-Ray (Lambdas)
Alarms → SNS Topic → Email


                                ┌────────────────────────────────────────────────────────┐
                                │                      Observability                      │
                                │  CloudWatch Logs: Lambda log groups (retention)         │
                                │  CloudWatch Alarms:                                     │
                                │    - Lambda Errors / Throttles                          │
                                │    - SQS Oldest Message Age                              │
                                │    - DLQ Messages Visible                                │
                                │  CloudWatch Dashboard: key metrics                      │
                                │  X-Ray: Lambda tracing (Active)                         │
                                └────────────────────────────────────────────────────────┘
                                                       │
                                                       │ Alarm actions
                                                       ▼
                                          ┌──────────────────────────────┐
                                          │             SNS              │
                                          │       Alerts Topic           │
                                          └──────────────────────────────┘
                                                       │
                                                       │ Email subscription
                                                       ▼
                                          ┌──────────────────────────────┐
                                          │         Email Inbox          │
                                          └──────────────────────────────┘

Notes:
- Clients call API Gateway only; API Gateway invokes Lambdas via proxy integrations.
- IAM roles/policies grant least-privilege access to Lambdas (SQS, DynamoDB, Logs, X-Ray).
- SQS has a Dead Letter Queue (DLQ) for messages that fail after configured retries.
- API integration uses Lambda proxy integrations (payload format 2.0).
```

## 🎓 Learning Objectives

This project covers essential AWS services and concepts:

### AWS Services Practiced
- **AWS CDK** - Infrastructure as Code
- **Amazon API Gateway (HTTP API)** - HTTP API management
- **AWS Lambda** - Serverless compute (with event source mapping for SQS)
- **Amazon SQS** - Message queuing and Dead Letter Queue (DLQ)
- **Amazon DynamoDB** - Single-table design
- **Amazon CloudWatch** - Alarms and dashboards
- **Amazon CloudWatch Logs** - Lambda log groups and retention
- **Amazon SNS** - Email notifications for alarms
- **AWS X-Ray** - Distributed tracing for Lambda
- **AWS IAM** - Roles and policies for least privilege
- **Amazon S3** - CDK asset and bootstrap bucket

### Key Concepts Demonstrated
- **Event-driven architecture**
- **Asynchronous processing**
- **Error handling and retry patterns**
- **Idempotency in distributed systems**
- **Infrastructure as Code best practices**
- **Monitoring, logging, and observability**

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- AWS CLI configured with appropriate credentials
- AWS CDK v2 installed globally: `npm install -g aws-cdk`

### Installation

1. **Install infra dependencies:**
   ```bash
   cd infra
   npm install
   ```

2. **Bootstrap CDK (first time only):**
   ```bash
   npx cdk bootstrap
   ```

3. **Deploy the infrastructure:**
   ```bash
   npx cdk deploy --all
   ```

### Environment Setup

The CDK will automatically:
- Create all necessary AWS resources
- Set up IAM roles and permissions
- Configure environment variables for Lambda functions
- Output API endpoints and resource names

## 🔌 API Usage

### Create Order

**Endpoint:** `POST /orders`

**Request Body:**
```json
{
  "amount": 99.99,
  "currency": "EUR"
}
```

**Response:**
```json
{
  "orderId": "uuid-generated-id"
}
```

**Example:**
```bash
curl -X POST https://your-api-id.execute-api.region.amazonaws.com/orders \
  -H "Content-Type: application/json" \
  -d '{"amount": 99.99, "currency": "EUR"}'
```

### Get Order

**Endpoint:** `GET /orders/{orderId}`

**Response:**
```json
{
  "orderId": "uuid-generated-id",
  "amount": 99.99,
  "currency": "EUR"
}
```

**Example:**
```bash
curl https://your-api-id.execute-api.region.amazonaws.com/orders/uuid-generated-id
```

## 🔍 Key Implementation Details

### Lambda Functions

1. **Create Order Lambda** (`create-order.js`)
   - Generates unique order ID
   - Validates input data
   - Sends message to SQS queue
   - Returns 202 Accepted immediately

2. **Process Order Lambda** (`process-order.js`)
   - Triggered by SQS messages
   - Processes batch of messages
   - Writes to DynamoDB with idempotency
   - Handles conditional write failures

3. **Get Order Lambda** (`get-order.js`)
   - Retrieves order from DynamoDB
   - Uses single-table design pattern
   - Returns 404 for non-existent orders

### DynamoDB Design

**Single-Table Design:**
- Partition Key: `PK` (e.g., `ORDER#uuid`)
- Sort Key: `SK` (e.g., `ORDER#uuid`)
- Attributes: `amount`, `currency`, `createdAt`

### Error Handling & Monitoring

- **Dead Letter Queue (DLQ):** Failed messages after 5 retries
- **Idempotency:** Conditional writes prevent duplicates
- **Monitoring:** CloudWatch alarms (Lambda errors/throttles, SQS age and DLQ messages)
- **Dashboard:** CloudWatch dashboard for key metrics
- **Alerts:** SNS email notifications on alarms
- **Tracing:** AWS X-Ray enabled for Lambdas
- **Logging:** CloudWatch log groups with retention

## 🧪 Testing

Run the test suite:
```bash
npm test
```

## 🔧 Customization

### Adding New Features

1. **New Lambda Function:**
   - Add to `infra/lambda/` directory
   - Create CDK construct or resource in `infra/lib/orders-api-stack.js`
   - Add API route if needed

2. **New Database Table:**
   - Add a DynamoDB table in `orders-api-stack.js`
   - Grant appropriate permissions to Lambda functions

3. **New Monitoring:**
   - Add CloudWatch alarms to the stack
   - Configure log groups and retention policies

## 🧹 Cleanup

To remove all resources and avoid charges:
```bash
npx cdk destroy --all
```

## 🎯 Training Goals Achieved

After completing this project, you should understand:

- ✅ How to design serverless architectures
- ✅ Event-driven patterns and asynchronous processing
- ✅ Infrastructure as Code with AWS CDK
- ✅ NoSQL database design principles
- ✅ Error handling and monitoring strategies
- ✅ Security best practices with IAM
- ✅ Cost optimization techniques

## 🤝 Contributing

This is a training project. Feel free to:
- Add new features and services
- Improve error handling
- Add more comprehensive tests
- Enhance monitoring and observability
- Experiment with different AWS services

---

**Happy Learning! 🚀**
