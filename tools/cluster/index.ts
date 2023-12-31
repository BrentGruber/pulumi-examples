import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";
import { cluster } from "./infrastructure/cluster";
import { csiDriver } from "./services/csi-driver/csi-driver";
import { vpc } from "./infrastructure/vpc";
import { albController } from "./services/alb-controller/alb-controller";
import { certManager } from "./services/cert-manager/cert-manager";
import { cilium } from "./services/cilium/cilium"
import { ingress } from "./services/ingress-nginx/ingress";
import { externalDns } from "./services/external-dns/external-dns";
import { dopplerOperator } from "./services/doppler-operator/doppler-operator";
import { mimir } from "./services/mimir/mimir";
import { loki } from "./services/loki/loki";
import { tempo } from "./services/tempo/tempo"


// Grab some values from the Pulumi configuration (or use default values)
const config = new pulumi.Config();
const environment = config.get("environment") || "dev";
const eksVersion = config.get("eksVersion") || "1.26";
const minClusterSize = config.getNumber("minClusterSize") || 3;
const maxClusterSize = config.getNumber("maxClusterSize") || 6;
const desiredClusterSize = config.getNumber("desiredClusterSize") || 3;
const eksNodeInstanceType = config.get("eksNodeInstanceType") || "t3.xlarge";
const projectName = config.get("projectName") || "bomdemo-tools-eks";
const vpcNetworkCidr = config.get("vpcNetworkCidr") || "10.0.0.0/16";
const domain = config.get("domain") || "bomdemo.com";
const ciliumEnabled = true

// Get the hosted zone
const zone =aws.route53.getZoneOutput({
    name: domain
});

// Olufi stackref, get role to map to eks cluster
const stackRef = new pulumi.StackReference(`BOM-DEMO/olufi/dev`);
const adminRole = stackRef.getOutput("olufiRoleArn");


const clusterVPC = vpc(vpcNetworkCidr, projectName);
const clusterEKS = cluster(projectName, clusterVPC.vpcId, eksVersion, clusterVPC.publicSubnetIds, 
    clusterVPC.privateSubnetIds, eksNodeInstanceType, desiredClusterSize, 
    minClusterSize, maxClusterSize, adminRole, ciliumEnabled);

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


if (ciliumEnabled) {
    //cilium
    const { ciliumServiceAccount } = cilium(
        clusterOidcProvider,
        provider,
    )
}


// csi-driver
export const { csiDriverPolicy, csiDriverServiceAccount } = csiDriver(
    clusterOidcProvider,
    provider
)

// deploy the alb controller chart
export const { albControllerNamespace, albControllerPolicy, albControllerServiceAccount } = albController(
    clusterOidcProvider,
    provider,
    projectName,
    clusterVPC.vpcId
);

// deploy nginx-ingress
export const { ingressNamespace } = ingress(
    clusterOidcProvider,
    provider,
    domain
);


// deploy external-dns
export const { externalDnsNamespace, externalDnsPolicy, externalDnsServiceAccount } = externalDns(
    clusterOidcProvider,
    provider
);


// deploy doppler-operator
export const { dopplerOperatorNamespace } = dopplerOperator(
    clusterOidcProvider,
    provider
);


// deploy cert-manager
export const { certManagerNamespace, certManagerPolicy, certManagerServiceAccount } = certManager(
    clusterOidcProvider,
    provider,
    zone.zoneId
)


// Deploy Monitoring tools
// TODO: How to tie this in with tools-deploy
const monitoringNamespace = "monitoring"

// deploy mimir
const mimirBucketName: string = "mimir-bomdemo-" + environment
export const { mimirPolicy, mimirServiceAccount, mimirBucket } = mimir(
    clusterOidcProvider,
    provider,
    mimirBucketName,
    monitoringNamespace
)

// deploy loki
const lokiBucketName: string = "loki-bomdemo-" + environment
export const { lokiPolicy, lokiServiceAccount, lokiBucket } = loki(
    clusterOidcProvider,
    provider,
    lokiBucketName,
    monitoringNamespace
)

// deploy tempo
const tempoBucketName: string = "tempo-bomdemo-" + environment
export const { tempoPolicy, tempoServiceAccount, tempoBucket } = tempo(
    clusterOidcProvider,
    provider,
    tempoBucketName,
    monitoringNamespace
)