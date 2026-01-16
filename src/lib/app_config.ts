"no use strict";

import {EventEmitter} from "./event_emitter";
import {reportError} from "./report_error";
import defaultEnglishMessages from "./default_english_messages";

export interface OptionsProvider<T> {
	setOptions(optList: Partial<T>): void;

	getOptions(optionNames?: Array<keyof T> | Partial<T>): Partial<T>;

	setOption<K extends keyof T>(name: K, value: T[K]): void;

	getOption<K extends keyof T>(name: K): T[K];
}

const optionsProvider: OptionsProvider<any> = {
	setOptions(optList: {[key: string]: any}) {
		Object.keys(optList).forEach((key)=>{
			this.setOption(key, optList[key]);
		}, this);
	},
	getOptions(optionNames: string[] | Dict) {
		var result: Dict = {};
		if (!optionNames) {
			var options = (this as any).$options;
			optionNames = Object.keys(options).filter(function(key) {
				return !options[key].hidden;
			});
		} else if (!Array.isArray(optionNames)) {
			optionNames = Object.keys(optionNames);
		}
		(optionNames as string[]).forEach((key) => {
			result[key] = this.getOption(key);
		});
		return result;
	},
	setOption<K extends keyof any>(name: any, value: any) {
		const self = this as any;
		if (self["$" + name] === value)
			return;
		var opt = self.$options[name];
		if (!opt) {
			return warn('misspelled option "' + name + '"');
		}
		if (opt.forwardTo)
			return self[opt.forwardTo] && self[opt.forwardTo].setOption(name, value);

		if (!opt.handlesSet)
			(this as any)["$" + name] = value;
		if (opt && opt.set)
			opt.set.call(this, value);
	},
	getOption<K extends keyof any>(name: any): any {
		const self = this as any;
		var opt = self.$options[name];
		if (!opt) {
			return warn('misspelled option "' + name + '"');
		}
		if (opt.forwardTo)
			return self[opt.forwardTo] && self[opt.forwardTo].getOption(name);
		return opt && opt.get ? opt.get.call(this) : self["$" + name];
	}
};

function warn(...message: any[]) {
	if (typeof console != "undefined" && console.warn)
		console.warn(...message);
}

var messages: {[key: string]: string};
var nlsPlaceholders: "dollarSigns" | "curlyBrackets";

export class AppConfig extends EventEmitter {
	private $defaultOptions: Dict = {};
	constructor() {
		super();
		messages = defaultEnglishMessages;
		nlsPlaceholders = "dollarSigns";
	}

	/**
	 * @param {Object} obj
	 * @param {string} path
	 * @param {{ [key: string]: any }} options
	 * @returns {this}
	 */
	defineOptions(obj: any, path: string, options: Dict) {
		if (!obj.$options)
			this.$defaultOptions[path] = obj.$options = {};

		Object.keys(options).forEach(function(key) {
			var opt = options[key];
			if (typeof opt == "string")
				opt = {forwardTo: opt};

			opt.name || (opt.name = key);
			obj.$options[opt.name] = opt;
			if ("initialValue" in opt)
				obj["$" + opt.name] = opt.initialValue;
		});

		// implement option provider interface
		Object.assign(obj, optionsProvider);

		return this;
	}

	/**
	 * @param {Object} obj
	 */
	resetOptions(obj: any) {
		Object.keys(obj.$options).forEach(function(key) {
			var opt = obj.$options[key];
			if ("value" in opt)
				obj.setOption(key, opt.value);
		});
	}

	/**
	 * @param {string} path
	 * @param {string} name
	 * @param {any} value
	 */
	setDefaultValue(path: string, name: string, value: any) {
		if (!path) {
			for (path in this.$defaultOptions)
				if (this.$defaultOptions[path][name])
					break;
			if (!this.$defaultOptions[path][name])
				return false;
		}
		var opts = this.$defaultOptions[path] || (this.$defaultOptions[path] = {});
		if (opts[name]) {
			if (opts.forwardTo)
				this.setDefaultValue(opts.forwardTo, name, value);
			else
				opts[name].value = value;
		}
	}

	/**
	 * @param {string} path
	 * @param {{ [key: string]: any; }} optionHash
	 */
	setDefaultValues(path: string, optionHash: Dict) {
		Object.keys(optionHash).forEach((key)=>{
			this.setDefaultValue(path, key, optionHash[key]);
		});
	}

	/**
	 * @param {any} value
	 * @param {{placeholders?: "dollarSigns" | "curlyBrackets"}} [options]
	 */
	setMessages(value: Dict, options: {placeholders?: "dollarSigns" | "curlyBrackets"} ) {
		messages = value;
		if (options && options.placeholders) {
			nlsPlaceholders = options.placeholders;
		}
	}

	/**
	 * @param {string} key
	 * @param {string} defaultString
	 * @param {{ [x: string]: any; }} [params]
	 */
	nls(key: string, defaultString: string, params?: Dict) {
		if (!messages[key])  {
			warn("No message found for the key '" + key + "' in messages with id " + messages.$id + ", trying to find a translation for the default string '" + defaultString + "'.");
			if (!messages[defaultString]) {
				warn("No message found for the default string '" + defaultString + "' in the provided messages. Falling back to the default English message.");
			}
		}

		var translated = messages[key] || messages[defaultString] || defaultString;
		if (params) {
			// We support both $n or {n} as placeholder indicators in the provided translated strings
			if (nlsPlaceholders === "dollarSigns") {
				// Replace $n with the nth element in params
				translated = translated.replace(/\$(\$|[\d]+)/g, function(_, dollarMatch) {
					if (dollarMatch == "$") return "$";
					return params[dollarMatch];
				});
			}
			if (nlsPlaceholders === "curlyBrackets") {
				// Replace {n} with the nth element in params
				translated = translated.replace(/\{([^\}]+)\}/g, function(_, curlyBracketMatch) {
					return params[curlyBracketMatch];
				});
			}
		}
		return translated;
	}

	readonly warn = warn;
	readonly reportError = reportError;
}