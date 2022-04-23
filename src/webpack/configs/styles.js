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
exports.getStylesConfig = exports.resolveGlobalStyles = void 0;
const fs = __importStar(require("fs"));
const mini_css_extract_plugin_1 = __importDefault(require("mini-css-extract-plugin"));
const path = __importStar(require("path"));
const sass_service_1 = require("../../sass/sass-service");
const plugins_1 = require("../plugins");
const css_optimizer_plugin_1 = require("../plugins/css-optimizer-plugin");
const helpers_1 = require("../utils/helpers");
function resolveGlobalStyles(styleEntrypoints, root, preserveSymlinks) {
    const entryPoints = {};
    const noInjectNames = [];
    const paths = [];
    if (styleEntrypoints.length === 0) {
        return { entryPoints, noInjectNames, paths };
    }
    for (const style of (0, helpers_1.normalizeExtraEntryPoints)(styleEntrypoints, 'styles')) {
        let resolvedPath = path.resolve(root, style.input);
        if (!fs.existsSync(resolvedPath)) {
            try {
                resolvedPath = require.resolve(style.input, { paths: [root] });
            }
            catch (_a) { }
        }
        if (!preserveSymlinks) {
            resolvedPath = fs.realpathSync(resolvedPath);
        }
        // Add style entry points.
        if (entryPoints[style.bundleName]) {
            entryPoints[style.bundleName].push(resolvedPath);
        }
        else {
            entryPoints[style.bundleName] = [resolvedPath];
        }
        // Add non injected styles to the list.
        if (!style.inject) {
            noInjectNames.push(style.bundleName);
        }
        // Add global css paths.
        paths.push(resolvedPath);
    }
    return { entryPoints, noInjectNames, paths };
}
exports.resolveGlobalStyles = resolveGlobalStyles;
// eslint-disable-next-line max-lines-per-function
function getStylesConfig(wco) {
    var _a, _b, _c;
    const postcssImports = require('postcss-import');
    const postcssPresetEnv = require('postcss-preset-env');
    const { root, buildOptions } = wco;
    const extraPlugins = [];
    extraPlugins.push(new plugins_1.AnyComponentStyleBudgetChecker(buildOptions.budgets));
    const cssSourceMap = buildOptions.sourceMap.styles;
    // Determine hashing format.
    const hashFormat = (0, helpers_1.getOutputHashFormat)(buildOptions.outputHashing);
    // use includePaths from appConfig
    const includePaths = (_c = (_b = (_a = buildOptions.stylePreprocessorOptions) === null || _a === void 0 ? void 0 : _a.includePaths) === null || _b === void 0 ? void 0 : _b.map((p) => path.resolve(root, p))) !== null && _c !== void 0 ? _c : [];
    // Process global styles.
    const { entryPoints, noInjectNames, paths: globalStylePaths, } = resolveGlobalStyles(buildOptions.styles, root, !!buildOptions.preserveSymlinks);
    if (noInjectNames.length > 0) {
        // Add plugin to remove hashes from lazy styles.
        extraPlugins.push(new plugins_1.RemoveHashPlugin({ chunkNames: noInjectNames, hashFormat }));
    }
    if (globalStylePaths.some((p) => p.endsWith('.styl'))) {
        wco.logger.warn('Stylus usage is deprecated and will be removed in a future major version. ' +
            'To opt-out of the deprecated behaviour, please migrate to another stylesheet language.');
    }
    const sassImplementation = new sass_service_1.SassWorkerImplementation();
    extraPlugins.push({
        apply(compiler) {
            compiler.hooks.shutdown.tap('sass-worker', () => {
                sassImplementation.close();
            });
        },
    });
    const assetNameTemplate = (0, helpers_1.assetNameTemplateFactory)(hashFormat);
    const extraPostcssPlugins = [];
    // Attempt to setup Tailwind CSS
    // A configuration file can exist in the project or workspace root
    const tailwindConfigFile = 'tailwind.config.js';
    let tailwindConfigPath;
    for (const basePath of [wco.projectRoot, wco.root]) {
        const fullPath = path.join(basePath, tailwindConfigFile);
        if (fs.existsSync(fullPath)) {
            tailwindConfigPath = fullPath;
            break;
        }
    }
    // Only load Tailwind CSS plugin if configuration file was found.
    // This acts as a guard to ensure the project actually wants to use Tailwind CSS.
    // The package may be unknowningly present due to a third-party transitive package dependency.
    if (tailwindConfigPath) {
        let tailwindPackagePath;
        try {
            tailwindPackagePath = require.resolve('tailwindcss', { paths: [wco.root] });
        }
        catch (_d) {
            const relativeTailwindConfigPath = path.relative(wco.root, tailwindConfigPath);
            wco.logger.warn(`Tailwind CSS configuration file found (${relativeTailwindConfigPath})` +
                ` but the 'tailwindcss' package is not installed.` +
                ` To enable Tailwind CSS, please install the 'tailwindcss' package.`);
        }
        if (tailwindPackagePath) {
            extraPostcssPlugins.push(require(tailwindPackagePath)({ config: tailwindConfigPath }));
        }
    }
    const postcssPresetEnvPlugin = postcssPresetEnv({
        browsers: buildOptions.supportedBrowsers,
        autoprefixer: true,
        stage: 3,
    });
    const postcssOptionsCreator = (inlineSourcemaps, extracted) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const optionGenerator = (loader) => ({
            map: inlineSourcemaps
                ? {
                    inline: true,
                    annotation: false,
                }
                : undefined,
            plugins: [
                postcssImports({
                    resolve: (url) => (url.startsWith('~') ? url.slice(1) : url),
                    load: (filename) => {
                        return new Promise((resolve, reject) => {
                            loader.fs.readFile(filename, (err, data) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                const content = data.toString();
                                resolve(content);
                            });
                        });
                    },
                }),
                (0, plugins_1.PostcssCliResources)({
                    baseHref: buildOptions.baseHref,
                    deployUrl: buildOptions.deployUrl,
                    resourcesOutputPath: buildOptions.resourcesOutputPath,
                    loader,
                    filename: assetNameTemplate,
                    emitFile: buildOptions.platform !== 'server',
                    extracted,
                }),
                ...extraPostcssPlugins,
                postcssPresetEnvPlugin,
            ],
        });
        // postcss-loader fails when trying to determine configuration files for data URIs
        optionGenerator.config = false;
        return optionGenerator;
    };
    // load component css as raw strings
    const componentsSourceMap = !!(cssSourceMap &&
        // Never use component css sourcemap when style optimizations are on.
        // It will just increase bundle size without offering good debug experience.
        !buildOptions.optimization.styles.minify &&
        // Inline all sourcemap types except hidden ones, which are the same as no sourcemaps
        // for component css.
        !buildOptions.sourceMap.hidden);
    // extract global css from js files into own css file.
    extraPlugins.push(new mini_css_extract_plugin_1.default({ filename: `[name]${hashFormat.extract}.css` }));
    if (!buildOptions.hmr) {
        // don't remove `.js` files for `.css` when we are using HMR these contain HMR accept codes.
        // suppress empty .js files in css only entry points.
        extraPlugins.push(new plugins_1.SuppressExtractedTextChunksWebpackPlugin());
    }
    const postCss = require('postcss');
    const postCssLoaderPath = require.resolve('postcss-loader');
    const componentStyleLoaders = [
        {
            loader: postCssLoaderPath,
            options: {
                implementation: postCss,
                postcssOptions: postcssOptionsCreator(componentsSourceMap, false),
            },
        },
    ];
    const globalStyleLoaders = [
        {
            loader: mini_css_extract_plugin_1.default.loader,
        },
        {
            loader: require.resolve('css-loader'),
            options: {
                url: false,
                sourceMap: !!cssSourceMap,
            },
        },
        {
            loader: postCssLoaderPath,
            options: {
                implementation: postCss,
                postcssOptions: postcssOptionsCreator(false, true),
                sourceMap: !!cssSourceMap,
            },
        },
    ];
    const styleLanguages = [
        {
            extensions: ['css'],
            use: [],
        },
        {
            extensions: ['scss'],
            use: [
                {
                    loader: require.resolve('resolve-url-loader'),
                    options: {
                        sourceMap: cssSourceMap,
                    },
                },
                {
                    loader: require.resolve('sass-loader'),
                    options: {
                        implementation: sassImplementation,
                        sourceMap: true,
                        sassOptions: {
                            // Prevent use of `fibers` package as it no longer works in newer Node.js versions
                            fiber: false,
                            // bootstrap-sass requires a minimum precision of 8
                            precision: 8,
                            includePaths,
                            // Use expanded as otherwise sass will remove comments that are needed for autoprefixer
                            // Ex: /* autoprefixer grid: autoplace */
                            // See: https://github.com/webpack-contrib/sass-loader/blob/45ad0be17264ceada5f0b4fb87e9357abe85c4ff/src/getSassOptions.js#L68-L70
                            outputStyle: 'expanded',
                            // Silences compiler warnings from 3rd party stylesheets
                            quietDeps: !buildOptions.verbose,
                            verbose: buildOptions.verbose,
                        },
                    },
                },
            ],
        },
        {
            extensions: ['sass'],
            use: [
                {
                    loader: require.resolve('resolve-url-loader'),
                    options: {
                        sourceMap: cssSourceMap,
                    },
                },
                {
                    loader: require.resolve('sass-loader'),
                    options: {
                        implementation: sassImplementation,
                        sourceMap: true,
                        sassOptions: {
                            // Prevent use of `fibers` package as it no longer works in newer Node.js versions
                            fiber: false,
                            indentedSyntax: true,
                            // bootstrap-sass requires a minimum precision of 8
                            precision: 8,
                            includePaths,
                            // Use expanded as otherwise sass will remove comments that are needed for autoprefixer
                            // Ex: /* autoprefixer grid: autoplace */
                            // See: https://github.com/webpack-contrib/sass-loader/blob/45ad0be17264ceada5f0b4fb87e9357abe85c4ff/src/getSassOptions.js#L68-L70
                            outputStyle: 'expanded',
                            // Silences compiler warnings from 3rd party stylesheets
                            quietDeps: !buildOptions.verbose,
                            verbose: buildOptions.verbose,
                        },
                    },
                },
            ],
        },
        {
            extensions: ['less'],
            use: [
                {
                    loader: require.resolve('less-loader'),
                    options: {
                        implementation: require('less'),
                        sourceMap: cssSourceMap,
                        lessOptions: {
                            javascriptEnabled: true,
                            paths: includePaths,
                        },
                    },
                },
            ],
        },
        {
            extensions: ['styl'],
            use: [
                {
                    loader: require.resolve('stylus-loader'),
                    options: {
                        sourceMap: cssSourceMap,
                        stylusOptions: {
                            compress: false,
                            sourceMap: { comment: false },
                            paths: includePaths,
                        },
                    },
                },
            ],
        },
    ];
    return {
        entry: entryPoints,
        module: {
            rules: styleLanguages.map(({ extensions, use }) => ({
                test: new RegExp(`\\.(?:${extensions.join('|')})$`, 'i'),
                rules: [
                    // Setup processing rules for global and component styles
                    {
                        oneOf: [
                            // Global styles are only defined global styles
                            {
                                use: globalStyleLoaders,
                                include: globalStylePaths,
                                resourceQuery: { not: [/\?ngResource/] },
                            },
                            // Component styles are all styles except defined global styles
                            {
                                use: componentStyleLoaders,
                                type: 'asset/source',
                                resourceQuery: /\?ngResource/,
                            },
                        ],
                    },
                    { use },
                ],
            })),
        },
        optimization: {
            minimizer: buildOptions.optimization.styles.minify
                ? [
                    new css_optimizer_plugin_1.CssOptimizerPlugin({
                        supportedBrowsers: buildOptions.supportedBrowsers,
                    }),
                ]
                : undefined,
        },
        plugins: extraPlugins,
    };
}
exports.getStylesConfig = getStylesConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3R5bGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhcl9kZXZraXQvYnVpbGRfYW5ndWxhci9zcmMvd2VicGFjay9jb25maWdzL3N0eWxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILHVDQUF5QjtBQUN6QixzRkFBMkQ7QUFDM0QsMkNBQTZCO0FBRzdCLDBEQUFtRTtBQUVuRSx3Q0FLb0I7QUFDcEIsMEVBQXFFO0FBQ3JFLDhDQUkwQjtBQUUxQixTQUFnQixtQkFBbUIsQ0FDakMsZ0JBQWdDLEVBQ2hDLElBQVksRUFDWixnQkFBeUI7SUFFekIsTUFBTSxXQUFXLEdBQTZCLEVBQUUsQ0FBQztJQUNqRCxNQUFNLGFBQWEsR0FBYSxFQUFFLENBQUM7SUFDbkMsTUFBTSxLQUFLLEdBQWEsRUFBRSxDQUFDO0lBRTNCLElBQUksZ0JBQWdCLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUNqQyxPQUFPLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsQ0FBQztLQUM5QztJQUVELEtBQUssTUFBTSxLQUFLLElBQUksSUFBQSxtQ0FBeUIsRUFBQyxnQkFBZ0IsRUFBRSxRQUFRLENBQUMsRUFBRTtRQUN6RSxJQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDaEMsSUFBSTtnQkFDRixZQUFZLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ2hFO1lBQUMsV0FBTSxHQUFFO1NBQ1g7UUFF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LEVBQUUsR0FBRyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUU7NkJBQ3pDOzRCQUNELCtEQUErRDs0QkFDL0Q7Z0NBQ0UsR0FBRyxFQUFFLHFCQUFxQjtnQ0FDMUIsSUFBSSxFQUFFLGNBQWM7Z0NBQ3BCLGFBQWEsRUFBRSxjQUFjOzZCQUM5Qjt5QkFDRjtxQkFDRjtvQkFDRCxFQUFFLEdBQUcsRUFBRTtpQkFDUjthQUNGLENBQUMsQ0FBQztTQUNKO1FBQ0QsWUFBWSxFQUFFO1lBQ1osU0FBUyxFQUFFLFlBQVksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU07Z0JBQ2hELENBQUMsQ0FBQztvQkFDRSxJQUFJLHlDQUFrQixDQUFDO3dCQUNyQixpQkFBaUIsRUFBRSxZQUFZLENBQUMsaUJBQWlCO3FCQUNsRCxDQUFDO2lCQUNIO2dCQUNILENBQUMsQ0FBQyxTQUFTO1NBQ2Q7UUFDRCxPQUFPLEVBQUUsWUFBWTtLQUN0QixDQUFDO0FBQ0osQ0FBQztBQTFVRCwwQ0EwVUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IE1pbmlDc3NFeHRyYWN0UGx1Z2luIGZyb20gJ21pbmktY3NzLWV4dHJhY3QtcGx1Z2luJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBDb25maWd1cmF0aW9uLCBSdWxlU2V0VXNlSXRlbSB9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHsgU3R5bGVFbGVtZW50IH0gZnJvbSAnLi4vLi4vYnVpbGRlcnMvYnJvd3Nlci9zY2hlbWEnO1xuaW1wb3J0IHsgU2Fzc1dvcmtlckltcGxlbWVudGF0aW9uIH0gZnJvbSAnLi4vLi4vc2Fzcy9zYXNzLXNlcnZpY2UnO1xuaW1wb3J0IHsgV2VicGFja0NvbmZpZ09wdGlvbnMgfSBmcm9tICcuLi8uLi91dGlscy9idWlsZC1vcHRpb25zJztcbmltcG9ydCB7XG4gIEFueUNvbXBvbmVudFN0eWxlQnVkZ2V0Q2hlY2tlcixcbiAgUG9zdGNzc0NsaVJlc291cmNlcyxcbiAgUmVtb3ZlSGFzaFBsdWdpbixcbiAgU3VwcHJlc3NFeHRyYWN0ZWRUZXh0Q2h1bmtzV2VicGFja1BsdWdpbixcbn0gZnJvbSAnLi4vcGx1Z2lucyc7XG5pbXBvcnQgeyBDc3NPcHRpbWl6ZXJQbHVnaW4gfSBmcm9tICcuLi9wbHVnaW5zL2Nzcy1vcHRpbWl6ZXItcGx1Z2luJztcbmltcG9ydCB7XG4gIGFzc2V0TmFtZVRlbXBsYXRlRmFjdG9yeSxcbiAgZ2V0T3V0cHV0SGFzaEZvcm1hdCxcbiAgbm9ybWFsaXplRXh0cmFFbnRyeVBvaW50cyxcbn0gZnJvbSAnLi4vdXRpbHMvaGVscGVycyc7XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlR2xvYmFsU3R5bGVzKFxuICBzdHlsZUVudHJ5cG9pbnRzOiBTdHlsZUVsZW1lbnRbXSxcbiAgcm9vdDogc3RyaW5nLFxuICBwcmVzZXJ2ZVN5bWxpbmtzOiBib29sZWFuLFxuKTogeyBlbnRyeVBvaW50czogUmVjb3JkPHN0cmluZywgc3RyaW5nW10+OyBub0luamVjdE5hbWVzOiBzdHJpbmdbXTsgcGF0aHM6IHN0cmluZ1tdIH0ge1xuICBjb25zdCBlbnRyeVBvaW50czogUmVjb3JkPHN0cmluZywgc3RyaW5nW10+ID0ge307XG4gIGNvbnN0IG5vSW5qZWN0TmFtZXM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHBhdGhzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGlmIChzdHlsZUVudHJ5cG9pbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7IGVudHJ5UG9pbnRzLCBub0luamVjdE5hbWVzLCBwYXRocyB9O1xuICB9XG5cbiAgZm9yIChjb25zdCBzdHlsZSBvZiBub3JtYWxpemVFeHRyYUVudHJ5UG9pbnRzKHN0eWxlRW50cnlwb2ludHMsICdzdHlsZXMnKSkge1xuICAgIGxldCByZXNvbHZlZFBhdGggPSBwYXRoLnJlc29sdmUocm9vdCwgc3R5bGUuaW5wdXQpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhyZXNvbHZlZFBhdGgpKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXNvbHZlZFBhdGggPSByZXF1aXJlLnJlc29sdmUoc3R5bGUuaW5wdXQsIHsgcGF0aHM6IFtyb290XSB9KTtcbiAgICAgIH0gY2F0Y2gge31cbiAgICB9XG5cbiAgICBpZiAoIXByZXNlcnZlU3ltbGlua3MpIHtcbiAgICAgIHJlc29sdmVkUGF0aCA9IGZzLnJlYWxwYXRoU3luYyhyZXNvbHZlZFBhdGgpO1xuICAgIH1cblxuICAgIC8vIEFkZCBzdHlsZSBlbnRyeSBwb2ludHMuXG4gICAgaWYgKGVudHJ5UG9pbnRzW3N0eWxlLmJ1bmRsZU5hbWVdKSB7XG4gICAgICBlbnRyeVBvaW50c1tzdHlsZS5idW5kbGVOYW1lXS5wdXNoKHJlc29sdmVkUGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVudHJ5UG9pbnRzW3N0eWxlLmJ1bmRsZU5hbWVdID0gW3Jlc29sdmVkUGF0aF07XG4gICAgfVxuXG4gICAgLy8gQWRkIG5vbiBpbmplY3RlZCBzdHlsZXMgdG8gdGhlIGxpc3QuXG4gICAgaWYgKCFzdHlsZS5pbmplY3QpIHtcbiAgICAgIG5vSW5qZWN0TmFtZXMucHVzaChzdHlsZS5idW5kbGVOYW1lKTtcbiAgICB9XG5cbiAgICAvLyBBZGQgZ2xvYmFsIGNzcyBwYXRocy5cbiAgICBwYXRocy5wdXNoKHJlc29sdmVkUGF0aCk7XG4gIH1cblxuICByZXR1cm4geyBlbnRyeVBvaW50cywgbm9JbmplY3ROYW1lcywgcGF0aHMgfTtcbn1cblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1saW5lcy1wZXItZnVuY3Rpb25cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdHlsZXNDb25maWcod2NvOiBXZWJwYWNrQ29uZmlnT3B0aW9ucyk6IENvbmZpZ3VyYXRpb24ge1xuICBjb25zdCBwb3N0Y3NzSW1wb3J0cyA9IHJlcXVpcmUoJ3Bvc3Rjc3MtaW1wb3J0Jyk7XG4gIGNvbnN0IHBvc3Rjc3NQcmVzZXRFbnY6IHR5cGVvZiBpbXBvcnQoJ3Bvc3Rjc3MtcHJlc2V0LWVudicpID0gcmVxdWlyZSgncG9zdGNzcy1wcmVzZXQtZW52Jyk7XG5cbiAgY29uc3QgeyByb290LCBidWlsZE9wdGlvbnMgfSA9IHdjbztcbiAgY29uc3QgZXh0cmFQbHVnaW5zOiBDb25maWd1cmF0aW9uWydwbHVnaW5zJ10gPSBbXTtcblxuICBleHRyYVBsdWdpbnMucHVzaChuZXcgQW55Q29tcG9uZW50U3R5bGVCdWRnZXRDaGVja2VyKGJ1aWxkT3B0aW9ucy5idWRnZXRzKSk7XG5cbiAgY29uc3QgY3NzU291cmNlTWFwID0gYnVpbGRPcHRpb25zLnNvdXJjZU1hcC5zdHlsZXM7XG5cbiAgLy8gRGV0ZXJtaW5lIGhhc2hpbmcgZm9ybWF0LlxuICBjb25zdCBoYXNoRm9ybWF0ID0gZ2V0T3V0cHV0SGFzaEZvcm1hdChidWlsZE9wdGlvbnMub3V0cHV0SGFzaGluZyk7XG5cbiAgLy8gdXNlIGluY2x1ZGVQYXRocyBmcm9tIGFwcENvbmZpZ1xuICBjb25zdCBpbmNsdWRlUGF0aHMgPVxuICAgIGJ1aWxkT3B0aW9ucy5zdHlsZVByZXByb2Nlc3Nvck9wdGlvbnM/LmluY2x1ZGVQYXRocz8ubWFwKChwKSA9PiBwYXRoLnJlc29sdmUocm9vdCwgcCkpID8/IFtdO1xuXG4gIC8vIFByb2Nlc3MgZ2xvYmFsIHN0eWxlcy5cbiAgY29uc3Qge1xuICAgIGVudHJ5UG9pbnRzLFxuICAgIG5vSW5qZWN0TmFtZXMsXG4gICAgcGF0aHM6IGdsb2JhbFN0eWxlUGF0aHMsXG4gIH0gPSByZXNvbHZlR2xvYmFsU3R5bGVzKGJ1aWxkT3B0aW9ucy5zdHlsZXMsIHJvb3QsICEhYnVpbGRPcHRpb25zLnByZXNlcnZlU3ltbGlua3MpO1xuICBpZiAobm9JbmplY3ROYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgLy8gQWRkIHBsdWdpbiB0byByZW1vdmUgaGFzaGVzIGZyb20gbGF6eSBzdHlsZXMuXG4gICAgZXh0cmFQbHVnaW5zLnB1c2gobmV3IFJlbW92ZUhhc2hQbHVnaW4oeyBjaHVua05hbWVzOiBub0luamVjdE5hbWVzLCBoYXNoRm9ybWF0IH0pKTtcbiAgfVxuXG4gIGlmIChnbG9iYWxTdHlsZVBhdGhzLnNvbWUoKHApID0+IHAuZW5kc1dpdGgoJy5zdHlsJykpKSB7XG4gICAgd2NvLmxvZ2dlci53YXJuKFxuICAgICAgJ1N0eWx1cyB1c2FnZSBpcyBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gYSBmdXR1cmUgbWFqb3IgdmVyc2lvbi4gJyArXG4gICAgICAgICdUbyBvcHQtb3V0IG9mIHRoZSBkZXByZWNhdGVkIGJlaGF2aW91ciwgcGxlYXNlIG1pZ3JhdGUgdG8gYW5vdGhlciBzdHlsZXNoZWV0IGxhbmd1YWdlLicsXG4gICAgKTtcbiAgfVxuXG4gIGNvbnN0IHNhc3NJbXBsZW1lbnRhdGlvbiA9IG5ldyBTYXNzV29ya2VySW1wbGVtZW50YXRpb24oKTtcbiAgZXh0cmFQbHVnaW5zLnB1c2goe1xuICAgIGFwcGx5KGNvbXBpbGVyKSB7XG4gICAgICBjb21waWxlci5ob29rcy5zaHV0ZG93bi50YXAoJ3Nhc3Mtd29ya2VyJywgKCkgPT4ge1xuICAgICAgICBzYXNzSW1wbGVtZW50YXRpb24uY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gIH0pO1xuXG4gIGNvbnN0IGFzc2V0TmFtZVRlbXBsYXRlID0gYXNzZXROYW1lVGVtcGxhdGVGYWN0b3J5KGhhc2hGb3JtYXQpO1xuXG4gIGNvbnN0IGV4dHJhUG9zdGNzc1BsdWdpbnM6IGltcG9ydCgncG9zdGNzcycpLlBsdWdpbltdID0gW107XG5cbiAgLy8gQXR0ZW1wdCB0byBzZXR1cCBUYWlsd2luZCBDU1NcbiAgLy8gQSBjb25maWd1cmF0aW9uIGZpbGUgY2FuIGV4aXN0IGluIHRoZSBwcm9qZWN0IG9yIHdvcmtzcGFjZSByb290XG4gIGNvbnN0IHRhaWx3aW5kQ29uZmlnRmlsZSA9ICd0YWlsd2luZC5jb25maWcuanMnO1xuICBsZXQgdGFpbHdpbmRDb25maWdQYXRoO1xuICBmb3IgKGNvbnN0IGJhc2VQYXRoIG9mIFt3Y28ucHJvamVjdFJvb3QsIHdjby5yb290XSkge1xuICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGJhc2VQYXRoLCB0YWlsd2luZENvbmZpZ0ZpbGUpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGZ1bGxQYXRoKSkge1xuICAgICAgdGFpbHdpbmRDb25maWdQYXRoID0gZnVsbFBhdGg7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgLy8gT25seSBsb2FkIFRhaWx3aW5kIENTUyBwbHVnaW4gaWYgY29uZmlndXJhdGlvbiBmaWxlIHdhcyBmb3VuZC5cbiAgLy8gVGhpcyBhY3RzIGFzIGEgZ3VhcmQgdG8gZW5zdXJlIHRoZSBwcm9qZWN0IGFjdHVhbGx5IHdhbnRzIHRvIHVzZSBUYWlsd2luZCBDU1MuXG4gIC8vIFRoZSBwYWNrYWdlIG1heSBiZSB1bmtub3duaW5nbHkgcHJlc2VudCBkdWUgdG8gYSB0aGlyZC1wYXJ0eSB0cmFuc2l0aXZlIHBhY2thZ2UgZGVwZW5kZW5jeS5cbiAgaWYgKHRhaWx3aW5kQ29uZmlnUGF0aCkge1xuICAgIGxldCB0YWlsd2luZFBhY2thZ2VQYXRoO1xuICAgIHRyeSB7XG4gICAgICB0YWlsd2luZFBhY2thZ2VQYXRoID0gcmVxdWlyZS5yZXNvbHZlKCd0YWlsd2luZGNzcycsIHsgcGF0aHM6IFt3Y28ucm9vdF0gfSk7XG4gICAgfSBjYXRjaCB7XG4gICAgICBjb25zdCByZWxhdGl2ZVRhaWx3aW5kQ29uZmlnUGF0aCA9IHBhdGgucmVsYXRpdmUod2NvLnJvb3QsIHRhaWx3aW5kQ29uZmlnUGF0aCk7XG4gICAgICB3Y28ubG9nZ2VyLndhcm4oXG4gICAgICAgIGBUYWlsd2luZCBDU1MgY29uZmlndXJhdGlvbiBmaWxlIGZvdW5kICgke3JlbGF0aXZlVGFpbHdpbmRDb25maWdQYXRofSlgICtcbiAgICAgICAgICBgIGJ1dCB0aGUgJ3RhaWx3aW5kY3NzJyBwYWNrYWdlIGlzIG5vdCBpbnN0YWxsZWQuYCArXG4gICAgICAgICAgYCBUbyBlbmFibGUgVGFpbHdpbmQgQ1NTLCBwbGVhc2UgaW5zdGFsbCB0aGUgJ3RhaWx3aW5kY3NzJyBwYWNrYWdlLmAsXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAodGFpbHdpbmRQYWNrYWdlUGF0aCkge1xuICAgICAgZXh0cmFQb3N0Y3NzUGx1Z2lucy5wdXNoKHJlcXVpcmUodGFpbHdpbmRQYWNrYWdlUGF0aCkoeyBjb25maWc6IHRhaWx3aW5kQ29uZmlnUGF0aCB9KSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgcG9zdGNzc1ByZXNldEVudlBsdWdpbiA9IHBvc3Rjc3NQcmVzZXRFbnYoe1xuICAgIGJyb3dzZXJzOiBidWlsZE9wdGlvbnMuc3VwcG9ydGVkQnJvd3NlcnMsXG4gICAgYXV0b3ByZWZpeGVyOiB0cnVlLFxuICAgIHN0YWdlOiAzLFxuICB9KTtcbiAgY29uc3QgcG9zdGNzc09wdGlvbnNDcmVhdG9yID0gKGlubGluZVNvdXJjZW1hcHM6IGJvb2xlYW4sIGV4dHJhY3RlZDogYm9vbGVhbikgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgY29uc3Qgb3B0aW9uR2VuZXJhdG9yID0gKGxvYWRlcjogYW55KSA9PiAoe1xuICAgICAgbWFwOiBpbmxpbmVTb3VyY2VtYXBzXG4gICAgICAgID8ge1xuICAgICAgICAgICAgaW5saW5lOiB0cnVlLFxuICAgICAgICAgICAgYW5ub3RhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfVxuICAgICAgICA6IHVuZGVmaW5lZCxcbiAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgcG9zdGNzc0ltcG9ydHMoe1xuICAgICAgICAgIHJlc29sdmU6ICh1cmw6IHN0cmluZykgPT4gKHVybC5zdGFydHNXaXRoKCd+JykgPyB1cmwuc2xpY2UoMSkgOiB1cmwpLFxuICAgICAgICAgIGxvYWQ6IChmaWxlbmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8c3RyaW5nPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgIGxvYWRlci5mcy5yZWFkRmlsZShmaWxlbmFtZSwgKGVycjogRXJyb3IsIGRhdGE6IEJ1ZmZlcikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuXG4gICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGRhdGEudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGNvbnRlbnQpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0sXG4gICAgICAgIH0pLFxuICAgICAgICBQb3N0Y3NzQ2xpUmVzb3VyY2VzKHtcbiAgICAgICAgICBiYXNlSHJlZjogYnVpbGRPcHRpb25zLmJhc2VIcmVmLFxuICAgICAgICAgIGRlcGxveVVybDogYnVpbGRPcHRpb25zLmRlcGxveVVybCxcbiAgICAgICAgICByZXNvdXJjZXNPdXRwdXRQYXRoOiBidWlsZE9wdGlvbnMucmVzb3VyY2VzT3V0cHV0UGF0aCxcbiAgICAgICAgICBsb2FkZXIsXG4gICAgICAgICAgZmlsZW5hbWU6IGFzc2V0TmFtZVRlbXBsYXRlLFxuICAgICAgICAgIGVtaXRGaWxlOiBidWlsZE9wdGlvbnMucGxhdGZvcm0gIT09ICdzZXJ2ZXInLFxuICAgICAgICAgIGV4dHJhY3RlZCxcbiAgICAgICAgfSksXG4gICAgICAgIC4uLmV4dHJhUG9zdGNzc1BsdWdpbnMsXG4gICAgICAgIHBvc3Rjc3NQcmVzZXRFbnZQbHVnaW4sXG4gICAgICBdLFxuICAgIH0pO1xuICAgIC8vIHBvc3Rjc3MtbG9hZGVyIGZhaWxzIHdoZW4gdHJ5aW5nIHRvIGRldGVybWluZSBjb25maWd1cmF0aW9uIGZpbGVzIGZvciBkYXRhIFVSSXNcbiAgICBvcHRpb25HZW5lcmF0b3IuY29uZmlnID0gZmFsc2U7XG5cbiAgICByZXR1cm4gb3B0aW9uR2VuZXJhdG9yO1xuICB9O1xuXG4gIC8vIGxvYWQgY29tcG9uZW50IGNzcyBhcyByYXcgc3RyaW5nc1xuICBjb25zdCBjb21wb25lbnRzU291cmNlTWFwID0gISEoXG4gICAgY3NzU291cmNlTWFwICYmXG4gICAgLy8gTmV2ZXIgdXNlIGNvbXBvbmVudCBjc3Mgc291cmNlbWFwIHdoZW4gc3R5bGUgb3B0aW1pemF0aW9ucyBhcmUgb24uXG4gICAgLy8gSXQgd2lsbCBqdXN0IGluY3JlYXNlIGJ1bmRsZSBzaXplIHdpdGhvdXQgb2ZmZXJpbmcgZ29vZCBkZWJ1ZyBleHBlcmllbmNlLlxuICAgICFidWlsZE9wdGlvbnMub3B0aW1pemF0aW9uLnN0eWxlcy5taW5pZnkgJiZcbiAgICAvLyBJbmxpbmUgYWxsIHNvdXJjZW1hcCB0eXBlcyBleGNlcHQgaGlkZGVuIG9uZXMsIHdoaWNoIGFyZSB0aGUgc2FtZSBhcyBubyBzb3VyY2VtYXBzXG4gICAgLy8gZm9yIGNvbXBvbmVudCBjc3MuXG4gICAgIWJ1aWxkT3B0aW9ucy5zb3VyY2VNYXAuaGlkZGVuXG4gICk7XG5cbiAgLy8gZXh0cmFjdCBnbG9iYWwgY3NzIGZyb20ganMgZmlsZXMgaW50byBvd24gY3NzIGZpbGUuXG4gIGV4dHJhUGx1Z2lucy5wdXNoKG5ldyBNaW5pQ3NzRXh0cmFjdFBsdWdpbih7IGZpbGVuYW1lOiBgW25hbWVdJHtoYXNoRm9ybWF0LmV4dHJhY3R9LmNzc2AgfSkpO1xuXG4gIGlmICghYnVpbGRPcHRpb25zLmhtcikge1xuICAgIC8vIGRvbid0IHJlbW92ZSBgLmpzYCBmaWxlcyBmb3IgYC5jc3NgIHdoZW4gd2UgYXJlIHVzaW5nIEhNUiB0aGVzZSBjb250YWluIEhNUiBhY2NlcHQgY29kZXMuXG4gICAgLy8gc3VwcHJlc3MgZW1wdHkgLmpzIGZpbGVzIGluIGNzcyBvbmx5IGVudHJ5IHBvaW50cy5cbiAgICBleHRyYVBsdWdpbnMucHVzaChuZXcgU3VwcHJlc3NFeHRyYWN0ZWRUZXh0Q2h1bmtzV2VicGFja1BsdWdpbigpKTtcbiAgfVxuXG4gIGNvbnN0IHBvc3RDc3MgPSByZXF1aXJlKCdwb3N0Y3NzJyk7XG4gIGNvbnN0IHBvc3RDc3NMb2FkZXJQYXRoID0gcmVxdWlyZS5yZXNvbHZlKCdwb3N0Y3NzLWxvYWRlcicpO1xuXG4gIGNvbnN0IGNvbXBvbmVudFN0eWxlTG9hZGVyczogUnVsZVNldFVzZUl0ZW1bXSA9IFtcbiAgICB7XG4gICAgICBsb2FkZXI6IHBvc3RDc3NMb2FkZXJQYXRoLFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICBpbXBsZW1lbnRhdGlvbjogcG9zdENzcyxcbiAgICAgICAgcG9zdGNzc09wdGlvbnM6IHBvc3Rjc3NPcHRpb25zQ3JlYXRvcihjb21wb25lbnRzU291cmNlTWFwLCBmYWxzZSksXG4gICAgICB9LFxuICAgIH0sXG4gIF07XG5cbiAgY29uc3QgZ2xvYmFsU3R5bGVMb2FkZXJzOiBSdWxlU2V0VXNlSXRlbVtdID0gW1xuICAgIHtcbiAgICAgIGxvYWRlcjogTWluaUNzc0V4dHJhY3RQbHVnaW4ubG9hZGVyLFxuICAgIH0sXG4gICAge1xuICAgICAgbG9hZGVyOiByZXF1aXJlLnJlc29sdmUoJ2Nzcy1sb2FkZXInKSxcbiAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgdXJsOiBmYWxzZSxcbiAgICAgICAgc291cmNlTWFwOiAhIWNzc1NvdXJjZU1hcCxcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2FkZXI6IHBvc3RDc3NMb2FkZXJQYXRoLFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICBpbXBsZW1lbnRhdGlvbjogcG9zdENzcyxcbiAgICAgICAgcG9zdGNzc09wdGlvbnM6IHBvc3Rjc3NPcHRpb25zQ3JlYXRvcihmYWxzZSwgdHJ1ZSksXG4gICAgICAgIHNvdXJjZU1hcDogISFjc3NTb3VyY2VNYXAsXG4gICAgICB9LFxuICAgIH0sXG4gIF07XG5cbiAgY29uc3Qgc3R5bGVMYW5ndWFnZXM6IHtcbiAgICBleHRlbnNpb25zOiBzdHJpbmdbXTtcbiAgICB1c2U6IFJ1bGVTZXRVc2VJdGVtW107XG4gIH1bXSA9IFtcbiAgICB7XG4gICAgICBleHRlbnNpb25zOiBbJ2NzcyddLFxuICAgICAgdXNlOiBbXSxcbiAgICB9LFxuICAgIHtcbiAgICAgIGV4dGVuc2lvbnM6IFsnc2NzcyddLFxuICAgICAgdXNlOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBsb2FkZXI6IHJlcXVpcmUucmVzb2x2ZSgncmVzb2x2ZS11cmwtbG9hZGVyJyksXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgc291cmNlTWFwOiBjc3NTb3VyY2VNYXAsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxvYWRlcjogcmVxdWlyZS5yZXNvbHZlKCdzYXNzLWxvYWRlcicpLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIGltcGxlbWVudGF0aW9uOiBzYXNzSW1wbGVtZW50YXRpb24sXG4gICAgICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgICAgICBzYXNzT3B0aW9uczoge1xuICAgICAgICAgICAgICAvLyBQcmV2ZW50IHVzZSBvZiBgZmliZXJzYCBwYWNrYWdlIGFzIGl0IG5vIGxvbmdlciB3b3JrcyBpbiBuZXdlciBOb2RlLmpzIHZlcnNpb25zXG4gICAgICAgICAgICAgIGZpYmVyOiBmYWxzZSxcbiAgICAgICAgICAgICAgLy8gYm9vdHN0cmFwLXNhc3MgcmVxdWlyZXMgYSBtaW5pbXVtIHByZWNpc2lvbiBvZiA4XG4gICAgICAgICAgICAgIHByZWNpc2lvbjogOCxcbiAgICAgICAgICAgICAgaW5jbHVkZVBhdGhzLFxuICAgICAgICAgICAgICAvLyBVc2UgZXhwYW5kZWQgYXMgb3RoZXJ3aXNlIHNhc3Mgd2lsbCByZW1vdmUgY29tbWVudHMgdGhhdCBhcmUgbmVlZGVkIGZvciBhdXRvcHJlZml4ZXJcbiAgICAgICAgICAgICAgLy8gRXg6IC8qIGF1dG9wcmVmaXhlciBncmlkOiBhdXRvcGxhY2UgKi9cbiAgICAgICAgICAgICAgLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vd2VicGFjay1jb250cmliL3Nhc3MtbG9hZGVyL2Jsb2IvNDVhZDBiZTE3MjY0Y2VhZGE1ZjBiNGZiODdlOTM1N2FiZTg1YzRmZi9zcmMvZ2V0U2Fzc09wdGlvbnMuanMjTDY4LUw3MFxuICAgICAgICAgICAgICBvdXRwdXRTdHlsZTogJ2V4cGFuZGVkJyxcbiAgICAgICAgICAgICAgLy8gU2lsZW5jZXMgY29tcGlsZXIgd2FybmluZ3MgZnJvbSAzcmQgcGFydHkgc3R5bGVzaGVldHNcbiAgICAgICAgICAgICAgcXVpZXREZXBzOiAhYnVpbGRPcHRpb25zLnZlcmJvc2UsXG4gICAgICAgICAgICAgIHZlcmJvc2U6IGJ1aWxkT3B0aW9ucy52ZXJib3NlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9LFxuICAgIHtcbiAgICAgIGV4dGVuc2lvbnM6IFsnc2FzcyddLFxuICAgICAgdXNlOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBsb2FkZXI6IHJlcXVpcmUucmVzb2x2ZSgncmVzb2x2ZS11cmwtbG9hZGVyJyksXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgc291cmNlTWFwOiBjc3NTb3VyY2VNYXAsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxvYWRlcjogcmVxdWlyZS5yZXNvbHZlKCdzYXNzLWxvYWRlcicpLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIGltcGxlbWVudGF0aW9uOiBzYXNzSW1wbGVtZW50YXRpb24sXG4gICAgICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgICAgICBzYXNzT3B0aW9uczoge1xuICAgICAgICAgICAgICAvLyBQcmV2ZW50IHVzZSBvZiBgZmliZXJzYCBwYWNrYWdlIGFzIGl0IG5vIGxvbmdlciB3b3JrcyBpbiBuZXdlciBOb2RlLmpzIHZlcnNpb25zXG4gICAgICAgICAgICAgIGZpYmVyOiBmYWxzZSxcbiAgICAgICAgICAgICAgaW5kZW50ZWRTeW50YXg6IHRydWUsXG4gICAgICAgICAgICAgIC8vIGJvb3RzdHJhcC1zYXNzIHJlcXVpcmVzIGEgbWluaW11bSBwcmVjaXNpb24gb2YgOFxuICAgICAgICAgICAgICBwcmVjaXNpb246IDgsXG4gICAgICAgICAgICAgIGluY2x1ZGVQYXRocyxcbiAgICAgICAgICAgICAgLy8gVXNlIGV4cGFuZGVkIGFzIG90aGVyd2lzZSBzYXNzIHdpbGwgcmVtb3ZlIGNvbW1lbnRzIHRoYXQgYXJlIG5lZWRlZCBmb3IgYXV0b3ByZWZpeGVyXG4gICAgICAgICAgICAgIC8vIEV4OiAvKiBhdXRvcHJlZml4ZXIgZ3JpZDogYXV0b3BsYWNlICovXG4gICAgICAgICAgICAgIC8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL3dlYnBhY2stY29udHJpYi9zYXNzLWxvYWRlci9ibG9iLzQ1YWQwYmUxNzI2NGNlYWRhNWYwYjRmYjg3ZTkzNTdhYmU4NWM0ZmYvc3JjL2dldFNhc3NPcHRpb25zLmpzI0w2OC1MNzBcbiAgICAgICAgICAgICAgb3V0cHV0U3R5bGU6ICdleHBhbmRlZCcsXG4gICAgICAgICAgICAgIC8vIFNpbGVuY2VzIGNvbXBpbGVyIHdhcm5pbmdzIGZyb20gM3JkIHBhcnR5IHN0eWxlc2hlZXRzXG4gICAgICAgICAgICAgIHF1aWV0RGVwczogIWJ1aWxkT3B0aW9ucy52ZXJib3NlLFxuICAgICAgICAgICAgICB2ZXJib3NlOiBidWlsZE9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgICB7XG4gICAgICBleHRlbnNpb25zOiBbJ2xlc3MnXSxcbiAgICAgIHVzZTogW1xuICAgICAgICB7XG4gICAgICAgICAgbG9hZGVyOiByZXF1aXJlLnJlc29sdmUoJ2xlc3MtbG9hZGVyJyksXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgaW1wbGVtZW50YXRpb246IHJlcXVpcmUoJ2xlc3MnKSxcbiAgICAgICAgICAgIHNvdXJjZU1hcDogY3NzU291cmNlTWFwLFxuICAgICAgICAgICAgbGVzc09wdGlvbnM6IHtcbiAgICAgICAgICAgICAgamF2YXNjcmlwdEVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICAgIHBhdGhzOiBpbmNsdWRlUGF0aHMsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0sXG4gICAge1xuICAgICAgZXh0ZW5zaW9uczogWydzdHlsJ10sXG4gICAgICB1c2U6IFtcbiAgICAgICAge1xuICAgICAgICAgIGxvYWRlcjogcmVxdWlyZS5yZXNvbHZlKCdzdHlsdXMtbG9hZGVyJyksXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgc291cmNlTWFwOiBjc3NTb3VyY2VNYXAsXG4gICAgICAgICAgICBzdHlsdXNPcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNvbXByZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgc291cmNlTWFwOiB7IGNvbW1lbnQ6IGZhbHNlIH0sXG4gICAgICAgICAgICAgIHBhdGhzOiBpbmNsdWRlUGF0aHMsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0sXG4gIF07XG5cbiAgcmV0dXJuIHtcbiAgICBlbnRyeTogZW50cnlQb2ludHMsXG4gICAgbW9kdWxlOiB7XG4gICAgICBydWxlczogc3R5bGVMYW5ndWFnZXMubWFwKCh7IGV4dGVuc2lvbnMsIHVzZSB9KSA9PiAoe1xuICAgICAgICB0ZXN0OiBuZXcgUmVnRXhwKGBcXFxcLig/OiR7ZXh0ZW5zaW9ucy5qb2luKCd8Jyl9KSRgLCAnaScpLFxuICAgICAgICBydWxlczogW1xuICAgICAgICAgIC8vIFNldHVwIHByb2Nlc3NpbmcgcnVsZXMgZm9yIGdsb2JhbCBhbmQgY29tcG9uZW50IHN0eWxlc1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIG9uZU9mOiBbXG4gICAgICAgICAgICAgIC8vIEdsb2JhbCBzdHlsZXMgYXJlIG9ubHkgZGVmaW5lZCBnbG9iYWwgc3R5bGVzXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB1c2U6IGdsb2JhbFN0eWxlTG9hZGVycyxcbiAgICAgICAgICAgICAgICBpbmNsdWRlOiBnbG9iYWxTdHlsZVBhdGhzLFxuICAgICAgICAgICAgICAgIHJlc291cmNlUXVlcnk6IHsgbm90OiBbL1xcP25nUmVzb3VyY2UvXSB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAvLyBDb21wb25lbnQgc3R5bGVzIGFyZSBhbGwgc3R5bGVzIGV4Y2VwdCBkZWZpbmVkIGdsb2JhbCBzdHlsZXNcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHVzZTogY29tcG9uZW50U3R5bGVMb2FkZXJzLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdhc3NldC9zb3VyY2UnLFxuICAgICAgICAgICAgICAgIHJlc291cmNlUXVlcnk6IC9cXD9uZ1Jlc291cmNlLyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7IHVzZSB9LFxuICAgICAgICBdLFxuICAgICAgfSkpLFxuICAgIH0sXG4gICAgb3B0aW1pemF0aW9uOiB7XG4gICAgICBtaW5pbWl6ZXI6IGJ1aWxkT3B0aW9ucy5vcHRpbWl6YXRpb24uc3R5bGVzLm1pbmlmeVxuICAgICAgICA/IFtcbiAgICAgICAgICAgIG5ldyBDc3NPcHRpbWl6ZXJQbHVnaW4oe1xuICAgICAgICAgICAgICBzdXBwb3J0ZWRCcm93c2VyczogYnVpbGRPcHRpb25zLnN1cHBvcnRlZEJyb3dzZXJzLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgXVxuICAgICAgICA6IHVuZGVmaW5lZCxcbiAgICB9LFxuICAgIHBsdWdpbnM6IGV4dHJhUGx1Z2lucyxcbiAgfTtcbn1cbiJdfQ==