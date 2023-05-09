import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as k8s from '@pulumi/kubernetes';
import * as fs from 'fs';
import * as path from 'path';
import { createNamespace, createServiceAccount } from '../utils';


export const externalDns = (
    clusterOidcProvider: aws.iam.OpenIdConnectProvider,
    provider: k8s.Provider
) => {

    const namespaceName = "external-dns"
    
    // Create the namespace
    const externalDnsNamespace = createNamespace(namespaceName, provider);


    // Create the iam policy
    // TODO: iam policy should specify the specific hosted zone, not wildcard
    var iamPolicy = fs.readFileSync(path.join(__dirname,"files/iam-policy.json"), "utf-8");

    const externalDnsPolicy = new aws.iam.Policy("external-dns", {
        description: "External DNS policy",
        policy: iamPolicy
    });

    // Create the service account
    const externalDnsServiceAccount = createServiceAccount(
        "external-dns",
        namespaceName,
        clusterOidcProvider,
        provider,
        externalDnsPolicy.arn
    );

    // apply the helm chart
    // const externalDnsChart = new k8s.helm.v3.Chart("external-dns-chart", {
    //         chart: "external-dns",
    //         version: "1.12.2",
    //         fetchOpts: {
    //             repo: "https://kubernetes-sigs.github.io/external-dns/"
    //         },
    //         namespace: externalDnsNamespace.metadata.name,
    //         values: {
    //             provider: "aws",
    //             domainFilters: ["bomdemo.com"],
    //             serviceAccount: {
    //                 create: false,
    //                 name: externalDnsServiceAccount.metadata.name
    //             }
    //         }
    //     }, {provider: provider}
    // );

    //return
    return {
        externalDnsNamespace,
        externalDnsPolicy,
        externalDnsServiceAccount
    }

}