"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaService = void 0;
const common_1 = require("@nestjs/common");
const kafkajs_1 = require("kafkajs");
const users_service_1 = require("../services/users.service");
const auth_utils_1 = require("../utils/auth.utils");
const kafka_config_1 = require("../config/kafka.config");
const jwt_1 = require("@nestjs/jwt");
let KafkaService = class KafkaService {
    constructor(usersService, jwtService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        console.log('Initializing Kafka with config:', JSON.stringify(kafka_config_1.kafkaConfig));
        this.kafka = new kafkajs_1.Kafka(kafka_config_1.kafkaConfig);
        this.producer = this.kafka.producer();
        this.consumer = this.kafka.consumer({ groupId: kafka_config_1.kafkaConfig.groupId });
    }
    async onModuleInit() {
        console.log('Connecting to Kafka producer...');
        try {
            await this.producer.connect();
            console.log('Kafka producer connected successfully');
        }
        catch (error) {
            console.error('Failed to connect to Kafka producer:', error);
        }
        console.log('Connecting to Kafka consumer...');
        try {
            await this.consumer.connect();
            console.log('Kafka consumer connected successfully');
        }
        catch (error) {
            console.error('Failed to connect to Kafka consumer:', error);
        }
        // Subscribe to multiple topics
        const topicsToSubscribe = ['user.loggedin', 'user.registered']; // Add more topics as needed
        console.log('Subscribing to topics:', topicsToSubscribe);
        try {
            await this.consumer.subscribe({ topics: topicsToSubscribe, fromBeginning: true });
            console.log('Subscribed to topics successfully:', topicsToSubscribe);
        }
        catch (error) {
            console.error('Failed to subscribe to topics:', error);
        }
        await this.consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                console.log(`Received message from topic: ${topic}, partition: ${partition}`);
                if (!message.value) {
                    console.warn('Received message with null value, skipping processing');
                    return;
                }
                const data = JSON.parse(message.value.toString());
                console.log(`Received message for action: ${data.action || 'unknown'} from topic ${topic}`, data);
                console.log(`Message key: ${message.key ? message.key.toString() : 'null'}`);
                console.log(`Message timestamp: ${message.timestamp}`);
                console.log(`Message headers:`, message.headers);
                let result;
                try {
                    if (data.action === 'registered' && topic === 'user.registered') {
                        // Handle registration success event
                        const user = await this.usersService.findByEmail(data.email);
                        console.log(user);
                        console.log(data);
                        if (!user) {
                            result = { status: 'error', message: 'User not found' };
                        }
                        else {
                            result = { status: 'success', user: { id: user.id, email: user.email, role: user.role }, created_at: data.created_at };
                        }
                    }
                    else if (data.action === 'login' && topic === 'user.loggedin') {
                        const user = await this.usersService.findByEmail(data.email);
                        if (!user || !(await (0, auth_utils_1.comparePassword)(data.password, user.password))) {
                            result = { status: 'error', message: 'Invalid credentials' };
                        }
                        else {
                            const token = await (0, auth_utils_1.generateToken)(this.jwtService, { userId: user.id, email: user.email, role: user.role });
                            result = { status: 'success', user: { id: user.id, email: user.email, role: user.role }, access_token: token };
                        }
                    }
                    else if (data.action === 'profile' && topic === 'user.loggedin') {
                        const user = await this.usersService.findByEmail(data.email);
                        if (!user) {
                            result = { status: 'error', message: 'User not found' };
                        }
                        else {
                            result = { status: 'success', user: { id: user.id, email: user.email, role: user.role } };
                        }
                    }
                    else {
                        result = { status: 'error', message: 'Invalid action or topic mismatch' };
                    }
                    console.log('Sending response to topic: user.response', result);
                    await this.producer.send({
                        topic: 'user.response',
                        messages: [{ value: JSON.stringify(result) }],
                    });
                    console.log('Response sent successfully to topic: user.response');
                }
                catch (error) {
                    let errorMessage = 'Unknown error occurred';
                    if (error instanceof Error) {
                        errorMessage = error.message;
                    }
                    result = { status: 'error', message: errorMessage };
                    console.log('Sending error response to topic: user.response', result);
                    await this.producer.send({
                        topic: 'user.response',
                        messages: [{ value: JSON.stringify(result) }],
                    });
                    console.log('Error response sent successfully to topic: user.response');
                }
            },
        });
    }
    async onModuleDestroy() {
        await this.producer.disconnect();
        await this.consumer.disconnect();
    }
    // Public method to send messages
    async sendMessage(topic, messages) {
        try {
            await this.producer.send({ topic, messages });
            console.log(`Message sent successfully to topic ${topic}:`, messages);
        }
        catch (error) {
            console.error(`Failed to send message to topic ${topic}:`, error);
            throw error; // Re-throw to handle upstream if needed
        }
    }
};
exports.KafkaService = KafkaService;
exports.KafkaService = KafkaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService])
], KafkaService);
