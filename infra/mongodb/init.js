db = db.getSiblingDB("confidential_agent");

db.createCollection("incidents");

db.incidents.createIndex({ createdAt: -1 });
db.incidents.createIndex({ tenantId: 1, createdAt: -1 });
db.incidents.createIndex({ action: 1, riskScore: -1 });
