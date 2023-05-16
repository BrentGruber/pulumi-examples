import * as aws from '@pulumi/aws';
import * as k8s from '@pulumi/kubernetes';
import { createNamespace, createServiceAccount } from '../utils';

export const cilium = (
    clusterOidcProvider: aws.iam.OpenIdConnectProvider,
    provider: k8s.Provider
) => {
    const namespaceName = "cilium"

    // create the alb controller namespace
    const ciliumNamespace = createNamespace(namespaceName, provider);

    // create the service account
    const ciliumServiceAccount = createServiceAccount(
        'cilium',
        namespaceName,
        clusterOidcProvider,
        provider,
        "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
    );

    return {
        ciliumNamespace,
        ciliumServiceAccount
    }
}