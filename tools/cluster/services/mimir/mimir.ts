import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as k8s from '@pulumi/kubernetes';
import * as fs from 'fs';
import * as path from 'path';
import { createNamespace, createServiceAccount } from '../utils';



export const mimir = (
    clusterOidcProvider: aws.iam.OpenIdConnectProvider,
    provider: k8s.Provider,
    bucketName: string,
    namespace: string
) => {

    // Create an s3 bucket for persistence
    const mimirBucket = new aws.s3.Bucket(bucketName);


    // Create an iam role that can access bucket
    
    // Create the iam policy
    const mimirPolicy = new aws.iam.Policy('mimir', {
        description: 'Mimir policy',
        policy: mimirBucket.arn.apply(arn => JSON.stringify({
            Version: '2012-10-17',
            Statement: [{
                Effect: 'Allow',
                Action: "s3:*",
                Resource: [`${arn}`, `${arn}/*`]
            }]
        }))
    });

    // Create the service account
    const mimirServiceAccount = createServiceAccount(
        "mimir",
        namespace,
        clusterOidcProvider,
        provider,
        mimirPolicy.arn
    );


    return {
        mimirPolicy,
        mimirServiceAccount,
        mimirBucket
    }
}