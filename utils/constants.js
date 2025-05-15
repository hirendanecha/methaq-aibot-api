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
  chatStatus: ["active", "archived"],
  chatTags: ["new", "transferred", "document_received", "pending", "qulified_lead", "to_do", "abu_dhabi_claim", "al_ain_claim", "dubai_other_claim", "complaint_submitted"],
};
