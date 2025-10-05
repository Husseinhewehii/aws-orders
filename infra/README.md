# AWS Orders Training Project

## 🎯 Project Overview

This project is designed for **training purposes** to solidify theoretical AWS knowledge through practical, hands-on implementation. It demonstrates a complete serverless order processing system built with AWS CDK, showcasing modern cloud architecture patterns and best practices.

## 🏗️ Architecture

The project implements a **decoupled, event-driven architecture** that demonstrates:

### Core Components

1. **API Gateway** - HTTP API for order management
2. **Lambda Functions** - Serverless compute for business logic
3. **SQS Queues** - Message queuing with dead letter queue (DLQ)
4. **DynamoDB** - NoSQL database for order persistence
5. **CloudWatch** - Monitoring and alerting

### Data Flow

```
POST /orders → Create Lambda → SQS Queue → Process Lambda → DynamoDB
GET /orders/{id} → Get Lambda → DynamoDB
```

### Architecture Diagram

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│ API Gateway  │───▶│ Lambda      │───▶│ SQS Queue   │
└─────────────┘    └──────────────┘    │ (Create)    │    └─────────────┘
                                       └─────────────┘           │
                                                                ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │◀───│ API Gateway  │◀───│ Lambda      │◀───│ Lambda      │
└─────────────┘    └──────────────┘    │ (Get)       │    │ (Process)   │
                                       └─────────────┘    └─────────────┘
                                                               │
                                                               ▼
                                                       ┌─────────────┐
                                                       │ DynamoDB    │
                                                       │ Table       │
                                                       └─────────────┘
```

## 🎓 Learning Objectives

This project covers essential AWS services and concepts:

### AWS Services Practiced
- **AWS CDK** - Infrastructure as Code
- **API Gateway** - HTTP API management
- **Lambda** - Serverless compute
- **SQS** - Message queuing with DLQ patterns
- **DynamoDB** - Single-table design
- **CloudWatch** - Monitoring and alarms
- **IAM** - Security and permissions

### Key Concepts Demonstrated
- **Event-driven architecture**
- **Asynchronous processing**
- **Error handling and retry patterns**
- **Idempotency in distributed systems**
- **Infrastructure as Code best practices**
- **Monitoring and observability**

## 📁 Project Structure

```
infra/
├── bin/
│   ├── aws-orders.js          # CDK app entry point
│   └── infra.js               # Legacy CDK app
├── lib/
│   ├── aws-orders-stack.js    # Main application stack
│   ├── orders-api-stack.js    # API and Lambda functions
│   └── infra-stack.js         # Legacy stack
├── lambda/
│   ├── create-order.js        # Order creation handler
│   ├── get-order.js          # Order retrieval handler
│   └── process-order.js      # SQS message processor
├── test/
│   └── infra.test.js         # Unit tests
└── cdk.json                  # CDK configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- AWS CLI configured with appropriate credentials
- AWS CDK v2 installed globally: `npm install -g aws-cdk`

### Installation

1. **Clone and navigate to the project:**
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

### Error Handling

- **Dead Letter Queue**: Failed messages after 5 retries
- **Idempotency**: Conditional writes prevent duplicates
- **Monitoring**: CloudWatch alarms for queue age and DLQ messages

## 🧪 Testing

Run the test suite:
```bash
npm test
```

## 🛠️ Development Commands

| Command | Description |
|---------|-------------|
| `npm run test` | Run Jest unit tests |
| `npx cdk deploy` | Deploy stack to AWS |
| `npx cdk diff` | Compare with deployed stack |
| `npx cdk synth` | Generate CloudFormation template |
| `npx cdk destroy` | Remove all resources |

## 🔧 Customization

### Adding New Features

1. **New Lambda Function:**
   - Add to `lambda/` directory
   - Create CDK construct in `orders-api-stack.js`
   - Add API route if needed

2. **New Database Table:**
   - Add DynamoDB table in `orders-api-stack.js`
   - Grant appropriate permissions to Lambda functions

3. **New Monitoring:**
   - Add CloudWatch alarms in the stack
   - Configure log groups and retention policies

## 🧹 Cleanup

To remove all resources and avoid charges:
```bash
npx cdk destroy --all
```

## 📚 Learning Resources

- [AWS CDK Developer Guide](https://docs.aws.amazon.com/cdk/latest/guide/)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Single-Table Design](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html)
- [SQS Dead Letter Queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)

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
