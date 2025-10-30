# STYLE

To maintain consistency, readability, and quality across the **Uncle Tony Voice App** project, all contributors must adhere to the following coding standards.

---

## 1. General Code Style

- **Language:** JavaScript (ES2023)
- **Module System:** ES Modules (`import` / `export`)
- **Environment:** Supports both Browser and Node.js globals.

---

## 2. ESLint Rules

The project uses **ESLint 9** with the official `@eslint/js` recommended configuration, plus a few custom rules:

| Rule                          | Description                                                     | Level      |
| ----------------------------- | --------------------------------------------------------------- | ---------- |
| `semi: ["error", "always"]`   | Enforce semicolons at the end of statements                     | 🔴 Error   |
| `quotes: ["error", "double"]` | Use **double quotes** for all strings                           | 🔴 Error   |
| `indent: ["error", 2]`        | Enforce **2-space indentation**                                 | 🔴 Error   |
| `no-unused-vars: "warn"`      | Warn about unused variables                                     | 🟡 Warning |
| `no-console: "off"`           | Allow `console.log` and similar for debugging                   | ⚪ Off     |
| `no-undef: "off"`             | Disable undefined variable errors (handled by bundler/test env) | ⚪ Off     |

**Ignored directories:**

- node_modules/
- dist/
- coverage/

---

## 3. Prettier Formatting

Prettier enforces consistent code formatting across the codebase.

| Setting         | Value   | Description                                                    |
| --------------- | ------- | -------------------------------------------------------------- |
| `endOfLine`     | `"lf"`  | Use Unix-style line endings                                    |
| `semi`          | `true`  | Always include semicolons                                      |
| `singleQuote`   | `false` | Use **double quotes**                                          |
| `tabWidth`      | `2`     | Indent with 2 spaces                                           |
| `trailingComma` | `"es5"` | Add trailing commas where valid in ES5 (objects, arrays, etc.) |
| `printWidth`    | `120`   | Maximum line width before wrapping                             |

---

## 4. Formatting & Lint Commands

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `npm run lint`     | Check for linting errors             |
| `npm run lint:fix` | Automatically fix simple lint issues |
| `npm run format`   | Format all files using Prettier      |

All pull requests must pass lint and format checks before merging.

---

## 5. Editor Configuration (Recommended)

To ensure your local environment follows the same conventions:

- Install **ESLint** and **Prettier** extensions in your code editor.
- Enable **“Format on Save”**.
- Set **line endings** to `LF`.
- Use **UTF-8** encoding.

---

## 6. Summary

Following these guidelines ensures:

- Code looks and behaves consistently across contributors.
- Linting and formatting tools can automate style enforcement.
- The project remains easy to read, debug, and maintain.

---
