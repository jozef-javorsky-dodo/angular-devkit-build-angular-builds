"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGQtb3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhcl9kZXZraXQvYnVpbGRfYW5ndWxhci9zcmMvYW5ndWxhci1jbGktZmlsZXMvbW9kZWxzL2J1aWxkLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8gVE9ETzogY2xlYW51cCB0aGlzIGZpbGUsIGl0J3MgY29waWVkIGFzIGlzIGZyb20gQW5ndWxhciBDTEkuXG5cbi8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1pbXBsaWNpdC1kZXBlbmRlbmNpZXNcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHsgQXNzZXRQYXR0ZXJuT2JqZWN0LCBCdWRnZXQsIEV4dHJhRW50cnlQb2ludCB9IGZyb20gJy4uLy4uL2Jyb3dzZXIvc2NoZW1hJztcblxuZXhwb3J0IGludGVyZmFjZSBCdWlsZE9wdGlvbnMge1xuICBvcHRpbWl6YXRpb246IGJvb2xlYW47XG4gIGVudmlyb25tZW50Pzogc3RyaW5nO1xuICBvdXRwdXRQYXRoOiBzdHJpbmc7XG4gIGFvdD86IGJvb2xlYW47XG4gIHNvdXJjZU1hcD86IGJvb2xlYW47XG4gIGV2YWxTb3VyY2VNYXA/OiBib29sZWFuO1xuICB2ZW5kb3JDaHVuaz86IGJvb2xlYW47XG4gIGNvbW1vbkNodW5rPzogYm9vbGVhbjtcbiAgYmFzZUhyZWY/OiBzdHJpbmc7XG4gIGRlcGxveVVybD86IHN0cmluZztcbiAgdmVyYm9zZT86IGJvb2xlYW47XG4gIHByb2dyZXNzPzogYm9vbGVhbjtcbiAgaTE4bkZpbGU/OiBzdHJpbmc7XG4gIGkxOG5Gb3JtYXQ/OiBzdHJpbmc7XG4gIGkxOG5Mb2NhbGU/OiBzdHJpbmc7XG4gIGkxOG5NaXNzaW5nVHJhbnNsYXRpb24/OiBzdHJpbmc7XG4gIGV4dHJhY3RDc3M/OiBib29sZWFuO1xuICBidW5kbGVEZXBlbmRlbmNpZXM/OiAnbm9uZScgfCAnYWxsJztcbiAgd2F0Y2g/OiBib29sZWFuO1xuICBvdXRwdXRIYXNoaW5nPzogc3RyaW5nO1xuICBwb2xsPzogbnVtYmVyO1xuICBhcHA/OiBzdHJpbmc7XG4gIGRlbGV0ZU91dHB1dFBhdGg/OiBib29sZWFuO1xuICBwcmVzZXJ2ZVN5bWxpbmtzPzogYm9vbGVhbjtcbiAgZXh0cmFjdExpY2Vuc2VzPzogYm9vbGVhbjtcbiAgc2hvd0NpcmN1bGFyRGVwZW5kZW5jaWVzPzogYm9vbGVhbjtcbiAgYnVpbGRPcHRpbWl6ZXI/OiBib29sZWFuO1xuICBuYW1lZENodW5rcz86IGJvb2xlYW47XG4gIHN1YnJlc291cmNlSW50ZWdyaXR5PzogYm9vbGVhbjtcbiAgc2VydmljZVdvcmtlcj86IGJvb2xlYW47XG4gIHNraXBBcHBTaGVsbD86IGJvb2xlYW47XG4gIHN0YXRzSnNvbjogYm9vbGVhbjtcbiAgZm9ya1R5cGVDaGVja2VyOiBib29sZWFuO1xuXG4gIG1haW46IHN0cmluZztcbiAgaW5kZXg6IHN0cmluZztcbiAgcG9seWZpbGxzPzogc3RyaW5nO1xuICBidWRnZXRzOiBCdWRnZXRbXTtcbiAgYXNzZXRzOiBBc3NldFBhdHRlcm5PYmplY3RbXTtcbiAgc2NyaXB0czogRXh0cmFFbnRyeVBvaW50W107XG4gIHN0eWxlczogRXh0cmFFbnRyeVBvaW50W107XG4gIHN0eWxlUHJlcHJvY2Vzc29yT3B0aW9ucz86IHsgaW5jbHVkZVBhdGhzOiBzdHJpbmdbXSB9O1xuICBsYXp5TW9kdWxlczogc3RyaW5nW107XG4gIHBsYXRmb3JtPzogJ2Jyb3dzZXInIHwgJ3NlcnZlcic7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2VicGFja1Rlc3RPcHRpb25zIGV4dGVuZHMgQnVpbGRPcHRpb25zIHtcbiAgY29kZUNvdmVyYWdlPzogYm9vbGVhbjtcbiAgY29kZUNvdmVyYWdlRXhjbHVkZT86IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdlYnBhY2tDb25maWdPcHRpb25zPFQgPSBCdWlsZE9wdGlvbnM+IHtcbiAgcm9vdDogc3RyaW5nO1xuICBwcm9qZWN0Um9vdDogc3RyaW5nO1xuICBidWlsZE9wdGlvbnM6IFQ7XG4gIHRzQ29uZmlnOiB0cy5QYXJzZWRDb21tYW5kTGluZTtcbiAgdHNDb25maWdQYXRoOiBzdHJpbmc7XG4gIHN1cHBvcnRFUzIwMTU6IGJvb2xlYW47XG59XG4iXX0=