import * as awsx from "@pulumi/awsx";

// Export a function that will create a vpc resource
export const vpc = (vpcNetworkCidr: string, projectName: string) => {

    // Create the names to use
    const vpcName = projectName + "-vpc"
    const clusterName = projectName;

    // Tag the vpc's subnets for the amazon load balancer controller
    const subnetTag = "kubernetes.io/cluster/" + clusterName;

    // Create and return the new vpc
    return new awsx.ec2.Vpc(projectName + "-vpc", {
        enableDnsHostnames: true,
        cidrBlock: vpcNetworkCidr,
        subnetSpecs: [
            {
                type: awsx.ec2.SubnetType.Public,
                tags: {
                    [subnetTag]: "shared",
                    "kubernetes.io/role/elb": "1"
                }
            },
            {
                type: awsx.ec2.SubnetType.Private,
                tags: {
                    [subnetTag]: "shared",
                    "kubernetes.io/role/internal-elb": "1"
                }
            }
        ]
    });
}