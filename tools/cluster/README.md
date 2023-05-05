[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/BOM-DEMO/infrastructure/tools/cluster/README.md)

# Tools Cluster

This deploys a single EKS cluster

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Doppler CLI](https://docs.doppler.com/docs/install-cli)
4. Access to the BOM-DEMO Pulumi organization
5. Access to the BOM-DEMO Doppler organization

### Steps

After cloning this repo, from this working directory, run these commands:

1. login to doppler, you should have access to the BOM-DEMO organization

    ```bash
    $ doppler login
    ```

2. Configure the doppler CLI to read from the correct project, this will use the doppler.yaml file in the repo to configure

    ```bash
    $ doppler setup
    ```

3. login to pulumi backend

    ```bash
    $ pulumi login
    ```

4. Stand up the infrastructure

    ```bash
    $ doppler run pulumi up
    ```

5. When complete you can configure your local kubectl to point to the new cluster

   ```bash
   $ export AWS_DEFAULT_REGION=us-east-2
   $ aws eks update-kubeconfig --name bomdemo-tools-eks
   ```

6. Now you can use kubectl to interact with the cluster

   ```bash
   $ kubectl get ns
   NAME                      STATUS   AGE
    alb-controller            Active   9m55s
    default                   Active   13m
    doppler-operator-system   Active   9m55s
    external-dns              Active   9m56s
    ingress-nginx             Active   9m55s
    kube-node-lease           Active   13m
    kube-public               Active   13m
    kube-system               Active   13m
   ```


### Explanation

This is an example of using pulumi to deploy an EKS cluster in the us-east-2 region of an AWS account, and setting up some namespaces with proper iam access to needed resources.  e.g. a namespace for amazon load balancer controllers with a predeployed service account that has iam access to create/update/delete load balancers in the account.

#### Pulumi

The pulumi code starts in index.js, however that is mostly used to orchestrate other modules, you can find the creation of all of the infrastructure resources under the infrastructure folder, e.g. cluster.ts and vpc.ts.

Pulumi will stand up a vpc with public and private subnets, and then also build an eks cluster in that vpc.  Once the cluster is built, pulumi will also provision some iam roles with necessary access for certain tools such as aws load balancer controller or external dns which will make configurations within the aws account


#### Doppler

Doppler is a secrets management SaaS, in this case we are using it to store any authentication tokens used for installing the software on the olufi instance.  e.g. GITHUB_PAT_TOKEN for the actions runner to authenticate with the BOM-DEMO github organization when registering the runner
