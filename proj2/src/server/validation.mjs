import express from "express";
import { body, validationResult } from "express-validator";
/**
 * returns an express-validatior chain that ensures that {field} exists
 * in the request body.
 *
 * @param {string} field - field name
 * @returns validation chain
 */
export const validateField = (field) =>
  body(field).notEmpty().withMessage(`'${field}' field is missing.`);

/**
 * express middleware for handling express-validator errors
 * @param {express.Request} req
 * @param {express.Result} res
 * @param {express.RequestHandler} next
 * @returns nothing
 */
export const handleValidationErrors = (req, res, next) => {
  // check for validation errors
  const result = validationResult(req);
  if (!result.isEmpty()) {
    res.status(422).json({ errors: result.array() });
    return;
  }
  next();
};
