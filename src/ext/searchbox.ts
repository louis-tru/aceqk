/**
 * ## Interactive search and replace UI extension for text editing
 *
 * Provides a floating search box interface with find/replace functionality including live search results, regex
 * support, case sensitivity options, whole word matching, and scoped selection searching. Features keyboard shortcuts
 * for quick access and navigation, with visual feedback for search matches and a counter showing current position
 * in results.
 *
 * **Key Features:**
 * - Real-time search with highlighted matches
 * - Find and replace with individual or bulk operations
 * - Advanced options: regex, case sensitivity, whole words, search in selection
 * - Keyboard navigation and shortcuts
 * - Visual match counter and no-match indicators
 *
 * **Usage:**
 * ```javascript
 * // Show search box
 * require("ace/ext/searchbox").Search(editor);
 *
 * // Show with replace functionality
 * require("ace/ext/searchbox").Search(editor, true);
 * ```
 *
 * @module
 */
"use strict";

import * as dom from "../lib/dom";
import * as lang from "../lib/lang";
import * as event from "../lib/event";
import {HashHandler} from "../keyboard/hash_handler";
import * as keyUtil from "../lib/keys";
import config from "../config";
import {Editor} from "../editor";
import "./searchbox-css";
import { Range } from "../range";
import {Input,Label,Text} from "quark";
import type {Command} from "../keyboard/hash_handler";

const nls = config.nls;

const MAX_COUNT = 999;

export class SearchBox {
	public editor: Editor;
	public activeInput: Input;
	private element: Text;
	private $onEditorInput: () => void;
	private searchBox: Text;
	public replaceBox: Text;
	public searchOption: Label & {checked?: boolean};
	public replaceOption: Label & {checked?: boolean};
	public regExpOption: Label & {checked?: boolean};
	public caseSensitiveOption: Label & {checked?: boolean};
	public wholeWordOption: Label & {checked?: boolean};
	public searchInput: Input;
	public replaceInput: Input;
	private searchCounter: Text;
	public searchRange?: Range;
	private searchRangeMarker: number | null = null;
	public active: boolean = false;
	private $onChange?: ReturnType<typeof lang.delayedCall>;
	public $searchBarKb: HashHandler;
	public $closeSearchBarKb: HashHandler;
	public isReplace: boolean = false;

	/**
	 * @param {Editor} editor
	 * @param {never} [range]
	 * @param {never} [showReplaceForm]
	 */
	constructor(editor: Editor, range?: Range, showReplaceForm?: boolean) {
		this.element = dom.buildDom(["Text", {class:"ace_search right"},
			["Label", {action: "hide", class: "ace_searchbtn_close"}],
			["Text", {class: "ace_search_form"},
				["Input", {class: "ace_search_field", placeholder: nls("search-box.find.placeholder", "Search for"), spellcheck: "false"}],
				["Label", {action: "findPrev", class: "ace_searchbtn prev",value: "\u200b"}],
				["Label", {action: "findNext", class: "ace_searchbtn next",value: "\u200b"}],
				["Label", {action: "findAll", class: "ace_searchbtn", title: "Alt-Enter", value: nls("search-box.find-all.text", "All")}]
			],
			["Text", {class: "ace_replace_form"},
				["Input", {class: "ace_search_field", placeholder: nls("search-box.replace.placeholder", "Replace with"), spellcheck: "false"}],
				["Label", {action: "replaceAndFindNext", class: "ace_searchbtn",value: nls("search-box.replace-next.text", "Replace")}],
				["Label", {action: "replaceAll", class: "ace_searchbtn", value: nls("search-box.replace-all.text", "All")}]
			],
			["Text", {class: "ace_search_options"},
				["Label", {action: "toggleReplace", class: "ace_button", title: nls("search-box.toggle-replace.title", "Toggle Replace mode"), style: {marginTop:-2, padding:[0, 5]}, value: "+"}],
				["Label", {class: "ace_search_counter"}],
				["Label", {action: "toggleRegexpMode", class: "ace_button", title: nls("search-box.toggle-regexp.title", "RegExp Search"), value: ".*"}],
				["Label", {action: "toggleCaseSensitive", class: "ace_button", title: nls("search-box.toggle-case.title", "CaseSensitive Search"), value: "Aa"}],
				["Label", {action: "toggleWholeWords", class: "ace_button", title: nls("search-box.toggle-whole-word.title", "Whole Word Search"), value: "\\b"}],
				["Label", {action: "searchInSelection", class: "ace_button", title: nls("search-box.toggle-in-selection.title", "Search In Selection"), value: "S"}]
			]
		]);

		this.setSession = this.setSession.bind(this);
		this.$onEditorInput = this.onEditorInput.bind(this);

		this.$init();
		this.setEditor(editor);
		// dom.importCssString(searchboxCss, "ace_searchbox", editor.container); // moved to searchbox-css.ts
		event.addListener(this.element, "TouchStart", function(e) { e.cancelBubble(); }, editor);
	}

	/**
	 * @param {Editor} editor
	 */
	setEditor(editor: Editor) {
		editor.searchBox = this;
		editor.renderer.scroller.append(this.element);
		/**@type {Editor}*/
		this.editor = editor;
	}

	setSession(e?: any) {
		this.searchRange = void 0;
		this.$syncOptions(true);
	}

	// Auto update "updateCounter" and "ace_nomatch"
	onEditorInput() {
		this.find(false, false, true);
	}

	/**
	 * @param {Text} sb
	 */
	$initElements(sb: Text) {
		this.searchBox = sb.querySelectorForClass(".ace_search_form") as Text;
		this.replaceBox = sb.querySelectorForClass(".ace_replace_form") as Text;
		this.searchOption = sb.querySelectorForAttribute("action", "searchInSelection") as Label;
		this.replaceOption = sb.querySelectorForAttribute("action", "toggleReplace") as Label;
		this.regExpOption = sb.querySelectorForAttribute("action", "toggleRegexpMode") as Label;
		this.caseSensitiveOption = sb.querySelectorForAttribute("action", "toggleCaseSensitive") as Label;
		this.wholeWordOption = sb.querySelectorForAttribute("action", "toggleWholeWords") as Label;
		this.searchInput = this.searchBox.querySelectorForClass(".ace_search_field") as Input;
		this.replaceInput = this.replaceBox.querySelectorForClass(".ace_search_field") as Input;
		this.searchCounter = sb.querySelectorForClass(".ace_search_counter") as Text;
	}

	$init() {
		var sb = this.element;

		this.$initElements(sb);

		var _this = this;
		event.addListener(sb, "MouseDown", function(e) {
			setTimeout(function(){
				_this.activeInput.focus();
			}, 0);
			event.stopPropagation(e);
		});
		event.addListener(sb, "Click", function(e) {
			var t = e.origin;
			var action = t.getAttribute("action");
			// @ts-ignore
			if (action && _this[action])
				// @ts-ignore
				_this[action]();
			else if (_this.$searchBarKb.commands[action])
				_this.$searchBarKb.commands[action].exec!(_this.editor, {self:_this});
			event.stopPropagation(e);
		});

		event.addCommandKeyListener(sb, function(e, hashId, keyCode) {
			var keyString = keyUtil.keyCodeToString(keyCode);
			var command = _this.$searchBarKb.findKeyCommand(hashId, keyString) as Command;
			if (command && command.exec) {
				command.exec(_this.editor, {self:_this});
				event.stopEvent(e);
			}
		});

		/**
		 * @type {{schedule: (timeout?: number) => void}}
		 * @external
		*/
		this.$onChange = lang.delayedCall(function() {
			_this.find(false, false);
		});

		event.addListener(this.searchInput, "Change", function() {
			_this.$onChange!.schedule(20);
		});
		event.addListener(this.searchInput, "Focus", function() {
			_this.activeInput = _this.searchInput;
			_this.searchInput.value && _this.highlight();
		});
		event.addListener(this.replaceInput, "Focus", function() {
			_this.activeInput = _this.replaceInput;
			_this.searchInput.value && _this.highlight();
		});
	}

	setSearchRange(range?: Range) {
		this.searchRange = range;
		if (range) {
			this.searchRangeMarker = this.editor.session.addMarker(range, "ace_active-line");
		} else if (this.searchRangeMarker) {
			this.editor.session.removeMarker(this.searchRangeMarker);
			this.searchRangeMarker = null;
		}
	}

	/**
	 * @param {boolean} [preventScroll]
	 * @external
	 */
	$syncOptions(preventScroll?: boolean) {
		dom.setCssClass(this.replaceOption, "checked", !!this.searchRange);
		dom.setCssClass(this.searchOption, "checked", this.searchOption.checked);
		this.replaceOption.value = this.replaceOption.checked ? "-" : "+";
		dom.setCssClass(this.regExpOption, "checked", this.regExpOption.checked);
		dom.setCssClass(this.wholeWordOption, "checked", this.wholeWordOption.checked);
		dom.setCssClass(this.caseSensitiveOption, "checked", this.caseSensitiveOption.checked);
		var readOnly = this.editor.getReadOnly();
		this.replaceOption.style.visible = readOnly ? false : true;
		this.replaceBox.style.visible = this.replaceOption.checked && !readOnly ? true : false;
		this.find(false, false, preventScroll);
	}

	/**
	 * @param {RegExp} [re]
	 */
	highlight(re?: RegExp) {
		this.editor.session.highlight(re || this.editor.$search.$options.re);
		this.editor.renderer.updateBackMarkers();
	}

	/**
	 * @param {boolean} skipCurrent
	 * @param {boolean} backwards
	 * @param {any} [preventScroll]
	 */
	find(skipCurrent: boolean, backwards: boolean, preventScroll?: any) {
		if (!this.editor.session) return;
		var range = this.editor.find(this.searchInput.value, {
			skipCurrent: skipCurrent,
			backwards: backwards,
			wrap: true,
			regExp: this.regExpOption.checked,
			caseSensitive: this.caseSensitiveOption.checked,
			wholeWord: this.wholeWordOption.checked,
			preventScroll: preventScroll,
			range: this.searchRange
		});
		/**@type {any}*/
		var noMatch = !range && this.searchInput.value;
		dom.setCssClass(this.searchBox, "ace_nomatch", noMatch);
		this.editor._emit("findSearchBox", { match: !noMatch }, this.editor);
		this.highlight();
		this.updateCounter();
	}
	updateCounter() {
		var editor = this.editor;
		var regex = editor.$search.$options.re;
		var supportsUnicodeFlag = regex.unicode;
		var all = 0;
		var before = 0;
		if (regex) {
			var value = this.searchRange
				? editor.session.getTextRange(this.searchRange)
				: editor.getValue();

			/**
			 * Convert all line ending variations to Unix-style = \n
			 * Windows (\r\n), MacOS Classic (\r), and Unix (\n)
			 */
			if (editor.$search.$isMultilineSearch(editor.getLastSearchOptions())) {
				value = value.replace(/\r\n|\r|\n/g, "\n");
				editor.session.doc.$autoNewLine = "\n";
			}

			var offset = editor.session.doc.positionToIndex(editor.selection.anchor);
			if (this.searchRange)
				offset -= editor.session.doc.positionToIndex(this.searchRange.start);

			var last = regex.lastIndex = 0;
			var m;
			while ((m = regex.exec(value))) {
				all++;
				last = m.index;
				if (last <= offset)
					before++;
				if (all > MAX_COUNT)
					break;
				if (!m[0]) {
					regex.lastIndex = last += lang.skipEmptyMatch(value, last, supportsUnicodeFlag);
					if (last >= value.length)
						break;
				}
			}
		}
		this.searchCounter.value = nls("search-box.search-counter", "$0 of $1", [before , (all > MAX_COUNT ? MAX_COUNT + "+" : all)]);
	}
	findNext() {
		this.find(true, false);
	}
	findPrev() {
		this.find(true, true);
	}
	findAll(){
		var range = this.editor.findAll(this.searchInput.value, {
			regExp: this.regExpOption.checked,
			caseSensitive: this.caseSensitiveOption.checked,
			wholeWord: this.wholeWordOption.checked
		});
		/**@type {any}*/
		var noMatch = !range && this.searchInput.value;
		dom.setCssClass(this.searchBox, "ace_nomatch", noMatch);
		this.editor._emit("findSearchBox", { match: !noMatch }, this.editor);
		this.highlight();
		this.hide();
	}
	replace() {
		if (!this.editor.getReadOnly())
			this.editor.replace(this.replaceInput.value);
	}
	replaceAndFindNext() {
		if (!this.editor.getReadOnly()) {
			this.editor.replace(this.replaceInput.value);
			this.findNext();
		}
	}
	replaceAll() {
		if (!this.editor.getReadOnly())
			this.editor.replaceAll(this.replaceInput.value);
	}

	hide() {
		this.active = false;
		this.setSearchRange(void 0);
		this.editor.off("changeSession", this.setSession);
		this.editor.off("input", this.$onEditorInput);

		this.element.style.visible = false;
		this.editor.keyBinding.removeKeyboardHandler(this.$closeSearchBarKb);
		this.editor.focus();
	}

	/**
	 * @param {string} value
	 * @param {boolean} [isReplace]
	 */
	show(value: string, isReplace?: boolean) {
		this.active = true;
		this.editor.on("changeSession", this.setSession);
		this.editor.on("input", this.$onEditorInput);
		this.element.style.visible = true;
		this.replaceOption.checked = isReplace;

		if (this.editor.$search.$options.regExp)
			value = lang.escapeRegExp(value);

		if (value != undefined)
			this.searchInput.value = value;

		this.searchInput.focus();
		// this.searchInput.select(); // TODO: Quark Input has no select method

		this.editor.keyBinding.addKeyboardHandler(this.$closeSearchBarKb);

		this.$syncOptions(true);
	}

	isFocused() {
		var el = this. editor.window.activeView;
		return el == this.searchInput || el == this.replaceInput;
	}
}

//keybinding outside of the searchbox
const $searchBarKb = new HashHandler();
$searchBarKb.bindKeys({
	"Ctrl-f|Command-f": function(_: Editor, {self: sb}: {self: SearchBox}) {
		var isReplace = sb.isReplace = !sb.isReplace;
		sb.replaceBox.style.visible = isReplace ? true : false;
		sb.replaceOption.checked = false;
		sb.$syncOptions();
		sb.searchInput.focus();
	},
	"Ctrl-H|Command-Option-F": function(editor: Editor, {self: sb}: {self: SearchBox}) {
		if (editor.getReadOnly())
			return;
		sb.replaceOption.checked = true;
		sb.$syncOptions();
		sb.replaceInput.focus();
	},
	"Ctrl-G|Command-G": function(_: Editor, {self: sb}: {self: SearchBox}) {
		sb.findNext();
	},
	"Ctrl-Shift-G|Command-Shift-G": function(_: Editor, {self: sb}: {self: SearchBox}) {
		sb.findPrev();
	},
	"esc": function(_: Editor, {self: sb}: {self: SearchBox}) {
		setTimeout(function() { sb.hide();});
	},
	"Return": function(_: Editor, {self: sb}: {self: SearchBox}) {
		if (sb.activeInput == sb.replaceInput)
			sb.replace();
		sb.findNext();
	},
	"Shift-Return": function(_: Editor, {self: sb}: {self: SearchBox}) {
		if (sb.activeInput == sb.replaceInput)
			sb.replace();
		sb.findPrev();
	},
	"Alt-Return": function(_: Editor, {self: sb}: {self: SearchBox}) {
		if (sb.activeInput == sb.replaceInput)
			sb.replaceAll();
		sb.findAll();
	},
	"Tab": function(_: Editor, {self: sb}: {self: SearchBox}) {
		(sb.activeInput == sb.replaceInput ? sb.searchInput : sb.replaceInput).focus();
	}
});

$searchBarKb.addCommands([{
	name: "toggleRegexpMode",
	bindKey: {win: "Alt-R|Alt-/", mac: "Ctrl-Alt-R|Ctrl-Alt-/"},
	exec: function(_: Editor, {self: sb}: {self: SearchBox}) {
		sb.regExpOption.checked = !sb.regExpOption.checked;
		sb.$syncOptions();
	}
}, {
	name: "toggleCaseSensitive",
	bindKey: {win: "Alt-C|Alt-I", mac: "Ctrl-Alt-R|Ctrl-Alt-I"},
	exec: function(_: Editor, {self: sb}: {self: SearchBox}) {
		sb.caseSensitiveOption.checked = !sb.caseSensitiveOption.checked;
		sb.$syncOptions();
	}
}, {
	name: "toggleWholeWords",
	bindKey: {win: "Alt-B|Alt-W", mac: "Ctrl-Alt-B|Ctrl-Alt-W"},
	exec: function(_: Editor, {self: sb}: {self: SearchBox}) {
		sb.wholeWordOption.checked = !sb.wholeWordOption.checked;
		sb.$syncOptions();
	}
}, {
	name: "toggleReplace",
	exec: function(_: Editor, {self: sb}: {self: SearchBox}) {
		sb.replaceOption.checked = !sb.replaceOption.checked;
		sb.$syncOptions();
	}
}, {
	name: "searchInSelection",
	exec: function(_: Editor, {self: sb}: {self: SearchBox}) {
		sb.searchOption.checked = !sb.searchRange;
		sb.setSearchRange(sb.searchOption.checked ? sb.editor.getSelectionRange() : undefined);
		sb.$syncOptions();
	}
}]);

//keybinding outside of the searchbox
const $closeSearchBarKb = new HashHandler([{
	bindKey: "Esc",
	name: "closeSearchBar",
	exec: function(editor) {
		editor.searchBox!.hide();
	}
}]);

SearchBox.prototype.$searchBarKb = $searchBarKb;
SearchBox.prototype.$closeSearchBarKb = $closeSearchBarKb;

/**
 * Shows the search box for the editor with optional replace functionality.
 *
 * @param {Editor} editor - The editor instance
 * @param {boolean} [isReplace] - Whether to show replace options
 */
export function Search(editor: Editor, isReplace?: boolean) {
	var sb = editor.searchBox || new SearchBox(editor);
	var range = editor.session.selection.getRange();
	var value = range.isMultiLine() ? "" : editor.session.getTextRange(range);
	sb.show(value, isReplace);
};


/* ------------------------------------------------------------------------------------------
 * TODO
 * --------------------------------------------------------------------------------------- */
/*
- move search form to the left if it masks current word
- include all options that search has. ex: regex
- searchbox.searchbox is not that pretty. We should have just searchbox
- disable prev button if it makes sense
*/
