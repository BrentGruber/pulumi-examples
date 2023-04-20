import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws"
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes"
import * as fs from 'fs';

import { Stack, getStack } from "@pulumi/pulumi/runtime";

// Grab some values from the Pulumi configuration (or use default values)
const config = new pulumi.Config();
const environment = config.get("environment") || "dev";
const minClusterSize = config.getNumber("minClusterSize") || 3;
const maxClusterSize = config.getNumber("maxClusterSize") || 6;
const desiredClusterSize = config.getNumber("desiredClusterSize") || 3;
const eksNodeInstanceType = config.get("eksNodeInstanceType") || "t3.medium";
const vpcNetworkCidr = config.get("vpcNetworkCidr") || "10.0.0.0/16";
const domain = config.get("domain") || "bomdemo.com";
const clusterName = config.get("clusterName") || "bomdemo-tools-eks-cluster";

// Config for alb load balancer controller
const albNamespace = config.get("lbcNamespace") || "aws-lb-controller";

// Config for ingress-nginx installation
const ingressNamespace = config.get("ingressNamespace") || "ingress-nginx";

// Find some existing network information from the account
const zone = aws.route53.getZone({ name: domain });
const cert = aws.acm.getCertificateOutput({
    domain: domain
});
const subnetTag = "kubernetes.io/cluster/" + clusterName;

// Create a new VPC
const eksVpc = new awsx.ec2.Vpc("bomdemo-tools-eks-vpc", {
    enableDnsHostnames: true,
    cidrBlock: vpcNetworkCidr,
    // Tag the subnets so that they can be used by the load-balancer-controller
    subnetSpecs: [
        {
            type: awsx.ec2.SubnetType.Public,
            tags: {
                [subnetTag]: "shared"
            }
        },
        {
            type: awsx.ec2.SubnetType.Private,
            tags: {
                [subnetTag]: "shared"
            }
        }
    ]
});



// Create the EKS cluster
const cluster = new eks.Cluster("bomdemo-tools", {
    name: clusterName,
    // Put the cluster in the new VPC created earlier
    vpcId: eksVpc.vpcId,
    // TODO: Pull this out to the configs
    version: "1.26",
    // Public subnets will be used for load balancers
    publicSubnetIds: eksVpc.publicSubnetIds,
    // Private subnets will be used for cluster nodes
    privateSubnetIds: eksVpc.privateSubnetIds,
    // Change configuration values to change any of the following settings
    instanceType: eksNodeInstanceType,
    desiredCapacity: desiredClusterSize,
    minSize: minClusterSize,
    maxSize: maxClusterSize,
    // Do not give the worker nodes public IP addresses
    nodeAssociatePublicIpAddress: false,
    // Uncomment the next two lines for a private cluster (VPN access required)
    // endpointPrivateAccess: true,
    // endpointPublicAccess: false
    createOidcProvider: true,
});

// create a provider to use for applying k8s
const provider = new k8s.Provider('k8s', {
    kubeconfig: cluster.kubeconfig.apply(JSON.stringify),
});

// Gather oidc details from cluster
// Typescript complains that oidcProvider may possibly be undefined
// can't find any docs or issues about it so forcing it to ignore that warning with !
// Hopefully it's defined ¯\_(ツ)_/¯
const oidcUrl = cluster.core.oidcProvider!.url;
const oidcArn = cluster.core.oidcProvider!.arn;


// Deploy aws-load-balancer-controller into the cluster
const serviceAccountName = `aws-lb-controller-serviceaccount`
const saAssumeRolePolicy = pulumi.all([oidcUrl, oidcArn, albNamespace, serviceAccountName]).apply(([url, arn, namespace, saName]) =>
    aws.iam.getPolicyDocument({
        statements: [
        {
            actions: ['sts:AssumeRoleWithWebIdentity'],
            conditions: [
            {
                test: 'StringEquals',
                values: [`system:serviceaccount:${namespace}:${saName}`],
                variable: `${url.replace('https://', '')}:sub`,
            },
            ],
            effect: 'Allow',
            principals: [{identifiers: [arn], type: 'Federated'}],
        },
        ],
    })
);
// Create a new IAM role that assumes the AssumeRoleWebWebIdentity policy.
const saRole = new aws.iam.Role(`${pulumi.getStack()}-${environment}-${serviceAccountName}-role`, {
    assumeRolePolicy: saAssumeRolePolicy.json
});
// Create the IAM policy to give load balancer controller to update load balancers and dns
const iamPolicy = new aws.iam.Policy(`${pulumi.getStack()}-${environment}-${serviceAccountName}-lb-controller`, 
    // args
    {
        policy: fs.readFileSync('files/iam_policy.json', 'utf-8')
    }, 
    // opts
    {
        parent: saRole
    }
)

// attach the policy to the role
const iamPolicyAttachment = new aws.iam.PolicyAttachment( `${pulumi.getStack()}-${environment}-${serviceAccountName}-lb-controller-attach`,
    {
        policyArn: iamPolicy.arn,
        roles: [saRole.name],
    },
    {
        parent: saRole
    }
)
// create the service account and namespace
const albNs = new k8s.core.v1.Namespace(albNamespace, { metadata: { name: albNamespace } }, {provider: cluster.provider});
const albSa = new k8s.core.v1.ServiceAccount("aws-lb-controller-sa", {
        metadata: {
            "name": serviceAccountName,
            "namespace": albNs.metadata["name"],
            "annotations": {
                "eks.amazonaws.com/role-arn": saRole.arn
            }
        }
    },{provider: cluster.provider} ); 

// apply the load balancer controller helm chart
const albControllerChart = new k8s.helm.v3.Chart("alb-controller-chart", {
    chart: "aws-load-balancer-controller",
    version: "1.5.0",
    fetchOpts: {
        repo: "https://aws.github.io/eks-charts"
    },
    namespace: albNamespace,
    values: {
        region: "us-east-2",
        clusterName: cluster.core.cluster.name,
        serviceAccount: {
            create: false,
            name: serviceAccountName
        },
        vpcId: eksVpc.vpcId
    }
}, {provider: cluster.provider});

// deploy nginx ingress into the cluster
const nginxNs = new k8s.core.v1.Namespace("ingress-nginx", { metadata: { name: "ingress-nginx" } }, {provider: cluster.provider});
const nginx = new k8s.helm.v3.Chart("ingress-nginx", {
    chart: "ingress-nginx",
    namespace: "ingress-nginx",
    version: "4.6.0",
    fetchOpts: {repo: "https://kubernetes.github.io/ingress-nginx"},
    values: {
        controller: {
            service: {
                type: "LoadBalancer",
                externalTrafficPolicy: "Local",
                annotations: {
                    // AWS Load Balancer Controller Annotations
                    "service.beta.kubernetes.io/aws-load-balancer-type": "external",
                    "service.beta.kubernetes.io/aws-load-balancer-nlb-target-type": "ip",
                    "service.beta.kubernetes.io/aws-load-balancer-backend-protocol": "http",
                    "service.beta.kubernetes.io/aws-load-balancer-scheme": "internet-facing",
                
                    // SSL Annotations
                    "service.beta.kubernetes.io/aws-load-balancer-ssl-cert": cert.arn,
                    "service.beta.kubernetes.io/aws-load-balancer-ssl-ports": "443",

                    // External DNS Annotations
                    "external-dns.alpha.kubernetes.io/hostname": domain
                }
            }
        }
    }
}, {provider: cluster.provider});


// Export the kubeconfig for use
export const kubeconfig = cluster.kubeconfig;