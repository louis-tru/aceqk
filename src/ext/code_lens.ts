/**
 * ## Code Lens extension.
 *
 * Displaying contextual information and clickable commands above code lines. Supports registering custom providers,
 * rendering lens widgets with proper positioning and styling, and handling user interactions with lens commands.
 * @module
 */

"use strict";

import * as event from "../lib/event";
import * as lang from "../lib/lang";
import * as dom from "../lib/dom";
import type { Text, View } from "quark";
import type { Point } from "../range";
import type { EditSession } from "../edit_session";
import type { VirtualRenderer } from "../virtual_renderer";
import type { UIEvent } from "quark/event";
import {Editor} from "../editor";
import config from "../config";

/**
 * Provider interface for code lens functionality
 */
export interface CodeLenseProvider {
	/**
	 * Compute code lenses for the given edit session
	 * @param session The edit session to provide code lenses for
	 * @param callback Callback function that receives errors and code lenses
	 */
	provideCodeLenses: (session: EditSession, callback: (err: any, payload: CodeLense[]) => void) => void;
}

export interface CodeLenseEditorExtension {
	codeLensProviders?: CodeLenseProvider[];
	$codeLensClickHandler?: (e: UIEvent & {origin: View & {lensCommand?: CodeLenseCommand}})=>void;
	$updateLenses?: () => void;
	$updateLensesOnInput?: (arg: void) => void;
}

/**
 * Represents a command associated with a code lens
 */
export interface CodeLenseCommand {
	/**
	 * Command identifier that will be executed
	 */
	id?: string,
	/**
	 * Display title for the code lens
	 */
	title: string,
	/**
	 * Argument(s) to pass to the command when executed
	 */
	arguments?: any,
}

/**
 * Represents a code lens - an actionable UI element displayed above a code line
 */
export interface CodeLense {
	/**
	 * Starting position where the code lens should be displayed
	 */
	start: Point,
	/**
	 * Command to execute when the code lens is activated
	 */
	command?: CodeLenseCommand
}

/**
 * Clears all code lens elements from the renderer
 * @param {VirtualRenderer} renderer The renderer to clear lens elements from
 */
function clearLensElements(renderer: VirtualRenderer) {
	var textLayer = renderer.$textLayer;
	var lensElements = textLayer.$lenses;
	if (lensElements)
		lensElements.forEach(function(el) {el.remove(); });
	textLayer.$lenses = void 0;
}

/**
 * Renders code lens widgets based on changes to the editor
 * @param {number} changes Bitmask of change types
 * @param {VirtualRenderer} renderer The renderer to update
 */
function renderWidgets(changes: number, renderer: VirtualRenderer) {
	var changed = changes & renderer.CHANGE_LINES
		|| changes & renderer.CHANGE_FULL
		|| changes & renderer.CHANGE_SCROLL
		|| changes & renderer.CHANGE_TEXT;
	if (!changed)
		return;

	var session = renderer.session;
	var lineWidgets = renderer.session.lineWidgets;
	var textLayer = renderer.$textLayer;
	var lensElements = textLayer.$lenses;
	if (!lineWidgets) {
		if (lensElements)
			clearLensElements(renderer);
		return;
	}

	var textCells = renderer.$textLayer.$lines.cells;
	var config = renderer.layerConfig;
	var padding = renderer.$padding;

	if (!lensElements)
		lensElements = textLayer.$lenses = [];

	var index = 0;
	for (var i = 0; i < textCells.length; i++) {
		var row = textCells[i].row;
		var widget = lineWidgets[row];
		var lenses = widget && widget.lenses;

		if (!lenses || !lenses.length) continue;

		var lensContainer = lensElements[index];
		if (!lensContainer) {
			lensContainer = lensElements[index]
				= dom.buildDom(["text", {class: "ace_codeLens"}], renderer.container);
		}
		lensContainer.style.height = config.lineHeight;
		index++;

		const lensChildren = dom.getChildren(lensContainer) as (Text & { lensCommand?: CodeLenseCommand })[];
		for (var j = 0; j < lenses.length; j++) {
			var el = lensChildren[2 * j];
			if (!el) {
				if (j != 0) lensContainer.append(dom.createTextNode("\xa0|\xa0", renderer.window));
				el = dom.buildDom(["label"], lensContainer);
			}
			el.value = lenses[j].title;
			el.lensCommand = lenses[j];
		}
		while (lensChildren.length > 2 * j - 1)
			lensContainer.last!.remove();

		var top = renderer.$cursorLayer.getPixelPosition({
			row: row,
			column: 0
		}, true).top - config.lineHeight * widget!.rowsAbove! - config.offset;
		lensContainer.style.marginTop = top;

		var left = renderer.gutterWidth;
		var indent = session.getLine(row).search(/\S|$/);
		if (indent == -1)
			indent = 0;
		left += indent * config.characterWidth;
		lensContainer.style.paddingLeft = padding + left;
	}
	while (index < lensElements.length)
		lensElements.pop()!.remove();
}

/**
 * Clears all code lens widgets from the session
 * @param {EditSession} session The session to clear code lens widgets from
 */
function clearCodeLensWidgets(session: EditSession) {
	if (!session.lineWidgets) return;
	var widgetManager = session.widgetManager;
	session.lineWidgets.forEach(function(widget) {
		if (widget && widget.lenses)
			widgetManager.removeLineWidget(widget);
	});
}

/**
 * Sets code lenses for the given session
 * @param {EditSession} session The session to set code lenses for
 * @param {CodeLense[]} lenses Array of code lenses to set
 * @return {number} The row of the first code lens or Number.MAX_VALUE if no lenses
 */
export function setLenses(session: EditSession, lenses?: CodeLense[]) {
	var firstRow = Number.MAX_VALUE;

	clearCodeLensWidgets(session);
	lenses && lenses.forEach(function(lens) {
		var row = lens.start.row;
		var column = lens.start.column;
		var widget = session.lineWidgets && session.lineWidgets[row];
		if (!widget || !widget.lenses) {
			widget = session.widgetManager.$registerLineWidget({
				rowCount: 1,
				rowsAbove: 1,
				row: row,
				column: column,
				lenses: []
			});
		}
		widget!.lenses!.push(lens.command!);
		if (row < firstRow)
			firstRow = row;
	});
	session._emit("changeFold", {data: {start: {row: firstRow}}}, session);
	return firstRow;
};

/**
 * Attaches code lens functionality to an editor
 * @param {Editor} editor The editor to attach to
 */
function attachToEditor(editor: Editor) {
	editor.codeLensProviders = [];
	editor.renderer.on("afterRender", renderWidgets);
	if (!editor.$codeLensClickHandler) {
		editor.$codeLensClickHandler = function(e) {
			var command = e.origin.lensCommand!;
			if (!command) return;
			editor.execCommand(command.id!, command.arguments);
			editor._emit("codeLensClick", e, editor);
		};
		event.addListener(editor.container, "Click", editor.$codeLensClickHandler, editor);
	}
	editor.$updateLenses = function() {
		var session = editor.session;
		if (!session) return;

		var providersToWaitNum = editor.codeLensProviders!.length;
		var lenses: CodeLense[] = [];
		editor.codeLensProviders!.forEach(function(provider) {
			provider.provideCodeLenses(session, function(err, payload) {
				if (err) return;
				payload.forEach(function(lens) {
					lenses.push(lens);
				});
				providersToWaitNum--;
				if (providersToWaitNum == 0) {
					applyLenses();
				}
			});
		});

		function applyLenses() {
			var cursor = session.selection.cursor;
			var oldRow = session.documentToScreenRow(cursor);
			var scrollTop = session.getScrollTop();
			var firstRow = setLenses(session, lenses);

			var lastDelta = session.$undoManager && session.$undoManager.$lastDelta;
			if (lastDelta && lastDelta.action == "remove" && lastDelta.lines.length > 1)
				return;
			var row = session.documentToScreenRow(cursor);
			var lineHeight = editor.renderer.layerConfig.lineHeight;
			var top = session.getScrollTop() + (row - oldRow) * lineHeight;
			// special case for the lens on line 0, because it can't be scrolled into view with keyboard
			if (firstRow == 0 && scrollTop < lineHeight /4 && scrollTop > -lineHeight/4) {
				top = -lineHeight;
			}
			session.setScrollTop(top);
		}
	};
	var updateLenses = lang.delayedCall(editor.$updateLenses);
	editor.$updateLensesOnInput = function() {
		updateLenses.delay(250);
	};
	editor.on("input", editor.$updateLensesOnInput);
}

/**
 * Detaches code lens functionality from an editor
 * @param {Editor} editor The editor to detach from
 */
function detachFromEditor(editor: Editor) {
	editor.off("input", editor.$updateLensesOnInput!);
	editor.renderer.off("afterRender", renderWidgets);
	if (editor.$codeLensClickHandler)
		editor.container.removeEventListener("Click", editor.$codeLensClickHandler);
}

/**
 * Registers a code lens provider with an editor
 * @param {Editor} editor The editor to register the provider with
 * @param {Ace.CodeLenseProvider} codeLensProvider The provider to register
 */
export function registerCodeLensProvider(editor: Editor, codeLensProvider: CodeLenseProvider) {
	editor.setOption("enableCodeLens", true);
	editor.codeLensProviders!.push(codeLensProvider);
	editor.$updateLensesOnInput!();
};

/**
 * Clears all code lenses from the session
 * @param {EditSession} session The session to clear code lenses from
 */
export function clear(session: EditSession) {
	setLenses(session);
};

config.defineOptions(Editor.prototype, "editor", {
	enableCodeLens: {
		set: function(val: boolean) {
			if (val) {
				attachToEditor(this);
			} else {
				detachFromEditor(this);
			}
		}
	}
});

dom.importCss({
'.ace_codeLens': {
	// position: absolute;
	textColor: '#aaa',
	// font-size: 88%;
	// background: inherit;
	width: '100%',
	// display: flex;
	itemsAlign: 'end',
	// pointer-events: none;
	receive: false,
},
// '.ace_codeLens > a': {
'.ace_codeLens > .a': {
	cursor: 'pointer',
	receive: true,
},
// '.ace_codeLens > a:hover': {
'.ace_codeLens .a:hover': {
	textColor: '#0000ff',
	// textDecoration: 'underline',
},
// '.ace_dark > .ace_codeLens > a:hover': {
'.ace_dark .ace_codeLens .a:hover': {
	textColor: '#4e94ce',
}
}, "codelense.css", false);
