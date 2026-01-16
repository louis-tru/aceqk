"use strict";

import type { Ace } from "../ace-internal";
import {EventEmitter} from "./lib/event_emitter";
import {Editor} from "./editor";
import {VirtualRenderer as Renderer} from "./virtual_renderer";
import {EditSession} from "./edit_session";
import { View, Text } from "quark";

export interface SplitEvents {
	"focus": (editor: Editor) => void;
}

export class Split extends EventEmitter<SplitEvents> {
	private BELOW = 1;
	private BESIDE = 0;
	private $container: View;
	private $theme: string | Ace.Theme;
	private $splits: number = 0;
	private $editorCSS: string = "";
	private $editors: Editor[] = [];
	private $orientation: number;
	private $cEditor: Editor;

	constructor(container: View, theme: string | Ace.Theme, splits?: number) {
		super();
		this.$container = container;
		this.$container.style.layout = "free"; // force absolute positioning of children
		this.$theme = theme;
		this.$orientation = this.BESIDE;

		this.setSplits(splits || 1);
		this.$cEditor = this.$editors[0];

		this.on("focus", (editor)=>{
			this.$cEditor = editor;
		});
	}

	/**
	 * @returns {Editor}
	 * @this {Split}
	 */
	$createEditor() {
		// var el = document.createElement("div");
		var el = new Text(this.$container.window);
		el.class = [this.$editorCSS];
		// el.style.cssText = "position: absolute; top:0px; bottom:0px";
		this.$container.append(el);
		var editor = new Editor(new Renderer(el, this.$theme));

		editor.on("focus", () => {
			this._emit("focus", editor);
		});

		this.$editors.push(editor);
		editor.setFontSize(this.$fontSize);
		return editor;
	};

	/**
	 * 
	 * @param splits
	 * @this {Split}
	 */
	setSplits(splits: number) {
		var editor;
		if (splits < 1) {
			throw "The number of splits have to be > 0!";
		}

		if (splits == this.$splits) {
			return;
		} else if (splits > this.$splits) {
			while (this.$splits < this.$editors.length && this.$splits < splits) {
				editor = this.$editors[this.$splits];
				this.$container.append(editor.container);
				editor.setFontSize(this.$fontSize);
				this.$splits ++;
			}
			while (this.$splits < splits) {
				this.$createEditor();
				this.$splits ++;
			}
		} else {
			while (this.$splits > splits) {
				editor = this.$editors[this.$splits - 1];
				editor.container.remove(); // remove from parent
				this.$splits --;
			}
		}
		this.resize();
	};

	/**
	 * 
	 * Returns the number of splits.
	 * @returns {Number}
	 * @this {Split}
	 **/
	getSplits() {
		return this.$splits;
	};

	/**
	 * @param {Number} idx The index of the editor you want
	 *
	 * Returns the editor identified by the index `idx`.
	 * @this {Split}
	 **/
	getEditor(idx: number) {
		return this.$editors[idx];
	};

	/**
	 * Returns the current editor.
	 * @returns {Editor}
	 * @this {Split}
	 **/
	getCurrentEditor() {
		return this.$cEditor;
	};

	/** 
	 * Focuses the current editor.
	 * @related Editor.focus
	 * @this {Split}
	 **/
	focus() {
		this.$cEditor.focus();
	};

	/** 
	 * Blurs the current editor.
	 * @related Editor.blur
	 * @this {Split}
	 **/
	blur() {
		this.$cEditor.blur();
	};

	/** 
	 * 
	 * @param {String} theme The name of the theme to set
	 * 
	 * Sets a theme for each of the available editors.
	 * @related Editor.setTheme
	 * @this {Split}
	 **/
	setTheme(theme: string| Ace.Theme) {
		this.$editors.forEach(function(editor) {
			editor.setTheme(theme);
		});
	};

	/** 
	 * 
	 * @param {String} keybinding 
	 * 
	 * Sets the keyboard handler for the editor.
	 * @related editor.setKeyboardHandler
	 * @this {Split}
	 **/
	setKeyboardHandler(keybinding: string) {
		this.$editors.forEach(function(editor) {
			editor.setKeyboardHandler(keybinding);
		});
	};

	/** 
	 * 
	 * @param {Function} callback A callback function to execute
	 * @param {String} scope The default scope for the callback
	 * 
	 * Executes `callback` on all of the available editors. 
	 * @this {Split}
	 **/
	forEach(callback: (editor: Editor) => void, scope?: any) {
		this.$editors.forEach(callback, scope);
	};

	private $fontSize = 0;

	/** 
	 * @param {Number} size The new font size
	 * 
	 * Sets the font size, in pixels, for all the available editors.
	 * @this {Split}
	 **/
	setFontSize(size: number) {
		this.$fontSize = size;
		this.forEach(function(editor) {
			editor.setFontSize(size);
		});
	};

	/**
	 * 
	 * @param {EditSession} session
	 * @return {EditSession}
	 */
	$cloneSession(session: EditSession): EditSession {
		var s = new EditSession(session.getDocument(), session.getMode());

		var undoManager = session.getUndoManager();
		s.setUndoManager(undoManager);

		// Copy over 'settings' from the session.
		s.setTabSize(session.getTabSize());
		s.setUseSoftTabs(session.getUseSoftTabs());
		s.setOverwrite(session.getOverwrite());
		// s.setBreakpoints(session.getBreakpoints());
		s.$breakpoints = session.$breakpoints.slice(); // copy
		s.setUseWrapMode(session.getUseWrapMode());
		s.setUseWorker(session.getUseWorker());
		s.setWrapLimitRange(session.$wrapLimitRange.min, session.$wrapLimitRange.max);
		s.$foldData = session.$cloneFoldData();

		return s;
	};

   /** 
	 * 
	 * @param {EditSession} session The new edit session
	 * @param {Number} idx The editor's index you're interested in
	 * 
	 * Sets a new [[EditSession `EditSession`]] for the indicated editor.
	 * @related Editor.setSession
	 * @this {Split}
	 **/
	setSession(session: EditSession, idx: number) {
		var editor;
		if (idx == null) {
			editor = this.$cEditor;
		} else {
			editor = this.$editors[idx];
		}

		// Check if the session is used already by any of the editors in the
		// split. If it is, we have to clone the session as two editors using
		// the same session can cause terrible side effects (e.g. UndoQueue goes
		// wrong). This also gives the user of Split the possibility to treat
		// each session on each split editor different.
		var isUsed = this.$editors.some(function(editor) {
		   return editor.session === session;
		});

		if (isUsed) {
			session = this.$cloneSession(session);
		}
		editor.setSession(session);

		// Return the session set on the editor. This might be a cloned one.
		return session;
	};

   /** 
	 * 
	 * Returns the orientation.
	 * @returns {Number}
	 * @this {Split}
	 **/
	getOrientation() {
		return this.$orientation;
	};

   /** 
	 * 
	 * Sets the orientation.
	 * @param {Number} orientation The new orientation value
	 * @this {Split}
	 *
	 **/
	setOrientation(orientation: number) {
		if (this.$orientation == orientation) {
			return;
		}
		this.$orientation = orientation;
		this.resize();
	};

   /**  
	 * Resizes the editor.
	 * @this {Split}
	 **/
	resize() {
		var clSize = this.$container.clientSize;
		var width = clSize.width;
		var height = clSize.height;
		var editor;

		if (this.$orientation == this.BESIDE) {
			var editorWidth = width / this.$splits;
			for (var i = 0; i < this.$splits; i++) {
				editor = this.$editors[i];
				editor.container.style.width = editorWidth;
				editor.container.style.marginTop = 0;
				editor.container.style.marginLeft = i * editorWidth;
				editor.container.style.height = height;
				editor.resize();
			}
		} else {
			var editorHeight = height / this.$splits;
			for (var i = 0; i < this.$splits; i++) {
				editor = this.$editors[i];
				editor.container.style.width = width;
				editor.container.style.marginTop = i * editorHeight;
				editor.container.style.marginLeft = 0;
				editor.container.style.height = editorHeight;
				editor.resize();
			}
		}
	};
};
