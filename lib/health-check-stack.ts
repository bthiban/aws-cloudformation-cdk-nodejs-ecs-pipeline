import codeBuild = require('@aws-cdk/aws-codebuild');
import codePipeline = require('@aws-cdk/aws-codepipeline');
import codePipelineActions = require('@aws-cdk/aws-codepipeline-actions');
import cdk = require('@aws-cdk/core');
import s3 = require('@aws-cdk/aws-s3');
import iam = require('@aws-cdk/aws-iam');
import ecr = require('@aws-cdk/aws-ecr');
import ecs = require('@aws-cdk/aws-ecs');
import "./env";

export interface HealthCheckStackProps extends cdk.StackProps {
  readonly ecrProps: ecr.IRepository;
  readonly svsProps: ecs.FargateService;
}

export class HealthCheckStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props: HealthCheckStackProps) {
    super(scope, id, props);


    // Bucket S3ECSBucket Bucket S3ECS BucketBucket S3ECSBucket

    const S3ECSBucket = new s3.Bucket(this, 'S3ECSBucket', {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      bucketName: process.env.ECS_BUCKET
    });

    const S3PipelineArtifactBucket = new s3.Bucket(this, 'S3PipelineArtifactBucket', {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      bucketName: `${process.env.PIPELINE_BUCKET}`
    });

    // Role CodeBuildServiceRole Role CodeBuildServiceRole Role CodeBuildServiceRole 

    const CodeBuildServiceRole = new iam.Role(this, 'CodeBuildServiceRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      roleName: 'CodeBuildServiceRole'
    });

    CodeBuildServiceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: [
        'logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents', 'ecr:GetAuthorizationToken'
      ],
    }));

    CodeBuildServiceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [S3PipelineArtifactBucket.bucketArn],
      actions: [
        's3:GetObject', 's3:PutObject', 's3:GetObjectVersion', 's3:GetBucketAcl', 's3:GetBucketLocation'
      ],
    }));

    CodeBuildServiceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [S3ECSBucket.bucketArn],
      actions: [
        's3:GetObject', 's3:PutObject', 's3:GetObjectVersion', 's3:GetBucketAcl', 's3:GetBucketLocation'
      ],
    }));



    CodeBuildServiceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [props.ecrProps.repositoryArn],
      actions: [
        'ecr:GetDownloadUrlForLayer', 'ecr:BatchGetImage', 'ecr:BatchCheckLayerAvailability', 'ecr:PutImage', 'ecr:InitiateLayerUpload', 'ecr:UploadLayerPart', 'ecr:CompleteLayerUpload'
      ],
    }));

    CodeBuildServiceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: [
        'ec2:CreateNetworkInterface', 'ec2:DescribeDhcpOptions', 'ec2:DescribeNetworkInterfaces', 'ec2:DeleteNetworkInterface', 'ec2:DescribeSubnets', 'ec2:DescribeSecurityGroups', 'ec2:DescribeVpcs'
      ],
    }));

    // CodePipelineServiceRole CodePipelineServiceRole CodePipelineServiceRole CodePipelineServiceRole

    const CodePipelineServiceRole = new iam.Role(this, 'CodePipelineServiceRole', {
      assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com'),
      roleName: 'CodePipelineServiceRole'
    });

    CodePipelineServiceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [S3PipelineArtifactBucket.bucketArn],
      actions: [
        's3:PutObject', 's3:GetObject', 's3:GetObjectVersion', 's3:GetBucketVersioning'
      ],
    }));

    CodePipelineServiceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: [
        'ecs:DescribeServices', 'ecs:DescribeTaskDefinition', 'ecs:DescribeTasks', 'ecs:ListTasks',
        'ecs:RegisterTaskDefinition', 'ecs:UpdateService', 'codebuild:StartBuild', 'codebuild:BatchGetBuilds',
        'iam:PassRole'
      ]
    }));

    // PipelineProject

    const BuildProject = new codeBuild.PipelineProject(this, 'CdkBuild', {
      buildSpec: codeBuild.BuildSpec.fromSourceFilename(`${process.env.COODE_BUILD_SPEC_FILENAME}`),
      projectName: 'BIRA-CDK-BUILD',
      role: CodeBuildServiceRole,
      environment: {
        buildImage: codeBuild.LinuxBuildImage.STANDARD_2_0,
        computeType: codeBuild.ComputeType.SMALL,
        privileged: true,
        environmentVariables: {
          AWS_DEFAULT_REGION: {
            value: `${process.env.CDK_DEFAULT_REGION}`
          },
          ACCOUNT_ID: {
            value: `${process.env.CDK_DEFAULT_ACCOUNT}`
          },
          BUILD_ENV: {
            value: `${process.env.BUILD_ENV}`
          },
          LARAVEL_REPOSITORY_NAME: {
            value: props.ecrProps.repositoryName
          }
        }
      },

    });
    const sourceOutput = new codePipeline.Artifact();
    const cdkBuildOutput = new codePipeline.Artifact('CdkBuildOutput');
    new codePipeline.Pipeline(this, 'Pipeline', {
      artifactBucket: S3PipelineArtifactBucket,
      role: CodePipelineServiceRole,
      pipelineName: process.env.PIPELINE_NAME,
      stages: [{
          stageName: 'Source',
          actions: [
            new codePipelineActions.GitHubSourceAction({
              actionName: 'GitHub_Source',
              owner: 'SPHTech',
              repo: 'laravel-blog',
              oauthToken: cdk.SecretValue.plainText(`${process.env.GITHUB_TOKEN}`),
              // oauthToken: cdk.SecretValue.secretsManager('bira/github-z0sZJX', {jsonField: 'oauthToken'}), not working
              output: sourceOutput,
              branch: 'dev', // default: 'master'
              trigger: codePipelineActions.GitHubTrigger.WEBHOOK // default: 'WEBHOOK', 'NONE' is also possible for no Source trigger
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codePipelineActions.CodeBuildAction({
              actionName: 'CDK_Build',
              project: BuildProject,
              input: sourceOutput,
              outputs: [cdkBuildOutput],
            }),
          ],
        },
        {
          stageName: 'Deploy',
          actions: [
            new codePipelineActions.EcsDeployAction({
              actionName: 'CDK_Deploy',
              service: props.svsProps,
              imageFile: cdkBuildOutput.atPath('imagedefinitions.json'),
            }),
          ],
        },
      ],
    });

  }
}