import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as k8s from '@pulumi/kubernetes';
import * as fs from 'fs';
import * as path from 'path';
import { createNamespace, createServiceAccount } from '../utils';



export const dopplerOperator = (
    clusterOidcProvider: aws.iam.OpenIdConnectProvider,
    provider: k8s.Provider
) => {


    // create the argocd namespace
    const dopplerOperatorNamespace = createNamespace("doppler-operator-system", provider);

    // apply the secret for doppler to authenticate
    const dopplerOperatorSecret = new k8s.core.v1.Secret("doppler-token-secret", {
        data: {
            serviceToken: process.env.DOPPLER_SERVICE_TOKEN!
        },
        metadata: {
            name: "doppler-token-secret",
            namespace: dopplerOperatorNamespace.metadata.name
        },
        type: "generic",

    }, {
        provider: provider
    });

    // apply the helm chart
    // const dopplerOperatorChart = new k8s.helm.v3.Chart("doppler-kubernetes-operator", {
    //     chart: "doppler-kubernetes-operator",
    //     namespace: dopplerOperatorNamespace.metadata.name,
    //     version: "1.2.0",
    //     fetchOpts: {repo: "https://helm.doppler.com"}
    // }, {provider: provider});

    // return provisioned values
    return {
        dopplerOperatorNamespace
    };
}
