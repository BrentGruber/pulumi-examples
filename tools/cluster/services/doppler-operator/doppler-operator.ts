import * as aws from '@pulumi/aws';
import * as k8s from '@pulumi/kubernetes';
import { createNamespace,  getSecrets } from '../utils';



export const dopplerOperator = (
    clusterOidcProvider: aws.iam.OpenIdConnectProvider,
    provider: k8s.Provider
) => {


    // create the argocd namespace
    const dopplerOperatorNamespace = createNamespace("doppler-operator-system", provider);

    // Get the secrets to create
    const dopplerSecrets = getSecrets();

    // Loop through all of the DOPPLER_TOKEN secrets
    // and create a kubernetes secret for each of them
    dopplerSecrets.forEach( (secret) => {

        const project = secret.project.toLowerCase()
        const env = secret.env.toLowerCase()
        const secret_name = project + "-" + env + "-doppler-token-secret";

        console.log("SECRET")
        console.log(secret.token)

        // apply the secret for doppler to authenticate
        const dopplerOperatorSecret = new k8s.core.v1.Secret(secret_name, {
            data: {
                serviceToken: btoa(secret.token!)
            },
            metadata: {
                name: secret_name,
                namespace: dopplerOperatorNamespace.metadata.name
            },
            type: "generic",

        }, {
            provider: provider
        });
    });

    // apply the helm chart
    // const dopplerOperatorChart = new k8s.helm.v3.Chart("doppler-kubernetes-operator", {
    //     chart: "doppler-kubernetes-operator",
    //     namespace: dopplerOperatorNamespace.metadata.name,
    //     version: "1.2.0",
    //     fetchOpts: {repo: "https://helm.doppler.com"}
    // }, {provider: provider});

    // return provisioned values
    return {
        dopplerOperatorNamespace
    };
}
