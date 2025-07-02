"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kafkaConfig = void 0;
exports.kafkaConfig = {
    clientId: 'user_service',
    brokers: [process.env.KAFKA_BOOTSTRAP_SERVERS || '192.168.1.38:9092'],
    groupId: 'user-group',
    retry: {
        retries: 10,
        initialRetryTime: 300,
        maxRetryTime: 10000,
    }
};
