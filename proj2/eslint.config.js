// eslint.config.js
import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "off",
            "no-undef": "off",
            semi: ["error", "always"],
            quotes: ["error", "double"],
            indent: ["error", 4],
        },
        ignores: ["node_modules/**", "dist/**", "coverage/**"],
    },
];
