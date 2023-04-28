import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as k8s from '@pulumi/kubernetes';
import * as fs from 'fs';
import * as path from 'path';
import { createNamespace, createServiceAccount } from '../utils';



export const albController = (
    clusterOidcProvider: aws.iam.OpenIdConnectProvider,
    provider: k8s.Provider,
    clusterName: string,
    vpcId: pulumi.Output<string>,
) => {

    // create the alb controller namespace
    const albControllerNamespace = createNamespace("alb-controller", provider);

    // create the necessary iam policy
    const albControllerPolicy = new aws.iam.Policy('alb-controller', {
        policy: fs.readFileSync(path.join(__dirname,'files/iam-policy.json'), 'utf-8'),
    });

    // create the service account
    const albControllerServiceAccount = createServiceAccount(
        'alb-controller',
        albControllerNamespace,
        clusterOidcProvider,
        provider,
        albControllerPolicy.arn
    );

    // apply the helm chart
    // const albControllerChart = new k8s.helm.v3.Chart("alb-controller-chart", {
    //         chart: "aws-load-balancer-controller",
    //         version: "1.5.0",
    //         fetchOpts: {
    //             repo: "https://aws.github.io/eks-charts"
    //         },
    //         namespace: albControllerNamespace.metadata.name,
    //         values: {
    //             region: "us-east-2",
    //             clusterName: clusterName,
    //             keepTLSSecret: true,
    //             serviceAccount: {
    //                 create: false,
    //                 name: albControllerServiceAccount.metadata.name
    //             },
    //             vpcId: vpcId
    //         }
    //     }, {provider: provider}
    // );

    // return provisioned values
    return {
        albControllerNamespace,
        albControllerPolicy,
        albControllerServiceAccount
    };
}
