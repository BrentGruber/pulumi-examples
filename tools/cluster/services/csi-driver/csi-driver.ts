import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as k8s from '@pulumi/kubernetes';
import * as fs from 'fs';
import * as path from 'path';
import { createNamespace, createServiceAccount } from '../utils';


export const csiDriver = (
    clusterOidcProvider: aws.iam.OpenIdConnectProvider,
    provider: k8s.Provider
) => {

    const namespaceName = "kube-system"


    // Create the iam policy
    // TODO: iam policy should specify the specific hosted zone, not wildcard
    var iamPolicy = fs.readFileSync(path.join(__dirname,"files/iam-policy.json"), "utf-8");

    const csiDriverPolicy = new aws.iam.Policy("csi-driver", {
        description: "CSI Driver policy",
        policy: iamPolicy
    });

    // Create the service account
    const csiDriverServiceAccount = createServiceAccount(
        "csi-driver",
        namespaceName,
        clusterOidcProvider,
        provider,
        csiDriverPolicy.arn
    );

    //return
    return {
        csiDriverPolicy,
        csiDriverServiceAccount
    }

}