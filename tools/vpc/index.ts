import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Grab some values from the Pulumi configuration (or use default values)
const config = new pulumi.Config();
const environment = config.get("environment") || "dev";
const vpcNetworkCidr = config.get("vpcNetworkCidr") || "10.0.0.0/16";


// Create a new VPC
const vpc = new awsx.ec2.Vpc("bomdemo-tools-eks-vpc", {
    enableDnsHostnames: true,
    cidrBlock: vpcNetworkCidr
});


// outputs
export const vpcId = vpc.vpcId;
export const publicSubnetIds = vpc.publicSubnetIds;
export const privateSubnetIds = vpc.privateSubnetIds;