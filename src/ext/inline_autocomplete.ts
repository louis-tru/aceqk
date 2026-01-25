/**
 * ## Inline Autocomplete extension
 *
 * Provides lightweight, prefix-based autocompletion with inline ghost text rendering and an optional command bar tooltip.
 * Displays completion suggestions as ghost text directly in the editor with keyboard navigation and interactive controls.
 *
 * **Enable:** `editor.setOption("enableInlineAutocompletion", true)`
 * or configure it during editor initialization in the options object.
 * @module
 */

"use strict";

import * as util from "../autocomplete/util";
import * as dom from "../lib/dom";
import * as lang from "../lib/lang";
import type { } from "../autocomplete";
import type { AcePopup } from "../autocomplete/popup";
import {HashHandler} from "../keyboard/hash_handler";
import {AceInline} from "../autocomplete/inline";
import {FilteredList,CompletionProvider,CompletionOptions,Completion,Completer,
	CompletionProviderOptions, InlineAutocompleteAction} from "../autocomplete";
import {Editor} from "../editor";
import {CommandBarTooltip, BUTTON_CLASS_NAME} from "./command_bar";
import {snippetCompleter,textCompleter,keyWordCompleter} from "./language_tools";
import type {Command} from "../keyboard/hash_handler";
import type { View } from "quark";
import type { Point } from "../range";
import type { Anchor } from "../anchor";

var destroyCompleter = function(e: any, editor: Editor) {
	editor.completer && editor.completer.destroy();
};

/**
 * 
 * @type {{[key: string]: Command}}
 */
const commands: Dict<Command> = {
	"Previous": {
		bindKey: "Alt-[",
		name: "Previous",
		exec: function(editor: Editor) {
			(editor.completer as InlineAutocomplete).goTo("prev");
		}
	},
	"Next": {
		bindKey: "Alt-]",
		name: "Next",
		exec: function(editor: Editor) {
			(editor.completer as InlineAutocomplete).goTo("next");
		}
	},
	"Accept": {
		bindKey: { win: "Tab|Ctrl-Right", mac: "Tab|Cmd-Right" },
		name: "Accept",
		exec: function(editor: Editor) {
			return editor.completer!.insertMatch();
		}
	},
	"Close": {
		bindKey: "Esc",
		name: "Close",
		exec: function(editor: Editor) {
			editor.completer!.detach();
		}
	}
};

const startCommand: Command = {
	name: "startInlineAutocomplete",
	exec: function(editor: Editor, options) {
		var completer = InlineAutocomplete.for(editor);
		completer.show(options);
	},
	bindKey: { win: "Alt-C", mac: "Option-C" }
};

/**
 * This class controls the inline-only autocompletion components and their lifecycle.
 * This is more lightweight than the popup-based autocompletion, as it can only work with exact prefix matches.
 * There is an inline ghost text renderer and an optional command bar tooltip inside.
 */
export class InlineAutocomplete {
	popup?: AcePopup;
	inlineRenderer?: AceInline;
	inlineTooltip?: CommandBarTooltip;
	editor: Editor;
	completionProvider?: CompletionProvider;
	completions: FilteredList;
	base?: Anchor;
	activated: boolean = false;
	keyboardHandler: HashHandler;
	$index: number;
	changeTimer: lang.DelayedCall;
	public readonly commands = commands;
	static readonly startCommand = startCommand;

	static for(editor: Editor) {
		if (editor.completer instanceof InlineAutocomplete) {
			return editor.completer;
		}
		if (editor.completer) {
			editor.completer.destroy();
			editor.completer = void 0;
		}

		editor.completer = new InlineAutocomplete(editor);
		editor.once("destroy", destroyCompleter);
		return editor.completer;
	};

	/**
	 * Factory method to create a command bar tooltip for inline autocomplete.
	 * 
	 * @param {View} parentEl  The parent element where the tooltip HTML elements will be added.
	 * @returns {CommandBarTooltip}   The command bar tooltip for inline autocomplete
	 */
	static createInlineTooltip(parentEl: View) {
		var inlineTooltip = new CommandBarTooltip(parentEl);
		inlineTooltip.registerCommand("Previous",
			// @ts-expect-error
			Object.assign({}, InlineAutocomplete.prototype.commands["Previous"], {
				enabled: true,
				type: "button",
				iconCssClass: "ace_arrow_rotated"
			})
		);
		inlineTooltip.registerCommand("Position", {
			enabled: false,
			getValue: function (editor) {
				return editor ? [
					(editor.completer as InlineAutocomplete).getIndex() + 1,
					(editor.completer as InlineAutocomplete).getLength()
				].join("/") : "";
			},
			type: "text",
			cssClass: "completion_position"
		});
		inlineTooltip.registerCommand("Next",
			// @ts-expect-error
			Object.assign({}, InlineAutocomplete.prototype.commands["Next"], {
				enabled: true,
				type: "button",
				iconCssClass: "ace_arrow"
			})
		);
		inlineTooltip.registerCommand("Accept",
			// @ts-expect-error
			Object.assign({}, InlineAutocomplete.prototype.commands["Accept"], {
				enabled: function(editor: Editor) {
					return !!editor && (editor.completer as InlineAutocomplete).getIndex() >= 0;
				},
				type: "button"
			})
		);
		inlineTooltip.registerCommand("ShowTooltip", {
			name: "Always Show Tooltip",
			exec: function() {
				inlineTooltip.setAlwaysShow(!inlineTooltip.getAlwaysShow());
			},
			enabled: true,
			getValue: function() {
				return inlineTooltip.getAlwaysShow();
			},
			type: "checkbox"
		});
		return inlineTooltip;
	};

	/**
	 * @param {Editor} editor
	 */
	constructor(editor: Editor) {
		this.editor = editor;
		this.keyboardHandler = new HashHandler(this.commands);
		this.$index = -1;

		this.blurListener = this.blurListener.bind(this);
		this.changeListener = this.changeListener.bind(this);


		this.changeTimer = lang.delayedCall(() => {
			this.updateCompletions();
		});
	}

	/**
	 * 
	 * @return {AceInline}
	 */
	getInlineRenderer() {
		if (!this.inlineRenderer)
			this.inlineRenderer = new AceInline();
		return this.inlineRenderer;
	}

	/**
	 * @return {CommandBarTooltip}
	 */
	getInlineTooltip() {
		if (!this.inlineTooltip) {
			this.inlineTooltip = InlineAutocomplete.createInlineTooltip(this.editor.window.root);
		}
		return this.inlineTooltip;
	}

	/**
	 * This function is the entry point to the class. This triggers the gathering of the autocompletion and displaying the results;
	 * @param {CompletionOptions} options
	 */
	show(options?: CompletionOptions) {
		this.activated = true;

		if (this.editor.completer !== this) {
			if (this.editor.completer)
				this.editor.completer.detach();
			this.editor.completer = this;
		}

		this.editor.on("changeSelection", this.changeListener);
		this.editor.on("blur", this.blurListener);

		this.updateCompletions(options);
	}

	$open() {
		if (this.editor.textInput.setAriaOptions) {
			this.editor.textInput.setAriaOptions({});
		}

		this.editor.keyBinding.addKeyboardHandler(this.keyboardHandler);
		this.getInlineTooltip()!.attach(this.editor);

		if (this.$index === -1) {
			this.setIndex(0);
		} else {
			this.$showCompletion();
		}
		
		this.changeTimer.cancel();
	}
	
	insertMatch() {
		var result = this.getCompletionProvider().insertByIndex(this.editor, this.$index);
		this.detach();
		return result;
	}

	changeListener(e?: any) {
		var cursor = this.editor.selection.lead;
		if (cursor.row != this.base!.row || cursor.column < this.base!.column) {
			this.detach();
		}
		if (this.activated)
			this.changeTimer.schedule();
		else
			this.detach();
	}

	blurListener(e?: any) {
		this.detach();
	}

	/**
	 * @param {InlineAutocompleteAction} where
	 */
	goTo(where: InlineAutocompleteAction) {
		if (!this.completions || !this.completions.filtered) {
			return;
		}
		var completionLength = this.completions.filtered.length;
		switch(where.toLowerCase()) {
			case "prev":
				this.setIndex((this.$index - 1 + completionLength) % completionLength);
				break;
			case "next":
				this.setIndex((this.$index + 1 + completionLength) % completionLength);
				break;
			case "first":
				this.setIndex(0);
				break;
			case "last":
				this.setIndex(this.completions.filtered.length - 1);
				break;
		}
	}

	getLength() {
		if (!this.completions || !this.completions.filtered) {
			return 0;
		}
		return this.completions.filtered.length;
	}

	/**
	 * @param {number} [index]
	 * @returns {Completion | undefined}
	 */
	getData(index?: number): Completion | undefined {
		if (index == undefined || index === null) {
			return this.completions!.filtered[this.$index];
		} else {
			return this.completions!.filtered[index];
		}
	}

	getIndex() {
		return this.$index;
	}

	isOpen() {
		return this.$index >= 0;
	}

	/**
	 * @param {number} value
	 */
	setIndex(value: number) {
		if (!this.completions || !this.completions.filtered) {
			return;
		}
		var newIndex = Math.max(-1, Math.min(this.completions.filtered.length - 1, value));
		if (newIndex !== this.$index) {
			this.$index = newIndex;
			this.$showCompletion();
		}
	}

	/**
	 * @return {CompletionProvider}
	 */
	getCompletionProvider(initialPosition?: {pos: Point, prefix: string, base?: Point}) {
		if (!this.completionProvider)
			this.completionProvider = new CompletionProvider(initialPosition);
		return this.completionProvider;
	}

	$showCompletion() {
		if (!this.getInlineRenderer().show(this.editor,
			this.completions!.filtered[this.$index], this.completions!.filterText)) {
			// Not able to show the completion, hide the previous one
			this.getInlineRenderer().hide();
		}
		if (this.inlineTooltip && this.inlineTooltip.isShown()) {
			this.inlineTooltip.update();
		}
	}

	/**
	 * @return {any}
	 */
	$updatePrefix() {
		var pos = this.editor.getCursorPosition();
		var prefix = this.editor.session.getTextRange({start: this.base!, end: pos});
		this.completions!.setFilter(prefix);
		if (!this.completions!.filtered.length)
			return this.detach();
		if (this.completions!.filtered.length == 1
		&& this.completions!.filtered[0].value == prefix
		&& !this.completions!.filtered[0].snippet)
			return this.detach();
		//@ts-expect-error TODO: potential wrong arguments
		this.$open(this.editor, prefix);
		return prefix;
	}

	/**
	 * @param {CompletionOptions} [options]
	 */
	updateCompletions(options?: CompletionOptions) {
		var prefix = "";
		
		if (options && options.matches) {
			var pos = this.editor.getSelectionRange().start;
			this.base = this.editor.session.doc.createAnchor(pos.row, pos.column);
			this.base.$insertRight = true;
			this.completions = new FilteredList(options.matches);
			//@ts-expect-error TODO: potential wrong arguments
			return this.$open(this.editor, "");
		}

		if (this.base && this.completions) {
			prefix = this.$updatePrefix() || '';
		}

		var session = this.editor.getSession();
		var pos = this.editor.getCursorPosition();
		var prefix = util.getCompletionPrefix(this.editor);
		this.base = session.doc.createAnchor(pos.row, pos.column - prefix.length);
		this.base.$insertRight = true;

		//// @ts-ignore
		var opts: CompletionProviderOptions = {
			exactMatch: true,
			ignoreCaption: true
		};
		this.getCompletionProvider({
			prefix,
			base: this.base,
			pos
			//// @ts-ignore
		}).provideCompletions(this.editor, opts,
			/**
			 * @this {InlineAutocomplete}
			 */
			(err, completions, finished) => {
				var filtered = completions.filtered;
				var prefix = util.getCompletionPrefix(this.editor);

				if (finished) {
					// No results
					if (!filtered.length)
						return this.detach();

					// One result equals to the prefix
					if (filtered.length == 1 && filtered[0].value == prefix && !filtered[0].snippet)
						return this.detach();
				}
				this.completions = completions;
				//@ts-expect-error TODO: potential wrong arguments
				this.$open(this.editor, prefix);
			});
	}

	detach() {
		if (this.editor) {
			this.editor.keyBinding.removeKeyboardHandler(this.keyboardHandler);
			this.editor.off("changeSelection", this.changeListener);
			this.editor.off("blur", this.blurListener);
		}
		this.changeTimer.cancel();
		if (this.inlineTooltip) {
			this.inlineTooltip.detach();
		}
		
		this.setIndex(-1);

		if (this.completionProvider) {
			this.completionProvider.detach();
		}

		if (this.inlineRenderer && this.inlineRenderer.isOpen()) {
			this.inlineRenderer.hide();
		}

		if (this.base)
			this.base.detach();
		this.activated = false;
		const self = this as Partial<InlineAutocomplete>;
		self.completionProvider = self.completions = self.base = void 0;
	}

	destroy() {
		this.detach();
		if (this.inlineRenderer)
			this.inlineRenderer.destroy();
		if (this.inlineTooltip)
			this.inlineTooltip.destroy();
		if (this.editor && this.editor.completer == this) {
			this.editor.off("destroy", destroyCompleter);
			this.editor.completer = void 0;
		}
		const self = this as Partial<InlineAutocomplete>;
		self.inlineTooltip = self.editor = self.inlineRenderer = void 0;
	}

	updateDocTooltip(){
	}

}

const completers: Completer[] = [snippetCompleter, textCompleter, keyWordCompleter];

import config from "../config";

config.defineOptions(Editor.prototype, "editor", {
	enableInlineAutocompletion: {
		/**
		 * @this{Editor}
		 * @param val
		 */
		set: function(this: Editor, val: boolean | Completer[]) {
			if (val) {
				if (!this.completers)
					this.completers = Array.isArray(val) ? val : completers;
				this.commands.addCommand(InlineAutocomplete.startCommand);
			} else {
				this.commands.removeCommand(InlineAutocomplete.startCommand);
			}
		},
		value: false
	}
});

dom.importCss({
'.ace_icon_svg.ace_arrow, .ace_icon_svg.ace_arrow_rotated': {
	// -webkit-mask-image: url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTUuODM3MDEgMTVMNC41ODc1MSAxMy43MTU1TDEwLjE0NjggOEw0LjU4NzUxIDIuMjg0NDZMNS44MzcwMSAxTDEyLjY0NjUgOEw1LjgzNzAxIDE1WiIgZmlsbD0iYmxhY2siLz48L3N2Zz4=");
},

'.ace_icon_svg.ace_arrow_rotated': {
	// transform: rotate(180deg);
	rotateZ: 180,
},

// div.${BUTTON_CLASS_NAME}.completion_position {
[`.${BUTTON_CLASS_NAME}.completion_position`]: {
	padding: 0,
}
}, "inlineautocomplete.css", false);