import express from "express";
import { body, validationResult } from "express-validator";
import { chatExists } from "./chat-db.mjs";

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

/**
 * express middleware for ensuring that a resource actually exists with the given
 * id (from the URL parameter.)
 * @param {express.Request} req
 * @param {express.Result} res
 * @param {express.RequestHandler} next
 * @returns nothing
 */
export const validateChatExists = async (req, res, next) => {
  if (!(await chatExists(req.params.id))) {
    res
      .status(404)
      .json({ errors: [`chat "${req.params.id}" does not exist.`] });
    return;
  }
  next();
};
