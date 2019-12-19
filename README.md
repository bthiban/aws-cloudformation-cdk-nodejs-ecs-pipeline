# AWS Cloud Development Kit (AWS CDK)

The **AWS Cloud Development Kit (AWS CDK)** is an open-source software development framework to define cloud infrastructure in code and provision it through AWS CloudFormation.

It offers a high-level object-oriented abstraction to define AWS resources imperatively using the power of modern programming languages. Using the CDK’s library of infrastructure constructs, you can easily encapsulate AWS best practices in your infrastructure definition and share it without worrying about boilerplate logic.


## How to Deploy ?

 * `npm run build`  compile typescript to js
 * `cdk deploy` deploy this stack to your default AWS account/region

## Other useful commands

 * `cdk diff` compare deployed stack with current state
 * `cdk synth` emits the synthesized CloudFormation template
 * `node bin/health-check.js` debugging


## Imported from available resources
  - VPC
  - Security Groups
  - Subnets


---
## Environment Variables

    BUILD_ENV=dev
    PROJECT_NAME=bira-cdk

    SUFFIX=$PROJECT_NAME-$BUILD_ENV

    ECS_BUCKET=s3-ecs-$SUFFIX
    PIPELINE_BUCKET=s3-pipeline-$SUFFIX
    PIPELINE_NAME=BIRA-cdk-pipeline

    ECS_CLUSTER=ecs-cluster-$SUFFIX
    ECR_REPOSITORY=ecr-$SUFFIX
    SERVICE=ecs-service-$SUFFIX
    CONTAINER=ecs-container-image-$SUFFIX

    VPC_ID=vpc-
    SECURITY_GROUP_ID=sg-
    SECURITY_GROUP_NAME=SG-EC2-Web&App
    SUBNET_A=subnet-
    SUBNET_B=subnet-
    LOAD_BALANCER=lb-$SUFFIX
    LB_SECURITY_GROUP_ID=sg-x
    LB_SECURITY_GROUP_NAME=SG-LB-Public

    COODE_BUILD_SPEC_FILENAME=codebuild/dev/buildspec.yml
    GITHUB_TOKEN=github-token-for-access

    CDK_DEFAULT_ACCOUNT=
    CDK_DEFAULT_REGION=ap-southeast-1
    AWS_DEFAULT_REGION=${CDK_DEFAULT_REGION}