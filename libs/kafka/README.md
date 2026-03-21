# kafka

Shared Kafka bootstrap client for Nx apps.

## Usage

Import `KafkaNodeClient`, instantiate it with brokers and client id, then create producer/consumer instances.

```ts
import { KafkaNodeClient } from '@workspace/kafka';

const kafkaClient = new KafkaNodeClient({
    clientId: 'payment-service',
    brokers: ['kafka:9092'],
});

const producer = kafkaClient.getProducer();
await producer.connect();
```
