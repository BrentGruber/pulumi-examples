import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as k8s from '@pulumi/kubernetes';
import * as fs from 'fs';
import * as path from 'path';
import { createNamespace, createServiceAccount } from '../utils';



export const tempo = (
    clusterOidcProvider: aws.iam.OpenIdConnectProvider,
    provider: k8s.Provider,
    bucketName: string,
    namespace: string
) => {

    // Create an s3 bucket for persistence
    const tempoBucket = new aws.s3.Bucket(bucketName);


    // Create an iam role that can access bucket
    
    // Create the iam policy
    const tempoPolicy = new aws.iam.Policy('tempo', {
        description: 'Tempo policy',
        policy: tempoBucket.arn.apply(arn => JSON.stringify({
            Version: '2012-10-17',
            Statement: [{
                Effect: 'Allow',
                Action: "s3:*",
                Resource: [`${arn}`, `${arn}/*`]
            }]
        }))
    });

    // Create the service account
    const tempoServiceAccount = createServiceAccount(
        "tempo",
        namespace,
        clusterOidcProvider,
        provider,
        tempoPolicy.arn
    );


    return {
        tempoPolicy,
        tempoServiceAccount,
        tempoBucket
    }
}