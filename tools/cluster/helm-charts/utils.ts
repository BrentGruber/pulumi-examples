import * as k8s from "@pulumi/kubernetes";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// Function to create a service account
export const createServiceAccount = (
    name: string,
    namespace: k8s.core.v1.Namespace,
    clusterOidcProvider: aws.iam.OpenIdConnectProvider,
    provider: k8s.Provider,
    policyArn: pulumi.Output<string>
) => {

    // Create the assume role policy so that the service account
    // is able to assume the iam role
    const saAssumeRolePolicy = pulumi.all([
        clusterOidcProvider.url,
        clusterOidcProvider.arn,
        namespace.metadata.name,
    ]).apply(([url, arn, namespace]) =>
        aws.iam.getPolicyDocument({
            statements: [
                {
                  actions: ["sts:AssumeRoleWithWebIdentity"],
                  conditions: [
                    {
                      test: "StringEquals",
                      values: [`system:serviceaccount:${namespace}:${name}`],
                      variable: `${url.replace("https://", "")}:sub`,
                    },
                  ],
                  effect: "Allow",
                  principals: [
                    {
                      identifiers: [arn],
                      type: "Federated",
                    },
                  ],
                },
            ],
        })
    );

    // create the iam role for the service account to assume
    const saRole = new aws.iam.Role(name, {
        assumeRolePolicy: saAssumeRolePolicy.json,
    });

    // attach the desired policy arn
    new aws.iam.RolePolicyAttachment(name, {
        policyArn,
        role: saRole,
    });

    // Create and return the service account with proper annotations
    return new k8s.core.v1.ServiceAccount(name, {
            metadata: {
                namespace: namespace.metadata.name,
                name,
                annotations: {
                    "eks.amazonaws.com/role-arn": saRole.arn,
                },
            },
        }, { provider }
    );
}

// Function to create a namespace
export const createNamespace = (namespace: string, provider: k8s.Provider) =>
    new k8s.core.v1.Namespace(namespace, undefined, {
        provider,
    });