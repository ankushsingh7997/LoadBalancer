const {
    EC2Client,
    waitUntilInstanceRunning,
    RunInstancesCommand,
    DescribeInstancesCommand,
    TerminateInstancesCommand,
} = require("@aws-sdk/client-ec2");
const { logger } = require("../Utils/logger");

const { CONFIG, credentials, SERVER_CONFIG } = require("../Env/env");
const stateManager = require("../StateManagement/stateManager");

const amiId = SERVER_CONFIG.ami_id;
const createEC2Client = () => {
    return new EC2Client({
        region: CONFIG.REGION,
        credentials,
    });
};

const ec2Client = createEC2Client();

const getInstancePrivateIP = async (instanceId) => {
    try {
        const { Reservations } = await ec2Client.send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }));
        const instance = Reservations[0].Instances[0];
        return instance.PrivateIpAddress;
    } catch (error) {
        logger.error(`Failed to retrieve IP for instance ${instanceId}:`, error);
        return null;
    }
};

const createServerName = (isMasterServer) => {
    const serverCount = isMasterServer ? stateManager.state.masterCount + 1 : stateManager.state.clientCount + 1;

    if (isMasterServer) {
        stateManager.state.masterCount++;
    } else {
        stateManager.state.clientCount++;
    }

    return isMasterServer ? `Master_Listener-${serverCount}` : `Client_Listener-${serverCount}`;
};

exports.launchInstanceFromAMI = async (isMasterServer = false, initialLaunch) => {
    try {
        const serverName = createServerName(isMasterServer);
        const launchParams = {
            ImageId: amiId,
            InstanceType: SERVER_CONFIG.instance_type,
            MinCount: 1,
            MaxCount: 1,
            KeyName: SERVER_CONFIG.keyname,
            IamInstanceProfile: {
                Name: SERVER_CONFIG.role,
            },
            NetworkInterfaces: [
                {
                    AssociatePublicIpAddress: true,
                    DeviceIndex: 0,
                    Groups: [SERVER_CONFIG.security_group],
                    SubnetId: SERVER_CONFIG.subnet_id,
                },
            ],
            TagSpecifications: [
                {
                    ResourceType: "instance",
                    Tags: [
                        {
                            Key: "Name",
                            Value: serverName,
                        },
                        {
                            Key: "Product",
                            Value: "Fincopy",
                        },
                    ],
                },
            ],
        };

        const command = new RunInstancesCommand(launchParams);
        const response = await ec2Client.send(command);
        const instanceId = response.Instances[0].InstanceId;
        await waitUntilInstanceRunning({ client: ec2Client }, { InstanceIds: [instanceId] });

        const ip = await getInstancePrivateIP(instanceId);

        // - Store instance details and initialized user count on Instance
        stateManager.createInstanceEntry(instanceId, {
            isMasterServer: isMasterServer,
            serverName: serverName,
        });

        stateManager.state.instanceIPs.set(instanceId, ip);

        if (!initialLaunch) {
            logger.notify(`Scaled instance: 
              - Instance ID:      ${instanceId}
              - Server Name:      ${serverName}
              - IP:               ${ip}`);
        }
        return { instanceId, serverName, isMasterServer, ip };
    } catch (err) {
        logger.error(err);
    }
};

exports.terminateAllInstance = async () => {
    try {
        const instanceIds = Array.from(stateManager.state.instanceDetails.keys());

        if (instanceIds.length === 0) {
            logger.notify("No instances to terminate.");
            return;
        }

        const command = new TerminateInstancesCommand({
            InstanceIds: instanceIds,
        });

        // Send terminate command
        const response = await ec2Client.send(command);
        logger.notify(`Terminated ${instanceIds.length} instances:
          - Instance IDs: ${instanceIds.join(", ")}`);

        return response;
    } catch (err) {
        logger.error("Failed to terminate instances:", err);
    }
};
