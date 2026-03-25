import type { AppError } from '@workspace/errors';

import { z } from 'zod';
import { ErrorType } from '@workspace/errors';

/**
 * Supplies RFC 9457 `instance` without tying to a framework. Pass either:
 * - `{ instance: '...' }`, or
 * - a request-like object: Express `originalUrl` / `url`, Fastify `url`, etc.
 */
type HttpErrorInstanceSource = {
    instance?: string;
    url?: string;
    originalUrl?: string;
};

class HttpErrorHelper {
    private urnPrefix: string;

    constructor({ urnNamespace }: HttpErrorHelperConfig) {
        this.urnPrefix = urnNamespace.endsWith(':') ? urnNamespace : `${urnNamespace}:`;
    }

    private httpStatusByAppErrorType: Record<string, number> = {
        [ErrorType.NOT_FOUND]: 404,
        [ErrorType.VALIDATION]: 400,
        [ErrorType.CONFLICT]: 409,
        [ErrorType.BAD_REQUEST]: 400,
        [ErrorType.UNAUTHORIZED]: 401,
        [ErrorType.FORBIDDEN]: 403,
    };

    private titleByAppErrorType: Record<string, string> = {
        [ErrorType.NOT_FOUND]: 'Not Found',
        [ErrorType.VALIDATION]: 'Bad Request',
        [ErrorType.CONFLICT]: 'Conflict',
        [ErrorType.BAD_REQUEST]: 'Bad Request',
        [ErrorType.UNAUTHORIZED]: 'Unauthorized',
        [ErrorType.FORBIDDEN]: 'Forbidden',
    };

    public httpStatusTitle(status: number): string {
        const names: Record<number, string> = {
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            409: 'Conflict',
            422: 'Unprocessable Entity',
            500: 'Internal Server Error',
        };

        return names[status] ?? 'Error';
    }

    private resolveHttpErrorInstance(source: HttpErrorInstanceSource): string | undefined {
        if (typeof source.instance === 'string' && source.instance !== '') {
            return source.instance;
        }

        if (typeof source.originalUrl === 'string' && source.originalUrl !== '') {
            return source.originalUrl;
        }

        if (typeof source.url === 'string' && source.url !== '') {
            return source.url;
        }

        return undefined;
    }

    public getHttpStatusForAppError(error: AppError): number {
        return this.httpStatusByAppErrorType[error.type] ?? 500;
    }

    public problemTypeUrn(suffix: string): string {
        return `${this.urnPrefix}${encodeURIComponent(suffix)}`;
    }

    public buildHttpErrorBody(
        status: number,
        typeSuffix: string,
        title: string,
        detail: string,
        instanceSource: HttpErrorInstanceSource,
    ): HttpErrorBody {
        const instance = this.resolveHttpErrorInstance(instanceSource);
        const body: HttpErrorBody = {
            type: this.problemTypeUrn(typeSuffix),
            title,
            status,
            detail,
        };

        if (instance !== undefined) {
            body.instance = instance;
        }

        return body;
    }

    public buildFromAppError(error: AppError, instanceSource: HttpErrorInstanceSource): HttpErrorBody {
        const status = this.getHttpStatusForAppError(error);

        const title = this.titleByAppErrorType[error.type] ?? this.httpStatusTitle(status);

        const typeSuffix = status >= 500 ? 'INTERNAL' : error.type;

        return this.buildHttpErrorBody(status, typeSuffix, title, error.message, instanceSource);
    }

    public buildInternal(instanceSource: HttpErrorInstanceSource): HttpErrorBody {
        return this.buildHttpErrorBody(
            500,
            'INTERNAL',
            this.httpStatusTitle(500),
            'An unexpected error occurred.',
            instanceSource,
        );
    }
}

type HttpErrorHelperConfig = {
    urnNamespace: string;
};

/**
 * RFC 9457 Problem Details for HTTP APIs (application/problem+json).
 * @see https://www.rfc-editor.org/rfc/rfc9457.html
 */
const httpErrorSchema = z.object({
    type: z.string().describe('URI reference that identifies the problem type.'),
    title: z.string(),
    status: z.number().int(),
    detail: z.string(),
    instance: z.string().optional().describe('URI reference for this specific occurrence.'),
});

type HttpErrorBody = z.infer<typeof httpErrorSchema>;

export default HttpErrorHelper;
export { HttpErrorHelper, httpErrorSchema };
export type { HttpErrorBody, HttpErrorHelperConfig, HttpErrorInstanceSource };
