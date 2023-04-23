import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as k8s from '@pulumi/kubernetes';
import * as fs from 'fs';
import * as path from 'path';
import { createNamespace, createServiceAccount } from '../utils';



export const ingress = (
    clusterOidcProvider: aws.iam.OpenIdConnectProvider,
    provider: k8s.Provider,
    domain: string
) => {

    // Find some existing network information from the account
    const zone = aws.route53.getZone({ name: domain });
    const cert = aws.acm.getCertificateOutput({
        domain: domain
    });

    // create the ingress namespace
    const ingressNamespace = createNamespace("ingress-nginx", provider);

    // apply the helm chart
    const ingressChart = new k8s.helm.v3.Chart("ingress-nginx", {
        chart: "ingress-nginx",
        namespace: "ingress-nginx",
        version: "4.6.0",
        fetchOpts: {repo: "https://kubernetes.github.io/ingress-nginx"},
        values: {
            controller: {
                service: {
                    type: "LoadBalancer",
                    externalTrafficPolicy: "Local",
                    annotations: {
                        // AWS Load Balancer Controller Annotations
                        "service.beta.kubernetes.io/aws-load-balancer-type": "external",
                        "service.beta.kubernetes.io/aws-load-balancer-nlb-target-type": "ip",
                        "service.beta.kubernetes.io/aws-load-balancer-backend-protocol": "http",
                        "service.beta.kubernetes.io/aws-load-balancer-scheme": "internet-facing",
                    
                        // SSL Annotations
                        "service.beta.kubernetes.io/aws-load-balancer-ssl-cert": cert.arn,
                        "service.beta.kubernetes.io/aws-load-balancer-ssl-ports": "443",
    
                        // External DNS Annotations
                        "external-dns.alpha.kubernetes.io/hostname": domain
                    }
                }
            }
        }
    }, {provider: provider});

    // return provisioned values
    return {
        ingressNamespace,
        ingressChart
    };
}
