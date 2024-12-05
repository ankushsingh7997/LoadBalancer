const { CONFIG } = require("../Env/env");
const stateManager = require("../StateManagement/stateManager");
const { logger } = require("../Utils/logger");
const { launchInstanceFromAMI } = require("./launcher");

exports.checkClientScaling = () => {
    let totalClientCount = [...stateManager.state.instanceDetails.entries()]
        .filter(([_, details]) => !details.isMasterServer)
        .map(([instanceId, _]) => stateManager.getUserCountForInstance(instanceId))
        .reduce((total, current) => total + current, 0);

    if (totalClientCount >= CONFIG.SCALING_THRESHOLD_CLIENT) {
        launchInstanceFromAMI();
    }
};

exports.getMasterInstanceId = async (payload) => {
    const { service, master_actid, actid } = payload;

    // - get available instance id for master
    const masterInstanceId = stateManager.findAvailableMasterInstance(CONFIG.MAX_USER_PER_MASTER_INSTANCE);
    if (!masterInstanceId) {
        logger.error("no instance id found");
        return;
    }
    // - update master counts
    const currentUserCount = stateManager.incrementUserCount(masterInstanceId);
    if (currentUserCount >= CONFIG.SCALING_THRESHOLD_MASTER) launchInstanceFromAMI(true);
    return masterInstanceId;
};

exports.getClientInstanceId = async (payload) => {
    const { service, master_actid, actid } = payload;
    const clientMasterActid = Object.keys(master_actid)[0];

    // -Check if there's an existing master mapping
    if (stateManager.state.masterMapping.has(clientMasterActid)) {
        // -Get non-master available instances
        const availableClientInstances = [...stateManager.state.instanceDetails.entries()]
            .filter(([_, details]) => !details.isMasterServer)
            .map(([instanceId, _]) => instanceId);

        // -Round-robin distribution
        const existingClientsInstances = stateManager.getClientsForMaster(clientMasterActid) || [];
        const nextInstanceIndex = existingClientsInstances.length % availableClientInstances.length;
        const selectInstanceId = availableClientInstances[nextInstanceIndex];

        // -Update client-master tracking
        stateManager.createClientMasterTracking(clientMasterActid, actid);

        // -todo update this code push actid insted of selectInstanceId
        // -Increment user count for selected instance
        stateManager.incrementUserCount(selectInstanceId);

        // -Check scaling
        this.checkClientScaling();
        return selectInstanceId;
    }

    // - in case client login before master , no master mapping, distribute to client instances
    // - get available instance id and assign instance with lowest user count
    const selectInstanceId = stateManager.findAvailableClientInstance();
    if (!selectInstanceId) return false;

    // - Increment user count for selected instance
    stateManager.incrementUserCount(selectInstanceId);

    stateManager.createMasterMapping(clientMasterActid, selectInstanceId);
    stateManager.createClientInstanceTrack(selectInstanceId, actid);

    // - check if threshold exceedes for clients
    this.checkClientScaling();
    return selectInstanceId;
};
