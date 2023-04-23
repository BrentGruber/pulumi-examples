import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { cluster } from "./infrastructure/cluster";
import { vpc } from "./infrastructure/vpc";
import { albController } from "./helm-charts/alb-controller/alb-controller";
import { ingress } from "./helm-charts/ingress-nginx/ingress";


// Grab some values from the Pulumi configuration (or use default values)
const config = new pulumi.Config();
const environment = config.get("environment") || "dev";
const eksVersion = config.get("eksVersion") || "1.26";
const minClusterSize = config.getNumber("minClusterSize") || 3;
const maxClusterSize = config.getNumber("maxClusterSize") || 6;
const desiredClusterSize = config.getNumber("desiredClusterSize") || 3;
const eksNodeInstanceType = config.get("eksNodeInstanceType") || "t3.medium";
const projectName = config.get("projectName") || "bomdemo-tools-eks";
const vpcNetworkCidr = config.get("vpcNetworkCidr") || "10.0.0.0/16";
const domain = config.get("domain") || "bomdemo.com";

const clusterVPC = vpc(vpcNetworkCidr, projectName);
const clusterEKS = cluster(projectName, clusterVPC.vpcId, eksVersion, clusterVPC.publicSubnetIds, 
    clusterVPC.privateSubnetIds, eksNodeInstanceType, desiredClusterSize, 
    minClusterSize, maxClusterSize);

// Export the kubeconfig for use
export const kubeconfig = clusterEKS.kubeconfig;

// Get the cluster's oidc provider
const clusterOidcProvider = clusterEKS.core.oidcProvider;
if (!clusterOidcProvider) {
    throw new Error('no cluster oidc provider')
}

// Create the provider for applying in cluster
const provider = new k8s.Provider('k8s', {
    kubeconfig: kubeconfig.apply(JSON.stringify),
});


// deploy the alb controller chart
export const { albControllerNamespace, albControllerPolicy, albControllerServiceAccount, albControllerChart} = albController(
    clusterOidcProvider,
    provider,
    projectName,
    clusterVPC.vpcId
);

// deploy nginx-ingress
export const { ingressNamespace, ingressChart } = ingress(
    clusterOidcProvider,
    provider,
    domain
);


// deploy external-dns