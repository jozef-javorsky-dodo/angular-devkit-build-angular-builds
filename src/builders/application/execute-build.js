"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeBuild = void 0;
const node_assert_1 = __importDefault(require("node:assert"));
const compiler_plugin_1 = require("../../tools/esbuild/angular/compiler-plugin");
const application_code_bundle_1 = require("../../tools/esbuild/application-code-bundle");
const bundler_context_1 = require("../../tools/esbuild/bundler-context");
const bundler_execution_result_1 = require("../../tools/esbuild/bundler-execution-result");
const commonjs_checker_1 = require("../../tools/esbuild/commonjs-checker");
const global_scripts_1 = require("../../tools/esbuild/global-scripts");
const global_styles_1 = require("../../tools/esbuild/global-styles");
const index_html_generator_1 = require("../../tools/esbuild/index-html-generator");
const license_extractor_1 = require("../../tools/esbuild/license-extractor");
const utils_1 = require("../../tools/esbuild/utils");
const copy_assets_1 = require("../../utils/copy-assets");
const environment_options_1 = require("../../utils/environment-options");
const prerender_1 = require("../../utils/server-rendering/prerender");
const service_worker_1 = require("../../utils/service-worker");
const supported_browsers_1 = require("../../utils/supported-browsers");
const i18n_1 = require("./i18n");
// eslint-disable-next-line max-lines-per-function
async function executeBuild(options, context, rebuildState) {
    const startTime = process.hrtime.bigint();
    const { projectRoot, workspaceRoot, serviceWorker, optimizationOptions, serverEntryPoint, assets, indexHtmlOptions, cacheOptions, prerenderOptions, appShellOptions, ssrOptions, verbose, } = options;
    const browsers = (0, supported_browsers_1.getSupportedBrowsers)(projectRoot, context.logger);
    const target = (0, utils_1.transformSupportedBrowsersToTargets)(browsers);
    // Load active translations if inlining
    // TODO: Integrate into watch mode and only load changed translations
    if (options.i18nOptions.shouldInline) {
        await (0, i18n_1.loadActiveTranslations)(context, options.i18nOptions);
    }
    // Reuse rebuild state or create new bundle contexts for code and global stylesheets
    let bundlerContexts = rebuildState?.rebuildContexts;
    const codeBundleCache = rebuildState?.codeBundleCache ??
        new compiler_plugin_1.SourceFileCache(cacheOptions.enabled ? cacheOptions.path : undefined);
    if (bundlerContexts === undefined) {
        bundlerContexts = [];
        // Browser application code
        bundlerContexts.push(new bundler_context_1.BundlerContext(workspaceRoot, !!options.watch, (0, application_code_bundle_1.createBrowserCodeBundleOptions)(options, target, codeBundleCache)));
        // Global Stylesheets
        if (options.globalStyles.length > 0) {
            for (const initial of [true, false]) {
                const bundleOptions = (0, global_styles_1.createGlobalStylesBundleOptions)(options, target, initial, codeBundleCache?.loadResultCache);
                if (bundleOptions) {
                    bundlerContexts.push(new bundler_context_1.BundlerContext(workspaceRoot, !!options.watch, bundleOptions, () => initial));
                }
            }
        }
        // Global Scripts
        if (options.globalScripts.length > 0) {
            for (const initial of [true, false]) {
                const bundleOptions = (0, global_scripts_1.createGlobalScriptsBundleOptions)(options, initial);
                if (bundleOptions) {
                    bundlerContexts.push(new bundler_context_1.BundlerContext(workspaceRoot, !!options.watch, bundleOptions, () => initial));
                }
            }
        }
        // Server application code
        if (serverEntryPoint) {
            bundlerContexts.push(new bundler_context_1.BundlerContext(workspaceRoot, !!options.watch, (0, application_code_bundle_1.createServerCodeBundleOptions)(options, 
            // NOTE: earlier versions of Node.js are not supported due to unsafe promise patching.
            // See: https://github.com/angular/angular/pull/50552#issue-1737967592
            [...target, 'node18.13'], codeBundleCache), () => false));
        }
    }
    const bundlingResult = await bundler_context_1.BundlerContext.bundleAll(bundlerContexts);
    // Log all warnings and errors generated during bundling
    await (0, utils_1.logMessages)(context, bundlingResult);
    const executionResult = new bundler_execution_result_1.ExecutionResult(bundlerContexts, codeBundleCache);
    // Return if the bundling has errors
    if (bundlingResult.errors) {
        return executionResult;
    }
    const { metafile, initialFiles, outputFiles } = bundlingResult;
    executionResult.outputFiles.push(...outputFiles);
    // Check metafile for CommonJS module usage if optimizing scripts
    if (optimizationOptions.scripts) {
        const messages = (0, commonjs_checker_1.checkCommonJSModules)(metafile, options.allowedCommonJsDependencies);
        await (0, utils_1.logMessages)(context, { warnings: messages });
    }
    /**
     * Index HTML content without CSS inlining to be used for server rendering (AppShell, SSG and SSR).
     *
     * NOTE: we don't perform critical CSS inlining as this will be done during server rendering.
     */
    let indexContentOutputNoCssInlining;
    // Generate index HTML file
    // If localization is enabled, index generation is handled in the inlining process.
    // NOTE: Localization with SSR is not currently supported.
    if (indexHtmlOptions && !options.i18nOptions.shouldInline) {
        const { content, contentWithoutCriticalCssInlined, errors, warnings } = await (0, index_html_generator_1.generateIndexHtml)(initialFiles, executionResult.outputFiles, {
            ...options,
            optimizationOptions,
        }, 
        // Set lang attribute to the defined source locale if present
        options.i18nOptions.hasDefinedSourceLocale ? options.i18nOptions.sourceLocale : undefined);
        indexContentOutputNoCssInlining = contentWithoutCriticalCssInlined;
        printWarningsAndErrorsToConsole(context, warnings, errors);
        executionResult.addOutputFile(indexHtmlOptions.output, content);
        if (ssrOptions) {
            executionResult.addOutputFile('index.server.html', contentWithoutCriticalCssInlined);
        }
    }
    // Pre-render (SSG) and App-shell
    if (prerenderOptions || appShellOptions) {
        (0, node_assert_1.default)(indexContentOutputNoCssInlining, 'The "index" option is required when using the "ssg" or "appShell" options.');
        const { output, warnings, errors } = await (0, prerender_1.prerenderPages)(workspaceRoot, appShellOptions, prerenderOptions, executionResult.outputFiles, indexContentOutputNoCssInlining, optimizationOptions.styles.inlineCritical, environment_options_1.maxWorkers, verbose);
        printWarningsAndErrorsToConsole(context, warnings, errors);
        for (const [path, content] of Object.entries(output)) {
            executionResult.addOutputFile(path, content);
        }
    }
    // Copy assets
    if (assets) {
        // The webpack copy assets helper is used with no base paths defined. This prevents the helper
        // from directly writing to disk. This should eventually be replaced with a more optimized helper.
        executionResult.assetFiles.push(...(await (0, copy_assets_1.copyAssets)(assets, [], workspaceRoot)));
    }
    // Write metafile if stats option is enabled
    if (options.stats) {
        executionResult.addOutputFile('stats.json', JSON.stringify(metafile, null, 2));
    }
    // Extract and write licenses for used packages
    if (options.extractLicenses) {
        executionResult.addOutputFile('3rdpartylicenses.txt', await (0, license_extractor_1.extractLicenses)(metafile, workspaceRoot));
    }
    // Augment the application with service worker support
    if (serviceWorker) {
        try {
            const serviceWorkerResult = await (0, service_worker_1.augmentAppWithServiceWorkerEsbuild)(workspaceRoot, serviceWorker, options.baseHref || '/', executionResult.outputFiles, executionResult.assetFiles);
            executionResult.addOutputFile('ngsw.json', serviceWorkerResult.manifest);
            executionResult.assetFiles.push(...serviceWorkerResult.assetFiles);
        }
        catch (error) {
            context.logger.error(error instanceof Error ? error.message : `${error}`);
            return executionResult;
        }
    }
    // Calculate estimated transfer size if scripts are optimized
    let estimatedTransferSizes;
    if (optimizationOptions.scripts || optimizationOptions.styles.minify) {
        estimatedTransferSizes = await (0, utils_1.calculateEstimatedTransferSizes)(executionResult.outputFiles);
    }
    (0, utils_1.logBuildStats)(context, metafile, initialFiles, estimatedTransferSizes);
    const buildTime = Number(process.hrtime.bigint() - startTime) / 10 ** 9;
    context.logger.info(`Application bundle generation complete. [${buildTime.toFixed(3)} seconds]`);
    // Perform i18n translation inlining if enabled
    if (options.i18nOptions.shouldInline) {
        await (0, i18n_1.inlineI18n)(options, executionResult, initialFiles);
    }
    return executionResult;
}
exports.executeBuild = executeBuild;
function printWarningsAndErrorsToConsole(context, warnings, errors) {
    for (const error of errors) {
        context.logger.error(error);
    }
    for (const warning of warnings) {
        context.logger.warn(warning);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0ZS1idWlsZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX2FuZ3VsYXIvc3JjL2J1aWxkZXJzL2FwcGxpY2F0aW9uL2V4ZWN1dGUtYnVpbGQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7O0FBR0gsOERBQWlDO0FBQ2pDLGlGQUE4RTtBQUM5RSx5RkFHcUQ7QUFDckQseUVBQXFFO0FBQ3JFLDJGQUE2RjtBQUM3RiwyRUFBNEU7QUFDNUUsdUVBQXNGO0FBQ3RGLHFFQUFvRjtBQUNwRixtRkFBNkU7QUFDN0UsNkVBQXdFO0FBQ3hFLHFEQUttQztBQUNuQyx5REFBcUQ7QUFDckQseUVBQTZEO0FBQzdELHNFQUF3RTtBQUN4RSwrREFBZ0Y7QUFDaEYsdUVBQXNFO0FBQ3RFLGlDQUE0RDtBQUc1RCxrREFBa0Q7QUFDM0MsS0FBSyxVQUFVLFlBQVksQ0FDaEMsT0FBMEMsRUFDMUMsT0FBdUIsRUFDdkIsWUFBMkI7SUFFM0IsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUUxQyxNQUFNLEVBQ0osV0FBVyxFQUNYLGFBQWEsRUFDYixhQUFhLEVBQ2IsbUJBQW1CLEVBQ25CLGdCQUFnQixFQUNoQixNQUFNLEVBQ04sZ0JBQWdCLEVBQ2hCLFlBQVksRUFDWixnQkFBZ0IsRUFDaEIsZUFBZSxFQUNmLFVBQVUsRUFDVixPQUFPLEdBQ1IsR0FBRyxPQUFPLENBQUM7SUFFWixNQUFNLFFBQVEsR0FBRyxJQUFBLHlDQUFvQixFQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbkUsTUFBTSxNQUFNLEdBQUcsSUFBQSwyQ0FBbUMsRUFBQyxRQUFRLENBQUMsQ0FBQztJQUU3RCx1Q0FBdUM7SUFDdkMscUVBQXFFO0lBQ3JFLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUU7UUFDcEMsTUFBTSxJQUFBLDZCQUFzQixFQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7S0FDNUQ7SUFFRCxvRkFBb0Y7SUFDcEYsSUFBSSxlQUFlLEdBQUcsWUFBWSxFQUFFLGVBQWUsQ0FBQztJQUNwRCxNQUFNLGVBQWUsR0FDbkIsWUFBWSxFQUFFLGVBQWU7UUFDN0IsSUFBSSxpQ0FBZSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzVFLElBQUksZUFBZSxLQUFLLFNBQVMsRUFBRTtRQUNqQyxlQUFlLEdBQUcsRUFBRSxDQUFDO1FBRXJCLDJCQUEyQjtRQUMzQixlQUFlLENBQUMsSUFBSSxDQUNsQixJQUFJLGdDQUFjLENBQ2hCLGFBQWEsRUFDYixDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFDZixJQUFBLHdEQUE4QixFQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxDQUFDLENBQ2pFLENBQ0YsQ0FBQztRQUVGLHFCQUFxQjtRQUNyQixJQUFJLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUNuQyxLQUFLLE1BQU0sT0FBTyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUNuQyxNQUFNLGFBQWEsR0FBRyxJQUFBLCtDQUErQixFQUNuRCxPQUFPLEVBQ1AsTUFBTSxFQUNOLE9BQU8sRUFDUCxlQUFlLEVBQUUsZUFBZSxDQUNqQyxDQUFDO2dCQUNGLElBQUksYUFBYSxFQUFFO29CQUNqQixlQUFlLENBQUMsSUFBSSxDQUNsQixJQUFJLGdDQUFjLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLGFBQWEsRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FDakYsQ0FBQztpQkFDSDthQUNGO1NBQ0Y7UUFFRCxpQkFBaUI7UUFDakIsSUFBSSxPQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDcEMsS0FBSyxNQUFNLE9BQU8sSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRTtnQkFDbkMsTUFBTSxhQUFhLEdBQUcsSUFBQSxpREFBZ0MsRUFBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ3pFLElBQUksYUFBYSxFQUFFO29CQUNqQixlQUFlLENBQUMsSUFBSSxDQUNsQixJQUFJLGdDQUFjLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLGFBQWEsRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FDakYsQ0FBQztpQkFDSDthQUNGO1NBQ0Y7UUFFRCwwQkFBMEI7UUFDMUIsSUFBSSxnQkFBZ0IsRUFBRTtZQUNwQixlQUFlLENBQUMsSUFBSSxDQUNsQixJQUFJLGdDQUFjLENBQ2hCLGFBQWEsRUFDYixDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFDZixJQUFBLHVEQUE2QixFQUMzQixPQUFPO1lBQ1Asc0ZBQXNGO1lBQ3RGLHNFQUFzRTtZQUN0RSxDQUFDLEdBQUcsTUFBTSxFQUFFLFdBQVcsQ0FBQyxFQUN4QixlQUFlLENBQ2hCLEVBQ0QsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUNaLENBQ0YsQ0FBQztTQUNIO0tBQ0Y7SUFFRCxNQUFNLGNBQWMsR0FBRyxNQUFNLGdDQUFjLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBRXZFLHdEQUF3RDtJQUN4RCxNQUFNLElBQUEsbUJBQVcsRUFBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFFM0MsTUFBTSxlQUFlLEdBQUcsSUFBSSwwQ0FBZSxDQUFDLGVBQWUsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUU5RSxvQ0FBb0M7SUFDcEMsSUFBSSxjQUFjLENBQUMsTUFBTSxFQUFFO1FBQ3pCLE9BQU8sZUFBZSxDQUFDO0tBQ3hCO0lBRUQsTUFBTSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLEdBQUcsY0FBYyxDQUFDO0lBRS9ELGVBQWUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUM7SUFFakQsaUVBQWlFO0lBQ2pFLElBQUksbUJBQW1CLENBQUMsT0FBTyxFQUFFO1FBQy9CLE1BQU0sUUFBUSxHQUFHLElBQUEsdUNBQW9CLEVBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0sSUFBQSxtQkFBVyxFQUFDLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO0tBQ3BEO0lBRUQ7Ozs7T0FJRztJQUNILElBQUksK0JBQW1ELENBQUM7SUFFeEQsMkJBQTJCO0lBQzNCLG1GQUFtRjtJQUNuRiwwREFBMEQ7SUFDMUQsSUFBSSxnQkFBZ0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFO1FBQ3pELE1BQU0sRUFBRSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLE1BQU0sSUFBQSx3Q0FBaUIsRUFDN0YsWUFBWSxFQUNaLGVBQWUsQ0FBQyxXQUFXLEVBQzNCO1lBQ0UsR0FBRyxPQUFPO1lBQ1YsbUJBQW1CO1NBQ3BCO1FBQ0QsNkRBQTZEO1FBQzdELE9BQU8sQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQzFGLENBQUM7UUFFRiwrQkFBK0IsR0FBRyxnQ0FBZ0MsQ0FBQztRQUNuRSwrQkFBK0IsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRTNELGVBQWUsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRWhFLElBQUksVUFBVSxFQUFFO1lBQ2QsZUFBZSxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO1NBQ3RGO0tBQ0Y7SUFFRCxpQ0FBaUM7SUFDakMsSUFBSSxnQkFBZ0IsSUFBSSxlQUFlLEVBQUU7UUFDdkMsSUFBQSxxQkFBTSxFQUNKLCtCQUErQixFQUMvQiw0RUFBNEUsQ0FDN0UsQ0FBQztRQUVGLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxHQUFHLE1BQU0sSUFBQSwwQkFBYyxFQUN2RCxhQUFhLEVBQ2IsZUFBZSxFQUNmLGdCQUFnQixFQUNoQixlQUFlLENBQUMsV0FBVyxFQUMzQiwrQkFBK0IsRUFDL0IsbUJBQW1CLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFDekMsZ0NBQVUsRUFDVixPQUFPLENBQ1IsQ0FBQztRQUVGLCtCQUErQixDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFM0QsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDcEQsZUFBZSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDOUM7S0FDRjtJQUVELGNBQWM7SUFDZCxJQUFJLE1BQU0sRUFBRTtRQUNWLDhGQUE4RjtRQUM5RixrR0FBa0c7UUFDbEcsZUFBZSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sSUFBQSx3QkFBVSxFQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ25GO0lBRUQsNENBQTRDO0lBQzVDLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRTtRQUNqQixlQUFlLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNoRjtJQUVELCtDQUErQztJQUMvQyxJQUFJLE9BQU8sQ0FBQyxlQUFlLEVBQUU7UUFDM0IsZUFBZSxDQUFDLGFBQWEsQ0FDM0Isc0JBQXNCLEVBQ3RCLE1BQU0sSUFBQSxtQ0FBZSxFQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FDL0MsQ0FBQztLQUNIO0lBRUQsc0RBQXNEO0lBQ3RELElBQUksYUFBYSxFQUFFO1FBQ2pCLElBQUk7WUFDRixNQUFNLG1CQUFtQixHQUFHLE1BQU0sSUFBQSxtREFBa0MsRUFDbEUsYUFBYSxFQUNiLGFBQWEsRUFDYixPQUFPLENBQUMsUUFBUSxJQUFJLEdBQUcsRUFDdkIsZUFBZSxDQUFDLFdBQVcsRUFDM0IsZUFBZSxDQUFDLFVBQVUsQ0FDM0IsQ0FBQztZQUNGLGVBQWUsQ0FBQyxhQUFhLENBQUMsV0FBVyxFQUFFLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3pFLGVBQWUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDcEU7UUFBQyxPQUFPLEtBQUssRUFBRTtZQUNkLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUUxRSxPQUFPLGVBQWUsQ0FBQztTQUN4QjtLQUNGO0lBRUQsNkRBQTZEO0lBQzdELElBQUksc0JBQXNCLENBQUM7SUFDM0IsSUFBSSxtQkFBbUIsQ0FBQyxPQUFPLElBQUksbUJBQW1CLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRTtRQUNwRSxzQkFBc0IsR0FBRyxNQUFNLElBQUEsdUNBQStCLEVBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0tBQzdGO0lBRUQsSUFBQSxxQkFBYSxFQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLHNCQUFzQixDQUFDLENBQUM7SUFFdkUsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEdBQUcsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN4RSxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyw0Q0FBNEMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7SUFFakcsK0NBQStDO0lBQy9DLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUU7UUFDcEMsTUFBTSxJQUFBLGlCQUFVLEVBQUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLENBQUMsQ0FBQztLQUMxRDtJQUVELE9BQU8sZUFBZSxDQUFDO0FBQ3pCLENBQUM7QUF2T0Qsb0NBdU9DO0FBRUQsU0FBUywrQkFBK0IsQ0FDdEMsT0FBdUIsRUFDdkIsUUFBa0IsRUFDbEIsTUFBZ0I7SUFFaEIsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7UUFDMUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDN0I7SUFDRCxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRTtRQUM5QixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUM5QjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQnVpbGRlckNvbnRleHQgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCBhc3NlcnQgZnJvbSAnbm9kZTphc3NlcnQnO1xuaW1wb3J0IHsgU291cmNlRmlsZUNhY2hlIH0gZnJvbSAnLi4vLi4vdG9vbHMvZXNidWlsZC9hbmd1bGFyL2NvbXBpbGVyLXBsdWdpbic7XG5pbXBvcnQge1xuICBjcmVhdGVCcm93c2VyQ29kZUJ1bmRsZU9wdGlvbnMsXG4gIGNyZWF0ZVNlcnZlckNvZGVCdW5kbGVPcHRpb25zLFxufSBmcm9tICcuLi8uLi90b29scy9lc2J1aWxkL2FwcGxpY2F0aW9uLWNvZGUtYnVuZGxlJztcbmltcG9ydCB7IEJ1bmRsZXJDb250ZXh0IH0gZnJvbSAnLi4vLi4vdG9vbHMvZXNidWlsZC9idW5kbGVyLWNvbnRleHQnO1xuaW1wb3J0IHsgRXhlY3V0aW9uUmVzdWx0LCBSZWJ1aWxkU3RhdGUgfSBmcm9tICcuLi8uLi90b29scy9lc2J1aWxkL2J1bmRsZXItZXhlY3V0aW9uLXJlc3VsdCc7XG5pbXBvcnQgeyBjaGVja0NvbW1vbkpTTW9kdWxlcyB9IGZyb20gJy4uLy4uL3Rvb2xzL2VzYnVpbGQvY29tbW9uanMtY2hlY2tlcic7XG5pbXBvcnQgeyBjcmVhdGVHbG9iYWxTY3JpcHRzQnVuZGxlT3B0aW9ucyB9IGZyb20gJy4uLy4uL3Rvb2xzL2VzYnVpbGQvZ2xvYmFsLXNjcmlwdHMnO1xuaW1wb3J0IHsgY3JlYXRlR2xvYmFsU3R5bGVzQnVuZGxlT3B0aW9ucyB9IGZyb20gJy4uLy4uL3Rvb2xzL2VzYnVpbGQvZ2xvYmFsLXN0eWxlcyc7XG5pbXBvcnQgeyBnZW5lcmF0ZUluZGV4SHRtbCB9IGZyb20gJy4uLy4uL3Rvb2xzL2VzYnVpbGQvaW5kZXgtaHRtbC1nZW5lcmF0b3InO1xuaW1wb3J0IHsgZXh0cmFjdExpY2Vuc2VzIH0gZnJvbSAnLi4vLi4vdG9vbHMvZXNidWlsZC9saWNlbnNlLWV4dHJhY3Rvcic7XG5pbXBvcnQge1xuICBjYWxjdWxhdGVFc3RpbWF0ZWRUcmFuc2ZlclNpemVzLFxuICBsb2dCdWlsZFN0YXRzLFxuICBsb2dNZXNzYWdlcyxcbiAgdHJhbnNmb3JtU3VwcG9ydGVkQnJvd3NlcnNUb1RhcmdldHMsXG59IGZyb20gJy4uLy4uL3Rvb2xzL2VzYnVpbGQvdXRpbHMnO1xuaW1wb3J0IHsgY29weUFzc2V0cyB9IGZyb20gJy4uLy4uL3V0aWxzL2NvcHktYXNzZXRzJztcbmltcG9ydCB7IG1heFdvcmtlcnMgfSBmcm9tICcuLi8uLi91dGlscy9lbnZpcm9ubWVudC1vcHRpb25zJztcbmltcG9ydCB7IHByZXJlbmRlclBhZ2VzIH0gZnJvbSAnLi4vLi4vdXRpbHMvc2VydmVyLXJlbmRlcmluZy9wcmVyZW5kZXInO1xuaW1wb3J0IHsgYXVnbWVudEFwcFdpdGhTZXJ2aWNlV29ya2VyRXNidWlsZCB9IGZyb20gJy4uLy4uL3V0aWxzL3NlcnZpY2Utd29ya2VyJztcbmltcG9ydCB7IGdldFN1cHBvcnRlZEJyb3dzZXJzIH0gZnJvbSAnLi4vLi4vdXRpbHMvc3VwcG9ydGVkLWJyb3dzZXJzJztcbmltcG9ydCB7IGlubGluZUkxOG4sIGxvYWRBY3RpdmVUcmFuc2xhdGlvbnMgfSBmcm9tICcuL2kxOG4nO1xuaW1wb3J0IHsgTm9ybWFsaXplZEFwcGxpY2F0aW9uQnVpbGRPcHRpb25zIH0gZnJvbSAnLi9vcHRpb25zJztcblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1saW5lcy1wZXItZnVuY3Rpb25cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBleGVjdXRlQnVpbGQoXG4gIG9wdGlvbnM6IE5vcm1hbGl6ZWRBcHBsaWNhdGlvbkJ1aWxkT3B0aW9ucyxcbiAgY29udGV4dDogQnVpbGRlckNvbnRleHQsXG4gIHJlYnVpbGRTdGF0ZT86IFJlYnVpbGRTdGF0ZSxcbik6IFByb21pc2U8RXhlY3V0aW9uUmVzdWx0PiB7XG4gIGNvbnN0IHN0YXJ0VGltZSA9IHByb2Nlc3MuaHJ0aW1lLmJpZ2ludCgpO1xuXG4gIGNvbnN0IHtcbiAgICBwcm9qZWN0Um9vdCxcbiAgICB3b3Jrc3BhY2VSb290LFxuICAgIHNlcnZpY2VXb3JrZXIsXG4gICAgb3B0aW1pemF0aW9uT3B0aW9ucyxcbiAgICBzZXJ2ZXJFbnRyeVBvaW50LFxuICAgIGFzc2V0cyxcbiAgICBpbmRleEh0bWxPcHRpb25zLFxuICAgIGNhY2hlT3B0aW9ucyxcbiAgICBwcmVyZW5kZXJPcHRpb25zLFxuICAgIGFwcFNoZWxsT3B0aW9ucyxcbiAgICBzc3JPcHRpb25zLFxuICAgIHZlcmJvc2UsXG4gIH0gPSBvcHRpb25zO1xuXG4gIGNvbnN0IGJyb3dzZXJzID0gZ2V0U3VwcG9ydGVkQnJvd3NlcnMocHJvamVjdFJvb3QsIGNvbnRleHQubG9nZ2VyKTtcbiAgY29uc3QgdGFyZ2V0ID0gdHJhbnNmb3JtU3VwcG9ydGVkQnJvd3NlcnNUb1RhcmdldHMoYnJvd3NlcnMpO1xuXG4gIC8vIExvYWQgYWN0aXZlIHRyYW5zbGF0aW9ucyBpZiBpbmxpbmluZ1xuICAvLyBUT0RPOiBJbnRlZ3JhdGUgaW50byB3YXRjaCBtb2RlIGFuZCBvbmx5IGxvYWQgY2hhbmdlZCB0cmFuc2xhdGlvbnNcbiAgaWYgKG9wdGlvbnMuaTE4bk9wdGlvbnMuc2hvdWxkSW5saW5lKSB7XG4gICAgYXdhaXQgbG9hZEFjdGl2ZVRyYW5zbGF0aW9ucyhjb250ZXh0LCBvcHRpb25zLmkxOG5PcHRpb25zKTtcbiAgfVxuXG4gIC8vIFJldXNlIHJlYnVpbGQgc3RhdGUgb3IgY3JlYXRlIG5ldyBidW5kbGUgY29udGV4dHMgZm9yIGNvZGUgYW5kIGdsb2JhbCBzdHlsZXNoZWV0c1xuICBsZXQgYnVuZGxlckNvbnRleHRzID0gcmVidWlsZFN0YXRlPy5yZWJ1aWxkQ29udGV4dHM7XG4gIGNvbnN0IGNvZGVCdW5kbGVDYWNoZSA9XG4gICAgcmVidWlsZFN0YXRlPy5jb2RlQnVuZGxlQ2FjaGUgPz9cbiAgICBuZXcgU291cmNlRmlsZUNhY2hlKGNhY2hlT3B0aW9ucy5lbmFibGVkID8gY2FjaGVPcHRpb25zLnBhdGggOiB1bmRlZmluZWQpO1xuICBpZiAoYnVuZGxlckNvbnRleHRzID09PSB1bmRlZmluZWQpIHtcbiAgICBidW5kbGVyQ29udGV4dHMgPSBbXTtcblxuICAgIC8vIEJyb3dzZXIgYXBwbGljYXRpb24gY29kZVxuICAgIGJ1bmRsZXJDb250ZXh0cy5wdXNoKFxuICAgICAgbmV3IEJ1bmRsZXJDb250ZXh0KFxuICAgICAgICB3b3Jrc3BhY2VSb290LFxuICAgICAgICAhIW9wdGlvbnMud2F0Y2gsXG4gICAgICAgIGNyZWF0ZUJyb3dzZXJDb2RlQnVuZGxlT3B0aW9ucyhvcHRpb25zLCB0YXJnZXQsIGNvZGVCdW5kbGVDYWNoZSksXG4gICAgICApLFxuICAgICk7XG5cbiAgICAvLyBHbG9iYWwgU3R5bGVzaGVldHNcbiAgICBpZiAob3B0aW9ucy5nbG9iYWxTdHlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgZm9yIChjb25zdCBpbml0aWFsIG9mIFt0cnVlLCBmYWxzZV0pIHtcbiAgICAgICAgY29uc3QgYnVuZGxlT3B0aW9ucyA9IGNyZWF0ZUdsb2JhbFN0eWxlc0J1bmRsZU9wdGlvbnMoXG4gICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICB0YXJnZXQsXG4gICAgICAgICAgaW5pdGlhbCxcbiAgICAgICAgICBjb2RlQnVuZGxlQ2FjaGU/LmxvYWRSZXN1bHRDYWNoZSxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKGJ1bmRsZU9wdGlvbnMpIHtcbiAgICAgICAgICBidW5kbGVyQ29udGV4dHMucHVzaChcbiAgICAgICAgICAgIG5ldyBCdW5kbGVyQ29udGV4dCh3b3Jrc3BhY2VSb290LCAhIW9wdGlvbnMud2F0Y2gsIGJ1bmRsZU9wdGlvbnMsICgpID0+IGluaXRpYWwpLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBHbG9iYWwgU2NyaXB0c1xuICAgIGlmIChvcHRpb25zLmdsb2JhbFNjcmlwdHMubGVuZ3RoID4gMCkge1xuICAgICAgZm9yIChjb25zdCBpbml0aWFsIG9mIFt0cnVlLCBmYWxzZV0pIHtcbiAgICAgICAgY29uc3QgYnVuZGxlT3B0aW9ucyA9IGNyZWF0ZUdsb2JhbFNjcmlwdHNCdW5kbGVPcHRpb25zKG9wdGlvbnMsIGluaXRpYWwpO1xuICAgICAgICBpZiAoYnVuZGxlT3B0aW9ucykge1xuICAgICAgICAgIGJ1bmRsZXJDb250ZXh0cy5wdXNoKFxuICAgICAgICAgICAgbmV3IEJ1bmRsZXJDb250ZXh0KHdvcmtzcGFjZVJvb3QsICEhb3B0aW9ucy53YXRjaCwgYnVuZGxlT3B0aW9ucywgKCkgPT4gaW5pdGlhbCksXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNlcnZlciBhcHBsaWNhdGlvbiBjb2RlXG4gICAgaWYgKHNlcnZlckVudHJ5UG9pbnQpIHtcbiAgICAgIGJ1bmRsZXJDb250ZXh0cy5wdXNoKFxuICAgICAgICBuZXcgQnVuZGxlckNvbnRleHQoXG4gICAgICAgICAgd29ya3NwYWNlUm9vdCxcbiAgICAgICAgICAhIW9wdGlvbnMud2F0Y2gsXG4gICAgICAgICAgY3JlYXRlU2VydmVyQ29kZUJ1bmRsZU9wdGlvbnMoXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgLy8gTk9URTogZWFybGllciB2ZXJzaW9ucyBvZiBOb2RlLmpzIGFyZSBub3Qgc3VwcG9ydGVkIGR1ZSB0byB1bnNhZmUgcHJvbWlzZSBwYXRjaGluZy5cbiAgICAgICAgICAgIC8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci9wdWxsLzUwNTUyI2lzc3VlLTE3Mzc5Njc1OTJcbiAgICAgICAgICAgIFsuLi50YXJnZXQsICdub2RlMTguMTMnXSxcbiAgICAgICAgICAgIGNvZGVCdW5kbGVDYWNoZSxcbiAgICAgICAgICApLFxuICAgICAgICAgICgpID0+IGZhbHNlLFxuICAgICAgICApLFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBidW5kbGluZ1Jlc3VsdCA9IGF3YWl0IEJ1bmRsZXJDb250ZXh0LmJ1bmRsZUFsbChidW5kbGVyQ29udGV4dHMpO1xuXG4gIC8vIExvZyBhbGwgd2FybmluZ3MgYW5kIGVycm9ycyBnZW5lcmF0ZWQgZHVyaW5nIGJ1bmRsaW5nXG4gIGF3YWl0IGxvZ01lc3NhZ2VzKGNvbnRleHQsIGJ1bmRsaW5nUmVzdWx0KTtcblxuICBjb25zdCBleGVjdXRpb25SZXN1bHQgPSBuZXcgRXhlY3V0aW9uUmVzdWx0KGJ1bmRsZXJDb250ZXh0cywgY29kZUJ1bmRsZUNhY2hlKTtcblxuICAvLyBSZXR1cm4gaWYgdGhlIGJ1bmRsaW5nIGhhcyBlcnJvcnNcbiAgaWYgKGJ1bmRsaW5nUmVzdWx0LmVycm9ycykge1xuICAgIHJldHVybiBleGVjdXRpb25SZXN1bHQ7XG4gIH1cblxuICBjb25zdCB7IG1ldGFmaWxlLCBpbml0aWFsRmlsZXMsIG91dHB1dEZpbGVzIH0gPSBidW5kbGluZ1Jlc3VsdDtcblxuICBleGVjdXRpb25SZXN1bHQub3V0cHV0RmlsZXMucHVzaCguLi5vdXRwdXRGaWxlcyk7XG5cbiAgLy8gQ2hlY2sgbWV0YWZpbGUgZm9yIENvbW1vbkpTIG1vZHVsZSB1c2FnZSBpZiBvcHRpbWl6aW5nIHNjcmlwdHNcbiAgaWYgKG9wdGltaXphdGlvbk9wdGlvbnMuc2NyaXB0cykge1xuICAgIGNvbnN0IG1lc3NhZ2VzID0gY2hlY2tDb21tb25KU01vZHVsZXMobWV0YWZpbGUsIG9wdGlvbnMuYWxsb3dlZENvbW1vbkpzRGVwZW5kZW5jaWVzKTtcbiAgICBhd2FpdCBsb2dNZXNzYWdlcyhjb250ZXh0LCB7IHdhcm5pbmdzOiBtZXNzYWdlcyB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbmRleCBIVE1MIGNvbnRlbnQgd2l0aG91dCBDU1MgaW5saW5pbmcgdG8gYmUgdXNlZCBmb3Igc2VydmVyIHJlbmRlcmluZyAoQXBwU2hlbGwsIFNTRyBhbmQgU1NSKS5cbiAgICpcbiAgICogTk9URTogd2UgZG9uJ3QgcGVyZm9ybSBjcml0aWNhbCBDU1MgaW5saW5pbmcgYXMgdGhpcyB3aWxsIGJlIGRvbmUgZHVyaW5nIHNlcnZlciByZW5kZXJpbmcuXG4gICAqL1xuICBsZXQgaW5kZXhDb250ZW50T3V0cHV0Tm9Dc3NJbmxpbmluZzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIC8vIEdlbmVyYXRlIGluZGV4IEhUTUwgZmlsZVxuICAvLyBJZiBsb2NhbGl6YXRpb24gaXMgZW5hYmxlZCwgaW5kZXggZ2VuZXJhdGlvbiBpcyBoYW5kbGVkIGluIHRoZSBpbmxpbmluZyBwcm9jZXNzLlxuICAvLyBOT1RFOiBMb2NhbGl6YXRpb24gd2l0aCBTU1IgaXMgbm90IGN1cnJlbnRseSBzdXBwb3J0ZWQuXG4gIGlmIChpbmRleEh0bWxPcHRpb25zICYmICFvcHRpb25zLmkxOG5PcHRpb25zLnNob3VsZElubGluZSkge1xuICAgIGNvbnN0IHsgY29udGVudCwgY29udGVudFdpdGhvdXRDcml0aWNhbENzc0lubGluZWQsIGVycm9ycywgd2FybmluZ3MgfSA9IGF3YWl0IGdlbmVyYXRlSW5kZXhIdG1sKFxuICAgICAgaW5pdGlhbEZpbGVzLFxuICAgICAgZXhlY3V0aW9uUmVzdWx0Lm91dHB1dEZpbGVzLFxuICAgICAge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBvcHRpbWl6YXRpb25PcHRpb25zLFxuICAgICAgfSxcbiAgICAgIC8vIFNldCBsYW5nIGF0dHJpYnV0ZSB0byB0aGUgZGVmaW5lZCBzb3VyY2UgbG9jYWxlIGlmIHByZXNlbnRcbiAgICAgIG9wdGlvbnMuaTE4bk9wdGlvbnMuaGFzRGVmaW5lZFNvdXJjZUxvY2FsZSA/IG9wdGlvbnMuaTE4bk9wdGlvbnMuc291cmNlTG9jYWxlIDogdW5kZWZpbmVkLFxuICAgICk7XG5cbiAgICBpbmRleENvbnRlbnRPdXRwdXROb0Nzc0lubGluaW5nID0gY29udGVudFdpdGhvdXRDcml0aWNhbENzc0lubGluZWQ7XG4gICAgcHJpbnRXYXJuaW5nc0FuZEVycm9yc1RvQ29uc29sZShjb250ZXh0LCB3YXJuaW5ncywgZXJyb3JzKTtcblxuICAgIGV4ZWN1dGlvblJlc3VsdC5hZGRPdXRwdXRGaWxlKGluZGV4SHRtbE9wdGlvbnMub3V0cHV0LCBjb250ZW50KTtcblxuICAgIGlmIChzc3JPcHRpb25zKSB7XG4gICAgICBleGVjdXRpb25SZXN1bHQuYWRkT3V0cHV0RmlsZSgnaW5kZXguc2VydmVyLmh0bWwnLCBjb250ZW50V2l0aG91dENyaXRpY2FsQ3NzSW5saW5lZCk7XG4gICAgfVxuICB9XG5cbiAgLy8gUHJlLXJlbmRlciAoU1NHKSBhbmQgQXBwLXNoZWxsXG4gIGlmIChwcmVyZW5kZXJPcHRpb25zIHx8IGFwcFNoZWxsT3B0aW9ucykge1xuICAgIGFzc2VydChcbiAgICAgIGluZGV4Q29udGVudE91dHB1dE5vQ3NzSW5saW5pbmcsXG4gICAgICAnVGhlIFwiaW5kZXhcIiBvcHRpb24gaXMgcmVxdWlyZWQgd2hlbiB1c2luZyB0aGUgXCJzc2dcIiBvciBcImFwcFNoZWxsXCIgb3B0aW9ucy4nLFxuICAgICk7XG5cbiAgICBjb25zdCB7IG91dHB1dCwgd2FybmluZ3MsIGVycm9ycyB9ID0gYXdhaXQgcHJlcmVuZGVyUGFnZXMoXG4gICAgICB3b3Jrc3BhY2VSb290LFxuICAgICAgYXBwU2hlbGxPcHRpb25zLFxuICAgICAgcHJlcmVuZGVyT3B0aW9ucyxcbiAgICAgIGV4ZWN1dGlvblJlc3VsdC5vdXRwdXRGaWxlcyxcbiAgICAgIGluZGV4Q29udGVudE91dHB1dE5vQ3NzSW5saW5pbmcsXG4gICAgICBvcHRpbWl6YXRpb25PcHRpb25zLnN0eWxlcy5pbmxpbmVDcml0aWNhbCxcbiAgICAgIG1heFdvcmtlcnMsXG4gICAgICB2ZXJib3NlLFxuICAgICk7XG5cbiAgICBwcmludFdhcm5pbmdzQW5kRXJyb3JzVG9Db25zb2xlKGNvbnRleHQsIHdhcm5pbmdzLCBlcnJvcnMpO1xuXG4gICAgZm9yIChjb25zdCBbcGF0aCwgY29udGVudF0gb2YgT2JqZWN0LmVudHJpZXMob3V0cHV0KSkge1xuICAgICAgZXhlY3V0aW9uUmVzdWx0LmFkZE91dHB1dEZpbGUocGF0aCwgY29udGVudCk7XG4gICAgfVxuICB9XG5cbiAgLy8gQ29weSBhc3NldHNcbiAgaWYgKGFzc2V0cykge1xuICAgIC8vIFRoZSB3ZWJwYWNrIGNvcHkgYXNzZXRzIGhlbHBlciBpcyB1c2VkIHdpdGggbm8gYmFzZSBwYXRocyBkZWZpbmVkLiBUaGlzIHByZXZlbnRzIHRoZSBoZWxwZXJcbiAgICAvLyBmcm9tIGRpcmVjdGx5IHdyaXRpbmcgdG8gZGlzay4gVGhpcyBzaG91bGQgZXZlbnR1YWxseSBiZSByZXBsYWNlZCB3aXRoIGEgbW9yZSBvcHRpbWl6ZWQgaGVscGVyLlxuICAgIGV4ZWN1dGlvblJlc3VsdC5hc3NldEZpbGVzLnB1c2goLi4uKGF3YWl0IGNvcHlBc3NldHMoYXNzZXRzLCBbXSwgd29ya3NwYWNlUm9vdCkpKTtcbiAgfVxuXG4gIC8vIFdyaXRlIG1ldGFmaWxlIGlmIHN0YXRzIG9wdGlvbiBpcyBlbmFibGVkXG4gIGlmIChvcHRpb25zLnN0YXRzKSB7XG4gICAgZXhlY3V0aW9uUmVzdWx0LmFkZE91dHB1dEZpbGUoJ3N0YXRzLmpzb24nLCBKU09OLnN0cmluZ2lmeShtZXRhZmlsZSwgbnVsbCwgMikpO1xuICB9XG5cbiAgLy8gRXh0cmFjdCBhbmQgd3JpdGUgbGljZW5zZXMgZm9yIHVzZWQgcGFja2FnZXNcbiAgaWYgKG9wdGlvbnMuZXh0cmFjdExpY2Vuc2VzKSB7XG4gICAgZXhlY3V0aW9uUmVzdWx0LmFkZE91dHB1dEZpbGUoXG4gICAgICAnM3JkcGFydHlsaWNlbnNlcy50eHQnLFxuICAgICAgYXdhaXQgZXh0cmFjdExpY2Vuc2VzKG1ldGFmaWxlLCB3b3Jrc3BhY2VSb290KSxcbiAgICApO1xuICB9XG5cbiAgLy8gQXVnbWVudCB0aGUgYXBwbGljYXRpb24gd2l0aCBzZXJ2aWNlIHdvcmtlciBzdXBwb3J0XG4gIGlmIChzZXJ2aWNlV29ya2VyKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHNlcnZpY2VXb3JrZXJSZXN1bHQgPSBhd2FpdCBhdWdtZW50QXBwV2l0aFNlcnZpY2VXb3JrZXJFc2J1aWxkKFxuICAgICAgICB3b3Jrc3BhY2VSb290LFxuICAgICAgICBzZXJ2aWNlV29ya2VyLFxuICAgICAgICBvcHRpb25zLmJhc2VIcmVmIHx8ICcvJyxcbiAgICAgICAgZXhlY3V0aW9uUmVzdWx0Lm91dHB1dEZpbGVzLFxuICAgICAgICBleGVjdXRpb25SZXN1bHQuYXNzZXRGaWxlcyxcbiAgICAgICk7XG4gICAgICBleGVjdXRpb25SZXN1bHQuYWRkT3V0cHV0RmlsZSgnbmdzdy5qc29uJywgc2VydmljZVdvcmtlclJlc3VsdC5tYW5pZmVzdCk7XG4gICAgICBleGVjdXRpb25SZXN1bHQuYXNzZXRGaWxlcy5wdXNoKC4uLnNlcnZpY2VXb3JrZXJSZXN1bHQuYXNzZXRGaWxlcyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnRleHQubG9nZ2VyLmVycm9yKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogYCR7ZXJyb3J9YCk7XG5cbiAgICAgIHJldHVybiBleGVjdXRpb25SZXN1bHQ7XG4gICAgfVxuICB9XG5cbiAgLy8gQ2FsY3VsYXRlIGVzdGltYXRlZCB0cmFuc2ZlciBzaXplIGlmIHNjcmlwdHMgYXJlIG9wdGltaXplZFxuICBsZXQgZXN0aW1hdGVkVHJhbnNmZXJTaXplcztcbiAgaWYgKG9wdGltaXphdGlvbk9wdGlvbnMuc2NyaXB0cyB8fCBvcHRpbWl6YXRpb25PcHRpb25zLnN0eWxlcy5taW5pZnkpIHtcbiAgICBlc3RpbWF0ZWRUcmFuc2ZlclNpemVzID0gYXdhaXQgY2FsY3VsYXRlRXN0aW1hdGVkVHJhbnNmZXJTaXplcyhleGVjdXRpb25SZXN1bHQub3V0cHV0RmlsZXMpO1xuICB9XG5cbiAgbG9nQnVpbGRTdGF0cyhjb250ZXh0LCBtZXRhZmlsZSwgaW5pdGlhbEZpbGVzLCBlc3RpbWF0ZWRUcmFuc2ZlclNpemVzKTtcblxuICBjb25zdCBidWlsZFRpbWUgPSBOdW1iZXIocHJvY2Vzcy5ocnRpbWUuYmlnaW50KCkgLSBzdGFydFRpbWUpIC8gMTAgKiogOTtcbiAgY29udGV4dC5sb2dnZXIuaW5mbyhgQXBwbGljYXRpb24gYnVuZGxlIGdlbmVyYXRpb24gY29tcGxldGUuIFske2J1aWxkVGltZS50b0ZpeGVkKDMpfSBzZWNvbmRzXWApO1xuXG4gIC8vIFBlcmZvcm0gaTE4biB0cmFuc2xhdGlvbiBpbmxpbmluZyBpZiBlbmFibGVkXG4gIGlmIChvcHRpb25zLmkxOG5PcHRpb25zLnNob3VsZElubGluZSkge1xuICAgIGF3YWl0IGlubGluZUkxOG4ob3B0aW9ucywgZXhlY3V0aW9uUmVzdWx0LCBpbml0aWFsRmlsZXMpO1xuICB9XG5cbiAgcmV0dXJuIGV4ZWN1dGlvblJlc3VsdDtcbn1cblxuZnVuY3Rpb24gcHJpbnRXYXJuaW5nc0FuZEVycm9yc1RvQ29uc29sZShcbiAgY29udGV4dDogQnVpbGRlckNvbnRleHQsXG4gIHdhcm5pbmdzOiBzdHJpbmdbXSxcbiAgZXJyb3JzOiBzdHJpbmdbXSxcbik6IHZvaWQge1xuICBmb3IgKGNvbnN0IGVycm9yIG9mIGVycm9ycykge1xuICAgIGNvbnRleHQubG9nZ2VyLmVycm9yKGVycm9yKTtcbiAgfVxuICBmb3IgKGNvbnN0IHdhcm5pbmcgb2Ygd2FybmluZ3MpIHtcbiAgICBjb250ZXh0LmxvZ2dlci53YXJuKHdhcm5pbmcpO1xuICB9XG59XG4iXX0=