import * as pulumi from "@pulumi/pulumi";
import * as awsNative from "@pulumi/aws-native";

export const ACCOUNT_ID = awsNative.getAccountId({}).then(result => result.accountId);
export const DEFAULT_REGION = awsNative.getRegion({}).then(result => result.region);


// Create a VPC
const vpc = new awsNative.ec2.Vpc("vpc", {
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: createTags({
        Name: "pulumi-vpc",
    })
});

// インターネットゲートウェイ
// VPC-パブリックサブネットにインターネットに接続する
const strIgw = "myInternetGateway";

const igwArgs: awsNative.ec2.InternetGatewayArgs = {
    tags: createTags({ Name: strIgw })
};
export const igw = new awsNative.ec2.InternetGateway(strIgw, igwArgs);


// Attach the Internet Gateway to the VPC

const strVpcAttachment = strIgw + "-VPC-attachmment"
const gatewayAttachment = new awsNative.ec2.VpcGatewayAttachment(strVpcAttachment, {
    vpcId: vpc.id,
    internetGatewayId: igw.id
});

// public ルートテーブル
const strPublicRouteTable = `public-rtb`;

const routeTableArgs: awsNative.ec2.RouteTableArgs = {
    vpcId: vpc.id,
    tags: createTags({ Name: strPublicRouteTable })
}
export const publicRouteTable = new awsNative.ec2.RouteTable(strPublicRouteTable, routeTableArgs);

// Create subnets
const subnet1 = new awsNative.ec2.Subnet("subnet1", {
    vpcId: vpc.id,
    cidrBlock: "10.0.1.0/24",
    availabilityZone: "us-east-1a",
    mapPublicIpOnLaunch: false,
    tags: createTags({
        Name: "pulumi-subnet1",
    })
});

const subnet2 = new awsNative.ec2.Subnet("subnet2", {
    vpcId: vpc.id,
    cidrBlock: "10.0.2.0/24",
    availabilityZone: "us-east-1c",
    mapPublicIpOnLaunch: false,
    tags: createTags({
        Name: "pulumi-subnet2",
    })
});

// TODO nameは仮のもの
const strRouteTableAssA = `public-A-rtb-ass`;
const routeTableAssAArg: awsNative.ec2.SubnetRouteTableAssociationArgs = {
    subnetId: subnet1.id,
    routeTableId: publicRouteTable.id,
}
export const rtsassA = new awsNative.ec2.SubnetRouteTableAssociation(strRouteTableAssA, routeTableAssAArg);

const strRouteTableAssC = `public-C-rtb-ass`;
const routeTableAssCArg: awsNative.ec2.SubnetRouteTableAssociationArgs = {
    subnetId: subnet2.id,
    routeTableId: publicRouteTable.id
}
export const rtsassB = new awsNative.ec2.SubnetRouteTableAssociation(strRouteTableAssC, routeTableAssCArg);

// ec2.Public
// ルート設定
const strRoute = `rtb`;
const routeArgs: awsNative.ec2.RouteArgs = {
    routeTableId: publicRouteTable.id,
    destinationCidrBlock: "0.0.0.0/0",
    gatewayId: igw.id,
};

export const route = new awsNative.ec2.Route(strRoute, routeArgs);

// private ルートテーブル

const strPrivateRouteTable = `private-rtb`;

const privateRouteTableArgs: awsNative.ec2.RouteTableArgs = {
    vpcId: vpc.id,
    tags: createTags({ Name: strPrivateRouteTable })
}
export const privateRouteTable = new awsNative.ec2.RouteTable(strPrivateRouteTable, privateRouteTableArgs);

const strPrivateSubnet1 = "privateSubnet1";
const privateSubnet1 = new awsNative.ec2.Subnet(strPrivateSubnet1, {
    vpcId: vpc.id,
    cidrBlock: "10.0.3.0/24",
    availabilityZone: "us-east-1a",
    mapPublicIpOnLaunch: false,
    tags: createTags({
        Name: strPrivateSubnet1,
    })
});
// TODO: プライベートネットワーク側はAZをまだ分けてないので１系のみ
// const strPrivateSubnet2 = "privateSubnet2";
// const privateSubnet2 = new awsNative.ec2.Subnet(strPrivateSubnet2, {
//     vpcId: vpc.id,
//     cidrBlock: "10.0.4.0/24",
//     availabilityZone: "ap-northeast-1c",
//     mapPublicIpOnLaunch: false,
//     tags: createTags({
//         Name: strPrivateSubnet2,
//     })
// });

// TODO nameは仮のもの
// NAT Gatewayコンテナイメージなどを取りに行くため（簡単だが課金が大きい）
const strEip1 = "myEip1";
const eip1Args: awsNative.ec2.EipArgs = {
    domain: "vpc",
    tags: createTags({
        Name: `pulumi-${strEip1}`,
    })
};

const eip1 = new awsNative.ec2.Eip(strEip1, eip1Args);

const strNatGw1 = "myNatGateway1";
const natGw1Args: awsNative.ec2.NatGatewayArgs = {
    allocationId: eip1.allocationId,
    subnetId: subnet1.id,
    tags: createTags({
        Name: `pulumi-${strNatGw1}`,
    })
};

export const natGW1 = new awsNative.ec2.NatGateway(strNatGw1, natGw1Args);

// TODO: プライベートネットワーク側はAZをまだ分けてないので１系のみ
// const strEip2 = "myEip2";
// const eip2Args: awsNative.ec2.EipArgs = {
//     domain: "vpc",
//     tags: createTags({
//         Name: `pulumi-${strEip1}`,
//     })
// };

// const eip2 = new awsNative.ec2.Eip(strEip2, eip2Args);

// const strNatGw2 = "myNatGateway2";
// const natGw2Args: awsNative.ec2.NatGatewayArgs = {
//     allocationId: eip2.allocationId,
//     subnetId: subnet2.id,
//     tags: createTags({
//         Name: `pulumi-${strNatGw1}`,
//     })
// };

// export const natGW2 = new awsNative.ec2.NatGateway(strNatGw2, natGw2Args);

const strPrivateRouteTableAssA = `private-A-rtb-ass`;
const privateRouteTableAssAArg: awsNative.ec2.SubnetRouteTableAssociationArgs = {
    subnetId: privateSubnet1.id,
    routeTableId: privateRouteTable.id,
}
export const privateRtsassA = new awsNative.ec2.SubnetRouteTableAssociation(strPrivateRouteTableAssA, privateRouteTableAssAArg);

// const strPrivateRouteTableAssC = `private-C-rtb-ass`;
// const privateRoutetableAssCArg: awsNative.ec2.SubnetRouteTableAssociationArgs = {
//     subnetId: privateSubnet2.id,
//     routeTableId: privateRouteTable.id
// }
// export const privateRtsassB = new awsNative.ec2.SubnetRouteTableAssociation(strPrivateRouteTableAssC, privateRoutetableAssCArg);

// ルート設定
const strPrivateRoute = `PrivateRtb`;
const privateRouteArgs: awsNative.ec2.RouteArgs = {
    routeTableId: privateRouteTable.id,
    destinationCidrBlock: "0.0.0.0/0",
    natGatewayId: natGW1.id
};

export const privateRoute = new awsNative.ec2.Route(strPrivateRoute, privateRouteArgs);

// Create a security group
const publicSecurityGroup = new awsNative.ec2.SecurityGroup("publicSecurityGroup", {
    vpcId: vpc.id,
    groupDescription: "Allow all HTTP(s) traffic",
    securityGroupIngress: [
        { ipProtocol: "tcp", fromPort: 80, toPort: 80, cidrIp: "0.0.0.0/0" },
        { ipProtocol: "tcp", fromPort: 443, toPort: 443, cidrIp: "0.0.0.0/0" },
    ],
    // CidrIp: !Ref ALBAllowInboundIP アクセスできるIPを制限
    tags: createTags({
        Name: "pulumi-public-sg",
    })
});

const privateSecurityGroup = new awsNative.ec2.SecurityGroup("privateSecurityGroup", {
    vpcId: vpc.id,
    groupDescription: "Allow all HTTP(s) traffic",
    securityGroupIngress: [
        { ipProtocol: "tcp", fromPort: 80, toPort: 80, cidrIp: "0.0.0.0/0" },
        { ipProtocol: "tcp", fromPort: 443, toPort: 443, cidrIp: "0.0.0.0/0" },
    ],

    securityGroupEgress: [
        { ipProtocol: "-1", fromPort: 0, toPort: 0, cidrIp: "0.0.0.0/0" },
    ],
    tags: createTags({
        Name: "pulumi-private-sg",
    })
});

// Create a load balancer
const alb = new awsNative.elasticloadbalancingv2.LoadBalancer("loadBalancer", {
    name: "pulumi-lb",
    subnets: [subnet1.id, subnet2.id],
    scheme: "internet-facing",
    securityGroups: [publicSecurityGroup.id],
    tags: createTags({
        Name: "pulumi-loadBalancer",
    })
});

// Create a target group
const targetGroup = new awsNative.elasticloadbalancingv2.TargetGroup("targetGroup", {
    name: "pulumi-tg",
    port: 80,
    protocol: "HTTP",
    vpcId: vpc.id,
    targetType: "ip",
    tags: createTags({
        Name: "pulumi-targetGroup",
    })
});

// Create a listener
const listener = new awsNative.elasticloadbalancingv2.Listener("listener", {
    loadBalancerArn: alb.loadBalancerArn,
    port: 80,
    protocol: "HTTP",
    defaultActions: [{
        type: "forward",
        targetGroupArn: targetGroup.targetGroupArn,
    }],
});

// Log
const strLogGroup = `sample_LogGroup`;
const logGroupArgs: awsNative.logs.LogGroupArgs = {
    retentionInDays: 30
    // TODO tags は要検討
};

const logGroup = new awsNative.logs.LogGroup(strLogGroup, logGroupArgs);

// LogStreamの名称は要検討
const strLogStream = `sample-LogStream`;
const strLogStreamLgName = pulumi.interpolate`${logGroup.logGroupName}`
const logStreamArgs: awsNative.logs.LogStreamArgs = {
    logGroupName: strLogStreamLgName,
    logStreamName: strLogStream,
}
new awsNative.logs.LogStream(strLogStream, logStreamArgs);

const strEcsRoleName = "ecsTaskExecutionRoles";
const roleArgs: awsNative.iam.RoleArgs = {
    roleName: strEcsRoleName,
    assumeRolePolicyDocument: {
        Version: "2008-10-17",
        Statement: [
            {
                Sid: "",
                Effect: "Allow",
                Principal: {
                    Service: "ecs-tasks.amazonaws.com"
                },
                Action: "sts:AssumeRole"
            }
        ]
    }
};
export const escRole = new awsNative.iam.Role(strEcsRoleName, roleArgs);

const strRolePolicy = "ecs-ssm-access";
const policyDocument = {
    Version: "2012-10-17",
    Statement: [{
        Effect: "Allow",
        Action: [
            "ssm:GetParameters",
            "ssm:GetParameter",
            "secretsmanager:GetSecretValue",
            "ssmmessages:CreateControlChannel",
            "ssmmessages:CreateDataChannel",
            "ssmmessages:OpenControlChannel",
            "ssmmessages:OpenDataChannel"
        ],
        Resource: "*",
    },
    {
        "Effect": "Allow",
        "Action": "ecs:ExecuteCommand",
        // このResource名で良いのか？
        "Resource": pulumi.interpolate`arn:aws:ecs:${DEFAULT_REGION}:example-arn:cluster/example-cluster/*`,
    }],
};

const iamArgs: awsNative.iam.RolePolicyArgs = {
    roleName: pulumi.interpolate`${escRole.roleName}`,
    policyDocument: policyDocument
}
export const rolePolicy = new awsNative.iam.RolePolicy(strRolePolicy, iamArgs);
// ECS Cluster
const strCluster = `sample-cluster`;
const setting: awsNative.types.input.ecs.ClusterSettingsArgs = {
    name: "containerInsights",
    value: "enabled"
}

const clusterArgs: awsNative.ecs.ClusterArgs = {
    clusterSettings: [setting],
    tags: createTags({ Name: strCluster }),
}
export const cluster = new awsNative.ecs.Cluster(strCluster, clusterArgs);

const taskDefinition = new awsNative.ecs.TaskDefinition("taskDefinition", {
    family: "fargate-task",
    cpu: "256",
    memory: "512",
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    executionRoleArn: escRole.arn,
    taskRoleArn: escRole.arn,
    containerDefinitions: [{
        name: "my-app",
        image: "nginx:latest",
        essential: true,
        portMappings: [{ containerPort: 80, hostPort: 80, protocol: "tcp" }],
    }],
    tags: createTags({
        Name: "pulumi-taskDefinition",
    })
}, {
    dependsOn: natGW1 // 
});

// Create a Fargate service with ALB configuration
const service = new awsNative.ecs.Service("service", {
    cluster: cluster.arn,
    taskDefinition: taskDefinition.taskDefinitionArn,
    desiredCount: 1,
    // launchType: "FARGATE", // capacityProviderでFARGATE SPOTインスタンスを指定しているのでここの定義は不要
    capacityProviderStrategy: [
        {
            capacityProvider: 'FARGATE_SPOT',
            weight: 1,
        }
    ],
    networkConfiguration: {
        awsvpcConfiguration: {
            assignPublicIp: "DISABLED",
            securityGroups: [privateSecurityGroup.id],
            // スケーリングさせないので1つだけ
            subnets: [privateSubnet1.id],

        },
    },
    loadBalancers: [{
        targetGroupArn: targetGroup.targetGroupArn,
        containerName: "my-app",
        containerPort: 80,
    }],
    tags: createTags({
        Name: "pulumi-service",
    })
}, { dependsOn: alb }
);

export function createTags(additionalTags: Record<string, string> = {}): pulumi.Input<pulumi.Input<awsNative.types.input.TagArgs>[]>
{
    const baseTags = {
        "ManagedBy": "Pulumi",
        // "Environment": pulumi.getStack(),
        // "SystemName": SYSTEM_NAME
    };

    return Object.entries({ ...baseTags, ...additionalTags })
        .map(([key, value]) => ({ key, value }));
}
