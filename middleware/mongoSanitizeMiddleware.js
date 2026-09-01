import mongoSanitize from 'express-mongo-sanitize';

/**
 * Express 5 compatible NoSQL injection sanitization middleware.
 * Mutates req.body, req.params, and req.query in place to strip/replace MongoDB operators (e.g. keys starting with $ or containing .).
 */
export function sanitizeInput(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        mongoSanitize.sanitize(req.body, { replaceWith: '_' });
    }
    if (req.params && typeof req.params === 'object') {
        mongoSanitize.sanitize(req.params, { replaceWith: '_' });
    }
    if (req.query && typeof req.query === 'object') {
        mongoSanitize.sanitize(req.query, { replaceWith: '_' });
    }
    next();
}
