import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";


// Get the id for the latest Ubuntu AMI
// Using ubuntu so that actions runner can match local servers
// and actions steps can run on the same os
const ami = aws.ec2.getAmi({
    filters: [
        { name: "name", values: ["ubuntu/images/ubuntu-*-*-amd64-server-*"]},
    ],
    owners: ["099720109477"], //Amazon
    mostRecent: true,
}).then(result => result.id);

// create a new security group for port 80
// may not be needed for actions runner, but will keep it here for now
const group = new aws.ec2.securityGroup("olufi-secgrp", {
    ingress: [
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
    ],
});

// Create the ec2 instance
const server = new aws.ec2.Instance("olufi-server", {
    tags: { "Name": "olufi-server", "Owner": "Brent", "ManagedBy": "Pulumi"},
    instanceType: aws.ec2.InstanceType.T2_Micro, // may need to beef this up
    vpcSecurityGroupIds: [ group.id ], // reference the group object above
    ami: ami
});

export const publicIp = server.publicIp;
export const publicHostName = server.publicDns;