"use strict";

import * as dom from "./lib/dom";
import {EventEmitter}from "./lib/event_emitter";
import * as lang from "./lib/lang";
import {Range,Point, Delta, IRange} from "./range";
import {RangeList}from "./range_list";
import {Command, HashHandler}from "./keyboard/hash_handler";
import {Tokenizer}from "./tokenizer";
import * as clipboard from "./clipboard";
import {Editor} from "./editor";
import type { EditSession } from "./edit_session";

export type Snippet = {
	content?: string;
	replaceBefore?: string;
	replaceAfter?: string;
	startRe?: RegExp;
	endRe?: RegExp;
	triggerRe?: RegExp;
	endTriggerRe?: RegExp;
	trigger?: string;
	endTrigger?: string;
	matchBefore?: string[];
	matchAfter?: string[];
	name?: string;
	tabTrigger?: string;
	guard?: string;
	endGuard?: string;
	scope?: string;
	prefix?: string;
	body?: string | string[];
};

export interface SnippetToken extends Partial<IRange> {
// export interface SnippetToken extends Range {
	fmtString?: boolean,
	fmt?: any[],
	text?: string,
	formatFunction?: string,
	ifEnd?: SnippetToken,
	expectElse?: boolean,
	elseEnd?: SnippetToken,
	tabstopId?: number,
	changeCase?: string,
	local?: boolean,
	flag?: string,
	guard?: string,
	choices?: (string | {value: string})[],
	original?: SnippetToken,
	tabstop?: Tabstop,
	markerId?: number;
}

export type Tabstop = SnippetToken[] & {
	index: number,
	value: string | SnippetToken[],
	parents: Dict<boolean>,
	choices?: (string | {value: string})[],
	rangeList?: RangeList,
	hasLinkedRanges?: boolean,
	firstNonLinked?: Range,
	snippetId?: number;
} & Partial<IRange>;

const VARIABLES = {
	CURRENT_WORD: function(editor: Editor) {
		return editor.session.getTextRange(editor.session.getWordRangeAtCursor());
	},
	SELECTION: function(editor: Editor, name: string, indentation: string) {
		var text = editor.session.getTextRange();
		if (indentation)
			return text.replace(/\n\r?([ \t]*\S)/g, "\n" + indentation + "$1");
		return text;
	},
	SELECTED_TEXT: function(editor: Editor, arg1: string, arg2: string) {
		return VARIABLES.SELECTION(editor, arg1, arg2);
	},
	CURRENT_LINE: function(editor: Editor) {
		return editor.session.getLine(editor.getCursorPosition().row);
	},
	PREV_LINE: function(editor: Editor) {
		return editor.session.getLine(editor.getCursorPosition().row - 1);
	},
	LINE_INDEX: function(editor: Editor) {
		return editor.getCursorPosition().row;
	},
	LINE_NUMBER: function(editor: Editor) {
		return editor.getCursorPosition().row + 1;
	},
	SOFT_TABS: function(editor: Editor) {
		return editor.session.getUseSoftTabs() ? "YES" : "NO";
	},
	TAB_SIZE: function(editor: Editor) {
		return editor.session.getTabSize();
	},
	CLIPBOARD: function(editor: Editor): string | undefined {
		return (clipboard as any).getText && (clipboard as any).getText();
	},
	// filenames
	FILENAME: function(editor: Editor) {
		return /[^/\\]*$/.exec(this.FILEPATH(editor))![0];
	},
	FILENAME_BASE: function(editor: Editor) {
		return /[^/\\]*$/.exec(this.FILEPATH(editor))![0].replace(/\.[^.]*$/, "");
	},
	DIRECTORY: function(editor: Editor) {
		return this.FILEPATH(editor).replace(/[^/\\]*$/, "");
	},
	FILEPATH: function(editor: Editor) { return "/not implemented.txt"; },
	WORKSPACE_NAME: function() { return "Unknown"; },
	FULLNAME: function() { return "Unknown"; },
	// comments
	BLOCK_COMMENT_START: function(editor: Editor) {
		var mode = editor.session.$mode || {};
		return mode.blockComment && mode.blockComment.start || "";
	},
	BLOCK_COMMENT_END: function(editor: Editor) {
		var mode = editor.session.$mode || {};
		return mode.blockComment && mode.blockComment.end || "";
	},
	LINE_COMMENT: function(editor: Editor) {
		var mode = editor.session.$mode || {};
		return mode.lineCommentStart || "";
	},
	// dates
	CURRENT_YEAR: date.bind(null, {year: "numeric"}),
	CURRENT_YEAR_SHORT: date.bind(null, {year: "2-digit"}),
	CURRENT_MONTH: date.bind(null, {month: "numeric"}),
	CURRENT_MONTH_NAME: date.bind(null, {month: "long"}),
	CURRENT_MONTH_NAME_SHORT: date.bind(null, {month: "short"}),
	CURRENT_DATE: date.bind(null, {day: "2-digit"}),
	CURRENT_DAY_NAME: date.bind(null, {weekday: "long"}),
	CURRENT_DAY_NAME_SHORT: date.bind(null, {weekday: "short"}),
	CURRENT_HOUR: date.bind(null, {hour: "2-digit", hour12: false}),
	CURRENT_MINUTE: date.bind(null, {minute: "2-digit"}),
	CURRENT_SECOND: date.bind(null, {second: "2-digit"}),
};

function date(dateFormat: Intl.DateTimeFormatOptions) {
	var str = new Date().toLocaleString("en-us", dateFormat);
	return str.length == 1 ? "0" + str : str;
}

export class SnippetManager extends EventEmitter<any> {
	public snippetMap: Dict<{includeScopes?: string[], } & Snippet[]>;
	public snippetNameMap: Dict<Dict<Snippet>>;
	public variables: typeof VARIABLES;
	static $tokenizer?: Tokenizer;
	public files?: Dict;

	constructor() {
		super();
		this.snippetMap = {};
		this.snippetNameMap = {};
		this.variables = VARIABLES;
	}

	/**
	 * @return {Tokenizer}
	 */
	getTokenizer() {
		return SnippetManager["$tokenizer"] || this.createTokenizer();
	}

	createTokenizer() {
		function TabstopToken(str: string) {
			str = str.substring(1);
			if (/^\d+$/.test(str))
				return [{tabstopId: parseInt(str, 10)}];
			return [{text: str}];
		}
		function escape(ch: string) {
			return "(?:[^\\\\" + ch + "]|\\\\.)";
		}
		var formatMatcher = {
			regex: "/(" + escape("/") + "+)/",
			onMatch: function(val: string, state: any, stack: any) {
				var ts = stack[0];
				ts.fmtString = true;
				ts.guard = val.slice(1, -1);
				ts.flag = "";
				return "";
			},
			next: "formatString"
		};

		SnippetManager["$tokenizer"] = new Tokenizer({
			start: [
				{regex: /\\./, onMatch: function(val: string, state: any, stack: SnippetToken[]) {
					var ch = val[1];
					if (ch == "}" && stack.length) {
						val = ch;
					} else if ("`$\\".indexOf(ch) != -1) {
						val = ch;
					}
					return [val];
				}},
				{regex: /}/, onMatch: function(val: string, state: any, stack: SnippetToken[]) {
					return [stack.length ? stack.shift() : val];
				}},
				{regex: /\$(?:\d+|\w+)/, onMatch: TabstopToken},
				{regex: /\$\{[\dA-Z_a-z]+/, onMatch: function(str: string, state: any, stack: SnippetToken[]) {
					var t = TabstopToken(str.substring(1));
					stack.unshift(t[0]);
					return t;
				}, next: "snippetVar"},
				{regex: /\n/, token: "newline", merge: false}
			],
			snippetVar: [
				{regex: "\\|" + escape("\\|") + "*\\|", onMatch: function(val: string, state: any, stack: SnippetToken[]) {
					var choices = val.slice(1, -1).replace(/\\[,|\\]|,/g, function(operator) {
						return operator.length == 2 ? operator[1] : "\x00";
					}).split("\x00").map(function(value){
						return {value: value};
					});
					stack[0].choices = choices;
					return [choices[0]];
				}, next: "start"},
				formatMatcher,
				{regex: "([^:}\\\\]|\\\\.)*:?", token: "", next: "start"}
			],
			formatString: [
				{regex: /:/, onMatch: function(val: string, state: any, stack: SnippetToken[]) {
					if (stack.length && stack[0].expectElse) {
						stack[0].expectElse = false;
						stack[0].ifEnd = {elseEnd: stack[0]};
						return [stack[0].ifEnd];
					}
					return ":";
				}},
				{regex: /\\./, onMatch: function(val: string, state: any, stack: SnippetToken[]) {
					var ch = val[1];
					if (ch == "}" && stack.length)
						val = ch;
					else if ("`$\\".indexOf(ch) != -1)
						val = ch;
					else if (ch == "n")
						val = "\n";
					else if (ch == "t")
						val = "\t";
					else if ("ulULE".indexOf(ch) != -1)
						val = {changeCase: ch, local: ch > "a"} as any;
					return [val];
				}},
				{regex: "/\\w*}", onMatch: function(val: string, state: any, stack: SnippetToken[]) {
					var next = stack.shift();
					if (next)
						next.flag = val.slice(1, -1);
					this.next = next && next.tabstopId ? "start" : "";
					return [next || val];
				}, next: "start"},
				{regex: /\$(?:\d+|\w+)/, onMatch: function(val: string, state: any, stack: SnippetToken[]) {
					return [{text: val.slice(1)}];
				}},
				{regex: /\${\w+/, onMatch: function(val: string, state: any, stack: SnippetToken[]) {
					var token = {text: val.slice(2)};
					stack.unshift(token);
					return [token];
				}, next: "formatStringVar"},
				{regex: /\n/, token: "newline", merge: false},
				{regex: /}/, onMatch: function(val: string, state: any, stack: SnippetToken[]) {
					var next = stack.shift();
					this.next = next && next.tabstopId ? "start" : "";
					return [next || val];
				}, next: "start"}
			],
			formatStringVar: [
				{regex: /:\/\w+}/, onMatch: function(val: string, state: any, stack: SnippetToken[]) {
					var ts = stack[0];
					ts.formatFunction = val.slice(2, -1);
					return [stack.shift()];
				}, next: "formatString"},
				formatMatcher,
				{regex: /:[\?\-+]?/, onMatch: function(val: string, state: any, stack: SnippetToken[]) {
					if (val[1] == "+")
						stack[0].ifEnd = stack[0];
					if (val[1] == "?")
						stack[0].expectElse = true;
				}, next: "formatString"},
				{regex: "([^:}\\\\]|\\\\.)*:?", token: "", next: "formatString"}
			]
		});
		return SnippetManager["$tokenizer"];
	}

	tokenizeTmSnippet(str: string, startState?: string) {
		return this.getTokenizer().getLineTokens(str, startState).tokens.map(function(x) {
			return x.value || x;
		});
	}

	getVariableValue(editor: Editor, name: string, indentation: string) {
		const variables = this.variables as any;
		if (/^\d+$/.test(name))
			return (variables.__ || {})[name] || "";
		if (/^[A-Z]\d+$/.test(name))
			return (variables[name[0] + "__"] || {})[name.substring(1)] || "";

		name = name.replace(/^TM_/, "");
		if (!variables.hasOwnProperty(name))
			return "";
		var value = variables[name];
		if (typeof value == "function")
			value = variables[name](editor, name, indentation);
		return value == null ? "" : value;
	}

	// returns string formatted according to http://manual.macromates.com/en/regular_expressions#replacement_string_syntax_format_strings
	tmStrFormat(str: string, ch: Partial<SnippetToken>, editor: Editor) {
		if (!ch.fmt) return str;
		const variables = this.variables as any;
		var flag = ch.flag || "";
		var re = new RegExp(ch.guard||'', flag.replace(/[^gim]/g, ""));
		var fmtTokens = typeof ch.fmt == "string" ? this.tokenizeTmSnippet(ch.fmt, "formatString") : ch.fmt;
		var _self = this;
		var formatted = str.replace(re, function() {
			var oldArgs = variables.__;
			variables.__ = [].slice.call(arguments);
			var fmtParts = _self.resolveVariables(fmtTokens, editor);
			var gChangeCase = "E";
			for (var i  = 0; i < fmtParts.length; i++) {
				var ch = fmtParts[i];
				if (typeof ch == "object") {
					fmtParts[i] = "";
					if (ch.changeCase && ch.local) {
						var next = fmtParts[i + 1];
						if (next && typeof next == "string") {
							if (ch.changeCase == "u")
								fmtParts[i] = next[0].toUpperCase();
							else
								fmtParts[i] = next[0].toLowerCase();
							fmtParts[i + 1] = next.substr(1);
						}
					} else if (ch.changeCase) {
						gChangeCase = ch.changeCase;
					}
				} else if (gChangeCase == "U") {
					fmtParts[i] = ch.toUpperCase();
				} else if (gChangeCase == "L") {
					fmtParts[i] = ch.toLowerCase();
				}
			}
			variables.__ = oldArgs;
			return fmtParts.join("");
		});
		return formatted;
	}

	tmFormatFunction(str: string, ch: any, editor: Editor) {
		if (ch.formatFunction == "upcase")
			return str.toUpperCase();
		if (ch.formatFunction == "downcase")
			return str.toLowerCase();
		return str;
	}

	resolveVariables(snippet: (string | SnippetToken | null)[], editor: Editor) {
		var result: (string | SnippetToken)[] = [];
		var indentation = "";
		var afterNewLine = true;
		for (var i = 0; i < snippet.length; i++) {
			var ch = snippet[i];
			if (typeof ch == "string") {
				result.push(ch);
				if (ch == "\n") {
					afterNewLine = true;
					indentation = "";
				}
				else if (afterNewLine) {
					indentation = /^\t*/.exec(ch)![0];
					afterNewLine = /\S/.test(ch);
				}
				continue;
			}
			if (!ch)
				continue;
			afterNewLine = false;

			if (ch.fmtString) {
				var j = snippet.indexOf(ch, i + 1);
				if (j == -1) j = snippet.length;
				ch.fmt = snippet.slice(i + 1, j);
				i = j;
			}

			if (ch.text) {
				var value = this.getVariableValue(editor, ch.text, indentation) + "";
				if (ch.fmtString)
					value = this.tmStrFormat(value, ch, editor);
				if (ch.formatFunction)
					value = this.tmFormatFunction(value, ch, editor);

				if (value && !ch.ifEnd) {
					result.push(value);
					gotoNext(ch);
				} else if (!value && ch.ifEnd) {
					gotoNext(ch.ifEnd);
				}
			} else if (ch.elseEnd) {
				gotoNext(ch.elseEnd);
			} else if (ch.tabstopId != null) {
				result.push(ch);
			} else if (ch.changeCase != null) {
				result.push(ch);
			}
		}
		function gotoNext(ch: any) {
			var i1 = snippet.indexOf(ch, i + 1);
			if (i1 != -1)
				i = i1;
		}
		return result;
	}

	getDisplayTextForSnippet(editor: Editor, snippetText: string) {
		var processedSnippet = processSnippetText.call(this, editor, snippetText);
		return processedSnippet.text;
	}

	insertSnippetForSelection(editor: Editor, snippetText?: string, options={}) {
		var processedSnippet = processSnippetText.call(this, editor, snippetText, options);

		var range = editor.getSelectionRange();
		var end = editor.session.replace(range, processedSnippet.text);

		var tabstopManager = new TabstopManager(editor);
		var selectionId = editor.inVirtualSelectionMode && editor.selection.index;
		tabstopManager.addTabstops(processedSnippet.tabstops, range.start, end, selectionId);
	}
	insertSnippet(editor: Editor, snippetText: string, options={}) {
		var self = this;
		if (editor.inVirtualSelectionMode)
			return self.insertSnippetForSelection(editor, snippetText, options);

		editor.forEachSelection(function() {
			self.insertSnippetForSelection(editor, snippetText, options);
		}, void 0, {keepOrder: true});

		if (editor.tabstopManager)
			editor.tabstopManager.tabNext();
	}

	$getScope(editor: Editor) {
		var scope = editor.session.$mode.$id || "";
		scope = scope.split("/").pop()!;
		if (scope === "html" || scope === "php") {
			// PHP is actually HTML
			if (scope === "php" && !editor.session.$mode.inlinePhp)
				scope = "html";
			var c = editor.getCursorPosition();
			var state = editor.session.getState(c.row);
			if (typeof state === "object") {
				state = state[0];
			}
			if (state.substring) {
				if (state.substring(0, 3) == "js-")
					scope = "javascript";
				else if (state.substring(0, 4) == "css-")
					scope = "css";
				else if (state.substring(0, 4) == "php-")
					scope = "php";
			}
		}
		return scope;
	}

	getActiveScopes(editor: Editor) {
		var scope = this.$getScope(editor);
		var scopes = [scope];
		var snippetMap = this.snippetMap;
		if (snippetMap[scope] && snippetMap[scope].includeScopes) {
			scopes.push(...snippetMap[scope].includeScopes!);
		}
		scopes.push("_");
		return scopes;
	}

	expandWithTab(editor: Editor, options?: {dryRun?: boolean}) {
		var self = this;
		var result = editor.forEachSelection(function() {
			return self.expandSnippetForSelection(editor, options);
		}, void 0, {keepOrder: true});
		if (result && editor.tabstopManager)
			editor.tabstopManager.tabNext();
		return result;
	}

	expandSnippetForSelection(editor: Editor, options?: {dryRun?: boolean}) {
		var cursor = editor.getCursorPosition();
		var line = editor.session.getLine(cursor.row);
		var before = line.substring(0, cursor.column);
		var after = line.substring(cursor.column);

		var snippetMap = this.snippetMap;
		var snippet: Snippet | undefined;
		this.getActiveScopes(editor).some((scope)=>{
			var snippets = snippetMap[scope];
			if (snippets)
				snippet = this.findMatchingSnippet(snippets, before, after);
			return !!snippet;
		});
		if (!snippet)
			return false;
		if (options && options.dryRun)
			return true;
		editor.session.doc.removeInLine(cursor.row,
			cursor.column - snippet.replaceBefore!.length,
			cursor.column + snippet.replaceAfter!.length
		);

		const variables = this.variables as any;

		variables.M__ = snippet.matchBefore;
		variables.T__ = snippet.matchAfter;
		this.insertSnippetForSelection(editor, snippet.content);

		variables.M__ = variables.T__ = null;
		return true;
	}

	/**
	 * @param {Snippet[]} snippetList
	 * @param {string} before
	 * @param {string} after
	 * @return {Snippet}
	 */
	findMatchingSnippet(snippetList: Snippet[], before: string, after: string) {
		for (var i = snippetList.length; i--;) {
			var s = snippetList[i];
			if (s.startRe && !s.startRe.test(before))
				continue;
			if (s.endRe && !s.endRe.test(after))
				continue;
			if (!s.startRe && !s.endRe)
				continue;

			s.matchBefore = s.startRe ? s.startRe.exec(before)! : [""];
			s.matchAfter = s.endRe ? s.endRe.exec(after)! : [""];
			s.replaceBefore = s.triggerRe ? s.triggerRe.exec(before)![0] : "";
			s.replaceAfter = s.endTriggerRe ? s.endTriggerRe.exec(after)![0] : "";
			return s;
		}
	}

	/**
	 * @param {any[]} snippets
	 * @param {string} scope
	 */
	register(snippets: Snippet[], scope: string) {
		var snippetMap = this.snippetMap;
		var snippetNameMap = this.snippetNameMap;
		var self = this;

		if (!snippets)
			snippets = [];

		function wrapRegexp(src?: string) {
			if (src && !/^\^?\(.*\)\$?$|^\\b$/.test(src))
				src = "(?:" + src + ")";

			return src || "";
		}
		function guardedRegexp(re?: string, guard?: string, opening?: boolean) {
			re = wrapRegexp(re);
			guard = wrapRegexp(guard);
			if (opening) {
				re = guard + re;
				if (re && re[re.length - 1] != "$")
					re = re + "$";
			} else {
				re = re + guard;
				if (re && re[0] != "^")
					re = "^" + re;
			}
			return new RegExp(re);
		}

		function addSnippet(s: Snippet) {
			if (!s.scope)
				s.scope = scope || "_";
			scope = s.scope;
			if (!snippetMap[scope]) {
				snippetMap[scope] = [];
				snippetNameMap[scope] = {};
			}

			var map = snippetNameMap[scope];
			if (s.name) {
				var old = map[s.name];
				if (old)
					self.unregister(old, '');
				map[s.name] = s;
			}
			snippetMap[scope].push(s);

			if (s.prefix)
				s.tabTrigger = s.prefix;

			if (!s.content && s.body)
				s.content = Array.isArray(s.body) ? s.body.join("\n") : s.body;

			if (s.tabTrigger && !s.trigger) {
				if (!s.guard && /^\w/.test(s.tabTrigger))
					s.guard = "\\b";
				s.trigger = lang.escapeRegExp(s.tabTrigger);
			}

			if (!s.trigger && !s.guard && !s.endTrigger && !s.endGuard)
				return;

			s.startRe = guardedRegexp(s.trigger, s.guard, true);
			s.triggerRe = new RegExp(s.trigger!);

			s.endRe = guardedRegexp(s.endTrigger, s.endGuard, true);
			s.endTriggerRe = new RegExp(s.endTrigger!);
		}

		if (Array.isArray(snippets)) {
			snippets.forEach(addSnippet);
		} else {
			Object.keys(snippets).forEach(function(key) {
				addSnippet(snippets[key]);
			});
		}

		this._signal("registerSnippets", {scope: scope});
	}
	unregister(snippets: Snippet | Snippet[], scope: string) {
		var snippetMap = this.snippetMap;
		var snippetNameMap = this.snippetNameMap;

		function removeSnippet(s: Snippet) {
			var nameMap = snippetNameMap[s.scope||scope];
			if (nameMap && nameMap[s.name!]) {
				delete nameMap[s.name!];
				var map = snippetMap[s.scope||scope];
				var i = map && map.indexOf(s);
				if (i >= 0)
					map.splice(i, 1);
			}
		}
		if ((snippets as Snippet).content)
			removeSnippet(snippets as Snippet);
		else if (Array.isArray(snippets))
			snippets.forEach(removeSnippet);
	}
	parseSnippetFile(str: string) {
		str = str.replace(/\r/g, "");
		var list = [], snippet: Snippet = {};
		var re = /^#.*|^({[\s\S]*})\s*$|^(\S+) (.*)$|^((?:\n*\t.*)+)/gm;
		var m;
		while (m = re.exec(str)) {
			if (m[1]) {
				try {
					snippet = JSON.parse(m[1]);
					list.push(snippet);
				} catch (e) {}
			} if (m[4]) {
				snippet.content = m[4].replace(/^\t/gm, "");
				list.push(snippet);
				snippet = {};
			} else {
				var key = m[2], val = m[3];
				if (key == "regex") {
					var guardRe = /\/((?:[^\/\\]|\\.)*)|$/g;
					snippet.guard = guardRe.exec(val)![1];
					snippet.trigger = guardRe.exec(val)![1];
					snippet.endTrigger = guardRe.exec(val)![1];
					snippet.endGuard = guardRe.exec(val)![1];
				} else if (key == "snippet") {
					snippet.tabTrigger = val.match(/^\S*/)![0];
					if (!snippet.name)
						snippet.name = val;
				} else if (key) {
					(snippet as any)[key] = val;
				}
			}
		}
		return list;
	}
	getSnippetByName(name: string, editor: Editor) {
		var snippetMap = this.snippetNameMap;
		var snippet: Snippet | undefined;
		this.getActiveScopes(editor).some(function(scope) {
			var snippets = snippetMap[scope];
			if (snippets)
				snippet = snippets[name];
			return !!snippet;
		}, this);
		return snippet;
	}
}

function processSnippetText(this: SnippetManager, editor: Editor, snippetText: string = "", options: {excludeExtraIndent?: boolean} = {}) {
	var cursor = editor.getCursorPosition();
	var line = editor.session.getLine(cursor.row);
	var tabString = editor.session.getTabString();
	var indentString = line.match(/^\s*/)![0];

	if (cursor.column < indentString.length)
		indentString = indentString.slice(0, cursor.column);

	snippetText = snippetText.replace(/\r/g, "");
	var tokens_ = this.tokenizeTmSnippet(snippetText);
	var tokens = this.resolveVariables(tokens_ as SnippetToken[], editor);
	// indent
	tokens = tokens.map(function(x) {
		if (x == "\n" && !options.excludeExtraIndent)
			return x + indentString;
		if (typeof x == "string")
			return x.replace(/\t/g, tabString);
		return x;
	});
	// tabstop values
	var tabstops: Tabstop[] = [];
	tokens.forEach(function(p, i) {
		if (typeof p != "object")
			return;
		var id = p.tabstopId!;
		var ts = tabstops[id];
		if (!ts) {
			ts = tabstops[id] = [] as any as Tabstop;
			ts.index = id;
			ts.value = "";
			ts.parents = {};
		}
		if (ts.indexOf(p) !== -1)
			return;
		if (p.choices && !ts.choices)
			ts.choices = p.choices;
		ts.push(p);
		var i1 = tokens.indexOf(p, i + 1);
		if (i1 === -1)
			return;

		var value = tokens.slice(i + 1, i1);
		var isNested = value.some(function(t) {return typeof t === "object";});
		if (isNested && !ts.value) {
			ts.value = value as SnippetToken[];
		} else if (value.length && (!ts.value || typeof ts.value !== "string")) {
			ts.value = value.join("");
		}
	});

	// expand tabstop values
	tabstops.forEach(function(ts) {ts.length = 0;});

	var expanding: Dict<SnippetToken> = {};
	function copyValue(val: SnippetToken[]) {
		var copy = [];
		for (var i = 0; i < val.length; i++) {
			var p = val[i];
			if (typeof p == "object") {
				if (expanding[p.tabstopId!])
					continue;
				var j = val.lastIndexOf(p, i - 1);
				p = copy[j] || {tabstopId: p.tabstopId};
			}
			copy[i] = p;
		}
		return copy;
	}
	for (var i = 0; i < tokens.length; i++) {
		var p = tokens[i];
		if (typeof p != "object")
			continue;
		var id = p.tabstopId!;
		var ts = tabstops[id];
		var i1 = tokens.indexOf(p, i + 1);
		if (expanding[id]) {
			// if reached closing bracket clear expanding state
			if (expanding[id] === p) {
				delete expanding[id];
				Object.keys(expanding).forEach(function(parentId) {
					ts.parents[parentId] = true;
				});
			}
			// otherwise just ignore recursive tabstop
			continue;
		}
		expanding[id] = p;
		var value = ts.value;
		if (typeof value !== "string")
			value = copyValue(value);
		else if (p.fmt)
			value = this.tmStrFormat(value, p, editor);
		tokens.splice(i + 1, Math.max(0, i1 - i), ...([] as (string | SnippetToken)[]).concat(value, p));

		if (ts.indexOf(p) === -1)
			ts.push(p);
	}

	// convert to plain text
	var row = 0, column = 0;
	var text = "";
	tokens.forEach(function(t) {
		if (typeof t === "string") {
			var lines = t.split("\n");
			if (lines.length > 1){
				column = lines[lines.length - 1].length;
				row += lines.length - 1;
			} else
				column += t.length;
			text += t;
		} else if (t) {
			if (!t.start)
				t.start = {row: row, column: column};
			else
				t.end = {row: row, column: column};
		}
	});

	return {
		text,
		tabstops,
		tokens
	};
};

export interface TabstopManager {
	keyboardHandler: HashHandler;
}

export class TabstopManager {
	private index: number;
	private ranges: Range[];
	private tabstops: Tabstop[];
	private selectedTabstop?: Tabstop;
	private editor: Editor;
	private session?: EditSession;
	private $onChange: (delta: any) => void;
	private $onChangeSelection: () => void;
	private $onChangeSession: () => void;
	private $onAfterExec: (e: any) => void;
	private $inChange?: boolean;
	private $openTabstops?: Tabstop[];

	constructor(editor: Editor) {
		this.index = 0;
		this.ranges = [];
		this.tabstops = [];
		if (editor.tabstopManager)
			return editor.tabstopManager;
		editor.tabstopManager = this;
		this.$onChange = this.onChange.bind(this);
		this.$onChangeSelection = lang.delayedCall(this.onChangeSelection.bind(this)).schedule;
		this.$onChangeSession = this.onChangeSession.bind(this);
		this.$onAfterExec = this.onAfterExec.bind(this);
		this.attach(editor);
	}

	attach(editor: Editor) {
		this.$openTabstops = void 0;
		this.selectedTabstop = void 0;
		this.editor = editor;
		this.session = editor.session;
		this.editor.on("change", this.$onChange);
		this.editor.on("changeSelection", this.$onChangeSelection);
		this.editor.on("changeSession", this.$onChangeSession);
		this.editor.commands.on("afterExec", this.$onAfterExec);
		this.editor.keyBinding.addKeyboardHandler(this.keyboardHandler);
	}
	detach() {
		this.tabstops.forEach(this.removeTabstopMarkers, this);
		this.ranges.length = 0;
		this.tabstops.length = 0;
		this.selectedTabstop = void 0;
		this.editor.off("change", this.$onChange);
		this.editor.off("changeSelection", this.$onChangeSelection);
		this.editor.off("changeSession", this.$onChangeSession);
		this.editor.commands.off("afterExec", this.$onAfterExec);
		this.editor.keyBinding.removeKeyboardHandler(this.keyboardHandler);
		this.editor.tabstopManager = void 0;
		this.session = void 0;
		(this as any).editor = void 0; // to avoid circular references
	}
	/**
	 * @internal
	 */
	onChange(delta: Delta) {
		var isRemove = delta.action[0] == "r";
		var selectedTabstop = this.selectedTabstop || {} as Tabstop;
		var parents = selectedTabstop.parents || {};
		var tabstops = this.tabstops.slice();
		for (var i = 0; i < tabstops.length; i++) {
			var ts = tabstops[i];
			var active = ts == selectedTabstop || parents[ts.index];
			ts.rangeList!.$bias = active ? 0 : 1;

			if (delta.action == "remove" && ts !== selectedTabstop) {
				var parentActive = ts.parents && ts.parents[selectedTabstop.index];
				var startIndex = ts.rangeList!.pointIndex(delta.start, parentActive);
				startIndex = startIndex < 0 ? -startIndex - 1 : startIndex + 1;
				var endIndex = ts.rangeList!.pointIndex(delta.end, parentActive);
				endIndex = endIndex < 0 ? -endIndex - 1 : endIndex - 1;
				var toRemove = ts.rangeList!.ranges.slice(startIndex, endIndex);
				for (var j = 0; j < toRemove.length; j++)
					this.removeRange(toRemove[j]);
			}
			ts.rangeList!.$onChange(delta);
		}
		var session = this.session!;
		if (!this.$inChange && isRemove && session.getLength() == 1 && !session.getValue())
			this.detach();
	}
	updateLinkedFields() {
		var ts = this.selectedTabstop;
		if (!ts || !ts.hasLinkedRanges || !ts.firstNonLinked)
			return;
		this.$inChange = true;
		var session = this.session!;
		var text = session.getTextRange(ts.firstNonLinked);
		for (var i = 0; i < ts.length; i++) {
			var range = ts[i];
			if (!range.linked)
				continue;
			var original = range.original!;
			var fmt = snippetManager.tmStrFormat(text, original, this.editor);
			session.replace(range as IRange, fmt);
		}
		this.$inChange = false;
	}
	/**
	 * @internal
	 */
	onAfterExec(e: {command: Command}) {
		if (e.command && !e.command.readOnly)
			this.updateLinkedFields();
	}
	/**
	 * @internal
	 */
	onChangeSelection() {
		if (!this.editor)
			return;
		var lead = this.editor.selection.lead;
		var anchor = this.editor.selection.anchor;
		var isEmpty = this.editor.selection.isEmpty();
		for (var i = 0; i < this.ranges.length; i++) {
			if (this.ranges[i].linked)
				continue;
			var containsLead = this.ranges[i].contains(lead.row, lead.column);
			var containsAnchor = isEmpty || this.ranges[i].contains(anchor.row, anchor.column);
			if (containsLead && containsAnchor)
				return;
		}
		this.detach();
	}
	/**
	 * @internal
	 */
	onChangeSession() {
		this.detach();
	}
	tabNext(dir?: number) {
		var max = this.tabstops.length;
		var index = this.index + (dir || 1);
		index = Math.min(Math.max(index, 1), max);
		if (index == max)
			index = 0;
		this.selectTabstop(index);
		this.updateTabstopMarkers();
		if (index === 0) {
			this.detach();
		}
	}
	selectTabstop(index: number) {
		this.$openTabstops = void 0;
		var ts = this.tabstops[this.index];
		if (ts)
			this.addTabstopMarkers(ts);
		this.index = index;
		ts = this.tabstops[this.index];
		if (!ts || !ts.length)
			return;

		this.selectedTabstop = ts;
		var range = ts.firstNonLinked || ts as IRange;
		if (ts.choices)
			range.cursor = range.start;
		if (!this.editor.inVirtualSelectionMode) {
			var sel = this.editor.multiSelect!;
			sel.toSingleRange(range);
			for (var i = 0; i < ts.length; i++) {
				if (ts.hasLinkedRanges && ts[i].linked)
					continue;
				sel.addRange(Range.new(ts[i] as IRange).clone(), true);
			}
		} else {
			this.editor.selection.fromOrientedRange(range);
		}

		this.editor.keyBinding.addKeyboardHandler(this.keyboardHandler);
		if (this.selectedTabstop && this.selectedTabstop.choices)
			this.editor.execCommand("startAutocomplete", {matches: this.selectedTabstop.choices});
	}

	private useLink?: boolean;
	private snippetId?: number;

	addTabstops(tabstops: Tabstop[], start: Point, end: Point, selectionId?: any) {
		var useLink = this.useLink || !this.editor.getOption("enableMultiselect");

		if (!this.$openTabstops)
			this.$openTabstops = [];
		// add final tabstop if missing
		if (!tabstops[0]) {
			var p = Range.fromPoints(end, end);
			moveRelative(p.start, start);
			moveRelative(p.end, start);
			tabstops[0] = [p] as any as Tabstop;
			tabstops[0].index = 0;
			tabstops[0].parents = {};
			tabstops[0].value = "";
		}

		var i = this.index;
		var spliceArg = [i + 1, 0];
		var tabstopPush = [] as Tabstop[];
		var ranges = this.ranges;
		var snippetId = this.snippetId = (this.snippetId || 0) + 1;
		tabstops.forEach((ts, index)=>{
			var dest = this.$openTabstops![index] || ts;
			dest.snippetId = snippetId;
			for (var i = 0; i < ts.length; i++) {
				var p = ts[i];
				var range : Range & SnippetToken = Range.fromPoints(p.start!, p.end || p.start!);
				movePoint(range.start, start);
				movePoint(range.end, start);
				range.original = p;
				range.tabstop = dest;
				ranges.push(range as Range);
				if (dest != ts)
					dest.unshift(range);
				else
					dest[i] = range;
				if (p.fmtString || (dest.firstNonLinked && useLink)) {
					range.linked = true;
					dest.hasLinkedRanges = true;
				} else if (!dest.firstNonLinked)
					dest.firstNonLinked = range as Range;
			}
			if (!dest.firstNonLinked)
				dest.hasLinkedRanges = false;
			if (dest === ts) {
				tabstopPush.push(dest);
				this.$openTabstops![index] = dest;
			}
			this.addTabstopMarkers(dest);
			dest.rangeList = dest.rangeList || new RangeList();
			dest.rangeList.$bias = 0;
			dest.rangeList.addList(dest as any as Range[]);
		});

		if (tabstopPush.length) {
			// when adding new snippet inside existing one, make sure 0 tabstop is at the end
			if (this.tabstops.length)
				tabstopPush.push(tabstopPush.splice(0, 1)[0]); // move $0 to the end
			this.tabstops.splice(spliceArg[0], spliceArg[1], ...tabstopPush);
		}
	}

	addTabstopMarkers(ts: Tabstop) {
		var session = this.session!;
		ts.forEach(function(range) {
			if  (!range.markerId)
				range.markerId = session.addMarker(range as Range, "ace_snippet-marker", "text");
		});
	}
	removeTabstopMarkers(ts: {markerId?: number}[]) {
		var session = this.session!;
		ts.forEach(function(range) {
			session.removeMarker(range.markerId);
			range.markerId = void 0;
		});
	}
	updateTabstopMarkers() {
		if (!this.selectedTabstop) return;
		var currentSnippetId =  this.selectedTabstop.snippetId || 0;
		// back to the parent snippet tabstops if $0
		if ( this.selectedTabstop.index === 0) {
			currentSnippetId--;
		}
		this.tabstops.forEach((ts)=>{
			// show marker only for the tabstops of the currently active snippet
			if (ts.snippetId === currentSnippetId) this.addTabstopMarkers(ts);
			else this.removeTabstopMarkers(ts);
		});
	}
	removeRange(range: SnippetToken) {
		if (!range.tabstop) return;
		var i = range.tabstop.indexOf(range);
		if (i != -1) range.tabstop.splice(i, 1);
		i = this.ranges.indexOf(range as Range);
		if (i != -1) this.ranges.splice(i, 1);
		i = range.tabstop.rangeList!.ranges.indexOf(range as Range);
		if (i != -1) range.tabstop.rangeList!.ranges.splice(i, 1);
		this.session!.removeMarker(range.markerId);
		if (!range.tabstop.length) {
			i = this.tabstops.indexOf(range.tabstop);
			if (i != -1)
				this.tabstops.splice(i, 1);
			if (!this.tabstops.length)
				this.detach();
		}
	}
}

TabstopManager.prototype.keyboardHandler = new HashHandler();
TabstopManager.prototype.keyboardHandler.bindKeys({
	"Tab": function(editor: Editor) {
		if (exports.snippetManager && exports.snippetManager.expandWithTab(editor))
			return;
		editor.tabstopManager!.tabNext(1);
		editor.renderer.scrollCursorIntoView();
	},
	"Shift-Tab": function(editor: Editor) {
		editor.tabstopManager!.tabNext(-1);
		editor.renderer.scrollCursorIntoView();
	},
	"Esc": function(editor: Editor) {
		editor.tabstopManager!.detach();
	}
});


var movePoint = function(point: Point, diff: Point) {
	if (point.row == 0)
		point.column += diff.column;
	point.row += diff.row;
};

var moveRelative = function(point: Point, start: Point) {
	if (point.row == start.row)
		point.column -= start.column;
	point.row -= start.row;
};

dom.importCss({
'.ace_snippet-marker': {
		// -moz-box-sizing: border-box;
		// box-sizing: border-box;
		backgroundColor: 'rgba(194, 193, 208, 0.09)',
		// border: '1px dotted rgba(211, 208, 235, 0.62)';
		border: '1 rgba(211, 208, 235, 0.62)',
		// position: absolute;
	}
}, "snippets.css", false);

export const snippetManager = new SnippetManager();

export interface TabstopManagerEditorExtension {
	tabstopManager?: TabstopManager;
	insertSnippet(content: any, options: {}): void;
	expandSnippet(options: {}): any;
}

(function(this: Editor) {
	this.insertSnippet = function(content, options) {
		return snippetManager.insertSnippet(this, content, options);
	};
	this.expandSnippet = function(options) {
		return snippetManager.expandWithTab(this, options);
	};
}).call(Editor.prototype);
