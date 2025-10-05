const cdk = require('aws-cdk-lib');
const s3 = require('aws-cdk-lib/aws-s3');

class OrdersBootstrapStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);

        const artifactsBucket = new s3.Bucket(this, 'ArtifactsBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

        new cdk.CfnOutput(this, 'ArtifactsBucketName', { value: artifactsBucket.bucketName });
    }
}

module.exports = { OrdersBootstrapStack };
