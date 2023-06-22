"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StylesheetPluginFactory = void 0;
const autoprefixer_1 = __importDefault(require("autoprefixer"));
const fast_glob_1 = __importDefault(require("fast-glob"));
const node_assert_1 = __importDefault(require("node:assert"));
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const load_result_cache_1 = require("../load-result-cache");
/**
 * The lazy-loaded instance of the postcss stylesheet postprocessor.
 * It is only imported and initialized if postcss is needed.
 */
let postcss;
class StylesheetPluginFactory {
    constructor(options, cache) {
        this.options = options;
        this.cache = cache;
        const autoprefixer = (0, autoprefixer_1.default)({
            overrideBrowserslist: options.browsers,
            ignoreUnknownVersions: true,
        });
        // Autoprefixer currently does not contain a method to check if autoprefixer is required
        // based on the provided list of browsers. However, it does contain a method that returns
        // informational text that can be used as a replacement. The text "Awesome!" will be present
        // when autoprefixer determines no actions are needed.
        // ref: https://github.com/postcss/autoprefixer/blob/e2f5c26ff1f3eaca95a21873723ce1cdf6e59f0e/lib/info.js#L118
        const autoprefixerInfo = autoprefixer.info();
        const skipAutoprefixer = autoprefixerInfo.includes('Awesome!');
        if (!skipAutoprefixer) {
            this.autoprefixer = autoprefixer;
        }
    }
    create(language) {
        // Return a noop plugin if no load actions are required
        if (!language.process && !this.autoprefixer && !this.options.tailwindConfiguration) {
            return {
                name: 'angular-' + language.name,
                setup() { },
            };
        }
        const { autoprefixer, cache, options } = this;
        return {
            name: 'angular-' + language.name,
            async setup(build) {
                // Setup postcss if needed by either autoprefixer or tailwind
                // TODO: Move this into the plugin factory to avoid repeat setup per created plugin
                let postcssProcessor;
                if (autoprefixer || options.tailwindConfiguration) {
                    postcss ?? (postcss = (await Promise.resolve().then(() => __importStar(require('postcss')))).default);
                    postcssProcessor = postcss();
                    if (options.tailwindConfiguration) {
                        const tailwind = await Promise.resolve(`${options.tailwindConfiguration.package}`).then(s => __importStar(require(s)));
                        postcssProcessor.use(tailwind.default({ config: options.tailwindConfiguration.file }));
                    }
                    if (autoprefixer) {
                        postcssProcessor.use(autoprefixer);
                    }
                }
                // Add a load callback to support inline Component styles
                build.onLoad({ filter: language.componentFilter, namespace: 'angular:styles/component' }, (0, load_result_cache_1.createCachedLoad)(cache, async (args) => {
                    const data = options.inlineComponentData?.[args.path];
                    (0, node_assert_1.default)(typeof data === 'string', `component style name should always be found [${args.path}]`);
                    const [format, , filename] = args.path.split(';', 3);
                    return processStylesheet(language, data, filename, format, options, build, postcssProcessor);
                }));
                // Add a load callback to support files from disk
                build.onLoad({ filter: language.fileFilter }, (0, load_result_cache_1.createCachedLoad)(cache, async (args) => {
                    const data = await (0, promises_1.readFile)(args.path, 'utf-8');
                    return processStylesheet(language, data, args.path, (0, node_path_1.extname)(args.path).toLowerCase().slice(1), options, build, postcssProcessor);
                }));
            },
        };
    }
}
exports.StylesheetPluginFactory = StylesheetPluginFactory;
async function processStylesheet(language, data, filename, format, options, build, postcssProcessor) {
    let result;
    // Process the input data if the language requires preprocessing
    if (language.process) {
        result = await language.process(data, filename, format, options, build);
    }
    else {
        result = {
            contents: data,
            loader: 'css',
            watchFiles: [filename],
        };
    }
    // Transform with postcss if needed and there are no errors
    if (postcssProcessor && result.contents && !result.errors?.length) {
        const postcssResult = await compileString(typeof result.contents === 'string'
            ? result.contents
            : Buffer.from(result.contents).toString('utf-8'), filename, postcssProcessor, options);
        // Merge results
        if (postcssResult.errors?.length) {
            delete result.contents;
        }
        if (result.warnings && postcssResult.warnings) {
            postcssResult.warnings.unshift(...result.warnings);
        }
        if (result.watchFiles && postcssResult.watchFiles) {
            postcssResult.watchFiles.unshift(...result.watchFiles);
        }
        if (result.watchDirs && postcssResult.watchDirs) {
            postcssResult.watchDirs.unshift(...result.watchDirs);
        }
        result = {
            ...result,
            ...postcssResult,
        };
    }
    return result;
}
/**
 * Compiles the provided CSS stylesheet data using a provided postcss processor and provides an
 * esbuild load result that can be used directly by an esbuild Plugin.
 * @param data The stylesheet content to process.
 * @param filename The name of the file that contains the data.
 * @param postcssProcessor A postcss processor instance to use.
 * @param options The plugin options to control the processing.
 * @returns An esbuild OnLoaderResult object with the processed content, warnings, and/or errors.
 */
async function compileString(data, filename, postcssProcessor, options) {
    try {
        const result = await postcssProcessor.process(data, {
            from: filename,
            to: filename,
            map: options.sourcemap && {
                inline: true,
                sourcesContent: true,
            },
        });
        const rawWarnings = result.warnings();
        let warnings;
        if (rawWarnings.length > 0) {
            const lineMappings = new Map();
            warnings = rawWarnings.map((warning) => {
                const file = warning.node.source?.input.file;
                if (file === undefined) {
                    return { text: warning.text };
                }
                let lines = lineMappings.get(file);
                if (lines === undefined) {
                    lines = warning.node.source?.input.css.split(/\r?\n/);
                    lineMappings.set(file, lines ?? null);
                }
                return {
                    text: warning.text,
                    location: {
                        file,
                        line: warning.line,
                        column: warning.column - 1,
                        lineText: lines?.[warning.line - 1],
                    },
                };
            });
        }
        let watchFiles;
        for (const resultMessage of result.messages) {
            if (resultMessage.type === 'dependency' && typeof resultMessage['file'] === 'string') {
                watchFiles ?? (watchFiles = []);
                watchFiles.push(resultMessage['file']);
            }
            else if (resultMessage.type === 'dir-dependency' &&
                typeof resultMessage['dir'] === 'string' &&
                typeof resultMessage['glob'] === 'string') {
                watchFiles ?? (watchFiles = []);
                const dependencies = await (0, fast_glob_1.default)(resultMessage['glob'], { cwd: resultMessage['dir'] });
                watchFiles.push(...dependencies);
            }
        }
        return {
            contents: result.css,
            loader: 'css',
            warnings,
            watchFiles,
        };
    }
    catch (error) {
        postcss ?? (postcss = (await Promise.resolve().then(() => __importStar(require('postcss')))).default);
        if (error instanceof postcss.CssSyntaxError) {
            const lines = error.source?.split(/\r?\n/);
            return {
                errors: [
                    {
                        text: error.reason,
                        location: {
                            file: error.file,
                            line: error.line,
                            column: error.column && error.column - 1,
                            lineText: error.line === undefined ? undefined : lines?.[error.line - 1],
                        },
                    },
                ],
            };
        }
        throw error;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3R5bGVzaGVldC1wbHVnaW4tZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX2FuZ3VsYXIvc3JjL3Rvb2xzL2VzYnVpbGQvc3R5bGVzaGVldHMvc3R5bGVzaGVldC1wbHVnaW4tZmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILGdFQUFvRDtBQUVwRCwwREFBNkI7QUFDN0IsOERBQWlDO0FBQ2pDLCtDQUE0QztBQUM1Qyx5Q0FBb0M7QUFDcEMsNERBQXlFO0FBRXpFOzs7R0FHRztBQUNILElBQUksT0FBd0QsQ0FBQztBQTJDN0QsTUFBYSx1QkFBdUI7SUFHbEMsWUFDbUIsT0FBZ0MsRUFDaEMsS0FBdUI7UUFEdkIsWUFBTyxHQUFQLE9BQU8sQ0FBeUI7UUFDaEMsVUFBSyxHQUFMLEtBQUssQ0FBa0I7UUFFeEMsTUFBTSxZQUFZLEdBQUcsSUFBQSxzQkFBd0IsRUFBQztZQUM1QyxvQkFBb0IsRUFBRSxPQUFPLENBQUMsUUFBUTtZQUN0QyxxQkFBcUIsRUFBRSxJQUFJO1NBQzVCLENBQUMsQ0FBQztRQUVILHdGQUF3RjtRQUN4Rix5RkFBeUY7UUFDekYsNEZBQTRGO1FBQzVGLHNEQUFzRDtRQUN0RCw4R0FBOEc7UUFDOUcsTUFBTSxnQkFBZ0IsR0FBRyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDN0MsTUFBTSxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFL0QsSUFBSSxDQUFDLGdCQUFnQixFQUFFO1lBQ3JCLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1NBQ2xDO0lBQ0gsQ0FBQztJQUVELE1BQU0sQ0FBQyxRQUFzQztRQUMzQyx1REFBdUQ7UUFDdkQsSUFBSSxDQUFD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Q0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO3lCQUN6RTtxQkFDRjtpQkFDRjthQUNGLENBQUM7U0FDSDtRQUVELE1BQU0sS0FBSyxDQUFDO0tBQ2I7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCBjcmVhdGVBdXRvUHJlZml4ZXJQbHVnaW4gZnJvbSAnYXV0b3ByZWZpeGVyJztcbmltcG9ydCB0eXBlIHsgT25Mb2FkUmVzdWx0LCBQbHVnaW4sIFBsdWdpbkJ1aWxkIH0gZnJvbSAnZXNidWlsZCc7XG5pbXBvcnQgZ2xvYiBmcm9tICdmYXN0LWdsb2InO1xuaW1wb3J0IGFzc2VydCBmcm9tICdub2RlOmFzc2VydCc7XG5pbXBvcnQgeyByZWFkRmlsZSB9IGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnO1xuaW1wb3J0IHsgZXh0bmFtZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBMb2FkUmVzdWx0Q2FjaGUsIGNyZWF0ZUNhY2hlZExvYWQgfSBmcm9tICcuLi9sb2FkLXJlc3VsdC1jYWNoZSc7XG5cbi8qKlxuICogVGhlIGxhenktbG9hZGVkIGluc3RhbmNlIG9mIHRoZSBwb3N0Y3NzIHN0eWxlc2hlZXQgcG9zdHByb2Nlc3Nvci5cbiAqIEl0IGlzIG9ubHkgaW1wb3J0ZWQgYW5kIGluaXRpYWxpemVkIGlmIHBvc3Rjc3MgaXMgbmVlZGVkLlxuICovXG5sZXQgcG9zdGNzczogdHlwZW9mIGltcG9ydCgncG9zdGNzcycpWydkZWZhdWx0J10gfCB1bmRlZmluZWQ7XG5cbi8qKlxuICogQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHBsdWdpbiBvcHRpb25zIHRvIHVzZSB3aGVuIHByb2Nlc3Npbmcgc3R5bGVzaGVldHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3R5bGVzaGVldFBsdWdpbk9wdGlvbnMge1xuICAvKipcbiAgICogQ29udHJvbHMgdGhlIHVzZSBhbmQgY3JlYXRpb24gb2Ygc291cmNlbWFwcyB3aGVuIHByb2Nlc3NpbmcgdGhlIHN0eWxlc2hlZXRzLlxuICAgKiBJZiB0cnVlLCBzb3VyY2VtYXAgcHJvY2Vzc2luZyBpcyBlbmFibGVkOyBpZiBmYWxzZSwgZGlzYWJsZWQuXG4gICAqL1xuICBzb3VyY2VtYXA6IGJvb2xlYW47XG5cbiAgaW5jbHVkZVBhdGhzPzogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIE9wdGlvbmFsIGNvbXBvbmVudCBkYXRhIGZvciBhbnkgaW5saW5lIHN0eWxlcyBmcm9tIENvbXBvbmVudCBkZWNvcmF0b3IgYHN0eWxlc2AgZmllbGRzLlxuICAgKiBUaGUga2V5IGlzIGFuIGludGVybmFsIGFuZ3VsYXIgcmVzb3VyY2UgVVJJIGFuZCB0aGUgdmFsdWUgaXMgdGhlIHN0eWxlc2hlZXQgY29udGVudC5cbiAgICovXG4gIGlubGluZUNvbXBvbmVudERhdGE/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuXG4gIC8qKlxuICAgKiBUaGUgYnJvd3NlcnMgdG8gc3VwcG9ydCBpbiBicm93c2Vyc2xpc3QgZm9ybWF0IHdoZW4gcHJvY2Vzc2luZyBzdHlsZXNoZWV0cy5cbiAgICogU29tZSBwb3N0Y3NzIHBsdWdpbnMgc3VjaCBhcyBhdXRvcHJlZml4ZXIgcmVxdWlyZSB0aGUgcmF3IGJyb3dzZXJzbGlzdCBpbmZvcm1hdGlvbiBpbnN0ZWFkXG4gICAqIG9mIHRoZSBlc2J1aWxkIGZvcm1hdHRlZCB0YXJnZXQuXG4gICAqL1xuICBicm93c2Vyczogc3RyaW5nW107XG5cbiAgdGFpbHdpbmRDb25maWd1cmF0aW9uPzogeyBmaWxlOiBzdHJpbmc7IHBhY2thZ2U6IHN0cmluZyB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFN0eWxlc2hlZXRMYW5ndWFnZSB7XG4gIG5hbWU6IHN0cmluZztcbiAgY29tcG9uZW50RmlsdGVyOiBSZWdFeHA7XG4gIGZpbGVGaWx0ZXI6IFJlZ0V4cDtcbiAgcHJvY2Vzcz8oXG4gICAgZGF0YTogc3RyaW5nLFxuICAgIGZpbGU6IHN0cmluZyxcbiAgICBmb3JtYXQ6IHN0cmluZyxcbiAgICBvcHRpb25zOiBTdHlsZXNoZWV0UGx1Z2luT3B0aW9ucyxcbiAgICBidWlsZDogUGx1Z2luQnVpbGQsXG4gICk6IE9uTG9hZFJlc3VsdCB8IFByb21pc2U8T25Mb2FkUmVzdWx0Pjtcbn1cblxuZXhwb3J0IGNsYXNzIFN0eWxlc2hlZXRQbHVnaW5GYWN0b3J5IHtcbiAgcHJpdmF0ZSBhdXRvcHJlZml4ZXI6IGltcG9ydCgncG9zdGNzcycpLlBsdWdpbiB8IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnM6IFN0eWxlc2hlZXRQbHVnaW5PcHRpb25zLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2FjaGU/OiBMb2FkUmVzdWx0Q2FjaGUsXG4gICkge1xuICAgIGNvbnN0IGF1dG9wcmVmaXhlciA9IGNyZWF0ZUF1dG9QcmVmaXhlclBsdWdpbih7XG4gICAgICBvdmVycmlkZUJyb3dzZXJzbGlzdDogb3B0aW9ucy5icm93c2VycyxcbiAgICAgIGlnbm9yZVVua25vd25WZXJzaW9uczogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIEF1dG9wcmVmaXhlciBjdXJyZW50bHkgZG9lcyBub3QgY29udGFpbiBhIG1ldGhvZCB0byBjaGVjayBpZiBhdXRvcHJlZml4ZXIgaXMgcmVxdWlyZWRcbiAgICAvLyBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgbGlzdCBvZiBicm93c2Vycy4gSG93ZXZlciwgaXQgZG9lcyBjb250YWluIGEgbWV0aG9kIHRoYXQgcmV0dXJuc1xuICAgIC8vIGluZm9ybWF0aW9uYWwgdGV4dCB0aGF0IGNhbiBiZSB1c2VkIGFzIGEgcmVwbGFjZW1lbnQuIFRoZSB0ZXh0IFwiQXdlc29tZSFcIiB3aWxsIGJlIHByZXNlbnRcbiAgICAvLyB3aGVuIGF1dG9wcmVmaXhlciBkZXRlcm1pbmVzIG5vIGFjdGlvbnMgYXJlIG5lZWRlZC5cbiAgICAvLyByZWY6IGh0dHBzOi8vZ2l0aHViLmNvbS9wb3N0Y3NzL2F1dG9wcmVmaXhlci9ibG9iL2UyZjVjMjZmZjFmM2VhY2E5NWEyMTg3MzcyM2NlMWNkZjZlNTlmMGUvbGliL2luZm8uanMjTDExOFxuICAgIGNvbnN0IGF1dG9wcmVmaXhlckluZm8gPSBhdXRvcHJlZml4ZXIuaW5mbygpO1xuICAgIGNvbnN0IHNraXBBdXRvcHJlZml4ZXIgPSBhdXRvcHJlZml4ZXJJbmZvLmluY2x1ZGVzKCdBd2Vzb21lIScpO1xuXG4gICAgaWYgKCFza2lwQXV0b3ByZWZpeGVyKSB7XG4gICAgICB0aGlzLmF1dG9wcmVmaXhlciA9IGF1dG9wcmVmaXhlcjtcbiAgICB9XG4gIH1cblxuICBjcmVhdGUobGFuZ3VhZ2U6IFJlYWRvbmx5PFN0eWxlc2hlZXRMYW5ndWFnZT4pOiBQbHVnaW4ge1xuICAgIC8vIFJldHVybiBhIG5vb3AgcGx1Z2luIGlmIG5vIGxvYWQgYWN0aW9ucyBhcmUgcmVxdWlyZWRcbiAgICBpZiAoIWxhbmd1YWdlLnByb2Nlc3MgJiYgIXRoaXMuYXV0b3ByZWZpeGVyICYmICF0aGlzLm9wdGlvbnMudGFpbHdpbmRDb25maWd1cmF0aW9uKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiAnYW5ndWxhci0nICsgbGFuZ3VhZ2UubmFtZSxcbiAgICAgICAgc2V0dXAoKSB7fSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc3QgeyBhdXRvcHJlZml4ZXIsIGNhY2hlLCBvcHRpb25zIH0gPSB0aGlzO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6ICdhbmd1bGFyLScgKyBsYW5ndWFnZS5uYW1lLFxuICAgICAgYXN5bmMgc2V0dXAoYnVpbGQpIHtcbiAgICAgICAgLy8gU2V0dXAgcG9zdGNzcyBpZiBuZWVkZWQgYnkgZWl0aGVyIGF1dG9wcmVmaXhlciBvciB0YWlsd2luZFxuICAgICAgICAvLyBUT0RPOiBNb3ZlIHRoaXMgaW50byB0aGUgcGx1Z2luIGZhY3RvcnkgdG8gYXZvaWQgcmVwZWF0IHNldHVwIHBlciBjcmVhdGVkIHBsdWdpblxuICAgICAgICBsZXQgcG9zdGNzc1Byb2Nlc3NvcjogaW1wb3J0KCdwb3N0Y3NzJykuUHJvY2Vzc29yIHwgdW5kZWZpbmVkO1xuICAgICAgICBpZiAoYXV0b3ByZWZpeGVyIHx8IG9wdGlvbnMudGFpbHdpbmRDb25maWd1cmF0aW9uKSB7XG4gICAgICAgICAgcG9zdGNzcyA/Pz0gKGF3YWl0IGltcG9ydCgncG9zdGNzcycpKS5kZWZhdWx0O1xuICAgICAgICAgIHBvc3Rjc3NQcm9jZXNzb3IgPSBwb3N0Y3NzKCk7XG4gICAgICAgICAgaWYgKG9wdGlvbnMudGFpbHdpbmRDb25maWd1cmF0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCB0YWlsd2luZCA9IGF3YWl0IGltcG9ydChvcHRpb25zLnRhaWx3aW5kQ29uZmlndXJhdGlvbi5wYWNrYWdlKTtcbiAgICAgICAgICAgIHBvc3Rjc3NQcm9jZXNzb3IudXNlKHRhaWx3aW5kLmRlZmF1bHQoeyBjb25maWc6IG9wdGlvbnMudGFpbHdpbmRDb25maWd1cmF0aW9uLmZpbGUgfSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYXV0b3ByZWZpeGVyKSB7XG4gICAgICAgICAgICBwb3N0Y3NzUHJvY2Vzc29yLnVzZShhdXRvcHJlZml4ZXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBhIGxvYWQgY2FsbGJhY2sgdG8gc3VwcG9ydCBpbmxpbmUgQ29tcG9uZW50IHN0eWxlc1xuICAgICAgICBidWlsZC5vbkxvYWQoXG4gICAgICAgICAgeyBmaWx0ZXI6IGxhbmd1YWdlLmNvbXBvbmVudEZpbHRlciwgbmFtZXNwYWNlOiAnYW5ndWxhcjpzdHlsZXMvY29tcG9uZW50JyB9LFxuICAgICAgICAgIGNyZWF0ZUNhY2hlZExvYWQoY2FjaGUsIGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gb3B0aW9ucy5pbmxpbmVDb21wb25lbnREYXRhPy5bYXJncy5wYXRoXTtcbiAgICAgICAgICAgIGFzc2VydChcbiAgICAgICAgICAgICAgdHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnLFxuICAgICAgICAgICAgICBgY29tcG9uZW50IHN0eWxlIG5hbWUgc2hvdWxkIGFsd2F5cyBiZSBmb3VuZCBbJHthcmdzLnBhdGh9XWAsXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBjb25zdCBbZm9ybWF0LCAsIGZpbGVuYW1lXSA9IGFyZ3MucGF0aC5zcGxpdCgnOycsIDMpO1xuXG4gICAgICAgICAgICByZXR1cm4gcHJvY2Vzc1N0eWxlc2hlZXQoXG4gICAgICAgICAgICAgIGxhbmd1YWdlLFxuICAgICAgICAgICAgICBkYXRhLFxuICAgICAgICAgICAgICBmaWxlbmFtZSxcbiAgICAgICAgICAgICAgZm9ybWF0LFxuICAgICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgICBidWlsZCxcbiAgICAgICAgICAgICAgcG9zdGNzc1Byb2Nlc3NvcixcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSksXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gQWRkIGEgbG9hZCBjYWxsYmFjayB0byBzdXBwb3J0IGZpbGVzIGZyb20gZGlza1xuICAgICAgICBidWlsZC5vbkxvYWQoXG4gICAgICAgICAgeyBmaWx0ZXI6IGxhbmd1YWdlLmZpbGVGaWx0ZXIgfSxcbiAgICAgICAgICBjcmVhdGVDYWNoZWRMb2FkKGNhY2hlLCBhc3luYyAoYXJncykgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlYWRGaWxlKGFyZ3MucGF0aCwgJ3V0Zi04Jyk7XG5cbiAgICAgICAgICAgIHJldHVybiBwcm9jZXNzU3R5bGVzaGVldChcbiAgICAgICAgICAgICAgbGFuZ3VhZ2UsXG4gICAgICAgICAgICAgIGRhdGEsXG4gICAgICAgICAgICAgIGFyZ3MucGF0aCxcbiAgICAgICAgICAgICAgZXh0bmFtZShhcmdzLnBhdGgpLnRvTG93ZXJDYXNlKCkuc2xpY2UoMSksXG4gICAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICAgIGJ1aWxkLFxuICAgICAgICAgICAgICBwb3N0Y3NzUHJvY2Vzc29yLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9KSxcbiAgICAgICAgKTtcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwcm9jZXNzU3R5bGVzaGVldChcbiAgbGFuZ3VhZ2U6IFJlYWRvbmx5PFN0eWxlc2hlZXRMYW5ndWFnZT4sXG4gIGRhdGE6IHN0cmluZyxcbiAgZmlsZW5hbWU6IHN0cmluZyxcbiAgZm9ybWF0OiBzdHJpbmcsXG4gIG9wdGlvbnM6IFN0eWxlc2hlZXRQbHVnaW5PcHRpb25zLFxuICBidWlsZDogUGx1Z2luQnVpbGQsXG4gIHBvc3Rjc3NQcm9jZXNzb3I6IGltcG9ydCgncG9zdGNzcycpLlByb2Nlc3NvciB8IHVuZGVmaW5lZCxcbikge1xuICBsZXQgcmVzdWx0OiBPbkxvYWRSZXN1bHQ7XG5cbiAgLy8gUHJvY2VzcyB0aGUgaW5wdXQgZGF0YSBpZiB0aGUgbGFuZ3VhZ2UgcmVxdWlyZXMgcHJlcHJvY2Vzc2luZ1xuICBpZiAobGFuZ3VhZ2UucHJvY2Vzcykge1xuICAgIHJlc3VsdCA9IGF3YWl0IGxhbmd1YWdlLnByb2Nlc3MoZGF0YSwgZmlsZW5hbWUsIGZvcm1hdCwgb3B0aW9ucywgYnVpbGQpO1xuICB9IGVsc2Uge1xuICAgIHJlc3VsdCA9IHtcbiAgICAgIGNvbnRlbnRzOiBkYXRhLFxuICAgICAgbG9hZGVyOiAnY3NzJyxcbiAgICAgIHdhdGNoRmlsZXM6IFtmaWxlbmFtZV0sXG4gICAgfTtcbiAgfVxuXG4gIC8vIFRyYW5zZm9ybSB3aXRoIHBvc3Rjc3MgaWYgbmVlZGVkIGFuZCB0aGVyZSBhcmUgbm8gZXJyb3JzXG4gIGlmIChwb3N0Y3NzUHJvY2Vzc29yICYmIHJlc3VsdC5jb250ZW50cyAmJiAhcmVzdWx0LmVycm9ycz8ubGVuZ3RoKSB7XG4gICAgY29uc3QgcG9zdGNzc1Jlc3VsdCA9IGF3YWl0IGNvbXBpbGVTdHJpbmcoXG4gICAgICB0eXBlb2YgcmVzdWx0LmNvbnRlbnRzID09PSAnc3RyaW5nJ1xuICAgICAgICA/IHJlc3VsdC5jb250ZW50c1xuICAgICAgICA6IEJ1ZmZlci5mcm9tKHJlc3VsdC5jb250ZW50cykudG9TdHJpbmcoJ3V0Zi04JyksXG4gICAgICBmaWxlbmFtZSxcbiAgICAgIHBvc3Rjc3NQcm9jZXNzb3IsXG4gICAgICBvcHRpb25zLFxuICAgICk7XG5cbiAgICAvLyBNZXJnZSByZXN1bHRzXG4gICAgaWYgKHBvc3Rjc3NSZXN1bHQuZXJyb3JzPy5sZW5ndGgpIHtcbiAgICAgIGRlbGV0ZSByZXN1bHQuY29udGVudHM7XG4gICAgfVxuICAgIGlmIChyZXN1bHQud2FybmluZ3MgJiYgcG9zdGNzc1Jlc3VsdC53YXJuaW5ncykge1xuICAgICAgcG9zdGNzc1Jlc3VsdC53YXJuaW5ncy51bnNoaWZ0KC4uLnJlc3VsdC53YXJuaW5ncyk7XG4gICAgfVxuICAgIGlmIChyZXN1bHQud2F0Y2hGaWxlcyAmJiBwb3N0Y3NzUmVzdWx0LndhdGNoRmlsZXMpIHtcbiAgICAgIHBvc3Rjc3NSZXN1bHQud2F0Y2hGaWxlcy51bnNoaWZ0KC4uLnJlc3VsdC53YXRjaEZpbGVzKTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdC53YXRjaERpcnMgJiYgcG9zdGNzc1Jlc3VsdC53YXRjaERpcnMpIHtcbiAgICAgIHBvc3Rjc3NSZXN1bHQud2F0Y2hEaXJzLnVuc2hpZnQoLi4ucmVzdWx0LndhdGNoRGlycyk7XG4gICAgfVxuICAgIHJlc3VsdCA9IHtcbiAgICAgIC4uLnJlc3VsdCxcbiAgICAgIC4uLnBvc3Rjc3NSZXN1bHQsXG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogQ29tcGlsZXMgdGhlIHByb3ZpZGVkIENTUyBzdHlsZXNoZWV0IGRhdGEgdXNpbmcgYSBwcm92aWRlZCBwb3N0Y3NzIHByb2Nlc3NvciBhbmQgcHJvdmlkZXMgYW5cbiAqIGVzYnVpbGQgbG9hZCByZXN1bHQgdGhhdCBjYW4gYmUgdXNlZCBkaXJlY3RseSBieSBhbiBlc2J1aWxkIFBsdWdpbi5cbiAqIEBwYXJhbSBkYXRhIFRoZSBzdHlsZXNoZWV0IGNvbnRlbnQgdG8gcHJvY2Vzcy5cbiAqIEBwYXJhbSBmaWxlbmFtZSBUaGUgbmFtZSBvZiB0aGUgZmlsZSB0aGF0IGNvbnRhaW5zIHRoZSBkYXRhLlxuICogQHBhcmFtIHBvc3Rjc3NQcm9jZXNzb3IgQSBwb3N0Y3NzIHByb2Nlc3NvciBpbnN0YW5jZSB0byB1c2UuXG4gKiBAcGFyYW0gb3B0aW9ucyBUaGUgcGx1Z2luIG9wdGlvbnMgdG8gY29udHJvbCB0aGUgcHJvY2Vzc2luZy5cbiAqIEByZXR1cm5zIEFuIGVzYnVpbGQgT25Mb2FkZXJSZXN1bHQgb2JqZWN0IHdpdGggdGhlIHByb2Nlc3NlZCBjb250ZW50LCB3YXJuaW5ncywgYW5kL29yIGVycm9ycy5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gY29tcGlsZVN0cmluZyhcbiAgZGF0YTogc3RyaW5nLFxuICBmaWxlbmFtZTogc3RyaW5nLFxuICBwb3N0Y3NzUHJvY2Vzc29yOiBpbXBvcnQoJ3Bvc3Rjc3MnKS5Qcm9jZXNzb3IsXG4gIG9wdGlvbnM6IFN0eWxlc2hlZXRQbHVnaW5PcHRpb25zLFxuKTogUHJvbWlzZTxPbkxvYWRSZXN1bHQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb3N0Y3NzUHJvY2Vzc29yLnByb2Nlc3MoZGF0YSwge1xuICAgICAgZnJvbTogZmlsZW5hbWUsXG4gICAgICB0bzogZmlsZW5hbWUsXG4gICAgICBtYXA6IG9wdGlvbnMuc291cmNlbWFwICYmIHtcbiAgICAgICAgaW5saW5lOiB0cnVlLFxuICAgICAgICBzb3VyY2VzQ29udGVudDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCByYXdXYXJuaW5ncyA9IHJlc3VsdC53YXJuaW5ncygpO1xuICAgIGxldCB3YXJuaW5ncztcbiAgICBpZiAocmF3V2FybmluZ3MubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgbGluZU1hcHBpbmdzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZ1tdIHwgbnVsbD4oKTtcbiAgICAgIHdhcm5pbmdzID0gcmF3V2FybmluZ3MubWFwKCh3YXJuaW5nKSA9PiB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSB3YXJuaW5nLm5vZGUuc291cmNlPy5pbnB1dC5maWxlO1xuICAgICAgICBpZiAoZmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuIHsgdGV4dDogd2FybmluZy50ZXh0IH07XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbGluZXMgPSBsaW5lTWFwcGluZ3MuZ2V0KGZpbGUpO1xuICAgICAgICBpZiAobGluZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGxpbmVzID0gd2FybmluZy5ub2RlLnNvdXJjZT8uaW5wdXQuY3NzLnNwbGl0KC9cXHI/XFxuLyk7XG4gICAgICAgICAgbGluZU1hcHBpbmdzLnNldChmaWxlLCBsaW5lcyA/PyBudWxsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdGV4dDogd2FybmluZy50ZXh0LFxuICAgICAgICAgIGxvY2F0aW9uOiB7XG4gICAgICAgICAgICBmaWxlLFxuICAgICAgICAgICAgbGluZTogd2FybmluZy5saW5lLFxuICAgICAgICAgICAgY29sdW1uOiB3YXJuaW5nLmNvbHVtbiAtIDEsXG4gICAgICAgICAgICBsaW5lVGV4dDogbGluZXM/Llt3YXJuaW5nLmxpbmUgLSAxXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgbGV0IHdhdGNoRmlsZXM7XG4gICAgZm9yIChjb25zdCByZXN1bHRNZXNzYWdlIG9mIHJlc3VsdC5tZXNzYWdlcykge1xuICAgICAgaWYgKHJlc3VsdE1lc3NhZ2UudHlwZSA9PT0gJ2RlcGVuZGVuY3knICYmIHR5cGVvZiByZXN1bHRNZXNzYWdlWydmaWxlJ10gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHdhdGNoRmlsZXMgPz89IFtdO1xuICAgICAgICB3YXRjaEZpbGVzLnB1c2gocmVzdWx0TWVzc2FnZVsnZmlsZSddKTtcbiAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHJlc3VsdE1lc3NhZ2UudHlwZSA9PT0gJ2Rpci1kZXBlbmRlbmN5JyAmJlxuICAgICAgICB0eXBlb2YgcmVzdWx0TWVzc2FnZVsnZGlyJ10gPT09ICdzdHJpbmcnICYmXG4gICAgICAgIHR5cGVvZiByZXN1bHRNZXNzYWdlWydnbG9iJ10gPT09ICdzdHJpbmcnXG4gICAgICApIHtcbiAgICAgICAgd2F0Y2hGaWxlcyA/Pz0gW107XG4gICAgICAgIGNvbnN0IGRlcGVuZGVuY2llcyA9IGF3YWl0IGdsb2IocmVzdWx0TWVzc2FnZVsnZ2xvYiddLCB7IGN3ZDogcmVzdWx0TWVzc2FnZVsnZGlyJ10gfSk7XG4gICAgICAgIHdhdGNoRmlsZXMucHVzaCguLi5kZXBlbmRlbmNpZXMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBjb250ZW50czogcmVzdWx0LmNzcyxcbiAgICAgIGxvYWRlcjogJ2NzcycsXG4gICAgICB3YXJuaW5ncyxcbiAgICAgIHdhdGNoRmlsZXMsXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBwb3N0Y3NzID8/PSAoYXdhaXQgaW1wb3J0KCdwb3N0Y3NzJykpLmRlZmF1bHQ7XG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgcG9zdGNzcy5Dc3NTeW50YXhFcnJvcikge1xuICAgICAgY29uc3QgbGluZXMgPSBlcnJvci5zb3VyY2U/LnNwbGl0KC9cXHI/XFxuLyk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGVycm9yczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRleHQ6IGVycm9yLnJlYXNvbixcbiAgICAgICAgICAgIGxvY2F0aW9uOiB7XG4gICAgICAgICAgICAgIGZpbGU6IGVycm9yLmZpbGUsXG4gICAgICAgICAgICAgIGxpbmU6IGVycm9yLmxpbmUsXG4gICAgICAgICAgICAgIGNvbHVtbjogZXJyb3IuY29sdW1uICYmIGVycm9yLmNvbHVtbiAtIDEsXG4gICAgICAgICAgICAgIGxpbmVUZXh0OiBlcnJvci5saW5lID09PSB1bmRlZmluZWQgPyB1bmRlZmluZWQgOiBsaW5lcz8uW2Vycm9yLmxpbmUgLSAxXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cbiJdfQ==