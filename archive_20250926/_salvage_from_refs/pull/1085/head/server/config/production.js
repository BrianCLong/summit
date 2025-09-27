module.exports = {server: {port: process.env.PORT || 8080,host: "0.0.0.0"},logging: {level: process.env.LOG_LEVEL || "info"},orchestration: {enabled: true,maxSources: 15}};
