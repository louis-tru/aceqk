"use strict";
/**
 * @typedef {import("./editor").Editor} Editor
 * @typedef {import("../ace-internal").Ace.CompletionProviderOptions} CompletionProviderOptions
 * @typedef {import("../ace-internal").Ace.CompletionOptions} CompletionOptions
 * @typedef {import("../ace-internal").Ace.Position} Position
 */
var HashHandler = require("./keyboard/hash_handler").HashHandler;
import {AcePopup} from "./autocomplete/popup";
import {AceInline} from "./autocomplete/inline";
import {getAriaId} from "./autocomplete/popup";
import * as util from "./autocomplete/util";
import * as lang from "./lib/lang";
import {snippetManager} from "./snippets";
import config from "./config";
import {preventParentScroll} from "./lib/scroll";
import {Ace} from "../ace-internal";
import type {Anchor} from "./anchor";
import {Window,View,Text} from 'quark';
import {UIEvent} from 'quark/event';
import {MouseEvent} from './mouse/mouse_event';
import type {EditSession} from "./edit_session";
import type {Point} from "./range";
import type { Editor } from "./editor";

/**
 * @typedef BaseCompletion
 * @property {number} [score] - a numerical value that determines the order in which completions would be displayed.
 * A lower score means that the completion would be displayed further from the start
 * @property {string} [meta] - a short description of the completion
 * @property {string} [caption] - the text that would be displayed in the completion list. If omitted, value or snippet
 * would be shown instead.
 * @property {string} [docHTML] - an HTML string that would be displayed as an additional popup
 * @property {string} [docText] - a plain text that would be displayed as an additional popup. If `docHTML` exists,
 * it would be used instead of `docText`.
 * @property {string} [completerId] - the identifier of the completer
 * @property {boolean} [skipFilter] - a boolean value to decide if the popup item is going to skip the filtering process done using prefix text.
 * @property {import("../ace-internal").Ace.IRange} [range] - An object specifying the range of text to be replaced with the new completion value (experimental)
 * @property {any} [command] - A command to be executed after the completion is inserted (experimental)
 * @property {string} [snippet] - a text snippet that would be inserted when the completion is selected
 * @property {string} [value] - The text that would be inserted when selecting this completion.
 * @property {import("../ace-internal").Ace.Completer} [completer]
 * @property {boolean} [hideInlinePreview]
 * @export
 */


export type CompleterCallback = (error: any, completions: Completion[]) => void;

export interface Completer {
	/** Regular expressions defining valid identifier characters for completion triggers */
	identifierRegexps?: Array<RegExp>,

	/** Main completion method that provides suggestions for the given context */
	getCompletions(editor: Editor,
						session: EditSession,
						position: Point,
						prefix: string,
						callback: CompleterCallback): void;

	/** Returns documentation tooltip for a completion item */
	getDocTooltip?(item: Completion): void | string | Completion;

	/** Called when a completion item becomes visible */
	onSeen?: (editor: Editor, completion: Completion) => void;
	/** Called when a completion item is inserted */
	onInsert?: (editor: Editor, completion: Completion) => void;

	/** Cleanup method called when completion is cancelled */
	cancel?(): void;

	/** Unique identifier for this completer */
	id?: string;
	/** Characters that trigger autocompletion when typed */
	triggerCharacters?: string[];
	/** Whether to hide inline preview text */
	hideInlinePreview?: boolean;
	/** Custom insertion handler for completion items */
	insertMatch?: (editor: Editor, data: Completion) => void;
}

export interface BaseCompletion {
	$score?: number;
	matchMask?: number;
	exactMatch?: number;
	score?: number;
	meta?: string;
	caption?: string;
	docHTML?: string;
	docText?: string;
	completerId?: string;
	skipFilter?: boolean;
	range?: Ace.IRange;
	command?: any;
	completer?: Completer;
	hideInlinePreview?: boolean;
}

/**
 * @typedef {BaseCompletion & {snippet: string}} SnippetCompletion
 * @property {string} snippet
 * @property {string} [value]
 * @export
 */

export interface SnippetCompletion extends BaseCompletion {
	snippet: string;
	value?: string;
}

/**
 * @typedef {BaseCompletion & {value: string}} ValueCompletion
 * @property {string} value
 * @property {string} [snippet]
 * @export
 */

export interface ValueCompletion extends BaseCompletion {
	value: string;
	snippet?: string;
}

/**
 * Represents a suggested text snippet intended to complete a user's input
 * @typedef Completion
 * @type {SnippetCompletion|ValueCompletion}
 * @export
 */

export type Completion = SnippetCompletion | ValueCompletion;


export interface CompletionOptions {
	matches?: Completion[];
}

export type CompletionProviderOptions = {
	exactMatch?: boolean;
	ignoreCaption?: boolean;
}

export type GatherCompletionRecord = {
	prefix: string;
	matches: Completion[];
	finished: boolean;
}

export type CompletionCallbackFunction = (err: Error | undefined, data: GatherCompletionRecord) => void;

export type CompletionProviderCallback = (this: Autocomplete, err: Error | undefined, completions: FilteredList, finished: boolean) => void;

export type AcePopupNavigation = "up" | "down" | "start" | "end";

export type InlineAutocompleteAction = "prev" | "next" | "first" | "last";

var destroyCompleter = function(e: any, editor: Editor) {
	editor.completer && editor.completer.destroy();
};

/**
 * This object controls the autocompletion components and their lifecycle.
 * There is an autocompletion popup, an optional inline ghost text renderer and a docuent tooltip popup inside.
 */
export class Autocomplete {
	editor: Editor;
	base: Anchor;
	window: Window;
	autoInsert = false;
	autoSelect = true;
	autoShown = false;
	exactMatch = false;
	inlineEnabled = false;
	keyboardHandler = new HashHandler();
	parentNode?: View;
	setSelectOnHover = false;
	private hasSeen = new Set();

	/**
	 *  @property {Boolean} showLoadingState - A boolean indicating whether the loading states of the Autocompletion should be shown to the end-user. If enabled
	 * it shows a loading indicator on the popup while autocomplete is loading.
	 *
	 * Experimental: This visualisation is not yet considered stable and might change in the future.
	 */
	showLoadingState = false;

	/**
	 *  @property {number} stickySelectionDelay - a numerical value that determines after how many ms the popup selection will become 'sticky'.
	 *  Normally, when new elements are added to an open popup, the selection is reset to the first row of the popup. If sticky, the focus will remain
	 *  on the currently selected item when new items are added to the popup. Set to a negative value to disable this feature and never set selection to sticky.
	 */
	stickySelectionDelay = 500;

	completions: FilteredList;
	completionProvider?: CompletionProvider;
	tooltipTimer: ReturnType<typeof lang.delayedCall>;
	popupTimer: ReturnType<typeof lang.delayedCall>;
	stickySelectionTimer: ReturnType<typeof lang.delayedCall>;
	$firstOpenTimer: ReturnType<typeof lang.delayedCall>;
	stickySelection: boolean = false;
	popup: AcePopup;
	changeTimer: ReturnType<typeof lang.delayedCall>;

	activated: boolean = false;

	constructor() {
		this.keyboardHandler.bindKeys(this.commands);

		this.blurListener = this.blurListener.bind(this);
		this.changeListener = this.changeListener.bind(this);
		this.mousedownListener = this.mousedownListener.bind(this);
		this.mousewheelListener = this.mousewheelListener.bind(this);
		this.onLayoutChange = this.onLayoutChange.bind(this);

		const _this = this as any;

		this.changeTimer = lang.delayedCall(() => {
			this.updateCompletions(true);
		});

		this.tooltipTimer = lang.delayedCall(this.updateDocTooltip.bind(this), 50);
		this.popupTimer = lang.delayedCall(this.$updatePopupPosition.bind(this), 50);

		this.stickySelectionTimer = lang.delayedCall(() => {
			this.stickySelection = true;
		}, this.stickySelectionDelay);

		this.$firstOpenTimer = lang.delayedCall(/**@this{Autocomplete}*/()=>{
			var initialPosition = this.completionProvider && this.completionProvider.initialPosition;
			if (this.autoShown || (this.popup && this.popup.isOpen) || !initialPosition || this.editor.completers.length === 0) return;

			this.completions = new FilteredList(Autocomplete.completionsForLoading);
			this.openPopup(this.editor, initialPosition.prefix, false);
			this.popup.renderer.setStyle("ace_loading", true);
		}, this.stickySelectionDelay);
	}

	static get completionsForLoading() { return [{
			caption: config.nls("autocomplete.loading", "Loading..."),
			value: ""
		}];
	}

	private $init() {
		this.popup = new AcePopup(this.window, this.parentNode || this.window.root);
		this.popup.on("click", (e: any) => {
			this.insertMatch();
			e.stop();
		});
		this.popup.focus = this.editor.focus.bind(this.editor);
		this.popup.on("show", this.$onPopupShow.bind(this));
		this.popup.on("hide", this.$onHidePopup.bind(this));
		this.popup.on("select", this.$onPopupChange.bind(this));
		// event.addListener(this.popup.container, "mouseout", this.mouseOutListener.bind(this));
		this.popup.container.onMouseLeave.on(this.mouseOutListener, this);
		this.popup.on("changeHoverMarker", this.tooltipTimer);
		this.popup.renderer.on("afterRender", this.$onPopupRender.bind(this));
		return this.popup;
	}

	inlineRenderer: Ace.AceInline;

	private $initInline() {
		if (!this.inlineEnabled || this.inlineRenderer)
			return;
		this.inlineRenderer = new AceInline();
		return this.inlineRenderer;
	}

	/**
	 * @return {AcePopup}
	 */
	getPopup() {
		return this.popup || this.$init();
	}

	private $onHidePopup() {
		if (this.inlineRenderer) {
			this.inlineRenderer.hide();
		}
		this.hideDocTooltip();
		this.stickySelectionTimer.cancel();
		this.popupTimer.cancel();
		this.stickySelection = false;
	}
	private $seen(completion?: Completion) {
		if (!this.hasSeen.has(completion) && completion && completion.completer && completion.completer.onSeen && typeof completion.completer.onSeen === "function") {
			completion.completer.onSeen(this.editor, completion);
			this.hasSeen.add(completion);
		}
	}
	private $onPopupChange(hide?: boolean) {
		if (this.inlineRenderer && this.inlineEnabled) {
			var completion = hide ? void 0 : this.popup.getData(this.popup.getRow());
			this.$updateGhostText(completion);
			// If the mouse is over the tooltip, and we're changing selection on hover don't
			// move the tooltip while hovering over the popup.
			if (this.popup.isMouseOver && this.setSelectOnHover) {
				// @ts-expect-error TODO: potential wrong arguments
				this.tooltipTimer.call(null, null);
				return;
			}

			// Update the popup position after a short wait to account for potential scrolling
			this.popupTimer.schedule();
			this.tooltipTimer.schedule();
		} else {
			// @ts-expect-error TODO: potential wrong arguments
			this.popupTimer.call(null, null);
			// @ts-expect-error TODO: potential wrong arguments
			this.tooltipTimer.call(null, null);
		}
	}

	private $updateGhostText(completion?: Completion) {
		// Ghost text can include characters normally not part of the prefix (e.g. whitespace).
		// When typing ahead with ghost text however, we want to simply prefix with respect to the
		// base of the completion.
		var row = this.base.row;
		var column = this.base.column;
		var cursorColumn = this.editor.getCursorPosition().column;
		var prefix = this.editor.session.getLine(row).slice(column, cursorColumn);

		if (!this.inlineRenderer.show(this.editor, completion, prefix)) {
			this.inlineRenderer.hide();
		} else {
			this.$seen(completion);
		}
	}

	private $onPopupRender() {
		const inlineEnabled = this.inlineRenderer && this.inlineEnabled;
		if (this.completions && this.completions.filtered && this.completions.filtered.length > 0) {
			for (var i = this.popup.getFirstVisibleRow(); i <= this.popup.getLastVisibleRow(); i++) {
				var completion = this.popup.getData(i);
				if (completion && (!inlineEnabled || completion.hideInlinePreview)) {
					this.$seen(completion);
				}
			}
		}
	}

	private $onPopupShow(hide?: boolean) {
		this.$onPopupChange(hide);
		this.stickySelection = false;
		if (this.stickySelectionDelay >= 0)
			this.stickySelectionTimer.schedule(this.stickySelectionDelay);
	}

	private $elements: View[] | null = null;

	observeLayoutChanges() {
		if (this.$elements || !this.editor) return;
		this.window.onChange.on(this.onLayoutChange, this);
		this.window.root.onMouseWheel.on(this.mousewheelListener, this);

		var el = this.editor.container.parent;
		var elements: View[] = [];
		while (el) {
			elements.push(el);
			// el.addEventListener("scroll", this.onLayoutChange, {passive: true});
			el = el.parent;
		}
		this.$elements = elements;
	}
	unObserveLayoutChanges() {
		this.window.onChange.off(this.onLayoutChange, this);
		this.window.root.onMouseWheel.off(this.mousewheelListener, this);
		this.$elements && this.$elements.forEach((el) => {
			// el.removeEventListener("scroll", this.onLayoutChange, {passive: true});
		});
		this.$elements = null;
	}

	/**
	 * @internal
	 */
	onLayoutChange() {
		if (!this.popup.isOpen) return this.unObserveLayoutChanges();
		this.$updatePopupPosition();
		this.updateDocTooltip();
	}

	private $updatePopupPosition() {
		var editor = this.editor;
		var renderer = editor.renderer;

		var lineHeight = renderer.layerConfig.lineHeight;
		var pos = renderer.$cursorLayer.getPixelPosition(this.base, true);
		pos.left -= this.popup.getTextLeftOffset();

		var rect = editor.container.position;
		pos.top += rect.y - renderer.layerConfig.offset;
		pos.left += rect.x - editor.renderer.scrollLeft;
		pos.left += renderer.gutterWidth;

		var posGhostText = {
			top: pos.top,
			left: pos.left
		};

		if (renderer.$ghostText && renderer.$ghostTextWidget) {
			if (this.base.row === renderer.$ghostText.position.row) {
				posGhostText.top += renderer.$ghostTextWidget.el!.clientSize.height;
			}
		}

		// posGhostText can be below the editor rendering the popup away from the editor.
		// In this case, we want to render the popup such that the top aligns with the bottom of the editor.
		var editorContainerBottom = editor.container.position.y + editor.container.clientSize.height - lineHeight;
		var lowestPosition = editorContainerBottom < posGhostText.top ?
			{top: editorContainerBottom, left: posGhostText.left} :
			posGhostText;

		// Try to render below ghost text, then above ghost text, then over ghost text
		if (this.popup.tryShow(lowestPosition, lineHeight, "bottom")) {
			return;
		}

		if (this.popup.tryShow(pos, lineHeight, "top")) {
			return;
		}

		this.popup.show(pos, lineHeight);
	}

	/**
	 * @param {Editor} editor
	 * @param {string} prefix
	 * @param {boolean} [keepPopupPosition]
	 */
	openPopup(editor: Editor, prefix: string, keepPopupPosition?: boolean) {
		this.$firstOpenTimer.cancel();

		if (!this.popup)
			this.$init();

		if (this.inlineEnabled && !this.inlineRenderer)
			this.$initInline();

		this.popup.autoSelect = this.autoSelect;
		this.popup.setSelectOnHover(this.setSelectOnHover);

		var oldRow = this.popup.getRow();
		var previousSelectedItem = this.popup.data[oldRow];

		this.popup.setData(this.completions.filtered, this.completions.filterText);
		if (this.editor.textInput.setAriaOptions) {
			this.editor.textInput.setAriaOptions({
				activeDescendant: getAriaId(this.popup.getRow()),
				inline: this.inlineEnabled
			});
		}

		editor.keyBinding.addKeyboardHandler(this.keyboardHandler);

		var newRow;
		if (this.stickySelection)
			newRow = this.popup.data.indexOf(previousSelectedItem);
		if (!newRow || newRow === -1)
			newRow = 0;

		this.popup.setRow(this.autoSelect ? newRow : -1);

		// If we stay on the same row, but the content is different, we want to update the popup.
		if (newRow === oldRow && previousSelectedItem !== this.completions.filtered[newRow])
			this.$onPopupChange();

		// If we stay on the same line and have inlinePreview enabled, we want to make sure the
		// ghost text remains up-to-date.
		const inlineEnabled = this.inlineRenderer && this.inlineEnabled;
		if (newRow === oldRow && inlineEnabled) {
			var completion = this.popup.getData(this.popup.getRow());
			this.$updateGhostText(completion);
		}

		if (!keepPopupPosition) {
			this.popup.setTheme(editor.getTheme());
			this.popup.setFontSize(editor.getFontSize());

			this.$updatePopupPosition();
			if (this.tooltipNode) {
				this.updateDocTooltip();
			}
		}
		this.changeTimer.cancel();
		this.observeLayoutChanges();
	}

	/**
	 * Detaches all elements from the editor, and cleans up the data for the session
	 */
	detach() {
		if (this.editor) {
			this.editor.keyBinding.removeKeyboardHandler(this.keyboardHandler);
			this.editor.off("changeSelection", this.changeListener);
			this.editor.off("blur", this.blurListener);
			this.editor.off("mousedown", this.mousedownListener);
			this.editor.off("mousewheel", this.mousewheelListener);
		}
		this.$firstOpenTimer.cancel();

		this.changeTimer.cancel();
		this.hideDocTooltip();

		if (this.completionProvider) {
			this.completionProvider.detach();
		}

		if (this.popup && this.popup.isOpen)
			this.popup.hide();

		if (this.popup && this.popup.renderer) {
			this.popup.renderer.off("afterRender", this.$onPopupRender);
		}

		if (this.base)
			this.base.detach();
		this.activated = false;
		const _this = this as any;
		_this.completionProvider = _this.completions = _this.base = null; // destroy references
		this.unObserveLayoutChanges();
	}

	changeListener() {
		var cursor = this.editor.selection.lead;
		if (cursor.row != this.base.row || cursor.column < this.base.column) {
			this.detach();
		}
		if (this.activated)
			this.changeTimer.schedule();
		else
			this.detach();
	}

	blurListener(e: UIEvent) {
		// we have to check if activeElement is a child of popup because
		// on IE preventDefault doesn't stop scrollbar from being focussed
		// var el = document.activeElement;
		var el = this.window.activeView;
		var text = this.editor.textInput.getElement();
		// var fromTooltip = e.relatedTarget && this.tooltipNode && this.tooltipNode.contains(e.relatedTarget);
		var fromTooltip = this.tooltipNode && this.tooltipNode.isChild(el);
		var container = this.popup && this.popup.container;
		if (el != text && el.parent != container && !fromTooltip
			&& el != this.tooltipNode && el != text
		) {
			this.detach();
		}
	}

	mousedownListener() {
		this.detach();
	}

	mousewheelListener() {
		if (this.popup && !this.popup.isMouseOver)
			this.detach();
	}

	mouseOutListener(e: UIEvent) {
		// Check whether the popup is still open after the mouseout event,
		// if so, attempt to move it to its desired position.
		if (this.popup.isOpen)
			this.$updatePopupPosition();
	}

	goTo(where: AcePopupNavigation) {
		this.popup.goTo(where);
	}

	/**
	 * @param {Completion} data
	 * @param {undefined} [options]
	 * @return {boolean | void}
	 */
	insertMatch(data?: Completion | null, options?: any) {
		if (!data)
			data = this.popup.getData(this.popup.getRow());
		if (!data)
			return false;
		if (data.value === "") // Explicitly given nothing to insert, e.g. "No suggestion state"
			return this.detach();
		var completions = this.completions;
		// @ts-expect-error TODO: potential wrong arguments
		var result = this.getCompletionProvider().insertMatch(this.editor, data, completions.filterText, options);
		// detach only if new popup was not opened while inserting match
		if (this.completions == completions)
			this.detach();
		return result;
	}

	/**
	 * This is the entry point for the autocompletion class, triggers the actions which collect and display suggestions
	 * @param {Editor} editor
	 * @param {CompletionOptions} [options]
	 */
	showPopup(editor: Editor, options?: CompletionOptions) {
		if (this.editor)
			this.detach();

		this.activated = true;

		this.editor = editor;
		if (editor.completer != this) {
			if (editor.completer)
				editor.completer.detach();
			editor.completer = this;
		}

		editor.on("changeSelection", this.changeListener);
		editor.on("blur", this.blurListener);
		editor.on("mousedown", this.mousedownListener);
		editor.on("mousewheel", this.mousewheelListener);

		this.updateCompletions(false, options);
	}

	/**
	 *
	 * @param {{pos: Position, prefix: string}} [initialPosition]
	 * @return {CompletionProvider}
	 */
	getCompletionProvider(initialPosition?: {pos: Ace.Position, prefix: string}): CompletionProvider {
		if (!this.completionProvider)
			this.completionProvider = new CompletionProvider(initialPosition);
		return this.completionProvider;
	}

	/**
	 * This method is deprecated, it is only kept for backwards compatibility.
	 * Use the same method include CompletionProvider instead for the same functionality.
	 * @deprecated
	 */
	gatherCompletions(editor: Editor, callback: CompletionCallbackFunction) {
		return this.getCompletionProvider().gatherCompletions(editor, callback);
	}

	emptyMessage?: (prefix: string) => string;

	/**
	 * @param {boolean} keepPopupPosition
	 * @param {CompletionOptions} [options]
	 */
	updateCompletions(keepPopupPosition?: boolean, options?: CompletionOptions) {
		if (keepPopupPosition && this.base && this.completions) {
			var pos = this.editor.getCursorPosition();
			let prefix = this.editor.session.getTextRange({start: this.base, end: pos});
			if (prefix == this.completions.filterText)
				return;
			this.completions.setFilter(prefix);
			if (!this.completions.filtered.length)
				return this.detach();
			if (this.completions.filtered.length == 1
			&& this.completions.filtered[0].value == prefix
			&& !this.completions.filtered[0].snippet)
				return this.detach();
			this.openPopup(this.editor, prefix, keepPopupPosition);
			return;
		}

		if (options && options.matches) {
			var pos = this.editor.getSelectionRange().start;
			this.base = this.editor.session.doc.createAnchor(pos.row, pos.column);
			this.base.$insertRight = true;
			this.completions = new FilteredList(options.matches);
			this.getCompletionProvider().completions = this.completions;
			return this.openPopup(this.editor, "", keepPopupPosition);
		}

		var session = this.editor.getSession();
		var pos = this.editor.getCursorPosition();
		var prefix = util.getCompletionPrefix(this.editor);
		this.base = session.doc.createAnchor(pos.row, pos.column - prefix.length);
		this.base.$insertRight = true;
		var completionOptions = {
			exactMatch: this.exactMatch,
			// @ts-expect-error TODO: couldn't find initializer
			ignoreCaption: this.ignoreCaption
		};
		this.getCompletionProvider({
			prefix,
			pos
		}).provideCompletions(this.editor, completionOptions,
			/**
			 * @type {(err: any, completions: FilteredList, finished: boolean) => void | boolean}
			 * @this {Autocomplete}
			 */
			(err: any, completions: FilteredList, finished: boolean)=>{
				var filtered = completions.filtered;
				var prefix = util.getCompletionPrefix(this.editor);
				this.$firstOpenTimer.cancel();

				if (finished) {
					// No results
					if (!filtered.length) {
						var emptyMessage: any = !this.autoShown ? this.emptyMessage : undefined;
						if (typeof emptyMessage == "function")
							emptyMessage = this.emptyMessage!(prefix);
						if (emptyMessage) {
							var completionsForEmpty = [{
									caption: emptyMessage,
									value: ""
								}
							];
							this.completions = new FilteredList(completionsForEmpty);
							this.openPopup(this.editor, prefix, keepPopupPosition);
							this.popup.renderer.setStyle("ace_loading", false);
							this.popup.renderer.setStyle("ace_empty-message", true);
							return;
						}
						return this.detach();
					}

					// One result equals to the prefix
					if (filtered.length == 1 && filtered[0].value == prefix
						&& !filtered[0].snippet) return this.detach();

					// Autoinsert if one result
					if (this.autoInsert && !this.autoShown && filtered.length == 1) return this.insertMatch(
						filtered[0]);
				}
			// If showLoadingState is true and there is still a completer loading, show 'Loading...'
			// in the top row of the completer popup.
			this.completions = !finished && this.showLoadingState ?
				new FilteredList(
					Autocomplete.completionsForLoading.concat(filtered), completions.filterText
				) :
				completions;

				this.openPopup(this.editor, prefix, keepPopupPosition);

			this.popup.renderer.setStyle("ace_empty-message", false);
			this.popup.renderer.setStyle("ace_loading", !finished);
		});

		if (this.showLoadingState && !this.autoShown && !(this.popup && this.popup.isOpen)) {
			this.$firstOpenTimer.delay(this.stickySelectionDelay/2);
		}
	}

	cancelContextMenu() {
		this.editor.$mouseHandler.cancelContextMenu();
	}

	updateDocTooltip() {
		var popup = this.popup;
		var all = this.completions && this.completions.filtered;
		var selected = all && (all[popup.getHoveredRow()] || all[popup.getRow()]);
		var doc = null;
		if (!selected || !this.editor || !this.popup.isOpen)
			return this.hideDocTooltip();

		var completersLength = this.editor.completers.length;
		for (var i = 0; i < completersLength; i++) {
			var completer = this.editor.completers[i];
			if (completer.getDocTooltip && selected.completerId === completer.id) {
				doc = completer.getDocTooltip(selected);
				break;
			}
		}
		if (!doc && typeof selected != "string")
			doc = selected;

		if (typeof doc == "string")
			doc = {docText: doc};
		if (!doc || !(doc.docHTML || doc.docText))
			return this.hideDocTooltip();
		this.showDocTooltip(doc);
	}

	private tooltipNode?: Text;

	showDocTooltip(item: {docHTML?: string, docText?: string}) {
		if (!this.tooltipNode) {
			// dom.createElement("div");
			this.tooltipNode = new Text(this.window);
			this.tooltipNode.style.margin = 0;
			this.tooltipNode.style.receive = true;
			// this.tooltipNode.style.overscrollBehavior = "contain";
			this.tooltipNode.setAttribute("tabIndex", -1);
			this.tooltipNode.onBlur.on(this.blurListener, this);
			this.tooltipNode.onClick.on(this.onTooltipClick, this);
			this.tooltipNode.setAttribute("id", "doc-tooltip");
			this.tooltipNode.setAttribute("role", "tooltip");
			// prevent editor scroll if tooltip is inside an editor
			// this.tooltipNode.addEventListener("wheel", preventParentScroll);
			this.tooltipNode.onMouseWheel.on(preventParentScroll, this);
		}
		var theme = this.editor.renderer.theme;
		this.tooltipNode.class = ["ace_tooltip ace_doc-tooltip " +
			(theme.isDark? "ace_dark " : "") + (theme.cssClass || "")];

		var tooltipNode = this.tooltipNode;
		if (item.docHTML) {
			// tooltipNode.innerHTML = item.docHTML;
			tooltipNode.value = item.docHTML;
		} else if (item.docText) {
			// tooltipNode.textContent = item.docText;
			tooltipNode.value = item.docText;
		}

		if (!tooltipNode.parent)
			this.popup.container.append(this.tooltipNode);

		var popup = this.popup;
		var rect = popup.container.position;
		var size = popup.container.clientSize;

		var targetWidth = 400;
		var targetHeight = 300;
		var scrollBarSize = popup.renderer.scrollBar.width || 10;
		var window = this.window;
		var winSize = window.size;

		var leftSize = rect.x;
		var rightSize = winSize.width - rect.x + size.width - scrollBarSize;
		var topSize = popup.isTopdown ?  winSize.height - scrollBarSize - rect.y + size.height : rect.y;
		var scores = [
			Math.min(rightSize / targetWidth, 1),
			Math.min(leftSize / targetWidth, 1),
			Math.min(topSize / targetHeight, 1) * 0.9,
		];
		var max = Math.max.apply(Math, scores);
		var tooltipStyle = tooltipNode.style;
		tooltipStyle.visible = true;

		if (max == scores[0] || scores[0] >= 1) {
			tooltipStyle.marginLeft = (size.width + 1);
			tooltipStyle.marginRight = 0;
			tooltipStyle.maxWidth = targetWidth * max;
			tooltipStyle.marginTop = rect.y;
			tooltipStyle.marginBottom = 0;
			tooltipStyle.maxHeight = Math.min(winSize.height - scrollBarSize - rect.y, targetHeight);
			tooltipStyle.align = "start"; // left alignment
		} else if (max == scores[1] || scores[1] >= 1) {
			tooltipStyle.marginRight = winSize.width - rect.x;
			tooltipStyle.marginLeft = 0;
			tooltipStyle.maxWidth = targetWidth * max;
			tooltipStyle.align = "end"; // right alignment
			tooltipStyle.marginTop = rect.y;
			tooltipStyle.marginBottom = 0;
			tooltipStyle.maxHeight = Math.min(winSize.height - scrollBarSize - rect.y, targetHeight);
		} else if (max == scores[2]) {
			tooltipStyle.marginLeft = rect.x;
			tooltipStyle.marginRight = 0;
			tooltipStyle.maxWidth = Math.min(targetWidth, winSize.width - rect.x);
			if (popup.isTopdown) {
				tooltipStyle.marginTop = rect.y + size.height;
				tooltipStyle.marginBottom = 0;
				tooltipStyle.maxHeight = Math.min(winSize.height - scrollBarSize - rect.y + size.height, targetHeight);
				tooltipStyle.align = "leftTop"; // top alignment
			} else {
				tooltipStyle.marginTop = 0;
				tooltipStyle.marginBottom = (winSize.height  - rect.y);
				tooltipStyle.maxHeight = Math.min(rect.y, targetHeight);
				tooltipStyle.align = "leftBottom"; // bottom alignment
			}
		}
		// dom.$fixPositionBug(tooltipNode);
	}

	hideDocTooltip() {
		this.tooltipTimer.cancel();
		if (!this.tooltipNode)
			return;
		var el = this.tooltipNode;
		if (!this.editor.isFocused() && this.window.activeView == el)
			this.editor.focus();
		this.tooltipNode = void 0;
		el.remove();
	}

	/**
	 * @param e
	 * @internal
	 */
	onTooltipClick(e: UIEvent) {
		var a: View | null = e.origin;
		while (a && a != this.tooltipNode) {
			// if (a.nodeName == "A" && a.href) {
			// 	a.rel = "noreferrer";
			// 	a.target = "_blank";
			// 	break;
			// }
			a = a.parent;
		}
	}

	destroy() {
		this.detach();
		if (this.popup) {
			this.popup.destroy();
			var el = this.popup.container;
			if (el)
				el.remove();
		}
		const _this = this as any;
		if (this.editor && this.editor.completer == this) {
			this.editor.off("destroy", destroyCompleter);
			_this.editor.completer = null; // remove reference from editor
		}
		_this.inlineRenderer = _this.popup = _this.editor = null; // destroy references
	}

	private static $sharedInstance: Autocomplete;

	/**
	 * @param {Editor} editor
	 * @return {Autocomplete}
	 */
	static for(editor: Editor) {
		if (editor.completer instanceof Autocomplete) {
			return editor.completer;
		}
		if (editor.completer) {
			editor.completer.destroy();
			// editor.completer = null; // remove reference from editor
		}
		if (config.get("sharedPopups")) {
			if (!Autocomplete["$sharedInstance"])
				Autocomplete["$sharedInstance"] = new Autocomplete();
			editor.completer = Autocomplete["$sharedInstance"];
		} else {
			editor.completer = new Autocomplete();
			editor.once("destroy", destroyCompleter);
		}
		return editor.completer;
	}

	commands = {
		"Up": function(editor: Editor) { (editor.completer as Autocomplete).goTo("up"); },
		"Down": function(editor: Editor) { (editor.completer as Autocomplete).goTo("down"); },
		"Ctrl-Up|Ctrl-Home": function(editor: Editor) { (editor.completer as Autocomplete).goTo("start"); },
		"Ctrl-Down|Ctrl-End": function(editor: Editor) { (editor.completer as Autocomplete).goTo("end"); },

		"Esc": function(editor: Editor) { editor.completer!.detach(); },
		"Return": function(editor: Editor) { return editor.completer!.insertMatch(); },
		"Shift-Return": function(editor: Editor) { editor.completer!.insertMatch(null, {deleteSuffix: true}); },
		"Tab": function(editor: Editor) {
			var result = editor.completer!.insertMatch();
			if (!result && !editor.tabstopManager)
				(editor.completer as Autocomplete).goTo("down");
			else
				return result;
		},
		"Backspace": function(editor: Editor) {
			editor.execCommand("backspace");
			var prefix = util.getCompletionPrefix(editor);
			if (!prefix && editor.completer)
				editor.completer.detach();
		},

		"PageUp": function(editor: Editor) {
			const completer = editor.completer as Autocomplete;
			completer.popup && completer.popup.gotoPageUp();
		},
		"PageDown": function(editor: Editor) {
			const completer = editor.completer as Autocomplete;
			completer.popup && completer.popup.gotoPageDown();
		}
	};

	static startCommand = {
		name: "startAutocomplete",
		exec: function(editor: Editor, options: CompletionOptions) {
			var completer = Autocomplete.for(editor);
			completer.autoInsert = false;
			completer.autoSelect = true;
			completer.autoShown = false;
			completer.showPopup(editor, options);
			// prevent ctrl-space opening context menu on firefox on mac
			completer.cancelContextMenu();
		},
		bindKey: "Ctrl-Space|Ctrl-Shift-Space|Alt-Space"
	};

}

/**
 * This class is responsible for providing completions and inserting them to the editor
 */
export class CompletionProvider {

	initialPosition: {pos: Ace.Position, prefix: string};
	active: boolean = false
	completions: FilteredList | null = null;

	/**
	 * @param {{pos: Position, prefix: string}} [initialPosition]
	 */
	constructor(initialPosition?: {pos: Ace.Position, prefix: string}) {
		this.initialPosition = initialPosition || {pos: {row: 0, column: 0}, prefix: ""};
	}

	/**
	 * @param {Editor} editor
	 * @param {number} index
	 * @param {CompletionProviderOptions} [options]
	 * @returns {boolean}
	 */
	insertByIndex(editor: Editor, index: number, options?: CompletionProviderOptions) {
		if (!this.completions || !this.completions.filtered) {
			return false;
		}
		return this.insertMatch(editor, this.completions.filtered[index], options);
	}

	/**
	 * @param {Editor} editor
	 * @param {Completion} data
	 * @param {CompletionProviderOptions} [options]
	 * @returns {boolean}
	 */
	insertMatch(editor: Editor, data: Completion | null, options?: CompletionProviderOptions) {
		if (!data)
			return false;

		editor.startOperation({command: {name: "insertMatch"}});
		if (data.completer && data.completer.insertMatch) {
			data.completer.insertMatch(editor, data);
		} else {
			// TODO add support for options.deleteSuffix
			if (!this.completions)
				return false;

			var replaceBefore = this.completions.filterText.length;
			var replaceAfter = 0;
			if (data.range && data.range.start.row === data.range.end.row) {
				replaceBefore -= this.initialPosition.prefix.length;
				replaceBefore += this.initialPosition.pos.column - data.range.start.column;
				replaceAfter += data.range.end.column - this.initialPosition.pos.column;
			}

			if (replaceBefore || replaceAfter) {
				var ranges;
				if (editor.selection.getAllRanges) {
					ranges = editor.selection.getAllRanges();
				}
				else {
					ranges = [editor.getSelectionRange()];
				}
				for (var i = 0, range; range = ranges[i]; i++) {
					range.start.column -= replaceBefore;
					range.end.column += replaceAfter;
					editor.session.remove(range);
				}
			}

			if (data.snippet) {
				snippetManager.insertSnippet(editor, data.snippet);
			}
			else {
				this.$insertString(editor, data);
			}
			if (data.completer && data.completer.onInsert && typeof data.completer.onInsert == "function") {
				data.completer.onInsert(editor, data);
			}

			if (data.command && data.command === "startAutocomplete") {
				editor.execCommand(data.command);
			}
		}
		editor.endOperation();
		return true;
	}

	/**
	 * @param {Editor} editor
	 * @param {Completion} data
	 */
	$insertString(editor: Editor, data: Completion) {
		var text = data.value || data;
		editor.execCommand("insertstring", text);
	}

	completers: Ace.Completer[] | null = null;

	/**
	 * @param {Editor} editor
	 * @param {import("../ace-internal").Ace.CompletionCallbackFunction} callback
	 */
	gatherCompletions(editor: Editor, callback: CompletionCallbackFunction) {
		var session = editor.getSession();
		var pos = editor.getCursorPosition();

		var prefix = util.getCompletionPrefix(editor);

		var matches: Completion[] = [];
		this.completers = editor.completers;
		var total = editor.completers.length;
		editor.completers.forEach(function(completer, i) {
			completer.getCompletions(editor, session, pos, prefix, function(err, results) {
				if (completer.hideInlinePreview)
					results = results.map((result) =>  {
						return Object.assign(result, {hideInlinePreview: completer.hideInlinePreview});
					});

				if (!err && results)
					matches = matches.concat(results);
				// Fetch prefix again, because they may have changed by now
				callback(void 0, {
					prefix: util.getCompletionPrefix(editor),
					matches: matches,
					finished: (--total === 0)
				});
			});
		});
		return true;
	}

	/**
	 * This is the entry point to the class, it gathers, then provides the completions asynchronously via callback.
	 * The callback function may be called multiple times, the last invokation is marked with a `finished` flag
	 * @param {Editor} editor
	 * @param {CompletionProviderOptions} options
	 * @param {(err: Error | undefined, completions: FilteredList | [], finished: boolean) => void} callback
	 */
	provideCompletions(editor: Editor, options: CompletionProviderOptions,
			callback: (err: Error | undefined, completions: FilteredList, finished: boolean)=>void) 
	{
		var processResults = (results: GatherCompletionRecord)=>{
			var prefix = results.prefix;
			var matches = results.matches;

			this.completions = new FilteredList(matches);

			if (options.exactMatch)
				this.completions.exactMatch = true;

			if (options.ignoreCaption)
				this.completions.ignoreCaption = true;

			this.completions.setFilter(prefix);

			if (results.finished || this.completions.filtered.length)
				callback(void 0, this.completions, results.finished);
		};

		var isImmediate = true;
		var immediateResults = null;
		this.gatherCompletions(editor, (err, results)=>{
			if (!this.active) {
				return;
			}
			if (err) {
				callback(err, null as any, true);
				this.detach();
			}
			var prefix = results.prefix;

			// Wrong prefix or wrong session -> ignore
			if (prefix.indexOf(results.prefix) !== 0)
				return;

			// If multiple completers return their results immediately, we want to process them together
			if (isImmediate) {
				immediateResults = results;
				return;
			}

			processResults(results);
		});

		isImmediate = false;
		if (immediateResults) {
			var results = immediateResults;
			immediateResults = null;
			processResults(results);
		}
	}

	detach() {
		this.active = false;
		this.completers && this.completers.forEach(function(completer) {
			if (typeof completer.cancel === "function") {
				completer.cancel();
			}
		});
	}
}

export class FilteredList {
	all: any[];
	filtered: any[];
	filterText: string;
	exactMatch = false;
	ignoreCaption = false;

	/**
	 * @param {any} array
	 * @param {string} [filterText]
	 */
	constructor(array: any, filterText: string = "") {
		this.all = array;
		this.filtered = array;
		this.filterText = filterText;
	}

	setFilter(str: string) {
		if (str.length > this.filterText.length && str.lastIndexOf(this.filterText, 0) === 0)
			var matches = this.filtered;
		else
			var matches = this.all;

		this.filterText = str;
		matches = this.filterCompletions(matches, this.filterText);
		matches = matches.sort(function(a, b) {
			return b.exactMatch - a.exactMatch || b.$score - a.$score
				|| (a.caption || a.value).localeCompare(b.caption || b.value);
		});

		// make unique
		var prev: string | null = null;
		matches = matches.filter(function(item){
			var caption = item.snippet || item.caption || item.value;
			if (caption === prev) return false;
			prev = caption;
			return true;
		});

		this.filtered = matches;
	}

	filterCompletions(items: Completion[], needle: string) {
		var results = [];
		var upper = needle.toUpperCase();
		var lower = needle.toLowerCase();
		loop: for (var i = 0, item; item = items[i]; i++) {
			if (item.skipFilter) {
				item.$score = item.score;
				results.push(item);
				continue;
			}
			var caption = (!this.ignoreCaption && item.caption) || item.value || item.snippet;
			if (!caption) continue;
			var lastIndex = -1;
			var matchMask = 0;
			var penalty = 0;
			var index, distance;

			if (this.exactMatch) {
				if (needle !== caption.substr(0, needle.length))
					continue loop;
			} else {
				/**
				 * It is for situation then, for example, we find some like 'tab' in item.value="Check the table"
				 * and want to see "Check the TABle" but see "Check The tABle".
				 */
				var fullMatchIndex = caption.toLowerCase().indexOf(lower);
				if (fullMatchIndex > -1) {
					penalty = fullMatchIndex;
				} else {
					// caption char iteration is faster in Chrome but slower in Firefox, so lets use indexOf
					for (var j = 0; j < needle.length; j++) {
						// TODO add penalty on case mismatch
						var i1 = caption.indexOf(lower[j], lastIndex + 1);
						var i2 = caption.indexOf(upper[j], lastIndex + 1);
						index = (i1 >= 0) ? ((i2 < 0 || i1 < i2) ? i1 : i2) : i2;
						if (index < 0)
							continue loop;
						distance = index - lastIndex - 1;
						if (distance > 0) {
							// first char mismatch should be more sensitive
							if (lastIndex === -1)
								penalty += 10;
							penalty += distance;
							matchMask = matchMask | (1 << j);
						}
						lastIndex = index;
					}
				}
			}
			item.matchMask = matchMask;
			item.exactMatch = penalty ? 0 : 1;
			item.$score = (item.score || 0) - penalty;
			results.push(item);
		}
		return results;
	}
}
