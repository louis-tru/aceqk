"use strict";

import * as keyUtil  from "../lib/keys";
import type { Editor } from "../editor";
import type {BindingCmd, KeyboardHandler} from "./hash_handler";
import type {UIEvent} from "quark/event";

export interface KeyBinding {
	setDefaultHandler(kb: KeyboardHandler): void;
	setKeyboardHandler(kb: KeyboardHandler): void;
	addKeyboardHandler(kb?: KeyboardHandler & {
			attach?: (editor: any) => void;
			detach?: (editor: any) => void;
	}, pos?: number): void;
	removeKeyboardHandler(kb: KeyboardHandler & {
			attach?: (editor: any) => void;
			detach?: (editor: any) => void;
	}): boolean;
	getKeyboardHandler(): KeyboardHandler;
	getStatusText(): string;
}

export class KeyBinding {
	private $editor: Editor;
	public $data: {editor: Editor, lastCommand?: string, count?: number};
	public $handlers: (KeyboardHandler)[];
	private $defaultHandler!: KeyboardHandler;

	/**
	 * @param {Editor} editor
	 */
	constructor(editor: Editor) {
		this.$editor = editor;
		this.$data = {editor: editor};
		this.$handlers = [];
		this.setDefaultHandler(editor.commands);
	}

	/**
	 * @param {KeyboardHandler} kb
	 */
	setDefaultHandler(kb: KeyboardHandler) {
		this.removeKeyboardHandler(this.$defaultHandler);
		this.$defaultHandler = kb;
		this.addKeyboardHandler(kb, 0);
	}

	/**
	 * @param {KeyboardHandler|undefined} kb
	 */
	setKeyboardHandler(kb?: KeyboardHandler) {
		var h = this.$handlers;
		if (h[h.length - 1] == kb)
			return;

		while (h[h.length - 1] && h[h.length - 1] != this.$defaultHandler)
			this.removeKeyboardHandler(h[h.length - 1]);

		this.addKeyboardHandler(kb, 1);
	}

	/**
	 * @param {KeyboardHandler & {attach?: (editor: any) => void, detach?: (editor: any) => void;}} [kb]
	 * @param {number} [pos]
	 */
	addKeyboardHandler(kb?: KeyboardHandler & {
			attach?: (editor: any) => void;
			detach?: (editor: any) => void;
	}, pos?: number) {
		if (!kb)
			return;
		// @ts-ignore
		if (typeof kb == "function" && !kb.handleKeyboard)
			// @ts-ignore
			kb.handleKeyboard = kb;
		var i = this.$handlers.indexOf(kb);
		if (i != -1)
			this.$handlers.splice(i, 1);

		if (pos == undefined)
			this.$handlers.push(kb);
		else
			this.$handlers.splice(pos, 0, kb);

		if (i == -1 && kb.attach)
			kb.attach(this.$editor);
	}

	/**
	 * @param {KeyboardHandler & {attach?: (editor: any) => void, detach?: (editor: any) => void;}} kb
	 * @returns {boolean}
	 */
	removeKeyboardHandler(kb?: KeyboardHandler & {
			attach?: (editor: any) => void;
			detach?: (editor: any) => void;
	}): boolean {
		if (!kb) return false;
		var i = this.$handlers.indexOf(kb);
		if (i == -1)
			return false;
		this.$handlers.splice(i, 1);
		kb.detach && kb.detach(this.$editor);
		return true;
	}

	/**
	 * @return {KeyboardHandler}
	 */
	getKeyboardHandler() {
		return this.$handlers[this.$handlers.length - 1];
	}

	getStatusText() {
		var data = this.$data;
		var editor = data.editor;
		return this.$handlers.map(function(h) {
			return h.getStatusText && h.getStatusText(editor, data) || "";
		}).filter(Boolean).join(" ");
	}

	$callKeyboardHandlers(hashId: number, keyString: string, keyCode: number, e?: UIEvent): boolean {
		var toExecute: {command: BindingCmd, args?: any, passEvent?: boolean} | undefined;
		var success = false;
		var commands = this.$editor.commands;

		for (var i = this.$handlers.length; i--;) {
			toExecute = this.$handlers[i].handleKeyboard!(
				this.$data as {}, hashId, keyString, keyCode, e
			);
			if (!toExecute || !toExecute.command)
				continue;

			// allow keyboardHandler to consume keys
			if (toExecute.command == "null") {
				success = true;
			} else {
				success = commands.exec(toExecute.command, this.$editor, toExecute.args, e);
			}
			// do not stop input events to not break repeating
			if (success && e && hashId != -1 &&
				toExecute["passEvent"] != true && (toExecute.command as {passEvent?: boolean})["passEvent"] != true
			) {
				e.cancelBubble();
				e.cancelDefault();
			}
			if (success)
				break;
		}

		if (!success && hashId == -1) {
			toExecute = {command: "insertstring"};
			success = commands.exec("insertstring", this.$editor, keyString);
		}

		if (success && this.$editor._signal)
			this.$editor._signal("keyboardActivity", toExecute, this.$editor);

		return success;
	}

	/**
	 * @param {any} e
	 * @param {number} hashId
	 * @param {number} keyCode
	 * @return {boolean}
	 * @internal
	 */
	onCommandKey(e: UIEvent, hashId: number, keyCode: number) {
		var keyString = keyUtil.keyCodeToString(keyCode);
		return this.$callKeyboardHandlers(hashId, keyString, keyCode, e);
	}

	/**
	 * @param {string} text
	 * @return {boolean}
	 * @internal
	 */
	onTextInput(text: string) {
		return this.$callKeyboardHandlers(-1, text, 0);
	}

}
