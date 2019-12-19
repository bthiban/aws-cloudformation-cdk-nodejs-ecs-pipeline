import cdk = require('@aws-cdk/core');
import iam = require('@aws-cdk/aws-iam');
import ecr = require('@aws-cdk/aws-ecr');
import ecs = require('@aws-cdk/aws-ecs');
import ec2 = require('@aws-cdk/aws-ec2');
import logs = require('@aws-cdk/aws-logs');
import elbV2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import ecsPatterns = require('@aws-cdk/aws-ecs-patterns');
import "./env";


export class EcsStack extends cdk.Stack {

    public readonly ecrProps: ecr.IRepository;
    public readonly svsProps: ecs.FargateService;

    constructor(scope: cdk.Construct, id: string, props ? : cdk.StackProps) {
        super(scope, id, props);

        const repository = new ecr.Repository(this, `${process.env.ECR_REPOSITORY}`, {
            repositoryName: process.env.ECR_REPOSITORY,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            lifecycleRules: [{
                maxImageAge: cdk.Duration.days(30)
            }]
        });

        this.ecrProps = repository;

        const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
            isDefault: false,
            vpcId: `${process.env.VPC_ID}`,
        });

        const cdkCluster = new ecs.Cluster(this, `${process.env.ECS_CLUSTER}`, {
            vpc: vpc,
            clusterName: process.env.ECS_CLUSTER,
        });

        const SecGrp = ec2.SecurityGroup.fromSecurityGroupId(this, `${process.env.SECURITY_GROUP_NAME}`, `${process.env.SECURITY_GROUP_ID}`);

        const taskRole = new iam.Role(this, 'EcsTaskExecutionRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com')
        });

        taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'));

        const cdkTaskDefinition = new ecs.FargateTaskDefinition(this, 'bira-cdk-TaskDefinition', {
            memoryLimitMiB: 512,
            cpu: 256,
            taskRole: taskRole,
            executionRole: taskRole
        });

        const LogGroup = new logs.LogGroup(this, "LogGroup", {
            logGroupName: `/ecs/${process.env.SUFFIX}`,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        const CDKLogDriver = new ecs.AwsLogDriver({
            logGroup: LogGroup,
            streamPrefix: `${process.env.SUFFIX}`
        });

        const cdkContainer = cdkTaskDefinition.addContainer(`${process.env.CONTAINER}`, {
            image: ecs.ContainerImage.fromRegistry('php:7.3-apache-stretch'),
            environment: {
                'COLOR': 'blue'
            },
            logging: CDKLogDriver,
        });

        cdkContainer.addPortMappings({
            containerPort: 80
        });

        const SubNetServiceA = ec2.Subnet.fromSubnetAttributes(this, 'SubNetServiceA', {
            availabilityZone: 'ap-southeast-1a',
            routeTableId: 'rtb-088c8d19e4d515fd2',
            subnetId: 'subnet-0dcb1eee39d6ff70f'
        });

        const SubNetServiceB = ec2.Subnet.fromSubnetAttributes(this, 'SubNetServiceB', {
            availabilityZone: 'ap-southeast-1b',
            routeTableId: 'rtb-088c8d19e4d515fd2',
            subnetId: 'subnet-00a4ff9d6c8871879'
        });

        const cdkService = new ecs.FargateService(this, `${process.env.SERVICE}`, {
            cluster: cdkCluster,
            serviceName: process.env.SERVICE,
            taskDefinition: cdkTaskDefinition,
            minHealthyPercent: 50,
            maxHealthyPercent: 200,
            assignPublicIp: false,
            desiredCount: 1,
            securityGroup: SecGrp,
            vpcSubnets: {
                subnets:[SubNetServiceA, SubNetServiceB]
            }
        });

        this.svsProps = cdkService;

        const SubNetA = ec2.Subnet.fromSubnetAttributes(this, 'SubNetA', {
            availabilityZone: 'ap-southeast-1a',
            routeTableId: 'rtb-088c8d19e4d515fd2',
            subnetId: 'subnet-0d4ddf3ab0d9351bf'
        });

        const SubNetB = ec2.Subnet.fromSubnetAttributes(this, 'SubNetB', {
            availabilityZone: 'ap-southeast-1b',
            routeTableId: 'rtb-088c8d19e4d515fd2',
            subnetId: 'subnet-00a4ff9d6c8871879'
        });

        const SecGrpLB = ec2.SecurityGroup.fromSecurityGroupId(this, `${process.env.LB_SECURITY_GROUP_NAME}`, `${process.env.LB_SECURITY_GROUP_ID}`);

        const cdkLB = new elbV2.ApplicationLoadBalancer(this, 'external', {
            loadBalancerName: process.env.LOAD_BALANCER,
            securityGroup:SecGrpLB,
            vpc: vpc,
            idleTimeout: cdk.Duration.seconds(30),
            deletionProtection: false,
            internetFacing: true,
            http2Enabled: true,
            vpcSubnets: {
                subnets: [SubNetA, SubNetB]
            }
        });

        const cdkGatewayListener = cdkLB.addListener('GatewayListener', {
            port: 80,
            protocol: elbV2.ApplicationProtocol.HTTP,
        });

        const cdkTargetGroup = cdkGatewayListener.addTargets('TargetGroup', {
            port: 80,
            healthCheck: {
                path: '/',
                interval: cdk.Duration.minutes(2),
                port: '80',
            },
            targets: [cdkService],
        });

        new cdk.CfnOutput(this, 'ALBDNS: ', {
            value: cdkLB.loadBalancerDnsName
        });

    }

}