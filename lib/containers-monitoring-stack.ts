import * as cdk from '@aws-cdk/core';
import {DockerImageAsset} from "@aws-cdk/aws-ecr-assets";
import * as ecsp from "@aws-cdk/aws-ecs-patterns";
import * as ecs from "@aws-cdk/aws-ecs";
import * as logs from "@aws-cdk/aws-logs"
import * as iam from "@aws-cdk/aws-iam"
import * as path from "path";

export class ContainersMonitoringStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Build our container and get it pushed to ECR
        const containerImage = new DockerImageAsset(this, 'BuildImage', {
            directory: path.join("containers", "testing"),
        })

        // Fargete cluster definition enabling container insights
        const fargateCluster = new ecs.Cluster(this, "FargateCluster", {
            clusterName: "LabTesting",
            containerInsights: true
        })

        // The log group we'll use for our application
        const logGroup = new logs.LogGroup(this, 'LogGroup', {
            retention: logs.RetentionDays.FIVE_DAYS
        })

        // Our task definition using the Fargate cluster above.
        const nodeServerTask = new ecs.FargateTaskDefinition(this, 'NodeWebServer', {})

        // Add permission to our task definition to send XRay Traces
        nodeServerTask.addToTaskRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                "xray:PutTraceSegments",
                "xray:PutTelemetryRecords"
            ],
            resources: ["*"],
        }))

        // Add our node container to our task definition.
        const nodeContainer = nodeServerTask.addContainer('NodeWebServerContainer', {
            containerName: "NodeWeb",
            image: ecs.ContainerImage.fromDockerImageAsset(containerImage),
            logging: ecs.LogDriver.awsLogs({
                logGroup: logGroup,
                streamPrefix: "nodejs/container/app"
            }),
            healthCheck: {
                command: [
                    "CMD-SHELL",
                    "curl -s http://localhost:8080/healthcheck"
                ],
                timeout: cdk.Duration.seconds(2),
                interval: cdk.Duration.seconds(5),
                startPeriod: cdk.Duration.seconds(10),
                retries: 3
            },
            portMappings: [
                {
                    containerPort: 8080
                }
            ]
        })

        // Add a the xray container that collects and sends data to Xray
        const xrayContainer = nodeServerTask.addContainer(`XrayContainer`, {
            image: ecs.ContainerImage.fromRegistry('public.ecr.aws/xray/aws-xray-daemon:latest'),
            logging: ecs.LogDriver.awsLogs({
                logGroup: logGroup,
                streamPrefix: "nodejs/container/xray"
            }),
            portMappings: [
                {
                    containerPort: 2000,
                    hostPort: 2000,
                    protocol: ecs.Protocol.UDP
                }
            ]
        })
        xrayContainer.addContainerDependencies({
            container: nodeContainer,
            condition: ecs.ContainerDependencyCondition.HEALTHY
        })
        const serviceWithAlb = new ecsp.ApplicationMultipleTargetGroupsFargateService(this, "AlbFargate", {
            taskDefinition: nodeServerTask,
            cluster: fargateCluster,
            targetGroups: [
                // First is the default.
                {
                    containerPort: 80,
                },
                // Second definition is our container
                {
                    containerPort: 8080,
                    pathPattern: '/',
                    priority: 10,
                }
            ]
        })
        // Configure a healthcheck
        serviceWithAlb.targetGroup.configureHealthCheck({path: "/healthcheck"})
    }
}
