"use strict";

import * as oop from "../lib/oop";
import {MultiHashHandler,Command,BindingCmd,Platform} from "../keyboard/hash_handler";
import {EventEmitter} from "../lib/event_emitter";
import type { Editor } from "../editor";
import type {UIEvent} from "quark/event";

export type {Command, CommandKey, BindingCmd,Platform,CommandLike,CommandLikes} from "../keyboard/hash_handler";

export type ExecEventHandler = (obj: {
	editor: Editor,
	command: Command,
	args: any,
	event?: UIEvent,
	returnValue?: any,
}, emitter: CommandManager) => void;

export type ExecArg = Parameters<ExecEventHandler>[0];

export interface CommandManagerEvents {
	"exec": ExecEventHandler
	"afterExec": ExecEventHandler;
	"commandUnavailable": ExecEventHandler;
}

export interface IncrementalSearchExtension {
	usesIncrementalSearch: boolean;
	setupIncrementalSearch: (editor: Editor, val: boolean) => void;
}

export interface CommandManager extends EventEmitter<CommandManagerEvents>, IncrementalSearchExtension {
	$checkCommandState?: boolean
}

export class CommandManager extends MultiHashHandler {
	// public byName: Dict<Command>;
	private $inReplay?: boolean;
	private $addCommandToMacro?: (e: any) => void;
	private macro: [Command, any][] = [];
	private oldMacro: [Command, any][] = [];
	public recording: boolean = false;

	/**
	 * new CommandManager(platform, commands)
	 * @param {Platform} platform Identifier for the platform; must be either `"mac"` or `"win"`
	 * @param {Command[]} commands A list of commands
	 **/
	constructor(platform: Platform, commands: Command[]) {
		super(commands, platform);
		// this.byName = this.commands;
		this.setDefaultHandler("exec", function(e) {
			if (!e.args)
				return e.command.exec!(e.editor, {}, e.event, true);
			return e.command.exec!(e.editor, e.args, e.event, false);
		});
	}

	/**
	 * 
	 * @param {BindingCmd} command
	 * @param {Editor} editor
	 * @param {any} args
	 * @returns {boolean}
	 */
	exec(command: BindingCmd, editor: Editor, args?: any, event?: UIEvent) {
		if (Array.isArray(command)) {
			for (var i = command.length; i--; ) {
				if (this.exec(command[i], editor, args, event))
					return true;
			}
			return false;
		}

		if (typeof command === "string")
			command = this.commands[command];

		const arg: ExecArg = {editor: editor, command: command, args: args, event};

		if (!this.canExecute(command, editor)) {
			this._signal("commandUnavailable", arg, this);
			return false; 
		}

		arg.returnValue = this._emit("exec", arg, this) as any;
		this._signal("afterExec", arg, this);

		return arg.returnValue === false ? false : true;
	}

	/**
	 *
	 * @param {string | Command} command
	 * @param {Editor} editor
	 * @returns {boolean}
	 */
	canExecute(command: Command | string, editor: Editor) {
		if (typeof command === "string")
			command = this.commands[command];
		
		if (!command)
			return false;

		if (editor && editor.$readOnly && !command.readOnly)
			return false;

		if (this.$checkCommandState != false && command.isAvailable && !command.isAvailable(editor))
			return false;
		
		return true;
	}

	/**
	 * @param {Editor} editor
	 * @returns {boolean}
	 */
	toggleRecording(editor: Editor) {
		if (this.$inReplay)
			return false;

		editor && editor._emit("changeStatus", void 0, editor);
		if (this.recording) {
			this.macro.pop();
			this.off("exec", this.$addCommandToMacro!);

			if (!this.macro.length)
				this.macro = this.oldMacro;

			return this.recording = false;
		}
		if (!this.$addCommandToMacro) {
			this.$addCommandToMacro = (e: ExecArg) => {
				this.macro.push([e.command, e.args]);
			};
		}

		this.oldMacro = this.macro;
		this.macro = [];
		this.on("exec", this.$addCommandToMacro);
		return this.recording = true;
	}

	/**
	 * @param {Editor} editor
	 */
	replay(editor: Editor) {
		if (this.$inReplay || !this.macro)
			return;

		if (this.recording)
			return this.toggleRecording(editor);

		try {
			this.$inReplay = true;
			this.macro.forEach((x)=>{
				if (typeof x == "string")
					this.exec(x, editor);
				else
					this.exec(x[0], editor, x[1]);
			});
		} finally {
			this.$inReplay = false;
		}
	}

	trimMacro(m: [Command, any][]): string[] {
		return m.map(function(x: any) {
			if (typeof x[0] != "string")
				x[0] = x[0].name;
			if (!x[1])
				x = x[0];
			return x;
		});
	}

}
oop.implement(CommandManager.prototype, EventEmitter);
