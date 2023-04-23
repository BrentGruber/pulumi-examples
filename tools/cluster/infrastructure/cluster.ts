import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws"
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";




export const cluster = (projectName: string, vpcId: pulumi.Output<string>, version: string, vpcPublicSubnetIds: pulumi.Output<string[]>, 
    vpcPrivateSubnetIds: pulumi.Output<string[]>, eksNodeInstanceType: string, desiredClusterSize: number, 
    minClusterSize: number, maxClusterSize: number) => {

    // create the clustername
    const clusterName = projectName;

    // Create the EKS cluster
    return new eks.Cluster("bomdemo-tools", {
        name: clusterName,
        // Put the cluster in the new VPC created earlier
        vpcId: vpcId,
        // TODO: Pull this out to the configs
        version: version,
        // Public subnets will be used for load balancers
        publicSubnetIds: vpcPublicSubnetIds,
        // Private subnets will be used for cluster nodes
        privateSubnetIds: vpcPrivateSubnetIds,
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
};

