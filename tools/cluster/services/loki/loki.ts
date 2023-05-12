import * as aws from '@pulumi/aws';
import * as k8s from '@pulumi/kubernetes';
import { createServiceAccount } from '../utils';



export const loki = (
    clusterOidcProvider: aws.iam.OpenIdConnectProvider,
    provider: k8s.Provider,
    bucketName: string,
    namespace: string
) => {

    // Create an s3 bucket for persistence
    const lokiBucket = new aws.s3.Bucket(bucketName);


    // Create an iam role that can access bucket
    
    // Create the iam policy
    // This was not a waste of a large amount of time
    // but this account has a "smart" policy that prevents
    // iam policies that start with the letter l, so this
    // policy needed to be renamed
    const lokiPolicy = new aws.iam.Policy('bom-loki', {
        description: "Bom loki policy",
        policy: lokiBucket.arn.apply(arn => JSON.stringify({
            Version: '2012-10-17',
            Statement: [{
                Effect: 'Allow',
                Action: "s3:*",
                Resource: [`${arn}`, `${arn}/*`]
            }]
        }))
    });

    // Create the service account
    const lokiServiceAccount = createServiceAccount(
        "loki",
        namespace,
        clusterOidcProvider,
        provider,
        lokiPolicy.arn
    );


    return {
        lokiPolicy,
        lokiServiceAccount,
        lokiBucket
    }
}