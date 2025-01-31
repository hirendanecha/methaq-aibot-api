module.exports = {
    database: {
        options: {
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
        },
    },
    user: {
        roles: ["Admin", "User", "Broker", "Agent", "Garage", "Supervisor"],
    },
    roles: {
        admin: "Admin",
        supervisor: "Supervisor",
        agent: "Agent",
        user: "User",
        broker: "Broker",
        garage: "Garage",
    }
};
