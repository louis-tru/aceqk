"use strict";

import keyUtil from "../lib/keys";
import * as useragent from "../lib/env";
import type { Editor } from "../editor";
import type {UIEvent} from "quark/event";
// import type {SearchBox} from "../ext/searchbox";

const KEY_MODS = keyUtil.KEY_MODS;

export type Platform = "win" | "mac";

export type CommandKey = string | { mac?: string, win?: string, position?: number };

export interface Command {
	name?: string;
	bindKey?: CommandKey;
	readOnly?: boolean;
	exec?: (editor: Editor, args?: any, event?: UIEvent, silent?: boolean) => void;
	isAvailable?: (editor: Editor) => boolean;
	description?: string,
	multiSelectAction?: "forEach" | "forEachLine" | Function,
	scrollIntoView?: true | "cursor" | "center" | "selectionPart" | "animate" | "selection" | "none",
	aceCommandGroup?: string,
	passEvent?: boolean,
	level?: number,
	action?: string,
	returnValue?: number;
	isDefault?: boolean;
	isYank?: boolean;
	handlesCount?: boolean;
	args?: any;
}

// export type CommandLike = Command | ((editor: Editor) => void) | ((sb: SearchBox) => void);
export type CommandLike = Command | Command["exec"];
export type CommandLikes = Dict<CommandLike> | Command[];
export type BindingCmd = string|Command|(string|Command)[];

export interface HashHandlerExtensions {
	attach: (editor: Editor) => void;
	detach: (editor: Editor) => void;
	getStatusText: (editor?: Editor, data?: any) => string;
	$getDirectionForHighlight: (editor: Editor) => boolean;
}

export type KeyboardHandler = Partial<HashHandler & HashHandlerExtensions>

export class MultiHashHandler {
	public platform: Platform;
	public commands: Dict<Command>;
	public commandKeyBinding: Dict<BindingCmd>;
	public $singleCommand: boolean;

	/**
	 * @param {CommandLikes} [config]
	 * @param {Platform} [platform]
	 */
	constructor(config?: CommandLikes, platform?: Platform) {
		this.$init(config, platform, false);
	}

	/**
	 * @param {CommandLikes} config
	 * @param {Platform} [platform]
	 * @param {boolean} [$singleCommand]
	 */
	$init(config?: CommandLikes, platform?: Platform, $singleCommand?: boolean) {
		this.platform = platform || (useragent.macOS ? "mac" : "win");
		this.commands = {};
		this.commandKeyBinding = {};
		this.addCommands(config);
		this.$singleCommand = !!$singleCommand;
	}

	/**
	 * @param {Command} command
	 */
	addCommand(command: Command) {
		if (this.commands[command.name!])
			this.removeCommand(command);

		this.commands[command.name!] = command;

		if (command.bindKey)
			this.bindKey(command.bindKey!, command);
	}

	/**
	 * @param {Command | string} command
	 * @param {boolean} [keepCommand]
	 */
	removeCommand(cmd: Command | string, keepCommand?: boolean) {
		var name = cmd && (typeof cmd === 'string' ? cmd : cmd.name);
		var command = this.commands[name!];
		if (!keepCommand)
			delete this.commands[name!];

		// exhaustive search is brute force but since removeCommand is
		// not a performance critical operation this should be OK
		var ckb = this.commandKeyBinding;
		for (var keyId in ckb) {
			var cmdGroup = ckb[keyId];
			if (cmdGroup == command) {
				delete ckb[keyId];
			} else if (Array.isArray(cmdGroup)) {
				var i = cmdGroup.indexOf(command);
				if (i != -1) {
					cmdGroup.splice(i, 1);
					if (cmdGroup.length == 1)
						ckb[keyId] = cmdGroup[0];
				}
			}
		}
	}

	/**
	 * @param {string | { win?: string; mac?: string; position?:number}} key
	 * @param {CommandLike | string} command
	 * @param {number} [position]
	 */
	bindKey(key: CommandKey, command: CommandLike | string, position?: number) {
		if (typeof key == "object" && key) {
			if (position == undefined)
				position = key.position;
			key = key[this.platform] as string;
		}
		if (!key)
			return;
		if (typeof command == "function")
			return this.addCommand({exec: command, bindKey: key, name: command.name || key});

		(key).split("|").forEach((keyPart) => {
			var chain = "";
			if (keyPart.indexOf(" ") != -1) {
				var parts = keyPart.split(/\s+/);
				keyPart = parts.pop()!;
				parts.forEach((keyPart) => {
					var binding = this.parseKeys(keyPart);
					if (!binding) return;
					var id = KEY_MODS[binding.hashId] + binding.key;
					chain += (chain ? " " : "") + id;
					this._addCommandToBinding(chain, "chainKeys");
				});
				chain += " ";
			}
			var binding = this.parseKeys(keyPart);
			if (!binding) return;
			var id = KEY_MODS[binding.hashId] + binding.key;
			this._addCommandToBinding(chain + id, command, position);
		});
	}

	/**
	 * @param {string} keyId
	 * @param {any} command
	 * @param {number} position
	 */
	_addCommandToBinding(keyId: string, command?: Command | string, position?: number) {
		var ckb = this.commandKeyBinding, i;
		if (!command) {
			delete ckb[keyId]; // remove binding all together
		} else if (!ckb[keyId] || this.$singleCommand) {
			ckb[keyId] = command;
		} else {
			if (!Array.isArray(ckb[keyId])) { // non array entry
				const s = [ckb[keyId]];
				ckb[keyId] = s;
			} else if ((i = ckb[keyId].indexOf(command)) != -1) {
				ckb[keyId].splice(i, 1); // remove existing entry
			}

			if (typeof position != "number") {
				position = getPosition(command);
			}

			var commands = ckb[keyId];
			for (i = 0; i < commands.length; i++) {
				var other = commands[i];
				var otherPos = getPosition(other);
				if (otherPos > position)
					break;
			}
			commands.splice(i, 0, command);
		}
	}

	/**
	 * @param {Dict<CommandLike> | Command[]} [commands]
	 */
	addCommands(commands?: Dict<CommandLike> | Command[]) {
		commands && Object.keys(commands).forEach((name)=>{
			var command = (commands as any)[name] as CommandLike | string;
			if (!command)
				return;

			if (typeof command === "string")
				return this.bindKey(command, name);

			if (typeof command === "function")
				command = { exec: command };

			if (typeof command !== "object")
				return;

			if (!command.name)
				command.name = name;

			this.addCommand(command);
		});
	}

	/**
	 * @param {Dict<Command | string>} commands
	 */
	removeCommands(commands: Dict<Command | string> | Command[]) {
		Object.keys(commands).forEach((name)=>{
			const c = (commands as any)[name] as Command | string;
			this.removeCommand(c);
		});
	}

	/**
	 * @param {Record<string, CommandLike | string>} keyList
	 */
	bindKeys(keyList: Dict<CommandLike | string>) {
		Object.keys(keyList).forEach((key)=>{
			this.bindKey(key, keyList[key]);
		});
	}

	/**
	 * Accepts keys in the form ctrl+Enter or ctrl-Enter
	 * keys without modifiers or shift only
	 * @param {string} keys
	 * @returns {{key: string, hashId: number} | false}
	 */
	parseKeys(keys: string): {key: string, hashId: number} | null {
		var parts = keys.toLowerCase().split(/[\-\+]([\-\+])?/).filter(function(x){return x;});
		var key = parts.pop()!;

		var keyCode = keyUtil[key] as string;
		if (keyUtil.FUNCTION_KEYS[keyCode])
			key = keyUtil.FUNCTION_KEYS[keyCode].toLowerCase();
		else if (!parts.length)
			return {key: key, hashId: -1};
		else if (parts.length == 1 && parts[0] == "shift")
			return {key: key.toUpperCase(), hashId: -1};

		var hashId = 0;
		for (var i = parts.length; i--;) {
			var modifier = keyUtil.KEY_MODS[parts[i] as keyof typeof keyUtil.KEY_MODS];
			if (modifier == null) {
				if (typeof console != "undefined")
					console.error("invalid modifier " + parts[i] + " in " + keys);
				return null;
			}
			hashId |= modifier as number;
		}
		return {key: key, hashId: hashId};
	}

	/**
	 * @param {number} hashId
	 * @param {string} keyString
	 * @returns {BindingCmd | void}
	 */
	findKeyCommand(hashId: number, keyString: string): BindingCmd | undefined {
		var key = KEY_MODS[hashId] + keyString;
		return this.commandKeyBinding[key];
	}

	/**
	 * @param {any} data
	 * @param {number} hashId
	 * @param {string} keyString
	 * @param {number} keyCode
	 * @returns {{command: BindingCmd} | void}
	 */
	handleKeyboard(data: {$keyChain?: string}, hashId: number, keyString: string, keyCode: number, e?: any): {command: BindingCmd} | undefined {
		if (keyCode < 0)
			return;
		var key = KEY_MODS[hashId] + keyString;
		var command = this.commandKeyBinding[key];
		if (data.$keyChain) {
			data.$keyChain += " " + key;
			command = this.commandKeyBinding[data.$keyChain] || command;
		}

		if (command) {
			const cmd = command as (string & Dict & {length: number});
			if (cmd == "chainKeys" || cmd[cmd.length - 1] == "chainKeys") {
				data.$keyChain = data.$keyChain || key;
				return {command: "null"};
			}
		}

		if (data.$keyChain) {
			if ((!hashId || hashId == 4) && keyString.length == 1)
				data.$keyChain = data.$keyChain.slice(0, -key.length - 1); // wait for input
			else if (hashId == -1 || keyCode > 0)
				data.$keyChain = ""; // reset keyChain
		}
		return {command: command};
	}

	/**
	 * @param {any} [editor]
	 * @param {any} [data]
	 * @returns {string}
	 */
	getStatusText(editor?: Editor, data?: any): string {
		return data ? (data.$keyChain || "") : "";
	}

	static call(thisArg: MultiHashHandler, config: CommandLikes, platform: Platform) {
		MultiHashHandler.prototype.$init.call(thisArg, config, platform, false);
	}
}

function getPosition(command: Command | string): number {
	return typeof command == "object" && command.bindKey &&
		(command.bindKey as any).position || (command as Command).isDefault ? -100 : 0;
}

export class HashHandler extends MultiHashHandler {
	isEmacs = false;
	$id = "ace/keyboard/hash_handler";

	/**
	 * @param {CommandLikes} [config]
	 * @param {Platform} [platform]
	 */
	constructor(config?: CommandLikes, platform?: Platform) {
		super(config, platform);
		this.$singleCommand = true;
	}
}