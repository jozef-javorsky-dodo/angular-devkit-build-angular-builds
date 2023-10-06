"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const node_worker_threads_1 = require("node:worker_threads");
const load_esm_1 = require("../load-esm");
/**
 * This is passed as workerData when setting up the worker via the `piscina` package.
 */
const { document, verbose } = node_worker_threads_1.workerData;
async function default_1() {
    const { default: bootstrapAppFnOrModule, extractRoutes } = await (0, load_esm_1.loadEsmModule)('./main.server.mjs');
    const skippedRedirects = [];
    const skippedOthers = [];
    const routes = [];
    for await (const { route, success, redirect } of extractRoutes(bootstrapAppFnOrModule, document)) {
        if (success) {
            routes.push(route);
            continue;
        }
        if (redirect) {
            skippedRedirects.push(route);
        }
        else {
            skippedOthers.push(route);
        }
    }
    if (!verbose) {
        return { routes };
    }
    let warnings;
    if (skippedOthers.length) {
        (warnings ??= []).push('The following routes were skipped from prerendering because they contain routes with dynamic parameters:\n' +
            skippedOthers.join('\n'));
    }
    if (skippedRedirects.length) {
        (warnings ??= []).push('The following routes were skipped from prerendering because they contain redirects:\n', skippedRedirects.join('\n'));
    }
    return { routes, warnings };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVzLWV4dHJhY3Rvci13b3JrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF9hbmd1bGFyL3NyYy91dGlscy9zZXJ2ZXItcmVuZGVyaW5nL3JvdXRlcy1leHRyYWN0b3Itd29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsNkRBQWlEO0FBQ2pELDBDQUE0QztBQWM1Qzs7R0FFRztBQUNILE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEdBQUcsZ0NBQXVDLENBQUM7QUFFdkQsS0FBSztJQUNsQixNQUFNLEVBQUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGFBQWEsRUFBRSxHQUN0RCxNQUFNLElBQUEsd0JBQWEsRUFBMEIsbUJBQW1CLENBQUMsQ0FBQztJQUVwRSxNQUFNLGdCQUFnQixHQUFhLEVBQUUsQ0FBQztJQUN0QyxNQUFNLGFBQWEsR0FBYSxFQUFFLENBQUM7SUFDbkMsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO0lBRTVCLElBQUksS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLGFBQWEsQ0FDNUQsc0JBQXNCLEVBQ3RCLFFBQVEsQ0FDVCxFQUFFO1FBQ0QsSUFBSSxPQUFPLEVBQUU7WUFDWCxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25CLFNBQVM7U0FDVjtRQUVELElBQUksUUFBUSxFQUFFO1lBQ1osZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQzlCO2FBQU07WUFDTCxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQzNCO0tBQ0Y7SUFFRCxJQUFJLENBQUMsT0FBTyxFQUFFO1FBQ1osT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDO0tBQ25CO0lBRUQsSUFBSSxRQUE4QixDQUFDO0lBQ25DLElBQUksYUFBYSxDQUFDLE1BQU0sRUFBRTtRQUN4QixDQUFDLFFBQVEsS0FBSyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQ3BCLDRHQUE0RztZQUMxRyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUMzQixDQUFDO0tBQ0g7SUFFRCxJQUFJLGdCQUFnQixDQUFDLE1BQU0sRUFBRTtRQUMzQixDQUFDLFFBQVEsS0FBSyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQ3BCLHVGQUF1RixFQUN2RixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQzVCLENBQUM7S0FDSDtJQUVELE9BQU8sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUM7QUFDOUIsQ0FBQztBQTVDRCw0QkE0Q0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgd29ya2VyRGF0YSB9IGZyb20gJ25vZGU6d29ya2VyX3RocmVhZHMnO1xuaW1wb3J0IHsgbG9hZEVzbU1vZHVsZSB9IGZyb20gJy4uL2xvYWQtZXNtJztcbmltcG9ydCB0eXBlIHsgRVNNSW5NZW1vcnlGaWxlTG9hZGVyV29ya2VyRGF0YSB9IGZyb20gJy4vZXNtLWluLW1lbW9yeS1maWxlLWxvYWRlcic7XG5pbXBvcnQgeyBNYWluU2VydmVyQnVuZGxlRXhwb3J0cyB9IGZyb20gJy4vbWFpbi1idW5kbGUtZXhwb3J0cyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUm91dGVzRXh0cmFjdG9yV29ya2VyRGF0YSBleHRlbmRzIEVTTUluTWVtb3J5RmlsZUxvYWRlcldvcmtlckRhdGEge1xuICBkb2N1bWVudDogc3RyaW5nO1xuICB2ZXJib3NlOiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJvdXRlcnNFeHRyYWN0b3JXb3JrZXJSZXN1bHQge1xuICByb3V0ZXM6IHN0cmluZ1tdO1xuICB3YXJuaW5ncz86IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIFRoaXMgaXMgcGFzc2VkIGFzIHdvcmtlckRhdGEgd2hlbiBzZXR0aW5nIHVwIHRoZSB3b3JrZXIgdmlhIHRoZSBgcGlzY2luYWAgcGFja2FnZS5cbiAqL1xuY29uc3QgeyBkb2N1bWVudCwgdmVyYm9zZSB9ID0gd29ya2VyRGF0YSBhcyBSb3V0ZXNFeHRyYWN0b3JXb3JrZXJEYXRhO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiAoKTogUHJvbWlzZTxSb3V0ZXJzRXh0cmFjdG9yV29ya2VyUmVzdWx0PiB7XG4gIGNvbnN0IHsgZGVmYXVsdDogYm9vdHN0cmFwQXBwRm5Pck1vZHVsZSwgZXh0cmFjdFJvdXRlcyB9ID1cbiAgICBhd2FpdCBsb2FkRXNtTW9kdWxlPE1haW5TZXJ2ZXJCdW5kbGVFeHBvcnRzPignLi9tYWluLnNlcnZlci5tanMnKTtcblxuICBjb25zdCBza2lwcGVkUmVkaXJlY3RzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBza2lwcGVkT3RoZXJzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCByb3V0ZXM6IHN0cmluZ1tdID0gW107XG5cbiAgZm9yIGF3YWl0IChjb25zdCB7IHJvdXRlLCBzdWNjZXNzLCByZWRpcmVjdCB9IG9mIGV4dHJhY3RSb3V0ZXMoXG4gICAgYm9vdHN0cmFwQXBwRm5Pck1vZHVsZSxcbiAgICBkb2N1bWVudCxcbiAgKSkge1xuICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICByb3V0ZXMucHVzaChyb3V0ZSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAocmVkaXJlY3QpIHtcbiAgICAgIHNraXBwZWRSZWRpcmVjdHMucHVzaChyb3V0ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNraXBwZWRPdGhlcnMucHVzaChyb3V0ZSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCF2ZXJib3NlKSB7XG4gICAgcmV0dXJuIHsgcm91dGVzIH07XG4gIH1cblxuICBsZXQgd2FybmluZ3M6IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xuICBpZiAoc2tpcHBlZE90aGVycy5sZW5ndGgpIHtcbiAgICAod2FybmluZ3MgPz89IFtdKS5wdXNoKFxuICAgICAgJ1RoZSBmb2xsb3dpbmcgcm91dGVzIHdlcmUgc2tpcHBlZCBmcm9tIHByZXJlbmRlcmluZyBiZWNhdXNlIHRoZXkgY29udGFpbiByb3V0ZXMgd2l0aCBkeW5hbWljIHBhcmFtZXRlcnM6XFxuJyArXG4gICAgICAgIHNraXBwZWRPdGhlcnMuam9pbignXFxuJyksXG4gICAgKTtcbiAgfVxuXG4gIGlmIChza2lwcGVkUmVkaXJlY3RzLmxlbmd0aCkge1xuICAgICh3YXJuaW5ncyA/Pz0gW10pLnB1c2goXG4gICAgICAnVGhlIGZvbGxvd2luZyByb3V0ZXMgd2VyZSBza2lwcGVkIGZyb20gcHJlcmVuZGVyaW5nIGJlY2F1c2UgdGhleSBjb250YWluIHJlZGlyZWN0czpcXG4nLFxuICAgICAgc2tpcHBlZFJlZGlyZWN0cy5qb2luKCdcXG4nKSxcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIHsgcm91dGVzLCB3YXJuaW5ncyB9O1xufVxuIl19