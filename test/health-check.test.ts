import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import cdk = require('@aws-cdk/core');
import HealthCheck = require('../lib/health-check-stack');

// test('Empty Stack', () => {
//     const app = new cdk.App();
//     // WHEN
//     const stack = new HealthCheck.HealthCheckStack(app, 'MyTestStack');
//     // THEN
//     expectCDK(stack).to(matchTemplate({
//       "Resources": {}
//     }, MatchStyle.EXACT))
// });