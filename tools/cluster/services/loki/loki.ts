import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as k8s from '@pulumi/kubernetes';
import * as fs from 'fs';
import * as path from 'path';
import { createNamespace, createServiceAccount } from '../utils';



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
    const lokiPolicy = new aws.iam.Policy('loki', {
        description: "loki policy",
        policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Effect: "Allow",
                Principal: "*",
                Action: [
                    "s3:*"
                ],
                Resource: [
                    `${lokiBucket.arn}`
                ]
            }]
        })
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