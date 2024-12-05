const { loggers } = require("winston");
const { logger } = require("../Utils/logger");
const { client, RedisConnection } = require("../Utils/redis");

class StateManager {
    constructor(initialState = {}) {
        RedisConnection.client = client;
        this.updateQueue = [];
        this.isProcessing = false;

        this.state = {
            instanceMap: new Map(initialState.instanceMap || []),
            instanceUserCounts: new Map(initialState.instanceUserCounts || []),
            instanceIPs: new Map(initialState.instanceIPs || []),
            instanceDetails: new Map(initialState.instanceDetails || []),
            masterMapping: new Map(initialState.masterMapping || []),
            clientMasterTraking: new Map(initialState.clientMasterTraking || []),
            clientInstanceTrack: new Map(initialState.clientInstanceTrack || []),
            masterCount: initialState.masterCount || 0,
            clientCount: initialState.clientCount || 0,
        };
    }
    _serializeMap(map) {
        return JSON.stringify([...map.entries()]);
    }

    _deserializeMap(serializedMap) {
        return new Map(JSON.parse(serializedMap || "[]"));
    }

    async _processUpdateQueue() {
        if (this.isProcessing) return;

        this.isProcessing = true;

        try {
            while (this.updateQueue.length > 0) {
                const update = this.updateQueue.shift();

                try {
                    await update();
                } catch (error) {
                    logger.error(`Error processing Redis update: ${error.message}`);
                }
            }
        } catch (error) {
            logger.error(`Queue processing error: ${error.message}`);
        } finally {
            this.isProcessing = false;
            if (this.updateQueue.length > 0) {
                this._processUpdateQueue();
            }
        }
    }

    _enqueueRedisUpdate(updateFn) {
        if (!RedisConnection.connected) {
            return;
        }
        this.updateQueue.push(updateFn);

        if (!this.isProcessing) {
            this._processUpdateQueue();
        }
    }

    _syncStateToRedis() {
        this._enqueueRedisUpdate(() => {
            const redisKey = "loadbalancer:global_state";
            const stateToSync = {
                instanceMap: this._serializeMap(this.state.instanceMap),
                instanceUserCounts: this._serializeMap(this.state.instanceUserCounts),
                instanceIPs: this._serializeMap(this.state.instanceIPs),
                instanceDetails: this._serializeMap(this.state.instanceDetails),
                masterMapping: this._serializeMap(this.state.masterMapping),
                clientMasterTraking: this._serializeMap(this.state.clientMasterTraking),
                masterCount: this.state.masterCount,
                clientCount: this.state.clientCount,
            };

            return RedisConnection.client.HSET(redisKey, stateToSync).then(() => {
                logger.info("Full state synchronized to Redis");
            });
        });
    }

    // -Create Operations
    createInstanceEntry(instanceId, details) {
        try {
            this.state.instanceDetails.set(instanceId, details);
            this.state.instanceUserCounts.set(instanceId, 0);

            this._enqueueRedisUpdate(() => {
                return Promise.all([
                    RedisConnection.client.HSET("loadbalancer:instance_details", instanceId, JSON.stringify(details)),
                    RedisConnection.client.HSET("loadbalancer:instance_user_counts", instanceId, "0"),
                ]).then(() => {
                    this._syncStateToRedis();
                });
            });

            return true;
        } catch (error) {
            logger.error(`Error creating instance entry: ${error.message}`);
            return false;
        }
    }

    createMasterMapping(masterActId, instanceId) {
        try {
            this.state.masterMapping.set(masterActId, instanceId);
            this._enqueueRedisUpdate(() => {
                return RedisConnection.client.HSET("loadbalancer:master_mapping", masterActId, instanceId).then(() => {
                    this._syncStateToRedis();
                });
            });
            return true;
        } catch (error) {
            logger.error(`Error creating master mapping: ${error.message}`);
            return false;
        }
    }
    createClientInstanceTrack(instanceId, actid) {
        try {
            if (!this.state.clientInstanceTrack.has(instanceId)) {
                this.state.clientInstanceTrack.set(instanceId, []);
            }
            let currentInstanceTrack = this.state.clientInstanceTrack.get(instanceId);
            currentInstanceTrack.push(actid);
            this._enqueueRedisUpdate(() => {
                return RedisConnection.client.HSET("loadbalancer:client_instance_track", instanceId, currentInstanceTrack).then(() => {
                    this._syncStateToRedis();
                });
            });
            return true;
        } catch (error) {
            logger.error(`Error creating master mapping: ${error.message}`);
            return false;
        }
    }

    createClientMasterTracking(masterActId, clientActId) {
        try {
            if (!this.state.clientMasterTraking.has(masterActId)) {
                this.state.clientMasterTraking.set(masterActId, []);
            }
            const currentClients = this.state.clientMasterTraking.get(masterActId);
            currentClients.push(clientActId);
            this._enqueueRedisUpdate(() => {
                return RedisConnection.client.HSET("loadbalancer:client_master_tracking", masterActId, JSON.stringify(currentClients)).then(() => {
                    this._syncStateToRedis();
                });
            });
            return true;
        } catch (error) {
            logger.error(`Error creating client master tracking: ${error.message}`);
            return false;
        }
    }

    async loadStateFromRedis() {
        try {
            if (!RedisConnection.connected) {
                logger.notify("Redis not connected. Skipping state load on loadbalancer");
                return;
            }

            const redisKey = "loadbalancer:global_state";
            const redisState = await RedisConnection.client.HGETALL(redisKey);

            if (redisState) {
                this.state = {
                    instanceMap: this._deserializeMap(redisState.instanceMap),
                    instanceUserCounts: this._deserializeMap(redisState.instanceUserCounts),
                    instanceIPs: this._deserializeMap(redisState.instanceIPs),
                    instanceDetails: this._deserializeMap(redisState.instanceDetails),
                    masterMapping: this._deserializeMap(redisState.masterMapping),
                    clientMasterTraking: this._deserializeMap(redisState.clientMasterTraking),
                    masterCount: parseInt(redisState.masterCount || "0"),
                    clientCount: parseInt(redisState.clientCount || "0"),
                };

                logger.info("State loaded from Redis");
                return true;
            }
            return false;
        } catch (error) {
            logger.error(`Failed to load state from Redis: ${error.message}`);
            return false;
        }
    }

    // -Read Operations
    getInstanceDetails(instanceId) {
        return this.state.instanceDetails.get(instanceId);
    }

    getUserCountForInstance(instanceId) {
        return this.state.instanceUserCounts.get(instanceId) || 0;
    }

    getMasterInstanceForActId(masterActId) {
        return this.state.masterMapping.get(masterActId);
    }

    getClientsForMaster(masterActId) {
        return this.state.clientMasterTraking.get(masterActId) || [];
    }

    // -Update Operations
    incrementUserCount(instanceId) {
        try {
            const currentCount = this.state.instanceUserCounts.get(instanceId) || 0;
            const newCount = currentCount + 1;
            this.state.instanceUserCounts.set(instanceId, newCount);
            this._enqueueRedisUpdate(() => {
                return RedisConnection.client.HSET("loadbalancer:instance_user_counts", instanceId, newCount.toString()).then(() => {
                    this._syncStateToRedis();
                });
            });
            return newCount;
        } catch (error) {
            logger.error(`Error incrementing user count: ${error.message}`);
            return null;
        }
    }

    updateInstanceDetails(instanceId, updatedDetails) {
        try {
            const existingDetails = this.state.instanceDetails.get(instanceId) || {};
            const mergedDetails = {
                ...existingDetails,
                ...updatedDetails,
            };
            this.state.instanceDetails.set(instanceId, mergedDetails);
            this._enqueueRedisUpdate(() => {
                return Promise.all([
                    RedisConnection.client.HSET("loadbalancer:instance_details", instanceId, JSON.stringify(mergedDetails)),
                    this._syncStateToRedis(),
                ]);
            });

            return true;
        } catch (error) {
            logger.error(`Error updating instance details: ${error.message}`);
            return false;
        }
    }

    // -Delete Operations
    removeInstanceEntry(instanceId) {
        try {
            this.state.instanceDetails.delete(instanceId);
            this.state.instanceUserCounts.delete(instanceId);

            this._enqueueRedisUpdate(() => {
                return Promise.all([
                    RedisConnection.client.HDEL("loadbalancer:instance_details", instanceId),
                    RedisConnection.client.HDEL("loadbalancer:instance_user_counts", instanceId),
                ]).then(() => {
                    this._syncStateToRedis();
                });
            });

            return true;
        } catch (error) {
            logger.error(`Error removing instance entry: ${error.message}`);
            return false;
        }
    }

    clearSpecificClientMapping(clientActId) {
        try {
            // - Remove clientMaster traking
            let clientRemoved = false;
            for (const [masterActid, clients] of this.state.clientMasterTraking.entries()) {
                const updatedClients = clients.filter((actid) => {
                    if (actid === clientActId) {
                        clientRemoved = true;
                        return false;
                    }
                    return true;
                });

                this.state.clientMasterTraking.set(masterActid, updatedClients);
            }

            // - Remove client from instance tracking
            for (const [instanceId, clients] of this.state.clientInstanceTrack.entries()) {
                const updatedClients = clients.filter((actid) => actid !== clientActId);

                if (updatedClients.length === 0) this.state.clientInstanceTrack.delete(instanceId);
                else {
                    this.state.clientInstanceTrack.set(instanceId, updatedClients);
                }
            }
            if (clientRemoved) this.state.clientCount = Math.max(0, this.state.clientCount - 1);
            this._enqueueRedisUpdate(() => {
                const redisUpdates = [
                    // -Update master tracking in Redis
                    ...Array.from(this.state.clientMasterTraking.entries()).map(([masterActId, clients]) =>
                        RedisConnection.client.HSET("loadbalancer:client_master_tracking", masterActId, JSON.stringify(clients))
                    ),

                    // - Update client instance tracking in Redis
                    RedisConnection.client.HSET(
                        "loadbalancer:client_instance_track",
                        JSON.stringify(Array.from(this.state.clientInstanceTrack.entries()))
                    ),

                    // - Update client count in Redis
                    RedisConnection.client.HSET("loadbalancer:global_state", "clientCount", this.state.clientCount.toString()),

                    // - Sync the global state
                    this._syncStateToRedis(),
                ];

                return Promise.all(redisUpdates);
            });

            logger.info(`Client mappings cleared for client: ${clientActId}`);
            return true;
        } catch (error) {
            logger.error(`Error clearing specific client mapping: ${error.message}`);
            return false;
        }
    }

    // -Additional Utility Methods
    findAvailableMasterInstance(masterActId, maxUsersPerMaster) {
        const existingInstanceId = this.getMasterInstanceForActId(masterActId);
        if (existingInstanceId) {
            const details = this.getInstanceDetails(existingInstanceId);

            if (details?.isMasterServer) {
                logger.info(`Reusing existing master instance ${existingInstanceId} for master ${masterActId}`);
                return existingInstanceId;
            }
        }

        for (const [instanceId, details] of this.state.instanceDetails.entries()) {
            if (details.isMasterServer && this.getUserCountForInstance(instanceId) < maxUsersPerMaster) {
                return instanceId;
            }
        }

        return null;
    }

    findAvailableClientInstance() {
        const clientInstances = [...this.state.instanceDetails.entries()]
            .filter(([_, details]) => !details.isMasterServer)
            .map(([instanceId, _]) => instanceId);
        if (clientInstances.length === 0) return null;

        return clientInstances?.reduce((lowest, current) =>
            this.getUserCountForInstance(current) < this.getUserCountForInstance(lowest) ? current : lowest
        );
    }
}

const stateManager = new StateManager();

setTimeout(() => {
    stateManager.loadStateFromRedis();
}, 3000);

module.exports = stateManager;
