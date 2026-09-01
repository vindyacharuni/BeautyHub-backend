/**
 * Generic Validation Middleware using Zod.
 * Validates req.body, req.query, and req.params against provided schema.
 */
export function validate(schema) {
    return async (req, res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params
            });
            next();
        } catch (error) {
            const issues = error.issues || error.errors;
            if (issues && Array.isArray(issues)) {
                const formattedErrors = issues.map(err => ({
                    field: err.path.slice(1).join('.'),
                    message: err.message
                }));
                return res.status(400).json({
                    message: "Input validation error: " + formattedErrors.map(e => e.message).join('; '),
                    errors: formattedErrors
                });
            }
            return res.status(400).json({ message: "Invalid request payload", error: error.message });
        }
    };
}
