"use strict";
// THIS FILE IS AUTOMATICALLY GENERATED. TO UPDATE THIS FILE YOU NEED TO CHANGE THE
// CORRESPONDING JSON SCHEMA FILE, THEN RUN devkit-admin build (or bazel build ...).
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutputHashing = exports.InlineStyleLanguage = exports.I18NTranslation = void 0;
/**
 * How to handle duplicate translations for i18n.
 *
 * How to handle missing translations for i18n.
 */
var I18NTranslation;
(function (I18NTranslation) {
    I18NTranslation["Error"] = "error";
    I18NTranslation["Ignore"] = "ignore";
    I18NTranslation["Warning"] = "warning";
})(I18NTranslation || (exports.I18NTranslation = I18NTranslation = {}));
/**
 * The stylesheet language to use for the application's inline component styles.
 */
var InlineStyleLanguage;
(function (InlineStyleLanguage) {
    InlineStyleLanguage["Css"] = "css";
    InlineStyleLanguage["Less"] = "less";
    InlineStyleLanguage["Sass"] = "sass";
    InlineStyleLanguage["Scss"] = "scss";
})(InlineStyleLanguage || (exports.InlineStyleLanguage = InlineStyleLanguage = {}));
/**
 * Define the output filename cache-busting hashing mode.
 */
var OutputHashing;
(function (OutputHashing) {
    OutputHashing["All"] = "all";
    OutputHashing["Bundles"] = "bundles";
    OutputHashing["Media"] = "media";
    OutputHashing["None"] = "none";
})(OutputHashing || (exports.OutputHashing = OutputHashing = {}));
