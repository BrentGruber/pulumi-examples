import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { createNamespace, createServiceAccount } from '../utils';
import * as aws from '@pulumi/aws';

// create a function that will enable certManager
export const certManager = (
    clusterOidcProvider: aws.iam.OpenIdConnectProvider,
    provider: k8s.Provider,
    zoneId: pulumi.Output<string>
  ) => {
    const certManagerNamespace = createNamespace('cert-manager', provider);
  
    // cert manager needs access to route53 records
    const certManagerPolicy = new aws.iam.Policy('cert-manager', {
      description: 'Cert manager policy',
      policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: 'route53:GetChange',
            Resource: 'arn:aws:route53:::change/*',
          },
          {
            Effect: 'Allow',
            Action: [
              'route53:ChangeResourceRecordSets',
              'route53:ListResourceRecordSets',
            ],
            Resource: `arn:aws:route53:::hostedzone/${zoneId}`,
          },
          {
            Effect: 'Allow',
            Action: 'route53:ListHostedZonesByName',
            Resource: '*',
          },
        ],
      }),
    });
  
    const certManagerServiceAccount = createServiceAccount(
      'cert-manager',
      certManagerNamespace,
      clusterOidcProvider,
      provider,
      certManagerPolicy.arn
    );
  
    return {
      certManagerNamespace,
      certManagerPolicy,
      certManagerServiceAccount,
    };
  };