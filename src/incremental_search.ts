"use strict";

import {Range} from "./range";
import {Search} from "./search";
import {SearchHighlight} from "./search_highlight";
import { IncrementalSearchKeyboardHandler as ISearchKbd, iSearchStartCommands
} from "./commands/incremental_search_commands";
import {Editor} from "./editor";
import {IncrementalSearchExtension,CommandManager} from "./commands/command_manager";
import config from "./config";
import type {EditSession} from "./edit_session";
import {createCss} from 'quark/css';

// regexp handling

function isRegExp(obj: any) {
	return obj instanceof RegExp;
}

/**
 * @param {RegExp} re
 */
function regExpToObject(re: RegExp) {
	var string = String(re),
		start = string.indexOf('/'),
		flagStart = string.lastIndexOf('/');
	return {
		expression: string.slice(start+1, flagStart),
		flags: string.slice(flagStart+1)
	};
}

/**
 * @param {string} string
 * @param {string} flags
 * @return {RegExp|string}
 */
function stringToRegExp(string: string, flags: string) {
	try {
		return new RegExp(string, flags);
	} catch (e) { return string; }
}

function objectToRegExp(obj: {expression: string, flags: string}) {
	return stringToRegExp(obj.expression, obj.flags);
}

export type NeedleUpdateFunc = (this: IncrementalSearch, needle: string | RegExp) => string | RegExp | void;

export interface ISearchEditSessionExtension {
	$isearchHighlight?: SearchHighlight;
}

/**
 * Implements immediate searching while the user is typing. When incremental
 * search is activated, keystrokes into the editor will be used for composing
 * a search term. Immediately after every keystroke the search is updated:
 * - so-far-matching characters are highlighted
 * - the cursor is moved to the next match
 **/
export class IncrementalSearch extends Search {
	public $editor: Editor;
	private $keyboardHandler: ISearchKbd;
	private $startPos: any;
	private $currentPos: any;
	private $prevNeedle?: string | RegExp;
	private $originalEditorOnPaste?: (text: string) => void;
	private $mousedownHandler: any;

	/**
	 * Creates a new `IncrementalSearch` object.
	 **/
	constructor() {
		super();
		this.$options = {wrap: false, skipCurrent: false};
		this.$keyboardHandler = new ISearchKbd(this);
	}

	/**
	 * @param {boolean} backwards
	 */
	activate(editor: Editor, backwards: boolean) {
		this.$editor = editor;
		this.$startPos = this.$currentPos = editor.getCursorPosition();
		this.$options.needle = '';
		this.$options.backwards = backwards;
		editor.keyBinding.addKeyboardHandler(this.$keyboardHandler);
		// we need to completely intercept paste, just registering an event handler does not work
		this.$originalEditorOnPaste = editor.onPaste;
		editor.onPaste = this.onPaste.bind(this);
		this.$mousedownHandler = editor.on('mousedown', this.onMouseDown.bind(this));
		this.selectionFix(editor);
		this.statusMessage(true);
	}

	/**
	 * @param {boolean} [reset]
	 */
	deactivate(reset? : boolean) {
		this.cancelSearch(reset);
		var editor = this.$editor;
		editor.keyBinding.removeKeyboardHandler(this.$keyboardHandler);
		if (this.$mousedownHandler) {
			editor.off('mousedown', this.$mousedownHandler);
			delete this.$mousedownHandler;
		}
		editor.onPaste = this.$originalEditorOnPaste!;
		this.message('');
	}

	/**
	 * @param {Editor} editor
	 */
	selectionFix(editor: Editor) {
		// Fix selection bug: When clicked inside the editor
		// editor.selection.$isEmpty is false even if the mouse click did not
		// open a selection. This is interpreted by the move commands to
		// extend the selection. To only extend the selection when there is
		// one, we clear it here
		if (editor.selection.isEmpty() && !editor.session.$emacsMark) {
			editor.clearSelection();
		}
	}

	/**
	 * @param {RegExp} regexp
	 */
	highlight(regexp: RegExp | null) {
		var sess = this.$editor.session as EditSession & { $isearchHighlight: any },
			hl = sess.$isearchHighlight = sess.$isearchHighlight || sess.addDynamicMarker(
				new SearchHighlight(void 0, "ace_isearch-result", "text"));
		hl.setRegexp(regexp);
		sess._emit("changeBackMarker", void 0, sess); // force highlight layer redraw
	}

	/**
	 * @param {boolean} [reset]
	 */
	cancelSearch(reset?: boolean) {
		var e = this.$editor;
		this.$prevNeedle = this.$options.needle;
		this.$options.needle = '';
		if (reset) {
			e.moveCursorToPosition(this.$startPos);
			this.$currentPos = this.$startPos;
		} else {
			e.pushEmacsMark && e.pushEmacsMark(this.$startPos, false);
		}
		this.highlight(null);
		return Range.fromPoints(this.$currentPos, this.$currentPos);
	}

	/**
	 * @param {boolean} moveToNext
	 * @param {Function} needleUpdateFunc
	 */
	highlightAndFindWithNeedle(moveToNext: boolean, needleUpdateFunc: NeedleUpdateFunc) {
		if (!this.$editor) return null;
		var options = this.$options;

		// get search term
		if (needleUpdateFunc) {
			options.needle = needleUpdateFunc.call(this, options.needle || '') || '';
		}
		if (options.needle && (options.needle as {length: number}).length === 0) {
			this.statusMessage(true);
			return this.cancelSearch(true);
		}

		// try to find the next occurrence and enable  highlighting marker
		options.start = this.$currentPos;
		var session = this.$editor.session,
			found = this.find(session),
			shouldSelect = this.$editor.emacsMark ?
				!!this.$editor.emacsMark() : !this.$editor.selection.isEmpty();
		if (found) {
			if (options.backwards) found = Range.fromPoints(found.end, found.start);
			this.$editor.selection.setRange(Range.fromPoints(shouldSelect ? this.$startPos : found.end, found.end));
			if (moveToNext) this.$currentPos = found.end;
			// highlight after cursor move, so selection works properly
			this.highlight(options.re);
		}

		this.statusMessage(!!found);

		return found;
	}

	/**
	 * @param {string} s
	 */
	addString(s: string) {
		return this.highlightAndFindWithNeedle(false, function(needle) {
			if (!isRegExp(needle))
			  return needle + s;
			var reObj = regExpToObject(needle);
			reObj.expression += s;
			return objectToRegExp(reObj);
		});
	}

	/**
	 * @param {any} c
	 */
	removeChar(c?: any) {
		return this.highlightAndFindWithNeedle(false, function(needle) {
			if (!isRegExp(needle))
			  return needle.substring(0, needle.length-1);
			var reObj = regExpToObject(needle);
			reObj.expression = reObj.expression.substring(0, reObj.expression.length-1);
			return objectToRegExp(reObj);
		});
	}

	next(options?: {backwards?: boolean, useCurrentOrPrevSearch?: boolean}) {
		// try to find the next occurrence of whatever we have searched for
		// earlier.
		// options = {[backwards: BOOL], [useCurrentOrPrevSearch: BOOL]}
		options = options || {};
		this.$options.backwards = !!options.backwards;
		this.$currentPos = this.$editor.getCursorPosition();
		return this.highlightAndFindWithNeedle(true, function(needle) {
			return options.useCurrentOrPrevSearch && (needle as {length: number}).length === 0 ?
				this.$prevNeedle || '' : needle;
		});
	}

	/**
	 * @internal
	 */
	onMouseDown(evt: any) {
		// when mouse interaction happens then we quit incremental search
		this.deactivate();
		return true;
	}

	/**
	 * @param {string} text
	 * @internal
	 */
	onPaste(text: string) {
		this.addString(text);
	}

	convertNeedleToRegExp() {
		return this.highlightAndFindWithNeedle(false, function(needle) {
			return isRegExp(needle) ? needle : stringToRegExp(needle, 'ig');
		});
	}

	convertNeedleToString() {
		return this.highlightAndFindWithNeedle(false, function(needle) {
			return isRegExp(needle) ? regExpToObject(needle).expression : needle;
		});
	}

	statusMessage(found?: boolean) {
		var options = this.$options, msg = '';
		msg += options.backwards ? 'reverse-' : '';
		msg += 'isearch: ' + options.needle;
		msg += found ? '' : ' (not found)';
		this.message(msg);
	}

	message(msg: string) {
		if (this.$editor.showCommandLine) {
			this.$editor.showCommandLine(msg);
			this.$editor.focus();
		}
	}

}

/**
 * Config settings for enabling/disabling [[IncrementalSearch `IncrementalSearch`]].
 **/
createCss({
	'.ace_marker-layer .ace_isearch-result': {
		// position: absolute;
		zIndex: 6,
		// box-sizing: border-box;
	},
	// 'div.ace_isearch-result': {
	'.ace_isearch-result': {
		borderRadius: 4,
		backgroundColor: 'rgba(255, 200, 0, 0.5)',
		boxShadow: '0 0 4 rgb(255, 200, 0)',
	},
	// '.ace_dark div.ace_isearch-result': {
	'.ace_dark .ace_isearch-result': {
		backgroundColor: 'rgb(100, 110, 160)',
		boxShadow: '0 0 4 rgb(80, 90, 140)',
	}
}); // , "incremental-search-highlighting", false);

// support for default keyboard handler
(function(this: CommandManager) {
	this.usesIncrementalSearch = false;
	this.setupIncrementalSearch = function(editor: Editor, val: boolean) {
		if (this.usesIncrementalSearch == val)
			return;
		this.usesIncrementalSearch = val;
		var iSearchCommands = iSearchStartCommands;
		this[val ? 'addCommands' : 'removeCommands'](iSearchCommands);
	};
}).call(CommandManager.prototype);

export interface IncrementalSearchOptions {
	useIncrementalSearch: boolean;
}

// incremental search config option
config.defineOptions(Editor.prototype, "editor", {
	useIncrementalSearch: {
		set: function(this: Editor, val: boolean) {
			const self = this;
			this.keyBinding.$handlers.forEach(function(handler) {
				if ((handler as IncrementalSearchExtension).setupIncrementalSearch) {
					(handler as IncrementalSearchExtension).setupIncrementalSearch(self, val);
				}
			});
			this._emit('incrementalSearchSettingChanged', {isEnabled: val}, this);
		}
	}
});
