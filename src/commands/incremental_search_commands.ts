
import * as oop from "../lib/oop";
import config from "../config";
import {Command,HashHandler} from "../keyboard/hash_handler";
import {occurStartCommand} from "./occur_commands";
import {IncrementalSearch} from "../incremental_search";
import {UIEvent} from 'quark/event';
import type { Editor } from "../editor";
import type { ExecEventHandler } from "./command_manager";
import type {Selection} from "../selection";
import type {Range} from "../range";

// These commands can be installed in a normal key handler to start iSearch:
export const iSearchStartCommands: Command[] = [{
	name: "iSearch",
	bindKey: {win: "Ctrl-F", mac: "Command-F"},
	exec: function(editor: Editor, options: any) {
		config.loadModule(["core", "ace/incremental_search"], function(e) {
			var iSearch = e.iSearch = e.iSearch || new e.IncrementalSearch();
			iSearch.activate(editor, options.backwards);
			if (options.jumpToFirstMatch) iSearch.next(options);
		});
	},
	readOnly: true
}, {
	name: "iSearchBackwards",
	exec: function(editor: Editor, jumpToNext) { editor.execCommand('iSearch', {backwards: true}); },
	readOnly: true
}, {
	name: "iSearchAndGo",
	bindKey: {win: "Ctrl-K", mac: "Command-G"},
	exec: function(editor: Editor, jumpToNext) { editor.execCommand('iSearch', {jumpToFirstMatch: true, useCurrentOrPrevSearch: true}); },
	readOnly: true
}, {
	name: "iSearchBackwardsAndGo",
	bindKey: {win: "Ctrl-Shift-K", mac: "Command-Shift-G"},
	exec: function(editor: Editor) { editor.execCommand('iSearch', {jumpToFirstMatch: true, backwards: true, useCurrentOrPrevSearch: true}); },
	readOnly: true
}];

// These commands are only available when incremental search mode is active:
export const iSearchCommands: Command[] = [{
	name: "restartSearch",
	bindKey: {win: "Ctrl-F", mac: "Command-F"},
	exec: function(iSearch: IncrementalSearch) {
		iSearch.cancelSearch(true);
	}
}, {
	name: "searchForward",
	bindKey: {win: "Ctrl-S|Ctrl-K", mac: "Ctrl-S|Command-G"},
	exec: function(iSearch: IncrementalSearch, options: any) {
		options.useCurrentOrPrevSearch = true;
		iSearch.next(options);
	}
}, {
	name: "searchBackward",
	bindKey: {win: "Ctrl-R|Ctrl-Shift-K", mac: "Ctrl-R|Command-Shift-G"},
	exec: function(iSearch: IncrementalSearch, options: any) {
		options.useCurrentOrPrevSearch = true;
		options.backwards = true;
		iSearch.next(options);
	}
}, {
	name: "extendSearchTerm",
	exec: function(iSearch: IncrementalSearch, string: string) {
		iSearch.addString(string);
	}
}, {
	name: "extendSearchTermSpace",
	bindKey: "space",
	exec: function(iSearch: IncrementalSearch) { iSearch.addString(' '); }
}, {
	name: "shrinkSearchTerm",
	bindKey: "backspace",
	exec: function(iSearch: IncrementalSearch) {
		iSearch.removeChar();
	}
}, {
	name: 'confirmSearch',
	bindKey: 'return',
	exec: function(iSearch: IncrementalSearch) { iSearch.deactivate(); }
}, {
	name: 'cancelSearch',
	bindKey: 'esc|Ctrl-G',
	exec: function(iSearch: IncrementalSearch) { iSearch.deactivate(true); }
}, {
	name: 'occurisearch',
	bindKey: 'Ctrl-O',
	exec: function(iSearch: IncrementalSearch) {
		var options = oop.mixin({}, iSearch.$options);
		iSearch.deactivate();
		occurStartCommand.exec!(iSearch.$editor, options);
	}
}, {
	name: "yankNextWord",
	bindKey: "Ctrl-w",
	exec: function(iSearch: IncrementalSearch) {
		var ed = iSearch.$editor,
			range = ed.selection.getRangeOfMovements(function(sel: Selection) { sel.moveCursorWordRight(); }),
			string = ed.session.getTextRange(range);
		iSearch.addString(string);
	}
}, {
	name: "yankNextChar",
	bindKey: "Ctrl-Alt-y",
	exec: function(iSearch: IncrementalSearch) {
		var ed = iSearch.$editor,
			range = ed.selection.getRangeOfMovements(function(sel: Selection) { sel.moveCursorRight(); }),
			string = ed.session.getTextRange(range);
		iSearch.addString(string);
	}
}, {
	name: 'recenterTopBottom',
	bindKey: 'Ctrl-l',
	exec: function(iSearch: IncrementalSearch) { iSearch.$editor.execCommand('recenterTopBottom'); }
}, {
	name: 'selectAllMatches',
	bindKey: 'Ctrl-space',
	exec: function(iSearch: IncrementalSearch) {
		const ed = iSearch.$editor,
			hl = ed.session.$isearchHighlight,
			ranges = hl && hl.cache ? (hl.cache as Range[][])
				.reduce(function(ranges, ea) {
					return ranges.concat(ea ? ea : []);
				}, []) : [];

		iSearch.deactivate(false);
		ranges.forEach(e=>ed.selection.addRange(e));
	}
}, {
	name: 'searchAsRegExp',
	bindKey: 'Alt-r',
	exec: function(iSearch: IncrementalSearch) {
		iSearch.convertNeedleToRegExp();
	}
}].map(function(cmd: any) {
	cmd.readOnly = true;
	cmd.isIncrementalSearchCommand = true;
	cmd.scrollIntoView = "animate-cursor";
	return cmd;
});

export class IncrementalSearchKeyboardHandler extends HashHandler {
	private $iSearch: IncrementalSearch;
	private $commandExecHandler?: ExecEventHandler;

	constructor(iSearch: IncrementalSearch) {
		super();
		this.$iSearch = iSearch;
	}

	/**
	 * @param editor
	 * @this {IncrementalSearchKeyboardHandler & this & {$commandExecHandler}}
	 */
	attach(editor: Editor) {
		var iSearch = this.$iSearch;
		HashHandler.call(this, iSearchCommands, editor.commands.platform);
		this.$commandExecHandler = editor.commands.on('exec', function(e) {
			if (!(e.command as any).isIncrementalSearchCommand)
				return iSearch.deactivate();
			const e_ = e as unknown as UIEvent;
			if (e_.cancelBubble) {
				e_.cancelBubble(); // e.stopPropagation();
				e_.cancelDefault(); // e.preventDefault();
			}
			var scrollTop = editor.session.getScrollTop();
			var result = e.command.exec!(iSearch.$editor, {self: iSearch, args: e.args});
			editor.renderer.scrollCursorIntoView(void 0, 0.5);
			editor.renderer.animateScrolling(scrollTop);
			return result;
		});
	};

	/**
	 * @this {IncrementalSearchKeyboardHandler & this & {$commandExecHandler}}
	 * @param editor
	 */
	detach(editor: Editor) {
		if (!this.$commandExecHandler) return;
		editor.commands.off('exec', this.$commandExecHandler);
		delete this.$commandExecHandler;
	};

	private handleKeyboard$super = this.handleKeyboard;
	/**
	 * @param data
	 * @param hashId
	 * @param key
	 * @param keyCode
	 * @this {IncrementalSearchKeyboardHandler & import("../keyboard/hash_handler").HashHandler}
	 */
	handleKeyboard(data: any, hashId: number, key: string, keyCode: number): any {
		if (((hashId === 1/*ctrl*/ || hashId === 8/*command*/) && key === 'v')
		 || (hashId === 1/*ctrl*/ && key === 'y')) return null;
		// @ts-ignore
		var cmd = this.handleKeyboard$super(data, hashId, key, keyCode);
		if (cmd && cmd.command) { return cmd; }
		if (hashId == -1) {
			var extendCmd = this.commands.extendSearchTerm;
			if (extendCmd) { return {command: extendCmd, args: key}; }
		}
		return false;
	};

}
