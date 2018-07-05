"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@angular-devkit/architect/testing");
const core_1 = require("@angular-devkit/core");
const devkitRoot = core_1.normalize(global._DevKitRoot); // tslint:disable-line:no-any
const workspaceRoot = core_1.join(devkitRoot, 'tests/@angular_devkit/build_angular/hello-world-app/');
exports.host = new testing_1.TestProjectHost(workspaceRoot);
exports.outputPath = core_1.normalize('dist');
exports.browserTargetSpec = { project: 'app', target: 'build' };
exports.devServerTargetSpec = { project: 'app', target: 'serve' };
exports.extractI18nTargetSpec = { project: 'app', target: 'extract-i18n' };
exports.karmaTargetSpec = { project: 'app', target: 'test' };
exports.tslintTargetSpec = { project: 'app', target: 'lint' };
exports.protractorTargetSpec = { project: 'app-e2e', target: 'e2e' };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX2FuZ3VsYXIvdGVzdC91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUVILCtEQUFvRTtBQUNwRSwrQ0FBdUQ7QUFHdkQsTUFBTSxVQUFVLEdBQUcsZ0JBQVMsQ0FBRSxNQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyw2QkFBNkI7QUFDeEYsTUFBTSxhQUFhLEdBQUcsV0FBSSxDQUFDLFVBQVUsRUFBRSxzREFBc0QsQ0FBQyxDQUFDO0FBQ2xGLFFBQUEsSUFBSSxHQUFHLElBQUkseUJBQWUsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUMxQyxRQUFBLFVBQVUsR0FBRyxnQkFBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRS9CLFFBQUEsaUJBQWlCLEdBQUcsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQztBQUN4RCxRQUFBLG1CQUFtQixHQUFHLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUM7QUFDMUQsUUFBQSxxQkFBcUIsR0FBRyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxDQUFDO0FBQ25FLFFBQUEsZUFBZSxHQUFHLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLENBQUM7QUFDckQsUUFBQSxnQkFBZ0IsR0FBRyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDO0FBQ3RELFFBQUEsb0JBQW9CLEdBQUcsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgVGVzdFByb2plY3RIb3N0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdC90ZXN0aW5nJztcbmltcG9ydCB7IGpvaW4sIG5vcm1hbGl6ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcblxuXG5jb25zdCBkZXZraXRSb290ID0gbm9ybWFsaXplKChnbG9iYWwgYXMgYW55KS5fRGV2S2l0Um9vdCk7IC8vIHRzbGludDpkaXNhYmxlLWxpbmU6bm8tYW55XG5jb25zdCB3b3Jrc3BhY2VSb290ID0gam9pbihkZXZraXRSb290LCAndGVzdHMvQGFuZ3VsYXJfZGV2a2l0L2J1aWxkX2FuZ3VsYXIvaGVsbG8td29ybGQtYXBwLycpO1xuZXhwb3J0IGNvbnN0IGhvc3QgPSBuZXcgVGVzdFByb2plY3RIb3N0KHdvcmtzcGFjZVJvb3QpO1xuZXhwb3J0IGNvbnN0IG91dHB1dFBhdGggPSBub3JtYWxpemUoJ2Rpc3QnKTtcblxuZXhwb3J0IGNvbnN0IGJyb3dzZXJUYXJnZXRTcGVjID0geyBwcm9qZWN0OiAnYXBwJywgdGFyZ2V0OiAnYnVpbGQnIH07XG5leHBvcnQgY29uc3QgZGV2U2VydmVyVGFyZ2V0U3BlYyA9IHsgcHJvamVjdDogJ2FwcCcsIHRhcmdldDogJ3NlcnZlJyB9O1xuZXhwb3J0IGNvbnN0IGV4dHJhY3RJMThuVGFyZ2V0U3BlYyA9IHsgcHJvamVjdDogJ2FwcCcsIHRhcmdldDogJ2V4dHJhY3QtaTE4bicgfTtcbmV4cG9ydCBjb25zdCBrYXJtYVRhcmdldFNwZWMgPSB7IHByb2plY3Q6ICdhcHAnLCB0YXJnZXQ6ICd0ZXN0JyB9O1xuZXhwb3J0IGNvbnN0IHRzbGludFRhcmdldFNwZWMgPSB7IHByb2plY3Q6ICdhcHAnLCB0YXJnZXQ6ICdsaW50JyB9O1xuZXhwb3J0IGNvbnN0IHByb3RyYWN0b3JUYXJnZXRTcGVjID0geyBwcm9qZWN0OiAnYXBwLWUyZScsIHRhcmdldDogJ2UyZScgfTtcbiJdfQ==