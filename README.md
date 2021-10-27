
Initial setup in Cloud9

```bash
nvm install 16
nvm use 16
npm install -g cdk
cdk --version
```

Code sample URL: [https://github.com/apmclean/sample-cdk-ecr](https://github.com/apmclean/sample-cdk-ecr)

```bash
npm install
cdk synth
cdk bootstrap
cdk deploy
```

Container insights deployment:

```aws cloudformation create-stack  \
--stack-name CWAgentECS-$clustername-us-east-1  \
--template-body "$(curl -Ls https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/ecs-task-definition-templates/deployment-mode/daemon-service/cwagent-ecs-instance-metric/cloudformation-quickstart/cwagent-ecs-instance-metric-cfn.json)" \
--parameters ParameterKey=ClusterName,ParameterValue=LabTesting ParameterKey=CreateIAMRoles,ParameterValue=True \
--capabilities CAPABILITY_NAMED_IAM \
--region us-east-1
```