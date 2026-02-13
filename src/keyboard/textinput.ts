"use strict";

import * as useragent from "../lib/env";
import {nls} from "../config";
import * as clipboard from "../clipboard";
import qk,{View,InputSink} from "quark";
import type {Editor} from "../editor";
import type {InputEvent} from 'quark/event';
import * as event from "../lib/event";
import type { Composition } from "../virtual_renderer";
import type { ClipboardEvent } from "../mouse/mouse_event";

export interface TextInputAriaOptions {
	activeDescendant?: string;
	role?: string;
	setLabel?: boolean;
	inline?: boolean;
}

export class TextInput {
	private host: Editor;
	private text: InputSink;
	private inComposition?: Composition;
	private commandMode = false;
	private $isFocused = false;
	private inputHandler: ((value: string) => void) | null = null;

	/**
	 * @param {View} parentNode
	 * @param {Editor} host
	 */
	constructor(parentNode: View, host: Editor) {
		this.host = host;
		// this.text = dom.createElement("textarea");
		this.text = new InputSink(parentNode.window);
		this.text.class = ["ace_text-input"];
		this.text.style.opacity = 0; // don't draw the input

		this.text.setAttribute("wrap", "off");
		this.text.setAttribute("autocomplete", "off");
		this.text.setAttribute("autocorrect", "off");
		this.text.setAttribute("autocapitalize", "off");
		this.text.setAttribute("spellcheck", false);

		parentNode.prepend(this.text);

		this.setAriaOptions({role: "textbox"});

		this.text.onBlur.on((e) => {
			host.onBlur(e);
			this.$isFocused = false;
		});

		this.text.onFocus.on((e) => {
			this.$isFocused = true;
			host.onFocus(e);
		});

		if (this.$isFocused) host.onFocus();

		host.on("beforeEndOperation", () => {
			var curOp = host.curOp;
			var commandName = curOp && curOp.command && curOp.command.name;
			if (commandName == "insertstring") return;
			var isUserAction = commandName && (curOp && (curOp.docChanged || curOp.selectionChanged));
			if (this.inComposition && isUserAction) {
				// exit composition from commands other than insertstring
				this.cancelComposition();
			}
		});

		// if cursor changes position, we need to update the label with the correct row
		host.on("changeSelection", this.setAriaLabel.bind(this));

		// event.addListener(this.text, "Cut", this.onCut.bind(this), host);
		// event.addListener(this.text, "Copy", this.onCopy.bind(this), host);
		// event.addListener(this.text, "Paste", this.onPaste.bind(this), host);
		// has no clipboard events
		if (!('onCut' in this.text) || !('onCopy' in this.text) || !('onPaste' in this.text)) {
			parentNode.onKeyDown.on((e) => {
				if (useragent.macOS ? !e.command: !e.ctrl) return;
				switch (e.keycode) {
					case 67:
						this.onCopy(e); break; // C
					case 86:
						this.onPaste(e); break; // V
					case 88:
						this.onCut(e); break;  // X
				}
			});
		}

		event.addCommandKeyListener(this.text, (e, hashId, keyCode) => {
			// ignore command events during composition as they will
			// either be handled by ime itself or fired again after ime end
			if (this.inComposition) {
				// console.log("---- Command ignored during composition: hashId=", hashId, "keyCode=", keyCode);
				return;
			}
			host.onCommandKey(e, hashId, keyCode);
		}, host);
		event.addListener(this.text, "InputInsert", e=>this.onInputInsert(e as InputEvent), host);
		event.addListener(this.text, "InputMarked", e=>this.onCompositionUpdate(e as InputEvent), host);
		event.addListener(this.text, "InputUnmark", e=>this.onCompositionEnd(e as InputEvent), host);
	}

	private lastMarkedText = "";
	private lastCursorIndex = 0;

	onCompositionUpdate(e: InputEvent) {
		if (!this.host.onCompositionStart ||
				!this.host.onCompositionUpdate || this.host.$readOnly)
			return;
		if (this.commandMode)
			return;// this.cancelComposition();

		if (!this.inComposition) {
			this.host._signal("compositionStart", void 0, this.host);
			this.host.on("mousedown", this.cancelComposition); // cancel composition on mouse down

			this.lastMarkedText = "";
			this.lastCursorIndex = 0;

			// start composition if it wasn't started before
			this.inComposition = {} as Composition;
			var range = this.host.getSelectionRange();
			range.end.row = range.start.row;
			range.end.column = range.start.column;
			this.inComposition.markerRange = range;
			this.host.onCompositionStart(this.inComposition as Composition);
		}

		var markedText = e.input;
		var cursorIndex = e.cursorIndex;
		var restoreStart = markedText.length - cursorIndex;

		this.host.onTextInput(markedText, {
			extendLeft: this.lastCursorIndex,
			extendRight: this.lastMarkedText.length - this.lastCursorIndex,
			restoreStart: restoreStart,
			restoreEnd: restoreStart,
		});

		this.lastMarkedText = markedText;
		this.lastCursorIndex = cursorIndex;

		this.inComposition.markerRange.end.column =
			this.inComposition.markerRange.start.column + markedText.length;
	}

	onCompositionEnd(e?: InputEvent) {

		if (!this.host.onCompositionEnd || this.host.$readOnly)
			return;
		if (this.commandMode)
			return;
		this.inComposition = void 0;
		this.host.onCompositionEnd();
		this.host.off("mousedown", this.cancelComposition);

		// note that resetting value of textarea at this point doesn't always work
		// because textarea value can be silently restored
		if (e) {
			this.host.onTextInput(e.input, {
				extendLeft: this.lastCursorIndex,
				extendRight: this.lastMarkedText.length - this.lastCursorIndex,
				restoreStart: 0,
				restoreEnd: 0,
			});
		}
	}

	onInputInsert(e: InputEvent) {
		if (this.inComposition)
			return this.onCompositionEnd(e); // force end composition on input insert

		// if (e && e.inputType) {
		// 	if (e.inputType == "historyUndo") return this.host.execCommand("undo");
		// 	if (e.inputType == "historyRedo") return this.host.execCommand("redo");
		// }
		if (e.input == '\t')
			return; // ignore tabs, handled by keydown
		this.host.onTextInput(e.input);
	}

	cancelComposition = () => {
		if (this.inComposition) {
			if (this.text.isMarkedText)
				this.text.cancelMarkedText();
			else
				this.onCompositionEnd();
		}
	};

	onCut(e: ClipboardEvent) {
		this.doCopy(e, true);
	}

	onCopy(e: ClipboardEvent) {
		this.doCopy(e, false);
	}

	doCopy(e: ClipboardEvent, isCut: boolean) {
		var data = this.host.getCopyText();
		if (!data)
			return event.preventDefault(e);
		if (this.handleClipboardData(e, data)) {
			isCut ? this.host.onCut() : this.host.onCopy();
			event.preventDefault(e);
		}
	}

	onPaste(e: ClipboardEvent) {
		var data = this.handleClipboardData(e);
		if (clipboard.isPasteCancelled())
			return;
		if (typeof data == "string") {
			if (data)
				this.host.onPaste(data, e);
			event.preventDefault(e);
		}
	}

	handleClipboardData(e: ClipboardEvent, data?: string): string | boolean {
		if (data) {
			qk.app.clipboard.setText(data);
			return true;
		} else {
			return qk.app.clipboard.getText();
		}
	}

	/**
	 * @param {Editor} newHost
	 */
	setHost(newHost: Editor) {
		this.host = newHost;
	}

	/**
	 * Sets the number of extra lines in the textarea to improve screen reader compatibility.
	 * Extra lines can help screen readers perform better when reading text.
	 *
	 * @param {number} number - The number of extra lines to add. Must be non-negative.
	 */
	setNumberOfExtraLines(number: number) {
		// Noop for non-DOM environments
	}

	setAriaLabel() {
		var ariaLabel = "";
		if (this.host.$textInputAriaLabel) {
			ariaLabel += `${this.host.$textInputAriaLabel}, `;
		}
		if (this.host.session) {
			var row = this.host.session.selection.cursor.row;
			ariaLabel += nls("text-input.aria-label", "Cursor at row $0", [row + 1]);
		}
		this.text.setAttribute("aria-label", ariaLabel);
	}

	/**
	 * @param {TextInputAriaOptions} options
	 */
	setAriaOptions(options: TextInputAriaOptions) {
		if (options.activeDescendant) {
			this.text.setAttribute("aria-haspopup", "true");
			this.text.setAttribute("aria-autocomplete", options.inline ? "both" : "list");
			this.text.setAttribute("aria-activedescendant", options.activeDescendant);
		}
		else {
			this.text.setAttribute("aria-haspopup", "false");
			this.text.setAttribute("aria-autocomplete", "both");
			this.text.removeAttribute("aria-activedescendant");
		}
		if (options.role) {
			this.text.setAttribute("role", options.role);
		}
		if (options.setLabel) {
			this.text.setAttribute("aria-roledescription", nls("text-input.aria-roledescription", "editor"));
			this.setAriaLabel();
		}
	}

	focus() {
		// Accessibility hook (kept for future platform-level integration)
		// On focusing on the textarea, read active row number to assistive tech.
		this.setAriaOptions({
			setLabel: this.host.renderer.enableKeyboardAccessibility
		});
		this.text.focus();
	}

	blur() {
		this.text.blur();
	}

	isFocused() {
		return this.$isFocused;
	}

	setInputHandler(cb: ((value: string) => void) | null) {
		this.inputHandler = cb;
	}

	getInputHandler() {
		return this.inputHandler;
	}

	getElement() {
		return this.text;
	}

	/**
	 * allows to ignore composition (used by vim keyboard handler in the normal mode)
	 * this is useful on mac, where with some keyboard layouts (e.g swedish) ^ starts composition
	 * @param {boolean} value
	 */
	setCommandMode(value: boolean) {
		this.commandMode = value;
		this.text.readonly = false;
	}

	setReadOnly(readOnly: boolean) {
		if (!this.commandMode)
			this.text.readonly = readOnly;
	}

	setCopyWithEmptySelection(value: boolean) {
	}

	destroy() {
		this.text.remove();
	}
}
