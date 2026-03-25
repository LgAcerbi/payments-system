import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import type { HttpErrorHelper, HttpErrorBody } from '@workspace/http';

import { AppError } from '@workspace/errors';

class FastifyErrorHandler {
    constructor(private readonly httpErrorHelper: HttpErrorHelper) {}

    public buildFromFastifyError(error: FastifyError & { statusCode: number }, request: FastifyRequest): HttpErrorBody {
        const { statusCode } = error;
        const typeSuffix = error.code ? `HTTP_${error.code}` : 'HTTP_ERROR';

        return this.httpErrorHelper.buildHttpErrorBody(
            statusCode,
            typeSuffix,
            this.httpErrorHelper.httpStatusTitle(statusCode),
            error.message,
            { url: request.url },
        );
    }

    public isFastifyClientError(error: unknown): error is FastifyError & { statusCode: number } {
        if (!(error instanceof Error)) {
            return false;
        }

        const candidate = error as FastifyError;
        const { statusCode } = candidate;

        return typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500;
    }

    public handle(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
        if (error instanceof AppError) {
            const body = this.httpErrorHelper.buildFromAppError(error, { url: request.url });

            return reply.type('application/problem+json').status(body.status).send(body);
        }

        if (this.isFastifyClientError(error)) {
            const body = this.buildFromFastifyError(error, request);

            return reply.type('application/problem+json').status(body.status).send(body);
        }

        request.log.error(error);

        const body = this.httpErrorHelper.buildInternal({ url: request.url });

        return reply.type('application/problem+json').status(body.status).send(body);
    }
}

export default FastifyErrorHandler;
export { FastifyErrorHandler };
