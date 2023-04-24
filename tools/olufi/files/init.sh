#cloud-boothook
#!/bin/bash

sudo apt update
apt install unzip curl


# Install ssm agent
sudo snap install amazon-ssm-agent --classic


# Install aws cli
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install

# Install pulumi
curl -fsSL https://get.pulumi.com | sh
echo 'export PATH=/.pulumi/bin:$PATH' >> ~/.bashrc
echo 'export PATH=/.pulumi/bin:$PATH' >> /home/ubuntu/.bashrc

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install npm
sudo apt install npm

# Install docker
sudo apt install docker.io
sudo usermod -aG docker ubuntu

# Install actions-runner
sudo -u ubuntu mkdir /home/ubuntu/actions-runner
sudo -u ubuntu cd /home/ubuntu/actions-runner

sudo apt install jq
GITHUB_RUNNER_VERSION=$(curl --silent "https://api.github.com/repos/actions/runner/releases/latest" | jq -r '.tag_name[1:]') && \
    sudo -u ubuntu curl -o /home/ubuntu/actions-runner/actions-runner-linux-x64-${GITHUB_RUNNER_VERSION}.tar.gz -L https://github.com/actions/runner/releases/download/v${GITHUB_RUNNER_VERSION}/actions-runner-linux-x64-${GITHUB_RUNNER_VERSION}.tar.gz && \
    sudo -u ubuntu tar xzf /home/ubuntu/actions-runner/actions-runner-linux-x64-${GITHUB_RUNNER_VERSION}.tar.gz -C /home/ubuntu/actions-runner

registration_url="https://github.com/${GITHUB_PROJECT}"
token_url="https://api.github.com/orgs/${GITHUB_PROJECT}/actions/runners/registration-token"

payload=$(curl -sX POST -H "Authorization: Bearer ${GITHUB_PAT}" ${token_url})
runner_token=$(echo $payload | jq .token --raw-output)

sudo -u ubuntu EC2_INSTANCE_ID=`wget -q -O - http://169.254.169.254/latest/meta-data/instance-id` bash -c 'cd /home/ubuntu/actions-runner/;./config.sh --url https://github.com/BOM-DEMO --token ${runner_token} --name "${runner_name}-$${EC2_INSTANCE_ID}" --work _work --labels ${labels} --runasservice'


source ~/.bashrc