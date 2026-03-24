import type { Producer, Consumer } from 'kafkajs';

import { Kafka } from 'kafkajs';

type KafkaNodeClientOptions = {
    brokers: string[];
    clientId: string;
};

class KafkaNodeClient {
    private readonly kafka: Kafka;

    constructor({ brokers, clientId }: KafkaNodeClientOptions) {
        if (!clientId) {
            throw new Error('Missing Kafka client id');
        }

        if (brokers.length === 0) {
            throw new Error('Missing Kafka brokers');
        }

        this.kafka = new Kafka({
            clientId,
            brokers,
        });
    }

    private isUnknownTopicError(error: unknown): boolean {
        if (!(error instanceof Error)) {
            return false;
        }

        return error.message.includes(
            'This server does not host this topic-partition',
        );
    }

    async getProducer(connectionRetries = 3): Promise<Producer> {
        const producer = this.kafka.producer();

        for (let i = 0; i < connectionRetries; i++) {
            try {
                await producer.connect();

                return producer;
            } catch (error) {
                if (!this.isUnknownTopicError(error)) {
                    throw error;
                }
            }
        }

        throw new Error('Failed to connect to Kafka producer');
    }

    async getConsumer(
        groupId: string,
        topic: string,
        fromBeginning = false,
        connectionRetries = 3,
    ): Promise<Consumer> {
        if (!groupId) {
            throw new Error('Missing Kafka consumer group id');
        }

        const consumer = this.kafka.consumer({ groupId });

        for (let i = 0; i < connectionRetries; i++) {
            try {
                await consumer.connect();

                await consumer.subscribe({
                    topic,
                    fromBeginning,
                });

                return consumer;
            } catch (error) {
                if (!this.isUnknownTopicError(error)) {
                    throw error;
                }

                await new Promise((resolve) => {
                    setTimeout(resolve, 1000);
                });
            }
        }

        throw new Error('Failed to connect to Kafka consumer');
    }
}

function createKafkaNodeClient(
    options: KafkaNodeClientOptions,
): KafkaNodeClient {
    return new KafkaNodeClient(options);
}

export { createKafkaNodeClient, KafkaNodeClient };
export type { KafkaNodeClientOptions };
