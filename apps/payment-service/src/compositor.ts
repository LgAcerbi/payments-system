import Fastify, { type FastifyInstance } from 'fastify';

export type ComposeOptions = {
  privateStripeKey: string;
  databaseUrl: string;
  kafkaBrokers: string[];
  httpServerPort: number;
};

export async function compose(options: ComposeOptions): Promise<{ httpServer: FastifyInstance }> {
  void options;
  const server = Fastify({ logger: true });
  return { httpServer: server };
}
