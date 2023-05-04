#cloud-boothook
#!/bin/bash

echo "----------------------"
echo "Install unzip and curl"
echo "----------------------"
apt update
apt install -y unzip curl


# Install aws cli
echo "---------------"
echo "Install aws cli"
echo "---------------"
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install

# Install pulumi
echo "--------------"
echo "Install pulumi"
echo "--------------"
curl -fsSL https://get.pulumi.com | sh
echo 'export PATH=/.pulumi/bin:$PATH' >> ~/.bashrc
echo 'export PATH=/.pulumi/bin:$PATH' >> /home/ubuntu/.bashrc

# Install kubectl
echo "---------------"
echo "Install Kubectl"
echo "---------------"
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install npm
echo "-----------"
echo "Install NPM"
echo "-----------"
apt install -y npm

# Install docker
echo "--------------"
echo "Install Docker"
echo "--------------"
apt install -y docker.io
usermod -aG docker ubuntu

# Install Doppler CLI
echo "-------------------"
echo "Install Doppler CLI"
echo "-------------------"
apt-get update && apt-get install -y apt-transport-https ca-certificates curl gnupg
curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | sudo apt-key add -
echo "deb https://packages.doppler.com/public/cli/deb/debian any-version main" | sudo tee /etc/apt/sources.list.d/doppler-cli.list
apt-get update && apt-get install -y doppler

# Install actions-runner
echo "----------------------"
echo "Install Actions Runner"
echo "----------------------"
sudo -u ubuntu mkdir /home/ubuntu/actions-runner

apt install -y jq
GITHUB_RUNNER_VERSION=$(curl --silent "https://api.github.com/repos/actions/runner/releases/latest" | jq -r '.tag_name[1:]') && \
    sudo -u ubuntu curl -o /home/ubuntu/actions-runner/actions-runner-linux-x64-${GITHUB_RUNNER_VERSION}.tar.gz -L https://github.com/actions/runner/releases/download/v${GITHUB_RUNNER_VERSION}/actions-runner-linux-x64-${GITHUB_RUNNER_VERSION}.tar.gz && \
    sudo -u ubuntu tar xzf /home/ubuntu/actions-runner/actions-runner-linux-x64-${GITHUB_RUNNER_VERSION}.tar.gz -C /home/ubuntu/actions-runner

registration_url="https://github.com/${GITHUB_PROJECT}"
token_url="https://api.github.com/orgs/${GITHUB_PROJECT}/actions/runners/registration-token"

payload=$(curl -sX POST -H "Authorization: Bearer ${GITHUB_PAT}" ${token_url})
runner_token=$(echo $payload | jq .token --raw-output)
runner_name=$(curl http://169.254.169.254/latest/meta-data/instance-id)

sudo -u ubuntu /home/ubuntu/actions-runner/config.sh --url https://github.com/BOM-DEMO --token ${runner_token} --name "${runner_name}" --work _work --labels ubuntu,pulumi,npm,docker --unattended --replace

/home/ubuntu/actions-runner/svc.sh install
/home/ubuntu/actions-runner/svc.sh start

source ~/.bashrc