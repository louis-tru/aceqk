"use strict";

import * as useragent from "./lib/env";
import * as lang from "./lib/lang";
import * as oop from "./lib/oop";
import {TextInput} from "./keyboard/textinput";
import {MouseHandler, MouseHandlerOptions} from "./mouse/mouse_handler";
import {FoldHandler} from "./mouse/fold_handler";
import {KeyBinding} from "./keyboard/keybinding";
import {EditSession,EditSessionOptions,Operation} from "./edit_session";
import {Search, SearchOptions} from "./search";
import { Range, Delta, Point, IRange } from "./range";
import {EventEmitter} from "./lib/event_emitter";
import {CommandManager} from "./commands/command_manager";
import {commands as defaultCommands} from "./commands/default_commands";
import config from "./config";
import {TokenIterator} from "./token_iterator";
import {GutterKeyboardHandler,GutterKeyboardEvent} from "./keyboard/gutter_handler";
import * as clipboard from "./clipboard";
import keys from './lib/keys';
import {HoverTooltip} from "./tooltip";
import {Ace} from "../ace-internal";
import type {InlineAutocomplete} from "./ext/inline_autocomplete";
import type {OptionsProvider} from "./lib/app_config";
import type {GutterTooltip} from "./mouse/default_gutter_handler";
import type { Composition, VirtualRenderer, VirtualRendererOptions } from "./virtual_renderer";
import qk, {Window, Box, Text} from "quark";
import type {KeyboardHandler, BindingCmd, Command} from "./keyboard/hash_handler";
import type { KeyEvent } from "quark/event";
import type {MouseEvent,ClipboardEvent} from "./mouse/mouse_event";
import type {EditorMultiSelectProperties} from './multi_select'
import type { Vec2 } from "quark/types";
import type {PromptOptions} from "./ext/prompt";
import type { LineWidgets } from "./line_widgets";
import type {IncrementalSearchOptions} from "./incremental_search";
import type { AcePopupEventsExtension } from "./autocomplete/popup";
import type { Autocomplete, Completer } from "./autocomplete";
import type { Token } from "./background_tokenizer";
import type { Selection } from "./selection";
import './lib/ext'; // import extensions to quark.View and quark.event.KeyEvent
import type { SearchBox } from "./ext/searchbox";
import type {CodeLenseEditorExtension} from "./ext/code_lens";
import type {ElasticTabstopsOptionsEditorExtension} from "./ext/elastic_tabstops_lite";
import type {EmmetOptionsEditorExtension} from "./ext/emmet";

const nls = config.nls;

export interface ElasticTabstopsEditorExtension {
	elasticTabstops?: import("./ext/elastic_tabstops_lite").ElasticTabstopsLite;
}

export interface TextareaEditorExtension {
	setDisplaySettings?: (settings: any) => void;
}

export interface PromptEditorExtension {
	cmdLine?: Editor;
}

export interface OptionsEditorExtension {
	$options?: any;
}

export interface EmacsEditorExtension {
	setEmacsMark?: (p?: Point) => void;
	pushEmacsMark?: (p?: Point, activate?: boolean) => void;
	emacsMark?: () => Point | undefined;
	showCommandLine?: (arg: any) => void;
	popEmacsMark?: () => Point | undefined;
	getLastEmacsMark?: (p?: Point) => Point | undefined;
	emacsMarkForSelection?: (replacement?: Point) => Point;
}

export interface TabstopManagerEditorExtension {
	tabstopManager?: import("./snippets").TabstopManager;
	insertSnippet(content: any, options: {}): void;
	expandSnippet(options: {}): any;
}

export interface EditorEvents extends AcePopupEventsExtension {
	"change": (delta: Delta, emitter: Editor) => void;
	"changeSelection": (e: void, emitter: Editor) => void;
	"input": (e: void, emitter: Editor) => void;
	/**
	 * Emitted whenever the [[EditSession]] changes.
	 * @param e An object with two properties, `oldSession` and `session`, that represent the old and new [[EditSession]]s.
	 **/
	"changeSession": (e: { oldSession: EditSession, session: EditSession }, emitter: Editor) => void;
	"blur": (e: any, emitter: Editor) => void;
	"mousedown": (e: MouseEvent, emitter: Editor) => void;
	"mousemove": (e: MouseEvent & { scrollTop?: any }, emitter: Editor) => void;
	"changeStatus": (e: any, emitter: Editor) => void;
	"keyboardActivity": (e: any, emitter: Editor) => void;
	"mousewheel": (e: MouseEvent, emitter: Editor) => void;
	"mouseup": (e: MouseEvent, emitter: Editor) => void;
	"beforeEndOperation": (e: any, emitter: Editor) => void;
	"nativecontextmenu": (e: any, emitter: Editor) => void;
	"destroy": (e: any, emitter: Editor) => void;
	"focus": (e: any, emitter: Editor) => void;
	/**
	 * Emitted when text is copied.
	 * @param text The copied text
	 **/
	"copy": (e: { text: string }, emitter: Editor) => void;
	/**
	 * Emitted when text is pasted.
	 **/
	"paste": (e: { text: string, event?: ClipboardEvent }, emitter: Editor) => void;
	/**
	 * Emitted when the selection style changes, via [[Editor.setSelectionStyle]].
	 * @param data Contains one property, `data`, which indicates the new selection style
	 **/
	"changeSelectionStyle": (data: "fullLine" | "screenLine" | "text" | "line", emitter: Editor) => void;
	"changeMode": (e: { mode?: Ace.SyntaxMode, oldMode?: Ace.SyntaxMode }, emitter: Editor) => void;

	//from searchbox extension
	"findSearchBox": (e: { match: boolean }, emitter: Editor) => void;

	//from code_lens extension
	"codeLensClick": (e: any, emitter: Editor) => void;

	"select": (e: void, emitter: Editor) => void;
	"gutterkeydown": (e: GutterKeyboardEvent, emitter: Editor) => void;
	"gutterclick": (e: MouseEvent, emitter: Editor) => void;
	"guttermousedown": (e: MouseEvent, emitter: Editor) => void;
	"gutterdblclick": (e: MouseEvent, emitter: Editor) => void;
	"showGutterTooltip": (e: GutterTooltip, emitter: Editor) => void;
	"hideGutterTooltip": (e: GutterTooltip, emitter: Editor) => void;
	"compositionStart": (e: void, emitter: Editor) => void;

	// from incremental search extension
	"incrementalSearchSettingChanged": (e: {isEnabled: boolean}, emitter: Editor) => void;

	// from default commands extension
	"cut": (e: Range, emitter: Editor) => void;
}

export interface EditorOptions extends
	EditSessionOptions,
	MouseHandlerOptions,
	VirtualRendererOptions,
	IncrementalSearchOptions,
	ElasticTabstopsOptionsEditorExtension,
	EmmetOptionsEditorExtension
{
	selectionStyle: "fullLine" | "screenLine" | "text" | "line";
	highlightActiveLine: boolean;
	highlightSelectedWord: boolean;
	readOnly: boolean;
	copyWithEmptySelection: boolean;
	cursorStyle: 'ace' | 'slim' | 'smooth' | 'wide';
	mergeUndoDeltas: true | false | 'always';
	behavioursEnabled: boolean;
	wrapBehavioursEnabled: boolean;
	enableAutoIndent: boolean;
	enableBasicAutocompletion: boolean | Ace.Completer[];
	enableLiveAutocompletion: boolean | Ace.Completer[];
	liveAutocompletionDelay: number;
	liveAutocompletionThreshold: number;
	enableSnippets: boolean;
	autoScrollEditorIntoView: boolean;
	keyboardHandler: string | null;
	placeholder: string;
	value: string;
	session: EditSession;
	relativeLineNumbers: boolean;
	enableMultiselect: boolean;
	enableKeyboardAccessibility: boolean;
	enableCodeLens: boolean; // @file ext/code_lens
	textInputAriaLabel: string;
	enableMobileMenu: boolean;
}

export interface Editor extends EventEmitter<EditorEvents>,
		EditorMultiSelectProperties,
		OptionsProvider<EditorOptions>,
		CodeLenseEditorExtension, ElasticTabstopsEditorExtension,
		TextareaEditorExtension, PromptEditorExtension, OptionsEditorExtension, 
		EmacsEditorExtension, TabstopManagerEditorExtension {
	session: EditSession;
	$mergeUndoDeltas?: any,
	$highlightSelectedWord?: boolean,
	$updatePlaceholder?: Function,
	$cursorStyle?: string,
	$readOnly?: any,
	$highlightActiveLine?: any,
	$enableAutoIndent?: any,
	$copyWithEmptySelection?: any
	$selectionStyle?: string,
	env?: any;
	widgetManager?: LineWidgets,
	completer?: Autocomplete | InlineAutocomplete,
	completers: Completer[],
	$highlightTagPending?: boolean,
	showKeyboardShortcuts?: () => void,
	showSettingsMenu?: () => void,
	searchBox?: SearchBox,
	_eventRegistry?: any,
	$textInputAriaLabel?: string;
	$emacsModeHandler?: import("./keyboard/emacs").EmacsKeyboardHandler;
	$handlesEmacsOnCopy?: boolean;
}

/**
 * The main entry point into the Ace functionality.
 *
 * The `Editor` manages the [[EditSession]] (which manages [[Document]]s), as well as the [[VirtualRenderer]], which draws everything to the screen.
 *
 * Event sessions dealing with the mouse and keyboard are bubbled up from `Document` to the `Editor`, which decides what to do with them.
 **/
export class Editor extends EventEmitter<EditorEvents> {
	readonly id: string = "editor" + (++Editor.$uid);
	private static $uid: number = 0;
	public session: EditSession;
	public $toDestroy: any[] = [];
	readonly renderer: VirtualRenderer;
	readonly container: Text;
	readonly commands: CommandManager;
	readonly textInput: TextInput;
	public $mouseHandler: MouseHandler;
	public keyBinding: KeyBinding;
	public $search: Search;
	private _$emitInputEvent: ReturnType<typeof lang.delayedCall>;
	readonly window: Window;

	/**
	 * Creates a new `Editor` object.
	 *
	 * @param {VirtualRenderer} renderer Associated `VirtualRenderer` that draws everything
	 * @param {EditSession} [session] The `EditSession` to refer to
	 * @param {Partial<EditorOptions>} [options] The default options
	 **/
	constructor(renderer: VirtualRenderer, session?: EditSession, options?: Partial<EditorOptions>) {
		super();
		const container = renderer.getContainerElement();
		this.container = container;
		this.renderer = renderer;
		this.window = renderer.window;
		this.commands = new CommandManager(useragent.macOS ? "mac" : "win", defaultCommands);
		this.textInput = new TextInput(renderer.getTextAreaContainer(), this);
		this.renderer.textarea = this.textInput.getElement();
		// TODO detect touch event support
		this.$mouseHandler = new MouseHandler(this);
		new FoldHandler(this);
		this.keyBinding = new KeyBinding(this);
		this.$search = new Search().set({ wrap: true });

		this.$historyTracker = this.$historyTracker.bind(this);
		this.commands.on("exec", this.$historyTracker);

		this.$initOperationListeners();

		this._$emitInputEvent = lang.delayedCall(()=>{
			this._signal("input", void 0, this);
			if (this.session && !this.session.destroyed)
				this.session.bgTokenizer.scheduleStart();
		});

		this.on("change", function(_, _self) {
			_self._$emitInputEvent.schedule(31);
		});

		this.setSession(session || options && options.session || new EditSession(""));
		config.resetOptions(this);
		if (options)
			this.setOptions(options);
		config._signal("editor", this);
	}

	$initOperationListeners() {
		this.commands.on("exec", this.startOperation.bind(this), true);
		this.commands.on("afterExec", this.endOperation.bind(this), true);
	}

	startOperation(e?: Operation) {
		this.session.startOperation(e);
	}

	endOperation(e?: Operation) {
		this.session.endOperation(e ? e.command: void 0);
	}

	private $onStartOperation = (e?: Operation) => {
		this.curOp = this.session.curOp!;
		this.curOp.scrollTop = this.renderer.scrollTop;
		this.prevOp = this.session.prevOp || {};

		if (!e) {
			this.previousCommand = void 0;
		}
	}

	private previousCommand?: string;
	public curOp?: Operation;
	public prevOp: Operation = {};
	public selection: Selection;
	private $lastSel?: Ace.Range | Ace.Range[];
	private $mergeableCommands = ["backspace", "del", "insertstring"];
	private $toggleWordPairs = [
		["first", "last"],
		["true", "false"],
		["yes", "no"],
		["width", "height"],
		["top", "bottom"],
		["right", "left"],
		["on", "off"],
		["x", "y"],
		["get", "set"],
		["max", "min"],
		["horizontal", "vertical"],
		["show", "hide"],
		["add", "remove"],
		["up", "down"],
		["before", "after"],
		["even", "odd"],
		["in", "out"],
		["inside", "outside"],
		["next", "previous"],
		["increase", "decrease"],
		["attach", "detach"],
		["&&", "||"],
		["==", "!="]
	];

	private $onEndOperation = (e?: Ace.Command) => {
		if (this.curOp && this.session) {
			if (e && e.returnValue === 0) {
				this.curOp = void 0;
				return;
			}
			this._signal("beforeEndOperation", void 0, this);
			if (!this.curOp) return;

			var command = this.curOp.command;
			var scrollIntoView = command && command.scrollIntoView as string;
			if (scrollIntoView) {
				switch (scrollIntoView) {
					case "center-animate":
						scrollIntoView = "animate";
					/* fall through */
					case "center":
						this.renderer.scrollCursorIntoView(void 0, 0.5);
						break;
					case "animate":
					case "cursor":
						this.renderer.scrollCursorIntoView();
						break;
					case "selectionPart":
						var range = this.selection.getRange();
						var config = this.renderer.layerConfig;
						if (range.start.row >= config.lastRow || range.end.row <= config.firstRow) {
							this.renderer.scrollSelectionIntoView(this.selection.anchor, this.selection.lead);
						}
						break;
					default:
						break;
				}
				if (scrollIntoView == "animate")
					this.renderer.animateScrolling(this.curOp.scrollTop!);
			}

			this.$lastSel = this.session.selection.toJSON();
			this.prevOp = this.curOp;
			this.curOp = void 0;
		}
	}

	private mergeNextCommand?: boolean;
	private sequenceStartTime: number = 0;

	/**
	 * @param e
	 */
	$historyTracker(e: Operation) {
		if (!this.$mergeUndoDeltas)
			return;

		var prev = this.prevOp;
		var mergeableCommands = this.$mergeableCommands;
		// previous command was the same
		var shouldMerge = prev.command && (e.command!.name == prev.command.name);
		if (e.command!.name == "insertstring") {
			var text = e.args as string;
			if (this.mergeNextCommand === undefined)
				this.mergeNextCommand = true;

			shouldMerge = shouldMerge
				&& this.mergeNextCommand // previous command allows to coalesce with
				&& (!/\s/.test(text) || /\s/.test(prev.args)); // previous insertion was of same type

			this.mergeNextCommand = true;
		} else {
			shouldMerge = shouldMerge
				&& mergeableCommands.indexOf(e.command!.name!) !== -1; // the command is mergeable
		}

		if (
			this.$mergeUndoDeltas != "always"
			&& Date.now() - this.sequenceStartTime > 2000
		) {
			shouldMerge = false; // the sequence is too long
		}

		if (shouldMerge)
			this.session.mergeUndoDeltas = true;
		else if (mergeableCommands.indexOf(e.command!.name!) !== -1)
			this.sequenceStartTime = Date.now();
	}

	private $keybindingId?: string;

	/**
	 * Sets a new key handler, such as "vim" or "windows".
	 * @param {String | KeyboardHandler | null} keyboardHandler The new key handler
	 * @param {() => void} [cb]
	 **/
	setKeyboardHandler(keyboardHandler?: string | KeyboardHandler, cb?: () => void) {
		if (keyboardHandler && typeof keyboardHandler === "string" && keyboardHandler != "ace") {
			this.$keybindingId = keyboardHandler;
			var _self = this;
			config.loadModule(["keybinding", keyboardHandler], function(module) {
				if (_self.$keybindingId == keyboardHandler)
					_self.keyBinding.setKeyboardHandler(module && module.handler);
				cb && cb();
			});
		} else {
			this.$keybindingId = void 0;
			this.keyBinding.setKeyboardHandler(keyboardHandler as KeyboardHandler);
			cb && cb();
		}
	}

	/**
	 * Returns the keyboard handler, such as "vim" or "windows".
	 * @returns {Object}
	 **/
	getKeyboardHandler() {
		return this.keyBinding.getKeyboardHandler();
	}

	/**
	 * Sets a new editsession to use. This method also emits the `'changeSession'` event.
	 * @param {EditSession} session The new session to use
	 **/
	setSession(session: EditSession) {
		if (this.session == session)
			return;
		if (!session)
			return;

		// make sure operationEnd events are not emitted to wrong session
		if (this.curOp) this.endOperation();
		this.curOp = {};

		var oldSession = this.session;
		if (oldSession) {
			this.session.off("change", this.$onDocumentChange);
			this.session.off("changeMode", this.$onChangeMode);
			this.session.off("tokenizerUpdate", this.$onTokenizerUpdate);
			this.session.off("changeTabSize", this.renderer.$onChangeTabSize);
			this.session.off("changeWrapLimit", this.$onChangeWrapLimit);
			this.session.off("changeWrapMode", this.$onChangeWrapMode);
			this.session.off("changeFold", this.$onChangeFold);
			this.session.off("changeFrontMarker", this.$onChangeFrontMarker);
			this.session.off("changeBackMarker", this.$onChangeBackMarker);
			this.session.off("changeBreakpoint", this.$onChangeBreakpoint);
			this.session.off("changeAnnotation", this.$onChangeAnnotation);
			this.session.off("changeOverwrite", this.$onCursorChange);
			this.session.off("changeScrollTop", this.$onScrollTopChange);
			this.session.off("changeScrollLeft", this.$onScrollLeftChange);
			this.session.off("startOperation", this.$onStartOperation);
			this.session.off("endOperation", this.$onEndOperation);

			var selection = this.session.getSelection();
			selection.off("changeCursor", this.$onCursorChange);
			selection.off("changeSelection", this.$onSelectionChange);
		}

		this.session = session;
		session.on("change", this.$onDocumentChange);
		this.renderer.setSession(session);
		session.on("changeMode", this.$onChangeMode);
		session.on("tokenizerUpdate", this.$onTokenizerUpdate);
		session.on("changeTabSize", this.renderer.$onChangeTabSize);
		session.on("changeWrapLimit", this.$onChangeWrapLimit);
		session.on("changeWrapMode", this.$onChangeWrapMode);
		session.on("changeFold", this.$onChangeFold);
		this.session.on("changeFrontMarker", this.$onChangeFrontMarker);
		this.session.on("changeBackMarker", this.$onChangeBackMarker);
		this.session.on("changeBreakpoint", this.$onChangeBreakpoint);
		this.session.on("changeAnnotation", this.$onChangeAnnotation);
		this.session.on("changeOverwrite", this.$onCursorChange);
		this.session.on("changeScrollTop", this.$onScrollTopChange);
		this.session.on("changeScrollLeft", this.$onScrollLeftChange);
		this.selection = session.getSelection();
		this.selection.on("changeCursor", this.$onCursorChange);
		this.selection.on("changeSelection", this.$onSelectionChange);
		this.session.on("startOperation", this.$onStartOperation);
		this.session.on("endOperation", this.$onEndOperation);

		this.$onChangeMode({});
		this.$onCursorChange();
		this.$onScrollTopChange();
		this.$onScrollLeftChange();
		this.$onSelectionChange();
		this.$onChangeFrontMarker();
		this.$onChangeBackMarker();
		this.$onChangeBreakpoint();
		this.$onChangeAnnotation();
		this.session.getUseWrapMode() && this.renderer.adjustWrapLimit();
		this.renderer.updateFull();

		this._signal("changeSession", { session: session, oldSession: oldSession }, this);

		this.curOp = void 0;

		oldSession && oldSession._signal("changeEditor", {oldEditor: this}, oldSession);
		if (oldSession) oldSession.$editor = null;
		session && session._signal("changeEditor", {editor: this}, session);
		if (session) session.$editor = this;

		if (session && !session.destroyed)
			session.bgTokenizer.scheduleStart();
	}

	/**
	 * Returns the current session being used.
	 * @returns {EditSession}
	 **/
	getSession() {
		return this.session;
	}

	/**
	 * Sets the current document to `val`.
	 * @param {String} val The new value to set for the document
	 * @param {Number} [cursorPos] Where to set the new value. `undefined` or 0 is selectAll, -1 is at the document start, and 1 is at the end
	 *
	 * @returns {String} The current document value
	 * @related Document.setValue
	 **/
	setValue(val: string, cursorPos?: number) {
		this.session.doc.setValue(val);

		if (!cursorPos)
			this.selectAll();
		else if (cursorPos == 1)
			this.navigateFileEnd();
		else if (cursorPos == -1)
			this.navigateFileStart();

		return val;
	}

	/**
	 * Returns the current session's content.
	 *
	 * @returns {String}
	 * @related EditSession.getValue
	 **/
	getValue() {
		return this.session.getValue();
	}

	/**
	 *
	 * Returns the currently highlighted selection.
	 * @returns {Selection} The selection object
	 **/
	getSelection() {
		return this.selection;
	}

	/**
	 * {:VirtualRenderer.onResize}
	 * @param {Boolean} [force] If `true`, recomputes the size, even if the height and width haven't changed
	 * @related VirtualRenderer.onResize
	 **/
	resize(force?: boolean) {
		this.renderer.onResize(force);
	}

	/**
	 * {:VirtualRenderer.setTheme}
	 * @param {string | Ace.Theme} theme The path to a theme
	 * @param {() => void} [cb] optional callback called when theme is loaded
	 **/
	setTheme(theme: string | Ace.Theme, cb?: () => void) {
		this.renderer.setTheme(theme, cb);
	}

	/**
	 * {:VirtualRenderer.getTheme}
	 *
	 * @returns {String} The set theme
	 * @related VirtualRenderer.getTheme
	 **/
	getTheme() {
		return this.renderer.getTheme();
	}

	/**
	 * {:VirtualRenderer.setStyle}
	 * @param {String} style A class name
	 * @param {boolean} [incluude] pass false to remove the class name
	 * @related VirtualRenderer.setStyle
	 **/
	setStyle(style: string, incluude?: boolean) {
		this.renderer.setStyle(style, incluude);
	}

	/**
	 * {:VirtualRenderer.unsetStyle}
	 * @related VirtualRenderer.unsetStyle
	 * @param {string} style
	 */
	unsetStyle(style: string) {
		this.renderer.unsetStyle(style);
	}

	/**
	 * Gets the current font size of the editor text.
	 * @return {number}
	 */
	getFontSize() {
		return this.getOption("fontSize") || this.container.textSize.value;
	}

	/**
	 * Set a new font size (in pixels) for the editor text.
	 * @param {number} size A font size ( _e.g._ "12px")
	 **/
	setFontSize(size: number) {
		this.setOption("fontSize", size);
	}

	private $highlightPending?: boolean;

	$highlightBrackets() {
		if (this.$highlightPending) {
			return;
		}

		// perform highlight async to not block the browser during navigation
		var self = this;
		this.$highlightPending = true;
		setTimeout(function () {
			self.$highlightPending = false;
			var session = self.session;
			if (!session || session.destroyed) return;
			if (session.$bracketHighlight) {
				session.$bracketHighlight.markerIds.forEach(function(id) {
					session.removeMarker(id);
				});
				session.$bracketHighlight = void 0;
			}
			var pos = self.getCursorPosition();
			var handler = self.getKeyboardHandler();
			var isBackwards = handler && handler.$getDirectionForHighlight && handler.$getDirectionForHighlight(self);
			var ranges = session.getMatchingBracketRanges(pos, isBackwards);

			if (!ranges) {
				var iterator = new TokenIterator(session, pos.row, pos.column);
				var token = iterator.getCurrentToken();

				if (token && /\b(?:tag-open|tag-name)/.test(token.type)) {
					var tagNamesRanges = session.getMatchingTags(pos);
					if (tagNamesRanges) {
						ranges = [
							tagNamesRanges.openTagName.isEmpty() ? tagNamesRanges.openTag : tagNamesRanges.openTagName,
							tagNamesRanges.closeTagName.isEmpty() ? tagNamesRanges.closeTag : tagNamesRanges.closeTagName
						];
					}
				}
			}
			if (!ranges && session.$mode.getMatching)
				ranges = session.$mode.getMatching(self.session);
			if (!ranges) {
				if (self.getHighlightIndentGuides()) self.renderer.$textLayer.$highlightIndentGuide();
				return;
			}

			var markerType = "ace_bracket";
			if (!Array.isArray(ranges)) {
				ranges = [ranges];
			} else if (ranges.length == 1) {
				markerType = "ace_error_bracket";
			}

			// show adjacent ranges as one
			if (ranges.length == 2) {
				if (Range.comparePoints(ranges[0].end, ranges[1].start) == 0)
					ranges = [Range.fromPoints(ranges[0].start, ranges[1].end)];
				else if (Range.comparePoints(ranges[0].start, ranges[1].end) == 0)
					ranges = [Range.fromPoints(ranges[1].start, ranges[0].end)];
			}

			session.$bracketHighlight = {
				ranges: ranges,
				markerIds: ranges.map(function(range) {
					return session.addMarker(range, markerType, "text");
				})
			};
			if (self.getHighlightIndentGuides()) self.renderer.$textLayer.$highlightIndentGuide();
		}, 50);
	}

	/**
	 *
	 * Brings the current `textInput` into focus.
	 **/
	focus() {
		this.textInput.focus();
	}

	/**
	 * Returns `true` if the current `textInput` is in focus.
	 * @return {Boolean}
	 **/
	isFocused() {
		return this.textInput.isFocused();
	}

	/**
	 *
	 * Blurs the current `textInput`.
	 **/
	blur() {
		this.textInput.blur();
	}

	public $isFocused?: boolean;

	/**
	 * Emitted once the editor comes into focus.
	 * @internal
	 **/
	onFocus(e?: any) {
		if (this.$isFocused)
			return;
		this.$isFocused = true;
		this.renderer.showCursor();
		this.renderer.visualizeFocus();
		this._emit("focus", e, this);
	}

	/**
	 * Emitted once the editor has been blurred.
	 * @internal
	 **/
	onBlur(e?: any) {
		if (!this.$isFocused)
			return;
		this.$isFocused = false;
		this.renderer.hideCursor();
		this.renderer.visualizeBlur();
		this._emit("blur", e, this);
	}

	/**
	 */
	$cursorChange() {
		this.renderer.updateCursor();
		this.$highlightBrackets();
		this.$updateHighlightActiveLine();
	}

	/**
	 * Emitted whenever the document is changed.
	 * @param {import("../ace-internal").Ace.Delta} delta Contains a single property, `data`, which has the delta of changes
	 * @internal
	 **/
	private $onDocumentChange = (delta: Ace.Delta) => {
		// Rerender and emit "change" event.
		var wrap = this.session.$useWrapMode;
		var lastRow = (delta.start.row == delta.end.row ? delta.end.row : Infinity);
		this.renderer.updateLines(delta.start.row, lastRow, wrap);

		this._signal("change", delta, this);

		// Update cursor because tab characters can influence the cursor position.
		this.$cursorChange();
	}

	/**
	 * @internal
	 */
	private $onTokenizerUpdate = (e: { data: { first: number, last: number } }) => {
		var rows = e.data;
		this.renderer.updateLines(rows.first, rows.last);
	}

	/**
	 * @internal
	 */
	private $onScrollTopChange = () => {
		this.renderer.scrollToY(this.session.getScrollTop());
	}

	/**
	 * @internal
	 */
	private $onScrollLeftChange = () => {
		this.renderer.scrollToX(this.session.getScrollLeft());
	}

	/**
	 * Emitted when the selection changes.
	 * @internal
	 **/
	$onCursorChange = () => {
		this.$cursorChange();
		this._signal("changeSelection", void 0, this);
	}

	/**
	 */
	$updateHighlightActiveLine() {
		var session = this.getSession();
		var highlight: Point | false = false;
		if (this.$highlightActiveLine) {
			if (this.$selectionStyle != "line" || !this.selection.isMultiLine())
				highlight = this.getCursorPosition();
			if (this.renderer.theme && this.renderer.theme.$selectionColorConflict && !this.selection.isEmpty())
				highlight = false;
			if (this.renderer.$maxLines && this.session.getLength() === 1 && !(this.renderer.$minLines! > 1))
				highlight = false;
		}

		if (session.$highlightLineMarker && !highlight) {
			session.removeMarker(session.$highlightLineMarker.id);
			session.$highlightLineMarker = void 0;
		} else if (!session.$highlightLineMarker && highlight) {
			var range = new Range(highlight.row, highlight.column, highlight.row, Infinity);
			range.id = session.addMarker(range, "ace_active-line", "screenLine");
			session.$highlightLineMarker = range;
		} else if (highlight) {
			session.$highlightLineMarker!.start.row = highlight.row;
			session.$highlightLineMarker!.end.row = highlight.row;
			session.$highlightLineMarker!.start.column = highlight.column;
			session._signal("changeBackMarker", void 0, session);
		}
	}

	/**
	 * @param e
	 * @internal
	 */
	$onSelectionChange = (e?: any) => {
		var session = this.session;

		if (session.$selectionMarker) {
			session.removeMarker(session.$selectionMarker);
		}
		session.$selectionMarker = void 0;

		if (!this.selection.isEmpty()) {
			var range = this.selection.getRange();
			var style = this.getSelectionStyle();
			session.$selectionMarker = session.addMarker(range, "ace_selection", style);
		} else {
			this.$updateHighlightActiveLine();
		}

		var re = this.$highlightSelectedWord && this.$getSelectionHighLightRegexp();
		this.session.highlight(re || void 0);

		this._signal("changeSelection", void 0, this);
	}

	$getSelectionHighLightRegexp() {
		var session = this.session;

		var selection = this.getSelectionRange();
		if (selection.isEmpty() || selection.isMultiLine())
			return;

		var startColumn = selection.start.column;
		var endColumn = selection.end.column;
		var line = session.getLine(selection.start.row);

		var needle = line.substring(startColumn, endColumn);
		// maximum allowed size for regular expressions in 32000,
		// but getting close to it has significant impact on the performance
		if (needle.length > 5000 || !/[\w\d]/.test(needle))
			return;

		var re = this.$search.$assembleRegExp({
			wholeWord: true,
			caseSensitive: true,
			needle: needle
		}) as RegExp | false;

		var wordWithBoundary = line.substring(startColumn - 1, endColumn + 1);
		if (re && !re.test(wordWithBoundary))
			return;

		return re;
	}

	/**
	 * @internal
	 */
	private $onChangeFrontMarker = () => {
		this.renderer.updateFrontMarkers();
	}

	/**
	 * @internal
	 */
	private $onChangeBackMarker = () => {
		this.renderer.updateBackMarkers();
	}

	/**
	 * @internal
	 */
	private $onChangeBreakpoint = () => {
		this.renderer.updateBreakpoints();
	}

	/**
	 * @internal
	 */
	private $onChangeAnnotation = () => {
		this.renderer.setAnnotations(this.session.getAnnotations());
	}

	/**
	 * @param e
	 * @internal
	 */
	private $onChangeMode = (e: { mode?: Ace.SyntaxMode, oldMode?: Ace.SyntaxMode }) => {
		this.renderer.updateText();
		this._emit("changeMode", e, this);
	}

	/**
	 * @internal
	 */
	private $onChangeWrapLimit = () => {
		this.renderer.updateFull();
	}

	/**
	 * @internal
	 */
	private $onChangeWrapMode = () => {
		this.renderer.onResize(true);
	}

	/**
	 * @internal
	 */
	private $onChangeFold = () => {
		// Update the active line marker as due to folding changes the current
		// line range on the screen might have changed.
		this.$updateHighlightActiveLine();
		// TODO: This might be too much updating. Okay for now.
		this.renderer.updateFull();
	}

	/**
	 * Returns the string of text currently highlighted.
	 * @returns {String}
	 **/
	getSelectedText() {
		return this.session.getTextRange(this.getSelectionRange());
	}


	/**
	 * Returns the string of text currently highlighted.
	 * @returns {String}
	 **/
	getCopyText () {
		var text = this.getSelectedText();
		var nl = this.session.doc.getNewLineCharacter();
		var copyLine= false;
		if (!text && this.$copyWithEmptySelection) {
			copyLine = true;
			var ranges = this.selection.getAllRanges();
			for (var i = 0; i < ranges.length; i++) {
				var range = ranges[i];
				if (i && ranges[i - 1].start.row == range.start.row)
					continue;
				text += this.session.getLine(range.start.row) + nl;
			}
		}
		var e = {text: text};
		this._signal("copy", e, this);
		clipboard.setLineMode(copyLine ? e.text : false);
		return e.text;
	}

	/**
	 * Called whenever a text "copy" happens.
	 * @internal
	 **/
	onCopy() {
		this.commands.exec("copy", this);
	}

	/**
	 * Called whenever a text "cut" happens.
	 * @internal
	 **/
	onCut() {
		this.commands.exec("cut", this);
	}


	/**
	 * Called whenever a text "paste" happens.
	 * @param {String} text The pasted text
	 * @param {ClipboardEvent} [event]
	 * @internal
	 **/
	onPaste(text: string, event?: ClipboardEvent) {
		var e = {text: text, event: event};
		this.commands.exec("paste", this, e);
	}

	public inVirtualSelectionMode?: boolean;

	/**
	 *
	 * @param {string | {text: string, event?: ClipboardEvent}} e
	 * @returns {boolean}
	 */
	$handlePaste(e: string | {text: string, event?: ClipboardEvent}) {
		if (typeof e == "string")
			e = {text: e};
		this._signal("paste", e, this);
		var text = e.text;

		var lineMode = text === clipboard.lineMode;
		var session = this.session;
		if (!this.inMultiSelectMode || this.inVirtualSelectionMode) {
			if (lineMode)
				session.insert({ row: this.selection.lead.row, column: 0 }, text);
			else
				this.insert(text);
		} else if (lineMode) {
			this.selection.rangeList!.ranges.forEach(function(range) {
				session.insert({ row: range.start.row, column: 0 }, text);
			});
		} else {
			var lines = text.split(/\r\n|\r|\n/);
			var ranges = this.selection.rangeList!.ranges;

			var isFullLine = lines.length == 2 && (!lines[0] || !lines[1]);
			if (lines.length != ranges.length || isFullLine)
				return this.commands.exec("insertstring", this, text);

			for (var i = ranges.length; i--;) {
				var range = ranges[i];
				if (!Range.isEmpty(range))
					session.remove(range);

				session.insert(range.start, lines[i]);
			}
		}
	}

	/**
	 *
	 * @param {BindingCmd} command
	 * @param [args]
	 * @return {boolean}
	 */
	execCommand(command: BindingCmd, args?: any) {
		return this.commands.exec(command, this, args);
	}

	/**
	 * Inserts `text` into wherever the cursor is pointing.
	 * @param {String} text The new text to add
	 * @param {boolean} [pasted]
	 **/
	insert(text: string, pasted?: boolean) {
		var session = this.session;
		var mode = session.getMode();
		var cursor = this.getCursorPosition();

		if (this.getBehavioursEnabled() && !pasted) {
			// Get a transform if the current mode wants one.
			var transform = mode.transformAction(session.getState(cursor.row), 'insertion', this, session, text);
			if (transform) {
				if (text !== transform.text) {
					// keep automatic insertion in a separate delta, unless it is in multiselect mode
					if (!this.inVirtualSelectionMode) {
						this.session.mergeUndoDeltas = false;
						this.mergeNextCommand = false;
					}
				}
				text = transform.text;

			}
		}

		if (text == "\t")
			text = this.session.getTabString();

		// remove selected text
		if (!this.selection.isEmpty()) {
			var range = this.getSelectionRange();
			cursor = this.session.remove(range);
			this.clearSelection();
		}
		else if (this.session.getOverwrite() && text.indexOf("\n") == -1) {
			var range = Range.fromPoints(cursor, cursor);
			range.end.column += text.length;
			this.session.remove(range);
		}

		if (text == "\n" || text == "\r\n") {
			var line = session.getLine(cursor.row);
			if (cursor.column > line.search(/\S|$/)) {
				var d = line.substr(cursor.column).search(/\S|$/);
				session.doc.removeInLine(cursor.row, cursor.column, cursor.column + d);
			}
		}
		this.clearSelection();

		var start = cursor.column;
		var lineState = session.getState(cursor.row);
		var line = session.getLine(cursor.row);
		var shouldOutdent = mode.checkOutdent(lineState, line, text);
		session.insert(cursor, text);

		if (transform && transform.selection) {
			if (transform.selection.length == 2) { // Transform relative to the current column
				this.selection.setSelectionRange(
					new Range(cursor.row, start + transform.selection[0],
						cursor.row, start + transform.selection[1]));
			} else { // Transform relative to the current row.
				this.selection.setSelectionRange(
					new Range(cursor.row + transform.selection[0],
						transform.selection[1],
						cursor.row + transform.selection[2],
						transform.selection[3]));
			}
		}
		if (this.$enableAutoIndent) {
			if (session.getDocument().isNewLine(text)) {
				var lineIndent = mode.getNextLineIndent(lineState, line.slice(0, cursor.column), session.getTabString());

				session.insert({row: cursor.row+1, column: 0}, lineIndent);
			}
			if (shouldOutdent)
				mode.autoOutdent(lineState, session, cursor.row);
		}
	}

	autoIndent() {
		var session = this.session;
		var mode = session.getMode();

		var ranges = this.selection.isEmpty()
			? [new Range(0, 0, session.doc.getLength() - 1, 0)]
			: this.selection.getAllRanges();

		/**@type{string|string[]}*/
		var prevLineState: string | string[] = "";
		var prevLine = "";
		var lineIndent = "";
		var tab = session.getTabString();
		for (var i = 0; i < ranges.length; i++) {
			var startRow = ranges[i].start.row;
			var endRow = ranges[i].end.row;

			for (var row = startRow; row <= endRow; row++) {
				if (row > 0) {
					prevLineState = session.getState(row - 1);
					prevLine = session.getLine(row - 1);
					lineIndent = mode.getNextLineIndent(prevLineState, prevLine, tab);
				}

				var line = session.getLine(row);
				var currIndent = mode.$getIndent(line);
				if (lineIndent !== currIndent) {
					if (currIndent.length > 0) {
						var range = new Range(row, 0, row, currIndent.length);
						session.remove(range);
					}
					if (lineIndent.length > 0) {
						session.insert({row: row, column: 0}, lineIndent);
					}
				}

				mode.autoOutdent(prevLineState, session, row);
			}
		}
	}

	/**
	 *
	 * @param text
	 * @param composition
	 * @returns {*}
	 * @internal
	 */
	onTextInput(text: string, composition?: any) {
		if (!composition)
			return this.keyBinding.onTextInput(text);

		this.startOperation({command: { name: "insertstring" }});
		var applyComposition = this.applyComposition.bind(this, text, composition);
		if (this.selection.rangeCount)
			this.forEachSelection(applyComposition);
		else
			applyComposition();
		this.endOperation();
	}

	/**
	 * @param {string} [text]
	 * @param {any} [composition]
	 */
	applyComposition(text: string, composition?: any) {
		if (composition && (composition.extendLeft || composition.extendRight)) {
			var r = this.selection.getRange();
			r.start.column -= composition.extendLeft;
			r.end.column += composition.extendRight;
			if (r.start.column < 0) {
				r.start.row--;
				r.start.column += this.session.getLine(r.start.row).length + 1;
			}
			this.selection.setRange(r);
			if (!text && !r.isEmpty())
				this.remove();
		}
		if (text || !this.selection.isEmpty())
			this.insert(text, true);
		if (composition.restoreStart || composition.restoreEnd) {
			var r = this.selection.getRange();
			r.start.column -= composition.restoreStart;
			r.end.column -= composition.restoreEnd;
			this.selection.setRange(r);
		}
	}

	/**
	 * @internal
	 */
	onCommandKey(e: KeyEvent, hashId: number, keyCode: number) {
		return this.keyBinding.onCommandKey(e, hashId, keyCode);
	}

	/**
	 * Pass in `true` to enable overwrites in your session, or `false` to disable. If overwrites is enabled, any text you enter will type over any text after it. If the value of `overwrite` changes, this function also emits the `changeOverwrite` event.
	 * @param {Boolean} overwrite Defines whether or not to set overwrites
	 * @related EditSession.setOverwrite
	 **/
	setOverwrite(overwrite: boolean) {
		this.session.setOverwrite(overwrite);
	}

	/**
	 * Returns `true` if overwrites are enabled; `false` otherwise.
	 * @returns {Boolean}
	 * @related EditSession.getOverwrite
	 **/
	getOverwrite() {
		return this.session.getOverwrite();
	}

	/**
	 * Sets the value of overwrite to the opposite of whatever it currently is.
	 * @related EditSession.toggleOverwrite
	 **/
	toggleOverwrite() {
		this.session.toggleOverwrite();
	}

	/**
	 * Sets how fast the mouse scrolling should do.
	 * @param {Number} speed A value indicating the new speed (in milliseconds)
	 **/
	setScrollSpeed(speed: number) {
		this.setOption("scrollSpeed", speed);
	}

	/**
	 * Returns the value indicating how fast the mouse scroll speed is (in milliseconds).
	 * @returns {Number}
	 **/
	getScrollSpeed() {
		return this.getOption("scrollSpeed");
	}

	/**
	 * Sets the delay (in milliseconds) of the mouse drag.
	 * @param {Number} dragDelay A value indicating the new delay
	 **/
	setDragDelay(dragDelay: number) {
		this.setOption("dragDelay", dragDelay);
	}

	/**
	 * Returns the current mouse drag delay.
	 * @returns {Number}
	 **/
	getDragDelay() {
		return this.getOption("dragDelay");
	}


	/**
	 * Draw selection markers spanning whole line, or only over selected text. Default value is "line"
	 * @param {"fullLine" | "screenLine" | "text" | "line"} val The new selection style "line"|"text"
	 **/
	setSelectionStyle(val: "fullLine" | "screenLine" | "text" | "line") {
		this.setOption("selectionStyle", val);
	}

	/**
	 * Returns the current selection style.
	 * @returns {EditorOptions["selectionStyle"]}
	 **/
	getSelectionStyle() {
		return this.getOption("selectionStyle");
	}

	/**
	 * Determines whether or not the current line should be highlighted.
	 * @param {Boolean} shouldHighlight Set to `true` to highlight the current line
	 **/
	setHighlightActiveLine(shouldHighlight: boolean) {
		this.setOption("highlightActiveLine", shouldHighlight);
	}
	/**
	 * Returns `true` if current lines are always highlighted.
	 * @return {Boolean}
	 **/
	getHighlightActiveLine() {
		return this.getOption("highlightActiveLine");
	}

	/**
	 * @param {boolean} shouldHighlight
	 */
	setHighlightGutterLine(shouldHighlight: boolean) {
		this.setOption("highlightGutterLine", shouldHighlight);
	}

	/**
	 * @returns {Boolean}
	 */
	getHighlightGutterLine() {
		return this.getOption("highlightGutterLine");
	}

	/**
	 * Determines if the currently selected word should be highlighted.
	 * @param {Boolean} shouldHighlight Set to `true` to highlight the currently selected word
	 **/
	setHighlightSelectedWord(shouldHighlight: boolean) {
		this.setOption("highlightSelectedWord", shouldHighlight);
	}

	/**
	 * Returns `true` if currently highlighted words are to be highlighted.
	 * @returns {Boolean}
	 **/
	getHighlightSelectedWord() {
		return this.$highlightSelectedWord;
	}

	/**
	 * @param {boolean} shouldAnimate
	 */
	setAnimatedScroll(shouldAnimate: boolean) {
		this.renderer.setAnimatedScroll(shouldAnimate);
	}

	/**
	 * @return {boolean}
	 */
	getAnimatedScroll(){
		return this.renderer.getAnimatedScroll();
	}

	/**
	 * If `showInvisibles` is set to `true`, invisible characters&mdash;like spaces or new lines&mdash;are show in the editor.
	 * @param {Boolean} showInvisibles Specifies whether or not to show invisible characters
	 **/
	setShowInvisibles(showInvisibles: boolean) {
		this.renderer.setShowInvisibles(showInvisibles);
	}

	/**
	 * Returns `true` if invisible characters are being shown.
	 * @returns {Boolean}
	 **/
	getShowInvisibles() {
		return this.renderer.getShowInvisibles();
	}

	/**
	 * @param {boolean} display
	 */
	setDisplayIndentGuides(display: boolean) {
		this.renderer.setDisplayIndentGuides(display);
	}

	/**
	 * @return {boolean}
	 */
	getDisplayIndentGuides() {
		return this.renderer.getDisplayIndentGuides();
	}

	/**
	 * @param {boolean} highlight
	 */
	setHighlightIndentGuides(highlight: boolean) {
		this.renderer.setHighlightIndentGuides(highlight);
	}

	/**
	 * @return {boolean}
	 */
	getHighlightIndentGuides() {
		return this.renderer.getHighlightIndentGuides();
	}

	/**
	 * If `showPrintMargin` is set to `true`, the print margin is shown in the editor.
	 * @param {Boolean} showPrintMargin Specifies whether or not to show the print margin
	 *
	 **/
	setShowPrintMargin(showPrintMargin: boolean) {
		this.renderer.setShowPrintMargin(showPrintMargin);
	}

	/**
	 * Returns `true` if the print margin is being shown.
	 * @returns {Boolean}
	 **/
	getShowPrintMargin() {
		return this.renderer.getShowPrintMargin();
	}

	/**
	 * Sets the column defining where the print margin should be.
	 * @param {Number} showPrintMargin Specifies the new print margin
	 *
	 **/
	setPrintMarginColumn(showPrintMargin: number) {
		this.renderer.setPrintMarginColumn(showPrintMargin);
	}

	/**
	 * Returns the column number of where the print margin is.
	 * @returns {Number}
	 **/
	getPrintMarginColumn() {
		return this.renderer.getPrintMarginColumn();
	}

	private $readOnlyCallback?: (e: any) => void;
	private hoverTooltip?: HoverTooltip;

	/**
	 * If `readOnly` is true, then the editor is set to read-only mode, and none of the content can change.
	 * @param {Boolean} readOnly Specifies whether the editor can be modified or not
	 **/
	setReadOnly(readOnly: boolean) {
		this.textInput.setReadOnly(readOnly);
		if (this.destroyed) return;
		this.$resetCursorStyle();
		if (!this.$readOnlyCallback) {
			this.$readOnlyCallback = (e: any) => {
				var shouldShow = false;
				if (e && e.type == "keydown") {
					if (e && e.key && !e.ctrlKey && !e.metaKey) {
						if (e.key == " ") e.preventDefault();
						shouldShow = e.key.length == 1;
					}
					if (!shouldShow) return;
				} else if (e && e.type !== "exec") {
					shouldShow = true;
				}
				if (shouldShow) {
					if (!this.hoverTooltip) {
						this.hoverTooltip = new HoverTooltip();
					}
					// var domNode = dom.createElement("div");
					var domNode = new Text(this.container.window);
					domNode.value = nls("editor.tooltip.disable-editing", "Editing is disabled");
					if (!this.hoverTooltip.isOpen) {
						this.hoverTooltip.showForRange(this, this.getSelectionRange(), domNode);
					}
				} else if (this.hoverTooltip && this.hoverTooltip.isOpen) {
					this.hoverTooltip.hide();
				}
			};
		}
		var textArea = this.textInput.getElement();
		if (readOnly) {
			textArea.onKeyDown.on(this.$readOnlyCallback)
			this.commands.on("exec", this.$readOnlyCallback);
			this.commands.on("commandUnavailable", this.$readOnlyCallback);
		} else {
			textArea.onKeyDown.off(this.$readOnlyCallback);
			this.commands.off("exec", this.$readOnlyCallback);
			this.commands.off("commandUnavailable", this.$readOnlyCallback);
			if (this.hoverTooltip) {
				this.hoverTooltip.destroy();
				this.hoverTooltip = undefined;
			}
		}
	}

	/**
	 * Returns `true` if the editor is set to read-only mode.
	 * @returns {Boolean}
	 **/
	getReadOnly() {
		return this.getOption("readOnly");
	}

	/**
	 * Specifies whether to use behaviors or not. ["Behaviors" in this case is the auto-pairing of special characters, like quotation marks, parenthesis, or brackets.]{: #BehaviorsDef}
	 * @param {Boolean} enabled Enables or disables behaviors
	 **/
	setBehavioursEnabled(enabled: boolean) {
		this.setOption("behavioursEnabled", enabled);
	}

	/**
	 * Returns `true` if the behaviors are currently enabled. {:BehaviorsDef}
	 * @returns {Boolean}
	 **/
	getBehavioursEnabled() {
		return this.getOption("behavioursEnabled");
	}

	/**
	 * Specifies whether to use wrapping behaviors or not, i.e. automatically wrapping the selection with characters such as brackets
	 * when such a character is typed in.
	 * @param {Boolean} enabled Enables or disables wrapping behaviors
	 **/
	setWrapBehavioursEnabled(enabled: boolean) {
		this.setOption("wrapBehavioursEnabled", enabled);
	}

	/**
	 * Returns `true` if the wrapping behaviors are currently enabled.
	 * @returns {boolean}
	 **/
	getWrapBehavioursEnabled() {
		return this.getOption("wrapBehavioursEnabled");
	}

	/**
	 * Indicates whether the fold widgets should be shown or not.
	 * @param {Boolean} show Specifies whether the fold widgets are shown
	 **/
	setShowFoldWidgets(show: boolean) {
		this.setOption("showFoldWidgets", show);

	}
	/**
	 * Returns `true` if the fold widgets are shown.
	 * @return {Boolean}
	 **/
	getShowFoldWidgets() {
		return this.getOption("showFoldWidgets");
	}

	/**
	 * @param {boolean} fade
	 */
	setFadeFoldWidgets(fade: boolean) {
		this.setOption("fadeFoldWidgets", fade);
	}

	/**
	 * @returns {boolean}
	 */
	getFadeFoldWidgets() {
		return this.getOption("fadeFoldWidgets");
	}

	/**
	 * Removes the current selection or one character.
	 * @param {'left' | 'right'} [dir] The direction of the deletion to occur, either "left" or "right"
	 **/
	remove(dir?: "left" | "right") {
		if (this.selection.isEmpty()){
			if (dir == "left")
				this.selection.selectLeft();
			else
				this.selection.selectRight();
		}

		var range = this.getSelectionRange();
		if (this.getBehavioursEnabled()) {
			var session = this.session;
			var state = session.getState(range.start.row);
			var new_range = session.getMode().transformAction(state, 'deletion', this, session, range);

			if (range.end.column === 0) {
				var text = session.getTextRange(range);
				if (text[text.length - 1] == "\n") {
					var line = session.getLine(range.end.row);
					if (/^\s+$/.test(line)) {
						range.end.column = line.length;
					}
				}
			}
			if (new_range)
				// @ts-expect-error TODO: possible bug, new_range could be not a Range
				range = new_range;
		}

		this.session.remove(range);
		this.clearSelection();
	}

	/**
	 * Removes the word directly to the right of the current selection.
	 **/
	removeWordRight() {
		if (this.selection.isEmpty())
			this.selection.selectWordRight();

		this.session.remove(this.getSelectionRange());
		this.clearSelection();
	}

	/**
	 * Removes the word directly to the left of the current selection.
	 **/
	removeWordLeft() {
		if (this.selection.isEmpty())
			this.selection.selectWordLeft();

		this.session.remove(this.getSelectionRange());
		this.clearSelection();
	}

	/**
	 * Removes all the words to the left of the current selection, until the start of the line.
	 **/
	removeToLineStart() {
		if (this.selection.isEmpty())
			this.selection.selectLineStart();
		if (this.selection.isEmpty())
			this.selection.selectLeft();
		this.session.remove(this.getSelectionRange());
		this.clearSelection();
	}

	/**
	 * Removes all the words to the right of the current selection, until the end of the line.
	 **/
	removeToLineEnd() {
		if (this.selection.isEmpty())
			this.selection.selectLineEnd();

		var range = this.getSelectionRange();
		if (range.start.column == range.end.column && range.start.row == range.end.row) {
			range.end.column = 0;
			range.end.row++;
		}

		this.session.remove(range);
		this.clearSelection();
	}

	/**
	 * Splits the line at the current selection (by inserting an `'\n'`).
	 **/
	splitLine() {
		if (!this.selection.isEmpty()) {
			this.session.remove(this.getSelectionRange());
			this.clearSelection();
		}

		var cursor = this.getCursorPosition();
		this.insert("\n");
		this.moveCursorToPosition(cursor);
	}

	/**
	 * Set the "ghost" text in provided position. "Ghost" text is a kind of
	 * preview text inside the editor which can be used to preview some code
	 * inline in the editor such as, for example, code completions.
	 *
	 * @param {String} text Text to be inserted as "ghost" text
	 * @param {Point} [position] Position to insert text to
	 */
	setGhostText(text: string, position?: Point) {
		this.renderer.setGhostText(text, position);
	}

	/**
	 * Removes "ghost" text currently displayed in the editor.
	 */
	removeGhostText() {
		this.renderer.removeGhostText();
	}

	/**
	 * Transposes current line.
	 **/
	transposeLetters() {
		if (!this.selection.isEmpty()) {
			return;
		}

		var cursor = this.getCursorPosition();
		var column = cursor.column;
		if (column === 0)
			return;

		var line = this.session.getLine(cursor.row);
		var swap, range;
		if (column < line.length) {
			swap = line.charAt(column) + line.charAt(column-1);
			range = new Range(cursor.row, column-1, cursor.row, column+1);
		}
		else {
			swap = line.charAt(column-1) + line.charAt(column-2);
			range = new Range(cursor.row, column-2, cursor.row, column);
		}
		this.session.replace(range, swap);
		this.session.selection.moveToPosition(range.end);
	}

	/**
	 * Converts the current selection entirely into lowercase.
	 **/
	toLowerCase() {
		var originalRange = this.getSelectionRange();
		if (this.selection.isEmpty()) {
			this.selection.selectWord();
		}

		var range = this.getSelectionRange();
		var text = this.session.getTextRange(range);
		this.session.replace(range, text.toLowerCase());
		this.selection.setSelectionRange(originalRange);
	}

	/**
	 * Converts the current selection entirely into uppercase.
	 **/
	toUpperCase() {
		var originalRange = this.getSelectionRange();
		if (this.selection.isEmpty()) {
			this.selection.selectWord();
		}

		var range = this.getSelectionRange();
		var text = this.session.getTextRange(range);
		this.session.replace(range, text.toUpperCase());
		this.selection.setSelectionRange(originalRange);
	}

	/**
	 * Inserts an indentation into the current cursor position or indents the selected lines.
	 *
	 * @related EditSession.indentRows
	 **/
	indent() {
		var session = this.session;
		var range = this.getSelectionRange();

		if (range.start.row < range.end.row) {
			var rows = this.$getSelectedRows();
			session.indentRows(rows.first, rows.last, "\t");
			return;
		} else if (range.start.column < range.end.column) {
			var text = session.getTextRange(range);
			if (!/^\s+$/.test(text)) {
				var rows = this.$getSelectedRows();
				session.indentRows(rows.first, rows.last, "\t");
				return;
			}
		}

		var line = session.getLine(range.start.row);
		var position = range.start;
		var size = session.getTabSize();
		var column = session.documentToScreenColumn(position.row, position.column);

		if (this.session.getUseSoftTabs()) {
			var count = (size - column % size);
			var indentString = lang.stringRepeat(" ", count);
		} else {
			var count = column % size;
			while (line[range.start.column - 1] == " " && count) {
				range.start.column--;
				count--;
			}
			this.selection.setSelectionRange(range);
			indentString = "\t";
		}
		return this.insert(indentString);
	}

	/**
	 * Indents the current line.
	 * @related EditSession.indentRows
	 **/
	blockIndent() {
		var rows = this.$getSelectedRows();
		this.session.indentRows(rows.first, rows.last, "\t");
	}

	/**
	 * Outdents the current line.
	 * @related EditSession.outdentRows
	 **/
	blockOutdent() {
		var selection = this.session.getSelection();
		this.session.outdentRows(selection.getRange());
	}

	// TODO: move out of core when we have good mechanism for managing extensions
	sortLines() {
		var rows = this.$getSelectedRows();
		var session = this.session;

		var lines = [];
		for (var i = rows.first; i <= rows.last; i++)
			lines.push(session.getLine(i));

		lines.sort(function(a, b) {
			if (a.toLowerCase() < b.toLowerCase()) return -1;
			if (a.toLowerCase() > b.toLowerCase()) return 1;
			return 0;
		});

		var deleteRange = new Range(0, 0, 0, 0);
		for (var i = rows.first; i <= rows.last; i++) {
			var line = session.getLine(i);
			deleteRange.start.row = i;
			deleteRange.end.row = i;
			deleteRange.end.column = line.length;
			session.replace(deleteRange, lines[i-rows.first]);
		}
	}

	/**
	 * Given the currently selected range, this function either comments all the lines, or uncomments all of them.
	 **/
	toggleCommentLines() {
		var state = this.session.getState(this.getCursorPosition().row);
		var rows = this.$getSelectedRows();
		this.session.getMode().toggleCommentLines(state, this.session, rows.first, rows.last);
	}

	toggleBlockComment() {
		var cursor = this.getCursorPosition();
		var state = this.session.getState(cursor.row);
		var range = this.getSelectionRange();
		this.session.getMode().toggleBlockComment(state, this.session, range, cursor);
	}

	/**
	 * Works like [[EditSession.getTokenAt]], except it returns a number.
	 * @returns {any}
	 **/
	getNumberAt(row: number, column: number) {
		var _numberRx = /[\-]?[0-9]+(?:\.[0-9]+)?/g;
		_numberRx.lastIndex = 0;

		var s = this.session.getLine(row);
		while (_numberRx.lastIndex < column) {
			var m = _numberRx.exec(s);
			if(m && m.index <= column && m.index+m[0].length >= column){
				var number = {
					value: m[0],
					start: m.index,
					end: m.index+m[0].length
				};
				return number;
			}
		}
		return null;
	}

	/**
	 * If the character before the cursor is a number, this functions changes its value by `amount`.
	 * @param {Number} amount The value to change the numeral by (can be negative to decrease value)
	 **/
	modifyNumber(amount: number) {
		var row = this.selection.getCursor().row;
		var column = this.selection.getCursor().column;

		// get the char before the cursor
		var charRange = new Range(row, column-1, row, column);

		var c = this.session.getTextRange(charRange);
		// if the char is a digit
		// @ts-ignore
		if (!isNaN(parseFloat(c)) && isFinite(c)) {
			// get the whole number the digit is part of
			var nr = this.getNumberAt(row, column);
			// if number found
			if (nr) {
				var fp = nr.value.indexOf(".") >= 0 ? nr.start + nr.value.indexOf(".") + 1 : nr.end;
				var decimals = nr.start + nr.value.length - fp;

				var t = parseFloat(nr.value);
				t *= Math.pow(10, decimals);


				if(fp !== nr.end && column < fp){
					amount *= Math.pow(10, nr.end - column - 1);
				} else {
					amount *= Math.pow(10, nr.end - column);
				}

				t += amount;
				t /= Math.pow(10, decimals);
				var nnr = t.toFixed(decimals);

				//update number
				var replaceRange = new Range(row, nr.start, row, nr.end);
				this.session.replace(replaceRange, nnr);

				//reposition the cursor
				this.moveCursorTo(row, Math.max(nr.start +1, column + nnr.length - nr.value.length));

			}
		} else {
			this.toggleWord();
		}
	}

	/**
	 */
	toggleWord() {
		var row = this.selection.getCursor().row;
		var column = this.selection.getCursor().column;
		this.selection.selectWord();
		var currentState = this.getSelectedText();
		var currWordStart = this.selection.getWordRange().start.column;
		var wordParts = currentState.replace(/([a-z]+|[A-Z]+)(?=[A-Z_]|$)/g, '$1 ').split(/\s/);
		var delta = column - currWordStart - 1;
		if (delta < 0) delta = 0;
		var curLength = 0, itLength = 0;
		var that = this;
		if (currentState.match(/[A-Za-z0-9_]+/)) {
			wordParts.forEach(function (item, i) {
				itLength = curLength + item.length;
				if (delta >= curLength && delta <= itLength) {
					currentState = item;
					that.selection.clearSelection();
					that.moveCursorTo(row, curLength + currWordStart);
					that.selection.selectTo(row, itLength + currWordStart);
				}
				curLength = itLength;
			});
		}

		var wordPairs = this.$toggleWordPairs;
		var reg;
		for (var i = 0; i < wordPairs.length; i++) {
			var item = wordPairs[i];
			for (var j = 0; j <= 1; j++) {
				var negate = +!j;
				var firstCondition = currentState.match(new RegExp('^\\s?_?(' + lang.escapeRegExp(item[j]) + ')\\s?$', 'i'));
				if (firstCondition) {
					var secondCondition = currentState.match(new RegExp('([_]|^|\\s)(' + lang.escapeRegExp(firstCondition[1]) + ')($|\\s)', 'g'));
					if (secondCondition) {
						reg = currentState.replace(new RegExp(lang.escapeRegExp(item[j]), 'i'), function (result) {
							var res = item[negate];
							if (result.toUpperCase() == result) {
								res = res.toUpperCase();
							} else if (result.charAt(0).toUpperCase() == result.charAt(0)) {
								res = res.substr(0, 0) + item[negate].charAt(0).toUpperCase() + res.substr(1);
							}
							return res;
						});
						this.insert(reg);
						reg = "";
					}
				}
			}
		}
	}

	/**
	 * Finds link at defined {row} and {column}
	 * @returns {String}
	 **/
	findLinkAt(row: number, column: number) {
		var line = this.session.getLine(row);
		var wordParts = line.split(/((?:https?|ftp):\/\/[\S]+)/);
		var columnPosition = column;
		if (columnPosition < 0) columnPosition = 0;
		var previousPosition = 0, currentPosition = 0, match;
		for (let item of wordParts) {
			currentPosition = previousPosition + item.length;
			if (columnPosition >= previousPosition && columnPosition <= currentPosition) {
				if (item.match(/((?:https?|ftp):\/\/[\S]+)/)) {
					match = item.replace(/[\s:.,'";}\]]+$/, "");
					break;
				}
			}
			previousPosition = currentPosition;
		}
		return match;
	}

	/**
	 * Open valid url under cursor in another tab
	 * @returns {Boolean}
	 **/
	openLink() {
		var cursor =  this.selection.getCursor();
		var url = this.findLinkAt(cursor.row, cursor.column);
		if (url)
			qk.app.openURL(url); // open link in external browser
		return url != null;
	}

	/**
	 * Removes all the lines in the current selection
	 * @related EditSession.remove
	 **/
	removeLines() {
		var rows = this.$getSelectedRows();
		this.session.removeFullLines(rows.first, rows.last);
		this.clearSelection();
	}

	duplicateSelection() {
		var sel = this.selection;
		var doc = this.session;
		var range = sel.getRange();
		var reverse = sel.isBackwards();
		if (range.isEmpty()) {
			var row = range.start.row;
			doc.duplicateLines(row, row);
		} else {
			var point = reverse ? range.start : range.end;
			var endPoint = doc.insert(point, doc.getTextRange(range));
			range.start = point;
			range.end = endPoint;

			sel.setSelectionRange(range, reverse);
		}
	}

	/**
	 * Shifts all the selected lines down one row.
	 *
	 * @related EditSession.moveLinesUp
	 **/
	moveLinesDown() {
		this.$moveLines(1, false);
	}

	/**
	 * Shifts all the selected lines up one row.
	 * @related EditSession.moveLinesDown
	 **/
	moveLinesUp() {
		this.$moveLines(-1, false);
	}

	/**
	 * Moves a range of text from the given range to the given position. `toPosition` is an object that looks like this:
	 * ```json
	 *    { row: newRowLocation, column: newColumnLocation }
	 * ```
	 * @param {Range} range The range of text you want moved within the document
	 * @param {Point} toPosition The location (row and column) where you want to move the text to
	 * @param {boolean} [copy]
	 *
	 * @returns {Range} The new range where the text was moved to.
	 * @related EditSession.moveText
	 **/
	moveText(range: Range, toPosition: Point, copy?: boolean) {
		return this.session.moveText(range, toPosition, copy);
	}

	/**
	 * Copies all the selected lines up one row.
	 *
	 **/
	copyLinesUp() {
		this.$moveLines(-1, true);
	}

	/**
	 * Copies all the selected lines down one row.
	 * @related EditSession.duplicateLines
	 *
	 **/
	copyLinesDown() {
		this.$moveLines(1, true);
	}

	/**
	 * for internal use
	 * @ignore
	 *
	 **/
	$moveLines(dir: number, copy: boolean) {
		var rows, moved;
		var selection = this.selection;
		if (!selection.inMultiSelectMode || this.inVirtualSelectionMode) {
			var range = selection.toOrientedRange();
			rows = this.$getSelectedRows(range);
			moved = this.session.$moveLines(rows.first, rows.last, copy ? 0 : dir);
			if (copy && dir == -1) moved = 0;
			range.moveBy(moved, 0);
			selection.fromOrientedRange(range);
		} else {
			var ranges = selection.rangeList!.ranges;
			selection.rangeList!.detach(this.session);
			this.inVirtualSelectionMode = true;

			var diff = 0;
			var totalDiff = 0;
			var l = ranges.length;
			for (var i = 0; i < l; i++) {
				let it = ranges[i];
				var rangeIndex = i;
				it.moveBy(diff, 0);
				rows = this.$getSelectedRows(it);
				var first = rows.first;
				var last = rows.last;
				while (++i < l) {
					let it = ranges[i];
					if (totalDiff) it.moveBy(totalDiff, 0);
					var subRows = this.$getSelectedRows(it);
					if (copy && subRows.first != last)
						break;
					else if (!copy && subRows.first > last + 1)
						break;
					last = subRows.last;
				}
				i--;
				diff = this.session.$moveLines(first, last, copy ? 0 : dir);
				if (copy && dir == -1) rangeIndex = i + 1;
				while (rangeIndex <= i) {
					ranges[rangeIndex].moveBy(diff, 0);
					rangeIndex++;
				}
				if (!copy) diff = 0;
				totalDiff += diff;
			}

			selection.fromOrientedRange(selection.ranges![0]);
			selection.rangeList!.attach(this.session);
			this.inVirtualSelectionMode = false;
		}
	}

	/**
	 * Returns an object indicating the currently selected rows. The object looks like this:
	 *
	 * ```json
	 * { first: range.start.row, last: range.end.row }
	 * ```
	 *
	 * @returns {Object}
	 **/
	$getSelectedRows(range?: Range) {
		range = (range || this.getSelectionRange()).collapseRows();

		return {
			first: this.session.getRowFoldStart(range.start.row),
			last: this.session.getRowFoldEnd(range.end.row)
		};
	}

	/**
	 * @internal
	 */
	onCompositionStart(compositionState: Composition) {
		this.renderer.showComposition(compositionState);
	}

	/**
	 * @internal
	 */
	onCompositionUpdate(text: string) {
		this.renderer.setCompositionText(text);
	}

	/**
	 * @internal
	 */
	onCompositionEnd() {
		this.renderer.hideComposition();
	}

	/**
	 * {:VirtualRenderer.getFirstVisibleRow}
	 *
	 * @returns {Number}
	 * @related VirtualRenderer.getFirstVisibleRow
	 **/
	getFirstVisibleRow() {
		return this.renderer.getFirstVisibleRow();
	}

	/**
	 * {:VirtualRenderer.getLastVisibleRow}
	 *
	 * @returns {Number}
	 * @related VirtualRenderer.getLastVisibleRow
	 **/
	getLastVisibleRow() {
		return this.renderer.getLastVisibleRow();
	}

	/**
	 * Indicates if the row is currently visible on the screen.
	 * @param {Number} row The row to check
	 *
	 * @returns {Boolean}
	 **/
	isRowVisible(row: number) {
		return (row >= this.getFirstVisibleRow() && row <= this.getLastVisibleRow());
	}

	/**
	 * Indicates if the entire row is currently visible on the screen.
	 * @param {Number} row The row to check
	 *
	 *
	 * @returns {Boolean}
	 **/
	isRowFullyVisible(row: number) {
		return (row >= this.renderer.getFirstFullyVisibleRow() && row <= this.renderer.getLastFullyVisibleRow());
	}

	/**
	 * Returns the number of currently visible rows.
	 * @returns {Number}
	 **/
	$getVisibleRowCount() {
		return this.renderer.getScrollBottomRow() - this.renderer.getScrollTopRow() + 1;
	}

	$moveByPage(dir: number, select?: boolean) {
		var renderer = this.renderer;
		var config = this.renderer.layerConfig;
		var rows = dir * Math.floor(config.height / config.lineHeight);

		if (select === true) {
			this.selection.$moveSelection(function(){
				this.moveCursorBy(rows, 0);
			});
		} else if (select === false) {
			this.selection.moveCursorBy(rows, 0);
			this.selection.clearSelection();
		}

		var scrollTop = renderer.scrollTop;

		renderer.scrollBy(0, rows * config.lineHeight);
		if (select != undefined)
			renderer.scrollCursorIntoView(void 0, 0.5);

		renderer.animateScrolling(scrollTop);
	}

	/**
	 * Selects the text from the current position of the document until where a "page down" finishes.
	 **/
	selectPageDown() {
		this.$moveByPage(1, true);
	}

	/**
	 * Selects the text from the current position of the document until where a "page up" finishes.
	 **/
	selectPageUp() {
		this.$moveByPage(-1, true);
	}

	/**
	 * Shifts the document to wherever "page down" is, as well as moving the cursor position.
	 **/
	gotoPageDown() {
		this.$moveByPage(1, false);
	}

	/**
	 * Shifts the document to wherever "page up" is, as well as moving the cursor position.
	 **/
	gotoPageUp() {
		this.$moveByPage(-1, false);
	}

	/**
	 * Scrolls the document to wherever "page down" is, without changing the cursor position.
	 **/
	scrollPageDown() {
		this.$moveByPage(1);
	}

	/**
	 * Scrolls the document to wherever "page up" is, without changing the cursor position.
	 **/
	scrollPageUp() {
		this.$moveByPage(-1);
	}

	/**
	 * Moves the editor to the specified row.
	 * @related VirtualRenderer.scrollToRow
	 * @param {number} row
	 */
	scrollToRow(row: number) {
		this.renderer.scrollToRow(row);
	}

	/**
	 * Scrolls to a line. If `center` is `true`, it puts the line in middle of screen (or attempts to).
	 * @param {Number} line The line to scroll to
	 * @param {Boolean} center If `true`
	 * @param {Boolean} animate If `true` animates scrolling
	 * @param {() => void} [callback] Function to be called when the animation has finished
	 *
	 * @related VirtualRenderer.scrollToLine
	 **/
	scrollToLine(line: number, center: boolean, animate?: boolean, callback?: () => void) {
		this.renderer.scrollToLine(line, center, animate, callback);
	}

	/**
	 * Attempts to center the current selection on the screen.
	 **/
	centerSelection() {
		var range = this.getSelectionRange();
		var pos = {
			row: Math.floor(range.start.row + (range.end.row - range.start.row) / 2),
			column: Math.floor(range.start.column + (range.end.column - range.start.column) / 2)
		};
		this.renderer.alignCursor(pos, 0.5);
	}

	/**
	 * Gets the current position of the cursor.
	 * @returns {Point} An object that looks something like this:
	 *
	 * ```json
	 * { row: currRow, column: currCol }
	 * ```
	 *
	 * @related Selection.getCursor
	 **/
	getCursorPosition() {
		return this.selection.getCursor();
	}

	/**
	 * Returns the screen position of the cursor.
	 * @returns {Point}
	 * @related EditSession.documentToScreenPosition
	 **/
	getCursorPositionScreen() {
		return this.session.documentToScreenPosition(this.getCursorPosition());
	}

	/**
	 * {:Selection.getRange}
	 * @returns {Range}
	 * @related Selection.getRange
	 **/
	getSelectionRange() {
		return this.selection.getRange();
	}

	/**
	 * Selects all the text in editor.
	 * @related Selection.selectAll
	 **/
	selectAll() {
		this.selection.selectAll();
	}

	/**
	 * {:Selection.clearSelection}
	 * @related Selection.clearSelection
	 **/
	clearSelection() {
		this.selection.clearSelection();
	}

	/**
	 * Moves the cursor to the specified row and column. Note that this does not de-select the current selection.
	 * @param {Number} row The new row number
	 * @param {Number} column The new column number
	 * @related Selection.moveCursorTo
	 **/
	moveCursorTo(row: number, column: number) {
		this.selection.moveCursorTo(row, column);
	}

	/**
	 * Moves the cursor to the position indicated by `pos.row` and `pos.column`.
	 * @param {Point} pos An object with two properties, row and column
	 * @related Selection.moveCursorToPosition
	 **/
	moveCursorToPosition(pos: Point) {
		this.selection.moveCursorToPosition(pos);
	}

	/**
	 * Moves the cursor's row and column to the next matching bracket or HTML tag.
	 * @param {boolean} [select]
	 * @param {boolean} [expand]
	 */
	jumpToMatching(select?: boolean, expand?: boolean) {
		var cursor = this.getCursorPosition();
		var iterator = new TokenIterator(this.session, cursor.row, cursor.column);
		var prevToken: Token | null = iterator.getCurrentToken();
		var tokenCount = 0;
		if (prevToken && prevToken.type.indexOf('tag-name') !== -1) {
			prevToken = iterator.stepBackward();
		}
		var token = prevToken || iterator.stepForward();

		if (!token) return;

		//get next closing tag or bracket
		var matchType;
		var found = false;
		var depth: Dict<number> = {};
		var i = cursor.column - token.start!;
		var bracketType;
		var brackets = {
			")": "(",
			"(": "(",
			"]": "[",
			"[": "[",
			"{": "{",
			"}": "{"
		};

		do {
			if (token.value.match(/[{}()\[\]]/g)) {
				for (; i < token.value.length && !found; i++) {
					const bracket = brackets[token.value[i] as keyof typeof brackets];
					if (!bracket) {
						continue;
					}

					bracketType = bracket + '.' + token.type.replace("rparen", "lparen");
					if (isNaN(depth[bracketType])) {
						depth[bracketType] = 0;
					}

					switch (token.value[i]) {
						case '(':
						case '[':
						case '{':
							depth[bracketType]++;
							break;
						case ')':
						case ']':
						case '}':
							depth[bracketType]--;

							if (depth[bracketType] === -1) {
								matchType = 'bracket';
								found = true;
							}
							break;
					}
				}
			}
			else if (token.type.indexOf('tag-name') !== -1) {
				if (isNaN(depth[token.value])) {
					depth[token.value] = 0;
				}

				if (prevToken!.value === '<' && tokenCount > 1) {
					depth[token.value]++;
				}
				else if (prevToken!.value === '</') {
					depth[token.value]--;
				}

				if (depth[token.value] === -1) {
					matchType = 'tag';
					found = true;
				}
			}

			if (!found) {
				prevToken = token;
				tokenCount++;
				token = iterator.stepForward();
				i = 0;
			}
		} while (token && !found);

		//no match found
		if (!matchType) return;

		var range, pos;
		if (matchType === 'bracket') {
			range = this.session.getBracketRange(cursor);
			if (!range) {
				range = new Range(iterator.getCurrentTokenRow(), iterator.getCurrentTokenColumn() + i - 1,
					iterator.getCurrentTokenRow(), iterator.getCurrentTokenColumn() + i - 1
				);
				pos = range.start;
				if (expand || pos.row === cursor.row && Math.abs(pos.column - cursor.column)
					< 2) range = this.session.getBracketRange(pos);
			}
		}
		else if (matchType === 'tag') {
			if (!token || token.type.indexOf('tag-name') === -1) return;
			range = new Range(iterator.getCurrentTokenRow(), iterator.getCurrentTokenColumn() - 2,
				iterator.getCurrentTokenRow(), iterator.getCurrentTokenColumn() - 2
			);

			//find matching tag
			if (range.compare(cursor.row, cursor.column) === 0) {
				var tagsRanges = this.session.getMatchingTags(cursor);
				if (tagsRanges) {
					if (tagsRanges.openTag.contains(cursor.row, cursor.column)) {
						range = tagsRanges.closeTag;
						pos = range.start;
					}
					else {
						range = tagsRanges.openTag;
						if (tagsRanges.closeTag.start.row === cursor.row && tagsRanges.closeTag.start.column
							=== cursor.column) pos = range.end; else pos = range.start;
					}
				}
			}

			//we found it
			pos = pos || range.start;
		}

		pos = range && range.cursor || pos;
		if (pos) {
			if (select) {
				if (range && expand) {
					this.selection.setRange(range);
				}
				else if (range && range.isEqual(this.getSelectionRange())) {
					this.clearSelection();
				}
				else {
					this.selection.selectTo(pos.row, pos.column);
				}
			}
			else {
				this.selection.moveTo(pos.row, pos.column);
			}
		}
	}

	/**
	 * Moves the cursor to the specified line number, and also into the indicated column.
	 * @param {Number} lineNumber The line number to go to
	 * @param {Number} [column] A column number to go to
	 * @param {Boolean} [animate] If `true` animates scolling
	 **/
	gotoLine(lineNumber: number, column?: number, animate?: boolean) {
		this.selection.clearSelection();
		this.session.unfold({row: lineNumber - 1, column: column || 0});

		// todo: find a way to automatically exit multiselect mode
		this.exitMultiSelectMode && this.exitMultiSelectMode();
		this.moveCursorTo(lineNumber - 1, column || 0);

		if (!this.isRowFullyVisible(lineNumber - 1))
			this.scrollToLine(lineNumber - 1, true, animate);
	}

	/**
	 * Moves the cursor to the specified row and column. Note that this does de-select the current selection.
	 * @param {Number} row The new row number
	 * @param {Number} column The new column number
	 *
	 * @related Editor.moveCursorTo
	 **/
	navigateTo(row: number, column: number) {
		this.selection.moveTo(row, column);
	}

	/**
	 * Moves the cursor up in the document the specified number of times. Note that this does de-select the current selection.
	 * @param {Number} [times] The number of times to change navigation
	 *
	 **/
	navigateUp(times?: number) {
		if (this.selection.isMultiLine() && !this.selection.isBackwards()) {
			var selectionStart = this.selection.anchor.getPosition();
			return this.moveCursorToPosition(selectionStart);
		}
		this.selection.clearSelection();
		this.selection.moveCursorBy(-(times as number) || -1, 0);
	}

	/**
	 * Moves the cursor down in the document the specified number of times. Note that this does de-select the current selection.
	 * @param {Number} [times] The number of times to change navigation
	 *
	 **/
	navigateDown(times?: number) {
		if (this.selection.isMultiLine() && this.selection.isBackwards()) {
			var selectionEnd = this.selection.anchor.getPosition();
			return this.moveCursorToPosition(selectionEnd);
		}
		this.selection.clearSelection();
		this.selection.moveCursorBy(times || 1, 0);
	}

	/**
	 * Moves the cursor left in the document the specified number of times. Note that this does de-select the current selection.
	 * @param {Number} [times] The number of times to change navigation
	 *
	 **/
	navigateLeft(times?: number) {
		if (!this.selection.isEmpty()) {
			var selectionStart = this.getSelectionRange().start;
			this.moveCursorToPosition(selectionStart);
		}
		else {
			times = times || 1;
			while (times--) {
				this.selection.moveCursorLeft();
			}
		}
		this.clearSelection();
	}

	/**
	 * Moves the cursor right in the document the specified number of times. Note that this does de-select the current selection.
	 * @param {Number} [times] The number of times to change navigation
	 *
	 **/
	navigateRight(times?: number) {
		if (!this.selection.isEmpty()) {
			var selectionEnd = this.getSelectionRange().end;
			this.moveCursorToPosition(selectionEnd);
		}
		else {
			times = times || 1;
			while (times--) {
				this.selection.moveCursorRight();
			}
		}
		this.clearSelection();
	}

	/**
	 *
	 * Moves the cursor to the start of the current line. Note that this does de-select the current selection.
	 **/
	navigateLineStart() {
		this.selection.moveCursorLineStart();
		this.clearSelection();
	}

	/**
	 *
	 * Moves the cursor to the end of the current line. Note that this does de-select the current selection.
	 **/
	navigateLineEnd() {
		this.selection.moveCursorLineEnd();
		this.clearSelection();
	}

	/**
	 *
	 * Moves the cursor to the end of the current file. Note that this does de-select the current selection.
	 **/
	navigateFileEnd() {
		this.selection.moveCursorFileEnd();
		this.clearSelection();
	}

	/**
	 *
	 * Moves the cursor to the start of the current file. Note that this does de-select the current selection.
	 **/
	navigateFileStart() {
		this.selection.moveCursorFileStart();
		this.clearSelection();
	}

	/**
	 *
	 * Moves the cursor to the word immediately to the right of the current position. Note that this does de-select the current selection.
	 **/
	navigateWordRight() {
		this.selection.moveCursorWordRight();
		this.clearSelection();
	}

	/**
	 *
	 * Moves the cursor to the word immediately to the left of the current position. Note that this does de-select the current selection.
	 **/
	navigateWordLeft() {
		this.selection.moveCursorWordLeft();
		this.clearSelection();
	}

	/**
	 * Replaces the first occurrence of `options.needle` with the value in `replacement`.
	 * @param {String} [replacement] The text to replace with
	 * @param {Partial<SearchOptions>} [options] The [[Search `Search`]] options to use
	 * @return {number}
	 **/
	replace(replacement?: string, options?: Partial<SearchOptions>) {
		if (options)
			this.$search.set(options);

		var range = this.$search.find(this.session);
		var replaced = 0;
		if (!range)
			return replaced;

		if (this.$tryReplace(range, replacement)) {
			replaced = 1;
		}

		this.selection.setSelectionRange(range);
		this.renderer.scrollSelectionIntoView(range.start, range.end);

		return replaced;
	}

	/**
	 * Replaces all occurrences of `options.needle` with the value in `replacement`.
	 * @param {String} [replacement] The text to replace with
	 * @param {Partial<SearchOptions>} [options] The [[Search `Search`]] options to use
	 * @return {number}
	 **/
	replaceAll(replacement?: string, options?: Partial<SearchOptions>) {
		if (options) {
			this.$search.set(options);
		}

		var ranges = this.$search.findAll(this.session);
		var replaced = 0;
		if (!ranges.length)
			return replaced;

		var selection = this.getSelectionRange();
		this.selection.moveTo(0, 0);

		for (var i = ranges.length - 1; i >= 0; --i) {
			if(this.$tryReplace(ranges[i], replacement)) {
				replaced++;
			}
		}

		this.selection.setSelectionRange(selection);

		return replaced;
	}

	/**
	 * @param {IRange} range
	 * @param {string} [replacement]
	 */
	$tryReplace(range: IRange, replacement?: string) {
		var input = this.session.getTextRange(range);
		var rep = this.$search.replace(input, replacement);
		if (rep !== null) {
			range.end = this.session.replace(range, rep);
			return range;
		} else {
			return null;
		}
	}

	/**
	 * {:Search.getOptions} For more information on `options`, see [[Search `Search`]].
	 * @related Search.getOptions
	 * @returns {Partial<SearchOptions>}
	 **/
	getLastSearchOptions() {
		return this.$search.getOptions();
	}

	/**
	 * Attempts to find `needle` within the document. For more information on `options`, see [[Search `Search`]].
	 * @param {String|RegExp|Object} [needle] The text to search for (optional)
	 * @param {Partial<SearchOptions>} [options] An object defining various search properties
	 * @param {Boolean} [animate] If `true` animate scrolling
	 * @related Search.find
	 **/
	find(needle?: string | RegExp | Partial<SearchOptions>, options?: Partial<SearchOptions>, animate?: boolean) {
		if (!options)
			options = {};

		if (typeof needle == "string" || needle instanceof RegExp)
			options.needle = needle;
		else if (typeof needle == "object")
			oop.mixin(options, needle);

		var range = this.selection.getRange();
		if (options.needle == null) {
			let needle = this.session.getTextRange(range)
				|| this.$search.$options.needle;
			if (!needle) {
				range = this.session.getWordRange(range.start.row, range.start.column);
				needle = this.session.getTextRange(range);
			}
			this.$search.set({needle: needle});
		}

		this.$search.set(options);
		if (!options.start)
			this.$search.set({start: range});

		var newRange = this.$search.find(this.session);
		if (options.preventScroll)
			return newRange;
		if (newRange) {
			this.revealRange(newRange, animate);
			return newRange;
		}
		// clear selection if nothing is found
		if (options.backwards)
			range.start = range.end;
		else
			range.end = range.start;
		this.selection.setRange(range);
	}

	/**
	 * Performs another search for `needle` in the document. For more information on `options`, see [[Search `Search`]].
	 * @param {Partial<SearchOptions>} [options] search options
	 * @param {Boolean} [animate] If `true` animate scrolling
	 *
	 * @related Editor.find
	 **/
	findNext(options?: Partial<SearchOptions>, animate?: boolean) {
		this.find({skipCurrent: true, backwards: false}, options, animate);
	}

	/**
	 * Performs a search for `needle` backwards. For more information on `options`, see [[Search `Search`]].
	 * @param {Partial<SearchOptions>} [options] search options
	 * @param {Boolean} [animate] If `true` animate scrolling
	 *
	 * @related Editor.find
	 **/
	findPrevious(options?: Partial<SearchOptions>, animate?: boolean) {
		this.find(options, {skipCurrent: true, backwards: true}, animate);
	}

	/**
	 * @param {Range} range
	 * @param {boolean} [animate]
	 */
	revealRange(range: IRange, animate?: boolean) {
		this.session.unfold(range);
		this.selection.setSelectionRange(range);

		var scrollTop = this.renderer.scrollTop;
		this.renderer.scrollSelectionIntoView(range.start, range.end, 0.5);
		if (animate !== false)
			this.renderer.animateScrolling(scrollTop);
	}

	/**
	 * {:UndoManager.undo}
	 * @related UndoManager.undo
	 **/
	undo() {
		this.session.getUndoManager().undo(this.session);
		this.renderer.scrollCursorIntoView(void 0, 0.5);
	}

	/**
	 * {:UndoManager.redo}
	 * @related UndoManager.redo
	 **/
	redo() {
		this.session.getUndoManager().redo(this.session);
		this.renderer.scrollCursorIntoView(void 0, 0.5);
	}

	private destroyed?: boolean;

	/**
	 *
	 * Cleans up the entire editor.
	 **/
	destroy() {
		/** true if editor is destroyed */
		this.destroyed = true;
		if (this.$toDestroy) {
			this.$toDestroy.forEach(function(el) {
				el.destroy();
			});
			this.$toDestroy = [];
		}
		if (this.$mouseHandler)
			this.$mouseHandler.destroy();
		this.renderer.destroy();
		this._signal("destroy", void 0, this);
		if (this.session)
			this.session.destroy();
		if (this._$emitInputEvent)
			this._$emitInputEvent.cancel();
		this.removeAllListeners();

	}
	
	private $scrollAnchor?: Box;

	/**
	 * Enables automatic scrolling of the cursor into view when editor itself is inside scrollable element
	 * @param {Boolean} enable default true
	 **/
	setAutoScrollEditorIntoView(enable: boolean) {
		if (!enable)
			return;
		var rect: Vec2 | undefined;
		var self = this;
		var shouldScroll: boolean | null = false;
		if (!this.$scrollAnchor)
			// this.$scrollAnchor = document.createElement("div");
			this.$scrollAnchor = new Box(this.container.window);
		var scrollAnchor = this.$scrollAnchor;
		this.container.prepend(scrollAnchor);
		var onChangeSelection = this.on("changeSelection", function() {
			shouldScroll = true;
		});
		// needed to not trigger sync reflow
		var onBeforeRender = this.renderer.on("beforeRender", function() {
			if (shouldScroll)
				rect = self.renderer.container.position;
		});
		var onAfterRender = this.renderer.on("afterRender", function() {
			if (shouldScroll && rect && (self.isFocused()
				|| self.searchBox && self.searchBox.isFocused())
			) {
				var renderer = self.renderer;
				var pos = renderer.$cursorLayer.$pixelPos!;
				var config = renderer.layerConfig;
				var top = pos.top - config.offset;
				if (pos.top >= 0 && top + rect.y < 0) {
					shouldScroll = true;
				} else if (pos.top < config.height &&
					pos.top + rect.y + config.lineHeight > self.window.size.height) {
					shouldScroll = false;
				} else {
					shouldScroll = null;
				}
				if (shouldScroll != null) {
					scrollAnchor.style.marginTop = top;
					scrollAnchor.style.marginLeft = pos.left;
					scrollAnchor.style.height = config.lineHeight;
					// NOTE:
					// In the web version (ACE), this uses a temporary DOM anchor combined with
					// scrollIntoView() to ensure the target position becomes visible.
					// Qk has an explicit, numeric layout and scrolling system, so this DOM-based
					// visibility hack is intentionally not implemented here.
					// Visibility should be handled by the viewport / scroll container when needed.
					// scrollAnchor.scrollIntoView(shouldScroll);
				}
				shouldScroll = null;
				rect = undefined;
			}
		});
		this.setAutoScrollEditorIntoView = function(enable) { // replace the function
			if (enable)
				return;
			delete (this as any).setAutoScrollEditorIntoView; // restore the function
			this.off("changeSelection", onChangeSelection);
			this.renderer.off("afterRender", onAfterRender);
			this.renderer.off("beforeRender", onBeforeRender);
		};
	}

	$resetCursorStyle() {
		var style = this.$cursorStyle || "ace";
		var cursorLayer = this.renderer.$cursorLayer;
		if (!cursorLayer)
			return;
		cursorLayer.setSmoothBlinking(/smooth/.test(style));
		cursorLayer.isBlinking = !this.$readOnly && style != "wide";
		cursorLayer.element.cssclass[/slim/.test(style) ? "add" : "remove"]("ace_slim-cursors");
	}

	/**
	 * opens a prompt displaying message
	 **/
	prompt(message: Partial<PromptOptions>, callback?: () => void): void;
	prompt(message: string | Partial<PromptOptions>, options?: Partial<PromptOptions> | (() => void), callback?: () => void) {
		var editor = this;
		// config.loadModule("ace/ext/prompt", function (module) {
		import("./ext/prompt").then(function(module) {
			module.prompt(editor, message, options, callback);
		});
	}
}

config.defineOptions(Editor.prototype, "editor", {
	selectionStyle: {
		set: function(this: Editor, style: "fullLine" | "screenLine" | "text" | "line") {
			this.$onSelectionChange();
			this._signal("changeSelectionStyle", style, this);
		},
		initialValue: "line"
	},
	highlightActiveLine: {
		set: function(this: Editor) {this.$updateHighlightActiveLine();},
		initialValue: true
	},
	highlightSelectedWord: {
		set: function(this: Editor, shouldHighlight: boolean) {this.$onSelectionChange();},
		initialValue: true
	},
	readOnly: {
		set: function(this: Editor, readOnly: boolean) {
			this.setReadOnly(readOnly);
		},
		initialValue: false
	},
	copyWithEmptySelection: {
		set: function(this: Editor, value: boolean) {
			this.textInput.setCopyWithEmptySelection(value);
		},
		initialValue: false
	},
	cursorStyle: {
		set: function(this: Editor, val: "ace" | "slim" | "smooth" | "wide") { this.$resetCursorStyle(); },
		values: ["ace", "slim", "smooth", "wide"],
		initialValue: "ace"
	},
	mergeUndoDeltas: {
		values: [false, true, "always"],
		initialValue: true
	},
	behavioursEnabled: {initialValue: true},
	wrapBehavioursEnabled: {initialValue: true},
	enableAutoIndent: {initialValue: true},
	autoScrollEditorIntoView: {
		set: function(this: Editor, val: boolean) {this.setAutoScrollEditorIntoView(val);}
	},
	keyboardHandler: {
		set: function(this: Editor, val: string) { this.setKeyboardHandler(val); },
		get: function() { return this.$keybindingId; },
		handlesSet: true
	},
	value: {
		set: function(this: Editor, val: string) { this.session.setValue(val); },
		get: function() { return this.getValue(); },
		handlesSet: true,
		hidden: true
	},
	session: {
		set: function(this: Editor, val: EditSession) { this.setSession(val); },
		get: function() { return this.session; },
		handlesSet: true,
		hidden: true
	},
	showLineNumbers: {
		set: function(this: Editor & {$relativeLineNumbers: boolean}, show: boolean) {
			this.renderer.$gutterLayer.setShowLineNumbers(show);
			this.renderer.$loop.schedule(this.renderer.CHANGE_GUTTER);
			if (show && this.$relativeLineNumbers)
				relativeNumberRenderer.attach(this);
			else
				relativeNumberRenderer.detach(this);
		},
		initialValue: true
	},
	relativeLineNumbers: {
		set: function(this: Editor & {$showLineNumbers: boolean}, value: boolean) {
			if (this.$showLineNumbers && value)
				relativeNumberRenderer.attach(this);
			else
				relativeNumberRenderer.detach(this);
		}
	},
	placeholder: {
		set: function(this: Editor & {$placeholder: string}, message: string) {
			if (!this.$updatePlaceholder) {
				this.$updatePlaceholder = () => {
					this.renderer.$updatePlaceholder(this.$placeholder);
				};
				this.on("input", this.$updatePlaceholder as any);
			}
			this.$updatePlaceholder();
		}
	},
	enableKeyboardAccessibility: {
		set: function(this: Editor, value: boolean) {
			var blurCommand: Command = {
				name: "blurTextInput",
				description: "Set focus to the editor content div to allow tabbing through the page",
				bindKey: "Esc",
				exec: function(editor: Editor) {
					editor.blur();
					editor.renderer.scroller.focus();
				},
				readOnly: true
			};

			var focusOnEnterKeyup = (e: KeyEvent) => {
				if (e.origin == this.renderer.scroller && e.keycode === keys['enter']){
					e.cancelDefault();
					var row = this.getCursorPosition().row;

					if (!this.isRowVisible(row))
						this.scrollToLine(row, true, true);

					this.focus();
				}
			};
			var gutterKeyboardHandler: GutterKeyboardHandler | undefined;

			// If keyboard a11y mode is enabled we:
			// - Enable keyboard operability gutter.
			// - Prevent tab-trapping.
			// - Hide irrelevant elements from assistive technology.
			// - On Windows, set more lines to the textarea.
			// - set aria-label to the text input.
			if (value){
				this.renderer.enableKeyboardAccessibility = true;
				this.renderer.keyboardFocusClassName = "ace_keyboard-focus";

				this.textInput.getElement().setAttribute("tabindex", -1);
				// VoiceOver on Mac OS works best with single line in the textarea, the screen readers on
				// Windows work best with multiple lines in the textarea.
				this.textInput.setNumberOfExtraLines(useragent.windows ? 3 : 0);
				this.renderer.scroller.setAttribute("tabindex", 0);
				this.renderer.scroller.setAttribute("role", "group");
				this.renderer.scroller.setAttribute("aria-roledescription", nls("editor.scroller.aria-roledescription", "editor"));
				this.renderer.scroller.cssclass.add(this.renderer.keyboardFocusClassName);
				this.renderer.scroller.setAttribute("aria-label",
					nls("editor.scroller.aria-label", "Editor content, press Enter to start editing, press Escape to exit"));

				this.renderer.scroller.onKeyUp.on(focusOnEnterKeyup);
				this.commands.addCommand(blurCommand);

				this.renderer.$gutter.setAttribute("tabindex", 0);
				this.renderer.$gutter.setAttribute("aria-hidden", false);
				this.renderer.$gutter.setAttribute("role", "group");
				this.renderer.$gutter.setAttribute("aria-roledescription", nls("editor.gutter.aria-roledescription", "editor gutter"));
				this.renderer.$gutter.setAttribute("aria-label",
					nls("editor.gutter.aria-label", "Editor gutter, press Enter to interact with controls using arrow keys, press Escape to exit"));
				this.renderer.$gutter.cssclass.add(this.renderer.keyboardFocusClassName);

				this.renderer.content.setAttribute("aria-hidden", true);

				if (!gutterKeyboardHandler)
					gutterKeyboardHandler = new GutterKeyboardHandler(this);

				gutterKeyboardHandler.addListener();

				this.textInput.setAriaOptions({
					setLabel: true
				});
			} else {
				this.renderer.enableKeyboardAccessibility = false;

				this.textInput.getElement().setAttribute("tabindex", 0);
				this.textInput.setNumberOfExtraLines(0);
				this.renderer.scroller.setAttribute("tabindex", -1);
				this.renderer.scroller.setAttribute("role", null);
				this.renderer.scroller.setAttribute("aria-roledescription", null);
				this.renderer.scroller.cssclass.remove(this.renderer.keyboardFocusClassName||'');
				this.renderer.scroller.setAttribute("aria-label", null);

				this.renderer.scroller.removeEventListener("keyup", focusOnEnterKeyup.bind(this));
				this.commands.removeCommand(blurCommand);

				this.renderer.content.setAttribute("aria-hidden", null);

				this.renderer.$gutter.setAttribute("tabindex", -1);
				this.renderer.$gutter.setAttribute("aria-hidden", true);
				this.renderer.$gutter.setAttribute("role", null);
				this.renderer.$gutter.setAttribute("aria-roledescription", null);
				this.renderer.$gutter.setAttribute("aria-label", null);
				this.renderer.$gutter.cssclass.remove(this.renderer.keyboardFocusClassName||'');

				if (gutterKeyboardHandler)
					gutterKeyboardHandler.removeListener();
			}
		},
		initialValue: false
	},
	textInputAriaLabel: {
		set: function(this: Editor, val: string) { this.$textInputAriaLabel = val; },
		initialValue: ""
	},
	enableMobileMenu: {
		/**
		 * @param {boolean} val
		 */
		set: function(this: Editor & {$enableMobileMenu: boolean}, val: boolean) { this.$enableMobileMenu = val; },
		initialValue: true
	},
	customScrollbar: "renderer",
	hScrollBarAlwaysVisible: "renderer",
	vScrollBarAlwaysVisible: "renderer",
	highlightGutterLine: "renderer",
	animatedScroll: "renderer",
	showInvisibles: "renderer",
	showPrintMargin: "renderer",
	printMarginColumn: "renderer",
	printMargin: "renderer",
	fadeFoldWidgets: "renderer",
	showFoldWidgets: "renderer",
	displayIndentGuides: "renderer",
	highlightIndentGuides: "renderer",
	showGutter: "renderer",
	fontSize: "renderer",
	fontFamily: "renderer",
	maxLines: "renderer",
	minLines: "renderer",
	scrollPastEnd: "renderer",
	fixedWidthGutter: "renderer",
	theme: "renderer",
	hasCssTransforms: "renderer",
	maxPixelHeight: "renderer",
	useTextareaForIME: "renderer",
	useResizeObserver: "renderer",
	useSvgGutterIcons: "renderer",
	showFoldedAnnotations: "renderer",

	scrollSpeed: "$mouseHandler",
	dragDelay: "$mouseHandler",
	dragEnabled: "$mouseHandler",
	focusTimeout: "$mouseHandler",

	firstLineNumber: "session",
	overwrite: "session",
	newLineMode: "session",
	useWorker: "session",
	useSoftTabs: "session",
	navigateWithinSoftTabs: "session",
	tabSize: "session",
	wrap: "session",
	indentedSoftWrap: "session",
	foldStyle: "session",
	mode: "session"
});

var relativeNumberRenderer = {
	getText: function(session: EditSession, row: number) {
		return (Math.abs(session.selection.lead.row - row) || (row + 1 + (row < 9 ? "\xb7" : ""))) + "";
	},
	getWidth: function(session: EditSession, lastLineNumber: number, config: {characterWidth: number; lastRow: number}) {
		return Math.max(
			lastLineNumber.toString().length,
			(config.lastRow + 1).toString().length,
			2
		) * config.characterWidth;
	},
	update: function(e: any, editor: Editor) {
		editor.renderer.$loop.schedule(editor.renderer.CHANGE_GUTTER);
	},
	attach: function(editor: Editor) {
		editor.renderer.$gutterLayer.$renderer = this;
		editor.on("changeSelection", this.update);
		this.update(null, editor);
	},
	detach: function(editor: Editor) {
		if (editor.renderer.$gutterLayer.$renderer == this)
			editor.renderer.$gutterLayer.$renderer = void 0;
		editor.off("changeSelection", this.update);
		this.update(null, editor);
	}
};
