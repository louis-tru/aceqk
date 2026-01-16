"use strict";

import * as lang from "./lib/lang";
import {BidiHandler} from "./bidihandler";
import config from "./config";
import {EventEmitter} from "./lib/event_emitter";
import {Selection} from "./selection";
import {TextMode} from "./mode";
import {Range,Delta,Point, IRange} from "./range";
import {LineWidget, LineWidgets} from "./line_widgets";
import {Document, NewLineMode} from "./document";
import {BackgroundTokenizer} from "./background_tokenizer";
import {SearchHighlight} from "./search_highlight";
import {UndoManager} from "./undomanager";
import {Ace} from "../ace-internal";
import type { FoldLine } from "./edit_session/fold_line";
import util from "quark/util";
import type { FontMetrics } from "./layer/font_metrics";
import {Folding} from "./edit_session/folding";
import {BracketMatch} from "./edit_session/bracket_match";
import type {TextMarkers} from "./layer/text_markers";
import type {OptionsProvider} from "./lib/app_config";
import type { MarkerLike, MarkerRenderer } from "./layer/marker";
import type { Editor } from "./editor";
import type { RangeList } from "./range_list";
import type { Occur } from "./occur";
import type {Command} from "./keyboard/hash_handler";
import type{ ISearchEditSessionExtension } from "./incremental_search";
import type {Annotation} from "./layer/gutter";
import type {Fold} from "./edit_session/fold";

type Worker = /*unresolved*/ any;

export interface Operation {
	command?: Command;
	args?: any;
	selectionBefore?: Range | Range[];
	selectionAfter?: Range | Range[];
	docChanged?: boolean;
	selectionChanged?: boolean;
	scrollTop?: number;
}

export interface EditSessionEvents {
	/**
	 * Emitted when the document changes.
	 * @param delta
	 */
	"change": (delta: Delta, emitter: EditSession) => void;
	/**
	 * Emitted when the tab size changes, via [[EditSession.setTabSize]].
	 */
	"changeTabSize": (e: void, emitter: EditSession) => void;
	/**
	 * Emitted when the ability to overwrite text changes, via [[EditSession.setOverwrite]].
	 * @param overwrite
	 */
	"changeOverwrite": (overwrite: boolean, emitter: EditSession) => void;
	/**
	 * Emitted when the gutter changes, either by setting or removing breakpoints, or when the gutter decorations change.
	 * @param e
	 */
	"changeBreakpoint": (e: { row?: number, breakpoint?: boolean }, emitter: EditSession) => void;
	/**
	 * Emitted when a front marker changes.
	 */
	"changeFrontMarker": (e: void, emitter: EditSession) => void;
	/**
	 * Emitted when a back marker changes.
	 */
	"changeBackMarker": (e: void, emitter: EditSession) => void;
	/**
	 * Emitted when an annotation changes, like through [[EditSession.setAnnotations]].
	 */
	"changeAnnotation": (e: {}, emitter: EditSession) => void;
	/**
	 * Emitted when a background tokenizer asynchronously processes new rows.
	 */
	"tokenizerUpdate": (e: { data: { first: number, last: number } }, emitter: EditSession) => void;
	/**
	 * Emitted when the current mode changes.
	 * @param e
	 */
	"changeMode": (e: any, emitter: EditSession) => void;
	/**
	 * Emitted when the wrap mode changes.
	 * @param e
	 */
	"changeWrapMode": (e: any, emitter: EditSession) => void;
	/**
	 * Emitted when the wrapping limit changes.
	 * @param e
	 */
	"changeWrapLimit": (e: any, emitter: EditSession) => void;
	/**
	 * Emitted when a code fold is added or removed.
	 * @param e
	 */
	"changeFold": (e: {data: {start:{row: number}, end?: {row: number}} | Fold, action?: string}, emitter: EditSession) => void;
	/**
	 * Emitted when the scroll top changes.
	 * @param scrollTop The new scroll top value
	 **/
	"changeScrollTop": (scrollTop: number, emitter: EditSession) => void;
	/**
	 * Emitted when the scroll left changes.
	 * @param scrollLeft The new scroll left value
	 **/
	"changeScrollLeft": (scrollLeft: number, emitter: EditSession) => void;
	"changeEditor": (e: { editor?: Editor, oldEditor?: Editor }, emitter: EditSession) => void;
	"changeSelection": (e: void, emitter: EditSession) => void;
	"startOperation": (op: { command?: { name?: string }, args?: any }, emitter: EditSession) => void;
	"endOperation": (op: any, emitter: EditSession) => void;
	"beforeEndOperation": (e: void, emitter: EditSession) => void;
}

export interface EditSessionOptions {
	wrap: "off" | "free" | "printmargin" | boolean | number;
	wrapMethod: 'code' | 'text' | 'auto';
	indentedSoftWrap: boolean;
	firstLineNumber: number;
	useWorker: boolean;
	useSoftTabs: boolean;
	tabSize: number;
	navigateWithinSoftTabs: boolean;
	foldStyle: 'markbegin' | 'markbeginend' | 'manual';
	overwrite: boolean;
	newLineMode: NewLineMode;
	mode: string;
}

export interface EditSession extends EventEmitter<EditSessionEvents>,
	OptionsProvider<EditSessionOptions>, Folding, BracketMatch, TextMarkers,
	ISearchEditSessionExtension
{
	doc: Document,
	$highlightLineMarker?: {
		start: Point,
		end: Point,
		id?: number
	}
	$useSoftTabs?: boolean,
	$tabSize: number,
	$useWorker?: boolean,
	$wrapAsCode?: boolean,
	$indentedSoftWrap?: boolean,
	$bracketHighlight?: {
		ranges: Range[],
		markerIds: number[]
	},
	$selectionMarker?: number,
	lineWidgetsWidth?: number,
	$getWidgetScreenLength?: () => number,
	_changedWidgets?: LineWidget[],
	$options: any,
	$wrapMethod?: any,
	$enableVarChar?: any,
	$wrap?: any,
	$navigateWithinSoftTabs?: boolean,
	$selectionMarkers?: any[],
	gutterRenderer?: any,
	$firstLineNumber?: number,
	$emacsMark?: Point,
	$emacsMarkRing?: (Point|undefined)[],
	selectionMarkerCount?: number,
	multiSelect?: Selection & {	ranges: Range[]; rangeList: RangeList;},
	$occurHighlight?: any,
	$occur?: Occur,
	$occurMatchingLines?: any,
	$useEmacsStyleLineStart?: boolean,
	$selectLongWords?: boolean,
	curOp?: Operation;
	getSelectionMarkers(): any[],
}

const $defaultUndoManager: Ace.UndoManager = {
	undo: function() {},
	redo: function() {},
	hasUndo: function() { return false },
	hasRedo: function() {return false },
	reset: function() {},
	add: function() {},
	addSelection: function() {},
	startNewGroup: function() {},
	addSession: function() {}
} as any as Ace.UndoManager;

/**
 * Stores all the data about [[Editor `Editor`]] state providing easy way to change editors state.
 *
 * `EditSession` can be attached to only one [[Document `Document`]]. Same `Document` can be attached to several `EditSession`s.
 **/
export class EditSession extends EventEmitter<EditSessionEvents> {
	public $breakpoints: string[] = [];
	public $decorations: any[] = [];
	private $frontMarkers: any = {};
	private $backMarkers: any = {};
	private $markerId: number = 1;
	public $undoSelect: boolean = true;
	public $editor: Editor | null = null;
	public prevOp?: Operation;
	public $foldData: FoldLine[] = [];
	readonly id: string = "session" + (++EditSession.$uid);
	private static $uid: number = 0;
	// @experimental
	public $gutterCustomWidgets: any = {};
	// Set default background tokenizer with Text mode until editor session mode is set
	public bgTokenizer: BackgroundTokenizer;
	private $onChange = this.onChange.bind(this);
	private $onSelectionChange = this.onSelectionChange.bind(this);
	public selection: Selection;
	public $bidiHandler: BidiHandler;
	public destroyed: boolean = false;

	private $lastSel: any;
	private $operationResetTimer: ReturnType<typeof lang.delayedCall>;

	public $docRowCache: number[] = [];
	public $screenRowCache: number[] = [];

	public $wrapData: (Array<number>&{indent?: number})[] = [];
	private $rowLengthCache: number[] = [];

	public $fromUndo: boolean = false;
	public $undoManager?: UndoManager;
	public mergeUndoDeltas: boolean = false;
	private $informUndoManager?: ReturnType<typeof lang.delayedCall>;

	private $annotations: Annotation[] = [];
	public $mode: Ace.SyntaxMode;
	public $modeId: string = "";
	public $scrollLeft: number = 0;
	public $scrollTop: number = 0;

	private $modes = config.$modes;

	private $overwrite: boolean = false;
	public $wrapLimit = 80; // WRAPMODE
	public $useWrapMode = false;
	public $wrapLimitRange = { min : 0, max : 0 };

	/**
	 * Sets up a new `EditSession` and associates it with the given `Document` and `Mode`.
	 * @param {Document | String} [text] [If `text` is a `Document`, it associates the `EditSession` with it. Otherwise, a new `Document` is created, with the initial text]{: #textParam}
	 * @param {SyntaxMode} [mode] [The initial language mode to use for the document]{: #modeParam}
	 **/
	constructor(text?: Document | string, mode?: Ace.SyntaxMode) {
		super();
		this.$foldData.toString = function() {
			return this.join("\n");
		};
		// Set default background tokenizer with Text mode until editor session mode is set
		this.bgTokenizer = new BackgroundTokenizer((new TextMode()).getTokenizer(), this);

		var _self = this;
		this.bgTokenizer.on("update", function(e) {
			_self._signal("tokenizerUpdate", e, _self);
		});

		this.on("changeFold", this.onChangeFold.bind(this));

		if (typeof text != "object" || !text.getLine)
			text = new Document(/**@type{string}*/text as string);

		this.setDocument(text);

		this.selection = new Selection(this);
		this.selection.on("changeSelection", this.$onSelectionChange);
		this.selection.on("changeCursor", this.$onSelectionChange);

		this.$bidiHandler = new BidiHandler(this);

		config.resetOptions(this);
		this.setMode(mode);
		config._signal("session", this);

		this.$initOperationListeners();
	}

	$initOperationListeners() {
		/**@type {Operation | null}*/
		this.curOp = void 0;
		this.on("change", () => {
			if (!this.curOp) {
				this.startOperation();
				this.curOp!.selectionBefore = this.$lastSel;
			}
			this.curOp!.docChanged = true;
		}, true);
		this.on("changeSelection", () => {
			if (!this.curOp) {
				this.startOperation();
				this.curOp!.selectionBefore = this.$lastSel;
			}
			this.curOp!.selectionChanged = true;
		}, true);

		// Fallback mechanism in case current operation doesn't finish more explicitly.
		// Triggered, for example, when a consumer makes programmatic changes without invoking endOperation afterwards.
		this.$operationResetTimer = lang.delayedCall(this.endOperation.bind(this, true));
	}

	/**
	 * Start an Ace operation, which will then batch all the subsequent changes (to either content or selection) under a single atomic operation.
	 * @param {{command?: {name?: string}, args?: any}|undefined} [commandEvent] Optional name for the operation
	 */
	startOperation(commandEvent?: Operation) {
		if (this.curOp) {
			if (!commandEvent || this.curOp.command) {
				return;
			}
			this.prevOp = this.curOp;
		}
		if (!commandEvent) {
			commandEvent = {};
		}

		this.$operationResetTimer.schedule();
		this.curOp = {
			command: commandEvent.command || {},
			args: commandEvent.args
		};
		this.curOp.selectionBefore = this.selection.toJSON();
		this._signal("startOperation", commandEvent, this);
	}

	/**
	 * End current Ace operation.
	 * Emits "beforeEndOperation" event just before clearing everything, where the current operation can be accessed through `curOp` property.
	 * @param {any} [e]
	 */
	endOperation(e?: Ace.Command | boolean) {
		if (this.curOp) {
			if (e && (e as {returnValue?: number}).returnValue === 0) {
				this.curOp = void 0;
				this._signal("endOperation", e, this);
				return;
			}
			if (e == true && this.curOp.command && this.curOp.command.name == "mouse") {
				// When current operation is mousedown, we wait for the mouseup to end the operation.
				// So during a user selection, we would only end the operation when the final selection is known.
				return;
			}

			const currentSelection = this.selection.toJSON();
			this.curOp.selectionAfter = currentSelection;
			this.$lastSel = this.selection.toJSON();
			this.getUndoManager().addSelection(currentSelection);

			this._signal("beforeEndOperation", void 0, this);
			this.prevOp = this.curOp;
			this.curOp = void 0;
			this._signal("endOperation", e, this);
		}
	}

	/**
	 * Sets the `EditSession` to point to a new `Document`. If a `BackgroundTokenizer` exists, it also points to `doc`.
	 *
	 * @param {Document} doc The new `Document` to use
	 *
	 **/
	setDocument(doc: Document) {
		if (this.doc)
			this.doc.off("change", this.$onChange);
		this.doc = doc;
		doc.on("change", this.$onChange, true);

		this.bgTokenizer.setDocument(this.getDocument());

		this.resetCaches();
	}

	/**
	 * Returns the `Document` associated with this session.
	 * @return {Document}
	 **/
	getDocument() {
		return this.doc;
	}

	/**
	 * Get "widgetManager" from EditSession
	 *
	 * @returns {LineWidgets} object
	 */
	get widgetManager() {
		const widgetManager = new LineWidgets(this);
		// todo remove the widgetManger assignement from lineWidgets constructor when introducing breaking changes
		this.widgetManager = widgetManager;

		if (this.$editor)
			widgetManager.attach(this.$editor);

		return widgetManager;
	}

	/**
	 * Set "widgetManager" in EditSession
	 *
	 * @returns void
	 */
	set widgetManager(value) {
		Object.defineProperty(this, "widgetManager", {
			writable: true,
			enumerable: true,
			configurable: true,
			value: value,
		});
	}

	/**
	 * @param {Number} docRow The row to work with
	 *
	 **/
	$resetRowCache(docRow: number) {
		if (!docRow) {
			/** @type {number[]} */
			this.$docRowCache = [];
			/** @type {number[]} */
			this.$screenRowCache = [];
			return;
		}
		var l = this.$docRowCache.length;
		var i = this.$getRowCacheIndex(this.$docRowCache, docRow) + 1;
		if (l > i) {
			this.$docRowCache.splice(i, l);
			this.$screenRowCache.splice(i, l);
		}
	}

	$getRowCacheIndex(cacheArray: number[], val: number) {
		var low = 0;
		var hi = cacheArray.length - 1;

		while (low <= hi) {
			var mid = (low + hi) >> 1;
			var c = cacheArray[mid];

			if (val > c)
				low = mid + 1;
			else if (val < c)
				hi = mid - 1;
			else
				return mid;
		}

		return low -1;
	}

	resetCaches() {
		this.$modified = true;
		this.$wrapData = [];
		this.$rowLengthCache = [];
		this.$resetRowCache(0);
		if (!this.destroyed)
			this.bgTokenizer.start(0);
	}

	/**
	 * @param e
	 * @internal
	 */
	onChangeFold(e: {data: {start: {row: number}}}) {
		var fold = e.data;
		this.$resetRowCache(fold.start.row);
	}

	/**
	 *
	 * @param {Delta} delta
	 * @internal
	 */
	onChange(delta: Ace.Delta) {
		this.$modified = true;
		this.$bidiHandler.onChange(delta);
		this.$resetRowCache(delta.start.row);

		var removedFolds = this.$updateInternalDataOnChange(delta);
		if (!this.$fromUndo && this.$undoManager) {
			if (removedFolds && removedFolds.length) {
				this.$undoManager.add({
					// @ts-expect-error TODO: this action type is missing in the types
					action: "removeFolds",
					folds:  removedFolds
				}, this.mergeUndoDeltas);
				this.mergeUndoDeltas = true;
			}
			this.$undoManager.add(delta, this.mergeUndoDeltas);
			this.mergeUndoDeltas = true;

			this.$informUndoManager!.schedule();
		}

		this.bgTokenizer.$updateOnChange(delta);
		this._signal("change", delta, this);
	}

	onSelectionChange() {
		this._signal("changeSelection", void 0, this);
	}

	/**
	 * Sets the session text.
	 * @param {String} text The new text to place
	 **/
	setValue(text: string) {
		this.doc.setValue(text);
		this.selection.moveTo(0, 0);

		this.$resetRowCache(0);
		this.setUndoManager(this.$undoManager);
		this.getUndoManager().reset();
	}

	 /**
	 * Returns a new instance of EditSession with state from JSON.
	 * @method fromJSON
	 * @param {string|object} session The EditSession state.
	 * @returns {EditSession}
	 */
	static fromJSON(session: string | any): EditSession {
		if (typeof session == "string")
			session = JSON.parse(session);
		const undoManager = new UndoManager();
		undoManager.$undoStack = session.history.undo;
		undoManager.$redoStack = session.history.redo;
		undoManager.mark = session.history.mark;
		undoManager.$rev = session.history.rev;

		const editSession = new EditSession(session.value);
		session.folds.forEach(function(fold: {start: Ace.Point, end: Ace.Point}) {
		  editSession.addFold("...", Range.fromPoints(fold.start, fold.end));
		});
		editSession.setAnnotations(session.annotations);
		editSession.setBreakpoints(session.breakpoints);
		editSession.setMode(session.mode);
		editSession.setScrollLeft(session.scrollLeft);
		editSession.setScrollTop(session.scrollTop);
		editSession.setUndoManager(undoManager);
		editSession.selection.fromJSON(session.selection);

		return editSession;
	}

	isFullWidth(c: number) {
		return isFullWidth(c)
	}

	/**
	 * Returns the current edit session.
	 * @method toJSON
	 * @returns {Object}
	 */
	toJSON() {
		return {
			annotations: this.$annotations,
			breakpoints: this.$breakpoints,
			folds: this.getAllFolds().map(function(fold) {
				return fold.range;
			}),
			history: this.getUndoManager(),
			mode: this.$mode.$id,
			scrollLeft: this.$scrollLeft,
			scrollTop: this.$scrollTop,
			selection: this.selection.toJSON(),
			value: this.doc.getValue()
		};
	}

	/**
	 * Returns the current [[Document `Document`]] as a string.
	 * @method toString
	 * @returns {String}
	 * @alias EditSession.getValue
	 *
	 **/
	toString() {
		return this.doc.getValue();
	}

	/**
	 * Returns the current [[Document `Document`]] as a string.
	 * @method getValue
	 * @returns {String}
	 * @alias EditSession.toString
	 **/
	getValue() {
		return this.toString();
	}

	/**
	 * Returns selection object.
	 * @returns {Selection}
	 **/
	getSelection() {
		return this.selection;
	}

	/**
	 * {:BackgroundTokenizer.getState}
	 * @param {Number} row The row to start at
	 * @returns {string | string[]}
	 * @related BackgroundTokenizer.getState
	 **/
	getState(row: number) {
		return this.bgTokenizer.getState(row);
	}

	/**
	 * Starts tokenizing at the row indicated. Returns a list of objects of the tokenized rows.
	 * @param {Number} row The row to start at
	 * @returns {Token[]}
	 **/
	getTokens(row: number) {
		return this.bgTokenizer.getTokens(row);
	}

	/**
	 * Returns an object indicating the token at the current row. The object has two properties: `index` and `start`.
	 * @param {Number} row The row number to retrieve from
	 * @param {Number} column The column number to retrieve from
	 * @returns {Token}
	 *
	 **/
	getTokenAt(row: number, column: number) {
		var tokens = this.bgTokenizer.getTokens(row);
		var token, c = 0;
		if (column == null) {
			var i = tokens.length - 1;
			c = this.getLine(row).length;
		} else {
			for (var i = 0; i < tokens.length; i++) {
				c += tokens[i].value.length;
				if (c >= column)
					break;
			}
		}
		token = tokens[i];
		if (!token)
			return null;
		token.index = i;
		token.start = c - token.value.length;
		return token;
	}

	private $syncInformUndoManager?: () => void;

	/**
	 * Sets the undo manager.
	 * @param {UndoManager} undoManager The new undo manager
	 **/
	setUndoManager(undoManager?: Ace.UndoManager) {
		this.$undoManager = undoManager;

		if (this.$informUndoManager)
			this.$informUndoManager.cancel();

		if (undoManager) {
			var self = this;
			undoManager.addSession(this);
			this.$syncInformUndoManager = function() {
				self.$informUndoManager!.cancel();
				self.mergeUndoDeltas = false;
			};
			this.$informUndoManager = lang.delayedCall(this.$syncInformUndoManager);
		} else {
			this.$syncInformUndoManager = function() {};
		}
	}

	/**
	 * starts a new group in undo history
	 **/
	markUndoGroup() {
		if (this.$syncInformUndoManager)
			this.$syncInformUndoManager();
	}

	/**
	 * Returns the current undo manager.
	 * @returns {UndoManager}
	 **/
	getUndoManager() {
		return this.$undoManager || $defaultUndoManager;
	}

	/**
	 * Returns the current value for tabs. If the user is using soft tabs, this will be a series of spaces (defined by [[EditSession.getTabSize `getTabSize()`]]); otherwise it's simply `'\t'`.
	 * @returns {String}
	 **/
	getTabString() {
		if (this.getUseSoftTabs()) {
			return lang.stringRepeat(" ", this.getTabSize());
		} else {
			return "\t";
		}
	}

	/**
	 * Pass `true` to enable the use of soft tabs. Soft tabs means you're using spaces instead of the tab character (`'\t'`).
	 * @param {Boolean} val Value indicating whether or not to use soft tabs
	 **/
	setUseSoftTabs(val: boolean) {
		this.setOption("useSoftTabs", val);
	}

	/**
	 * Returns `true` if soft tabs are being used, `false` otherwise.
	 * @returns {Boolean}
	 **/
	getUseSoftTabs(): boolean {
		// todo might need more general way for changing settings from mode, but this is ok for now
		return !!this.$useSoftTabs && !this.$mode.$indentWithTabs;
	}
	/**
	 * Set the number of spaces that define a soft tab; for example, passing in `4` transforms the soft tabs to be equivalent to four spaces. This function also emits the `changeTabSize` event.
	 * @param {Number} tabSize The new tab size
	 **/
	setTabSize(tabSize: number) {
		tabSize = parseInt(tabSize as any, 10);
		if (tabSize > 0 && this.$tabSize !== tabSize) {
			this.$modified = true;
			this.$rowLengthCache = [];
			this.$tabSize = tabSize;
			this._signal("changeTabSize", undefined, this);
		}
	}
	/**
	 * Returns the current tab size.
	 * @return {number}
	 **/
	getTabSize(): number {
		return this.$tabSize;
	}

	/**
	 * Returns `true` if the character at the position is a soft tab.
	 * @param {Point} position The position to check
	 **/
	isTabStop(position: Ace.Point): boolean {
		return !!this.$useSoftTabs && (position.column % this.$tabSize === 0);
	}

	/**
	 * Set whether keyboard navigation of soft tabs moves the cursor within the soft tab, rather than over
	 * @param {Boolean} navigateWithinSoftTabs Value indicating whether or not to navigate within soft tabs
	 **/
	setNavigateWithinSoftTabs(navigateWithinSoftTabs: boolean) {
		this.setOption("navigateWithinSoftTabs", navigateWithinSoftTabs);
	}
	/**
	 * Returns `true` if keyboard navigation moves the cursor within soft tabs, `false` if it moves the cursor over soft tabs.
	 * @returns {Boolean}
	 **/
	getNavigateWithinSoftTabs(): boolean {
		return !!this.$navigateWithinSoftTabs;
	}

	/**
	 * Pass in `true` to enable overwrites in your session, or `false` to disable.
	 *
	 * If overwrites is enabled, any text you enter will type over any text after it. If the value of `overwrite` changes, this function also emits the `changeOverwrite` event.
	 *
	 * @param {Boolean} overwrite Defines whether or not to set overwrites
	 *
	 **/
	setOverwrite(overwrite: boolean) {
		this.setOption("overwrite", overwrite);
	}

	/**
	 * Returns `true` if overwrites are enabled; `false` otherwise.
	 **/
	getOverwrite(): boolean {
		return this.$overwrite;
	}

	/**
	 * Sets the value of overwrite to the opposite of whatever it currently is.
	 **/
	toggleOverwrite() {
		this.setOverwrite(!this.$overwrite);
	}

	/**
	 * Adds `className` to the `row`, to be used for CSS stylings and whatnot.
	 * @param {Number} row The row number
	 * @param {String} className The class to add
	 **/
	addGutterDecoration(row: number, className: string) {
		if (!this.$decorations[row])
			this.$decorations[row] = "";
		this.$decorations[row] += " " + className;
		this._signal("changeBreakpoint", {}, this);
	}

	/**
	 * Replaces the custom icon with the fold widget if present from a specific row in the gutter
	 * @param {number} row The row number for which to hide the custom icon
	 * @experimental
	 */
	removeGutterCustomWidget(row: number) {
		if(this.$editor) {
			this.$editor.renderer.$gutterLayer.$removeCustomWidget(row);
		}
	}

	/**
	 * Replaces the fold widget if present with the custom icon from a specific row in the gutter
	 * @param {number} row - The row number where the widget will be displayed
	 * @param {Object} attributes - Configuration attributes for the widget
	 * @param {string} attributes.className - CSS class name for styling the widget
	 * @param {string} attributes.label - Text label to display in the widget
	 * @param {string} attributes.title - Tooltip text for the widget
	 * @param {Object} attributes.callbacks - Event callback functions for the widget e.g onClick; 
	 * @returns {void}
	 * @experimental
	*/
	addGutterCustomWidget(row: number, attributes: { className: string; label: string; title: string; callbacks: object }) {
		if(this.$editor) {
			this.$editor.renderer.$gutterLayer.$addCustomWidget(row,attributes);
		}
	}

	/**
	 * Removes `className` from the `row`.
	 * @param {Number} row The row number
	 * @param {String} className The class to add
	 **/
	removeGutterDecoration(row: number, className: string) {
		this.$decorations[row] = (this.$decorations[row] || "").replace(" " + className, "");
		this._signal("changeBreakpoint", {}, this);
	}

	/**
	 * Returns an array of strings, indicating the breakpoint class (if any) applied to each row.
	 * @returns {String[]}
	 **/
	getBreakpoints() {
		return this.$breakpoints;
	}

	/**
	 * Sets a breakpoint on every row number given by `rows`. This function also emites the `'changeBreakpoint'` event.
	 * @param {number[]} rows An array of row indices
	 **/
	setBreakpoints(rows: number[]) {
		this.$breakpoints = [];
		for (var i=0; i<rows.length; i++) {
			this.$breakpoints[rows[i]] = "ace_breakpoint";
		}
		this._signal("changeBreakpoint", {}, this);
	}

	/**
	 * Removes all breakpoints on the rows. This function also emits the `'changeBreakpoint'` event.
	 **/
	clearBreakpoints() {
		this.$breakpoints = [];
		this._signal("changeBreakpoint", {}, this);
	}

	/**
	 * Sets a breakpoint on the row number given by `row`. This function also emits the `'changeBreakpoint'` event.
	 * @param {Number} row A row index
	 * @param {String} className Class of the breakpoint
	 **/
	setBreakpoint(row: number, className?: string) {
		if (className === undefined)
			className = "ace_breakpoint";
		if (className)
			this.$breakpoints[row] = className;
		else
			delete this.$breakpoints[row];
		this._signal("changeBreakpoint", {}, this);
	}

	/**
	 * Removes a breakpoint on the row number given by `row`. This function also emits the `'changeBreakpoint'` event.
	 * @param {Number} row A row index
	 **/
	clearBreakpoint(row: number) {
		delete this.$breakpoints[row];
		this._signal("changeBreakpoint", {}, this);
	}

	/**
	 * Adds a new marker to the given `Range`. If `inFront` is `true`, a front marker is defined, and the `'changeFrontMarker'` event fires; otherwise, the `'changeBackMarker'` event fires.
	 * @param {Range} range Define the range of the marker
	 * @param {String} clazz Set the CSS class for the marker
	 * @param {MarkerRenderer | "fullLine" | "screenLine" | "text" | "line"} [type] Identify the renderer type of the marker. If string provided, corresponding built-in renderer is used. Supported string types are "fullLine", "screenLine", "text" or "line". If a Function is provided, that Function is used as renderer.
	 * @param {Boolean} [inFront] Set to `true` to establish a front marker
	 *
	 * @return {Number} The new marker id
	 **/
	addMarker(range: Range, clazz: string, type?: MarkerRenderer | "fullLine" | "screenLine" | "text" | "line", inFront?: boolean) {
		var id = this.$markerId++;

		var marker = {
			range : range,
			type : type || "line",
			renderer: typeof type == "function" ? type : null,
			clazz : clazz,
			inFront: !!inFront,
			id: id
		};

		if (inFront) {
			this.$frontMarkers[id] = marker;
			this._signal("changeFrontMarker", void 0, this);
		} else {
			this.$backMarkers[id] = marker;
			this._signal("changeBackMarker", void 0, this);
		}

		return id;
	}

	/**
	 * Adds a dynamic marker to the session.
	 * @param {MarkerLike} marker object with update method
	 * @param {Boolean} [inFront] Set to `true` to establish a front marker
	 *
	 * @return {MarkerLike} The added marker
	 **/
	addDynamicMarker(marker: MarkerLike, inFront?: boolean) {
		if (!marker.update)
			return;
		var id = this.$markerId++;
		marker.id = id;
		marker.inFront = !!inFront;

		if (inFront) {
			this.$frontMarkers[id] = marker;
			this._signal("changeFrontMarker", void 0, this);
		} else {
			this.$backMarkers[id] = marker;
			this._signal("changeBackMarker", void 0, this);
		}

		return marker;
	}

	/**
	 * Removes the marker with the specified ID. If this marker was in front, the `'changeFrontMarker'` event is emitted. If the marker was in the back, the `'changeBackMarker'` event is emitted.
	 * @param {Number} markerId A number representing a marker
	 **/
	removeMarker(markerId: number = 0) {
		var marker = this.$frontMarkers[markerId] || this.$backMarkers[markerId];
		if (!marker)
			return;

		var markers = marker.inFront ? this.$frontMarkers : this.$backMarkers;
		delete (markers[markerId]);
		this._signal(marker.inFront ? "changeFrontMarker" : "changeBackMarker", void 0, this);
	}

	/**
	 * Returns an object containing all of the markers, either front or back.
	 * @param {Boolean} [inFront] If `true`, indicates you only want front markers; `false` indicates only back markers
	 *
	 * @returns {{[id: number]: MarkerLike}}
	 **/
	getMarkers(inFront?: boolean): {[id: number]: MarkerLike} {
		return inFront ? this.$frontMarkers : this.$backMarkers;
	}

	public $searchHighlight?: MarkerLike;

	/**
	 * @param {RegExp} re
	 */
	highlight(re?: RegExp) {
		if (!this.$searchHighlight) {
			var highlight = new SearchHighlight(void 0, "ace_selected-word", "text");
			this.$searchHighlight = this.addDynamicMarker(highlight);
		}
		this.$searchHighlight!.setRegexp!(re);
	}

	/**
	 * experimental
	 * @param {number} startRow
	 * @param {number} endRow
	 * @param {string} clazz
	 * @param {boolean} [inFront]
	 * @return {Range}
	 */
	highlightLines(startRow: number, endRow: number, clazz: string, inFront?: boolean) {
		if (typeof endRow != "number") {
			clazz = endRow;
			endRow = startRow;
		}
		if (!clazz)
			clazz = "ace_step";

		var range = new Range(startRow, 0, endRow, Infinity);
		range.id = this.addMarker(range, clazz, "fullLine", inFront);
		return range;
	}

	/*
	 * Error:
	 *  {
	 *    row: 12,
	 *    column: 2, //can be undefined
	 *    text: "Missing argument",
	 *    type: "error" // or "warning" or "info"
	 *  }
	 */
	/**
	 * Sets annotations for the `EditSession`. This functions emits the `'changeAnnotation'` event.
	 * @param {Annotation[]} annotations A list of annotations
	 **/
	setAnnotations(annotations: Annotation[]) {
		this.$annotations = annotations;
		this._signal("changeAnnotation", {}, this);
	}

	/**
	 * Returns the annotations for the `EditSession`.
	 * @returns {Annotation[]}
	 **/
	getAnnotations() {
		return this.$annotations || [];
	}

	/**
	 * Clears all the annotations for this session. This function also triggers the `'changeAnnotation'` event.
	 **/
	clearAnnotations() {
		this.setAnnotations([]);
	}

	private $autoNewLine: string = "\n";

	/**
	 * If `text` contains either the newline (`\n`) or carriage-return ('\r') characters, `$autoNewLine` stores that value.
	 * @param {String} text A block of text
	 *
	 **/
	$detectNewLine(text: string) {
		var match = text.match(/^.*?(\r?\n)/m);
		if (match) {
			this.$autoNewLine = match[1];
		} else {
			this.$autoNewLine = "\n";
		}
	}

	public tokenRe?: RegExp;
	public nonTokenRe?: RegExp;

	/**
	 * Given a starting row and column, this method returns the `Range` of the first word boundary it finds.
	 * @param {Number} row The row to start at
	 * @param {Number} column The column to start at
	 *
	 * @returns {Range}
	 **/
	getWordRange(row: number, column: number) {
		var line = this.getLine(row);

		util.assert(this.tokenRe, "The mode should define a tokenRe");

		var inToken = false;
		if (column > 0)
			inToken = !!line.charAt(column - 1).match(this.tokenRe);

		if (!inToken)
			inToken = !!line.charAt(column).match(this.tokenRe);

		var re: RegExp;

		if (inToken)
			re = this.tokenRe;
		else if (/^\s+$/.test(line.slice(column-1, column+1)))
			re = /\s/;
		else
			re = this.nonTokenRe!;

		var start = column;
		if (start > 0) {
			do {
				start--;
			}
			while (start >= 0 && line.charAt(start).match(re));
			start++;
		}

		var end = column;
		while (end < line.length && line.charAt(end).match(re)) {
			end++;
		}

		return new Range(row, start, row, end);
	}

	/**
	 * Returns the range of the word at the cursor position.
	 * @return {Range}
	 **/
	getWordRangeAtCursor(): Range {
		const pos = this.selection.getCursor();
		return this.getWordRange(pos.row, pos.column);
	}

	/**
	 * Gets the range of a word, including its right whitespace.
	 * @param {Number} row The row number to start from
	 * @param {Number} column The column number to start from
	 *
	 * @return {Range}
	 **/
	getAWordRange(row: number, column: number) {
		var wordRange = this.getWordRange(row, column);
		var line = this.getLine(wordRange.end.row);

		while (line.charAt(wordRange.end.column).match(/[ \t]/)) {
			wordRange.end.column += 1;
		}
		return wordRange;
	}

	/**
	 * {:Document.setNewLineMode.desc}
	 * @param {NewLineMode} newLineMode {:Document.setNewLineMode.param}
	 *
	 *
	 * @related Document.setNewLineMode
	 **/
	setNewLineMode(newLineMode: NewLineMode) {
		this.doc.setNewLineMode(newLineMode);
	}

	/**
	 * Returns the current new line mode.
	 * @returns {NewLineMode}
	 * @related Document.getNewLineMode
	 **/
	getNewLineMode() {
		return this.doc.getNewLineMode();
	}

	/**
	 * Identifies if you want to use a worker for the `EditSession`.
	 * @param {Boolean} useWorker Set to `true` to use a worker
	 **/
	setUseWorker(useWorker: boolean) { this.setOption("useWorker", useWorker); }

	/**
	 * Returns `true` if workers are being used.
	 **/
	getUseWorker() { return this.$useWorker as boolean; }

	/**
	 * Reloads all the tokens on the current session. This function calls [[BackgroundTokenizer.start `BackgroundTokenizer.start ()`]] to all the rows; it also emits the `'tokenizerUpdate'` event.
	 * @internal
	 **/
	onReloadTokenizer(e: {data: { first: number, last: number }}) {
		var rows = e.data;
		this.bgTokenizer.start(rows.first);
		this._signal("tokenizerUpdate", e, this);
	}

	/**
	 * Sets a new text mode for the `EditSession`. This method also emits the `'changeMode'` event. If a [[BackgroundTokenizer `BackgroundTokenizer`]] is set, the `'tokenizerUpdate'` event is also emitted.
	 * @param {SyntaxMode | string} mode Set a new text mode
	 * @param {() => void} [cb] optional callback
	 **/
	setMode(mode?: Ace.SyntaxMode | string, cb?: () => void) {
		var options: any;
		var path: string;
		if (mode && typeof mode === "object") {
			if (mode.getTokenizer!)
				return this.$onChangeMode(mode);
			options = mode;
			path = options.path;
		} else {
			path = /**@type{string}*/(mode) || "ace/mode/text";
		}

		// this is needed if ace isn't on require path (e.g tests in node)
		if (!this.$modes["ace/mode/text"])
			this.$modes["ace/mode/text"] = new TextMode();

		if (this.$modes[path] && !options) {
			this.$onChangeMode(this.$modes[path]);
			cb && cb();
			return;
		}
		// load on demand
		this.$modeId = path;
		config.loadModule(["mode", path], (m)=>{
			if (this.destroyed) {
				return;
			}
			if (this.$modeId !== path)
				return cb && cb();
			if (this.$modes[path] && !options) {
				this.$onChangeMode(this.$modes[path]);
			} else if (m && m.Mode) {
				m = new m.Mode(options);
				if (!options) {
					this.$modes[path] = m;
					m.$id = path;
				}
				this.$onChangeMode(m);
			}
			cb && cb();
		});

		// set mode to text until loading is finished
		if (!this.$mode)
			this.$onChangeMode(this.$modes["ace/mode/text"], true);
	}

	/**
	 * @param mode
	 * @param [$isPlaceholder]
	 */
	$onChangeMode(mode: Ace.SyntaxMode, $isPlaceholder?: boolean) {
		if (!$isPlaceholder)
			this.$modeId = mode.$id;
		if (this.$mode === mode)
			return;

		var oldMode = this.$mode;
		this.$mode = mode;

		this.$stopWorker();

		if (this.$useWorker)
			this.$startWorker();

		var tokenizer = mode.getTokenizer();

		if ((tokenizer as any).on !== undefined) {
			var onReloadTokenizer = this.onReloadTokenizer.bind(this);
			(tokenizer as any).on("update", onReloadTokenizer);
		}

		this.bgTokenizer.setTokenizer(tokenizer);
		this.bgTokenizer.setDocument(this.getDocument());

		/**@type {RegExp}*/
		this.tokenRe = mode.tokenRe;
		/**@type {RegExp}*/
		this.nonTokenRe = mode.nonTokenRe;

		if (!$isPlaceholder) {
			// experimental method, used by c9 findiniles
			if ((mode as any).attachToSession)
				(mode as any).attachToSession(this);
			this.$options.wrapMethod.set.call(this, this.$wrapMethod);
			this.$setFolding(mode.foldingRules!);
			this.bgTokenizer.start(0);
			this._emit("changeMode", {oldMode: oldMode, mode: mode}, this);
		}
	}

	$worker: Worker | null = null;

	$stopWorker() {
		if (this.$worker) {
			this.$worker.terminate();
			this.$worker = null;
		}
	}

	$startWorker() {
		try {
			this.$worker = this.$mode.createWorker(this);
		} catch (e) {
			config.warn("Could not load worker", e);
			this.$worker = null;
		}
	}

	/**
	 * Returns the current text mode.
	 * @returns {TextMode} The current text mode
	 **/
	getMode() {
		return this.$mode;
	}

	/**
	 * This function sets the scroll top value. It also emits the `'changeScrollTop'` event.
	 * @param {Number} scrollTop The new scroll top value
	 **/
	setScrollTop(scrollTop: number) {
		// TODO: should we force integer lineheight instead? scrollTop = Math.round(scrollTop);
		if (this.$scrollTop === scrollTop || isNaN(scrollTop))
			return;

		this.$scrollTop = scrollTop;
		this._signal("changeScrollTop", scrollTop, this);
	}

	/**
	 * [Returns the value of the distance between the top of the editor and the topmost part of the visible content.]{: #EditSession.getScrollTop}
	 * @returns {Number}
	 **/
	getScrollTop() {
		return this.$scrollTop;
	}

	/**
	 * [Sets the value of the distance between the left of the editor and the leftmost part of the visible content.]{: #EditSession.setScrollLeft}
	 * @param {number} scrollLeft
	 */
	setScrollLeft(scrollLeft: number) {
		// scrollLeft = Math.round(scrollLeft);
		if (this.$scrollLeft === scrollLeft || isNaN(scrollLeft))
			return;

		this.$scrollLeft = scrollLeft;
		this._signal("changeScrollLeft", scrollLeft, this);
	}

	/**
	 * [Returns the value of the distance between the left of the editor and the leftmost part of the visible content.]{: #EditSession.getScrollLeft}
	 * @returns {Number}
	 **/
	getScrollLeft() {
		return this.$scrollLeft;
	}

	public screenWidth: number = 0;

	/**
	 * Returns the width of the screen.
	 * @returns {Number}
	 **/
	getScreenWidth() {
		this.$computeWidth();
		if (this.lineWidgets)
			return Math.max(this.getLineWidgetMaxWidth(), this.screenWidth);
		return this.screenWidth;
	}

	/**
	 * @return {number}
	 */
	getLineWidgetMaxWidth() {
		if (this.lineWidgetsWidth != undefined) return this.lineWidgetsWidth;
		var width = 0;
		this.lineWidgets!.forEach(function(w) {
			if (w && w.screenWidth! > width)
				width = w.screenWidth!;
		});
		return this.lineWidgetsWidth = width;
	}

	/**
	 * @param {boolean} [force]
	 */
	$computeWidth(force?: boolean) {
		if (this.$modified || force) {
			this.$modified = false;

			if (this.$useWrapMode)
				return this.screenWidth = this.$wrapLimit;

			var lines = this.doc.getAllLines();
			var cache = this.$rowLengthCache;
			var longestScreenLine = 0;
			var foldIndex = 0;
			var foldLine = this.$foldData[foldIndex];
			var foldStart = foldLine ? foldLine.start.row : Infinity;
			var len = lines.length;

			for (var i = 0; i < len; i++) {
				if (i > foldStart) {
					i = foldLine.end.row + 1;
					if (i >= len)
						break;
					foldLine = this.$foldData[foldIndex++];
					foldStart = foldLine ? foldLine.start.row : Infinity;
				}

				if (cache[i] == null)
					cache[i] = this.$getStringScreenWidth(lines[i])[0];

				if (cache[i] > longestScreenLine)
					longestScreenLine = cache[i];
			}
			this.screenWidth = longestScreenLine;
		}
	}

	/**
	 * Returns a verbatim copy of the given line as it is in the document
	 * @param {Number} row The row to retrieve from
	 * @returns {String}
	 **/
	getLine(row: number): string {
		return this.doc.getLine(row);
	}

	/**
	 * Returns an array of strings of the rows between `firstRow` and `lastRow`. This function is inclusive of `lastRow`.
	 * @param {Number} firstRow The first row index to retrieve
	 * @param {Number} lastRow The final row index to retrieve
	 *
	 * @returns {String[]}
	 *
	 **/
	getLines(firstRow: number, lastRow: number) {
		return this.doc.getLines(firstRow, lastRow);
	}

	/**
	 * Returns the number of rows in the document.
	 * @returns {Number}
	 **/
	getLength() {
		return this.doc.getLength();
	}

	/**
	 * {:Document.getTextRange.desc}
	 * @param {IRange} [range] The range to work with
	 *
	 * @returns {String}
	 **/
	getTextRange(range?: Ace.IRange) {
		return this.doc.getTextRange(range || this.selection.getRange());
	}

	/**
	 * Inserts a block of `text` and the indicated `position`.
	 * @param {Point} position The position {row, column} to start inserting at
	 * @param {String} text A chunk of text to insert
	 * @returns {Point} The position of the last line of `text`. If the length of `text` is 0, this function simply returns `position`.
	 **/
	insert(position: Ace.Point, text: string) {
		return this.doc.insert(position, text);
	}

	/**
	 * Removes the `range` from the document.
	 * @param {IRange} range A specified Range to remove
	 * @returns {Point} The new `start` property of the range, which contains `startRow` and `startColumn`. If `range` is empty, this function returns the unmodified value of `range.start`.
	 **/
	remove(range: Ace.IRange) {
		return this.doc.remove(range);
	}

	/**
	 * Removes a range of full lines. This method also triggers the `'change'` event.
	 * @param {Number} firstRow The first row to be removed
	 * @param {Number} lastRow The last row to be removed
	 * @returns {String[]} Returns all the removed lines.
	 *
	 * @related Document.removeFullLines
	 *
	 **/
	removeFullLines(firstRow: number, lastRow: number) {
		return this.doc.removeFullLines(firstRow, lastRow);
	}

	/**
	 * Reverts previous changes to your document.
	 * @param {Delta[]} deltas An array of previous changes
	 * @param {Boolean} [dontSelect] If `true`, doesn't select the range of where the change occured
	 **/
	undoChanges(deltas: Delta[], dontSelect?: boolean) {
		if (!deltas.length)
			return;

		this.$fromUndo = true;
		for (var i = deltas.length - 1; i != -1; i--) {
			var delta = deltas[i];
			if (delta.action == "insert" || delta.action == "remove") {
				this.doc.revertDelta(delta);
			} else if (delta.folds) {
				this.addFolds(delta.folds);
			}
		}
		if (!dontSelect && this.$undoSelect) {
			//@ts-expect-error TODO: potential wrong property
			if (deltas.selectionBefore)
				//@ts-expect-error TODO: potential wrong property
				this.selection.fromJSON(deltas.selectionBefore);
			else
				this.selection.setRange(this.$getUndoSelection(deltas, true));
		}
		this.$fromUndo = false;
	}

	/**
	 * Re-implements a previously undone change to your document.
	 * @param {Delta[]} deltas An array of previous changes
	 * @param {Boolean} [dontSelect] {:dontSelect}
	 **/
	redoChanges(deltas: Delta[], dontSelect?: boolean) {
		if (!deltas.length)
			return;

		this.$fromUndo = true;
		for (var i = 0; i < deltas.length; i++) {
			var delta = deltas[i];
			if (delta.action == "insert" || delta.action == "remove") {
				this.doc.$safeApplyDelta(delta);
			}
		}

		if (!dontSelect && this.$undoSelect) {
			//@ts-expect-error TODO: potential wrong property
			if (deltas.selectionAfter)
				//@ts-expect-error TODO: potential wrong property
				this.selection.fromJSON(deltas.selectionAfter);
			else
				this.selection.setRange(this.$getUndoSelection(deltas, false));
		}
		this.$fromUndo = false;
	}

	/**
	 * Enables or disables highlighting of the range where an undo occurred.
	 * @param {Boolean} enable If `true`, selects the range of the reinserted change
	 *
	 **/
	setUndoSelect(enable: boolean) {
		this.$undoSelect = enable;
	}

	/**
	 * @param {Delta[]} deltas
	 * @param {boolean} [isUndo]
	 * @return {Range}
	 */
	$getUndoSelection(deltas: Delta[], isUndo?: boolean): Range {
		function isInsert(delta: Delta) {
			return isUndo ? delta.action !== "insert" : delta.action === "insert";
		}

		var range: Range = new Range(0, 0, 0, 0);
		var point: Ace.Point;

		for (var i = 0; i < deltas.length; i++) {
			var delta = deltas[i];
			if (!delta.start) continue; // skip folds
			if (!range) {
				if (isInsert(delta)) {
					range = Range.fromPoints(delta.start, delta.end);
				} else {
					range = Range.fromPoints(delta.start, delta.start);
				}
				continue;
			}

			if (isInsert(delta)) {
				point = delta.start;
				if (range.compare(point.row, point.column) == -1) {
					range.setStart(point);
				}
				point = delta.end;
				if (range.compare(point.row, point.column) == 1) {
					range.setEnd(point);
				}
			} else {
				point = delta.start;
				if (range.compare(point.row, point.column) == -1) {
					range = Range.fromPoints(delta.start, delta.start);
				}
			}
		}
		return range;
	}

	/**
	 * Replaces a range in the document with the new `text`.
	 *
	 * @param {IRange} range A specified Range to replace
	 * @param {String} text The new text to use as a replacement
	 * @returns {Point} An object containing the final row and column, like this:
	 * ```
	 * {row: endRow, column: 0}
	 * ```
	 * If the text and range are empty, this function returns an object containing the current `range.start` value.
	 * If the text is the exact same as what currently exists, this function returns an object containing the current `range.end` value.
	 *
	 * @related Document.replace
	 **/
	replace(range: IRange, text: string) {
		return this.doc.replace(range, text);
	}

	/**
	 * Moves a range of text from the given range to the given position. `toPosition` is an object that looks like this:
	 *  ```json
	 *    { row: newRowLocation, column: newColumnLocation }
	 *  ```
	 * @param {Range} fromRange The range of text you want moved within the document
	 * @param {Point} toPosition The location (row and column) where you want to move the text to
	 * @param {boolean} [copy]
	 * @returns {Range} The new range where the text was moved to.
	 **/
	moveText(fromRange: Ace.Range, toPosition: Ace.Point, copy?: boolean) {
		var text = this.getTextRange(fromRange);
		var folds = this.getFoldsInRange(fromRange);

		var toRange = Range.fromPoints(toPosition, toPosition);
		if (!copy) {
			this.remove(fromRange);
			var rowDiff = fromRange.start.row - fromRange.end.row;
			var collDiff = rowDiff ? -fromRange.end.column : fromRange.start.column - fromRange.end.column;
			if (collDiff) {
				if (toRange.start.row == fromRange.end.row && toRange.start.column > fromRange.end.column)
					toRange.start.column += collDiff;
				if (toRange.end.row == fromRange.end.row && toRange.end.column > fromRange.end.column)
					toRange.end.column += collDiff;
			}
			if (rowDiff && toRange.start.row >= fromRange.end.row) {
				toRange.start.row += rowDiff;
				toRange.end.row += rowDiff;
			}
		}

		toRange.end = this.insert(toRange.start, text);
		if (folds.length) {
			var oldStart = fromRange.start;
			var newStart = toRange.start;
			var rowDiff = newStart.row - oldStart.row;
			var collDiff = newStart.column - oldStart.column;
			this.addFolds(folds.map(function(x) {
				x = x.clone();
				if (x.start.row == oldStart.row)
					x.start.column += collDiff;
				if (x.end.row == oldStart.row)
					x.end.column += collDiff;
				x.start.row += rowDiff;
				x.end.row += rowDiff;
				return x;
			}));
		}

		return toRange;
	}

	/**
	 * Indents all the rows, from `startRow` to `endRow` (inclusive), by prefixing each row with the token in `indentString`.
	 *
	 * If `indentString` contains the `'\t'` character, it's replaced by whatever is defined by [[EditSession.getTabString `getTabString()`]].
	 * @param {Number} startRow Starting row
	 * @param {Number} endRow Ending row
	 * @param {String} indentString The indent token
	 **/
	indentRows(startRow: number, endRow: number, indentString: string) {
		indentString = indentString.replace(/\t/g, this.getTabString());
		for (var row=startRow; row<=endRow; row++)
			this.doc.insertInLine({row: row, column: 0}, indentString);
	}

	/**
	 * Outdents all the rows defined by the `start` and `end` properties of `range`.
	 * @param {Range} range A range of rows
	 **/
	outdentRows(range: Range) {
		var rowRange = range.collapseRows();
		var deleteRange = new Range(0, 0, 0, 0);
		var size = this.getTabSize();

		for (var i = rowRange.start.row; i <= rowRange.end.row; ++i) {
			var line = this.getLine(i);

			deleteRange.start.row = i;
			deleteRange.end.row = i;
			for (var j = 0; j < size; ++j)
				if (line.charAt(j) != ' ')
					break;
			if (j < size && line.charAt(j) == '\t') {
				deleteRange.start.column = j;
				deleteRange.end.column = j + 1;
			} else {
				deleteRange.start.column = 0;
				deleteRange.end.column = j;
			}
			this.remove(deleteRange);
		}
	}

	/**
	 *
	 * @param {number} firstRow
	 * @param {number} lastRow
	 * @param [dir]
	 * @returns {number}
	 */
	$moveLines(firstRow: number, lastRow: number, dir: number) {
		firstRow = this.getRowFoldStart(firstRow);
		lastRow = this.getRowFoldEnd(lastRow);
		if (dir < 0) {
			var row = this.getRowFoldStart(firstRow + dir);
			if (row < 0) return 0;
			var diff = row-firstRow;
		} else if (dir > 0) {
			var row = this.getRowFoldEnd(lastRow + dir);
			if (row > this.doc.getLength()-1) return 0;
			var diff = row-lastRow;
		} else {
			firstRow = this.$clipRowToDocument(firstRow);
			lastRow = this.$clipRowToDocument(lastRow);
			var diff = lastRow - firstRow + 1;
		}

		var range = new Range(firstRow, 0, lastRow, Number.MAX_VALUE);
		var folds = this.getFoldsInRange(range).map(function(x){
			x = x.clone();
			x.start.row += diff;
			x.end.row += diff;
			return x;
		});

		var lines = dir == 0
			? this.doc.getLines(firstRow, lastRow)
			: this.doc.removeFullLines(firstRow, lastRow);
		this.doc.insertFullLines(firstRow+diff, lines);
		folds.length && this.addFolds(folds);
		return diff;
	}
	/**
	 * Shifts all the lines in the document up one, starting from `firstRow` and ending at `lastRow`.
	 * @param {Number} firstRow The starting row to move up
	 * @param {Number} lastRow The final row to move up
	 * @returns {Number} If `firstRow` is less-than or equal to 0, this function returns 0. Otherwise, on success, it returns -1.
	 **/
	moveLinesUp(firstRow: number, lastRow: number) {
		return this.$moveLines(firstRow, lastRow, -1);
	}

	/**
	 * Shifts all the lines in the document down one, starting from `firstRow` and ending at `lastRow`.
	 * @param {Number} firstRow The starting row to move down
	 * @param {Number} lastRow The final row to move down
	 * @returns {Number} If `firstRow` is less-than or equal to 0, this function returns 0. Otherwise, on success, it returns -1.
	 **/
	moveLinesDown(firstRow: number, lastRow: number) {
		return this.$moveLines(firstRow, lastRow, 1);
	}

	/**
	 * Duplicates all the text between `firstRow` and `lastRow`.
	 * @param {Number} firstRow The starting row to duplicate
	 * @param {Number} lastRow The final row to duplicate
	 * @returns {Number} Returns the number of new rows added; in other words, `lastRow - firstRow + 1`.
	 **/
	duplicateLines(firstRow: number, lastRow: number) {
		return this.$moveLines(firstRow, lastRow, 0);
	}

	/**
	 * @param {number} row
	 * @returns {number}
	 */
	$clipRowToDocument(row: number) {
		return Math.max(0, Math.min(row, this.doc.getLength()-1));
	}

	/**
	 * @param {number} row
	 * @param {number} column
	 * @returns {number}
	 */
	$clipColumnToRow(row: number, column: number) {
		if (column < 0) return 0;
		return Math.min(this.doc.getLine(row).length, column);
	}

	/**
	 * @param {number} row
	 * @param {number} column
	 * @returns {Point}
	 */
	$clipPositionToDocument(row: number, column: number) {
		column = Math.max(0, column);

		if (row < 0) {
			row = 0;
			column = 0;
		} else {
			var len = this.doc.getLength();
			if (row >= len) {
				row = len - 1;
				column = this.doc.getLine(len-1).length;
			} else {
				column = Math.min(this.doc.getLine(row).length, column);
			}
		}

		return {
			row: row,
			column: column
		};
	}

	/**
	 * @param {Range} range
	 * @returns {Range}
	 */
	$clipRangeToDocument(range: Range) {
		if (range.start.row < 0) {
			range.start.row = 0;
			range.start.column = 0;
		} else {
			range.start.column = this.$clipColumnToRow(
				range.start.row,
				range.start.column
			);
		}

		var len = this.doc.getLength() - 1;
		if (range.end.row > len) {
			range.end.row = len;
			range.end.column = this.doc.getLine(len).length;
		} else {
			range.end.column = this.$clipColumnToRow(
				range.end.row,
				range.end.column
			);
		}
		return range;
	}

	/**
	 * Sets whether or not line wrapping is enabled. If `useWrapMode` is different than the current value, the `'changeWrapMode'` event is emitted.
	 * @param {Boolean} useWrapMode Enable (or disable) wrap mode
	 **/
	setUseWrapMode(useWrapMode: boolean) {
		if (useWrapMode != this.$useWrapMode) {
			this.$useWrapMode = useWrapMode;
			this.$modified = true;
			this.$resetRowCache(0);

			// If wrapMode is activaed, the wrapData array has to be initialized.
			if (useWrapMode) {
				var len = this.getLength();
				this.$wrapData = Array(len);
				this.$updateWrapData(0, len - 1);
			}

			this._signal("changeWrapMode", void 0, this);
		}
	}

	/**
	 * Returns `true` if wrap mode is being used; `false` otherwise.
	 * @returns {Boolean}
	 **/
	getUseWrapMode() {
		return this.$useWrapMode;
	}

	// Allow the wrap limit to move freely between min and max. Either
	// parameter can be null to allow the wrap limit to be unconstrained
	// in that direction. Or set both parameters to the same number to pin
	// the limit to that value.
	/**
	 * Sets the boundaries of wrap. Either value can be `null` to have an unconstrained wrap, or, they can be the same number to pin the limit. If the wrap limits for `min` or `max` are different, this method also emits the `'changeWrapMode'` event.
	 * @param {Number} min The minimum wrap value (the left side wrap)
	 * @param {Number} max The maximum wrap value (the right side wrap)
	 **/
	setWrapLimitRange(min: number, max: number) {
		if (this.$wrapLimitRange.min !== min || this.$wrapLimitRange.max !== max) {
			this.$wrapLimitRange = { min: min, max: max };
			this.$modified = true;
			this.$bidiHandler.markAsDirty();

			// This will force a recalculation of the wrap limit
			if (this.$useWrapMode)
				this._signal("changeWrapMode", void 0, this);
		}
	}

	/**
	 * This should generally only be called by the renderer when a resize is detected.
	 * @param {Number} desiredLimit The new wrap limit
	 * @param [$printMargin]
	 * @returns {Boolean}
	 **/
	adjustWrapLimit(desiredLimit: number, $printMargin: number = 80) {
		var limits = this.$wrapLimitRange;
		if (limits.max < 0)
			limits = {min: $printMargin, max: $printMargin};
		var wrapLimit = this.$constrainWrapLimit(desiredLimit, limits.min, limits.max);
		if (wrapLimit != this.$wrapLimit && wrapLimit > 1) {
			this.$wrapLimit = wrapLimit;
			this.$modified = true;
			if (this.$useWrapMode) {
				this.$updateWrapData(0, this.getLength() - 1);
				this.$resetRowCache(0);
				this._signal("changeWrapLimit", wrapLimit, this);
			}
			return true;
		}
		return false;
	}

	/**
	 *
	 * @param {number} wrapLimit
	 * @param {number} [min]
	 * @param {number} [max]
	 * @returns {number}
	 */
	$constrainWrapLimit(wrapLimit: number, min?: number, max?: number) {
		if (min)
			wrapLimit = Math.max(min, wrapLimit);
		if (max)
			wrapLimit = Math.min(max, wrapLimit);
		return wrapLimit;
	}

	/**
	 * Returns the value of wrap limit.
	 * @returns {Number} The wrap limit.
	 **/
	getWrapLimit() {
		return this.$wrapLimit;
	}

	/**
	 * Sets the line length for soft wrap in the editor. Lines will break
	 *  at a minimum of the given length minus 20 chars and at a maximum
	 *  of the given number of chars.
	 * @param {number} limit The maximum line length in chars, for soft wrapping lines.
	 */
	setWrapLimit(limit: number) {
		this.setWrapLimitRange(limit, limit);
	}

	/**
	 * Returns an object that defines the minimum and maximum of the wrap limit; it looks something like this:
	 *
	 *     { min: wrapLimitRange_min, max: wrapLimitRange_max }
	 *
	 * @returns {{ min: number, max: number }}
	 **/
	getWrapLimitRange() {
		// Avoid unexpected mutation by returning a copy
		return {
			min : this.$wrapLimitRange.min,
			max : this.$wrapLimitRange.max
		};
	}

	public $updating?: boolean;

	/**
	 * @param {Delta} delta
	 */
	$updateInternalDataOnChange(delta: Delta) {
		var useWrapMode = this.$useWrapMode;
		var action = delta.action;
		var start = delta.start;
		var end = delta.end;
		var firstRow = start.row;
		var lastRow = end.row;
		var len = lastRow - firstRow;
		var removedFolds = null;

		this.$updating = true;
		if (len != 0) {
			if (action === "remove") {
				this[useWrapMode ? "$wrapData" : "$rowLengthCache"].splice(firstRow, len);

				var foldLines = this.$foldData;
				removedFolds = this.getFoldsInRange(delta);
				this.removeFolds(removedFolds);

				var foldLine = this.getFoldLine(end.row);
				var idx = 0;
				if (foldLine) {
					foldLine.addRemoveChars(end.row, end.column, start.column - end.column);
					foldLine.shiftRow(-len);

					var foldLineBefore = this.getFoldLine(firstRow);
					if (foldLineBefore && foldLineBefore !== foldLine) {
						foldLineBefore.merge(foldLine);
						foldLine = foldLineBefore;
					}
					idx = foldLines.indexOf(foldLine) + 1;
				}

				for (idx; idx < foldLines.length; idx++) {
					let foldLine = foldLines[idx];
					if (foldLine.start.row >= end.row) {
						foldLine.shiftRow(-len);
					}
				}

				lastRow = firstRow;
			} else {
				var args = Array(len);
				var arr = useWrapMode ? this.$wrapData : this.$rowLengthCache;
				arr.splice(firstRow, 0, ...args);

				// If some new line is added inside of a foldLine, then split
				// the fold line up.
				var foldLines = this.$foldData;
				var foldLine = this.getFoldLine(firstRow);
				var idx = 0;
				if (foldLine) {
					var cmp = foldLine.range.compareInside(start.row, start.column);
					// Inside of the foldLine range. Need to split stuff up.
					if (cmp == 0) {
						foldLine = foldLine.split(start.row, start.column);
						if (foldLine) {
							foldLine.shiftRow(len);
							foldLine.addRemoveChars(lastRow, 0, end.column - start.column);
						}
					} else
					// Infront of the foldLine but same row. Need to shift column.
						if (cmp == -1) {
							foldLine.addRemoveChars(firstRow, 0, end.column - start.column);
							foldLine.shiftRow(len);
						}
					// Nothing to do if the insert is after the foldLine.
					idx = foldLines.indexOf(foldLine!) + 1;
				}

				for (idx; idx < foldLines.length; idx++) {
					let foldLine = foldLines[idx];
					if (foldLine.start.row >= firstRow) {
						foldLine.shiftRow(len);
					}
				}
			}
		} else {
			// Realign folds. E.g. if you add some new chars before a fold, the
			// fold should "move" to the right.
			len = Math.abs(delta.start.column - delta.end.column);
			if (action === "remove") {
				// Get all the folds in the change range and remove them.
				removedFolds = this.getFoldsInRange(delta);
				this.removeFolds(removedFolds);

				len = -len;
			}
			var foldLine = this.getFoldLine(firstRow);
			if (foldLine) {
				foldLine.addRemoveChars(firstRow, start.column, len);
			}
		}

		if (useWrapMode && this.$wrapData.length != this.doc.getLength()) {
			console.error("doc.getLength() and $wrapData.length have to be the same!");
		}
		this.$updating = false;

		if (useWrapMode)
			this.$updateWrapData(firstRow, lastRow);
		else
			this.$updateRowLengthCache(firstRow, lastRow);

		return removedFolds;
	}

	/**
	 * @param {number} firstRow
	 * @param {number} lastRow
	 */
	$updateRowLengthCache(firstRow: number, lastRow: number) {
		util.assert(firstRow < 1000000 && lastRow < 1000000, "$updateRowLengthCache called with invalid row numbers");
		this.$rowLengthCache[firstRow] = null!;
		this.$rowLengthCache[lastRow] = null!;
	}

	/**
	 * @param {number} firstRow
	 * @param {number} lastRow
	 */
	$updateWrapData(firstRow: number, lastRow: number) {
		var lines = this.doc.getAllLines();
		var tabSize = this.getTabSize();
		var wrapData = this.$wrapData;
		var wrapLimit = this.$wrapLimit;
		var tokens: number[];
		var foldLine: FoldLine | null = null;

		var row = firstRow;
		lastRow = Math.min(lastRow, lines.length - 1);
		while (row <= lastRow) {
			foldLine = this.getFoldLine(row, foldLine!);
			if (!foldLine) {
				tokens = this.$getDisplayTokens(lines[row]);
				wrapData[row] = this.$computeWrapSplits(tokens, wrapLimit, tabSize);
				row ++;
			} else {
				tokens = [];
				foldLine.walk((placeholder: string | null, row: number, column: number, lastColumn: number) => {
						var walkTokens;
						if (placeholder != null) {
							walkTokens = this.$getDisplayTokens(
											placeholder, tokens.length);
							walkTokens[0] = PLACEHOLDER_START;
							for (var i = 1; i < walkTokens.length; i++) {
								walkTokens[i] = PLACEHOLDER_BODY;
							}
						} else {
							walkTokens = this.$getDisplayTokens(
								lines[row].substring(lastColumn, column),
								tokens.length);
						}
						tokens = tokens.concat(walkTokens);
					},
					foldLine.end.row,
					lines[foldLine.end.row].length + 1
				);

				wrapData[foldLine.start.row] = this.$computeWrapSplits(tokens, wrapLimit, tabSize);
				row = foldLine.end.row + 1;
			}
		}
	}

	/**
	 * @param {number[]}tokens
	 * @param {number} wrapLimit
	 * @param {number} tabSize
	 * @returns {*[]}
	 */
	$computeWrapSplits(tokens: number[], wrapLimit: number, tabSize: number) {
		if (tokens.length == 0) {
			return [];
		}

		var splits: number[] = [];
		var displayLength = tokens.length;
		var lastSplit = 0, lastDocSplit = 0;

		var isCode = this.$wrapAsCode;

		var indentedSoftWrap = this.$indentedSoftWrap;
		var maxIndent = wrapLimit <= Math.max(2 * tabSize, 8)
			|| indentedSoftWrap === false ? 0 : Math.floor(wrapLimit / 2);

		function getWrapIndent() {
			var indentation = 0;
			if (maxIndent === 0)
				return indentation;
			if (indentedSoftWrap) {
				for (var i = 0; i < tokens.length; i++) {
					var token = tokens[i];
					if (token == SPACE)
						indentation += 1;
					else if (token == TAB)
						indentation += tabSize;
					else if (token == TAB_SPACE)
						continue;
					else
						break;
				}
			}
			if (isCode && indentedSoftWrap !== false)
				indentation += tabSize;
			return Math.min(indentation, maxIndent);
		}
		function addSplit(screenPos: number) {
			// The document size is the current size - the extra width for tabs
			// and multipleWidth characters.
			var len = screenPos - lastSplit;
			for (var i = lastSplit; i < screenPos; i++) {
				var ch = tokens[i];
				if (ch === 12 || ch === 2) len -= 1;
			}

			if (!splits.length) {
				indent = getWrapIndent();
				//@ts-expect-error TODO: potential wrong property
				splits.indent = indent;
			}
			lastDocSplit += len;
			splits.push(lastDocSplit);
			lastSplit = screenPos;
		}
		var indent = 0;
		while (displayLength - lastSplit > wrapLimit - indent) {
			// This is, where the split should be.
			var split = lastSplit + wrapLimit - indent;

			// If there is a space or tab at this split position, then making
			// a split is simple.
			if (tokens[split - 1] >= SPACE && tokens[split] >= SPACE) {
				/* disabled see https://github.com/ajaxorg/ace/issues/1186
				// Include all following spaces + tabs in this split as well.
				while (tokens[split] >= SPACE) {
					split ++;
				} */
				addSplit(split);
				continue;
			}

			// === ELSE ===
			// Check if split is inside of a placeholder. Placeholder are
			// not splitable. Therefore, seek the beginning of the placeholder
			// and try to place the split before the placeholder's start.
			if (tokens[split] == PLACEHOLDER_START || tokens[split] == PLACEHOLDER_BODY) {
				// Seek the start of the placeholder and do the split
				// before the placeholder. By definition there always
				// a PLACEHOLDER_START between split and lastSplit.
				for (split; split != lastSplit - 1; split--) {
					if (tokens[split] == PLACEHOLDER_START) {
						// split++; << No incremental here as we want to
						//  have the position before the Placeholder.
						break;
					}
				}

				// If the PLACEHOLDER_START is not the index of the
				// last split, then we can do the split
				if (split > lastSplit) {
					addSplit(split);
					continue;
				}

				// If the PLACEHOLDER_START IS the index of the last
				// split, then we have to place the split after the
				// placeholder. So, let's seek for the end of the placeholder.
				split = lastSplit + wrapLimit;
				for (split; split < tokens.length; split++) {
					if (tokens[split] != PLACEHOLDER_BODY) {
						break;
					}
				}

				// If spilt == tokens.length, then the placeholder is the last
				// thing in the line and adding a new split doesn't make sense.
				if (split == tokens.length) {
					break;  // Breaks the while-loop.
				}

				// Finally, add the split...
				addSplit(split);
				continue;
			}

			// === ELSE ===
			// Search for the first non space/tab/placeholder/punctuation token backwards.
			var minSplit = Math.max(split - (wrapLimit -(wrapLimit>>2)), lastSplit - 1);
			while (split > minSplit && tokens[split] < PLACEHOLDER_START) {
				split --;
			}
			if (isCode) {
				while (split > minSplit && tokens[split] < PLACEHOLDER_START) {
					split --;
				}
				while (split > minSplit && tokens[split] == PUNCTUATION) {
					split --;
				}
			} else {
				while (split > minSplit && tokens[split] < SPACE) {
					split --;
				}
			}
			// If we found one, then add the split.
			if (split > minSplit) {
				addSplit(++split);
				continue;
			}

			// === ELSE ===
			split = lastSplit + wrapLimit;
			// The split is inside of a CHAR or CHAR_EXT token and no space
			// around -> force a split.
			if (tokens[split] == CHAR_EXT)
				split--;
			addSplit(split - indent);
		}
		return splits;
	}

	/**
	 * Given a string, returns an array of the display characters, including tabs and spaces.
	 * @param {String} str The string to check
	 * @param {Number} [offset] The value to start at
	 * @returns {number[]}
	 **/
	$getDisplayTokens(str: string, offset?: number) {
		var arr = [];
		var tabSize;
		offset = offset || 0;

		for (var i = 0; i < str.length; i++) {
			var c = str.charCodeAt(i);
			// Tab
			if (c == 9) {
				tabSize = this.getScreenTabSize(arr.length + offset);
				arr.push(TAB);
				for (var n = 1; n < tabSize; n++) {
					arr.push(TAB_SPACE);
				}
			}
			// Space
			else if (c == 32) {
				arr.push(SPACE);
			} else if((c > 39 && c < 48) || (c > 57 && c < 64)) {
				arr.push(PUNCTUATION);
			}
			// full width characters
			else if (c >= 0x1100 && isFullWidth(c)) {
				arr.push(CHAR, CHAR_EXT);
			} else {
				arr.push(CHAR);
			}
		}
		return arr;
	}

	/**
	 * Calculates the width of the string `str` on the screen while assuming that the string starts at the first column on the screen.
	 * @param {String} str The string to calculate the screen width of
	 * @param {Number} [maxScreenColumn]
	 * @param {Number} [screenColumn]
	 * @returns {Number[]} Returns an `int[]` array with two elements:<br/>
	 * The first position indicates the number of columns for `str` on screen.<br/>
	 * The second value contains the position of the document column that this function read until.
	 **/
	$getStringScreenWidth(str: string, maxScreenColumn?: number, screenColumn?: number): [number, number] {
		if (maxScreenColumn == 0)
			return [0, 0];
		if (maxScreenColumn == null)
			maxScreenColumn = Infinity;
		screenColumn = screenColumn || 0;

		var c, column;
		for (column = 0; column < str.length; column++) {
			c = str.charCodeAt(column);
			// tab
			if (c == 9) {
				screenColumn += this.getScreenTabSize(screenColumn);
			}
			// full width characters
			else if (c >= 0x1100 && isFullWidth(c)) {
				screenColumn += 2;
			} else {
				screenColumn += 1;
			}
			if (screenColumn > maxScreenColumn) {
				break;
			}
		}

		return [screenColumn, column];
	}

	/**
	 * Returns number of screenrows in a wrapped line.
	 * @param {Number} row The row number to check
	 * @returns {Number}
	 **/
	getRowLength(row: number) {
		var h = 1;
		if (this.lineWidgets)
			h += this.lineWidgets[row] && this.lineWidgets[row].rowCount || 0;

		if (!this.$useWrapMode || !this.$wrapData[row])
			return h;
		else
			return this.$wrapData[row].length + h;
	}

	/**
	 * @param {Number} row
	 * @returns {Number}
	 **/
	getRowLineCount(row: number) {
		if (!this.$useWrapMode || !this.$wrapData[row]) {
			return 1;
		} else {
			return this.$wrapData[row].length + 1;
		}
	}

	/**
	 * @param {Number} screenRow
	 * @returns {Number}
	 **/
	getRowWrapIndent(screenRow: number) {
		if (this.$useWrapMode) {
			var pos = this.screenToDocumentPosition(screenRow, Number.MAX_VALUE);
			var splits = this.$wrapData[pos.row];
			return splits.length && splits[0] < pos.column ? splits.indent! : 0;
		} else {
			return 0;
		}
	}

	/**
	 * Returns the position (on screen) for the last character in the provided screen row.
	 * @param {Number} screenRow The screen row to check
	 * @returns {Number}
	 *
	 * @related EditSession.documentToScreenColumn
	 **/
	getScreenLastRowColumn(screenRow: number) {
		var pos = this.screenToDocumentPosition(screenRow, Number.MAX_VALUE);
		return this.documentToScreenColumn(pos.row, pos.column);
	}

	/**
	 * For the given document row and column, this returns the column position of the last screen row.
	 * @param {Number} docRow
	 * @param {Number} docColumn
	 * @returns {number}
	 **/
	getDocumentLastRowColumn(docRow: number, docColumn: number) {
		var screenRow = this.documentToScreenRow(docRow, docColumn);
		return this.getScreenLastRowColumn(screenRow);
	}

	/**
	 * For the given document row and column, this returns the document position of the last row.
	 * @param {Number} docRow
	 * @param {Number} docColumn
	 * @returns {Point}
	 **/
	getDocumentLastRowColumnPosition(docRow: number, docColumn: number) {
		var screenRow = this.documentToScreenRow(docRow, docColumn);
		return this.screenToDocumentPosition(screenRow, Number.MAX_VALUE / 10);
	}

	/**
	 * For the given row, this returns the split data.
	 * @param {number} row
	 * @returns {String | undefined}
	 */
	getRowSplitData(row: number): (number[] & {indent?: number}) | undefined {
		if (!this.$useWrapMode) {
			return undefined;
		} else {
			return this.$wrapData[row];
		}
	}

	/**
	 * The distance to the next tab stop at the specified screen column.
	 * @param {Number} screenColumn The screen column to check
	 *
	 * @returns {Number}
	 **/
	getScreenTabSize(screenColumn: number) {
		return this.$tabSize - (screenColumn % this.$tabSize | 0);
	}

	/**
	 * @param {number} screenRow
	 * @param {number} screenColumn
	 * @returns {number}
	 */
	screenToDocumentRow(screenRow: number, screenColumn: number) {
		return this.screenToDocumentPosition(screenRow, screenColumn).row;
	}

	/**
	 * @param {number} screenRow
	 * @param {number} screenColumn
	 * @returns {number}
	 */
	screenToDocumentColumn(screenRow: number, screenColumn: number) {
		return this.screenToDocumentPosition(screenRow, screenColumn).column;
	}

	/**
	 * Converts characters coordinates on the screen to characters coordinates within the document. [This takes into account code folding, word wrap, tab size, and any other visual modifications.]{: #conversionConsiderations}
	 * @param {Number} screenRow The screen row to check
	 * @param {Number} screenColumn The screen column to check
	 * @param {Number} [offsetX] screen character x-offset [optional]
	 *
	 * @returns {Point} The object returned has two properties: `row` and `column`.
	 *
	 * @related EditSession.documentToScreenPosition
	 **/
	screenToDocumentPosition(screenRow: number, screenColumn: number, offsetX?: number): Ace.Point {
		if (screenRow < 0)
			return {row: 0, column: 0};

		var line;
		var docRow = 0;
		var docColumn = 0;
		var column;
		var row = 0;
		var rowLength = 0;

		var rowCache = this.$screenRowCache;
		var i = this.$getRowCacheIndex(rowCache, screenRow);
		var l = rowCache.length;
		if (l && i >= 0) {
			var row = rowCache[i];
			var docRow = this.$docRowCache[i];
			var doCache = screenRow > rowCache[l - 1];
		} else {
			var doCache = !l;
		}

		var maxRow = this.getLength() - 1;
		var foldLine = this.getNextFoldLine(docRow);
		var foldStart = foldLine ? foldLine.start.row : Infinity;

		while (row <= screenRow) {
			rowLength = this.getRowLength(docRow);
			if (row + rowLength > screenRow || docRow >= maxRow) {
				break;
			} else {
				row += rowLength;
				docRow++;
				if (docRow > foldStart) {
					docRow = foldLine!.end.row+1;
					foldLine = this.getNextFoldLine(docRow, foldLine!);
					foldStart = foldLine ? foldLine.start.row : Infinity;
				}
			}

			if (doCache) {
				this.$docRowCache.push(docRow);
				this.$screenRowCache.push(row);
			}
		}

		if (foldLine && foldLine.start.row <= docRow) {
			line = this.getFoldDisplayLine(foldLine);
			docRow = foldLine.start.row;
		} else if (row + rowLength <= screenRow || docRow > maxRow) {
			// clip at the end of the document
			return {
				row: maxRow,
				column: this.getLine(maxRow).length
			};
		} else {
			line = this.getLine(docRow);
			foldLine = null;
		}
		var wrapIndent = 0, splitIndex = Math.floor(screenRow - row);
		if (this.$useWrapMode) {
			var splits = this.$wrapData[docRow];
			if (splits) {
				column = splits[splitIndex];
				if(splitIndex > 0 && splits.length) {
					wrapIndent = splits.indent!;
					docColumn = splits[splitIndex - 1] || splits[splits.length - 1];
					line = line.substring(docColumn);
				}
			}
		}

		if (offsetX !== undefined && this.$bidiHandler.isBidiRow(row + splitIndex, docRow, splitIndex))
			screenColumn = this.$bidiHandler.offsetToCol(offsetX);

		docColumn += this.$getStringScreenWidth(line, screenColumn - wrapIndent)[1];

		// We remove one character at the end so that the docColumn
		// position returned is not associated to the next row on the screen.
		if (this.$useWrapMode && docColumn >= column!)
			docColumn = column! - 1;

		if (foldLine)
			return foldLine.idxToPosition(docColumn);

		return {row: docRow, column: docColumn};
	}

	/**
	 * Converts document coordinates to screen coordinates. {:conversionConsiderations}
	 * @param {Number|Point} docRow The document row to check
	 * @param {Number|undefined} [docColumn] The document column to check
	 * @returns {Point} The object returned by this method has two properties: `row` and `column`.
	 *
	 * @related EditSession.screenToDocumentPosition
	 **/
	documentToScreenPosition(docRow: number|Ace.Point, docColumn?: number) {
		// Normalize the passed in arguments.
		if (typeof docRow === "object")
			var pos = this.$clipPositionToDocument(/**@type{Point}*/(docRow).row, /**@type{Point}*/(docRow).column);
		else {
			util.assert(typeof docRow === "number");
			util.assert(typeof docColumn === "number");
			pos = this.$clipPositionToDocument(/**@type{number}*/(docRow as number), docColumn!);
		}

		docRow = pos.row;
		docColumn = pos.column;

		var screenRow = 0;
		var foldStartRow = null;
		var fold = null;

		// Clamp the docRow position in case it's inside of a folded block.
		fold = this.getFoldAt(docRow, docColumn, 1);
		if (fold) {
			docRow = fold.start.row;
			docColumn = fold.start.column;
		}

		var rowEnd, row = 0;

		var rowCache = this.$docRowCache;
		var i = this.$getRowCacheIndex(rowCache, docRow);
		var l = rowCache.length;
		if (l && i >= 0) {
			var row = rowCache[i];
			var screenRow = this.$screenRowCache[i];
			var doCache = docRow > rowCache[l - 1];
		} else {
			var doCache = !l;
		}

		var foldLine = this.getNextFoldLine(row);
		var foldStart = foldLine ? foldLine.start.row : Infinity;

		while (row < docRow) {
			if (row >= foldStart) {
				rowEnd = foldLine!.end.row + 1;
				if (rowEnd > docRow)
					break;
				foldLine = this.getNextFoldLine(rowEnd, foldLine!);
				foldStart = foldLine ? foldLine.start.row : Infinity;
			}
			else {
				rowEnd = row + 1;
			}

			screenRow += this.getRowLength(row);
			row = rowEnd;

			if (doCache) {
				this.$docRowCache.push(row);
				this.$screenRowCache.push(screenRow);
			}
		}

		// Calculate the text line that is displayed in docRow on the screen.
		var textLine = "";
		// Check if the final row we want to reach is inside of a fold.
		if (foldLine && row >= foldStart) {
			textLine = this.getFoldDisplayLine(foldLine, docRow, docColumn);
			foldStartRow = foldLine.start.row;
		} else {
			textLine = this.getLine(docRow).substring(0, docColumn);
			foldStartRow = docRow;
		}
		var wrapIndent = 0;
		// Clamp textLine if in wrapMode.
		if (this.$useWrapMode) {
			var wrapRow = this.$wrapData[foldStartRow];
			if (wrapRow) {
				var screenRowOffset = 0;
				while (textLine.length >= wrapRow[screenRowOffset]) {
					screenRow ++;
					screenRowOffset++;
				}
				textLine = textLine.substring(
					wrapRow[screenRowOffset - 1] || 0, textLine.length
				);
				wrapIndent = screenRowOffset > 0 ? wrapRow.indent! : 0;
			}
		}

		if (this.lineWidgets && this.lineWidgets[row] && this.lineWidgets[row]!.rowsAbove)
			screenRow += this.lineWidgets[row]!.rowsAbove!;

		return {
			row: screenRow,
			column: wrapIndent + this.$getStringScreenWidth(textLine)[0]
		};
	}

	/**
	 * For the given document row and column, returns the screen column.
	 * @param {Number|Point} row
	 * @param {Number} [docColumn]
	 * @returns {Number}
	 **/
	documentToScreenColumn(row: number, docColumn?: number) {
		return this.documentToScreenPosition(row, docColumn).column;
	}

	/**
	 * For the given document row and column, returns the screen row.
	 * @param {Number|Point} docRow
	 * @param {Number} [docColumn]
	 * @returns {number}
	 **/
	documentToScreenRow(docRow: number|Point, docColumn?: number) {
		return this.documentToScreenPosition(docRow, docColumn).row;
	}

	public lineWidgets?: (LineWidget|undefined)[];

	/**
	 * Returns the length of the screen.
	 * @returns {Number}
	 **/
	getScreenLength() {
		var screenRows = 0;
		/**@type {FoldLine}*/
		if (!this.$useWrapMode) {
			screenRows = this.getLength();

			// Remove the folded lines again.
			var foldData = this.$foldData;
			for (var i = 0; i < foldData.length; i++) {
				var fold = foldData[i];
				screenRows -= fold.end.row - fold.start.row;
			}
		} else {
			var lastRow = this.$wrapData.length;
			var row = 0, i = 0;
			var fold = this.$foldData[i++];
			var foldStart = fold ? fold.start.row :Infinity;

			while (row < lastRow) {
				var splits = this.$wrapData[row];
				screenRows += splits ? splits.length + 1 : 1;
				row ++;
				if (row > foldStart) {
					row = fold.end.row+1;
					fold = this.$foldData[i++];
					foldStart = fold ?fold.start.row :Infinity;
				}
			}
		}

		// todo
		if (this.lineWidgets) {
			util.assert(this.$getWidgetScreenLength, "Line widget support not loaded");
			screenRows += this.$getWidgetScreenLength();
		}

		return screenRows;
	}

	/**
	 * @param {FontMetrics} fm
	 */
	$setFontMetrics(fm: FontMetrics) {
		if (!this.$enableVarChar) return;
		this.$getStringScreenWidth = function(str, maxScreenColumn, screenColumn) {
			if (maxScreenColumn === 0)
				return [0, 0];
			if (!maxScreenColumn)
				maxScreenColumn = Infinity;
			screenColumn = screenColumn || 0;

			var c, column;
			for (column = 0; column < str.length; column++) {
				c = str.charAt(column);
				// tab
				if (c === "\t") {
					screenColumn += this.getScreenTabSize(screenColumn);
				} else {
					screenColumn += fm.getCharacterWidth(c);
				}
				if (screenColumn > maxScreenColumn) {
					break;
				}
			}

			return [screenColumn, column];
		};
	}

	/**
	 * @returns {string} the last character preceding the cursor in the editor
	 */
	getPrecedingCharacter() {
		var pos = this.selection.getCursor();

		if (pos.column === 0) {
			return pos.row === 0 ? "" : this.doc.getNewLineCharacter();
		}

		var currentLine = this.getLine(pos.row);
		return currentLine[pos.column - 1];
	}

	destroy() {
		if (!this.destroyed) {
			this.bgTokenizer.setDocument(null!); // destroy tokenizer
			this.bgTokenizer.cleanup();
			this.destroyed = true;
		}
		this.endOperation();
		this.$stopWorker();
		this.removeAllListeners();
		if (this.doc) {
			this.doc.off("change", this.$onChange);
		}
		if (this.selection) {
			this.selection.off("changeCursor", this.$onSelectionChange);
			this.selection.off("changeSelection", this.$onSelectionChange);
		}
		this.selection.detach();
	}
}

// "Tokens"
var CHAR = 1,
	CHAR_EXT = 2,
	PLACEHOLDER_START = 3,
	PLACEHOLDER_BODY =  4,
	PUNCTUATION = 9,
	SPACE = 10,
	TAB = 11,
	TAB_SPACE = 12;
// For every keystroke this gets called once per char in the whole doc!!
// Wouldn't hurt to make it a bit faster for c >= 0x1100
function isFullWidth(c: number) {
	if (c < 0x1100)
		return false;
	return c >= 0x1100 && c <= 0x115F ||
		c >= 0x11A3 && c <= 0x11A7 ||
		c >= 0x11FA && c <= 0x11FF ||
		c >= 0x2329 && c <= 0x232A ||
		c >= 0x2E80 && c <= 0x2E99 ||
		c >= 0x2E9B && c <= 0x2EF3 ||
		c >= 0x2F00 && c <= 0x2FD5 ||
		c >= 0x2FF0 && c <= 0x2FFB ||
		c >= 0x3000 && c <= 0x303E ||
		c >= 0x3041 && c <= 0x3096 ||
		c >= 0x3099 && c <= 0x30FF ||
		c >= 0x3105 && c <= 0x312D ||
		c >= 0x3131 && c <= 0x318E ||
		c >= 0x3190 && c <= 0x31BA ||
		c >= 0x31C0 && c <= 0x31E3 ||
		c >= 0x31F0 && c <= 0x321E ||
		c >= 0x3220 && c <= 0x3247 ||
		c >= 0x3250 && c <= 0x32FE ||
		c >= 0x3300 && c <= 0x4DBF ||
		c >= 0x4E00 && c <= 0xA48C ||
		c >= 0xA490 && c <= 0xA4C6 ||
		c >= 0xA960 && c <= 0xA97C ||
		c >= 0xAC00 && c <= 0xD7A3 ||
		c >= 0xD7B0 && c <= 0xD7C6 ||
		c >= 0xD7CB && c <= 0xD7FB ||
		c >= 0xF900 && c <= 0xFAFF ||
		c >= 0xFE10 && c <= 0xFE19 ||
		c >= 0xFE30 && c <= 0xFE52 ||
		c >= 0xFE54 && c <= 0xFE66 ||
		c >= 0xFE68 && c <= 0xFE6B ||
		c >= 0xFF01 && c <= 0xFF60 ||
		c >= 0xFFE0 && c <= 0xFFE6;
}

Folding.call(EditSession.prototype); // mix in folding functions
BracketMatch.call(EditSession.prototype); // mix in bracket matching functions

config.defineOptions(EditSession.prototype, "session", {
	wrap: {
		/**
		 * @param {string | boolean | number} value
		 * @this {EditSession}
		 */
		set: function(this: EditSession, value: string | boolean | number) {
			if (!value || value == "off")
				value = false;
			else if (value == "free")
				value = true;
			else if (value == "printMargin")
				value = -1;
			else if (typeof value == "string")
				value = parseInt(value, 10) || false;

			if (this.$wrap == value)
				return;
			this.$wrap = value;
			if (!value) {
				this.setUseWrapMode(false);
			} else {
				var col = typeof value == "number" ? value : 0;
				this.setWrapLimitRange(col, col);
				this.setUseWrapMode(true);
			}
		},
		get: function() {
			if (this.getUseWrapMode()) {
				if (this.$wrap == -1)
					return "printMargin";
				if (!this.getWrapLimitRange().min)
					return "free";
				return this.$wrap;
			}
			return "off";
		},
		handlesSet: true
	},
	wrapMethod: {
		/**
		 * @param {"code"|"text"|"auto"|boolean} val
		 * @this{EditSession}
		 */
		set: function(this: EditSession, val: "code"|"text"|"auto"|boolean) {
			val = val == "auto"
				? this.$mode.type != "text"
				: val != "text";
			if (val != this.$wrapAsCode) {
				this.$wrapAsCode = val;
				if (this.$useWrapMode) {
					this.$useWrapMode = false;
					this.setUseWrapMode(true);
				}
			}
		},
		initialValue: "auto"
	},
	indentedSoftWrap: {
		/**
		 * @this{EditSession}
		 */
		set: function(this: EditSession) {
			if (this.$useWrapMode) {
				this.$useWrapMode = false;
				this.setUseWrapMode(true);
			}
		},
		initialValue: true
	},
	firstLineNumber: {
		set: function(this: EditSession) {this._signal("changeBreakpoint", {}, this);},
		initialValue: 1
	},
	useWorker: {
		/**
		 * @param {boolean} useWorker
		 * @this{EditSession}
		 */
		set: function(this: EditSession, useWorker: boolean) {
			this.$useWorker = useWorker;

			this.$stopWorker();
			if (useWorker)
				this.$startWorker();
		},
		initialValue: true
	},
	useSoftTabs: {initialValue: true},
	tabSize: {
		/**
		 * @param tabSize
		 * @this{EditSession}
		 */
		set: function(this: EditSession, tabSize: number) {
			this.setTabSize(tabSize);
		},
		initialValue: 4,
		handlesSet: true
	},
	navigateWithinSoftTabs: {initialValue: false},
	foldStyle: {
		set: function(this: EditSession, val: string) {this.setFoldStyle(val);},
		handlesSet: true
	},
	overwrite: {
		set: function(this: EditSession, val: boolean) {this._signal("changeOverwrite", val, this);},
		initialValue: false
	},
	newLineMode: {
		set: function(this: EditSession, val: NewLineMode) {this.doc.setNewLineMode(val);},
		get: function(this: EditSession) {return this.doc.getNewLineMode();},
		handlesSet: true
	},
	mode: {
		set: function(this: EditSession, val: string) { this.setMode(val); },
		get: function(this: {$modeId: string}) { return this.$modeId; },
		handlesSet: true
	}
});