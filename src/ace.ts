/**
 * The main class required to set up an Ace instance in the browser.
 *
 * @namespace Ace
 **/
"use strict";
"include loader_build";

import {Range} from "./range";
import {Editor,EditorOptions} from "./editor";
import {EditSession} from "./edit_session";
import {UndoManager} from "./undomanager";
import {VirtualRenderer} from "./virtual_renderer";
import {Document} from "./document";
import qk, {Text} from "quark";
import cfg from "./config";
import { SyntaxMode } from "./mode";

// Side-effect imports to register editor extensions (modes, themes, etc.)
import "./worker/worker_client";
import "./keyboard/hash_handler";
import "./placeholder";
import "./multi_select";
import "./mode/folding/fold_mode";
import "./theme/textmate";
import "./ext/error_marker";

export const config = cfg;

/**
 * Embeds the Ace editor into the DOM, at the element provided by `el`.
 * @param {Box & {env?: any, value?: any}} [el] Either the id of an element, or the element itself
 * @param {Partial<EditorOptions> } [options] Options for the editor
 * @returns {Editor}
 **/
export function edit(el?: Text & {env?: any, value?: any}, options: Partial<EditorOptions> = {}): Editor {
	if (el && el.env && el.env.editor instanceof Editor)
		return el.env.editor;

	var oldNode = el;
	var value = "";
	if (el) {
		if (!el.asTextOptions() || el.isTextInput) {
			value = el.value || '';
			el = new Text(el.window);
			oldNode!.after(el);
		}
	} else {
		el = new Text(qk.app.activeWindow!);
	}

	var doc = createEditSession(value);
	var editor = new Editor(new VirtualRenderer(el), doc, options);

	var env = {
		document: doc,
		editor: editor,
		onResize: editor.resize.bind(editor, false),
		textarea: null as any
	};
	if (oldNode && oldNode.isTextInput) {
		env.textarea = oldNode;
	}
	editor.on("destroy", function() {
		(env.editor.container as any).env = null; // prevent memory leak on old ie
	});
	(editor.container as any).env = editor.env = env;
	return editor;
}

/**
 * Creates a new [[EditSession]], and returns the associated [[Document]].
 * @param {string|Document} text {:textParam}
 * @param {SyntaxMode} [mode] {:modeParam}
 * @returns {EditSession}
 **/
export function createEditSession(text: string|Document, mode?: SyntaxMode): EditSession {
	var doc = new EditSession(text, mode);
	doc.setUndoManager(new UndoManager());
	return doc;
}
export {Range};
export {Editor};
export {EditSession};
export {UndoManager};
export {VirtualRenderer};
export const version = config.version;