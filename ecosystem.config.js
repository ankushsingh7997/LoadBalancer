module.exports = {
    apps: [
        {
            name: "LoadBalancer",
            script: "./server.js",
            instances: "1",
            exec_mode: "cluster",
            watch: true,
            ignore_watch: ["node_modules", "Logs", "tmp", "public", "StateData", ".git"],
            max_memory_restart: "1G",
            env: {
                NODE_ENV: "development",
               
            },
            env_production: {
                NODE_ENV: "production",
               
            },
            env_uat: {
                NODE_ENV: "uat",
            },
            env_local: {
                NODE_ENV: "local",

               
            },
            log_file: "./Logs/combined.log",
            error_file: "./Logs/error.log",
            out_file: "./Logs/output.log",
            time: false,
        },
       
    ],
};
