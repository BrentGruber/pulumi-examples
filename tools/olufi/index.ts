import * as aws from "@pulumi/aws";
import * as fs from 'fs';


// Get the id for the latest Ubuntu AMI
// Using ubuntu so that actions runner can match local servers
// and actions steps can run on the same os
const ami = aws.ec2.getAmi({
    filters: [
        { name: "name", values: ["ubuntu/images/*jammy*amd64-server*"]},
    ],
    owners: ["099720109477"], //Canonical
    mostRecent: true,
}).then(result => result.id);

// create a new security group for port 80
// may not be needed for actions runner, but will keep it here for now
const group = new aws.ec2.SecurityGroup("olufi-secgrp", {
    ingress: [
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
        { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] }
    ],
    egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
});

// create an iam role assumable by ec2
// Todo get the managedPolicyArns from the existing role instead of hardcoding the policies
const olufiRole = new aws.iam.Role("olufi-role", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Sid: "",
            Principal: {
                Service: "ec2.amazonaws.com",
            },
        }],
    }),
    managedPolicyArns: [
        "arn:aws:iam::593393184947:policy/L1DevelopersDenyAccess",
        "arn:aws:iam::593393184947:policy/L1GlobalDenyAccess",
        "arn:aws:iam::593393184947:policy/L1Regions",
        "arn:aws:iam::593393184947:policy/L1UsersDenyAccess1of2",
        "arn:aws:iam::593393184947:policy/L1UsersDenyAccess2of2",
        "arn:aws:iam::aws:policy/AdministratorAccess",
        "arn:aws:iam::aws:policy/AWSSupportAccess",
        "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
    ]
});

// Create the machine profile so the ec2 can assume the iam role
const machineProfile = new aws.iam.InstanceProfile("olufi-profile", {role: olufiRole.name});

// replace environment variables in script
var startupScript = fs.readFileSync('files/init.sh', 'utf-8');
startupScript = startupScript.replace("${GITHUB_PAT}", process.env.GITHUB_PAT!)



// Create the ec2 instance
const server = new aws.ec2.Instance("olufi-server", {
    tags: { "Name": "olufi-server", "Owner": "Brent", "ManagedBy": "Pulumi"},
    instanceType: aws.ec2.InstanceType.T2_Large, // may need to beef this up
    vpcSecurityGroupIds: [ group.id ], // reference the group object above
    ami: ami,
    iamInstanceProfile: machineProfile.name,
    userData: startupScript
});

export const publicIp = server.publicIp;
export const publicHostName = server.publicDns;
export const olufiRoleArn = olufiRole.arn;