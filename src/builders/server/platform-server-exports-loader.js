"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * This loader is needed to add additional exports and is a workaround for a Webpack bug that doesn't
 * allow exports from multiple files in the same entry.
 * @see https://github.com/webpack/webpack/issues/15936.
 */
function default_1(content, map) {
    const source = `${content}

  // EXPORTS added by @angular-devkit/build-angular
  export { renderModule, ɵSERVER_CONTEXT } from '@angular/platform-server';
  `;
    this.callback(null, source, map);
    return;
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhdGZvcm0tc2VydmVyLWV4cG9ydHMtbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhcl9kZXZraXQvYnVpbGRfYW5ndWxhci9zcmMvYnVpbGRlcnMvc2VydmVyL3BsYXRmb3JtLXNlcnZlci1leHBvcnRzLWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUVIOzs7O0dBSUc7QUFDSCxtQkFFRSxPQUFlLEVBQ2YsR0FBOEQ7SUFFOUQsTUFBTSxNQUFNLEdBQUcsR0FBRyxPQUFPOzs7O0dBSXhCLENBQUM7SUFFRixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFFakMsT0FBTztBQUNULENBQUM7QUFkRCw0QkFjQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vKipcbiAqIFRoaXMgbG9hZGVyIGlzIG5lZWRlZCB0byBhZGQgYWRkaXRpb25hbCBleHBvcnRzIGFuZCBpcyBhIHdvcmthcm91bmQgZm9yIGEgV2VicGFjayBidWcgdGhhdCBkb2Vzbid0XG4gKiBhbGxvdyBleHBvcnRzIGZyb20gbXVsdGlwbGUgZmlsZXMgaW4gdGhlIHNhbWUgZW50cnkuXG4gKiBAc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJwYWNrL3dlYnBhY2svaXNzdWVzLzE1OTM2LlxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoXG4gIHRoaXM6IGltcG9ydCgnd2VicGFjaycpLkxvYWRlckNvbnRleHQ8e30+LFxuICBjb250ZW50OiBzdHJpbmcsXG4gIG1hcDogUGFyYW1ldGVyczxpbXBvcnQoJ3dlYnBhY2snKS5Mb2FkZXJEZWZpbml0aW9uRnVuY3Rpb24+WzFdLFxuKSB7XG4gIGNvbnN0IHNvdXJjZSA9IGAke2NvbnRlbnR9XG5cbiAgLy8gRVhQT1JUUyBhZGRlZCBieSBAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhclxuICBleHBvcnQgeyByZW5kZXJNb2R1bGUsIMm1U0VSVkVSX0NPTlRFWFQgfSBmcm9tICdAYW5ndWxhci9wbGF0Zm9ybS1zZXJ2ZXInO1xuICBgO1xuXG4gIHRoaXMuY2FsbGJhY2sobnVsbCwgc291cmNlLCBtYXApO1xuXG4gIHJldHVybjtcbn1cbiJdfQ==