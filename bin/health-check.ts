#!/usr/bin/env node

import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import {
    HealthCheckStack
} from '../lib/health-check-stack';

import {
    EcsStack
} from "../lib/ecs-stack";

const app = new cdk.App();

const ecsStack = new EcsStack(app, 'EcsStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    },
});

new HealthCheckStack(app, 'HealthCheckStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    },
    ecrProps: ecsStack.ecrProps,
    svsProps: ecsStack.svsProps,
});
  