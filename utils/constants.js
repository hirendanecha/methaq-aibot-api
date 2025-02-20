module.exports = {
  database: {
    options: {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    },
  },
  user: {
    roles: [
      "Admin",
      "Agent",
      "Supervisor",
    ],
  },
  roles: {
    superAdmin: "SuperAdmin",
    admin: "Admin",
    supervisor: "Supervisor",
    agent: "Agent",
    user: "User",
    broker: "Broker",
    garage: "Garage",
  },
  status: {
    status: ["success", "pending", "failed"],
    statusObj: {
      success: "success",
      pending: "pending",
      failed: "failed",
    },
  },
};
