"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryLoadResultCache = exports.createCachedLoad = void 0;
const node_path_1 = require("node:path");
function createCachedLoad(cache, callback) {
    if (cache === undefined) {
        return callback;
    }
    return async (args) => {
        const loadCacheKey = `${args.namespace}:${args.path}`;
        let result = cache.get(loadCacheKey);
        if (result === undefined) {
            result = await callback(args);
            // Do not cache null or undefined or results with errors
            if (result && result.errors === undefined) {
                await cache.put(loadCacheKey, result);
            }
        }
        return result;
    };
}
exports.createCachedLoad = createCachedLoad;
class MemoryLoadResultCache {
    #loadResults = new Map();
    #fileDependencies = new Map();
    get(path) {
        return this.#loadResults.get(path);
    }
    async put(path, result) {
        this.#loadResults.set(path, result);
        if (result.watchFiles) {
            for (const watchFile of result.watchFiles) {
                // Normalize the watch file path to ensure OS consistent paths
                const normalizedWatchFile = (0, node_path_1.normalize)(watchFile);
                let affected = this.#fileDependencies.get(normalizedWatchFile);
                if (affected === undefined) {
                    affected = new Set();
                    this.#fileDependencies.set(normalizedWatchFile, affected);
                }
                affected.add(path);
            }
        }
    }
    invalidate(path) {
        const affected = this.#fileDependencies.get(path);
        let found = false;
        if (affected) {
            affected.forEach((a) => (found ||= this.#loadResults.delete(a)));
            this.#fileDependencies.delete(path);
        }
        found ||= this.#loadResults.delete(path);
        return found;
    }
    get watchFiles() {
        return [...this.#loadResults.keys(), ...this.#fileDependencies.keys()];
    }
}
exports.MemoryLoadResultCache = MemoryLoadResultCache;
