"no use strict";

import util from 'quark/util';
import * as lang from "./lib/lang";
import {AppConfig} from "./lib/app_config";
import type { SyntaxMode } from "./mode";

export interface ConfigOptions {
	packaged: boolean,
	workerPath: string | null,
	modePath: string | null,
	themePath: string | null,
	basePath: string,
	suffix: string,
	$moduleUrls: { [url: string]: string },
	loadWorkerFromBlob: boolean,
	sharedPopups: boolean,
	useStrictCSP: boolean | null
}

var options: ConfigOptions = {
	packaged: false,
	workerPath: null as string | null,
	modePath: null as string | null,
	themePath: null as string | null,
	basePath: "",
	suffix: ".js",
	$moduleUrls: {} as { [url: string]: string },
	loadWorkerFromBlob: true,
	sharedPopups: false,
	useStrictCSP: null as boolean | null
};

var loader = function(moduleName: string, cb: (error: any, module: any) => void) {
	if (moduleName === "ace/theme/textmate" || moduleName === "./theme/textmate")
		return cb(null, require("./theme/textmate"));
	if (customLoader)
		return customLoader(moduleName, cb);
	console.error("loader is not configured");
};
var customLoader: ((name: string, callback: (error: any, module: any) => void) => void) | null = null;

var reportErrorIfPathIsNotConfigured = function() {
	if (
		!options.basePath && !options.workerPath
		&& !options.modePath && !options.themePath
		&& !Object.keys(options.$moduleUrls).length
	) {
		console.error(
			"Unable to infer path to ace from script src,",
			"use ace.config.set('basePath', 'path') to enable dynamic loading of modes and themes",
			"or with webpack use ace/webpack-resolver"
		);
		reportErrorIfPathIsNotConfigured = function() {};
	}
};

export class Config extends AppConfig {
	/**
	 * @template {keyof ConfigOptions} K
	 * @param {K} key - The key of the config option to retrieve.
	 * @returns {ConfigOptions[K]} - The value of the config option.
	 */
	get<K extends keyof ConfigOptions>(key: K): ConfigOptions[K] {
		if (!options.hasOwnProperty(key))
			throw new Error("Unknown config key: " + key);
		return options[key];
	};

	/**
	 * @template {keyof ConfigOptions} K
	 * @param {K} key
	 * @param {ConfigOptions[K]} value
	 */
	set<K extends keyof ConfigOptions>(key: K, value: ConfigOptions[K]) {
		if (options.hasOwnProperty(key))
			options[key] = value;
		else if (this.setDefaultValue("", key, value) == false)
			throw new Error("Unknown config key: " + key);
		// if (key == "useStrictCSP")
		// 	dom.useStrictCSP(value);
	};

	/**
	 * @return {ConfigOptions}
	 */
	all() {
		return lang.copyObject(options);
	};

	public $modes: { [key: string]: SyntaxMode } = {};

	/**
	 * module loading
	 * @param {string} name
	 * @param {string} [component]
	 * @returns {string}
	 */
	moduleUrl(name: string, component?: string): string {
		if (options.$moduleUrls[name])
			return options.$moduleUrls[name];

		var parts = name.split("/");
		component = component || parts[parts.length - 2] || "";

		// todo make this configurable or get rid of '-'
		var sep = component == "snippets" ? "/" : "-";
		var base = parts[parts.length - 1];
		if (component == "worker" && sep == "-") {
			var re = new RegExp("^" + component + "[\\-_]|[\\-_]" + component + "$", "g");
			base = base.replace(re, "");
		}

		if ((!base || base == component) && parts.length > 1)
			base = parts[parts.length - 2];
		var path = (options as any)[component + "Path"];
		if (path == null) {
			path = options.basePath;
		} else if (sep == "/") {
			component = sep = "";
		}
		if (path && path.slice(-1) != "/")
			path += "/";
		return path + component + sep + base + this.get("suffix");
	};

	/**
	 * @param {string} name
	 * @param {string} subst
	 * @returns {string}
	 */
	setModuleUrl(name: string, subst: string) {
		return options.$moduleUrls[name] = subst;
	};

	setLoader(cb: (name: string, callback: (error: any, module: any) => void) => void) {
		customLoader = cb;
	};

	public dynamicModules: Dict<() => Promise<any>> = {};
	private $loading: Dict<((module: any) => void)[] | null> = {};
	private $loaded: Dict = {};

	/**
	 * @param {string | [string, string]} moduleId
	 * @param {(module: any) => void} onLoad
	 */
	loadModule(moduleId: string | [string, string], onLoad: (module: any) => void) {
		var loadedModule;
		var moduleType;
		var moduleName: string = '';
		if (Array.isArray(moduleId)) {
			moduleType = moduleId[0];
			moduleName = moduleId[1];
		} else if (typeof moduleId == "string") {
			moduleName = moduleId;
		}
		const self = this;
		var load = (module: any) => {
			// require(moduleName) can return empty object if called after require([moduleName], callback)
			if (module && !this.$loading[moduleName])
				return onLoad && onLoad(module);

			if (!this.$loading[moduleName])
				this.$loading[moduleName] = [];
			this.$loading[moduleName]!.push(onLoad);

			if (this.$loading[moduleName]!.length > 1) return;

			var afterLoad = function() {
				loader(moduleName, (err, module) => {
					if (module) self.$loaded[moduleName] = module;
					self._emit("load.module", {name: moduleName, module: module});
					var listeners = self.$loading[moduleName]!;
					self.$loading[moduleName] = null;
					listeners.forEach(function(onLoad: (module: any) => void) {
						onLoad && onLoad(module);
					});
				});
			};

			if (!this.get("packaged")) return afterLoad();
			// net.loadScript(this.moduleUrl(moduleName, moduleType), afterLoad);
			reportErrorIfPathIsNotConfigured();
		};

		if (this.dynamicModules[moduleName]) {
			this.dynamicModules[moduleName]().then((module) => {
				if (module.default) {
					load(module.default);
				}
				else {
					load(module);
				}
			});
		} else {
			// backwards compatibility for node and packaged version
			let name = moduleName;
			if (name.substring(0, 4) == "ace/") {
				name = './' + moduleName.substring(4); // remove 'ace/' prefix
			}
			try {
				loadedModule = this.$require(name);
			} catch (e) {}
			load(loadedModule || this.$loaded[moduleName]);
		}
	};

	private $require(moduleName: string) {
		if (typeof module["require"] == "function") {
			var req = "require";
			return (module as any)[req](moduleName);
		}
	};

	setModuleLoader(moduleName: string, onLoad: () => Promise<any>) {
		this.dynamicModules[moduleName] = onLoad;
	};

	version = "1.43.5";
}

const Default = new Config();

export const nls = Default.nls.bind(Default);

module.exports = exports = Default;
export default Default;