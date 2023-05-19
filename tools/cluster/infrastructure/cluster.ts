import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws"
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";


export const cluster = (projectName: string, vpcId: pulumi.Output<string>, version: string, vpcPublicSubnetIds: pulumi.Output<string[]>, 
    vpcPrivateSubnetIds: pulumi.Output<string[]>, eksNodeInstanceType: string, desiredClusterSize: number, 
    minClusterSize: number, maxClusterSize: number, adminRole: pulumi.Output<any>, ciliumEni: boolean = false) => {

    // create the clustername
    const clusterName = projectName;

    // Create the EKS cluster
    const eksCluster = new eks.Cluster("bomdemo-tools", {
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
        // skip default node group
        skipDefaultNodeGroup: true,
        // Do not give the worker nodes public IP addresses
        nodeAssociatePublicIpAddress: false,
        // Uncomment the next two lines for a private cluster (VPN access required)
        // endpointPrivateAccess: true,
        // endpointPublicAccess: false
        createOidcProvider: true,
        // Define storage classes for persistent volume claims
        storageClasses: "gp2",
        // Define roleMappings to allow different roles access to the cluster
        // THis is needed so that both Olufi and users can use kubectl
        roleMappings: [
            {
                groups: ["system:masters"],
                username: "admin",
                roleArn: adminRole
            },
            {
                groups: ["system:masters"],
                username: "admin",
                roleArn: "arn:aws:iam::593393184947:role/l1-developers"
            }
        ]
    });


    if (ciliumEni) {
        const managedNodeGroup = new eks.ManagedNodeGroup("ciliumNodeGroup", {
            cluster: eksCluster,
            nodeRole: eksCluster.instanceRoles[0],
            instanceTypes: [eksNodeInstanceType],
            scalingConfig: {
                desiredSize: desiredClusterSize,
                minSize: minClusterSize,
                maxSize: maxClusterSize
            },
            taints: [{
                    key: "node.cilium.io/agent-not-ready",
                    value: "true",
                    effect: "NO_EXECUTE",
                }],
        });
    }

    return eksCluster
};

