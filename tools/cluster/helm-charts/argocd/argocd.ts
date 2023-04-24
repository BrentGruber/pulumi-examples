import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as k8s from '@pulumi/kubernetes';
import * as fs from 'fs';
import * as path from 'path';
import { createNamespace, createServiceAccount } from '../utils';



export const argocd = (
    clusterOidcProvider: aws.iam.OpenIdConnectProvider,
    provider: k8s.Provider
) => {


    // create the argocd namespace
    const argocdNamespace = createNamespace("argocd", provider);

    // apply the helm chart
    const argocdChart = new k8s.helm.v3.Chart("argocd", {
        chart: "argo-cd",
        namespace: argocdNamespace.metadata.name,
        version: "5.29.1",
        fetchOpts: {repo: "https://argoproj.github.io/argo-helm"},
        values: {
            server: {
                ingress: {
                    enabled: true,
                    hosts: ["argocd.tools.bomdemo.com"]
                }
            }
        }
    }, {provider: provider});

    // return provisioned values
    return {
        argocdNamespace,
        argocdChart
    };
}
